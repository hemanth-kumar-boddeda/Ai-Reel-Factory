import './Card.css';

export default function Card({
  children,
  title,
  className = '',
  elevated = false,
  interactive = false,
  onClick
}) {
  return (
    <div
      className={`card ${elevated ? 'card-elevated' : ''} ${interactive ? 'card-interactive' : ''} ${className}`}
      onClick={onClick}
    >
      {title && <div className="card-header"><h3 className="card-title">{title}</h3></div>}
      <div className="card-body">{children}</div>
    </div>
  );
}