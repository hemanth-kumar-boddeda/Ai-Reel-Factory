import { motion, useReducedMotion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useReelOperations } from '../hooks/useReelOperations';
import { useReel } from '../hooks/useReel';

export default function CreateReel() {
  const reducedMotion = useReducedMotion();
  const navigate = useNavigate();
  const location = useLocation();
  const { createReel, updateReel, getReel, createRenderJob, getJob, triggerRender, loading: apiLoading, error: apiError } = useReelOperations();
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
  }

  if (apiError) {
    return (
      <motion.div
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={reducedMotion ? false : { opacity: 1 }}
        transition={reducedMotion ? undefined : { duration: 0.5 }}
      >
        <motion.p style={{ color: '#ff6b6b' }}>{apiError}</motion.p>
        <motion.button
          onClick={() => setApiError(null)}
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={reducedMotion ? false : { opacity: 1, y: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.2 }}
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
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      animate={reducedMotion ? false : { opacity: 1, y: 0 }}
      transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.6 }}
    >
      <motion.h2
        initial={reducedMotion ? false : { opacity: 0, x: -50 }}
        animate={reducedMotion ? false : { opacity: 1, x: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.8, delay: 0.2 }}
      >
        Step 1: Content
      </motion.h2>
      <motion.p
        initial={reducedMotion ? false : { opacity: 0, x: 50 }}
        animate={reducedMotion ? false : { opacity: 1, x: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.8, delay: 0.4 }}
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
      >
        {apiLoading ? 'Creating...' : 'Continue to Configure'}
      </motion.button>
    </motion.form>
  );

  const renderConfigure = () => (
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
        Step 2: Configure
      </motion.h2>
      <motion.p
        initial={reducedMotion ? false : { opacity: 0, x: 50 }}
        animate={reducedMotion ? false : { opacity: 1, x: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.8, delay: 0.4 }}
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
          <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius)' }}>
            <p className="font-medium mb-2">Current Reel:</p>
            <p><strong>Title:</strong> {reel.title}</p>
            <p><strong>Source:</strong> {reel.source}</p>
            <p><strong>Status:</strong> <span style={{ color: '#4ecdc4' }}>{reel.status}</span></p>
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

          <div style={{ marginBottom: '24px' }}>
            <h3 className="font-medium mb-2">Next Steps</h3>
            <p>
              Your reel has successfully completed the pipeline and is ready for
              publication. You can now:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Download the video for sharing</li>
              <li>Share directly to social media platforms</li>
              <li>Use in your marketing campaigns</li>
            </ul>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <motion.a
              href={`http://localhost:8000/video/${reel.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              animate={reducedMotion ? false : { opacity: 1, y: 0 }}
              transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.2 }}
            >
              Download Video
            </motion.a>
            <motion.button
              onClick={() => navigate('/editor/' + reel.id)}
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              animate={reducedMotion ? false : { opacity: 1, y: 0 }}
              transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.4 }}
            >
              Edit in Editor
            </motion.button>
          </div>
        </>
      )}

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
    </motion.div>
  );

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