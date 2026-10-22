import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import TopBar from './components/TopBar'
import ProblemPanel from './components/ProblemPanel'
import EditorPanel from './components/EditorPanel'
import ConsolePanel from './components/ConsolePanel'
import TutorPanel from './components/TutorPanel'
import { fetchExercises, runCode, submitPrediction, logEvent } from './api'

const newSessionId = () => 's-' + Math.random().toString(36).slice(2, 8)

export default function App() {
  const [exercises, setExercises] = useState([])
  const [exerciseId, setExerciseId] = useState('')
  const [code, setCode] = useState('')
  const [condition, setCondition] = useState('eed') // 'eed' | 'control'
  const [sessionId, setSessionId] = useState(newSessionId)

  const [status, setStatus] = useState('idle') // idle | running | awaiting | done
  const [result, setResult] = useState(null)
  const [checkpoint, setCheckpoint] = useState(null)
  const [messages, setMessages] = useState([])
  const [hint, setHint] = useState(null)
  const [busy, setBusy] = useState(false)
  const msgId = useRef(0)

  const exercise = useMemo(() => exercises.find((e) => e.id === exerciseId), [exercises, exerciseId])

  const say = useCallback((m) => {
    setMessages((prev) => [...prev, { id: ++msgId.current, ...m }])
  }, [])

  const resetSession = useCallback(() => {
    setStatus('idle')
    setResult(null)
    setCheckpoint(null)
    setMessages([])
    setHint(null)
    setSessionId(newSessionId())
  }, [])

  useEffect(() => {
    fetchExercises().then((list) => {
      setExercises(list)
      setExerciseId(list[0]?.id ?? '')
      setCode(list[0]?.starter_code ?? '')
    })
  }, [])

  const selectExercise = (id) => {
    const ex = exercises.find((e) => e.id === id)
    setExerciseId(id)
    setCode(ex.starter_code)
    resetSession()
  }

  const changeCondition = (c) => {
    setCondition(c)
    resetSession()
  }

  const handleRun = async () => {
    setStatus('running')
    setMessages((prev) => prev.filter((m) => m.kind !== 'transient'))
    const res = await runCode({
      code,
      exercise_id: exerciseId,
      stdin: exercise?.sample_input ?? '',
      session_id: sessionId,
    })
    setResult(res)
    logEvent({ session_id: sessionId, condition, event: 'run', details: { passed: res.tests?.filter((t) => t.passed).length } })

    const allPass = res.tests?.length > 0 && res.tests.every((t) => t.passed)
    if (res.error) {
      setStatus('done')
      say({ role: 'tutor', text: 'Your program did not compile or run. Read the message in the output panel, fix it, and run again.', tone: 'msg-warn' })
    } else if (allPass) {
      setStatus('done')
      setCheckpoint(null)
      say({ role: 'tutor', text: 'All tests pass. Nice work. Can you explain in your own words what was wrong before?', tone: 'msg-ok' })
    } else if (condition === 'eed' && res.checkpoint) {
      setCheckpoint(res.checkpoint)
      setStatus('awaiting')
    } else {
      setStatus('done')
    }
  }

  const handlePredict = async (predicted) => {
    setBusy(true)
    const cp = checkpoint
    say({ role: 'student', text: `My prediction: ${predicted}` })
    const res = await submitPrediction({
      session_id: sessionId,
      exercise_id: exerciseId,
      checkpoint_id: cp.id,
      predicted,
    })
    logEvent({ session_id: sessionId, condition, event: 'prediction', details: { cp: cp.id, predicted, ...res } })

    setCheckpoint(null)
    setStatus('done')
    say({ kind: 'compare', predicted, actual: res.actual, match: res.match })

    if (res.match || !res.meaningful) {
      say({ role: 'tutor', text: 'Your prediction matches what the code does here. The problem is likely somewhere else. Run again after your next change.', tone: 'msg-ok' })
    } else {
      setHint({ level: res.level, exhausted: res.exhausted })
      say({ role: 'tutor', text: res.hint, tone: res.exhausted ? 'msg-explain' : '' })
    }
    setBusy(false)
  }

  const handleAskHint = async () => {
    logEvent({ session_id: sessionId, condition, event: 'hint_request', details: {} })
    setBusy(true)
    const res = await requestHint({ session_id: sessionId, exercise_id: exerciseId })
    say({ role: 'tutor', text: res.hint, tone: res.exhausted ? 'msg-explain' : '' })
    setBusy(false)
  }

  if (!exercise) return <div className="loading">Loading exercises…</div>

  return (
    <div className="app">
      <TopBar
        exercises={exercises}
        exerciseId={exerciseId}
        onSelect={selectExercise}
        condition={condition}
        onCondition={changeCondition}
        sessionId={sessionId}
        locked={status === 'running' || status === 'awaiting'}
      />
      <main className="workspace">
        <div className="left">
          <ProblemPanel exercise={exercise} />
          <EditorPanel
            code={code}
            onChange={setCode}
            onRun={handleRun}
            onReset={() => { setCode(exercise.starter_code); resetSession() }}
            status={status}
            readOnly={status === 'awaiting'}
          />
          <ConsolePanel status={status} result={result} hidden={status === 'awaiting'} />
        </div>
        <TutorPanel
          messages={messages}
          checkpoint={checkpoint}
          onPredict={handlePredict}
          busy={busy}
          hint={hint}
          condition={condition}
          onAskHint={handleAskHint}
        />
      </main>
    </div>
  )
}
