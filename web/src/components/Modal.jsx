export default function Modal({ titulo, children, onFechar, largura, style }) {
  return (
    <div className="overlay" onClick={onFechar}>
      <div
        className="card modal"
        style={{ ...(largura ? { maxWidth: largura, width: '100%' } : {}), ...style }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{titulo}</h2>
        {children}
      </div>
    </div>
  );
}
