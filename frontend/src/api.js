import axios from 'axios'
import { SAMPLE_EXERCISES } from './data/sampleExercise'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const http = axios.create({ baseURL: BASE, timeout: 90000 })

/* ------------------------------------------------------------------ *
 * Contract this UI expects from the backend:
 *
 * GET  /exercises  -> Exercise[]
 * POST /run     {code, exercise_id, stdin, session_id}
 *   -> { stdout, stderr, exit_code, error?, tests:[{id,passed}],
 *        checkpoint?: { id, line, prediction_prompt, answer_type } }
 * POST /predict {session_id, exercise_id, checkpoint_id, predicted}
 *   -> { match, meaningful, actual, taxonomy?, level?, hint?, exhausted? }
 * POST /reply   {session_id, exercise_id, checkpoint_id, text}
 *   -> { resolved, feedback?, hint?, level?, exhausted? }
 * POST /hint    {session_id, exercise_id}            (Standard condition)
 *   -> { hint, level, exhausted }
 * POST /log     {session_id, condition, event, details}
 *
 * If the backend is unreachable, a small mock keeps the UI usable.
 * ------------------------------------------------------------------ */

export async function fetchExercises() {
  try {
    const { data } = await http.get('/exercises')
    return data
  } catch {
    return SAMPLE_EXERCISES
  }
}

export async function runCode(payload) {
  try {
    const { data } = await http.post('/run', payload)
    return data
  } catch {
    return mockRun(payload)
  }
}

export async function runFreeCode(payload) {
  try {
    const { data } = await http.post('/run-free', payload)
    return data
  } catch {
    return { error: 'Cannot reach the backend. Start it with: uvicorn backend.app:app --port 8000', stdout: '', stderr: '', exit_code: -1 }
  }
}

export async function submitPrediction(payload) {
  try {
    const { data } = await http.post('/predict', payload)
    return data
  } catch {
    return mockPredict(payload)
  }
}

export async function replyToTutor(payload) {
  try {
    const { data } = await http.post('/reply', payload)
    return data
  } catch {
    return mockReply(payload)
  }
}

export async function requestHint(payload) {
  try {
    const { data } = await http.post('/hint', payload)
    return data
  } catch {
    return mockHint(payload)
  }
}

export function logEvent(payload) {
  http.post('/log', payload).catch(() => {})
}

/* ------------------------------ mock ------------------------------ */
// Wording follows the three-level structure in the manuscript (Section 4.2.2).
const LADDER = [
  'You expected the loop body to run {predicted} times, but it ran {actual}. What do you think happened on the last pass?',
  "Let's look at the loop condition. When i equals n, does the condition still hold?",
  'A loop condition decides whether to run another pass. Which comparison operator includes the boundary value?',
]
const FALLBACK = 'The condition i < n stops before i reaches n, so n is never added. Use i <= n to include it.'
const mockAttempts = {}
const nextAttempt = (sid) => (mockAttempts[sid] = (mockAttempts[sid] ?? 0) + 1)

function mockRun({ code, exercise_id }) {
  const fixed = code.includes('<= n') || code.includes('answer = cube') || code.includes('3.0')
  return {
    stdout: fixed ? 'Result matches the expected output.\n' : 'Sum: 10\n',
    stderr: '',
    exit_code: 0,
    tests: [
      { id: 'tc1', passed: true },
      { id: 'tc2', passed: fixed },
      { id: 'tc3', passed: fixed },
      { id: 'tc4', passed: fixed },
      { id: 'tc5', passed: fixed },
    ],
    checkpoint: fixed
      ? null
      : { id: 'cp1', line: 13, prediction_prompt: 'How many times do you think the body of this loop will run?', answer_type: 'integer' },
    _mock: true,
    _exercise: exercise_id,
  }
}

function ladder(n, predicted, actual) {
  const exhausted = n >= 4
  return {
    level: Math.min(n, 3),
    exhausted,
    hint: exhausted ? FALLBACK : LADDER[n - 1].replace('{predicted}', predicted).replace('{actual}', actual),
  }
}

function mockPredict({ session_id, predicted }) {
  const actual = 4
  if (Number(predicted) === actual) return { match: true, meaningful: false, actual }
  mockAttempts[session_id] = 0
  return { match: false, meaningful: true, actual, taxonomy: 'Loop', ...ladder(nextAttempt(session_id), predicted, actual) }
}

function mockReply({ session_id, text }) {
  if (/<=|equal|include|last|boundary/i.test(text)) {
    return { resolved: true, feedback: 'That accounts for it: the loop stopped one pass early. Fix the condition and run again.' }
  }
  return { resolved: false, ...ladder(nextAttempt(session_id), '?', 4) }
}

function mockHint({ session_id }) {
  return ladder(nextAttempt(session_id), '?', '?')
}
