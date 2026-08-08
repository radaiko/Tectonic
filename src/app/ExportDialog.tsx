import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ExportFormat } from '../io/FileService'
import { downloadExport } from '../io/FileService'
import type { ExportSource } from '../io/DocumentExport'
import { EXPORT_FORMATS, buildExport, exportUnavailableReason } from '../io/DocumentExport'
import { Button } from '../ui/Button'
import './ExportDialog.css'

export interface ExportDialogProps {
  readonly open: boolean
  readonly source: ExportSource
  readonly onClose: () => void
  /** Overridable so tests can watch the files without touching the DOM. */
  readonly onExport?: (format: ExportFormat) => void
}

/**
 * Picks a format and writes the files.
 *
 * Every option here comes from {@link EXPORT_FORMATS}, so the list is exactly
 * what `buildExport` implements — the dialog cannot offer a format that does
 * not exist. An option the current document cannot feed stays selectable but
 * says why and refuses to run, which is more use than a greyed-out row.
 */
export function ExportDialog({
  open,
  source,
  onClose,
  onExport,
}: ExportDialogProps): React.ReactElement | null {
  const [format, setFormat] = useState<ExportFormat>('tectonic')
  const [error, setError] = useState<string | null>(null)

  const selected = useMemo(
    () => EXPORT_FORMATS.find((entry) => entry.id === format) ?? EXPORT_FORMATS[0]!,
    [format],
  )
  const unavailable = useMemo(
    () => exportUnavailableReason(selected.id, source),
    [selected, source],
  )

  const handleExport = useCallback(() => {
    try {
      if (onExport) onExport(selected.id)
      else for (const file of buildExport(selected.id, source)) downloadExport(file)
      setError(null)
      onClose()
    } catch (cause) {
      setError((cause as Error).message)
    }
  }, [onClose, onExport, selected, source])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  if (!open) return null

  return (
    <div className="export-dialog__backdrop" role="presentation" onClick={onClose}>
      <div
        className="export-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Export"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="export-dialog__title">Export</h2>

        <label className="export-dialog__field">
          <span className="export-dialog__label">Format</span>
          <select
            className="export-dialog__select"
            value={selected.id}
            onChange={(event) => {
              setFormat(event.target.value as ExportFormat)
              setError(null)
            }}
          >
            {EXPORT_FORMATS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label} ({entry.extension})
              </option>
            ))}
          </select>
        </label>

        <p className="export-dialog__description">{selected.description}</p>

        {unavailable ? (
          <p className="export-dialog__warning" role="status">
            {unavailable}
          </p>
        ) : null}
        {error ? (
          <p className="export-dialog__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="export-dialog__actions">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleExport} disabled={unavailable !== null}>
            Export
          </Button>
        </div>
      </div>
    </div>
  )
}
