export default function ConsolePanel({ status, result, hidden }) {
  const tests = result?.tests ?? []
  const passed = tests.filter((t) => t.passed).length

  return (
    <section className="console" aria-label="Output" aria-live="polite">
      <div className="panel-bar">
        <span>Output</span>
        {tests.length > 0 && !hidden && (
          <span className={`pill ${passed === tests.length ? 'pill-ok' : 'pill-bad'}`}>
            {passed} of {tests.length} tests pass
          </span>
        )}
      </div>

      <div className="console-body">
        {status === 'idle' && <p className="muted">Run your code to see its output here.</p>}
        {status === 'running' && <p className="muted">Compiling and running…</p>}
        {hidden && (
          <p className="muted">
            Output is hidden until you make your prediction in the tutor panel.
          </p>
        )}
        {result && !hidden && (
          <>
            {result.error && <pre className="out out-err">{result.error}{result.stderr ? `\n${result.stderr}` : ''}</pre>}
            {result.stdout && <pre className="out">{result.stdout}</pre>}
            {tests.length > 0 && (
              <ul className="tests">
                {tests.map((t) => (
                  <li key={t.id} className={t.passed ? 'pass' : 'fail'}>
                    <span aria-hidden="true">{t.passed ? '✓' : '✗'}</span>
                    {t.id} {t.passed ? 'passed' : 'failed'}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  )
}
