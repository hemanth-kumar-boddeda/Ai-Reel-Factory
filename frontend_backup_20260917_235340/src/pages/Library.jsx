import { useReel } from '../hooks/useReel';
import ReelCard from '../components/reel/ReelCard';

export default function Library() {
  const { reels, loading } = useReel();

  if (loading) return <div>Loading...</div>;

  return (
    <div className="library-page">
      <h1>Reel Library</h1>
      <div className="reel-grid">
        {reels.map(reel => (
          <ReelCard key={reel.id} reel={reel} />
        ))}
      </div>
    </div>
  );
}