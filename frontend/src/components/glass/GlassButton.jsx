// Polymorphic: renders a <button> by default, or whatever's passed via
// `as` (e.g. react-router's Link) so the same visual treatment covers
// both real actions and navigation without duplicating button styles.
// `loading` disables the button, shows a spinner, and swaps in
// `loadingText` when given, so a submit can't be fired twice.
export default function GlassButton({
  as: Component = 'button', variant = 'secondary', size, icon, block = false,
  loading = false, loadingText, disabled, className = '', children, type, ...rest
}) {
  const classes = [
    'glass-btn', `glass-btn-${variant}`,
    size === 'sm' && 'glass-btn-sm',
    size === 'lg' && 'glass-btn-lg',
    block && 'glass-btn-block',
    className,
  ].filter(Boolean).join(' ')

  const isButton = Component === 'button'

  return (
    <Component
      className={classes}
      type={isButton ? (type || 'button') : undefined}
      disabled={isButton ? disabled || loading : undefined}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="spinner" aria-hidden="true" /> : icon}
      {loading && loadingText ? loadingText : children}
    </Component>
  )
}
