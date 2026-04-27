export const allowedExtensions = ['.pdf', '.xlsx', '.xls', '.pptx', '.zip']
export const maxFileSize = 40 * 1024 * 1024

const allowedMimeTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
]

export function validateFiles(files, t) {
  const list = Array.from(files || [])
  for (const file of list) {
    const lower = file.name.toLowerCase()
    const hasValidExtension = allowedExtensions.some(ext => lower.endsWith(ext))
    const hasValidMime = !file.type || allowedMimeTypes.includes(file.type)
    if (!hasValidExtension || !hasValidMime) {
      return t('errors.invalidFileType')
    }
    if (file.size > maxFileSize) {
      return t('errors.fileTooLarge')
    }
  }
  return null
}

export function buildMultipart(fields, filesField = 'files', files = []) {
  const form = new FormData()
  Object.entries(fields).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(item => form.append(key, item))
    } else if (value !== undefined && value !== null) {
      form.append(key, value)
    }
  })
  Array.from(files || []).forEach(file => form.append(filesField, file))
  return form
}

export function readableSize(bytes = 0) {
  if (!bytes) return '0 KB'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}
