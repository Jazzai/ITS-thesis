import axios from 'axios'
import { SAMPLE_EXERCISES } from './data/sampleExercise'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const http = axios.create({ baseURL: BASE, timeout: 15000 })

/* ------------------------------------------------------------------ *
 * Contract this UI expects from the backend (adjust names to match):
 *
 * GET  /exercises                      -> Exercise[]
 * POST /run      {code, exercise_id, stdin, session_id}
 *      -> { stdout, stderr, exit_code, error?, tests:[{id,passed}],
 *           checkpoint?: { id, line, prediction_prompt, answer_type } }
 * POST /predict  {session_id, exercise_id, checkpoint_id, predicted}
 *      -> { match, meaningful, actual, taxonomy, level, hint, exhausted }
 * POST /log      {session_id, condition, event, details}
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

export async function submitPrediction(payload) {
  try {
    const { data } = await http.post('/predict', payload)
    return data
  } catch {
    return mockPredict(payload)
  }
}

export function logEvent(payload) {
  http.post('/log', payload).catch(() => {})
}

/* ------------------------------ mock ------------------------------ */
const HINTS = [
  'What did you expect the loop to do here?',
  'Look at your boundary condition. Is it looping the right amount of times?',
  'Your variable reached {actual}, but you expected {predicted}.',
]
const mockAttempts = {}

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

function mockPredict({ session_id, predicted }) {
  const actual = 4
  if (Number(predicted) === actual) return { match: true, meaningful: false, actual }
  const n = (mockAttempts[session_id] = (mockAttempts[session_id] ?? 0) + 1)
  const exhausted = n > 3
  return {
    match: false,
    meaningful: true,
    actual,
    taxonomy: 'Loop',
    level: Math.min(n, 3),
    exhausted,
    hint: exhausted
      ? 'The loop condition stops one iteration early. Change i < n to i <= n.'
      : HINTS[n - 1].replace('{actual}', actual).replace('{predicted}', predicted),
  }
}
