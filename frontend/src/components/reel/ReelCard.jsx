import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ReelCard({ reel }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      to={`/editor/${reel.id}`}
      className="reel-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`Reel: ${reel.title}. Status: ${reel.status}. QA score: ${reel.qa_score ?? 'N/A'}`}
    >
      <div className={`reel-card-inner ${hovered ? 'hovered' : ''}`}>
        <div className="reel-thumbnail">
          {/* Placeholder for thumbnail */}
          <div className="thumbnail-placeholder" aria-hidden="true">
            <div className="playButton">▶</div>
          </div>
        </div>
        <div className="reel-info">
          <h3>{reel.title}</h3>
          <p className="reel-source">{reel.source}</p>
          <div className="reel-status">{reel.status}</div>
          <div className="reel-metrics">
            <span>QA: {reel.qa_score ?? 'N/A'}</span>
            <span>Views: N/A</span>
            <span>Shares: N/A</span>
          </div>
        </div>
      </div>
    </Link>
  );
}