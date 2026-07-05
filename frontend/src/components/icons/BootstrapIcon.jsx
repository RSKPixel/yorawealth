function BootstrapIcon({ icon, className = '' }) {
  if (!icon) return null

  const iconClass = icon.startsWith('bi-') ? icon : `bi-${icon}`

  return (
    <i
      className={`bi ${iconClass} ${className}`.trim()}
      aria-hidden="true"
    />
  )
}

export default BootstrapIcon
