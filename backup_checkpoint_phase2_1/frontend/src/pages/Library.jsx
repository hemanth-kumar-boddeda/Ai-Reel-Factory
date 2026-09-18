import { motion, useReducedMotion } from 'framer-motion';
import { useReel } from '../hooks/useReel';
import ReelCard from '../components/reel/ReelCard';

export default function Library() {
  const reducedMotion = useReducedMotion();
  const { reels, loading, error } = useReel();

  if (loading) return (
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
        Loading...
      </motion.h2>
    </motion.div>
  );

  if (error) return (
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
        Error loading data
      </motion.h2>
      <motion.p
        initial={reducedMotion ? false : { opacity: 0, x: 20 }}
        animate={reducedMotion ? false : { opacity: 1, x: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.2 }}
      >
        {error.message || 'An unknown error occurred'}
      </motion.p>
      <motion.button
        initial={reducedMotion ? false : { opacity: 0, y: 20 }}
        animate={reducedMotion ? false : { opacity: 1, y: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.5 }}
        onClick={() => window.location.reload()}
      >
        Try again
      </motion.button>
    </motion.div>
  );

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 30 }}
      animate={reducedMotion ? false : { opacity: 1, y: 0 }}
      transition={reducedMotion ? undefined : { duration: 0.6 }}
    >
      <motion.h1
        initial={reducedMotion ? false : { opacity: 0, x: -50 }}
        animate={reducedMotion ? false : { opacity: 1, x: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.8, delay: 0.2 }}
      >
        Reel Library
      </motion.h1>
      {reels.length === 0 ? (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={reducedMotion ? false : { opacity: 1, y: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.5 }}
        >
          <motion.h2
            initial={reducedMotion ? false : { opacity: 0, x: -20 }}
            animate={reducedMotion ? false : { opacity: 1, x: 0 }}
            transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.2 }}
          >
            No reels yet
          </motion.h2>
          <motion.p
            initial={reducedMotion ? false : { opacity: 0, x: 20 }}
            animate={reducedMotion ? false : { opacity: 1, x: 0 }}
            transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.4 }}
          >
            Create your first reel to see it here.
          </motion.p>
          <motion.button
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={reducedMotion ? false : { opacity: 1, y: 0 }}
            transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.6 }}
            asChild
          >
            <a href="/create" style={{ textDecoration: 'none' }}>
              Create Reel
            </a>
          </motion.button>
        </motion.div>
      ) : (
        <motion.div
          className="reel-grid"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={reducedMotion ? false : { opacity: 1 }}
          transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.5 }}
        >
          {reels.map((reel, index) => (
            <motion.div
              key={reel.id}
              initial={reducedMotion ? false : { opacity: 0, scale: 0.8 }}
              animate={reducedMotion ? false : { opacity: 1, scale: 1 }}
              transition={{
                duration: reducedMotion ? undefined : 0.5,
                delay: reducedMotion ? 0 : index * 0.05,
                type: "spring",
                stiffness: 300,
                damping: 20
              }}
            >
              <ReelCard reel={reel} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}