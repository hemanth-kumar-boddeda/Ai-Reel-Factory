import { motion, useReducedMotion } from 'framer-motion';
import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

export default function Jobs() {
  const reducedMotion = useReducedMotion();
  const navigate = useNavigate();

  const motionProps = (reducedMotion, props) =>
    reducedMotion ? {} : props;

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pollInterval, setPollInterval] = useState(null);

  // Fetch jobs from API
  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/jobs');
      setJobs(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load jobs. Please try again.');
      setLoading(false);
      console.error('Error fetching jobs:', err);
    }
  };

  // Fetch jobs on mount and set up polling based on initial load
  useEffect(() => {
    fetchJobs();
  }, []);

  // Set up or tear down polling based on job status changes
  useEffect(() => {
    const hasActiveJobs = jobs.some(job =>
      ['PENDING', 'QUEUED', 'PROCESSING'].includes(job.status)
    );

    if (hasActiveJobs && !pollInterval) {
      const interval = setInterval(fetchJobs, 5000); // Poll every 5 seconds
      setPollInterval(interval);
    } else if (!hasActiveJobs && pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }
  }, [jobs, pollInterval]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  // Helper to get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
      case 'QUEUED':
        return 'status-pending';
      case 'PROCESSING':
        return 'status-processing';
      case 'COMPLETED':
        return 'status-completed';
      case 'FAILED':
        return 'status-failed';
      default:
        return 'status-unknown';
    }
  };

  // Helper to format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

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
          Loading jobs...
        </motion.h2>
        {/* Skeleton placeholders */}
        <div className="jobs-content">
          <div className="jobs-table">
            {[1, 2, 3].map((_, i) => (
              <motion.div
                key={i}
                className="job-row-glass"
                {...motionProps(reducedMotion, {
                  initial: { opacity: 0, scale: 0.9 },
                  animate: { opacity: 1, scale: 1 },
                  transition: { duration: 0.5, delay: i * 0.1 }
                })}
              >
                <div className="job-row-content">
                  <div className="job-cell">Loading...</div>
                  <div className="job-cell">Loading...</div>
                  <div className="job-cell">Loading...</div>
                  <div className="job-cell">Loading...</div>
                  <div className="job-cell">Loading...</div>
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
          We could not load jobs.
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
            transition: { duration: 0.5, delay: 1.2 }
          })}
          onClick={fetchJobs}
        >
          Refresh
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
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
        >
          Jobs
        </motion.h1>
        <motion.p
          {...motionProps(reducedMotion, {
            initial: { opacity: 0, x: 50 },
            animate: { opacity: 1, x: 0 },
            transition: { duration: 0.8, delay: 0.4 }
          })}
        >
          Monitor pipeline jobs and processing queue
        </motion.p>
        <motion.div
          className="jobs-header-actions"
          {...motionProps(reducedMotion, {
            initial: { opacity: 0, scale: 0.9 },
            animate: { opacity: 1, scale: 1 },
            transition: { duration: 0.5, delay: 1.0 }
          })}
        >
          <motion.button
            onClick={fetchJobs}
            className="btn btn-secondary"
            {...motionProps(reducedMotion, {
              initial: { opacity: 0, y: 20 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.5, delay: 1.2 }
            })}
          >
            Refresh
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Jobs Table */}
      {jobs.length > 0 ? (
        <motion.div
          className="jobs-table-container"
          {...motionProps(reducedMotion, {
            initial: { opacity: 0, y: 30 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.6, delay: 0.6 }
          })}
        >
          <div className="jobs-table-header">
            <div className="job-cell job-cell-reel">Reel</div>
            <div className="job-cell job-cell-type">Type</div>
            <div className="job-cell job-cell-status">Status</div>
            <div className="job-cell job-cell-progress">Progress</div>
            <div className="job-cell job-cell-time">Created</div>
            <div className="job-cell job-cell-actions">Actions</div>
          </div>
          <div className="jobs-table-body">
            {jobs.map((job) => (
              <motion.div
                key={job.id}
                className="job-row"
                {...motionProps(reducedMotion, {
                  initial: { opacity: 0, scale: 0.9 },
                  animate: { opacity: 1, scale: 1 },
                  transition: { duration: 0.5, delay: job.id * 0.01 }
                })}
              >
                <div className="job-cell job-cell-reel">
                  {job.reel_id ? (
                    <>
                      <span className="job-reel-title">Reel #{job.reel_id}</span>
                      {/* In a real app, we would fetch reel details or have them included */}
                    </>
                  ) : (
                    <span className="job-reel-title">No associated reel</span>
                  )}
                </div>
                <div className="job-cell job-cell-type">
                  <span className={`job-type-badge job-type-${job.type.toLowerCase()}`}>
                    {job.type}
                  </span>
                </div>
                <div className="job-cell job-cell-status">
                  <span className={`job-status-badge ${getStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                </div>
                <div className="job-cell job-cell-progress">
                  {job.status === 'PROCESSING' ? (
                    <>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${job.progress}%` }}
                        >
                        </div>
                      </div>
                      <span className="progress-text">{job.progress}%</span>
                    </>
                  ) : (
                    <span className="progress-text">{job.progress}%</span>
                  )}
                </div>
                <div className="job-cell job-cell-time">
                  {formatTimestamp(job.created_at)}
                </div>
                <div className="job-cell job-cell-actions">
                  {job.status === 'FAILED' && job.error ? (
                    <motion.button
                      variant="outline"
                      size="sm"
                      onClick={() => alert(`Error: ${job.error}`)}
                      className="btn btn-outline btn-sm"
                      {...motionProps(reducedMotion, {
                        initial: { opacity: 0, y: 10 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.3 }
                      })}
                    >
                      Details
                    </motion.button>
                  ) : (
                    <>
                      {job.reel_id && (
                        <motion.a
                          href={`/editor/${job.reel_id}`}
                          className="btn btn-outline btn-sm"
                          {...motionProps(reducedMotion, {
                            initial: { opacity: 0, y: 10 },
                            animate: { opacity: 1, y: 0 },
                            transition: { duration: 0.3 }
                          })}
                        >
                          View Reel
                        </motion.a>
                      )}
                      {['PENDING', 'QUEUED', 'PROCESSING'].includes(job.status) && (
                        <motion.button
                          variant="outline"
                          size="sm"
                          disabled
                          className="btn btn-outline btn-sm opacity-50"
                          {...motionProps(reducedMotion, {
                            initial: { opacity: 0, y: 10 },
                            animate: { opacity: 1, y: 0 },
                            transition: { duration: 0.3 }
                          })}
                        >
                          Cancel
                        </motion.button>
                      )}
                    </>
                  )}
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
            No jobs yet
          </motion.h2>
          <motion.p
            {...motionProps(reducedMotion, {
              initial: { opacity: 0, x: 20 },
              animate: { opacity: 1, x: 0 },
              transition: { duration: 0.6, delay: 1.2 }
            })}
          >
            Jobs will appear here when you create and process reels.
          </motion.p>
          <motion.div
            className="empty-state-actions"
            {...motionProps(reducedMotion, {
              initial: { opacity: 0, y: 20 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.5, delay: 1.4 }
            })}
          >
            <motion.button
              onClick={fetchJobs}
              className="btn btn-secondary"
              {...motionProps(reducedMotion, {
                initial: { opacity: 0, y: 0 },
                animate: { opacity: 1, y: 0 },
                transition: { duration: 0.5 }
              })}
            >
              Refresh
            </motion.button>
            <motion.a
              href="/create"
              className="btn btn-primary"
              {...motionProps(reducedMotion, {
                initial: { opacity: 0, y: 0 },
                animate: { opacity: 1, y: 0 },
                transition: { duration: 0.5, delay: 0.2 }
              })}
            >
              Create Reel
            </motion.a>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}