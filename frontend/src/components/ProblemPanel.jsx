export default function ProblemPanel({ exercise }) {
  return (
    <section className="problem" aria-labelledby="problem-title">
      <div className="problem-head">
        <h2 id="problem-title">{exercise.title}</h2>
        <span className="tag">{exercise.category}</span>
        <span className="tag tag-quiet">{exercise.difficulty}</span>
      </div>
      <p>{exercise.description}</p>
    </section>
  )
}
