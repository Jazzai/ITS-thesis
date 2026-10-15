import { useState } from 'react'

export default function PredictionCard({ checkpoint, onSubmit, busy }) {
  const [value, setValue] = useState('')
  const numeric = checkpoint.answer_type === 'integer' || checkpoint.answer_type === 'decimal'

  const submit = (e) => {
    e.preventDefault()
    if (value.trim() !== '') onSubmit(value.trim())
  }

  return (
    <form className="prediction" onSubmit={submit}>
      <p className="prediction-where">Checkpoint at line {checkpoint.line}</p>
      <label htmlFor="prediction-input" className="prediction-q">
        {checkpoint.prediction_prompt}
      </label>
      <div className="prediction-row">
        <input
          id="prediction-input"
          className="prediction-input"
          type="text"
          inputMode={checkpoint.answer_type === 'decimal' ? 'decimal' : numeric ? 'numeric' : 'text'}
          autoComplete="off"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={numeric ? 'Your number' : 'Your answer'}
        />
        <button className="btn btn-primary" type="submit" disabled={busy || value.trim() === ''}>
          Lock in prediction
        </button>
      </div>
      <p className="muted small">Reason it through from the code, then answer. The result appears after you lock it in.</p>
    </form>
  )
}
