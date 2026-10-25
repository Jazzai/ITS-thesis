import { useEffect, useRef, useState } from 'react'
import TutorBot from './TutorBot'
import HintLadder from './HintLadder'

// Wrap `code` in backticks → <code>, so variable names stand out.
function Rich({ text }) {
  return text.split(/`([^`]+)`/g).map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part))
}

export default function TutorBubble({ tutor, history, onReply, onAskHint, busy, condition }) {
  const [open, setOpen] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [draft, setDraft] = useState('')
  const replyRef = useRef(null)

  // A new message always opens the bubble and clears the draft.
  useEffect(() => {
    if (tutor) {
      setOpen(true)
      setDraft('')
    }
  }, [tutor])

  useEffect(() => {
    if (tutor?.canReply && open) replyRef.current?.focus()
  }, [tutor, open])

  const mood = tutor?.mood ?? 'quiet'
  const send = (e) => {
    e.preventDefault()
    const t = draft.trim()
    if (t && !busy) onReply(t)
  }
  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) send(e)
  }

  return (
    <div className="tutor">
      <button
        className="bot-btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? 'Hide tutor message' : 'Show tutor message'}
      >
        <TutorBot mood={mood} />
        {tutor && !open && <span className="bot-dot" aria-hidden="true" />}
      </button>

      {open && (
        <div className={`bubble ${tutor?.exhausted ? 'bubble-explain' : ''}`} aria-live="polite">
          {!tutor && (
            <>
              <p className="muted">
                {condition === 'eed'
                  ? 'I will stay quiet until your code reaches a checkpoint.'
                  : 'Run your code to check it. Ask for a hint if you get stuck.'}
              </p>
              {condition === 'control' && (
                <button className="btn btn-quiet btn-sm" onClick={onAskHint} disabled={busy}>Ask for a hint</button>
              )}
            </>
          )}

          {tutor && (
            <>
              {condition === 'eed' && tutor.level > 0 && <HintLadder level={tutor.level} exhausted={tutor.exhausted} />}
              <p className="bubble-text"><Rich text={tutor.text} /></p>

              {tutor.canReply && (
                <form className="reply" onSubmit={send}>
                  <label htmlFor="reply-box" className="sr-only">Your answer to the tutor</label>
                  <textarea
                    id="reply-box"
                    ref={replyRef}
                    rows={2}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onKey}
                    placeholder="Type your answer…"
                  />
                  <button className="btn btn-primary btn-sm" type="submit" disabled={busy || !draft.trim()}>Reply</button>
                </form>
              )}

              {condition === 'control' && !tutor.canReply && (
                <button className="btn btn-quiet btn-sm" onClick={onAskHint} disabled={busy}>Ask for another hint</button>
              )}
            </>
          )}

          {history.length > 1 && (
            <>
              <button className="link-btn" onClick={() => setShowHistory((s) => !s)} aria-expanded={showHistory}>
                {showHistory ? 'Hide conversation' : `Conversation (${history.length})`}
              </button>
              {showHistory && (
                <ol className="history">
                  {history.map((m) => (
                    <li key={m.id} className={m.role === 'student' ? 'h-student' : 'h-tutor'}>
                      <span className="h-who">{m.role === 'student' ? 'You' : 'Tutor'}</span> <Rich text={m.text} />
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
