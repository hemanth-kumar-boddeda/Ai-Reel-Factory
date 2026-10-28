import { motion, useReducedMotion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useReelOperations } from '../hooks/useReelOperations';

export default function CreateReel() {
  const reducedMotion = useReducedMotion();
  const navigate = useNavigate();
  const location = useLocation();
  const { createReel, updateReel, getReel, createRenderJob, getJob, triggerRender, publishReel, schedulePublish, getSchedule, updateSchedule, cancelSchedule, retryPublish, getPublicationHistory, getAnalytics, refreshAnalytics, getAnalyticsHistory, loading: apiLoading, error: apiError } = useReelOperations();
  const [reel, setReel] = useState(null);
  const [step, setStep] = useState('content'); // content, configure, script, review, render, ready
  const [formValues, setFormValues] = useState({
    title: '',
    vision: '',
    url: '',
    hook: '',
    duration: 12,
    tone: 'informative',
    visualStyle: 'modern',
    voice: 'neutral',
    captions: 'none',
    cta: '',
    script: '',
  });
  const [polling, setPolling] = useState(false);
  const [pollInterval, setPollInterval] = useState(null);
  const [jobId, setJobId] = useState(null);

  // Publishing operations state
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishError, setPublishError] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);
  const [scheduleData, setScheduleData] = useState(null);
  const [publicationHistory, setPublicationHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleTimezone, setScheduleTimezone] = useState('');
  const [scheduleFormError, setScheduleFormError] = useState(null);
  const [retryLoading, setRetryLoading] = useState(false);
  const [retryError, setRetryError] = useState(null);
  const [statusPolling, setStatusPolling] = useState(false);
  const [statusPollInterval, setStatusPollInterval] = useState(null);

  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [analyticsHistory, setAnalyticsHistory] = useState([]);
  const [refreshAnalyticsLoading, setRefreshAnalyticsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(null);
  const [snapshotTimestamp, setSnapshotTimestamp] = useState(null);
  const viewsChartRef = useRef(null);
  const engagementChartRef = useRef(null);
  const interactionChartRef = useRef(null);

  // Helper function to conditionally apply motion props
  const motionProps = (reducedMotion, props) =>
    reducedMotion ? {} : props;

  // Check if we have a reel from Discover (passed via state)
  useEffect(() => {
    if (location.state && location.state.reel) {
      const reelFromState = location.state.reel;
      // If we have a reel from Discover, we can start at configure step
      setReel(reelFromState);
      // Pre-fill form values with the reel's data - prefer dedicated fields, fallback to research_data.uiControls
      const hook = reelFromState.hook !== undefined && reelFromState.hook !== null ? reelFromState.hook : '';
      const duration = reelFromState.duration !== undefined && reelFromState.duration !== null ? reelFromState.duration : 12;
      const tone = reelFromState.tone !== undefined && reelFromState.tone !== null ? reelFromState.tone : 'informative';
      const visualStyle = reelFromState.visual_style !== undefined && reelFromState.visual_style !== null ? reelFromState.visual_style : 'modern';
      const voice = reelFromState.voice !== undefined && reelFromState.voice !== null ? reelFromState.voice : 'neutral';
      const captions = reelFromState.captions !== undefined && reelFromState.captions !== null ? reelFromState.captions : 'none';
      const cta = reelFromState.cta !== undefined && reelFromState.cta !== null ? reelFromState.cta : '';

      // Fallback to research_data.uiControls for backward compatibility
      if ((!reelFromState.hook && reelFromState.hook !== 0) || !reelFromState.duration || !reelFromState.tone || !reelFromState.visual_style || !reelFromState.voice || !reelFromState.captions || !reelFromState.cta) {
        const uiControls = {};
        if (reelFromState.research_data) {
          try {
            const researchData = JSON.parse(reelFromState.research_data);
            if (researchData.uiControls) {
              Object.assign(uiControls, researchData.uiControls);
            }
          } catch (e) {
            // Ignore if not JSON
          }
        }
        // Use fallback values if dedicated fields are not set
        if (!hook || hook === '') {
          setFormValues(prev => ({ ...prev, hook: uiControls.hook || '' }));
        }
        if (!duration || duration === 12) { // 12 is the default
          setFormValues(prev => ({ ...prev, duration: parseInt(uiControls.duration) || 12 }));
        }
        if (!tone || tone === 'informative') {
          setFormValues(prev => ({ ...prev, tone: uiControls.tone || 'informative' }));
        }
        if (!visualStyle || visualStyle === 'modern') {
          setFormValues(prev => ({ ...prev, visualStyle: uiControls.visualStyle || 'modern' }));
        }
        if (!voice || voice === 'neutral') {
          setFormValues(prev => ({ ...prev, voice: uiControls.voice || 'neutral' }));
        }
        if (!captions || captions === 'none') {
          setFormValues(prev => ({ ...prev, captions: uiControls.captions || 'none' }));
        }
        if (!cta || cta === '') {
          setFormValues(prev => ({ ...prev, cta: uiControls.cta || '' }));
        }
      }

      setFormValues(prev => ({
        ...prev,
        title: reelFromState.title || '',
        vision: reelFromState.summary || '',
        url: reelFromState.url || '',
        hook: hook,
        duration: duration,
        tone: tone,
        visualStyle: visualStyle,
        voice: voice,
        captions: captions,
        cta: cta,
        script: reelFromState.script || '',
      }));
      setStep('configure');
    }
  }, [location.state]);

  // Fetch reel by ID if we have one (e.g., after creation)
  useEffect(() => {
    if (reel && reel.id) {
      const fetchReel = async () => {
        try {
          const fetchedReel = await getReel(reel.id);
          setReel(fetchedReel);
          // Update form values with the fetched reel (especially script and research_data)
          // Prefer dedicated fields, fallback to research_data.uiControls for backward compatibility
          const hook = fetchedReel.hook !== undefined && fetchedReel.hook !== null ? fetchedReel.hook : '';
          const duration = fetchedReel.duration !== undefined && fetchedReel.duration !== null ? fetchedReel.duration : 12;
          const tone = fetchedReel.tone !== undefined && fetchedReel.tone !== null ? fetchedReel.tone : 'informative';
          const visualStyle = fetchedReel.visual_style !== undefined && fetchedReel.visual_style !== null ? fetchedReel.visual_style : 'modern';
          const voice = fetchedReel.voice !== undefined && fetchedReel.voice !== null ? fetchedReel.voice : 'neutral';
          const captions = fetchedReel.captions !== undefined && fetchedReel.captions !== null ? fetchedReel.captions : 'none';
          const cta = fetchedReel.cta !== undefined && fetchedReel.cta !== null ? fetchedReel.cta : '';

          // Fallback to research_data.uiControls for backward compatibility
          if ((!fetchedReel.hook && fetchedReel.hook !== 0) || !fetchedReel.duration || !fetchedReel.tone || !fetchedReel.visual_style || !fetchedReel.voice || !fetchedReel.captions || !fetchedReel.cta) {
            const uiControls = {};
            if (fetchedReel.research_data) {
              try {
                const researchData = JSON.parse(fetchedReel.research_data);
                if (researchData.uiControls) {
                  Object.assign(uiControls, researchData.uiControls);
                }
              } catch (e) {
                // Ignore if not JSON
              }
            }
            // Use fallback values if dedicated fields are not set
            if (!hook || hook === '') {
              setFormValues(prev => ({ ...prev, hook: uiControls.hook || '' }));
            }
            if (!duration || duration === 12) { // 12 is the default
              setFormValues(prev => ({ ...prev, duration: parseInt(uiControls.duration) || 12 }));
            }
            if (!tone || tone === 'informative') {
              setFormValues(prev => ({ ...prev, tone: uiControls.tone || 'informative' }));
            }
            if (!visualStyle || visualStyle === 'modern') {
              setFormValues(prev => ({ ...prev, visualStyle: uiControls.visualStyle || 'modern' }));
            }
            if (!voice || voice === 'neutral') {
              setFormValues(prev => ({ ...prev, voice: uiControls.voice || 'neutral' }));
            }
            if (!captions || captions === 'none') {
              setFormValues(prev => ({ ...prev, captions: uiControls.captions || 'none' }));
            }
            if (!cta || cta === '') {
              setFormValues(prev => ({ ...prev, cta: uiControls.cta || '' }));
            }
          }

          setFormValues(prev => ({
            ...prev,
            title: fetchedReel.title || '',
            vision: fetchedReel.summary || '',
            url: fetchedReel.url || '',
            hook: hook,
            duration: duration,
            tone: tone,
            visualStyle: visualStyle,
            voice: voice,
            captions: captions,
            cta: cta,
            script: fetchedReel.script || '',
          }));
        } catch (err) {
          console.error('Error fetching reel:', err);
        }
      };
      fetchReel();
    }
  }, [reel, getReel]);

  // Polling for job status in render step
  useEffect(() => {
    if (step === 'render' && polling && jobId) {
      const checkStatus = async () => {
        try {
          const job = await getJob(jobId);
          if (job.status === 'COMPLETED') {
            // Job completed successfully, fetch the updated reel
            const updatedReel = await getReel(job.reel_id);
            setReel(updatedReel);
            stopPolling();
            // Only move to ready step if backend confirms reel is ready
            if (updatedReel.status === 'READY_TO_PUBLISH') {
              setStep('ready');
            } else {
              // If reel is not ready, treat as failure
              setApiError('Rendering completed but reel is not ready. Please try again.');
            }
          } else if (job.status === 'FAILED') {
            // Job failed
            stopPolling();
            setApiError('Rendering failed. Please try again.');
          }
          // If still PENDING or PROCESSING, continue polling
        } catch (err) {
          console.error('Error polling job status:', err);
          stopPolling();
          setApiError('Failed to check job status. Please try again.');
        }
      };

      checkStatus();
      const interval = setInterval(checkStatus, 5000);
      setPollInterval(interval);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [step, polling, jobId, getJob, getReel]);

  // Fetch schedule and publication history when reel changes
  useEffect(() => {
    if (reel && reel.id) {
      const fetchScheduleAndHistory = async () => {
        try {
          // Fetch schedule
          const scheduleRes = await getSchedule(reel.id);
          setScheduleData(scheduleRes);

          // Fetch publication history
          setHistoryLoading(true);
          const historyRes = await getPublicationHistory(reel.id);
          setPublicationHistory(historyRes);
          setHistoryLoading(false);
        } catch (err) {
          console.error('Error fetching schedule/history:', err);
          setScheduleError('Failed to fetch schedule');
          setHistoryError('Failed to fetch publication history');
          setHistoryLoading(false);
        }
      };

      fetchScheduleAndHistory();
    }
  }, [reel, getSchedule, getPublicationHistory]);

  // Status polling for active operations
  useEffect(() => {
    if (statusPolling && reel && reel.id) {
      const checkStatus = async () => {
        try {
          // Refresh reel status
          const updatedReel = await getReel(reel.id);
          setReel(updatedReel);

          // Refresh schedule if exists
          if (updatedReel.status === 'SCHEDULED' || updatedReel.status === 'READY_TO_PUBLISH') {
            try {
              const scheduleRes = await getSchedule(reel.id);
              setScheduleData(scheduleRes);
            } catch (scheduleErr) {
              // Schedule might have been cleared
              setScheduleData(null);
            }
          }

          // Refresh publication history periodically
          setHistoryLoading(true);
          try {
            const historyRes = await getPublicationHistory(reel.id);
            setPublicationHistory(historyRes);
          } catch (historyErr) {
            console.error('Error refreshing history:', historyErr);
          } finally {
            setHistoryLoading(false);
          }
        } catch (err) {
          console.error('Error polling status:', err);
          // Don't set apiError here to avoid interfering with operation-specific errors
        }
      };

      checkStatus();
      const interval = setInterval(checkStatus, 10000); // Poll every 10 seconds
      setStatusPollInterval(interval);
    }

    return () => {
      if (statusPollInterval) {
        clearInterval(statusPollInterval);
        setStatusPollInterval(null);
      }
    };
  }, [statusPolling, reel, getReel, getSchedule, getPublicationHistory]);

  const stopStatusPolling = () => {
    setStatusPolling(false);
    if (statusPollInterval) {
      clearInterval(statusPollInterval);
      setStatusPollInterval(null);
    }
  };

  // Publishing operation handlers
  const handlePublishNow = async () => {
    if (!reel || !reel.id) return;

    setPublishLoading(true);
    setPublishError(null);
    try {
      const result = await publishReel(reel.id);
      setPublishLoading(false);
      // Start status polling to track the publishing process
      setStatusPolling(true);
      // Refresh reel status to see the update
      const updatedReel = await getReel(reel.id);
      setReel(updatedReel);
    } catch (err) {
      setPublishLoading(false);
      setPublishError('Failed to publish reel. Please try again.');
      console.error('Publish error:', err);
    }
  };

  // Fetch analytics when reel is published
  useEffect(() => {
    if (reel && reel.id && reel.status === "PUBLISHED") {
      const fetchAnalytics = async () => {
        setAnalyticsLoading(true);
        setAnalyticsError(null);
        try {
          const analyticsRes = await getAnalytics(reel.id);
          setAnalyticsData(analyticsRes);
          setLastUpdateTimestamp(Date.now());

          // Also fetch history
          const historyRes = await getAnalyticsHistory(reel.id);
          setAnalyticsHistory(historyRes);

          // Extract snapshot timestamp from analytics data if available
          if (analyticsRes && analyticsRes.snapshot_timestamp) {
            setSnapshotTimestamp(new Date(analyticsRes.snapshot_timestamp).getTime());
          }
        } catch (err) {
          setAnalyticsError('Failed to fetch analytics. Please try again.');
          console.error('Error fetching analytics:', err);
        } finally {
          setAnalyticsLoading(false);
        }
      };
      fetchAnalytics();
    }
  }, [reel, getAnalytics, getAnalyticsHistory]);

  // Refresh analytics with polling
  useEffect(() => {
    if (refreshAnalyticsLoading && reel && reel.id) {
      const checkRefreshStatus = async () => {
        try {
          const analyticsRes = await getAnalytics(reel.id);
          setAnalyticsData(analyticsRes);
          setLastUpdateTimestamp(Date.now());

          // Update history
          const historyRes = await getAnalyticsHistory(reel.id);
          setAnalyticsHistory(historyRes);

          if (analyticsRes && analyticsRes.snapshot_timestamp) {
            setSnapshotTimestamp(new Date(analyticsRes.snapshot_timestamp).getTime());
          }

          setRefreshAnalyticsLoading(false);
          setRefreshing(false);
        } catch (err) {
          setRefreshAnalyticsLoading(false);
          setRefreshing(false);
          setAnalyticsError('Failed to refresh analytics. Please try again.');
          console.error('Error refreshing analytics:', err);
        }
      };

      checkRefreshStatus();
      const interval = setInterval(checkRefreshStatus, 3000); // Poll every 3 seconds

      return () => clearInterval(interval);
    }
  }, [refreshAnalyticsLoading, reel, getAnalytics, getAnalyticsHistory]);

  // Update charts when analyticsHistory changes
  useEffect(() => {
    if (analyticsHistory.length > 0) {
      // Update views chart
      if (viewsChartRef.current) {
        updateViewsChart(viewsChartRef.current, analyticsHistory);
      }

      // Update engagement chart
      if (engagementChartRef.current) {
        updateEngagementChart(engagementChartRef.current, analyticsHistory);
      }

      // Update interaction chart
      if (interactionChartRef.current) {
        updateInteractionChart(interactionChartRef.current, analyticsHistory);
      }
    }
  }, [analyticsHistory]);

  const handleSchedulePublish = async (date, time, timezone) => {
    if (!reel || !reel.id) return;

    // Validate inputs
    if (!date || !time || !timezone) {
      setScheduleFormError('Please fill in all fields');
      return;
    }

    try {
      const scheduledAt = new Date(`${date}T${time}:00`);
      const now = new Date();

      if (scheduledAt <= now) {
        setScheduleFormError('Please select a future date and time');
        return;
      }

      setScheduleLoading(true);
      setScheduleError(null);
      setScheduleFormError(null);

      const result = await schedulePublish(reel.id, scheduledAt.toISOString(), timezone);
      setScheduleLoading(false);

      // Close scheduling form and refresh data
      setScheduling(false);
      setScheduleDate('');
      setScheduleTime('');
      setScheduleTimezone('');

      // Refresh reel and schedule data
      const updatedReel = await getReel(reel.id);
      setReel(updatedReel);

      // Start status polling
      setStatusPolling(true);
    } catch (err) {
      setScheduleLoading(false);
      if (err.response && err.response.data) {
        setScheduleError(err.response.data.detail || 'Failed to schedule publish');
      } else {
        setScheduleError('Failed to schedule publish. Please try again.');
      }
      console.error('Schedule error:', err);
    }
  };

  const handleUpdateSchedule = async (date, time, timezone) => {
    if (!reel || !reel.id) return;

    // Validate inputs
    if (!date || !time || !timezone) {
      setScheduleFormError('Please fill in all fields');
      return;
    }

    try {
      const scheduledAt = new Date(`${date}T${time}:00`);
      const now = new Date();

      if (scheduledAt <= now) {
        setScheduleFormError('Please select a future date and time');
        return;
      }

      setScheduleLoading(true);
      setScheduleError(null);
      setScheduleFormError(null);

      const result = await updateSchedule(reel.id, scheduledAt.toISOString(), timezone);
      setScheduleLoading(false);

      // Close scheduling form and refresh data
      setScheduling(false);
      setScheduleDate('');
      setScheduleTime('');
      setScheduleTimezone('');

      // Refresh reel and schedule data
      const updatedReel = await getReel(reel.id);
      setReel(updatedReel);
    } catch (err) {
      setScheduleLoading(false);
      if (err.response && err.response.data) {
        setScheduleError(err.response.data.detail || 'Failed to update schedule');
      } else {
        setScheduleError('Failed to update schedule. Please try again.');
      }
      console.error('Update schedule error:', err);
    }
  };

  const handleCancelSchedule = async () => {
    if (!reel || !reel.id) return;

    setScheduleLoading(true);
    setScheduleError(null);
    try {
      const result = await cancelSchedule(reel.id);
      setScheduleLoading(false);

      // Refresh reel and schedule data
      const updatedReel = await getReel(reel.id);
      setReel(updatedReel);
    } catch (err) {
      setScheduleLoading(false);
      if (err.response && err.response.data) {
        setScheduleError(err.response.data.detail || 'Failed to cancel schedule');
      } else {
        setScheduleError('Failed to cancel schedule. Please try again.');
      }
      console.error('Cancel schedule error:', err);
    }
  };

  const handleRetryPublish = async () => {
    if (!reel || !reel.id) return;

    setRetryLoading(true);
    setRetryError(null);
    try {
      const result = await retryPublish(reel.id);
      setRetryLoading(false);
      // Start status polling to track the retry process
      setStatusPolling(true);
      // Refresh reel status to see the update
      const updatedReel = await getReel(reel.id);
      setReel(updatedReel);
    } catch (err) {
      setRetryLoading(false);
      if (err.response && err.response.data) {
        setRetryError(err.response.data.detail || 'Failed to retry publish');
      } else {
        setRetryError('Failed to retry publish. Please try again.');
      }
      console.error('Retry publish error:', err);
    }
  };

  const handleRefreshAnalytics = async () => {
    if (!reel || !reel.id) return;

    setRefreshing(true);
    setRefreshAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      // Trigger the refresh endpoint
      await refreshAnalytics(reel.id);
      // The refresh effect will handle updating the data when the job completes
    } catch (err) {
      setRefreshing(false);
      setRefreshAnalyticsLoading(false);
      setAnalyticsError('Failed to refresh analytics. Please try again.');
      console.error('Refresh analytics error:', err);
    }
  };

  const stopPolling = () => {
    setPolling(false);
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }
    // Reset jobId when stopping polling
    setJobId(null);
  };

  // Handle step navigation
  const goToNextStep = () => {
    const steps = ['content', 'configure', 'script', 'review', 'render', 'ready'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const goToPreviousStep = () => {
    const steps = ['content', 'configure', 'script', 'review', 'render', 'ready'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value,
    }));
    // Also update the reel state if we have one (for immediate feedback)
    if (reel) {
      setReel(prev => ({ ...prev, [field]: value }));
    }
  };

  // Handle step 1: Content submission
  const handleContentSubmit = async (e) => {
    e.preventDefault();
    if (!formValues.title.trim()) {
      setApiError('Please enter a title for your reel');
      return;
    }
    // Validate URL if provided
    if (formValues.url) {
      try {
        new URL(formValues.url);
      } catch (err) {
        setApiError('Please enter a valid URL');
        return;
      }
    }

    setApiError(null);
    try {
      const reelData = {
        source: "User Input",
        title: formValues.title.trim(),
        url: formValues.url.trim() || `https://user-input-${Date.now()}`,
        summary: formValues.vision.trim() || formValues.title.trim(),
        hook: formValues.hook,
        duration: formValues.duration,
        tone: formValues.tone,
        visual_style: formValues.visualStyle,
        voice: formValues.voice,
        captions: formValues.captions,
        cta: formValues.cta,
      };
      const createdReel = await createReel(reelData);
      setReel(createdReel);
      goToNextStep(); // Move to configure
    } catch (err) {
      setApiError('Failed to create reel. Please try again.');
    }
  };

  // Handle step 2: Configure submission
  const handleConfigureSubmit = async (e) => {
    e.preventDefault();
    if (!reel || !reel.id) return;

    try {
      const updatedReel = await updateReel(reel.id, {
        hook: formValues.hook,
        duration: formValues.duration,
        tone: formValues.tone,
        visual_style: formValues.visualStyle,
        voice: formValues.voice,
        captions: formValues.captions,
        cta: formValues.cta,
      });
      setReel(updatedReel);
      goToNextStep(); // Move to script
    } catch (err) {
      setApiError('Failed to save configuration. Please try again.');
    }
  };

  // Handle step 3: Script submission
  const handleScriptSubmit = async (e) => {
    e.preventDefault();
    if (!reel || !reel.id) return;

    try {
      const updatedReel = await updateReel(reel.id, {
        script: formValues.script,
      });
      setReel(updatedReel);
      goToNextStep(); // Move to review
    } catch (err) {
      setApiError('Failed to update script. Please try again.');
    }
  };

  // Handle step 5: Render (trigger pipeline)
  const handleRenderSubmit = async () => {
    if (!reel || !reel.id) return;
    setApiError(null);
    try {
      const job = await createRenderJob(reel.id);
      setJobId(job.id);
      // Start polling for job completion
      setPolling(true);
    } catch (err) {
      setApiError('Failed to trigger pipeline. Please try again.');
      stopPolling();
    }
  };

  if (apiLoading && !reel) {
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

  if (apiError) {
    return (
      <motion.div
        {...motionProps(reducedMotion, {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.5 }
        })}
      >
        <motion.p style={{ color: '#ff6b6b' }}>{apiError}</motion.p>
        <motion.button
          onClick={() => setApiError(null)}
          {...motionProps(reducedMotion, {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.5, delay: 0.2 }
          })}
        >
          Close
        </motion.button>
      </motion.div>
    );
  }

  // Step renderers
  const renderContent = () => (
    <motion.form
      onSubmit={handleContentSubmit}
      className="create-reel-form"
      {...motionProps(reducedMotion, {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, delay: 0.6 }
      })}
    >
      <motion.h2
        {...motionProps(reducedMotion, {
          initial: { opacity: 0, x: -50 },
          animate: { opacity: 1, x: 0 },
          transition: { duration: 0.8, delay: 0.2 }
        })}
      >
        Step 1: Content
      </motion.h2>
      <motion.p
        {...motionProps(reducedMotion, {
          initial: { opacity: 0, x: 50 },
          animate: { opacity: 1, x: 0 },
          transition: { duration: 0.8, delay: 0.4 }
        })}
      >
        Define what your reel will be about.
      </motion.p>

      <div style={{ marginBottom: '24px' }}>
        <label htmlFor="title" className="block mb-2 font-medium">Title (required)</label>
        <input
          type="text"
          id="title"
          value={formValues.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter a title for your reel"
          required
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label htmlFor="vision" className="block mb-2 font-medium">Vision (optional)</label>
        <textarea
          id="vision"
          value={formValues.vision}
          onChange={(e) => handleInputChange('vision', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Describe your vision for the reel"
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label htmlFor="url" className="block mb-2 font-medium">Source URL (optional)</label>
        <input
          type="text"
          id="url"
          value={formValues.url}
          onChange={(e) => handleInputChange('url', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://example.com/article"
        />
        {formValues.url && (
          <p className="text-xs text-muted mt-1">
            We'll use this URL as the source for your reel.
          </p>
        )}
      </div>

      <motion.button
        type="submit"
        disabled={apiLoading}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        {...motionProps(reducedMotion, {
          initial: { opacity: 0, y: 0 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5 }
        })}
      >
        {apiLoading ? 'Creating...' : 'Continue to Configure'}
      </motion.button>
    </motion.form>
  );

  const renderConfigure = () => (
    <motion.div
      {...motionProps(reducedMotion, {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, delay: 0.6 }
      })}
    >
      <motion.h2
        {...motionProps(reducedMotion, {
          initial: { opacity: 0, x: -50 },
          animate: { opacity: 1, x: 0 },
          transition: { duration: 0.8, delay: 0.2 }
        })}
      >
        Step 2: Configure
      </motion.h2>
      <motion.p
        {...motionProps(reducedMotion, {
          initial: { opacity: 0, x: 50 },
          animate: { opacity: 1, x: 0 },
          transition: { duration: 0.8, delay: 0.4 }
        })}
      >
        Configure the properties of your reel.
      </motion.p>

      {reel && (
        <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius)' }}>
          <p className="font-medium mb-2">Current Reel:</p>
          <p><strong>Title:</strong> {reel.title}</p>
          <p><strong>Source:</strong> {reel.source}</p>
          <p><strong>Status:</strong> {reel.status}</p>
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <label htmlFor="hook" className="block mb-2 font-medium">Hook</label>
        <input
          type="text"
          id="hook"
          value={formValues.hook}
          onChange={(e) => handleInputChange('hook', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter hook text (e.g., 'You won't believe...')"
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label htmlFor="duration" className="block mb-2 font-medium">Duration (seconds)</label>
        <input
          type="number"
          id="duration"
          value={formValues.duration}
          onChange={(e) => handleInputChange('duration', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          min="5"
          max="60"
        />
      </div>

      <div className="grid grid-cols-2 gap-4" style={{ marginBottom: '24px' }}>
        <div>
          <label htmlFor="tone" className="block mb-2 font-medium">Tone</label>
          <select
            id="tone"
            value={formValues.tone}
            onChange={(e) => handleInputChange('tone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="informative">Informative</option>
            <option value="exciting">Exciting</option>
            <option value="calm">Calm</option>
            <option value="urgent">Urgent</option>
            <option value="humorous">Humorous</option>
          </select>
        </div>

        <div>
          <label htmlFor="visualStyle" className="block mb-2 font-medium">Visual Style</label>
          <select
            id="visualStyle"
            value={formValues.visualStyle}
            onChange={(e) => handleInputChange('visualStyle', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="modern">Modern</option>
            <option value="cinematic">Cinematic</option>
            <option value="minimal">Minimal</option>
            <option value="vibrant">Vibrant</option>
            <option value="classic">Classic</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4" style={{ marginBottom: '24px' }}>
        <div>
          <label htmlFor="voice" className="block mb-2 font-medium">Voice</label>
          <select
            id="voice"
            value={formValues.voice}
            onChange={(e) => handleInputChange('voice', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="neutral">Neutral</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="energetic">Energetic</option>
            <option value="calm">Calm</option>
          </select>
        </div>

        <div>
          <label htmlFor="captions" className="block mb-2 font-medium">Captions</label>
          <select
            id="captions"
            value={formValues.captions}
            onChange={(e) => handleInputChange('captions', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="none">None</option>
            <option value="auto">Auto-generated</option>
            <option value="manual">Manual</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label htmlFor="cta" className="block mb-2 font-medium">Call to Action</label>
        <input
          type="text"
          id="cta"
          value={formValues.cta}
          onChange={(e) => handleInputChange('cta', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter CTA text (e.g., 'Subscribe for more')"
        />
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <motion.button
          onClick={goToPreviousStep}
          variant="secondary"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={reducedMotion ? false : { opacity: 1, y: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.2 }}
        >
          Back
        </motion.button>
        <motion.button
          onClick={handleConfigureSubmit}
          disabled={apiLoading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {apiLoading ? 'Saving...' : 'Continue to Script'}
        </motion.button>
      </div>
    </motion.div>
  );

  const renderScript = () => (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      animate={reducedMotion ? false : { opacity: 1, y: 0 }}
      transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.6 }}
    >
      <motion.h2
        initial={reducedMotion ? false : { opacity: 0, x: -50 }}
        animate={reducedMotion ? false : { opacity: 1, x: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.8, delay: 0.2 }}
      >
        Step 3: Script
      </motion.h2>
      <motion.p
        initial={reducedMotion ? false : { opacity: 0, x: 50 }}
        animate={reducedMotion ? false : { opacity: 1, x: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.8, delay: 0.4 }}
      >
        Review and edit the script for your reel.
      </motion.p>

      {reel && (
        <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius)' }}>
          <p className="font-medium mb-2">Current Reel:</p>
          <p><strong>Title:</strong> {reel.title}</p>
          <p><strong>Status:</strong> {reel.status}</p>
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <label htmlFor="script" className="block mb-2 font-medium">Script</label>
        <textarea
          id="script"
          value={formValues.script}
          onChange={(e) => handleInputChange('script', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={8}
          placeholder="Enter the script for your reel..."
        />
        <p className="text-xs text-muted mt-1">
          The script will be used for voiceover generation.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <motion.button
          onClick={goToPreviousStep}
          variant="secondary"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={reducedMotion ? false : { opacity: 1, y: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.2 }}
        >
          Back
        </motion.button>
        <motion.button
          onClick={handleScriptSubmit}
          disabled={apiLoading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {apiLoading ? 'Saving...' : 'Continue to Review'}
        </motion.button>
      </div>
    </motion.div>
  );

  const renderReview = () => (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      animate={reducedMotion ? false : { opacity: 1, y: 0 }}
      transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.6 }}
    >
      <motion.h2
        initial={reducedMotion ? false : { opacity: 0, x: -50 }}
        animate={reducedMotion ? false : { opacity: 1, x: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.8, delay: 0.2 }}
      >
        Step 4: Review
      </motion.h2>
      <motion.p
        initial={reducedMotion ? false : { opacity: 0, x: 50 }}
        animate={reducedMotion ? false : { opacity: 1, x: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.8, delay: 0.4 }}
      >
        Review your reel before rendering.
      </motion.p>

      {reel && (
        <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius)' }}>
          <p className="font-medium mb-2">Current Reel:</p>
          <p><strong>Title:</strong> {reel.title}</p>
          <p><strong>Source:</strong> {reel.source}</p>
          <p><strong>Status:</strong> {reel.status}</p>
          <p><strong>Created:</strong> {new Date(reel.created_at).toLocaleString()}</p>
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <h3 className="font-medium mb-2">Configuration</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p><strong>Hook:</strong> {formValues.hook || 'Not set'}</p>
            <p><strong>Duration:</strong> {formValues.duration} seconds</p>
            <p><strong>Tone:</strong> {formValues.tone}</p>
          </div>
          <div>
            <p><strong>Visual Style:</strong> {formValues.visualStyle}</p>
            <p><strong>Voice:</strong> {formValues.voice}</p>
            <p><strong>Captions:</strong> {formValues.captions}</p>
            <p><strong>CTA:</strong> {formValues.cta || 'Not set'}</p>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h3 className="font-medium mb-2">Script</h3>
        <p>{formValues.script || 'No script provided'}</p>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <motion.button
          onClick={goToPreviousStep}
          variant="secondary"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={reducedMotion ? false : { opacity: 1, y: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.2 }}
        >
          Back
        </motion.button>
        <motion.button
          onClick={goToNextStep}
          disabled={apiLoading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {apiLoading ? 'Preparing...' : 'Continue to Render'}
        </motion.button>
      </div>
    </motion.div>
  );

  const renderRender = () => (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      animate={reducedMotion ? false : { opacity: 1, y: 0 }}
      transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.6 }}
    >
      <motion.h2
        initial={reducedMotion ? false : { opacity: 0, x: -50 }}
        animate={reducedMotion ? false : { opacity: 1, x: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.8, delay: 0.2 }}
      >
        Step 5: Render
      </motion.h2>
      <motion.p
        initial={reducedMotion ? false : { opacity: 0, x: 50 }}
        animate={reducedMotion ? false : { opacity: 1, x: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.8, delay: 0.4 }}
      >
        Trigger the rendering pipeline to process your reel.
      </motion.p>

      {reel && (
        <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius)' }}>
          <p className="font-medium mb-2">Current Reel:</p>
          <p><strong>Title:</strong> {reel.title}</p>
          <p><strong>Source:</strong> {reel.source}</p>
          <p><strong>Status:</strong> {reel.status}</p>
          {reel.status === 'READY_TO_PUBLISH' && (
            <p style={{ color: '#4ecdc4' }}>✓ Ready to publish!</p>
          )}
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <h3 className="font-medium mb-2">Important Note</h3>
        <p>
          Rendering is now handled as a per-reel job, providing dedicated tracking
          and status updates for your specific reel.
        </p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h3 className="font-medium mb-2">Job Status</h3>
        {jobId ? (
          <>
            <p><strong>Job ID:</strong> {jobId}</p>
            <p><strong>Status:</strong>
              {polling && (
                <>
                  <span className="animate-pulse">⏳ </span>
                  {step === 'render' ? 'Processing...' : 'Checking...'}
                </>
              )}
              {!polling && step === 'render' && (
                <span>Idle - ready to render</span>
              )}
            </p>
          </>
        ) : (
          <p><strong>Job Status:</strong> No active job</p>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <motion.button
          onClick={goToPreviousStep}
          variant="secondary"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={reducedMotion ? false : { opacity: 1, y: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.2 }}
        >
          Back
        </motion.button>
        <motion.button
          onClick={handleRenderSubmit}
          disabled={apiLoading || polling}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {apiLoading ? 'Triggering...' : polling ? 'Checking...' : 'Trigger Pipeline'}
        </motion.button>
      </div>
    </motion.div>
  );

  const renderReady = () => (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      animate={reducedMotion ? false : { opacity: 1, y: 0 }}
      transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.6 }}
    >
      <motion.h2
        initial={reducedMotion ? false : { opacity: 0, x: -50 }}
        animate={reducedMotion ? false : { opacity: 1, x: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.8, delay: 0.2 }}
      >
        Step 6: Ready
      </motion.h2>
      <motion.p
        initial={reducedMotion ? false : { opacity: 0, x: 50 }}
        animate={reducedMotion ? false : { opacity: 1, x: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.8, delay: 0.4 }}
      >
        Your reel is ready to publish!
      </motion.p>

      {reel && (
        <>
          {/* Video Preview and Info */}
          <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius)' }}>
            <p className="font-medium mb-2">Current Reel:</p>
            <p><strong>Title:</strong> {reel.title}</p>
            <p><strong>Source:</strong> {reel.source}</p>
            <p><strong>Status:</strong> <span style={{ color: getStatusColor(reel.status) }}>{reel.status}</span></p>
            <p><strong>QA Score:</strong> {reel.qa_score ?? 'N/A'}</p>
            {reel.video_path && (
              <div style={{ marginTop: '12px' }}>
                <p><strong>Video Preview:</strong></p>
                <video
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  style={{ maxWidth: '100%', borderRadius: 'var(--radius)' }}
                  src={`http://localhost:8000/video/${reel.id}`}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
          </div>

          {/* Publishing Operations */}
          <div style={{ marginBottom: '24px' }}>
            {renderPublishingOperations()}
          </div>

          {/* Publication History */}
          <div style={{ marginBottom: '24px' }}>
            <h3 className="font-medium mb-2">Publication History</h3>
            {renderPublicationHistory()}
          </div>

          {/* Analytics Section */}
          {reel.status === "PUBLISHED" && (
            <div style={{ marginBottom: "24px" }}>
              <h3 className="font-medium mb-2">Instagram Analytics & Performance</h3>
              {analyticsLoading && !analyticsData && (
                <div style={{ textAlign: "center", padding: "24px" }}>
                  <p className="animate-pulse">Loading analytics...</p>
                </div>
              )}
              {analyticsError && !analyticsData && (
                <p style={{ color: "#ff6b6b" }}>{analyticsError}</p>
              )}
              {!analyticsLoading && analyticsData && (
                <>
                  {/* Data Freshness */}
                  <div style={{ marginBottom: "16px", padding: "12px", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius)" }}>
                    <p className="font-medium mb-2">Data Freshness</p>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                      <span>Last updated: {lastUpdateTimestamp ? new Date(lastUpdateTimestamp).toLocaleString() : "Never"}</span>
                      <span>Snapshot time: {snapshotTimestamp ? new Date(snapshotTimestamp).toLocaleString() : "Not available"}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span className="animate-pulse" style={{ visibility: refreshing ? 'visible' : 'hidden' }}>{refreshing}</span>
                        <span>{refreshing ? "Refreshing..." : "Data current"}</span>
                      </span>
                    </div>
                  </div>

                  {/* Performance Summary */}
                  <div style={{ marginBottom: "24px" }}>
                    <h3 className="font-medium mb-2">Performance Summary</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "12px" }}>
                      <div style={{ textAlign: "center", padding: "12px", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius)" }}>
                        <p className="text-sm text-muted mb-1">Views</p>
                        <p className="font-bold text-lg">{analyticsData.metrics?.views?.toLocaleString() || "0"}</p>
                      </div>
                      <div style={{ textAlign: "center", padding: "12px", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius)" }}>
                        <p className="text-sm text-muted mb-1">Reach</p>
                        <p className="font-bold text-lg">{analyticsData.metrics?.reach?.toLocaleString() || "0"}</p>
                      </div>
                      <div style={{ textAlign: "center", padding: "12px", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius)" }}>
                        <p className="text-sm text-muted mb-1">Likes</p>
                        <p className="font-bold text-lg">{analyticsData.metrics?.likes?.toLocaleString() || "0"}</p>
                      </div>
                      <div style={{ textAlign: "center", padding: "12px", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius)" }}>
                        <p className="text-sm text-muted mb-1">Comments</p>
                        <p className="font-bold text-lg">{analyticsData.metrics?.comments?.toLocaleString() || "0"}</p>
                      </div>
                      <div style={{ textAlign: "center", padding: "12px", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius)" }}>
                        <p className="text-sm text-muted mb-1">Saves</p>
                        <p className="font-bold text-lg">{analyticsData.metrics?.saved?.toLocaleString() || "0"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Derived Metrics */}
                  <div style={{ marginBottom: "24px" }}>
                    <h3 className="font-medium mb-2">Engagement</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "12px" }}>
                      <div style={{ textAlign: "center", padding: "12px", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius)" }}>
                        <p className="text-sm text-muted mb-1">Engagement Rate</p>
                        <p className="font-bold text-lg">
                          {analyticsData.metrics?.views && analyticsData.metrics?.views > 0
                            ? (((analyticsData.metrics?.likes || 0) + (analyticsData.metrics?.comments || 0) + (analyticsData.metrics?.shares || 0) + (analyticsData.metrics?.saved || 0)) / (analyticsData.metrics?.views || 1) * 100).toFixed(2) + "%"
                            : "N/A"}
                        </p>
                        <p className="text-xs text-muted">Application-derived</p>
                      </div>
                      <div style={{ textAlign: "center", padding: "12px", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius)" }}>
                        <p className="text-sm text-muted mb-1">Likes / 1K Views</p>
                        <p className="font-bold text-lg">
                          {analyticsData.metrics?.views && analyticsData.metrics?.views > 0
                            ? ((analyticsData.metrics?.likes || 0) / (analyticsData.metrics?.views || 1) * 1000).toFixed(2)
                            : "N/A"}
                        </p>
                        <p className="text-xs text-muted">Application-derived</p>
                      </div>
                      <div style={{ textAlign: "center", padding: "12px", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius)" }}>
                        <p className="text-sm text-muted mb-1">Comments / 1K Views</p>
                        <p className="font-bold text-lg">
                          {analyticsData.metrics?.views && analyticsData.metrics?.views > 0
                            ? ((analyticsData.metrics?.comments || 0) / (analyticsData.metrics?.views || 1) * 1000).toFixed(2)
                            : "N/A"}
                        </p>
                        <p className="text-xs text-muted">Application-derived</p>
                      </div>
                      <div style={{ textAlign: "center", padding: "12px", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius)" }}>
                        <p className="text-sm text-muted mb-1">Shares / 1K Views</p>
                        <p className="font-bold text-lg">
                          {analyticsData.metrics?.views && analyticsData.metrics?.views > 0
                            ? ((analyticsData.metrics?.shares || 0) / (analyticsData.metrics?.views || 1) * 1000).toFixed(2)
                            : "N/A"}
                        </p>
                        <p className="text-xs text-muted">Application-derived</p>
                      </div>
                      <div style={{ textAlign: "center", padding: "12px", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius)" }}>
                        <p className="text-sm text-muted mb-1">Saves / 1K Views</p>
                        <p className="font-bold text-lg">
                          {analyticsData.metrics?.views && analyticsData.metrics?.views > 0
                            ? ((analyticsData.metrics?.saved || 0) / (analyticsData.metrics?.views || 1) * 1000).toFixed(2)
                            : "N/A"}
                        </p>
                        <p className="text-xs text-muted">Application-derived</p>
                      </div>
                    </div>
                  </div>

                  {/* Analytics History */}
                  {analyticsHistory.length > 0 && (
                    <div style={{ marginBottom: "24px" }}>
                      <h3 className="font-medium mb-2">Analytics History</h3>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: "left", padding: "8px", borderBottom: "2px solid var(--glass-border)" }}>Date</th>
                              <th style={{ textAlign: "left", padding: "8px", borderBottom: "2px solid var(--glass-border)" }}>Views</th>
                              <th style={{ textAlign: "left", padding: "8px", borderBottom: "2px solid var(--glass-border)" }}>Likes</th>
                              <th style={{ textAlign: "left", padding: "8px", borderBottom: "2px solid var(--glass-border)" }}>Comments</th>
                              <th style={{ textAlign: "left", padding: "8px", borderBottom: "2px solid var(--glass-border)" }}>Shares</th>
                              <th style={{ textAlign: "left", padding: "8px", borderBottom: "2px solid var(--glass-border)" }}>Saves</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analyticsHistory.map((entry) => (
                              <tr key={entry.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                                <td style={{ padding: "8px" }}>
                                  {new Date(entry.metric_timestamp).toLocaleString()}
                                </td>
                                <td style={{ padding: "8px" }}>
                                  {entry.metrics?.views?.toLocaleString() || "0"}
                                </td>
                                <td style={{ padding: "8px" }}>
                                  {entry.metrics?.likes?.toLocaleString() || "0"}
                                </td>
                                <td style={{ padding: "8px" }}>
                                  {entry.metrics?.comments?.toLocaleString() || "0"}
                                </td>
                                <td style={{ padding: "8px" }}>
                                  {entry.metrics?.shares?.toLocaleString() || "0"}
                                </td>
                                <td style={{ padding: "8px" }}>
                                  {entry.metrics?.saved?.toLocaleString() || "0"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Refresh Analytics Button and Charts */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                      <button
                        onClick={handleRefreshAnalytics}
                        disabled={refreshAnalyticsLoading}
                        style={{
                          padding: "8px 16px",
                          background: "var(--primary-color)",
                          color: "white",
                          border: "none",
                          borderRadius: "var(--radius)",
                          cursor: refreshAnalyticsLoading ? "not-allowed" : "pointer",
                          opacity: refreshAnalyticsLoading ? 0.7 : 1
                        }}
                      >
                        {refreshAnalyticsLoading ? "Refreshing..." : "Refresh Insights"}
                      </button>
                      <span style={{ fontSize: "0.875rem", color: "#666" }}>
                        Last refreshed: {lastUpdateTimestamp ? new Date(lastUpdateTimestamp).toLocaleString() : "Never"}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                      <div>
                        <h4 className="font-medium mb-2">Views Over Time</h4>
                        <canvas ref={viewsChartRef} height="80" />
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Engagement Rate</h4>
                        <canvas ref={engagementChartRef} height="80" />
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Interactions</h4>
                        <canvas ref={interactionChartRef} height="80" />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <motion.button
              onClick={() => navigate('/discover')}
              variant="secondary"
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              animate={reducedMotion ? false : { opacity: 1, y: 0 }}
              transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.2 }}
            >
              Browse Discover
            </motion.button>
            <motion.button
              onClick={() => navigate('/create')}
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              animate={reducedMotion ? false : { opacity: 1, y: 0 }}
              transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.4 }}
            >
              Create Another Reel
            </motion.button>
          </div>
        </>
      )}
    </motion.div>
  );

  // Helper functions

  // Chart update functions
  const updateViewsChart = (canvas, history) => {
    if (!canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const labels = history.map(h => new Date(h.metric_timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
    const data = history.map(h => h.metrics?.views || 0);
    
    if (labels.length === 0) return;
    
    // Simple line chart
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - (data[0] / Math.max(...data) * (canvas.height - 20) + 10));
    labels.forEach((label, i) => {
      const x = (i / (labels.length - 1)) * (canvas.width - 20) + 10;
      const y = canvas.height - (data[i] / Math.max(...data) * (canvas.height - 20) + 10);
      ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw points
    labels.forEach((label, i) => {
      const x = (i / (labels.length - 1)) * (canvas.width - 20) + 10;
      const y = canvas.height - (data[i] / Math.max(...data) * (canvas.height - 20) + 10);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
    });
  };

  const updateEngagementChart = (canvas, history) => {
    if (!canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const labels = history.map(h => new Date(h.metric_timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
    const data = history.map(h => {
      const views = h.metrics?.views || 0;
      const engagements = (h.metrics?.likes || 0) + (h.metrics?.comments || 0) + (h.metrics?.shares || 0) + (h.metrics?.saved || 0);
      return views > 0 ? (engagements / views * 100) : 0;
    });
    
    if (labels.length === 0) return;
    
    // Simple line chart
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - (data[0] / Math.max(...data) * (canvas.height - 20) + 10));
    labels.forEach((label, i) => {
      const x = (i / (labels.length - 1)) * (canvas.width - 20) + 10;
      const y = canvas.height - (data[i] / Math.max(...data) * (canvas.height - 20) + 10);
      ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw points
    labels.forEach((label, i) => {
      const x = (i / (labels.length - 1)) * (canvas.width - 20) + 10;
      const y = canvas.height - (data[i] / Math.max(...data) * (canvas.height - 20) + 10);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#10b981';
      ctx.fill();
    });
  };

  const updateInteractionChart = (canvas, history) => {
    if (!canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const labels = history.map(h => new Date(h.metric_timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
    const likesData = history.map(h => h.metrics?.likes || 0);
    const commentsData = history.map(h => h.metrics?.comments || 0);
    const sharesData = history.map(h => h.metrics?.shares || 0);
    const savesData = history.map(h => h.metrics?.saved || 0);
    
    if (labels.length === 0) return;
    
    // Bar chart
    const barWidth = (canvas.width - 40) / (labels.length * 4 + 1);
    labels.forEach((label, i) => {
      const x = 20 + i * (barWidth * 4) + barWidth;
      
      // Likes
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x, canvas.height - 20 - (likesData[i] / Math.max(...likesData) * (canvas.height - 40) + 10), barWidth, likesData[i] / Math.max(...likesData) * (canvas.height - 40));
      
      // Comments
      ctx.fillStyle = '#f97316';
      ctx.fillRect(x + barWidth, canvas.height - 20 - (commentsData[i] / Math.max(...commentsData) * (canvas.height - 40) + 10), barWidth, commentsData[i] / Math.max(...commentsData) * (canvas.height - 40));
      
      // Shares
      ctx.fillStyle = '#eab308';
      ctx.fillRect(x + barWidth * 2, canvas.height - 20 - (sharesData[i] / Math.max(...sharesData) * (canvas.height - 40) + 10), barWidth, sharesData[i] / Math.max(...sharesData) * (canvas.height - 40));
      
      // Saves
      ctx.fillStyle = '#8b5cf6';
      ctx.fillRect(x + barWidth * 3, canvas.height - 20 - (savesData[i] / Math.max(...savesData) * (canvas.height - 40) + 10), barWidth, savesData[i] / Math.max(...savesData) * (canvas.height - 40));
    });
    
    // Legend
    ctx.font = '10px system-ui';
    ctx.fillStyle = '#6b7280';
    ctx.fillText('Likes', 10, 20);
    ctx.fillText('Comments', 10, 35);
    ctx.fillText('Shares', 10, 50);
    ctx.fillText('Saves', 10, 65);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'READY_TO_PUBLISH':
        return '#4ecdc4';
      case 'SCHEDULED':
        return '#ffe66d';
      case 'QUEUED':
      case 'PROCESSING':
        return '#ff6b6b';
      case 'FAILED':
        return '#ff6b6b';
      case 'PUBLISHED':
        return '#95e1d3';
      default:
        return '#666';
    }
  };

  const renderPublishingOperations = () => {
    if (!reel) return null;

    // Handle different reel statuses
    switch (reel.status) {
      case 'READY_TO_PUBLISH':
        return (
          <>
            <div style={{ marginBottom: '16px' }}>
              <h3 className="font-medium mb-2">Publishing Options</h3>
              <p className="text-sm text-muted mb-4">
                Choose how you want to publish your reel
              </p>

              <div style={{ display: 'flex', gap: '12px' }}>
                <motion.button
                  onClick={handlePublishNow}
                  disabled={publishLoading || statusPolling}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {publishLoading ? 'Publishing...' : 'Publish Now'}
                </motion.button>

                <motion.button
                  onClick={() => setScheduling(true)}
                  disabled={scheduleLoading || statusPolling}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Schedule
                </motion.button>
              </div>
            </div>

            {/* Scheduling Form */}
            {scheduling && (
              <div style={{ marginTop: '16px', padding: '16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius)' }}>
                <h3 className="font-medium mb-3">Schedule Publish</h3>
                {scheduleFormError && (
                  <p style={{ color: '#ff6b6b' }} className="mb-3">{scheduleFormError}</p>
                )}

                <div className="grid grid-cols-2 gap-4" style={{ marginBottom: '16px' }}>
                  <div>
                    <label htmlFor="schedule-date" className="block mb-2 font-medium">Date</label>
                    <input
                      type="date"
                      id="schedule-date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label htmlFor="schedule-time" className="block mb-2 font-medium">Time</label>
                    <input
                      type="time"
                      id="schedule-time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4" style={{ marginBottom: '16px' }}>
                  <div>
                    <label htmlFor="schedule-timezone" className="block mb-2 font-medium">Timezone</label>
                    <select
                      id="schedule-timezone"
                      value={scheduleTimezone}
                      onChange={(e) => setScheduleTimezone(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select timezone</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="America/Chicago">America/Chicago (CST)</option>
                      <option value="America/Denver">America/Denver (MST)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                      <option value="Europe/Paris">Europe/Paris (CET)</option>
                      <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                      <option value="Asia/Shanghai">Asia/Shanghai (CST)</option>
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                    </select>
                  </div>
                </div>

                {scheduleLoading && (
                  <div style={{ textAlign: 'center', padding: '12px' }}>
                    <p className="animate-pulse">Scheduling...</p>
                  </div>
                )}

                {!scheduleLoading && (
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <motion.button
                      onClick={() => {
                        setScheduling(false);
                        setScheduleDate('');
                        setScheduleTime('');
                        setScheduleTimezone('');
                      }}
                      variant="secondary"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        if (scheduleDate && scheduleTime && scheduleTimezone) {
                          handleSchedulePublish(scheduleDate, scheduleTime, scheduleTimezone);
                        }
                      }}
                      disabled={!scheduleDate || !scheduleTime || !scheduleTimezone}
                    >
                      Schedule Publish
                    </motion.button>
                  </div>
                )}

                {scheduleError && (
                  <p style={{ color: '#ff6b6b' }} className="mt-3">{scheduleError}</p>
                )}
              </div>
            )}
          </>
        );

      case 'SCHEDULED':
        return (
          <>
            <div style={{ marginBottom: '16px' }}>
              <h3 className="font-medium mb-2">Scheduled Publish</h3>
              {scheduleData && (
                <div style={{ padding: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius)' }}>
                  <p><strong>Status:</strong> <span style={{ color: '#ffe66d' }}>{scheduleData.status}</span></p>
                  <p><strong>Scheduled for:</strong> {new Date(scheduleData.scheduled_at).toLocaleString()}</p>
                  <p><strong>Timezone:</strong> {scheduleData.timezone}</p>
                  {scheduleData.instagram_account_id && (
                    <p><strong>Instagram Account:</strong> {scheduleData.instagram_account_id}</p>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <motion.button
                  onClick={() => setScheduling(true)}
                  disabled={scheduleLoading || statusPolling}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Reschedule
                </motion.button>

                <motion.button
                  onClick={handleCancelSchedule}
                  disabled={scheduleLoading || statusPolling}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Cancel
                </motion.button>
              </div>
            </div>
          </>
        );

      case 'QUEUED':
      case 'PROCESSING':
        return (
          <div style={{ marginBottom: '16px' }}>
            <h3 className="font-medium mb-2">Publishing in Progress</h3>
            <div style={{ padding: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius)' }}>
              <p><strong>Status:</strong> <span style={{ color: '#ff6b6b' }}>{reel.status}</span></p>
              {publishLoading && (
                <p className="animate-pulse">Processing publish request...</p>
              )}

              {!publishLoading && (
                <p>
                  Your reel is currently being published. This may take a few moments.
                  <br />
                  <em>Status updates automatically</em>
                </p>
              )}
            </div>
          </div>
        );

      case 'FAILED':
        return (
          <>
            <div style={{ marginBottom: '16px' }}>
              <h3 className="font-medium mb-2">Publication Failed</h3>
              <div style={{ padding: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius)' }}>
                <p><strong>Status:</strong> <span style={{ color: '#ff6b6b' }}>{reel.status}</span></p>
                {reel.error_message && (
                  <p><strong>Error:</strong> {reel.error_message}</p>
                )}
              </div>

              <div style={{ marginTop: '12px' }}>
                <motion.button
                  onClick={handleRetryPublish}
                  disabled={retryLoading || statusPolling}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {retryLoading ? 'Retrying...' : 'Retry Publish'}
                </motion.button>
              </div>
            </div>

            {retryError && (
              <p style={{ color: '#ff6b6b' }} className="mt-3">{retryError}</p>
            )}
          </>
        );

      case 'PUBLISHED':
        return (
          <div style={{ marginBottom: '16px' }}>
            <h3 className="font-medium mb-2">Publication Status</h3>
            <div style={{ padding: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius)' }}>
              <p><strong>Status:</strong> <span style={{ color: '#95e1d3' }}>{reel.status}</span></p>
              {reel.published_at && (
                <p><strong>Published at:</strong> {new Date(reel.published_at).toLocaleString()}</p>
              )}
              {reel.published_media_id && (
                <p><strong>Instagram Media ID:</strong> {reel.published_media_id}</p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderPublicationHistory = () => {
    if (historyLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <p className="animate-pulse">Loading publication history...</p>
        </div>
      );
    }

    if (historyError) {
      return (
        <p style={{ color: '#ff6b6b' }}>{historyError}</p>
      );
    }

    if (!publicationHistory || publicationHistory.length === 0) {
      return (
        <p className="text-muted">No publication history available for this reel.</p>
      );
    }

    return (
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {publicationHistory.map((pub, index) => (
          <div key={index} style={{ marginBottom: '12px', padding: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="font-medium">{getStatusColor(pub.status)}</span>
              <span className="text-xs text-muted">{new Date(pub.created_at).toLocaleString()}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <p><strong>Status:</strong> {pub.status}</p>
                {pub.published_at && (
                  <p><strong>Published at:</strong> {new Date(pub.published_at).toLocaleString()}</p>
                )}
                {pub.published_media_id && (
                  <p><strong>Media ID:</strong> {pub.published_media_id}</p>
                )}
                {pub.retry_count && pub.retry_count > 0 && (
                  <p><strong>Retry count:</strong> {pub.retry_count}</p>
                )}
              </div>
              {pub.error_message && (
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: '#ff6b6b', fontSize: '0.875rem' }}><strong>Error:</strong> {pub.error_message}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render based on current step
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 30 }}
      animate={reducedMotion ? false : { opacity: 1, y: 0 }}
      transition={reducedMotion ? undefined : { duration: 0.6 }}
      className="create-reel-page"
    >
      {step === 'content' && renderContent()}
      {step === 'configure' && renderConfigure()}
      {step === 'script' && renderScript()}
      {step === 'review' && renderReview()}
      {step === 'render' && renderRender()}
      {step === 'ready' && renderReady()}
    </motion.div>
  );
}