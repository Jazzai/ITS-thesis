import { useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'

const THEME = 'its-dark'

function defineTheme(monaco) {
  monaco.editor.defineTheme(THEME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '6cb4ff' },
      { token: 'string', foreground: 'ffd479' },
      { token: 'number', foreground: 'b5e8a0' },
      { token: 'comment', foreground: '5f7794' },
      { token: 'type', foreground: '9ad8ff' },
    ],
    colors: {
      'editor.background': '#0a1727',
      'editorGutter.background': '#0a1727',
      'editor.lineHighlightBackground': '#10243c',
      'editorLineNumber.foreground': '#4a6080',
      'editorLineNumber.activeForeground': '#9fb4d0',
    },
  })
}

// children: the tutor overlay, anchored inside the editor like Figure 4.2.
export default function EditorPanel({ code, onChange, readOnly, checkpointLine, children }) {
  const ref = useRef({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const { editor, monaco, collection } = ref.current
    if (!ready || !editor) return
    if (!checkpointLine) {
      collection.clear()
      return
    }
    collection.set([
      {
        range: new monaco.Range(checkpointLine, 1, checkpointLine, 1),
        options: {
          isWholeLine: true,
          className: 'cp-line',
          glyphMarginClassName: 'cp-glyph',
          glyphMarginHoverMessage: { value: 'Checkpoint' },
          after: { content: 'Checkpoint', inlineClassName: 'cp-badge' },
        },
      },
    ])
    editor.revealLineInCenterIfOutsideViewport(checkpointLine)
  }, [checkpointLine, ready])

  return (
    <section className="editor-panel" aria-label="Code editor">
      <div className="file-tab">
        <span className="file-name">main.cpp</span>
        {readOnly && <span className="lock-note">Locked while you predict</span>}
      </div>
      <div className="stage">
        <div className="stage-editor">
          <Editor
            height="100%"
            defaultLanguage="cpp"
            theme={THEME}
            beforeMount={defineTheme}
            onMount={(editor, monaco) => {
              ref.current = { editor, monaco, collection: editor.createDecorationsCollection() }
              setReady(true)
            }}
            value={code}
            onChange={(v) => onChange(v ?? '')}
            options={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              glyphMargin: true,
              lineNumbersMinChars: 3,
              padding: { top: 12 },
              readOnly,
            }}
          />
        </div>
        {children}
      </div>
    </section>
  )
}
