import { useEffect, useRef, useState } from 'react'

function PredictionTab({ status, checkpoint, evaluation, onPredict, busy }) {
  const [value, setValue] = useState('')
  const inputRef = useRef(null)
  const awaiting = status === 'awaiting' && checkpoint
  const numeric = checkpoint?.answer_type === 'integer' || checkpoint?.answer_type === 'decimal'

  useEffect(() => {
    if (awaiting) {
      setValue('')
      inputRef.current?.focus()
    }
  }, [awaiting, checkpoint?.id])

  const submit = (e) => {
    e.preventDefault()
    if (value.trim()) onPredict(value.trim())
  }

  return (
    <div className="pred">
      <form className="pred-form" onSubmit={submit}>
        <label htmlFor="prediction-input" className="pred-q">What do you expect?</label>
        <p className="small muted">
          {awaiting
            ? `${checkpoint.prediction_prompt} (checkpoint at line ${checkpoint.line})`
            : 'Run your code. At a checkpoint, enter the value you expect before the result is shown.'}
        </p>
        <input
          id="prediction-input"
          ref={inputRef}
          className="pred-input"
          type="text"
          inputMode={checkpoint?.answer_type === 'decimal' ? 'decimal' : numeric ? 'numeric' : 'text'}
          autoComplete="off"
          disabled={!awaiting}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={awaiting ? (numeric ? 'Your number' : 'Your answer') : ''}
        />
        <button className="btn btn-primary btn-wide" type="submit" disabled={!awaiting || busy || !value.trim()}>
          Submit prediction
        </button>
      </form>

      <div className="pred-result" aria-live="polite">
        <h3 className="pred-q">Result</h3>
        {!evaluation ? (
          <p className="small muted">Your result appears here after you submit.</p>
        ) : (
          <>
            <div className="cards">
              <div className="card card-expect">
                <span className="dot" aria-hidden="true" />
                <div>
                  <p className="card-label">You expected</p>
                  <p className="card-value">{String(evaluation.predicted)}</p>
                </div>
              </div>
              <div className={`card ${evaluation.match ? 'card-expect' : 'card-actual'}`}>
                <span className="dot" aria-hidden="true" />
                <div>
                  <p className="card-label">Code produced</p>
                  <p className="card-value">{String(evaluation.actual)}</p>
                </div>
              </div>
            </div>
            {evaluation.match || !evaluation.meaningful ? (
              <div className="note note-ok">
                <p className="note-title">Prediction matches</p>
                <p className="small">The code does what you expected at this checkpoint.</p>
              </div>
            ) : (
              <div className="note note-diverge">
                <p className="note-title">Divergence in {evaluation.taxonomy ?? 'your code'}</p>
                <p className="small">Answer the tutor's question to work out why.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function TraceTab({ trace }) {
  if (trace.length === 0) return <p className="muted pad">Runs, predictions and hints appear here as you work.</p>
  return (
    <ol className="trace pad">
      {trace.map((t) => (
        <li key={t.id} className={`trace-${t.kind}`}>
          <span className="trace-dot" aria-hidden="true" />
          <span className="trace-label">{t.label}</span>
          {t.detail && <span className="trace-detail">{t.detail}</span>}
        </li>
      ))}
    </ol>
  )
}

function OutputTab({ status, result, hidden }) {
  const tests = result?.tests ?? []
  const passed = tests.filter((t) => t.passed).length
  return (
    <div className="pad">
      {status === 'idle' && <p className="muted">Run your code to see its output here.</p>}
      {status === 'running' && <p className="muted">Compiling and running…</p>}
      {hidden && <p className="muted">Output is hidden until you submit your prediction.</p>}
      {result && !hidden && status !== 'running' && (
        <>
          {tests.length > 0 && (
            <p className={`pill ${passed === tests.length ? 'pill-ok' : 'pill-bad'}`}>{passed} of {tests.length} tests pass</p>
          )}
          {result.error && <pre className="out out-err">{result.error}{result.stderr ? `\n${result.stderr}` : ''}</pre>}
          {result.stdout && <pre className="out">{result.stdout}</pre>}
          {tests.length > 0 && (
            <ul className="tests">
              {tests.map((t) => (
                <li key={t.id} className={t.passed ? 'pass' : 'fail'}>
                  <span aria-hidden="true">{t.passed ? '✓' : '✗'}</span> {t.id} {t.passed ? 'passed' : 'failed'}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

export default function Dock({ tab, onTab, condition, ...p }) {
  const tabs = condition === 'eed'
    ? [['prediction', 'Prediction'], ['trace', 'Execution Trace'], ['output', 'Output']]
    : [['trace', 'Execution Trace'], ['output', 'Output']]
  const active = tabs.some(([id]) => id === tab) ? tab : tabs[0][0]

  return (
    <section className="dock" aria-label="Prediction, trace and output">
      <div className="tabs" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" id={`tab-${id}`} aria-selected={active === id} aria-controls={`panel-${id}`}
            className={`tab ${active === id ? 'on' : ''}`} onClick={() => onTab(id)}>
            {label}
            {id === 'prediction' && p.status === 'awaiting' && <span className="tab-ping" aria-label="Prediction needed" />}
          </button>
        ))}
      </div>
      <div className="dock-body" role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`}>
        {active === 'prediction' && <PredictionTab status={p.status} checkpoint={p.checkpoint} evaluation={p.evaluation} onPredict={p.onPredict} busy={p.busy} />}
        {active === 'trace' && <TraceTab trace={p.trace} />}
        {active === 'output' && <OutputTab status={p.status} result={p.result} hidden={p.status === 'awaiting'} />}
      </div>
    </section>
  )
}
