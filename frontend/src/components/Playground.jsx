import { useState } from 'react'
import EditorPanel from './EditorPanel'
import { runFreeCode } from '../api'

export default function Playground({ code, onChange, sessionId }) {
  const [stdin, setStdin] = useState('')
  const [res, setRes] = useState(null)
  const [running, setRunning] = useState(false)

  const run = async () => {
    setRunning(true)
    setRes(await runFreeCode({ code, stdin, session_id: sessionId }))
    setRunning(false)
  }

  return (
    <>
      <div className="pg-bar">
        <div>
          <h2 className="pg-title">Blank IDE</h2>
          <p className="small muted">Write any C++ program and run it. Use the box below for input.</p>
        </div>
        <button className="btn btn-primary" onClick={run} disabled={running || !code.trim()}>
          {running ? 'Running…' : 'Run'}
        </button>
      </div>

      <EditorPanel code={code} onChange={onChange} readOnly={false} />

      <section className="dock" aria-label="Input and output">
        <div className="pg-body">
          <div className="pg-col">
            <label htmlFor="pg-stdin" className="pred-q">Input (stdin)</label>
            <textarea id="pg-stdin" className="pg-stdin" value={stdin} onChange={(e) => setStdin(e.target.value)}
              placeholder="Text your program reads with cin" />
          </div>
          <div className="pg-col" aria-live="polite">
            <h3 className="pred-q">Output</h3>
            <div className="pg-out">
              {!res && <p className="muted small">Run your code to see output here.</p>}
              {res?.error && <pre className="out out-err">{res.error}{res.stderr ? `\n${res.stderr}` : ''}</pre>}
              {res && !res.error && (
                <>
                  {res.stdout && <pre className="out">{res.stdout}</pre>}
                  {res.stderr && <pre className="out out-err">{res.stderr}</pre>}
                  <p className="small muted">Exited with code {res.exit_code}</p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}