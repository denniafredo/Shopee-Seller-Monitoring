export function getTodayUnixRangeWIB() {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })

  const today = formatter.format(now) // YYYY-MM-DD in WIB

  return {
    timeFrom: Math.floor(new Date(`${today}T00:00:00+07:00`).getTime() / 1000),
    timeTo: Math.floor(new Date(`${today}T23:59:59+07:00`).getTime() / 1000)
  }
}

export function formatDateWIB(date = new Date()) {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Jakarta'
  }).format(date)
}

export function formatTimeWIB(date = new Date()) {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta'
  }).format(date)
}
