// The signature element: expected vs actual, side by side, with the gap made visible.
export default function DivergenceStrip({ predicted, actual, match }) {
  return (
    <div className={`strip ${match ? 'strip-match' : 'strip-diverge'}`} role="group" aria-label="Prediction compared with actual value">
      <div className="strip-cell strip-expect">
        <span className="strip-label">You expected</span>
        <span className="strip-value">{predicted}</span>
      </div>
      <div className="strip-gap" aria-hidden="true">{match ? '=' : '≠'}</div>
      <div className="strip-cell strip-actual">
        <span className="strip-label">Your code produced</span>
        <span className="strip-value">{actual}</span>
      </div>
    </div>
  )
}
