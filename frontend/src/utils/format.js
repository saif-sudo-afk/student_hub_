export function formatDate(value, locale = 'en') {
  if (!value) return ''
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

export function formatDateTime(value, locale = 'en') {
  if (!value) return ''
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function deadlineTone(deadline) {
  const diff = new Date(deadline).getTime() - Date.now()
  if (diff < 0) return 'danger'
  if (diff < 24 * 60 * 60 * 1000) return 'danger'
  if (diff < 3 * 24 * 60 * 60 * 1000) return 'warning'
  return 'success'
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
