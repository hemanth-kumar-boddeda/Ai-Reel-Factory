import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ReelCard({ reel }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link to={`/editor/${reel.id}`} className="reel-card" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className={`reel-card-inner ${hovered ? 'hovered' : ''}`}>
        <div className="reel-thumbnail">
          {/* Placeholder for thumbnail */}
          <div className="thumbnail-placeholder">
            <div className="playButton">▶</div>
          </div>
        </div>
        <div className="reel-info">
          <h3>{reel.title}</h3>
          <p className="reel-source">{reel.source}</p>
          <div className="reel-status">{reel.status}</div>
          <div className="reel-metrics">
            <span>QA: {reel.qa_score ?? 'N/A'}</span>
            <span>Views: {/* TODO */}</span>
            <span>Shares: {/* TODO */}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}