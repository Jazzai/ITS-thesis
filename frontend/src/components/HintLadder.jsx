// Three Socratic levels plus the direct-explanation fallback (manuscript Section 4.2.2).
const STEPS = [
  { label: 'Ask', title: 'Level 1: open-ended question' },
  { label: 'Narrow', title: 'Level 2: narrowed to the error category' },
  { label: 'Concept', title: 'Level 3: names the concept' },
  { label: 'Explain', title: 'Fallback: direct explanation' },
]

export default function HintLadder({ level, exhausted }) {
  const current = exhausted ? 4 : level
  return (
    <ol className="ladder" aria-label={`Hint level ${current} of 4`}>
      {STEPS.map((s, i) => {
        const n = i + 1
        const state = n < current ? 'done' : n === current ? 'now' : ''
        return (
          <li key={s.label} className={state} title={s.title} aria-current={n === current ? 'step' : undefined}>
            {s.label}
          </li>
        )
      })}
    </ol>
  )
}
