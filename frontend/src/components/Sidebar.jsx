import { useState } from 'react'

export default function Sidebar({ exercises, exerciseId, onSelect, completed, locked, condition, onCondition, sessionId }) {
  const [panel, setPanel] = useState(null)
  const toggle = (name) => setPanel((p) => (p === name ? null : name))

  return (
    <aside className="side" aria-label="Activities and settings">
      <div className="student">
        <span className="avatar" aria-hidden="true">S</span>
        <div>
          <p className="student-name">Student</p>
          <p className="student-id" title="Session ID">{sessionId}</p>
        </div>
      </div>

      <nav aria-label="Activities">
        <p className="side-label">Activities</p>
        <ul className="activities">
          {exercises.map((ex, i) => (
            <li key={ex.id}>
              <button
                className={`activity ${ex.id === exerciseId ? 'on' : ''}`}
                aria-current={ex.id === exerciseId ? 'page' : undefined}
                onClick={() => onSelect(ex.id)}
                disabled={locked}
              >
                <span className="activity-n">{i + 1}</span>
                <span className="activity-text">
                  <span className="activity-title">{ex.title}</span>
                  <span className="activity-meta">{ex.category}</span>
                </span>
                {completed.includes(ex.id) && <span className="activity-done" aria-label="Completed">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="side-foot">
        {panel === 'settings' && (
          <div className="popover" role="group" aria-label="Tutor mode">
            <p className="side-label">Tutor mode</p>
            <div className="segmented">
              <button className={condition === 'eed' ? 'on' : ''} aria-pressed={condition === 'eed'} onClick={() => onCondition('eed')} disabled={locked}>
                Predict first
              </button>
              <button className={condition === 'control' ? 'on' : ''} aria-pressed={condition === 'control'} onClick={() => onCondition('control')} disabled={locked}>
                Standard
              </button>
            </div>
            <p className="small muted">Changing the mode restarts the session.</p>
          </div>
        )}
        {panel === 'help' && (
          <div className="popover">
            <p className="side-label">How it works</p>
            <ol className="help-steps">
              <li>Run your code. The tutor stays quiet until a checkpoint is reached.</li>
              <li>Predict the value at the checkpoint. The result is hidden until you submit.</li>
              <li>If your prediction differs from what the code did, the tutor asks questions, from broad to specific.</li>
            </ol>
          </div>
        )}
        <button className={`foot-btn ${panel === 'settings' ? 'on' : ''}`} onClick={() => toggle('settings')} aria-expanded={panel === 'settings'}>Settings</button>
        <button className={`foot-btn ${panel === 'help' ? 'on' : ''}`} onClick={() => toggle('help')} aria-expanded={panel === 'help'}>Help</button>
      </div>
    </aside>
  )
}
