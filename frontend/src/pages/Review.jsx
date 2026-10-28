import { motion, useReducedMotion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function Review() {
  const reducedMotion = useReducedMotion();
  // Helper function to conditionally apply motion props
  const motionProps = (reducedMotion, props) =>
    reducedMotion ? {} : props;
  const { reelId } = useParams();
  const navigate = useNavigate();

  const [reel, setReel] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState({ timestamp: 0, text: '' });
  const [currentTime, setCurrentTime] = useState(0);
  const [videoUrl, setVideoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [editRequestStatus, setEditRequestStatus] = useState(null); // 'pending', 'processing', 'completed', 'failed'
  const [approvalStatus, setApprovalStatus] = useState(null); // 'success', 'error'
  // Publishing operation states
  const [publishStatus, setPublishStatus] = useState('idle'); // 'idle', 'queued', 'processing', 'success', 'error'
  [scheduleStatus, setScheduleStatus] = useState('idle'); // 'idle', 'scheduling', 'rescheduling', 'cancelling', 'active', 'completed', 'failed', 'cancelled'
  [retryStatus, setRetryStatus] = useState('idle'); // 'idle', 'queued', 'processing', 'success', 'error'
  [publicationHistory, setPublicationHistory] = useState([]);
  [scheduleInfo, setScheduleInfo] = useState(null);
  [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  [scheduleDate, setScheduleDate] = useState('');
  [scheduleTime, setScheduleTime] = useState('');
  [scheduleTimezone, setScheduleTimezone] = useState('');
  [schedulingError, setSchedulingError] = useState(null);

  // Fetch reel data and comments when component loads or reelId changes
  useEffect(() => {
    const fetchReelData = async () => {
      try {
        // Fetch reel
        const reelResponse = await api.get(`/api/reel/${reelId}`);
        const fetchedReel = reelResponse.data;
        setReel(fetchedReel);
        if (fetchedReel.video_path) {
          setVideoUrl(`http://localhost:8000/video/${fetchedReel.id}`);
        }

        // Fetch comments
        const commentsResponse = await api.get(`/reels/${reelId}/review`);
        setComments(commentsResponse.data);

        // Fetch publication history
        const publicationsResponse = await api.get(`/reels/${reelId}/publications`);
        setPublicationHistory(publicationsResponse.data);

        // Fetch schedule if exists
        try {
          const scheduleResponse = await api.get(`/reels/${reelId}/schedule`);
          setScheduleInfo(scheduleResponse.data);
          setScheduleStatus('active');
        } catch (scheduleErr) {
          // No active schedule
          setScheduleInfo(null);
          setScheduleStatus('idle');
        }
      } catch (err) {
        console.error('Error fetching reel data:', err);
        setError('Failed to load reel data');
      } finally {
        setLoading(false);
      }
    };

    if (reelId) {
      fetchReelData();
    }
  }, [reelId]);

  // Poll for status updates when operations are in progress
  useEffect(() => {
    let intervalId = null;
    const shouldPoll =
      publishStatus === 'queued' ||
      publishStatus === 'processing' ||
      scheduleStatus === 'scheduling' ||
      scheduleStatus === 'rescheduling' ||
      scheduleStatus === 'cancelling' ||
      retryStatus === 'queued' ||
      retryStatus === 'processing';

    if (shouldPoll) {
      intervalId = setInterval(async () => {
        try {
          // Re-fetch reel status
          const reelResponse = await api.get(`/api/reel/${reelId}`);
          const updatedReel = reelResponse.data;
          setReel(updatedReel);

          // Re-fetch publication history
          const publicationsResponse = await api.get(`/reels/${reelId}/publications`);
          setPublicationHistory(publicationsResponse.data);

          // Check for schedule
          try {
            const scheduleResponse = await api.get(`/reels/${reelId}/schedule`);
            setScheduleInfo(scheduleResponse.data);
            setScheduleStatus('active');
          } catch (scheduleErr) {
            setScheduleInfo(null);
            setScheduleStatus('idle');
          }
        } catch (err) {
          console.error('Error polling for updates:', err);
        }
      }, 5000); // Poll every 5 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [publishStatus, scheduleStatus, retryStatus, reelId]);

  // Update current time from video playback
  const handleTimeUpdate = (e) => {
    setCurrentTime(e.target.currentTime);
  };

  // Seek video to a specific timestamp
  const seekToTimestamp = (timestamp) => {
    const videoElement = document.getElementById('review-video');
    if (videoElement) {
      videoElement.currentTime = timestamp;
    }
  };

  // Add a new comment at the current timestamp
  const handleAddComment = async () => {
    if (!newComment.text.trim()) {
      return;
    }
    try {
      const commentData = {
        timestamp_seconds: currentTime,
        comment_text: newComment.text,
      };
      const response = await api.post(
        `/reels/${reelId}/review/comments`,
        commentData
      );
      // Update comments list
      setComments(prev => [...prev, response.data].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds));
      setNewComment({ timestamp: 0, text: '' });
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment');
    }
  };

  // Resolve a comment
  const handleResolveComment = async (commentId) => {
    try {
      await api.post(
        `/reels/${reelId}/review/comments/${commentId}/resolve`
      );
      // Update the comment in the list
      setComments(prev => prev.map(comment =>
        comment.id === commentId ? { ...comment, resolved: true } : comment
      ));
    } catch (err) {
      console.error('Error resolving comment:', err);
      setError('Failed to resolve comment');
    }
  };

  // Delete a comment
  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(
        `/reels/${reelId}/review/comments/${commentId}`
      );
      // Remove the comment from the list
      setComments(prev => prev.filter(comment => comment.id !== commentId));
    } catch (err) {
      console.error('Error deleting comment:', err);
      setError('Failed to delete comment');
    }
  };

  // Publish now (immediate publishing)
  const handlePublishNow = async () => {
    setPublishStatus('queued');
    setError(null);
    try {
      const response = await api.post(`/reels/${reelId}/publish`);
      setPublishStatus('processing');
      // Note: Actual status updates will come from polling
    } catch (err) {
      console.error('Error publishing reel:', err);
      setPublishStatus('error');
      setError(err.response?.data?.detail || 'Failed to publish reel');
    }
  };

  // Open schedule modal
  const handleOpenScheduleModal = () => {
    // Set default values to now + 1 hour
    const now = new Date();
    const future = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    setScheduleDate(future.toISOString().split('T')[0]); // YYYY-MM-DD
    setScheduleTime(future.toTimeString().substr(0, 5)); // HH:MM
    setScheduleTimezone('UTC'); // Default to UTC
    setSchedulingError(null);
    setIsSchedulingModalOpen(true);
  };

  // Close schedule modal
  const handleCloseScheduleModal = () => {
    setIsSchedulingModalOpen(false);
    setSchedulingError(null);
  };

  // Handle schedule form submit
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setSchedulingError(null);
    setScheduleStatus('scheduling');

    try {
      // Combine date and time into ISO 8601 string
      const scheduledAt = `${scheduleDate}T${scheduleTime}:00.000Z`;
      const scheduleData = {
        scheduled_at: scheduledAt,
        timezone: scheduleTimezone
      };

      const response = await api.post(`/reels/${reelId}/schedule`, scheduleData);
      setScheduleInfo(response.data);
      setScheduleStatus('active');
      handleCloseScheduleModal();
    } catch (err) {
      console.error('Error scheduling reel:', err);
      setScheduleStatus('idle');
      setSchedulingError(err.response?.data?.detail || 'Failed to schedule reel');
    }
  };

  // Handle cancel schedule
  const handleCancelSchedule = async () => {
    setScheduleStatus('cancelling');
    try {
      await api.post(`/reels/${reelId}/schedule/cancel`);
      // Status will be updated via polling
    } catch (err) {
      console.error('Error cancelling schedule:', err);
      setScheduleStatus('idle');
      setError(err.response?.data?.detail || 'Failed to cancel schedule');
    }
  };

  // Handle retry publish
  const handleRetryPublish = async () => {
    setRetryStatus('queued');
    setError(null);
    try {
      const response = await api.post(`/reels/${reelId}/publish/retry`);
      setRetryStatus('processing');
      // Note: Actual status updates will come from polling
    } catch (err) {
      console.error('Error retrying publish:', err);
      setRetryStatus('error');
      setError(err.response?.data?.detail || 'Failed to retry publish');
    }
  };

  // Create an edit request (triggers regeneration job)
  const handleEditRequest = async () => {
    setIsEditing(true);
    try {
      const response = await api.post(
        `/reels/${reelId}/review/edit-request`,
        { comment: 'Edit requested by user' } // We can optionally include a comment
      );
      // We'll start polling for job status? For simplicity, we'll just set a status and maybe refresh later.
      setEditRequestStatus('pending');
      // Optionally, we can refetch the reel to see if status changed to EDIT_REQUESTED
      const reelResponse = await api.get(`/api/reel/${reelId}`);
      setReel(reelResponse.data);
    } catch (err) {
      console.error('Error creating edit request:', err);
      setError('Failed to create edit request');
    } finally {
      setIsEditing(false);
    }
  };

  // Approve the reel
  const handleApproveReel = async () => {
    setIsApproving(true);
    try {
      const response = await api.post(
        `/reels/${reelId}/approve`
      );
      setApprovalStatus('success');
      // Update reel status
      setReel(prev => ({ ...prev, status: response.data.new_status }));
    } catch (err) {
      console.error('Error approving reel:', err);
      setApprovalStatus('error');
      setError(err.response?.data?.detail || 'Failed to approve reel');
    } finally {
      setIsApproving(false);
    }
  };

  if (loading && !reel) {
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
          Loading...
        </motion.h2>
      </motion.div>
    );
  }

  if (error && !reel) {
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
  }

  if (!reel) {
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
          Reel not found
        </motion.h2>
        <motion.button
          {...motionProps(reducedMotion, {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.5, delay: 0.4 }
          })}
          asChild
        >
          <a href="/library" style={{ textDecoration: 'none' }}>
            Go to Library
          </a>
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
      className="review-page"
    >
      <motion.h1
        {...motionProps(reducedMotion, {
          initial: { opacity: 0, x: -50 },
          animate: { opacity: 1, x: 0 },
          transition: { duration: 0.8, delay: 0.2 }
        })}
      >
        Review Reel #{reel.id}
      </motion.h1>

      {/* Status Indicators */}
      <div className="status-indicators">
        {editRequestStatus && (
          <div className={`status-badge status-${editRequestStatus.toLowerCase()}`}>
            Edit Request: {editRequestStatus}
          </div>
        )}
        {approvalStatus && (
          <div className={`status-badge status-${approvalStatus.toLowerCase()}`}>
            Approval: {approvalStatus}
          </div>
        )}
        {reel.status && (
          <div className="status-badge">
            Reel Status: {reel.status}
          </div>
        )}
      </div>

      {/* Video Preview Section */}
      <motion.div
        className="review-preview"
        {...motionProps(reducedMotion, {
          initial: { opacity: 0, x: -30 },
          animate: { opacity: 1, x: 0 },
          transition: { duration: 0.6, delay: 0.6 }
        })}
      >
        <motion.h2
          {...motionProps(reducedMotion, {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.5 }
          })}
        >
          Video Preview
        </motion.h2>
        {videoUrl ? (
          <div className="video-container">
            <video
              id="review-video"
              controls
              autoPlay
              muted
              playsInline
              style={{ width: '100%', maxWidth: '600px', borderRadius: '8px' }}
              onTimeUpdate={handleTimeUpdate}
              src={videoUrl}
            >
              Your browser does not support the video tag.
            </video>
            <div className="video-controls">
              <div className="current-time">
                Current Time: {currentTime.toFixed(2)}s
              </div>
              <button
                onClick={() => handleAddComment()}
                disabled={!newComment.text.trim()}
                className="add-comment-btn"
              >
                Add Comment at Current Time
              </button>
            </div>
          </div>
        ) : (
          <motion.div
            className="placeholder"
            {...motionProps(reducedMotion, {
              initial: { opacity: 0, scale: 0.8 },
              animate: { opacity: 1, scale: 1 },
              transition: { duration: 0.5, delay: 0.2 }
            })}
          >
            Video Preview
            {!reel.video_path && (
              <p style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
                No video generated yet
              </p>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* New Comment Form */}
      {videoUrl && (
        <motion.div
          className="new-comment-form"
          {...motionProps(reducedMotion, {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.5, delay: 0.8 }
          })}
        >
          <motion.h3
            {...motionProps(reducedMotion, {
              initial: { opacity: 0, y: 20 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.5 }
            })}
          >
            Add Timestamped Comment
          </motion.h3>
          <div className="form-group">
            <input
              type="text"
              value={newComment.text}
              onChange={(e) => setNewComment({ ...newComment, text: e.target.value })}
              placeholder="Enter your comment..."
              className="comment-input" />
          </div>
      </motion.div>)}

      {/* Comments List */}
      <motion.div
        className="comments-section"
        {...motionProps(reducedMotion, {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay: 1.0 }
        })}
      >
        <motion.h2
          {...motionProps(reducedMotion, {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.5 }
          })}
        >
          Comments ({comments.length})
        </motion.h2>
        {comments.length === 0 ? (
          <motion.p
            {...motionProps(reducedMotion, {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { duration: 0.5 }
            })}
          >
            No comments yet. Add a comment using the video player above.
          </motion.p>
        ) : (
          <motion.div
            className="comments-list"
            {...motionProps(reducedMotion, {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { duration: 0.5 }
            })}
          >
            {comments.map(comment => (
              <motion.div
                key={comment.id}
                className={`comment-item ${comment.resolved ? 'resolved' : ''}`}
                {...motionProps(reducedMotion, {
                  initial: { opacity: 0, y: 10 },
                  animate: { opacity: 1, y: 0 },
                  transition: { duration: 0.3 }
                })}
              >
                <div className="comment-content">
                  <div className="comment-header">
                    <span className="comment-timestamp">
                      {comment.timestamp_seconds.toFixed(2)}s
                    </span>
                    <button
                      onClick={() => seekToTimestamp(comment.timestamp_seconds)}
                      className="seek-button"
                      title="Seek to this timestamp"
                    >
                      ⏮️
                    </button>
                    {!comment.resolved && (
                      <button
                        onClick={() => handleResolveComment(comment.id)}
                        className="resolve-button"
                      >
                        Resolve
                      </button>
                    )}
                    {comment.resolved && (
                      <span className="resolved-label">Resolved</span>
                    )}
                  </div>
                  <p className="comment-text">{comment.comment_text}</p>
                  <div className="comment-actions">
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="delete-button"
                      title="Delete comment"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        className="action-buttons"
        {...motionProps(reducedMotion, {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay: 1.2 }
        })}
      >
        {/* READY_FOR_REVIEW state */}
        {reel.status === 'READY_FOR_REVIEW' && (
          <>
            <motion.button
              {...motionProps(reducedMotion, {
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0 },
                transition: { duration: 0.5 }
              })}
              onClick={handleEditRequest}
              disabled={isEditing}
              className="action-btn edit-btn"
            >
              {isEditing ? 'Requesting Edit...' : 'Request Edit'}
            </motion.button>
            <motion.button
              {...motionProps(reducedMotion, {
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0 },
                transition: { duration: 0.5 }
              })}
              onClick={handleApproveReel}
              disabled={isApproving}
              className="action-btn approve-btn"
            >
              {isApproving ? 'Approving...' : 'Approve Reel'}
            </motion.button>
          </>
        )}

        {/* EDIT_REQUESTED state */}
        {reel.status === 'EDIT_REQUESTED' && (
          <motion.p
            {...motionProps(reducedMotion, {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { duration: 0.5 }
            })}
          >
            Reel is currently under edit request. Waiting for regeneration...
          </motion.p>
        )}

        {/* READY_TO_PUBLISH state */}
        {reel.status === 'READY_TO_PUBLISH' && (
          <>
            <motion.p
              {...motionProps(reducedMotion, {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                transition: { duration: 0.5 }
              })}
            >
              Reel is approved and ready to publish.
            </motion.p>
            <div className="publish-actions">
              <motion.button
                {...motionProps(reducedMotion, {
                  initial: { opacity: 0, y: 20 },
                  animate: { opacity: 1, y: 0 },
                  transition: { duration: 0.5 }
                })}
                onClick={handlePublishNow}
                disabled={publishStatus === 'queued' || publishStatus === 'processing' || isEditing || isApproving}
                className={`action-btn publish-btn ${publishStatus === 'processing' || publishStatus === 'queued' ? 'disabled' : ''}`}
              >
                {publishStatus === 'processing' ? 'Publishing...' :
                 publishStatus === 'queued' ? 'Queued...' :
                 'Publish Now'}
              </motion.button>
              <motion.button
                {...motionProps(reducedMotion, {
                  initial: { opacity: 0, y: 20 },
                  animate: { opacity: 1, y: 0 },
                  transition: { duration: 0.5 }
                })}
                onClick={handleOpenScheduleModal}
                disabled={publishStatus === 'queued' || publishStatus === 'processing' || isEditing || isApproving}
                className="action-btn schedule-btn"
              >
                Schedule
              </motion.button>
            </div>
          </>
        )}

        {/* SCHEDULED state */}
        {reel.status === 'SCHEDULED' && scheduleInfo && (
          <>
            <motion.p
              {...motionProps(reducedMotion, {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                transition: { duration: 0.5 }
              })}
            >
              Reel is scheduled for publishing.
            </motion.p>
            <div className="schedule-panel">
              <div className="schedule-details">
                <div className="schedule-item">
                  <strong>Scheduled for:</strong>
                  <span>{new Date(scheduleInfo.scheduled_at).toLocaleString()}</span>
                </div>
                <div className="schedule-item">
                  <strong>Timezone:</strong>
                  <span>{scheduleInfo.timezone}</span>
                </div>
                <div className="schedule-item">
                  <strong>Instagram Account:</strong>
                  <span>{scheduleInfo.instagram_account_id}</span>
                </div>
                <div className="schedule-item">
                  <strong>Status:</strong>
                  <span className={`status-badge status-${scheduleStatus.toLowerCase()}`}>
                    {scheduleStatus}
                  </span>
                </div>
              </div>
              <div className="schedule-actions">
                {scheduleStatus !== 'scheduling' && scheduleStatus !== 'rescheduling' && scheduleStatus !== 'cancelling' && (
                  <>
                    <motion.button
                      {...motionProps(reducedMotion, {
                        initial: { opacity: 0, y: 20 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.5 }
                      })}
                      onClick={handleOpenScheduleModal}
                      disabled={scheduleStatus === 'queued' || scheduleStatus === 'processing' || publishStatus === 'queued' || publishStatus === 'processing'}
                      className="action-btn reschedule-btn"
                    >
                      Reschedule
                    </motion.button>
                    <motion.button
                      {...motionProps(reducedMotion, {
                        initial: { opacity: 0, y: 20 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.5 }
                      })}
                      onClick={handleCancelSchedule}
                      disabled={scheduleStatus === 'queued' || scheduleStatus === 'processing' || publishStatus === 'queued' || publishStatus === 'processing'}
                      className="action-btn cancel-btn"
                    >
                      Cancel Schedule
                    </motion.button>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* QUEUED / PROCESSING publishing states */}
        {(publishStatus === 'queued' || publishStatus === 'processing') && (
          <motion.p
            { ...motionProps(reducedMotion, {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { duration: 0.5 }
            })}
          >
            Publishing in progress...
          </motion.p>
        )}

        {/* QUEUED / PROCESSING scheduling states */}
        {((scheduleStatus === 'scheduling' || scheduleStatus === 'rescheduling' || scheduleStatus === 'cancelling') &&
          scheduleStatus !== 'active' && scheduleStatus !== 'completed' && scheduleStatus !== 'failed' && scheduleStatus !== 'cancelled') && (
          <motion.p
            { ...motionProps(reducedMotion, {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { duration: 0.5 }
            })}
          >
            {scheduleStatus === 'scheduling' ? 'Scheduling...' :
             scheduleStatus === 'rescheduling' ? 'Rescheduling...' :
             'Cancelling...'}
          </motion.p>
        )}

        {/* RETRY states */}
        {(retryStatus === 'queued' || retryStatus === 'processing') && (
          <motion.p
            { ...motionProps(reducedMotion, {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { duration: 0.5 }
            })}
          >
            Retry in progress...
          </motion.p>
        )}

        {/* FAILED state with retry option */}
        {reel.status === 'FAILED' && (
          <>
            <motion.p
              { ...motionProps(reducedMotion, {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                transition: { duration: 0.5 }
              })}
            >
              Publishing failed. You can retry the publish attempt.
            </motion.p>
            <motion.button
              onClick={handleRetryPublish}
              disabled={retryStatus === 'queued' || retryStatus === 'processing' || isEditing || isApproving}
              className="action-btn retry-btn"
            >
              {retryStatus === 'processing' ? 'Retrying...' :
               retryStatus === 'queued' ? 'Queued...' :
               'Retry Publish'}
            </motion.button>
          </>
        )}

        {/* PUBLISHED state */}
        {reel.status === 'PUBLISHED' && (
          <>
            <motion.p
              { ...motionProps(reducedMotion, {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                transition: { duration: 0.5 }
              })}
            >
              Reel successfully published!
            </motion.p>
            {scheduleInfo && (
              <div className="publish-info">
                <div className="info-item">
                  <strong>Published at:</strong>
                  <span>{new Date().toLocaleString()}</span>
                </div>
                <div className="info-item">
                  <strong>Instagram Media ID:</strong>
                  <span>Check publication history for details</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Navigation button */}
        <motion.button
          onClick={() => navigate('/library')}
          className="action-btn back-btn"
        >
          Back to Library
        </motion.button>
      </motion.div>
      {/* Scheduling Modal */}
      {isSchedulingModalOpen && (
        <motion.div
          { ...motionProps(reducedMotion, {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            transition: { duration: 0.3 }
          })}
          className="modal-backdrop"
          onClick={handleCloseScheduleModal}
        >
          <motion.div
            { ...motionProps(reducedMotion, {
              initial: { scale: 0.5, opacity: 0 },
              animate: { scale: 1, opacity: 1 },
              transition: { duration: 0.3 }
            })}
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.h2
              { ...motionProps(reducedMotion, {
                initial: { opacity: 0, y: -20 },
                animate: { opacity: 1, y: 0 },
                transition: { duration: 0.3 }
              })}
            >
              Schedule Publishing
            </motion.h2>

            {schedulingError && (
              <motion.p
                { ...motionProps(reducedMotion, {
                  initial: { opacity: 0 },
                  animate: { opacity: 1 },
                  transition: { duration: 0.3 }
                })}
                style={{ color: '#ff6b6b' }}
              >
                {schedulingError}
              </motion.p>
            )}

            <form onSubmit={handleScheduleSubmit} className="schedule-form">
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="modal-input"
                />
              </div>

              <div className="form-group">
                <label>Time</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  required
                  className="modal-input"
                />
              </div>

              <div className="form-group">
                <label>Timezone</label>
                <select
                  value={scheduleTimezone}
                  onChange={(e) => setScheduleTimezone(e.target.value)}
                  required
                  className="modal-input"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="Europe/London">GMT</option>
                  <option value="Europe/Paris">Central European Time (CET)</option>
                  <option value="Asia/Tokyo">Japan Standard Time (JST)</option>
                  <option value="Asia/Shanghai">China Standard Time (CST)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Instagram Account</label>
                <select disabled className="modal-input">
                  <option value="">Loading account...</option>
                </select>
                <p className="help-text">Using connected Instagram account</p>
              </div>

              <div className="modal-actions">
                <motion.button
                  type="button"
                  onClick={handleCloseScheduleModal}
                  className="action-btn secondary-btn"
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  disabled={scheduleStatus === 'scheduling'}
                  className="action-btn primary-btn"
                >
                  {scheduleStatus === 'scheduling' ? 'Scheduling...' : 'Schedule'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
      {/* Publication History Section */}
      {publicationHistory.length > 0 && (
        <motion.div
          className="publication-history-section"
          { ...motionProps(reducedMotion, {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.5, delay: 0.5 }
          })}
        >
          <motion.h2
            { ...motionProps(reducedMotion, {
              initial: { opacity: 0, y: -20 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.5 }
            })}
          >
            Publication History
          </motion.h2>
          <motion.div
            className="history-list"
            { ...motionProps(reducedMotion, {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { duration: 0.5 }
            })}
          >
            {publicationHistory.map((pub, index) => (
              <motion.div
                key={pub.id}
                className={`history-item ${pub.status.toLowerCase()}`}
                { ...motionProps(reducedMotion, {
                  initial: { opacity: 0, x: -20 },
                  animate: { opacity: 1, x: 0 },
                  transition: { duration: 0.3, delay: index * 0.1 }
                })}
              >
                <div className="history-header">
                  <span className="history-status status-badge status-${pub.status.toLowerCase()}">
                    {pub.status}
                  </span>
                  <span className="history-timestamp">
                    {new Date(pub.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="history-details">
                  <div className="detail-row">
                    <span className="detail-label">Account:</span>
                    <span className="detail-value">{pub.instagram_account_id}</span>
                  </div>
                  {pub.container_id && (
                    <div className="detail-row">
                      <span className="detail-label">Container ID:</span>
                      <span className="detail-value">{pub.container_id}</span>
                    </div>
                  )}
                  {pub.published_media_id && (
                    <div className="detail-row">
                      <span className="detail-label">Media ID:</span>
                      <span className="detail-value">{pub.published_media_id}</span>
                    </div>
                  )}
                  {pub.retry_count > 0 && (
                    <div className="detail-row">
                      <span className="detail-label">Retry Count:</span>
                      <span className="detail-value">{pub.retry_count}</span>
                    </div>
                  )}
                  {pub.error_message && (
                    <div className="detail-row error-detail">
                      <span className="detail-label">Error:</span>
                      <span className="detail-value">{pub.error_message}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
      {/* Error Message */}
      {error && (
        <motion.div
          className="error-message"
          { ...motionProps(reducedMotion, {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            transition: { duration: 0.5 }
          })}
        >
          <motion.p
            { ...motionProps(reducedMotion, {
              initial: { opacity: 0, x: 20 },
              animate: { opacity: 1, x: 0 },
              transition: { duration: 0.5, delay: 0.2 }
            })}
            style={{ color: '#ff6b6b' }}
          >
            {error}
          </motion.p>
          <motion.button
            { ...motionProps(reducedMotion, {
              initial: { opacity: 0, y: 20 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.5, delay: 0.5 }
            })}
            onClick={() => setError(null)}
          >
            Close
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}