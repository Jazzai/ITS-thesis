import { useEffect, useRef } from 'react'
import PredictionCard from './PredictionCard'
import DivergenceStrip from './DivergenceStrip'
import HintLadder from './HintLadder'

function Message({ m }) {
  if (m.kind === 'compare') {
    return (
      <li className="msg msg-tutor">
        <DivergenceStrip predicted={m.predicted} actual={m.actual} match={m.match} />
      </li>
    )
  }
  return (
    <li className={`msg ${m.role === 'student' ? 'msg-student' : 'msg-tutor'} ${m.tone ?? ''}`}>
      {m.text}
    </li>
  )
}

export default function TutorPanel({ messages, checkpoint, onPredict, busy, hint, condition, onAskHint }) {
  const endRef = useRef(null)
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, checkpoint])

  return (
    <aside className="tutor" aria-label="Tutor">
      <div className="panel-bar">
        <span>Tutor</span>
        {hint && condition === 'eed' && <HintLadder level={hint.level} exhausted={hint.exhausted} />}
      </div>

      <ol className="thread">
        {messages.length === 0 && !checkpoint && (
          <li className="empty">
            <p>
              {condition === 'eed'
                ? 'Edit the code if you like, then run it. Before the result shows, I will ask you to predict what one part of your program does.'
                : 'Run your code to check it against the tests. Ask for a hint any time you are stuck.'}
            </p>
          </li>
        )}
        {messages.map((m) => (
          <Message key={m.id} m={m} />
        ))}
        {checkpoint && (
          <li className="msg-card">
            <PredictionCard key={checkpoint.id} checkpoint={checkpoint} onSubmit={onPredict} busy={busy} />
          </li>
        )}
        <li ref={endRef} aria-hidden="true" />
      </ol>

      {condition === 'control' && (
        <div className="tutor-foot">
          <button className="btn btn-quiet" onClick={onAskHint}>Ask for a hint</button>
        </div>
      )}
    </aside>
  )
}
