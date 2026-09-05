export function GlassSkeletonText({ width = '100%', className = '' }) {
  return <div className={`glass-skeleton glass-skeleton-text ${className}`} style={{ width }} />
}

export default function GlassSkeleton({ height = 120, className = '' }) {
  return <div className={`glass-skeleton glass-skeleton-block ${className}`} style={{ height }} />
}
