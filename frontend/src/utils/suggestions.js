import { skillLabel } from './skillLabel.js'

const IMPORTANCE_RANK = { Critical: 0, High: 1, Medium: 2 }

// Every suggestion below is derived directly from fields already computed
// by the backend (missing skills, resume sections, skill evidence) — never
// from a generated/free-text model, and never claims the user has a skill
// they don't.
export function buildSuggestions(result) {
  const suggestions = []

  const priorityMissing = [...result.missing_skills]
    .sort((a, b) => {
      const rankA = IMPORTANCE_RANK[result.skill_importance?.[a]?.level] ?? 3
      const rankB = IMPORTANCE_RANK[result.skill_importance?.[b]?.level] ?? 3
      return rankA - rankB
    })
    .slice(0, 5)

  priorityMissing.forEach((skill) => {
    const label = skillLabel(skill)
    suggestions.push({
      id: `missing-${skill}`,
      text: `${label} appears in the job description but wasn't detected in your resume.`,
      detail: `If you have genuine ${label} experience, consider making it more visible in your Skills or Projects section.`,
    })
  })

  if (result.resume_sections?.['Projects'] === false) {
    suggestions.push({
      id: 'no-projects',
      text: 'No Projects section was detected in your resume.',
      detail: 'Consider adding a Projects section if you have relevant work to showcase.',
    })
  }

  if (result.resume_sections?.['Professional Summary'] === false) {
    suggestions.push({
      id: 'no-summary',
      text: 'No professional summary was detected in your resume.',
      detail: 'A short summary near the top can help both recruiters and resume parsers quickly understand your background.',
    })
  }

  result.matched_skills.forEach((skill) => {
    const evidence = result.skill_evidence?.[skill]
    const importance = result.skill_importance?.[skill]?.level
    const onlyInSkillsList = evidence && evidence.sections.length === 1 && evidence.sections[0] === 'Skills'
    if (onlyInSkillsList && (importance === 'Critical' || importance === 'High')) {
      const label = skillLabel(skill)
      suggestions.push({
        id: `shallow-${skill}`,
        text: `${label} was only detected in your Skills list.`,
        detail: `Consider demonstrating ${label} through a project or work experience entry if you have relevant experience.`,
      })
    }
  })

  return suggestions.slice(0, 8)
}
