import { useParams } from 'react-router-dom';
import { useReel } from '../hooks/useReel';

export default function Editor() {
  const { reelId } = useParams();
  const { reels } = useReel();
  const reel = reels.find(r => r.id === parseInt(reelId)) || null;

  if (!reel) {
    return <div>Reel not found</div>;
  }

  return (
    <div className="editor-page">
      <h1>Reel Editor</h1>
      <div className="editor-layout">
        <div className="editor-preview">
          <h2>Preview</h2>
          {/* TODO: Video preview */}
          <div className="placeholder">Video Preview</div>
        </div>
        <div className="editor-timeline">
          <h2>Timeline</h2>
          {/* TODO: Scene timeline */}
          <div className="placeholder">Timeline</div>
        </div>
        <div className="editor-controls">
          <h2>AI Controls</h2>
          {/* TODO: Controls for Hook, Script, Duration, Tone, Visual style, Voice, Captions, CTA */}
          <div className="placeholder">Controls</div>
        </div>
      </div>
    </div>
  );
}