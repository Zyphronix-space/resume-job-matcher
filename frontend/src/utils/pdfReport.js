import { jsPDF } from 'jspdf'
import { skillLabel } from './skillLabel.js'

// Builds a plain, factual PDF from real application rows (score, skills,
// status) — the same fields shown on-screen, nothing computed just for
// the report. Used for job-matching and shortlist exports.
export function downloadCandidatesPdf(title, applications) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const marginX = 48
  const pageBottom = 780
  let y = 56

  const ensureSpace = (needed = 60) => {
    if (y + needed > pageBottom) {
      doc.addPage()
      y = 56
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(20, 18, 30)
  doc.text(title, marginX, y)
  y += 16
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(120, 120, 130)
  doc.text(`Generated ${new Date().toLocaleString()}, ${applications.length} candidate(s)`, marginX, y)
  y += 30

  applications.forEach((app, i) => {
    ensureSpace(90)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(20, 18, 30)
    doc.text(`${i + 1}. ${app.candidate.full_name}`, marginX, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(90, 90, 100)
    doc.text(`${Math.round(app.match_score)}% match, ${app.status}`, 420, y)
    y += 16

    doc.setFontSize(9.5)
    doc.setTextColor(90, 90, 100)
    doc.text(`Job: ${app.job.title}    Email: ${app.candidate.email}`, marginX, y)
    y += 14

    const matched = doc.splitTextToSize(`Matched: ${app.matched_skills.map(skillLabel).join(', ') || 'None'}`, 499)
    doc.text(matched, marginX, y)
    y += matched.length * 12

    const missing = doc.splitTextToSize(`Missing: ${app.missing_skills.map(skillLabel).join(', ') || 'None'}`, 499)
    doc.text(missing, marginX, y)
    y += missing.length * 12 + 10

    doc.setDrawColor(220, 220, 225)
    doc.line(marginX, y, 547, y)
    y += 16
  })

  ensureSpace(40)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8.5)
  doc.setTextColor(140, 140, 150)
  const disclaimer = doc.splitTextToSize(
    'Scores reflect sentence-embedding semantic similarity and curated-taxonomy skill detection. They are not a probability of getting hired.',
    499,
  )
  doc.text(disclaimer, marginX, y)

  doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`)
}
