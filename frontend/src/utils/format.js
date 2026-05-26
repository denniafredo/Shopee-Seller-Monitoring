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
