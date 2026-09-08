import puppeteer from 'puppeteer-core';
import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileP = promisify(execFile);

/**
 * BCA QRIS Merchant portal (qr.klikbca.com) automation.
 *
 * We drive a real, already-installed Chrome/Edge with puppeteer-core so the
 * bank's own JavaScript performs all the client-side encryption (MCB V2 /
 * "messi" CBC). We never reimplement their crypto. A persistent user-data dir
 * keeps the session alive so we log in as rarely as possible (the portal only
 * allows one active session per merchant account).
 */

const LOGIN_URL = process.env.QRIS_LOGIN_URL || 'https://qr.klikbca.com/login';
const HOME_URL = process.env.QRIS_HOME_URL || 'https://qr.klikbca.com/home';
const MID = (process.env.QRIS_MID || '').trim();
const HEADLESS = String(process.env.QRIS_HEADLESS ?? 'true').toLowerCase() !== 'false';
// On a small EC2, don't keep Chromium resident between hourly scrapes — close it
// after each run to free RAM. The login session lives in the on-disk user-data
// dir, so relaunching still reuses cookies (no re-login). Set true on a roomy
// box / for fast local dev.
const KEEP_BROWSER = String(process.env.QRIS_KEEP_BROWSER ?? 'false').toLowerCase() === 'true';
// Disk guard: refuse to launch Chrome when free space on this filesystem is low,
// so the scraper can never be the thing that fills a nearly-full disk (Chrome
// writes its profile + /tmp during a run). 0 disables the check.
const MIN_FREE_DISK_MB = Number(process.env.QRIS_MIN_FREE_DISK_MB ?? 800);

const SESSION_DIR = path.resolve(process.cwd(), '.qris-session');
const DEBUG_DIR = path.resolve(process.cwd(), '.qris-debug');

const CHROME_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium'
].filter(Boolean);

let browserPromise = null;

async function resolveChromePath() {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // try next
    }
  }
  throw new Error(
    'Chrome/Edge executable not found. Set PUPPETEER_EXECUTABLE_PATH in backend/.env to the full path of chrome.exe or msedge.exe.'
  );
}

async function getBrowser() {
  if (browserPromise) {
    const b = await browserPromise.catch(() => null);
    if (b && b.connected) return b;
    browserPromise = null;
  }

  browserPromise = (async () => {
    const executablePath = await resolveChromePath();
    await fs.mkdir(SESSION_DIR, { recursive: true });

    return puppeteer.launch({
      executablePath,
      headless: HEADLESS ? 'new' : false,
      userDataDir: SESSION_DIR,
      defaultViewport: { width: 1366, height: 900 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // small /dev/shm on EC2 would otherwise crash Chrome
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--lang=id-ID'
      ]
    });
  })();

  return browserPromise;
}

/**
 * Return free megabytes on the filesystem holding the backend, or null if it
 * can't be determined. Uses `df` on POSIX; skipped on Windows dev.
 */
async function getFreeDiskMb() {
  if (process.platform === 'win32') return null;
  try {
    const { stdout } = await execFileP('df', ['-Pk', process.cwd()]);
    const line = stdout.trim().split('\n').pop();
    const availKb = Number(line.split(/\s+/)[3]);
    return Number.isFinite(availKb) ? Math.floor(availKb / 1024) : null;
  } catch {
    return null;
  }
}

async function assertDiskSpace() {
  if (!MIN_FREE_DISK_MB) return;
  const freeMb = await getFreeDiskMb();
  if (freeMb !== null && freeMb < MIN_FREE_DISK_MB) {
    throw new Error(
      `Scrape QRIS dilewati: sisa disk ${freeMb}MB < ambang ${MIN_FREE_DISK_MB}MB (set QRIS_MIN_FREE_DISK_MB untuk mengubah).`
    );
  }
}

export async function closeBrowser() {
  if (!browserPromise) return;
  try {
    const b = await browserPromise;
    await b.close();
  } catch {
    // ignore
  } finally {
    browserPromise = null;
  }
}

