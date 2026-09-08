import { useEffect } from 'react'
import { QrCode, X, RefreshCw, CheckCircle2 } from 'lucide-react'
import { formatRupiah } from '../utils/format'

export default function QrisSettlementPopup({
  open,
  onClose,
  data,
  loading,
  refreshing,
  error,
  onRefresh
}) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const total = data?.total ?? 0
  const count = data?.count ?? 0
  const transactions = data?.transactions ?? []

  return (
    <div className="qris-overlay" onClick={onClose}>
      <aside className="qris-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="qris-panel__header">
          <div className="qris-panel__header-title">
            <span className="qris-panel__header-icon"><QrCode size={20} /></span>
            <div>
              <strong>Detail QRIS BCA Terakhir</strong>
              <p>Live Settlement Feed (Hari Ini)</p>
            </div>
          </div>
          <div className="qris-panel__header-actions">
            <button
              type="button"
              className="qris-panel__refresh"
              onClick={onRefresh}
              disabled={refreshing}
              title="Refresh data QRIS hari ini"
            >
              <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            </button>
            <button type="button" className="qris-panel__close" onClick={onClose} title="Tutup">
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="qris-panel__body">
          <div className="qris-panel__total-card">
            <div className="qris-panel__total-head">
              <span>Total Masuk Toko:</span>
              <span className="qris-panel__realtime"><CheckCircle2 size={14} /> Settle Realtime</span>
            </div>
            <div className="qris-panel__total-amount">{loading ? '…' : formatRupiah(total)}</div>
            <div className="qris-panel__total-sub">{count} Transaksi Sukses</div>
          </div>

          {error && <div className="qris-panel__error">{error}</div>}

          {!error && !loading && transactions.length === 0 && (
            <div className="qris-panel__empty">Belum ada transaksi QRIS masuk hari ini.</div>
          )}

          <ul className="qris-tx-list">
            {transactions.map((tx, i) => (
              <li className="qris-tx" key={`${tx.rrn || 'tx'}-${i}`}>
                <div className="qris-tx__top">
                  <span className="qris-tx__bank">{tx.bank || 'QRIS'}</span>
                  {i === 0 && <span className="qris-tx__new">Baru Saja</span>}
                  <span className="qris-tx__amount">+ {formatRupiah(tx.amount)}</span>
                </div>
                <div className="qris-tx__mid">
                  <span className="qris-tx__name">{tx.name || '—'}</span>
                  {tx.time && <span className="qris-tx__time">{tx.time} WIB</span>}
                </div>
                <div className="qris-tx__meta">
                  <div className="qris-tx__ids">
                    {tx.rrn && <span>RRN: {tx.rrn}</span>}
                    {tx.nmid && <span>NMID: {tx.nmid}</span>}
                  </div>
                  <span className="qris-tx__status"><CheckCircle2 size={13} /> {tx.status || 'Masuk'}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <footer className="qris-panel__footer">
          <button type="button" className="qris-btn qris-btn--primary" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Mengambil data…' : 'Lihat Semua Mutasi QRIS (Hari Ini)'}
          </button>
          {data?.lastUpdated && (
            <p className="qris-panel__updated">Update terakhir: {data.lastUpdated} WIB</p>
          )}
        </footer>
      </aside>
    </div>
  )
}
