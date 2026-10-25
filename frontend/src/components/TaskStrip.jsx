export default function TaskStrip({ exercise }) {
  return (
    <section className="task" aria-labelledby="task-title">
      <div className="task-head">
        <h2 id="task-title">{exercise.title}</h2>
        <span className="tag">{exercise.category}</span>
        <span className="tag tag-quiet">{exercise.difficulty}</span>
      </div>
      <p>{exercise.description}</p>
    </section>
  )
}
