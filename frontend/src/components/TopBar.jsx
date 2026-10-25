export default function TopBar({ onRun, onReset, status, readOnly }) {
  const running = status === 'running'
  return (
    <header className="topbar">
      <div className="brand">
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 1l2.2 5.8L18 9l-5.8 2.2L10 17l-2.2-5.8L2 9l5.8-2.2z" fill="none" stroke="#38c8ff" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        <h1>Practice C++ Tutor</h1>
      </div>
      <div className="top-actions">
        <button className="btn btn-quiet" onClick={onReset} disabled={running}>Reset</button>
        <button className="btn btn-primary" onClick={onRun} disabled={running || readOnly}>
          {running ? 'Running…' : 'Run & Check'}
        </button>
      </div>
    </header>
  )
}
