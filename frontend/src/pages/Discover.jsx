import { motion, useReducedMotion } from 'framer-motion';
import { useReel } from '../hooks/useReel';
import DiscoverCard from '../components/DiscoverCard';

export default function Discover() {
  const { reels, loading, error, refetch } = useReel();
  const reducedMotion = useReducedMotion();
  const [searchTerm, setSearchTerm] = useState("");

  // Filter reels to only those with status 'DISCOVERED'
  const discoveredReels = reels.filter(reel => reel.status === "DISCOVERED");

  // Further filter by search term (case-insensitive)
  const filteredReels = discoveredReels.filter(reel => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      reel.title.toLowerCase().includes(term) ||
      reel.source.toLowerCase().includes(term) ||
      (reel.summary && reel.summary.toLowerCase().includes(term))
    );
  });
  if (loading) {
    return (
      <motion.div
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={reducedMotion ? false : { opacity: 1 }}
        transition={reducedMotion ? undefined : { duration: 0.5 }}
      >
        <motion.h2
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={reducedMotion ? false : { opacity: 1, y: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.5 }}
        >
          Loading discoveries...
        </motion.h2>
        {/* Skeleton placeholders */}
        <div className="discover-content">
          <div className="discover-grid">
            {[1, 2, 3].map((_, i) => (
              <motion.div
                key={i}
                className="discover-card-glass"
                initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
                animate={reducedMotion ? false : { opacity: 1, scale: 1 }}
                transition={reducedMotion ? undefined : { duration: 0.5, delay: i * 0.1 }}
              >
                <div className="discover-card-content">
                  <div className="discover-card-header">
                    <span className="discover-card-source">Loading...</span>
                    <span className="discover-card-score">--</span>
                  </div>
                  <h3 className="discover-card-title">Loading...</h3>
                  <p className="discover-card-summary">Loading...</p>
                  <div className="discover-card-meta">
                    <span className="discover-card-status">Loading...</span>
                    <span className="discover-card-date">Loading...</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }
  if (error) {
    return (
      <motion.div
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={reducedMotion ? false : { opacity: 1 }}
        transition={reducedMotion ? undefined : { duration: 0.5 }}
      >
        <motion.h2
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={reducedMotion ? false : { opacity: 1, y: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.5 }}
        >
          We could not load discoveries.
        </motion.h2>
        <motion.p
          initial={reducedMotion ? false : { opacity: 0, x: 20 }}
          animate={reducedMotion ? false : { opacity: 1, x: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.2 }}
        >
          Please try again later.
        </motion.p>
        <motion.button
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={reducedMotion ? false : { opacity: 1, y: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.5, delay: 1.2 }}
          onClick={refetch}
        >
          Refresh
        </motion.button>
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 30 }}
      animate={reducedMotion ? false : { opacity: 1, y: 0 }}
      transition={reducedMotion ? undefined : { duration: 0.6 }}
      className="discover-page"
    >
      {/* Header */}
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 20 }}
        animate={reducedMotion ? false : { opacity: 1, y: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.8, delay: 0.2 }}
      >
        <motion.h1
          initial={reducedMotion ? false : { opacity: 0, x: -50 }}
          animate={reducedMotion ? false : { opacity: 1, x: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.8, delay: 0.4 }}
          className="discover-title"
        >
          <span className="title-prefix">Discover </span>
          <span className="title-suffix">Stories</span>
        </motion.h1>
        <motion.p
          initial={reducedMotion ? false : { opacity: 0, x: 50 }}
          animate={reducedMotion ? false : { opacity: 1, x: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.8, delay: 0.6 }}
          className="discover-subtitle"
        >
          Browse recent stories and turn them into publish-ready reels.
        </motion.p>
        <motion.div
          className="discover-header-actions"
          initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
          animate={reducedMotion ? false : { opacity: 1, scale: 1 }}
          transition={reducedMotion ? undefined : { duration: 0.5, delay: 1.0 }}
        >
          <div className="discover-search">
            <input
              type="text"
              placeholder="Search stories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="discover-actions">
            <motion.button
              onClick={refetch}
              className="btn btn-secondary"
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              animate={reducedMotion ? false : { opacity: 1, y: 0 }}
              transition={reducedMotion ? undefined : { duration: 0.5, delay: 1.2 }}
            >
              Refresh
            </motion.button>
            <motion.a
              href="/create"
              className="btn btn-primary"
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              animate={reducedMotion ? false : { opacity: 1, y: 0 }}
              transition={reducedMotion ? undefined : { duration: 0.5, delay: 1.4 }}
            >
              Create Reel
            </motion.a>
          </div>
        </motion.div>
      </motion.div>

      {/* Discover Grid */}
      {filteredReels.length > 0 ? (
        <motion.div
          className="discover-grid"
          initial={reducedMotion ? false : { opacity: 0, y: 30 }}
          animate={reducedMotion ? false : { opacity: 1, y: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.6, delay: 0.6 }}
        >
          {filteredReels.map((reel) => (
            <motion.div
              key={reel.id}
              className="discover-card-container"
              initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
              animate={reducedMotion ? false : { opacity: 1, scale: 1 }}
              transition={reducedMotion ? undefined : { duration: 0.5, delay: reel.id * 0.01 }}
            >
              <DiscoverCard reel={reel} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          className="empty-state"
          initial={reducedMotion ? false : { opacity: 0, y: 30 }}
          animate={reducedMotion ? false : { opacity: 1, y: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.6, delay: 0.8 }}
        >
          <motion.h2
            initial={reducedMotion ? false : { opacity: 0, x: -20 }}
            animate={reducedMotion ? false : { opacity: 1, x: 0 }}
            transition={reducedMotion ? undefined : { duration: 0.6, delay: 1.0 }}
          >
            No new stories yet.
          </motion.h2>
          <motion.p
            initial={reducedMotion ? false : { opacity: 0, x: 20 }}
            animate={reducedMotion ? false : { opacity: 1, x: 0 }}
            transition={reducedMotion ? undefined : { duration: 0.6, delay: 1.2 }}
          >
            Discover a story or create your first reel to see content here.
          </motion.p>
          <motion.div
            className="empty-state-actions"
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={reducedMotion ? false : { opacity: 1, y: 0 }}
            transition={reducedMotion ? undefined : { duration: 0.5, delay: 1.4 }}
          >
            <motion.button
              onClick={refetch}
              className="btn btn-secondary"
              initial={reducedMotion ? false : { opacity: 0, y: 0 }}
              animate={reducedMotion ? false : { opacity: 1, y: 0 }}
              transition={reducedMotion ? undefined : { duration: 0.5 }}
            >
              Refresh
            </motion.button>
            <motion.a
              href="/create"
              className="btn btn-primary"
              initial={reducedMotion ? false : { opacity: 0, y: 0 }}
              animate={reducedMotion ? false : { opacity: 1, y: 0 }}
              transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.2 }}
            >
              Create Reel
            </motion.a>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
