function AppIcon({ className = '', size = 36 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      role="img"
    >
      <rect width="32" height="32" rx="7" fill="#115e59" />
      <rect
        x="0.75"
        y="0.75"
        width="30.5"
        height="30.5"
        rx="6.25"
        stroke="#2dd4bf"
        strokeOpacity="0.4"
        fill="none"
      />
      <path
        d="M9 9 L16 19 L23 9"
        stroke="#f0fdfa"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M16 19 V23"
        stroke="#f0fdfa"
        strokeWidth="2.75"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

export default AppIcon
