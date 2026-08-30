import { jsPDF } from 'jspdf'
import { skillLabel } from './skillLabel.js'

function truncate(text, max) {
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

// Builds a plain, factual PDF straight from the backend's /analyze response
// — every value printed here is a field that was actually calculated, never
// invented for the report.
export function downloadReport(result, meta = {}) {
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

  const addHeading = (text) => {
    ensureSpace(40)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(20, 18, 30)
    doc.text(text, marginX, y)
    y += 20
  }

  const addLine = (label, value) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(90, 90, 100)
    doc.text(label, marginX, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(20, 18, 30)
    doc.text(String(value), marginX + 150, y)
    y += 18
  }

  const addList = (items, emptyText) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    doc.setTextColor(20, 18, 30)
    if (!items.length) {
      ensureSpace(16)
      doc.text(`•  ${emptyText}`, marginX + 10, y)
      y += 16
      return
    }
    items.forEach((item) => {
      ensureSpace(16)
      doc.text(`•  ${item}`, marginX + 10, y)
      y += 16
    })
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(20, 18, 30)
  doc.text('Resume Match Report', marginX, y)
  y += 16
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(120, 120, 130)
  doc.text(`Generated ${new Date().toLocaleString()}`, marginX, y)
  y += 32

  addLine('Job:', truncate(meta.jobLabel, 70) || 'Untitled role')
  addLine('Resume:', truncate(meta.filename, 70) || 'Uploaded resume')
  y += 6

  addHeading('Scores')
  addLine('Semantic Match:', `${result.match_score}%`)
  addLine('Skill Coverage:', `${result.skill_coverage}%`)
  addLine('Resume Structure:', `${result.resume_structure_score} / 100`)
  y += 6

  addHeading(`Matched Skills (${result.matched_skills.length})`)
  addList(result.matched_skills.map(skillLabel), 'No matched skills detected')
  y += 6

  addHeading(`Missing Skills (${result.missing_skills.length})`)
  addList(result.missing_skills.map(skillLabel), 'No missing skills detected')
  y += 6

  addHeading('Priority Skill Gaps')
  const roadmap = (result.skill_gap_roadmap || []).slice(0, 5)
  addList(
    roadmap.map((item, i) => `${i + 1}. ${skillLabel(item.skill)} — ${item.importance}`),
    'No priority gaps identified',
  )

  ensureSpace(50)
  y += 14
  doc.setDrawColor(220, 220, 225)
  doc.line(marginX, y, 547, y)
  y += 18
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8.5)
  doc.setTextColor(140, 140, 150)
  const disclaimer = doc.splitTextToSize(
    'Scores reflect sentence-embedding semantic similarity and curated-taxonomy skill detection — they are not a probability of getting hired.',
    499,
  )
  doc.text(disclaimer, marginX, y)

  doc.save(`resume-match-report-${Date.now()}.pdf`)
}
