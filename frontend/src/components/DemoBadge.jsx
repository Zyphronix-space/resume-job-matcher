// Every posting from the bundled sample data carries is_demo=true — this
// badge is how that reaches the screen. Never rendered for a posting that
// isn't actually marked demo, so a real provider added later won't be
// mislabeled.
export default function DemoBadge() {
  return <span className="demo-badge" title="Sample data, not a live posting">DEMO</span>
}
