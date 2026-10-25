// The tutor's face. Its mood mirrors the intervention policy:
// quiet (watching, no checkpoint yet), asking (Socratic question), happy (match / resolved).
export default function TutorBot({ mood = 'quiet', size = 64 }) {
  const eye = '#38c8ff'
  const eyes =
    mood === 'quiet' ? (
      <path d="M23 35h9M40 35h9" stroke={eye} strokeWidth="3" strokeLinecap="round" />
    ) : mood === 'happy' ? (
      <path d="M23 38q4.5-7 9 0M40 38q4.5-7 9 0" fill="none" stroke={eye} strokeWidth="3" strokeLinecap="round" />
    ) : (
      <>
        <circle cx="28" cy="35" r="4.5" fill={eye} />
        <circle cx="44" cy="35" r="4.5" fill={eye} />
      </>
    )
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" aria-hidden="true" focusable="false">
      <line x1="36" y1="7" x2="36" y2="15" stroke="#8ea3c0" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="36" cy="6" r="3.5" fill={mood === 'quiet' ? '#4a6080' : eye} />
      <circle cx="9" cy="35" r="5" fill="#1f6fe0" />
      <circle cx="63" cy="35" r="5" fill="#1f6fe0" />
      <rect x="12" y="15" width="48" height="40" rx="14" fill="#d6ebff" />
      <rect x="18" y="24" width="36" height="22" rx="10" fill="#0a1b33" />
      {eyes}
      <rect x="24" y="57" width="24" height="10" rx="5" fill="#1f6fe0" />
    </svg>
  )
}
