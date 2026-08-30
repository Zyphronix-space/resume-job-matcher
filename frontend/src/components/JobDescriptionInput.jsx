export default function JobDescriptionInput({ value, onChange, disabled }) {
  return (
    <div className="panel">
      <h2 className="panel-title">Job description</h2>
      <p className="panel-subtitle">Paste the role you're applying for</p>

      <textarea
        className="jd-textarea"
        placeholder="Paste the job description here..."
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        rows={12}
      />
      <span className="jd-char-count">{value.length.toLocaleString()} characters</span>
    </div>
  )
}
