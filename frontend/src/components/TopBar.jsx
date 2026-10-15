export default function TopBar({ exercises, exerciseId, onSelect, condition, onCondition, sessionId, locked }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">{'{ ? }'}</span>
        <h1>Predict &amp; Debug</h1>
      </div>

      <label className="field">
        <span>Exercise</span>
        <select value={exerciseId} onChange={(e) => onSelect(e.target.value)} disabled={locked}>
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.category}: {ex.title}
            </option>
          ))}
        </select>
      </label>

      <div className="topbar-end">
        <div className="segmented" role="group" aria-label="Tutor mode">
          <button
            className={condition === 'eed' ? 'on' : ''}
            aria-pressed={condition === 'eed'}
            onClick={() => onCondition('eed')}
            disabled={locked}
          >
            Predict first
          </button>
          <button
            className={condition === 'control' ? 'on' : ''}
            aria-pressed={condition === 'control'}
            onClick={() => onCondition('control')}
            disabled={locked}
          >
            Standard
          </button>
        </div>
        <span className="session" title="Session ID">{sessionId}</span>
      </div>
    </header>
  )
}
