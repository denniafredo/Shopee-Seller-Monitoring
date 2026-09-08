const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  })

  const text = await response.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { message: text }
  }

  if (!response.ok) {
    throw new Error(data?.message || `Request failed with status ${response.status}`)
  }
  return data
}

// Cached settlement (auto-refreshed hourly on the backend).
export async function getQrisSettlement() {
  return request('/api/qris/settlement')
}

// Force a fresh scrape of today's QRIS mutasi from qr.klikbca.com.
export async function refreshQrisSettlement() {
  return request('/api/qris/refresh', { method: 'POST', body: JSON.stringify({}) })
}
