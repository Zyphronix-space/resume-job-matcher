// Rule-based cover-letter drafting — deliberately NOT a call to an LLM API.
// The draft only ever references skills the backend actually detected as
// matched; it never invents projects, employers, or achievements, and it
// leaves the signature as a placeholder since the CV's name isn't parsed.
// The UI must still label the result "AI-generated draft — review before
// sending" and let the user edit it before it's used anywhere.

import { skillLabel } from './skillLabel.js'

export function generateCoverLetterDraft({ role, company, matchedSkills }) {
  const topSkills = (matchedSkills || []).slice(0, 4).map(skillLabel)
  const skillsSentence = topSkills.length
    ? `Based on my resume, my experience with ${topSkills.join(', ')} lines up with several of the skills you're looking for.`
    : "I'm excited to apply my current skills toward this role and to keep growing in the areas it calls for."

  return `Dear Hiring Team at ${company},

I'm writing to apply for the ${role} position. ${skillsSentence}

I'd welcome the opportunity to discuss how my background could contribute to your team, and I'm looking forward to learning more about the role.

Thank you for your time and consideration.

Sincerely,
[Your name]`
}
