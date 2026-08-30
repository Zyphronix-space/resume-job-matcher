import { useRef, useState } from 'react'
import { DocumentIcon, UploadIcon, WarningIcon, TrashIcon } from './icons.jsx'

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
  const [isDragging, setIsDragging] = useState(false)
  const [validationError, setValidationError] = useState(null)

  const acceptFile = (candidate) => {
    if (!candidate) return
    if (!isPdf(candidate)) {
      setValidationError('Please upload a PDF file.')
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

  const handleBrowse = () => {
    if (disabled) return
    inputRef.current?.click()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleBrowse()
    }
  }

  return (
    <div className="panel">
      <h2 className="panel-title">Your resume</h2>
      <p className="panel-subtitle">Upload your CV as a PDF</p>

      {!file ? (
        <div
          className={`dropzone ${isDragging ? 'is-dragging' : ''} ${disabled ? 'is-disabled' : ''}`}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Upload your CV as a PDF"
          onClick={handleBrowse}
          onKeyDown={handleKeyDown}
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <UploadIcon size={32} className="dropzone-icon" />
          <p className="dropzone-title">Drop your CV here</p>
          <p className="dropzone-sub">or click to browse</p>
          <span className="dropzone-hint">PDF only</span>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            hidden
            disabled={disabled}
            onChange={(e) => acceptFile(e.target.files?.[0])}
          />
        </div>
      ) : (
        <div className="file-card">
          <span className="file-card-icon"><DocumentIcon size={26} /></span>
          <div className="file-card-info">
            <span className="file-card-name">{file.name}</span>
            <span className="file-card-size">{formatFileSize(file.size)}</span>
          </div>
          <button type="button" className="file-card-remove" onClick={onFileRemove} disabled={disabled}>
            <TrashIcon size={15} />
            Remove
          </button>
        </div>
      )}

      {validationError && (
        <p className="field-error"><WarningIcon size={15} /> {validationError}</p>
      )}
    </div>
  )
}
