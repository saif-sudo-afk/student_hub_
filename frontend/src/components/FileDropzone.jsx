import { UploadCloud, FileArchive, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { validateFiles, readableSize } from '../utils/files'

export default function FileDropzone({ files, setFiles, progress = 0, multiple = true }) {
  const { t } = useTranslation()

  const onFiles = nextFiles => {
    const error = validateFiles(nextFiles, t)
    if (error) {
      window.dispatchEvent(new CustomEvent('student-hub-toast', { detail: { type: 'error', message: error } }))
      return
    }
    setFiles(multiple ? Array.from(nextFiles) : Array.from(nextFiles).slice(0, 1))
  }

  return (
    <div
      className="rounded-lg border border-dashed border-[var(--color-border)] bg-slate-500/5 p-5"
      onDragOver={event => event.preventDefault()}
      onDrop={event => {
        event.preventDefault()
        onFiles(event.dataTransfer.files)
      }}
    >
      <label className="flex cursor-pointer flex-col items-center justify-center gap-3 text-center">
        <UploadCloud className="text-electric-500" size={32} />
        <span className="font-semibold">{t('forms.uploadPrompt')}</span>
        <span className="text-sm text-[var(--color-muted)]">{t('forms.uploadRules')}</span>
        <input
          className="sr-only"
          type="file"
          multiple={multiple}
          accept=".pdf,.xlsx,.xls,.pptx,.zip"
          onChange={event => onFiles(event.target.files)}
        />
      </label>

      {!!files?.length && (
        <div className="mt-4 space-y-2">
          {files.map(file => (
            <div key={`${file.name}-${file.size}`} className="flex items-center justify-between rounded-lg bg-[var(--color-surface)] px-3 py-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <FileArchive size={16} className="shrink-0 text-gold-500" />
                <span className="truncate">{file.name}</span>
              </span>
              <span className="flex items-center gap-3 text-[var(--color-muted)]">
                {readableSize(file.size)}
                <button
                  type="button"
                  onClick={() => setFiles(files.filter(current => current !== file))}
                  className="rounded p-1 hover:bg-slate-500/10"
                  aria-label={t('common.remove')}
                >
                  <X size={16} />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {progress > 0 && progress < 100 && (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-500/20">
          <div className="h-full bg-electric-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  )
}
