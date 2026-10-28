import { motion, useReducedMotion } from 'framer-motion';
import { useReel } from '../hooks/useReel';
import MetricCard from '../components/MetricCard';
import ReelCard from '../components/reel/ReelCard';

export default function Dashboard() {
  const { reels, loading, error } = useReel();
  // Ensure reels is an array to prevent errors if API returns null or non-array
  const safeReels = Array.isArray(reels) ? reels : [];
  const reducedMotion = useReducedMotion();

  // Helper function to conditionally apply motion props
  const motionProps = (reducedMotion, props) =>
    reducedMotion ? {} : props;

  if (loading) {
    return (
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
          Loading your dashboard...
        </motion.h2>
        {/* Skeleton placeholders */}
        <div className="dashboard-content">
          <div className="metrics-grid">
            {[1, 2, 3, 4].map((_, i) => (
              <motion.div
                key={i}
                className="glass"
                {...motionProps(reducedMotion, {
                  initial: { opacity: 0, scale: 0.9 },
                  animate: { opacity: 1, scale: 1 },
                  transition: { duration: 0.5, delay: i * 0.1 }
                })}
              >
                <div className="metric-content">
                  <p className="metric-label">Loading...</p>
                  <p className="metric-value">--</p>
                </div>
              </motion.div>
            ))}
          </div>
          <motion.div
            className="recent-section"
            {...motionProps(reducedMotion, {
              initial: { opacity: 0, y: 20 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.5, delay: 0.5 }
            })}
          >
            <motion.h3
              {...motionProps(reducedMotion, {
                initial: { opacity: 0, x: -20 },
                animate: { opacity: 1, x: 0 },
                transition: { duration: 0.5, delay: 0.7 }
              })}
            >
              Recent Content
            </motion.h3>
            <div className="recent-grid">
              {[1, 2, 3].map((_, i) => (
                <motion.div
                  key={i}
                  className="glass"
                  {...motionProps(reducedMotion, {
                    initial: { opacity: 0, scale: 0.9 },
                    animate: { opacity: 1, scale: 1 },
                    transition: { duration: 0.5, delay: 0.8 + i * 0.1 }
                  })}
                >
                  <div className="recent-item-placeholder">
                    <h4>Loading...</h4>
                    <p>Loading...</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
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
          We could not load your reels.
        </motion.h2>
        <motion.p
          {...motionProps(reducedMotion, {
            initial: { opacity: 0, x: 20 },
            animate: { opacity: 1, x: 0 },
            transition: { duration: 0.5, delay: 0.2 }
          })}
        >
          Please try again later.
        </motion.p>
        <motion.button
          {...motionProps(reducedMotion, {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.5, delay: 0.5 }
          })}
          onClick={() => window.location.reload()}
        >
          Retry
        </motion.button>
      </motion.div>
    );
  }

  // Calculate metrics
  const articlesDiscovered = safeReels.filter(r => r.status === 'DISCOVERED').length;
  const reelsGenerated = safeReels.length;
  const processingStatuses = [
    'RESEARCHING',
    'SCRIPTING',
    'STORYBOARDING',
    'ASSET_GENERATION',
    'VOICE_GENERATION',
    'RENDERING',
    'QA'
  ];
  const processing = safeReels.filter(r => processingStatuses.includes(r.status)).length;
  const readyToPublish = safeReels.filter(r => r.status === 'READY_TO_PUBLISH').length;

  // Sort reels by id descending (most recent first)
  const sortedReels = [...safeReels].sort((a, b) => b.id - a.id);

  // Recent Content: discovered items (most recent first)
  const recentContent = sortedReels.filter(r => r.status === 'DISCOVERED').slice(0, 4);

  // Recent Reels: all reels (most recent first)
  const recentReels = sortedReels.slice(0, 4);

  // Pipeline Activity: reels in processing statuses (most recent first)
  const pipelineActivity = sortedReels.filter(r => processingStatuses.includes(r.status)).slice(0, 4);

  return (
    <motion.div
      className="dashboard-page"
      {...motionProps(reducedMotion, {
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6 }
      })}
    >
      {/* Header */}
      <motion.div
        {...motionProps(reducedMotion, {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.8, delay: 0.2 }
        })}
      >
        <motion.h1
          {...motionProps(reducedMotion, {
            initial: { opacity: 0, x: -50 },
            animate: { opacity: 1, x: 0 },
            transition: { duration: 0.8, delay: 0.4 }
          })}
          className="dashboard-title"
        >
          <span className="title-prefix">AI </span>
          <span className="title-suffix">Reel Factory</span>
        </motion.h1>
        <motion.p
          {...motionProps(reducedMotion, {
            initial: { opacity: 0, x: 50 },
            animate: { opacity: 1, x: 0 },
            transition: { duration: 0.8, delay: 0.6 }
          })}
          className="dashboard-subtitle"
        >
          Turn stories and ideas into publish-ready short-form videos.
        </motion.p>
        <motion.div
          className="dashboard-cta"
          {...motionProps(reducedMotion, {
            initial: { opacity: 0, scale: 0.9 },
            animate: { opacity: 1, scale: 1 },
            transition: { duration: 0.5, delay: 1.0 }
          })}
        >
          <a href="/create" className="btn btn-primary">
            Create Reel
          </a>
        </motion.div>
      </motion.div>

      {/* Metrics Grid */}
      <motion.div
        className="metrics-grid"
        {...motionProps(reducedMotion, {
          initial: { opacity: 0, y: 30 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay: 0.6 }
        })}
      >
        <MetricCard
          label="Articles Discovered"
          value={articlesDiscovered}
          accent="#4ecdc4"
          reducedMotion={reducedMotion}
        />
        <MetricCard
          label="Reels Generated"
          value={reelsGenerated}
          accent="#ff6b6b"
          reducedMotion={reducedMotion}
        />
        <MetricCard
          label="Processing"
          value={processing}
          accent="#ffe66d"
          reducedMotion={reducedMotion}
        />
        <MetricCard
          label="Ready to Publish"
          value={readyToPublish}
          accent="#95e1d3"
          reducedMotion={reducedMotion}
        />
      </motion.div>

      {/* Recent Content Section */}
      {recentContent.length > 0 ? (
        <motion.div
          className="recent-section"
          {...motionProps(reducedMotion, {
            initial: { opacity: 0, y: 30 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.6, delay: 0.8 }
          })}
        >
          <motion.h2
            {...motionProps(reducedMotion, {
              initial: { opacity: 0, x: -30 },
              animate: { opacity: 1, x: 0 },
              transition: { duration: 0.6, delay: 1.0 }
            })}
            className="section-title"
          >
            Recent Content
          </motion.h2>
          <div className="recent-grid">
            {recentContent.map((reel) => (
              <motion.div
                key={reel.id}
                className="glass"
                {...motionProps(reducedMotion, {
                  initial: { opacity: 0, scale: 0.9 },
                  animate: { opacity: 1, scale: 1 },
                  transition: { duration: 0.5, delay: reel.id * 0.01 }
                })}
                >
                <ReelCard reel={reel} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div
          className="empty-state"
          {...motionProps(reducedMotion, {
            initial: { opacity: 0, y: 30 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.6, delay: 0.8 }
          })}
        >
          <motion.h2
            {...motionProps(reducedMotion, {
              initial: { opacity: 0, x: -20 },
              animate: { opacity: 1, x: 0 },
              transition: { duration: 0.6, delay: 1.0 }
            })}
          >
            No recent content
          </motion.h2>
          <motion.p
            {...motionProps(reducedMotion, {
              initial: { opacity: 0, x: 20 },
              animate: { opacity: 1, x: 0 },
              transition: { duration: 0.6, delay: 1.2 }
            })}
          >
            Discover a story or create your first reel to see content here.
          </motion.p>
          <motion.a
            href="/create"
            className="btn btn-secondary"
            {...motionProps(reducedMotion, {
              initial: { opacity: 0, y: 20 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.5, delay: 1.4 }
            })}
          >
            Create Reel
          </motion.a>
        </motion.div>
      )}

      {/* Recent Reels Section */}
      {recentReels.length > 0 ? (
        <motion.div
          className="recent-section"
          {...motionProps(reducedMotion, {
            initial: { opacity: 0, y: 30 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.6, delay: 1.2 }
          })}
        >
          <motion.h2
            {...motionProps(reducedMotion, {
              initial: { opacity: 0, x: -30 },
              animate: { opacity: 1, x: 0 },
              transition: { duration: 0.6, delay: 1.4 }
            })}
          >
            Recent Reels
          </motion.h2>
          <div className="recent-grid">
            {recentReels.map((reel) => (
              <motion.div
                key={reel.id}
                className="glass"
                {...motionProps(reducedMotion, {
                  initial: { opacity: 0, scale: 0.9 },
                  animate: { opacity: 1, scale: 1 },
                  transition: { duration: 0.5, delay: reel.id * 0.01 }
                })}
                >
                <ReelCard reel={reel} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div
          className="empty-state"
          {...motionProps(reducedMotion, {
            initial: { opacity: 0, y: 30 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.6, delay: 1.2 }
          })}
        >
          <motion.h2
            {...motionProps(reducedMotion, {
              initial: { opacity: 0, x: -20 },
              animate: { opacity: 1, x: 0 },
              transition: { duration: 0.6, delay: 1.4 }
            })}
          >
            No reels yet
          </motion.h2>
          <motion.p
            {...motionProps(reducedMotion, {
              initial: { opacity: 0, x: 20 },
              animate: { opacity: 1, x: 0 },
              transition: { duration: 0.6, delay: 1.6 }
            })}
          >
            Create your first reel to see it here.
          </motion.p>
          <motion.a
            href="/create"
            className="btn btn-secondary"
            {...motionProps(reducedMotion, {
              initial: { opacity: 0, y: 20 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.5, delay: 1.8 }
            })}
          >
            Create Reel
          </motion.a>
        </motion.div>
      )}

      {/* Pipeline Activity Section */}
      {pipelineActivity.length > 0 ? (
        <motion.div
          className="recent-section"
          {...motionProps(reducedMotion, {
            initial: { opacity: 0, y: 30 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.6, delay: 1.6 }
          })}
        >
          <motion.h2
            {...motionProps(reducedMotion, {
              initial: { opacity: 0, x: -30 },
              animate: { opacity: 1, x: 0 },
              transition: { duration: 0.6, delay: 1.8 }
            })}
          >
            Pipeline Activity
          </motion.h2>
          <div className="pipeline-grid">
            {pipelineActivity.map((reel) => (
              <motion.div
                key={reel.id}
                className="glass"
                {...motionProps(reducedMotion, {
                  initial: { opacity: 0, scale: 0.9 },
                  animate: { opacity: 1, scale: 1 },
                  transition: { duration: 0.5, delay: reel.id * 0.01 }
                })}
                >
                <div className="pipeline-item">
                  <ReelCard reel={reel} />
                  <div className="pipeline-status">
                    <span className="status-badge">{reel.status}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div
          className="empty-state"
          {...motionProps(reducedMotion, {
            initial: { opacity: 0, y: 30 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.6, delay: 1.6 }
          })}
        >
          <motion.h2
            {...motionProps(reducedMotion, {
              initial: { opacity: 0, x: -20 },
              animate: { opacity: 1, x: 0 },
              transition: { duration: 0.6, delay: 1.8 }
            })}
          >
            No activity in pipeline
          </motion.h2>
          <motion.p
            {...motionProps(reducedMotion, {
              initial: { opacity: 0, x: 20 },
              animate: { opacity: 1, x: 0 },
              transition: { duration: 0.6, delay: 2.0 }
            })}
          >
            All reels are either queued or completed.
          </motion.p>
        </motion.div>
      )}
    </motion.div>
  );
}