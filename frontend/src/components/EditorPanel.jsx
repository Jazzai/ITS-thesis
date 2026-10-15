import Editor from '@monaco-editor/react'

export default function EditorPanel({ code, onChange, onRun, onReset, status, readOnly }) {
  const running = status === 'running'
  return (
    <section className="editor-panel" aria-label="Code editor">
      <div className="panel-bar">
        <span className="file-name">main.cpp</span>
        <div className="actions">
          <button className="btn btn-quiet" onClick={onReset} disabled={running}>
            Reset code
          </button>
          <button className="btn btn-primary" onClick={onRun} disabled={running || readOnly}>
            {running ? 'Running…' : 'Run code'}
          </button>
        </div>
      </div>
      <div className="editor-wrap">
        <Editor
          height="100%"
          defaultLanguage="cpp"
          value={code}
          onChange={(v) => onChange(v ?? '')}
          options={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbersMinChars: 3,
            padding: { top: 12 },
            readOnly,
          }}
        />
      </div>
    </section>
  )
}
