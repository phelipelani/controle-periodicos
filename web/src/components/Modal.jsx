export default function Modal({ titulo, children, onFechar }) {
  return (
    <div className="overlay" onClick={onFechar}>
      <div className="card modal" onClick={(e) => e.stopPropagation()}>
        <h2>{titulo}</h2>
        {children}
      </div>
    </div>
  );
}
