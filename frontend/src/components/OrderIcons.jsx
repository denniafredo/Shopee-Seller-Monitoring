const STROKE = '#1a1a1a'

export function OrderIcon({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke={STROKE}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* clipboard body */}
      <rect x="3" y="4" width="19" height="24" rx="1.5" fill="#f5b841" />
      {/* paper */}
      <rect x="7" y="6.5" width="12.5" height="19" fill="#dcdcdc" />
      {/* clip */}
      <rect x="9.5" y="2" width="7.5" height="4.5" rx="2" fill="#5a5a5a" />
      {/* text lines */}
      <path d="M9.8 11.5h7M9.8 15.5h7M9.8 19.5h4" strokeWidth="2.1" />
      {/* check badge */}
      <circle cx="22.5" cy="22.5" r="8.5" fill="#63c832" />
      <path d="M18.7 22.8l2.9 3 5.3-5.7" stroke="#fff" strokeWidth="2.6" />
    </svg>
  )
}

export function MoneyIcon({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke={STROKE}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* back note */}
      <rect x="6" y="8" width="24" height="13" rx="1" fill="#2fa96b" />
      {/* front note */}
      <rect x="1.5" y="5" width="24" height="13" rx="1" fill="#35c481" />
      <circle cx="13.5" cy="11.5" r="4" fill="#2b9560" />
      {/* coin stack */}
      <rect x="19" y="18.5" width="11.5" height="3.2" rx="1.6" fill="#f7d08a" />
      <rect x="19" y="21.7" width="11.5" height="3.2" rx="1.6" fill="#f7d08a" />
      <rect x="19" y="24.9" width="11.5" height="3.2" rx="1.6" fill="#f7d08a" />
      {/* front coin */}
      <circle cx="20" cy="22.5" r="7" fill="#f9c96b" />
      <path d="M20 18.5v8M22 20a2.2 2.2 0 100 2.7 2.2 2.2 0 110 2.7" strokeWidth="1.6" />
    </svg>
  )
}
