import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function DiscoverCard({ reel }) {
  const [hovered, setHovered] = useState(false);

  // Format the date to a readable string
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <Link
      to={`/editor/${reel.id}`}
      className="discover-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`Reel: ${reel.title}. Source: ${reel.source}. Status: ${reel.status}. Score: ${reel.score ?? 'N/A'}`}
    >
      <div className={`discover-card-inner ${hovered ? 'hovered' : ''}`}>
        <div className="discover-card-content">
          <div className="discover-card-header">
            <span className="discover-card-source">{reel.source}</span>
            <span className="discover-card-score">
              {reel.score !== undefined ? reel.score : 'N/A'}
            </span>
          </div>
          <h3 className="discover-card-title">{reel.title}</h3>
          {reel.summary && (
            <p className="discover-card-summary">{reel.summary}</p>
          )}
          <div className="discover-card-meta">
            <span className="discover-card-status">{reel.status}</span>
            <span className="discover-card-date">
              {formatDate(reel.created_at)}
            </span>
          </div>
        </div>
        <div className="discover-card-actions">
          <Link to={`/editor/${reel.id}`} className="btn btn-sm">
            View
          </Link>
          <Link to="/create" className="btn btn-sm btn-secondary">
            Create Reel
          </Link>
        </div>
      </div>
    </Link>
  );
}
