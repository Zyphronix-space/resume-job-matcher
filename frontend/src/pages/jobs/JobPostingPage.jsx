import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import GlassButton from '../../components/glass/GlassButton.jsx'
import GlassCard from '../../components/glass/GlassCard.jsx'
import GlassEmptyState from '../../components/glass/GlassEmptyState.jsx'
import { useToast } from '../../components/glass/GlassToast.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import LoadingBlock from '../../components/LoadingBlock.jsx'
import AssessmentView from '../../components/AssessmentView.jsx'
import CollapsibleText from '../../components/CollapsibleText.jsx'
import { PostingBadges } from '../../components/PostingFacts.jsx'
import { WarningIcon } from '../../components/icons.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { skillLabel } from '../../utils/skillLabel.js'
import { assessPosting, formatDate, getPosting, postingFacts, sourceLabel, trackPosting } from '../../utils/workspace.js'

export default function JobPostingPage() {
  const { postingId } = useParams()
  const { user } = useAuth()
  const showToast = useToast()
  const [posting, setPosting] = useState(null)
  const [error, setError] = useState(null)
  const [assessment, setAssessment] = useState(null)
  const [assessError, setAssessError] = useState(null)
  const [assessing, setAssessing] = useState(false)
  const [saving, setSaving] = useState(false)
  const isCandidate = user?.role === 'candidate'

  useEffect(() => {
    setPosting(null)
    setAssessment(null)
    getPosting(postingId).then(setPosting).catch((err) => setError(err.message))
  }, [postingId])

  const runAssessment = async () => {
    setAssessing(true)
    setAssessError(null)
    try {
      setAssessment(await assessPosting(postingId))
    } catch (err) {
      setAssessError(err.message)
    } finally {
      setAssessing(false)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const tracked = await trackPosting(posting.id)
      setPosting((p) => ({ ...p, tracked_id: tracked.id }))
      showToast('Saved to your tracker', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (error) {
    return (
      <GlassEmptyState
        title="This job couldn’t be found"
        subtitle={error}
        action={<GlassButton as={Link} to="/openings" variant="secondary">Back to jobs</GlassButton>}
      />
    )
  }
  if (!posting) return <LoadingBlock rows={4} label="Loading job" />

  const expired = posting.status === 'expired'
  const applyUrl = posting.apply_url || posting.source_url

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb"><Link to="/openings">Jobs</Link> / {posting.company}</nav>
      <PageHeader
        title={posting.title}
        meta={<><strong>{posting.company}</strong>{postingFacts(posting).length > 0 && <> · {postingFacts(posting).join(' · ')}</>}</>}
        actions={(
          <>
            {isCandidate && (posting.tracked_id ? (
              <GlassButton as={Link} to={`/tracker/${posting.tracked_id}`} variant="secondary">Open in tracker</GlassButton>
            ) : (
              <GlassButton variant="secondary" loading={saving} loadingText="Saving…" onClick={save}>Save to tracker</GlassButton>
            ))}
            {applyUrl && !expired && (
              <GlassButton as="a" href={applyUrl} target="_blank" rel="noopener noreferrer" variant="primary">
                Apply on employer site
              </GlassButton>
            )}
          </>
        )}
      />

      <div className="posting-badges-row"><PostingBadges posting={posting} /></div>

      {expired && (
        <p className="form-alert is-warning" role="status">
          <WarningIcon size={15} />
          {posting.source.name}’s job board stopped listing this role
          {posting.closed_at ? ` on ${formatDate(posting.closed_at)}` : ''}. It’s kept here for reference; it’s probably closed.
        </p>
      )}

      <div className="detail-grid">
        <div className="stack">
          {isCandidate && (
            <GlassCard
              title="Your fit for this role"
              subtitle="Compares your active resume with this posting. Takes a few seconds."
              actions={!assessment && (
                <GlassButton variant="primary" size="sm" loading={assessing} loadingText="Comparing…" onClick={runAssessment}>
                  Check my fit
                </GlassButton>
              )}
            >
              {assessError && (
                <p className="field-error" role="alert">
                  <WarningIcon size={15} />{assessError}
                  {/resume/i.test(assessError) && <> <Link to="/resumes" className="text-link">Upload a resume</Link></>}
                </p>
              )}
              {assessment && <AssessmentView assessment={assessment} />}
            </GlassCard>
          )}

          {!user && (
            <GlassCard title="See how your resume fits">
              <p className="form-hint">
                Sign up free to compare your resume with this posting, requirement by requirement, and keep track of your application.
              </p>
              <div className="button-row">
                <GlassButton as={Link} to="/signup" variant="primary">Create an account</GlassButton>
                <GlassButton as={Link} to="/login" variant="ghost">Sign in</GlassButton>
              </div>
            </GlassCard>
          )}

          <GlassCard title="Job description">
            {posting.description
              ? <CollapsibleText text={posting.description} />
              : <p className="form-hint">The source didn’t include a description. Read it on the employer’s site.</p>}
          </GlassCard>
        </div>

        <aside className="stack">
          <GlassCard title="About this listing">
            <dl className="definition-list">
              <div className="definition-row"><dt>Employer</dt><dd>{posting.company}</dd></div>
              <div className="definition-row"><dt>Location</dt><dd>{posting.location || posting.country || 'Not stated'}</dd></div>
              <div className="definition-row"><dt>Posted</dt><dd>{posting.posted_at ? formatDate(posting.posted_at) : 'Not stated by the source'}</dd></div>
              {posting.expires_at && <div className="definition-row"><dt>Closes</dt><dd>{formatDate(posting.expires_at)}</dd></div>}
              <div className="definition-row">
                <dt>Source</dt>
                <dd>
                  {posting.source.kind === 'manual' ? 'Added by ResumeMatch from the employer’s advert' : `${posting.source.name}’s job board (${sourceLabel(posting.source)})`}
                  {posting.source_url && <> · <a className="text-link" href={posting.source_url} target="_blank" rel="noopener noreferrer">original listing</a></>}
                </dd>
              </div>
              <div className="definition-row"><dt>Last checked</dt><dd>{formatDate(posting.last_verified_at)}</dd></div>
            </dl>
          </GlassCard>

          {posting.skills.length > 0 && (
            <GlassCard title="Skills named in the posting" subtitle="Detected from the text against a fixed skills list.">
              <ul className="tag-list">
                {posting.skills.map((s) => (
                  <li key={s} className={`tag ${posting.skill_overlap?.found_skills?.includes(s) ? 'is-found' : ''}`}>{skillLabel(s)}</li>
                ))}
              </ul>
              {posting.skill_overlap && (
                <p className="form-hint">Highlighted: on your active resume ({posting.skill_overlap.found} of {posting.skill_overlap.total}).</p>
              )}
            </GlassCard>
          )}
        </aside>
      </div>
    </>
  )
}
