import { motion, useReducedMotion } from 'framer-motion';
import { useReel } from '../hooks/useReel';
import { useReelOperations } from '../hooks/useReelOperations';
import { useState, useEffect } from 'react';

export default function Calendar() {
  const reducedMotion = useReducedMotion();
  const motionProps = (reducedMotion, props) =>
    reducedMotion ? {} : props;

  const { reels, loading: reelsLoading, error: reelsError, refetch: refetchReels } = useReel();
  const {
    schedulePublish,
    getSchedule,
    updateSchedule,
    cancelSchedule,
    loading: scheduleLoading,
    error: scheduleError
  } = useReelOperations();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [schedules, setSchedules] = useState({}); // Map of date string to schedule list
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editScheduledAt, setEditScheduledAt] = useState('');
  const [editTimezone, setEditTimezone] = useState('');

  // Format date for display
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format time for display
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get schedules for all reels
  useEffect(() => {
    const loadSchedules = async () => {
      if (reelsLoading) return;

      setLoading(true);
      setError(null);

      try {
        const schedulesMap = {};

        // For each reel, get its schedule
        for (const reel of reels) {
          try {
            const scheduleData = await getSchedule(reel.id);
            if (scheduleData) {
              const scheduledAt = new Date(scheduleData.scheduled_at);
              const dateKey = scheduledAt.toISOString().split('T')[0]; // YYYY-MM-DD

              if (!schedulesMap[dateKey]) {
                schedulesMap[dateKey] = [];
              }

              schedulesMap[dateKey].push({
                ...scheduleData,
                reelTitle: reel.title,
                reelId: reel.id
              });
            }
          } catch (err) {
            // Ignore 404 errors (no schedule for this reel)
            if (err.response && err.response.status !== 404) {
              console.error(`Failed to get schedule for reel ${reel.id}:`, err);
            }
          }
        }

        setSchedules(schedulesMap);
      } catch (err) {
        console.error('Failed to load schedules:', err);
        setError('Failed to load schedules. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadSchedules();
  }, [reels, getSchedule, reelsLoading]);

  // Handle date navigation
  const prevMonth = () => {
    setCurrentDate(prev => {
      const date = new Date(prev);
      date.setMonth(date.getMonth() - 1);
      return date;
    });
  };

  const nextMonth = () => {
    setCurrentDate(prev => {
      const date = new Date(prev);
      date.setMonth(date.getMonth() + 1);
      return date;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get days in month
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month (0-6, where 0 is Sunday)
  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // Check if date is today
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Check if date is in current month
  const isInCurrentMonth = (date) => {
    return date.getMonth() === currentDate.getMonth() &&
           date.getFullYear() === currentDate.getFullYear();
  };

  // Get schedule count for a date
  const getScheduleCount = (date) => {
    const dateKey = date.toISOString().split('T')[0];
    const daySchedules = schedules[dateKey] || [];
    return daySchedules.length;
  };

  // Get schedules for a date
  const getDaySchedules = (date) => {
    const dateKey = date.toISOString().split('T')[0];
    return schedules[dateKey] || [];
  };

  // Handle date click
  const handleDateClick = (date) => {
    setSelectedDate(date);
    const daySchedules = getDaySchedules(date);
    if (daySchedules.length > 0) {
      setSelectedSchedule(daySchedules[0]); // Select first schedule by default
    } else {
      setSelectedSchedule(null);
    }
  };

  // Handle schedule creation
  const handleCreateSchedule = async (reelId, scheduledAt, timezone) => {
    try {
      await schedulePublish(reelId, scheduledAt, timezone);
      // Refresh schedules
      await refetchReels();
      setSelectedDate(null);
      setSelectedSchedule(null);
    } catch (err) {
      console.error('Failed to create schedule:', err);
      setError('Failed to create schedule. Please try again.');
    }
  };

  // Handle schedule update
  const handleUpdateSchedule = async (scheduleId, reelId, scheduledAt, timezone) => {
    try {
      await updateSchedule(reelId, scheduledAt, timezone);
      // Refresh schedules
      await refetchReels();
      setEditDialogOpen(false);
    } catch (err) {
      console.error('Failed to update schedule:', err);
      setError('Failed to update schedule. Please try again.');
    }
  };

  // Handle schedule cancellation
  const handleCancelSchedule = async (scheduleId, reelId) => {
    try {
      await cancelSchedule(reelId);
      // Refresh schedules
      await refetchReels();
      setSelectedDate(null);
      setSelectedSchedule(null);
    } catch (err) {
      console.error('Failed to cancel schedule:', err);
      setError('Failed to cancel schedule. Please try again.');
    }
  };

  // Format scheduledAt for input (YYYY-MM-DDTHH:MM)
  const formatScheduledAtForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Format as YYYY-MM-DDTHH:MM for datetime-local input
    return date.toISOString().slice(0, 16);
  };

  // Get timezone options (simplified - in reality this would come from a list)
  const timezoneOptions = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time' },
    { value: 'America/Chicago', label: 'Central Time' },
    { value: 'America/Denver', label: 'Mountain Time' },
    { value: 'America/Los_Angeles', label: 'Pacific Time' }
  ];

  if (reelsLoading) {
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
          Calendar
        </motion.h1>
        <motion.p
          {...motionProps(reducedMotion, {
            initial: { opacity: 0, x: 50 },
            animate: { opacity: 1, x: 0 },
            transition: { duration: 0.8, delay: 0.4 }
          })}
        >
          Loading calendar...
        </motion.p>
      </motion.div>
    );
  }

  if (reelsError) {
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
          Calendar
        </motion.h1>
        <motion.p
          {...motionProps(reducedMotion, {
            initial: { opacity: 0, x: 50 },
            animate: { opacity: 1, x: 0 },
            transition: { duration: 0.8, delay: 0.4 }
          })}
        >
          Error loading reels: {reelsError.message}
        </motion.p>
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
      <motion.h1
        {...motionProps(reducedMotion, {
          initial: { opacity: 0, x: -50 },
          animate: { opacity: 1, x: 0 },
          transition: { duration: 0.8, delay: 0.2 }
        })}
      >
        Calendar
      </motion.h1>
      <motion.p
        {...motionProps(reducedMotion, {
          initial: { opacity: 0, x: 50 },
          animate: { opacity: 1, x: 0 },
          transition: { duration: 0.8, delay: 0.4 }
        })}
      >
        View and manage scheduled reels
      </motion.p>

      {/* Calendar Header */}
      <motion.div
        {...motionProps(reducedMotion, {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.5, delay: 0.2 }
        })}
        className="calendar-header"
      >
        <button
          onClick={prevMonth}
          className="calendar-nav-button"
          aria-label="Previous month"
        >
          ‹
        </button>
        <h2>
          {currentDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
        </h2>
        <button
          onClick={nextMonth}
          className="calendar-nav-button"
          aria-label="Next month"
        >
          ›
        </button>
        <button
          onClick={goToToday}
          className="calendar-today-button"
        >
          Today
        </button>
      </motion.div>

      {/* Calendar Loading State */}
      {loading && (
        <motion.div
          {...motionProps(reducedMotion, {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            transition: { duration: 0.5, delay: 0.4 }
          })}
          className="calendar-loading"
        >
          Loading schedules...
        </motion.div>
      )}

      {/* Calendar Error State */}
      {error && !loading && (
        <motion.div
          {...motionProps(reducedMotion, {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            transition: { duration: 0.5, delay: 0.4 }
          })}
          className="calendar-error"
        >
          {error}
          <button onClick={() => refetchReels()} className="calendar-retry-button">
            Retry
          </button>
        </motion.div>
      )}

      {/* Calendar Grid */}
      {!loading && !error && (
        <motion.div
          {...motionProps(reducedMotion, {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            transition: { duration: 0.5, delay: 0.6 }
          })}
          className="calendar-grid-container"
        >
          {/* Weekday Headers */}
          <div className="calendar-weekdays">
            {/* Sun, Mon, Tue, Wed, Thu, Fri, Sat */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
              <div key={index} className="calendar-weekday">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="calendar-days">
            {/* Empty cells for days before the 1st */}
            {Array(getFirstDayOfMonth(currentDate))
              .fill()
              .map((_, index) => (
                <div key={`empty-${index}`} className="calendar-day empty" />
              ))}

            {/* Days of the month */}
            {Array(getDaysInMonth(currentDate))
              .fill()
              .map((_, index) => {
                const date = new Date(
                  currentDate.getFullYear(),
                  currentDate.getMonth(),
                  index + 1
                );
                const isSelected = selectedDate &&
                  date.toDateString() === selectedDate.toDateString();
                const scheduleCount = getScheduleCount(date);
                const hasSchedules = scheduleCount > 0;

                return (
                  <motion.div
                    key={`day-${index}`}
                    className={`calendar-day ${isSelected ? 'selected' : ''} ${hasSchedules ? 'has-schedules' : ''} ${isToday(date) ? 'today' : ''}`}
                    onClick={() => handleDateClick(date)}
                  >
                    <div className="calendar-day-number">
                      {index + 1}
                    </div>
                    {hasSchedules && (
                      <div className="schedule-indicators">
                        {Array(Math.min(scheduleCount, 3))
                          .fill()
                          .map((_, dotIndex) => (
                            <div key={`dot-${dotIndex}`} className="schedule-dot" />
                          ))}
                        {scheduleCount > 3 && (
                          <div className="schedule-more">+{scheduleCount - 3}</div>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
          </div>
        </motion.div>
      )}

      {/* Schedule Detail Panel */}
      {selectedDate && (
        <motion.div
          {...motionProps(reducedMotion, {
            initial: { opacity: 0, x: 20 },
            animate: { opacity: 1, x: 0 },
            transition: { duration: 0.5, delay: 0.2 }
          })}
          className="schedule-detail-panel"
        >
          <motion.h2
            {...motionProps(reducedMotion, {
              initial: { opacity: 0, y: -10 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.4, delay: 0.1 }
            })}
          >
            Schedules for {formatDate(selectedDate)}
          </motion.h2>

          {getDaySchedules(selectedDate).length === 0 ? (
            <motion.p
              {...motionProps(reducedMotion, {
                initial: { opacity: 0, y: 10 },
                animate: { opacity: 1, y: 0 },
                transition: { duration: 0.4, delay: 0.1 }
              })}
            >
              No scheduled reels for this date.
            </motion.p>
          ) : (
            <div className="schedule-list">
              {getDaySchedules(selectedDate).map((schedule, index) => (
                <motion.div
                  key={`schedule-${schedule.id}`}
                  className={`schedule-item ${selectedSchedule && selectedSchedule.id === schedule.id ? 'selected' : ''}`}
                  onClick={() => setSelectedSchedule(schedule)}
                >
                  <div className="schedule-info">
                    <div className="schedule-reel-title">
                      {schedule.reelTitle}
                    </div>
                    <div className="schedule-time">
                      {formatTime(schedule.scheduled_at)}
                    </div>
                    <div className="schedule-status">
                      <span className={`status-badge status-${schedule.status.toLowerCase()}`}>
                        {schedule.status}
                      </span>
                      {schedule.timezone && (
                        <span className="schedule-timezone">
                          ({schedule.timezone})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="schedule-actions">
                    {(schedule.status === 'SCHEDULED' || schedule.status === 'PROCESSING') && (
                      <button
                        onClick={() => {
                          setEditDialogOpen(true);
                          setEditScheduledAt(formatScheduledAtForInput(schedule.scheduled_at));
                          setEditTimezone(schedule.timezone || '');
                        }}
                        className="schedule-edit-button"
                      >
                        Edit
                      </button>
                    )}
                    {(schedule.status === 'SCHEDULED' || schedule.status === 'PROCESSING') && (
                      <button
                        onClick={() => handleCancelSchedule(schedule.id, schedule.reel_id)}
                        className="schedule-cancel-button"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Schedule Creation Button */}
          {!editDialogOpen && (
            <motion.div
              {...motionProps(reducedMotion, {
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0 },
                transition: { duration: 0.4, delay: 0.2 }
              })}
              className="schedule-create-section"
            >
              <motion.h3
                {...motionProps(reducedMotion, {
                  initial: { opacity: 0, y: -10 },
                  animate: { opacity: 1, y: 0 },
                  transition: { duration: 0.4, delay: 0.1 }
                })}
              >
                Schedule a Reel
              </motion.h3>

              {/* Reel Selection */}
              <div className="form-group">
                <label htmlFor="schedule-reel-select">Select Reel:</label>
                <select
                  id="schedule-reel-select"
                  className="form-select"
                  onChange={(e) => {
                    const reelId = parseInt(e.target.value);
                    const selectedReel = reels.find(r => r.id === reelId);
                    // In a real app, you might want to validate reel status here
                  }}
                >
                  <option value="">-- Select a Reel --</option>
                  {reels.map(reel => (
                    <option key={reel.id} value={reel.id}>
                      {reel.title} ({reel.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date/Time Selection */}
              <div className="form-group">
                <label htmlFor="schedule-datetime">Date & Time:</label>
                <input
                  type="datetime-local"
                  id="schedule-datetime"
                  className="form-input"
                  min={new Date().toISOString().slice(0, 16)}
                />
                <small className="form-help-text">
                  Please select a future date and time
                </small>
              </div>

              {/* Timezone Selection */}
              <div className="form-group">
                <label htmlFor="schedule-timezone">Timezone:</label>
                <select
                  id="schedule-timezone"
                  className="form-select"
                >
                  {timezoneOptions.map(tz => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              <motion.button
                onClick={(e) => {
                  e.preventDefault();
                  // In a real implementation, you would get the selected values from refs or state
                  // For now, we'll just show an alert
                  alert('Schedule creation would be implemented here with form values');
                }}
                className="schedule-create-button"
              >
                Schedule Reel
              </motion.button>
            </motion.div>
          )}

          {/* Edit Schedule Dialog */}
          {editDialogOpen && (
            <motion.div
              {...motionProps(reducedMotion, {
                initial: { opacity: 0, scale: 0.9 },
                animate: { opacity: 1, scale: 1 },
                transition: { duration: 0.4, delay: 0.1 }
              })}
              className="edit-schedule-dialog-backdrop"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setEditDialogOpen(false);
                }
              }}
            >
              <motion.div
                {...motionProps(reducedMotion, {
                  initial: { opacity: 0, scale: 0.9 },
                  animate: { opacity: 1, scale: 1 },
                  transition: { duration: 0.4, delay: 0.1 }
                })}
                className="edit-schedule-dialog"
              >
                <motion.h3
                  {...motionProps(reducedMotion, {
                    initial: { opacity: 0, y: -10 },
                    animate: { opacity: 1, y: 0 },
                    transition: { duration: 0.4, delay: 0.1 }
                  })}
                >
                  Edit Schedule
                </motion.h3>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  // In a real implementation, you would get the reel ID from selectedSchedule
                  // and call handleUpdateSchedule with the form values
                  alert('Schedule update would be implemented here with form values');
                  setEditDialogOpen(false);
                }}>
                  <div className="form-group">
                    <label htmlFor="edit-scheduled-at">Date & Time:</label>
                    <input
                      type="datetime-local"
                      id="edit-scheduled-at"
                      value={editScheduledAt}
                      onChange={(e) => setEditScheduledAt(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-timezone">Timezone:</label>
                    <select
                      id="edit-timezone"
                      value={editTimezone}
                      onChange={(e) => setEditTimezone(e.target.value)}
                      className="form-select"
                    >
                      {timezoneOptions.map(tz => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-actions">
                    <motion.button
                      type="button"
                      onClick={() => setEditDialogOpen(false)}
                      className="edit-schedule-cancel-button"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="submit"
                      className="edit-schedule-submit-button"
                    >
                      Update Schedule
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}