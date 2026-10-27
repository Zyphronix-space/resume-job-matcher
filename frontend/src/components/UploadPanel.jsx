import { useId, useRef, useState } from 'react'
import { DocumentIcon, UploadIcon, WarningIcon } from './icons.jsx'

// Mirrors backend/resumes_routes.py: PDF only, at most 4 MB, and the PDF
// needs selectable text (scanned images are rejected server-side).
export const MAX_RESUME_BYTES = 4 * 1024 * 1024

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isPdf(file) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

export default function UploadPanel({ file, onFileSelect, onFileRemove, disabled }) {
  const inputRef = useRef(null)
  const hintId = useId()
  const [isDragging, setIsDragging] = useState(false)
  const [validationError, setValidationError] = useState(null)

  const acceptFile = (candidate) => {
    if (!candidate) return
    if (!isPdf(candidate)) {
      setValidationError(`“${candidate.name}” isn’t a PDF. Export your resume as a PDF and try again.`)
      return
    }
    if (candidate.size > MAX_RESUME_BYTES) {
      setValidationError(`This file is ${formatFileSize(candidate.size)}. Resumes can be up to 4 MB.`)
      return
    }
    setValidationError(null)
    onFileSelect(candidate)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return
    acceptFile(e.dataTransfer.files?.[0])
  }

  return (
    <div className="upload">
      {!file ? (
        <label
          className={`dropzone ${isDragging ? 'is-dragging' : ''} ${disabled ? 'is-disabled' : ''}`}
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <UploadIcon size={22} className="dropzone-icon" />
          <span className="dropzone-title">Drop your resume here, or <span className="dropzone-browse">choose a file</span></span>
          <span className="dropzone-hint" id={hintId}>PDF with selectable text, up to 4 MB</span>
          <input
            ref={inputRef}
            type="file"
            className="visually-hidden"
            accept=".pdf,application/pdf"
            disabled={disabled}
            aria-describedby={hintId}
            onChange={(e) => { acceptFile(e.target.files?.[0]); e.target.value = '' }}
          />
        </label>
      ) : (
        <div className="file-card">
          <span className="file-card-icon"><DocumentIcon size={20} /></span>
          <div className="file-card-info">
            <span className="file-card-name" title={file.name}>{file.name}</span>
            <span className="file-card-size">{formatFileSize(file.size)}, ready to upload</span>
          </div>
          <button type="button" className="glass-btn glass-btn-ghost glass-btn-sm" onClick={onFileRemove} disabled={disabled}>
            Choose another
          </button>
        </div>
      )}

      {validationError && (
        <p className="field-error" role="alert"><WarningIcon size={15} />{validationError}</p>
      )}
    </div>
  )
}