async function saveDebug(page, tag, { full = false } = {}) {
  try {
    await fs.mkdir(DEBUG_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const base = path.join(DEBUG_DIR, `${tag}-${stamp}`);
    const text = await page.evaluate(() => document.body?.innerText || '');
    await fs.writeFile(`${base}.txt`, text, 'utf8');
    if (full) {
      const html = await page.content();
      await fs.writeFile(`${base}.html`, html, 'utf8');
      await page.screenshot({ path: `${base}.png`, fullPage: true }).catch(() => {});
    }
    await pruneDebug(tag, full ? 4 : 5);
    return base;
  } catch {
    return null;
  }
}

// Keep only the most recent `keep` snapshots per tag.
async function pruneDebug(tag, keep) {
  try {
    const files = (await fs.readdir(DEBUG_DIR))
      .filter((f) => f.startsWith(`${tag}-`))
      .sort();
    const stems = [...new Set(files.map((f) => f.replace(/\.(txt|html|png)$/i, '')))].sort();
    const drop = stems.slice(0, Math.max(0, stems.length - keep));
    await Promise.all(
      files
        .filter((f) => drop.some((s) => f.startsWith(s)))
        .map((f) => fs.rm(path.join(DEBUG_DIR, f)).catch(() => {}))
    );
  } catch {
    // best effort
  }
}

function isLoginPage(url) {
  return /\/login\b/.test(url || '');
}

async function ensureLoggedIn(page) {
  const username = process.env.MERCH_USERNAME;
  const password = process.env.MERCH_PASSWORD;

  if (!username || !password) {
    throw new Error('MERCH_USERNAME / MERCH_PASSWORD are not set in backend/.env');
  }

  // If our persisted session is still valid, home loads without a login form.
  await page.goto(HOME_URL, { waitUntil: 'networkidle2', timeout: 60_000 }).catch(() => {});
  await sleep(1500);

  if (!isLoginPage(page.url()) && (await findLoginInputs(page)) === null) {
    return; // already authenticated via persisted session
  }

  // Perform a fresh login.
  if (!isLoginPage(page.url())) {
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle2', timeout: 60_000 });
  }

  const inputs = await waitForLoginInputs(page, 30_000);
  if (!inputs) {
    await saveDebug(page, 'login-form-not-found', { full: true });
    throw new Error('Could not locate the login form on qr.klikbca.com/login (see .qris-debug/).');
  }

  await page.type(inputs.user, username, { delay: 25 });
  await page.type(inputs.pass, password, { delay: 25 });

  await Promise.all([
    clickLoginButton(page),
    page
      .waitForNavigation({ waitUntil: 'networkidle2', timeout: 60_000 })
      .catch(() => {}) // Angular may route without a full navigation
  ]);

  await sleep(2500);

  // Wait until we leave the login page (routed to /home or an outlet page).
  const ok = await waitFor(async () => !isLoginPage(page.url()) && (await findLoginInputs(page)) === null, 30_000);
  if (!ok) {
    const dbg = await saveDebug(page, "login-failed", { full: true });
    throw new Error(
      `Login to qr.klikbca.com failed (still on login page). Check credentials / OTP prompt. Debug: ${dbg || '.qris-debug/'}`
    );
  }
}

async function findLoginInputs(page) {
  return page.evaluate(() => {
    const visible = (el) => el && el.offsetParent !== null && !el.disabled;
    const q = (sel) => Array.from(document.querySelectorAll(sel)).filter(visible);

    let pass =
      q('input[type="password"]')[0] ||
      q('input[formcontrolname*="pass" i]')[0] ||
      q('input[name*="pass" i]')[0] ||
      q('input[id*="pass" i]')[0];

    let user =
      q('input[formcontrolname*="user" i]')[0] ||
      q('input[name*="user" i]')[0] ||
      q('input[id*="user" i]')[0] ||
      q('input[type="text"]')[0] ||
      q('input[type="email"]')[0] ||
      q('input:not([type="password"]):not([type="hidden"]):not([type="checkbox"])')[0];

    if (!user || !pass) return null;

    const mark = (el, attr) => {
      el.setAttribute(attr, '1');
      return `[${attr}="1"]`;
    };
    return { user: mark(user, 'data-qris-user'), pass: mark(pass, 'data-qris-pass') };
  });
}

async function waitForLoginInputs(page, timeout) {
  const found = await waitFor(async () => (await findLoginInputs(page)) !== null, timeout);
  return found ? findLoginInputs(page) : null;
}

async function clickLoginButton(page) {
  const clicked = await page.evaluate(() => {
    const visible = (el) => el && el.offsetParent !== null && !el.disabled;
    const btns = Array.from(document.querySelectorAll('button, input[type="submit"]')).filter(visible);
    const byText = btns.find((b) => /login|masuk|submit/i.test((b.innerText || b.value || '').trim()));
    const target = byText || btns.find((b) => b.type === 'submit') || btns[0];
    if (target) {
      target.click();
      return true;
    }
    return false;
  });
  if (!clicked) {
    // fall back to submitting the form via Enter
    await page.keyboard.press('Enter');
  }
}

/**
 * Reads today's QRIS settlement from the merchant home page.
 * Returns { total, count, currency, transactions[], scrapedAt, source }.
 */
export async function fetchQrisSettlement() {
  await assertDiskSpace(); // never launch Chrome when disk is low
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'id-ID,id;q=0.9' });

  try {
    await ensureLoggedIn(page);

    const homeTarget = MID ? `${HOME_URL}?mid=${encodeURIComponent(MID)}` : HOME_URL;
    await page.goto(homeTarget, { waitUntil: 'networkidle2', timeout: 60_000 });

    // Give the transaction list time to decrypt + render.
    await waitFor(async () => {
      const txt = await page.evaluate(() => document.body?.innerText || '');
      return /RRN|NMID|Rp\s?\d/i.test(txt);
    }, 25_000);
    await sleep(1500);

    const innerText = await page.evaluate(() => document.body?.innerText || '');
    const parsed = parseSettlementText(innerText);

    // Always keep a debug snapshot of the latest scrape so the parser can be
    // calibrated against the real page without logging in again.
    await saveDebug(page, 'settlement');

    return {
      ...parsed,
      currency: 'IDR',
      scrapedAt: new Date().toISOString(),
      source: 'qr.klikbca.com'
    };
  } finally {
    await page.close().catch(() => {});
    // Free RAM between scrapes on small instances (session persists on disk).
    if (!KEEP_BROWSER) await closeBrowser();
  }
}

