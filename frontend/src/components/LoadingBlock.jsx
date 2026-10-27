import GlassSkeleton, { GlassSkeletonText } from './glass/GlassSkeleton.jsx'

// Placeholder while a page's first request is in flight, shaped roughly
// like the content it stands in for so the layout doesn't jump.
export default function LoadingBlock({ rows = 3, label = 'Loading' }) {
  return (
    <div className="loading-block" role="status" aria-live="polite">
      <span className="visually-hidden">{label}…</span>
      <GlassSkeletonText width="38%" />
      {Array.from({ length: rows }, (_, i) => (
        <GlassSkeleton key={i} height={52} />
      ))}
    </div>
  )
}
