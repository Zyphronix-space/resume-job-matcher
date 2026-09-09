// Rule-based application-question drafting — matched against common
// question phrasing, not an LLM call. Every draft only references skills
// already detected as matched for this job; anything unrecognized falls
// back to an explicit placeholder telling the user to write their own
// answer. Always shown as "AI-generated draft" and requires user review.

import { skillLabel } from './skillLabel.js'

const TEMPLATES = [
  {
    pattern: /why.*(join|want|interested).*(company|us|team|organi[sz]ation)/i,
    build: ({ company, topSkills }) =>
      `I'm interested in joining ${company} because it would let me apply and grow skills I already have` +
      (topSkills.length ? `, like ${topSkills.join(', ')}, ` : ' ') +
      `in a real team setting. From what I've seen of the role, it lines up well with my background, and I'm looking forward to learning from the team.`,
  },
  {
    pattern: /why.*(you|candidate|fit|hire)/i,
    build: ({ topSkills }) =>
      `My experience with ${topSkills.length ? topSkills.join(', ') : 'the skills relevant to this role'} matches several of the skills mentioned in this posting, and I'm motivated to apply what I know while continuing to learn on the job.`,
  },
  {
    pattern: /strength/i,
    build: ({ topSkills }) =>
      `One area I'd highlight is my experience with ${topSkills[0] || 'the tools relevant to this role'}, which I've used in my own projects or coursework.`,
  },
]

export function generateAnswerDraft(question, { company, role, matchedSkills }) {
  const topSkills = (matchedSkills || []).slice(0, 3).map(skillLabel)
  const ctx = { company, role, topSkills }
  const template = TEMPLATES.find((t) => t.pattern.test(question))
  if (template) return template.build(ctx)

  return `[Draft] Consider mentioning your experience with ${topSkills.length ? topSkills.join(', ') : 'skills relevant to this role'} here. Please replace this placeholder with your own specific answer.`
}
