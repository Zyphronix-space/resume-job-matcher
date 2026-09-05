// Polymorphic: renders a <button> by default, or whatever's passed via
// `as` (e.g. react-router's Link) so the same visual treatment covers
// both real actions and navigation without duplicating button styles.
export default function GlassButton({
  as: Component = 'button', variant = 'secondary', size, icon, block = false,
  className = '', children, type, ...rest
}) {
  const classes = [
    'glass-btn', `glass-btn-${variant}`,
    size === 'sm' && 'glass-btn-sm',
    block && 'glass-btn-block',
    className,
  ].filter(Boolean).join(' ')

  return (
    <Component className={classes} type={Component === 'button' ? (type || 'button') : undefined} {...rest}>
      {icon}
      {children}
    </Component>
  )
}
