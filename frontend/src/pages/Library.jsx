import { motion, useReducedMotion } from 'framer-motion';
import { useReel } from '../hooks/useReel';
import ReelCard from '../components/reel/ReelCard';

export default function Library() {
  const reducedMotion = useReducedMotion();
  const { reels, loading, error } = useReel();

  // Helper function to conditionally apply motion props
  const motionProps = (reducedMotion, props) =>
    reducedMotion ? {} : props;

  if (loading) return (
    <motion.div
      {...motionProps(reducedMotion, {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.5 }
      })}
    >
      <motion.h2
        {...motionProps(reducedMotion, {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5 }
        })}
      >
        Loading...
      </motion.h2>
    </motion.div>
  );

  if (error) return (
    <motion.div
      {...motionProps(reducedMotion, {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.5 }
      })}
    >
      <motion.h2
        {...motionProps(reducedMotion, {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5 }
        })}
      >
        Error loading data
      </motion.h2>
      <motion.p
        {...motionProps(reducedMotion, {
          initial: { opacity: 0, x: 20 },
          animate: { opacity: 1, x: 0 },
          transition: { duration: 0.5, delay: 0.2 }
        })}
      >
        {error.message || 'An unknown error occurred'}
      </motion.p>
      <motion.button
        {...motionProps(reducedMotion, {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay: 0.5 }
        })}
        onClick={() => window.location.reload()}
      >
        Try again
      </motion.button>
    </motion.div>
  );

  return (
    <motion.div
      {...motionProps(reducedMotion, {
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6 }
      })}
    >
      <motion.h1
        {...motionProps(reducedMotion, {
          initial: { opacity: 0, x: -50 },
          animate: { opacity: 1, x: 0 },
          transition: { duration: 0.8, delay: 0.2 }
        })}
      >
        Reel Library
      </motion.h1>
      {reels.length === 0 ? (
        <motion.div
          {...motionProps(reducedMotion, {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.5 }
          })}
        >
          <motion.h2
            {...motionProps(reducedMotion, {
              initial: { opacity: 0, x: -20 },
              animate: { opacity: 1, x: 0 },
              transition: { duration: 0.5, delay: 0.2 }
            })}
          >
            No reels yet
          </motion.h2>
          <motion.p
            {...motionProps(reducedMotion, {
              initial: { opacity: 0, x: 20 },
              animate: { opacity: 1, x: 0 },
              transition: { duration: 0.5, delay: 0.4 }
            })}
          >
            Create your first reel to see it here.
          </motion.p>
          <motion.button
            {...motionProps(reducedMotion, {
              initial: { opacity: 0, y: 20 },
              animate: {opacity: 1, y: 0},
              transition: {duration: 0.5, delay: 0.6}
            })}
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
          {...motionProps(reducedMotion, {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            transition: { duration: 0.5, delay: 0.5 }
          })}
        >
          {reels.map((reel, index) => (
            <motion.div
              key={reel.id}
              {...motionProps(reducedMotion, {
                initial: { opacity: 0, scale: 0.8 },
                animate: { opacity: 1, scale: 1 },
                transition: {
                  duration: 0.5,
                  delay: index * 0.05,
                  type: "spring",
                  stiffness: 300,
                  damping: 20
                }
              })}
            >
              <ReelCard reel={reel} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}