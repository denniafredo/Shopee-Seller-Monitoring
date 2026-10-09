export function formatIndonesianDate(date = new Date()) {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  }).format(date)
}

export function normalizeTime(value) {
  if (!value) return '-'
  return String(value).replace('.', ':')
}

export function formatVariantText(item) {
  const variant = item.variantName || item.modelName || item.variationName
  return variant ? `Varian: ${variant}` : 'Varian: -'
}

export function getDisplayImage(item) {
  return item.variantImageUrl || item.productImageUrl || item.imageUrl || null
}

export function formatTimeAgo(value, now = new Date()) {
  if (!value) return ''

  const minutes = Math.max(0, Math.floor((now - new Date(value)) / 60_000))
  if (Number.isNaN(minutes)) return ''
  if (minutes < 60) return minutes <= 1 ? 'baru saja' : `${minutes} menit lalu`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} hari lalu`
  if (days < 30) return `${Math.floor(days / 7)} minggu lalu`
  if (days < 365) return `${Math.floor(days / 30)} bulan lalu`

  return `${Math.floor(days / 365)} tahun lalu`
}

export function formatShortDate(value) {
  if (!value) return ''

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  }).format(new Date(value))
}

export function formatRupiah(value) {
  const n = Number(value) || 0
  return 'Rp ' + n.toLocaleString('id-ID')
}

export function getStatusLabel(status) {
  const map = {
    BARU: 'Baru',
    DIPROSES: 'Diproses',
    SIAP_KIRIM: 'Siap Kirim',
    DIKIRIM: 'Dikirim',
    SELESAI: 'Selesai',
    DIBATALKAN: 'Dibatalkan'
  }

  return map[status] || status || '-'
}
