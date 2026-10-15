const STEPS = ['Question', 'Nudge', 'Evidence', 'Explanation']

export default function HintLadder({ level, exhausted }) {
  const current = exhausted ? 4 : level
  return (
    <ol className="ladder" aria-label="Hint level">
      {STEPS.map((label, i) => {
        const n = i + 1
        const state = n < current ? 'done' : n === current ? 'now' : ''
        return (
          <li key={label} className={state} aria-current={n === current ? 'step' : undefined}>
            {label}
          </li>
        )
      })}
    </ol>
  )
}