/* ----------------------------- text parsing ------------------------------ */

export function parseNominal(raw) {
  if (!raw) return 0;
  // "Rp 182.000" / "+ Rp 41.000" -> 182000. Indonesian format: dot = thousands.
  const digits = String(raw).replace(/[^0-9]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

const RRN_RE = /RRN[:\s]*([0-9A-Za-z]+)/i;
const NMID_RE = /NMID[:\s]*([0-9A-Za-z]+)/i;
const AMOUNT_RE = /Rp\s?[\d.,]+/i;
const INCOMING_AMOUNT_RE = /[+]\s*Rp\s?[\d.,]+/i;
const TIME_RE = /\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/;
const MASKED_RE = /\*{2,}/;
// "Menerima pembayaran dari BRI a.n. **HIM WICA***NO"
const PAYER_RE = /dari\s+(.+?)\s+a\.?n\.?\s+(.+)$/i;

/**
 * Parser over the rendered merchant page text. BCA's markup is obfuscated and
 * shifts across deploys, so we anchor on the stable per-transaction "RRN" label
 * and read forward for the fields that belong to it. Real block shape:
 *
 *   RRN: 209221124393 | 18.35 WIB
 *   TOKO ... (NMID: ID1025439126885)
 *   Menerima pembayaran dari BRI a.n. **HIM WICA***NO
 *   + Rp 41.000
 *
 * Snapshots of the real page are saved to .qris-debug/ on every scrape for
 * recalibration if the layout changes again.
 */
export function parseSettlementText(text) {
  const lines = String(text)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const rrnIdx = [];
  lines.forEach((l, i) => {
    if (RRN_RE.test(l)) rrnIdx.push(i);
  });

  const transactions = (rrnIdx.length ? rrnIdx.map((r, k) => {
    const nextR = k + 1 < rrnIdx.length ? rrnIdx[k + 1] : lines.length;
    return buildFromRrn(lines, r, nextR);
  }) : amountAnchored(lines)).filter((t) => t.amount > 0);

  // Total: prefer the page's own figure. Real header:
  //   "TOTAL TRANSAKSI <toko> ( 3 )"  then next line  "Rp 182.000"
  let explicitTotal = null;
  let headerCount = null;
  const totalHeaderIdx = lines.findIndex((l) => /total\s+transaksi/i.test(l));
  if (totalHeaderIdx >= 0) {
    const cnt = lines[totalHeaderIdx].match(/\(\s*(\d+)\s*\)/);
    if (cnt) headerCount = Number(cnt[1]);
    for (let i = totalHeaderIdx + 1; i < Math.min(totalHeaderIdx + 3, lines.length); i++) {
      if (AMOUNT_RE.test(lines[i])) {
        explicitTotal = parseNominal(lines[i].match(AMOUNT_RE)[0]);
        break;
      }
    }
  }
  const sum = transactions.reduce((s, t) => s + t.amount, 0);

  return {
    total: explicitTotal ?? sum,
    count: headerCount ?? transactions.length,
    transactions
  };
}

// Build one transaction from the forward window [r, nextR).
function buildFromRrn(lines, r, nextR) {
  const win = lines.slice(r, nextR);
  const tx = { bank: 'QRIS', name: '', amount: 0, rrn: '', nmid: '', time: '', status: 'Masuk' };

  // RRN line usually carries the time too: "RRN: xxx | 18.35 WIB"
  tx.rrn = (lines[r].match(RRN_RE) || [])[1] || '';
  const tOnRrn = lines[r].match(TIME_RE);
  if (tOnRrn) tx.time = tOnRrn[0].replace('.', ':');

  const nmidLine = win.find((l) => NMID_RE.test(l));
  if (nmidLine) tx.nmid = nmidLine.match(NMID_RE)[1];

  // Payer line: issuer bank + masked name.
  const payerLine = win.find((l) => PAYER_RE.test(l));
  if (payerLine) {
    const m = payerLine.match(PAYER_RE);
    tx.bank = (m[1] || 'QRIS').trim();
    tx.name = (m[2] || '').trim();
  } else {
    const maskedLine = win.find((l) => MASKED_RE.test(l) && !RRN_RE.test(l) && !NMID_RE.test(l));
    if (maskedLine) tx.name = maskedLine;
  }

  // Amount: the incoming "+ Rp" line for this block.
  const incoming = win.find((l) => INCOMING_AMOUNT_RE.test(l));
  const anyAmt = win.find((l, i) => i > 0 && AMOUNT_RE.test(l) && !RRN_RE.test(l) && !NMID_RE.test(l));
  const amtLine = incoming || anyAmt;
  if (amtLine) tx.amount = parseNominal(amtLine.match(AMOUNT_RE)[0]);

  // Time fallback: any HH:MM in the window not already captured.
  if (!tx.time) {
    const tLine = win.find((l, i) => i > 0 && TIME_RE.test(l) && !NMID_RE.test(l));
    if (tLine) tx.time = tLine.match(TIME_RE)[0].replace('.', ':');
  }

  return tx;
}

// Fallback when the page has no RRN labels: split on incoming amount lines.
function amountAnchored(lines) {
  const out = [];
  let cur = null;
  for (const line of lines) {
    if (INCOMING_AMOUNT_RE.test(line)) {
      if (cur) out.push(cur);
      cur = { bank: 'QRIS', name: '', amount: parseNominal(line.match(AMOUNT_RE)[0]), rrn: '', nmid: '', time: '', status: 'Masuk' };
      continue;
    }
    if (!cur) continue;
    if (!cur.time && TIME_RE.test(line)) cur.time = line.match(TIME_RE)[0].replace('.', ':');
    const payer = line.match(PAYER_RE);
    if (payer) {
      cur.bank = (payer[1] || 'QRIS').trim();
      cur.name = (payer[2] || '').trim();
    } else if (!cur.name && MASKED_RE.test(line)) {
      cur.name = line;
    }
    if (!cur.nmid && NMID_RE.test(line)) cur.nmid = line.match(NMID_RE)[1];
  }
  if (cur) out.push(cur);
  return out;
}

/* -------------------------------- helpers -------------------------------- */

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitFor(predicate, timeout, interval = 750) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      if (await predicate()) return true;
    } catch {
      // keep polling
    }
    await sleep(interval);
  }
  return false;
}
