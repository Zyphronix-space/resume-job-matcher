import GlassBadge from './glass/GlassBadge.jsx'
import { relativeDays, sourceLabel } from '../utils/workspace.js'

// Badges and the posted/checked line, shared by the job list and job page.
export function PostingBadges({ posting }) {
  return (
    <>
      {posting.status === 'expired' && <GlassBadge variant="danger">No longer listed</GlassBadge>}
      {posting.status !== 'expired' && posting.is_stale && (
        <GlassBadge variant="warning">Posted over 60 days ago</GlassBadge>
      )}
      {posting.open_to_sri_lanka && <GlassBadge variant="neutral">Open to Sri Lanka</GlassBadge>}
    </>
  )
}

export function PostedLine({ posting }) {
  const posted = relativeDays(posting.posted_at)
  const verified = relativeDays(posting.last_verified_at)
  return (
    <span>
      {posted ? `Posted ${posted}` : 'Posting date not stated'}
      {' · '}{posting.source?.kind === 'manual'
        ? 'Copied by ResumeMatch from the employer’s own advert'
        : `From ${posting.source?.name ? `${posting.source.name}’s` : 'the employer’s'} ${sourceLabel(posting.source)} board`}
      {verified && <>, checked {verified}</>}
    </span>
  )
}
