import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import TaskStrip from './components/TaskStrip'
import EditorPanel from './components/EditorPanel'
import TutorBubble from './components/TutorBubble'
import Dock from './components/Dock'
import { fetchExercises, runCode, submitPrediction, replyToTutor, requestHint, logEvent } from './api'

const newSessionId = () => 's-' + Math.random().toString(36).slice(2, 8)

export default function App() {
  const [exercises, setExercises] = useState([])
  const [exerciseId, setExerciseId] = useState('')
  const [code, setCode] = useState('')
  const [condition, setCondition] = useState('eed') // 'eed' (predict first) | 'control' (standard)
  const [sessionId, setSessionId] = useState(newSessionId)

  const [status, setStatus] = useState('idle') // idle | running | awaiting | done
  const [result, setResult] = useState(null)
  const [checkpoint, setCheckpoint] = useState(null)
  const [evaluation, setEvaluation] = useState(null) // {predicted, actual, match, meaningful, taxonomy}
  const [tutor, setTutor] = useState(null) // {text, mood, level, exhausted, canReply}
  const [history, setHistory] = useState([])
  const [trace, setTrace] = useState([])
  const [tab, setTab] = useState('output')
  const [completed, setCompleted] = useState([])
  const [busy, setBusy] = useState(false)
  const nextId = useRef(0)

  const exercise = useMemo(() => exercises.find((e) => e.id === exerciseId), [exercises, exerciseId])

  const note = useCallback((kind, label, detail = '') => {
    setTrace((prev) => [...prev, { id: ++nextId.current, kind, label, detail }])
  }, [])

  const tutorSays = useCallback((m) => {
    setTutor({ level: 0, exhausted: false, canReply: false, ...m })
    setHistory((prev) => [...prev, { id: ++nextId.current, role: 'tutor', text: m.text }])
  }, [])

  const resetSession = useCallback(() => {
    setStatus('idle')
    setResult(null)
    setCheckpoint(null)
    setEvaluation(null)
    setTutor(null)
    setHistory([])
    setTrace([])
    setTab(condition === 'eed' ? 'prediction' : 'output')
    setSessionId(newSessionId())
  }, [condition])

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
    setStatus('idle')
    setResult(null)
    setCheckpoint(null)
    setEvaluation(null)
    setTutor(null)
    setHistory([])
    setTrace([])
    setTab(c === 'eed' ? 'prediction' : 'output')
    setSessionId(newSessionId())
  }

  /* ---------------------------- run & check ---------------------------- */
  const handleRun = async () => {
    setStatus('running')
    setTutor(null)
    setEvaluation(null)
    setCheckpoint(null)
    setTab('output')

    const res = await runCode({ code, exercise_id: exerciseId, stdin: exercise?.sample_input ?? '', session_id: sessionId })
    setResult(res)
    const passed = res.tests?.filter((t) => t.passed).length ?? 0
    const total = res.tests?.length ?? 0
    note('run', 'Ran your code', res.error ? 'did not compile' : `${passed} of ${total} tests pass`)
    logEvent({ session_id: sessionId, condition, event: 'run', details: { passed } })

    const allPass = total > 0 && passed === total
    if (res.error) {
      setStatus('done') // compile/runtime errors are shown in Output; the tutor stays quiet
    } else if (allPass) {
      setStatus('done')
      setCompleted((c) => (c.includes(exerciseId) ? c : [...c, exerciseId]))
      tutorSays({ text: 'All tests pass. In your own words, what was wrong before?', mood: 'happy', canReply: true })
    } else if (condition === 'eed' && res.checkpoint) {
      setCheckpoint(res.checkpoint)
      setStatus('awaiting')
      setTab('prediction')
      note('checkpoint', `Reached checkpoint at line ${res.checkpoint.line}`)
    } else {
      setStatus('done')
    }
  }

  /* ------------------------------ prediction ------------------------------ */
  const handlePredict = async (predicted) => {
    setBusy(true)
    note('prediction', 'You predicted', predicted)
    const res = await submitPrediction({ session_id: sessionId, exercise_id: exerciseId, checkpoint_id: checkpoint.id, predicted })
    logEvent({ session_id: sessionId, condition, event: 'prediction', details: { cp: checkpoint.id, predicted, ...res } })

    setStatus('done')
    setEvaluation({ predicted, actual: res.actual, match: res.match, meaningful: res.meaningful, taxonomy: res.taxonomy })
    note('result', 'Code produced', String(res.actual))

    if (res.match || !res.meaningful) {
      tutorSays({ text: "Good job! Your prediction matches what the code does here. I'll stay quiet until your next checkpoint.", mood: 'happy' })
    } else {
      note('hint', res.exhausted ? 'Tutor explained' : `Tutor asked (level ${res.level})`)
      tutorSays({ text: res.hint, mood: 'asking', level: res.level, exhausted: res.exhausted, canReply: !res.exhausted })
    }
    setBusy(false)
  }

  /* --------------------------- reply to the tutor --------------------------- */
  const handleReply = async (text) => {
    setBusy(true)
    setHistory((prev) => [...prev, { id: ++nextId.current, role: 'student', text }])
    const res = await replyToTutor({ session_id: sessionId, exercise_id: exerciseId, checkpoint_id: checkpoint?.id, text })
    logEvent({ session_id: sessionId, condition, event: 'reply', details: { ...res } })

    if (res.resolved) {
      note('resolved', 'Misconception resolved')
      tutorSays({ text: res.feedback ?? 'That explains it. Update your code and run it again.', mood: 'happy' })
    } else {
      note('hint', res.exhausted ? 'Tutor explained' : `Tutor asked (level ${res.level})`)
      tutorSays({ text: res.hint, mood: 'asking', level: res.level, exhausted: res.exhausted, canReply: !res.exhausted })
    }
    setBusy(false)
  }

  /* ------------------- Standard condition: generic hint ------------------- */
  const handleAskHint = async () => {
    setBusy(true)
    logEvent({ session_id: sessionId, condition, event: 'hint_request', details: {} })
    const res = await requestHint({ session_id: sessionId, exercise_id: exerciseId })
    note('hint', 'You asked for a hint')
    tutorSays({ text: res.hint, mood: 'asking', level: res.level, exhausted: res.exhausted })
    setBusy(false)
  }

  if (!exercise) return <div className="loading">Loading exercises…</div>

  const awaiting = status === 'awaiting'

  return (
    <div className="shell">
      <TopBar onRun={handleRun} onReset={() => { setCode(exercise.starter_code); resetSession() }} status={status} readOnly={awaiting} />
      <Sidebar
        exercises={exercises}
        exerciseId={exerciseId}
        onSelect={selectExercise}
        completed={completed}
        locked={status === 'running' || awaiting}
        condition={condition}
        onCondition={changeCondition}
        sessionId={sessionId}
      />
      <main className="main">
        <TaskStrip exercise={exercise} />
        <EditorPanel code={code} onChange={setCode} readOnly={awaiting} checkpointLine={checkpoint?.line}>
          <TutorBubble
            tutor={tutor}
            history={history}
            onReply={handleReply}
            onAskHint={handleAskHint}
            busy={busy}
            condition={condition}
          />
        </EditorPanel>
        <Dock
          tab={tab}
          onTab={setTab}
          condition={condition}
          status={status}
          checkpoint={checkpoint}
          evaluation={evaluation}
          result={result}
          trace={trace}
          onPredict={handlePredict}
          busy={busy}
        />
      </main>
    </div>
  )
}
