// Explainable internship ranking. There is no hidden recommendation model
// here — every job's rank is a simple weighted sum of signals that are
// each shown to the user via getMatchReasons() below, so "why am I seeing
// this?" always has a concrete, inspectable answer.

function semanticLabel(score) {
  if (score >= 75) return 'Strong'
  if (score >= 50) return 'Moderate'
  return 'Weak'
}

function locationMatches(job, preferences) {
  if (!preferences.locations || preferences.locations.length === 0) return null
  return preferences.locations.some((loc) => job.location.toLowerCase().includes(loc.toLowerCase()))
}

function workModeMatches(job, preferences) {
  if (!preferences.workMode || preferences.workMode === 'Any') return null
  return job.work_mode === preferences.workMode
}

function roleMatches(job, preferences) {
  if (!preferences.roles || preferences.roles.length === 0) return null
  return preferences.roles.some((role) => job.title.toLowerCase().includes(role.toLowerCase()))
}

// Returns the concrete, human-readable checklist behind a job's ranking —
// used both by the "Recommended because" chips and the fuller
// "Why this internship matches you" panel.
export function getMatchReasons(job, matchResult, preferences) {
  const totalSkills = matchResult ? matchResult.matched_skills.length + matchResult.missing_skills.length : 0
  const locMatch = locationMatches(job, preferences)
  const modeMatch = workModeMatches(job, preferences)
  const roleMatch = roleMatches(job, preferences)

  const checks = []

  if (matchResult) {
    checks.push({
      key: 'semantic',
      ok: matchResult.match_score >= 60,
      label: `${Math.round(matchResult.match_score)}% semantic match (${semanticLabel(matchResult.match_score)})`,
    })
    checks.push({
      key: 'skills',
      ok: totalSkills > 0 && matchResult.matched_skills.length / totalSkills >= 0.5,
      label: totalSkills > 0
        ? `${matchResult.matched_skills.length} / ${totalSkills} detected skills matched`
        : 'No taxonomy skills detected in this posting',
    })
  }

  if (locMatch !== null) {
    checks.push({ key: 'location', ok: locMatch, label: locMatch ? 'Matches your preferred location' : 'Outside your preferred locations' })
  }
  if (modeMatch !== null) {
    checks.push({ key: 'workMode', ok: modeMatch, label: modeMatch ? `${job.work_mode} matches your work-mode preference` : `${job.work_mode} (you prefer ${preferences.workMode})` })
  }
  if (roleMatch !== null) {
    checks.push({ key: 'role', ok: roleMatch, label: roleMatch ? 'Matches one of your preferred roles' : 'Not one of your preferred roles' })
  }

  return { checks, missingSkills: matchResult?.missing_skills ?? [] }
}

// A plain weighted sum used ONLY to order the list — never displayed as a
// score itself. Each term corresponds to one of the checks above.
function rankScore(job, matchResult, preferences) {
  if (!matchResult) return -1
  const totalSkills = matchResult.matched_skills.length + matchResult.missing_skills.length
  const skillRatio = totalSkills > 0 ? matchResult.matched_skills.length / totalSkills : 0

  let score = matchResult.match_score + skillRatio * 25
  if (locationMatches(job, preferences)) score += 10
  if (workModeMatches(job, preferences)) score += 10
  if (roleMatches(job, preferences)) score += 10
  return score
}

export function rankJobs(jobs, matchResults, preferences, limit) {
  const ranked = [...jobs]
    .filter((job) => matchResults[job.id])
    .sort((a, b) => rankScore(b, matchResults[b.id], preferences) - rankScore(a, matchResults[a.id], preferences))
  return typeof limit === 'number' ? ranked.slice(0, limit) : ranked
}
