import { motion, useReducedMotion } from 'framer-motion';
import api from '../utils/api';
import AuthenticatedVideo from '../components/reel/AuthenticatedVideo';
import { useParams } from 'react-router-dom';
import { useReel } from '../hooks/useReel';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Card from '../components/shared/Card';
import Button from '../components/shared/Button';
import Input from '../components/shared/Input';
import './Editor.css';

export default function Editor() {
  const reducedMotion = useReducedMotion();
  const { reelId } = useParams();
  const { reels: allReels, loading, error } = useReel();

  const [reel, setReel] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderMessage, setRenderMessage] = useState('');

  // Fetch specific reel data when component loads or reelId changes
  useEffect(() => {
    let cancelled = false;
    const fetchReel = async () => {
      if (cancelled) return;
      try {
        const response = await api.get(`/api/reel/${reelId}`);
        const fetchedReel = response.data;

        // Parse research_data to extract UI control values if they exist
        const reelWithControls = { ...fetchedReel };
        if (fetchedReel.research_data) {
          try {
            const researchData = JSON.parse(fetchedReel.research_data);
            if (researchData.uiControls) {
              // Merge UI controls from research_data into the reel object for form display
              Object.assign(reelWithControls, researchData.uiControls);
            }
          } catch (_e) { // eslint-disable-line no-unused-vars
            // If research_data is not JSON, ignore UI control parsing
          }
        }

        if (!cancelled) {
          setReel(reelWithControls);
          // Set video URL if video exists
          if (fetchedReel.video_path) {
            setVideoUrl(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}/video/${fetchedReel.id}`);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching reel:', err);
        }
      }
    };

    if (reelId) {
      fetchReel();
    }
    return () => {
      cancelled = true;
    };
  }, [reelId]);

  // Fallback to useReel hook data if direct fetch fails
  useEffect(() => {
    let cancelled = false;
    if (!reel && allReels.length > 0) {
      const foundReel = allReels.find(r => r.id === parseInt(reelId));
      if (foundReel) {
        const reelWithControls = { ...foundReel };
        if (foundReel.research_data) {
          try {
            const researchData = JSON.parse(foundReel.research_data);
            if (researchData.uiControls) {
              // Merge UI controls from research_data into the reel object for form display
              Object.assign(reelWithControls, researchData.uiControls);
            }
          } catch (_e) { // eslint-disable-line no-unused-vars
            // If research_data is not JSON, ignore UI control parsing
          }
        }
        if (!cancelled) {
          setReel(reelWithControls);
          if (foundReel.video_path) {
            setVideoUrl(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}/video/${foundReel.id}`);
          }
        }
      }
    }
    return () => {
      cancelled = true;
    };
  }, [allReels, reelId, reel]);

  if (loading && !reel) return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={reducedMotion ? false : { opacity: 1 }}
      transition={reducedMotion ? undefined : { duration: 0.5 }}
      className="editor-page"
    >
      <motion.h2
        initial={reducedMotion ? false : { opacity: 0, y: 20 }}
        animate={reducedMotion ? false : { opacity: 1, y: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.5 }}
        className="editor-page-h2"
      >
        Loading...
      </motion.h2>
    </motion.div>
  );

  if (error && !reel) return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={reducedMotion ? false : { opacity: 1 }}
      transition={reducedMotion ? undefined : { duration: 0.5 }}
      className="editor-page"
    >
      <motion.h2
        initial={reducedMotion ? false : { opacity: 0, y: 20 }}
        animate={reducedMotion ? false : { opacity: 1, y: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.5 }}
        className="editor-page-h2"
      >
        Error loading data
      </motion.h2>
      <motion.p
        initial={reducedMotion ? false : { opacity: 0, x: 20 }}
        animate={reducedMotion ? false : { opacity: 1, x: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.2 }}
        className="editor-page-p"
      >
        {error.message || 'An unknown error occurred'}
      </motion.p>
      <motion.button
        initial={reducedMotion ? false : { opacity: 0, y: 20 }}
        animate={reducedMotion ? false : { opacity: 1, y: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.5 }}
        onClick={() => window.location.reload()}
      >
        <span className="btn btn-outline btn-medium">Try again</span>
      </motion.button>
    </motion.div>
  );

  if (!reel) {
    return (
      <motion.div
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={reducedMotion ? false : { opacity: 1 }}
        transition={reducedMotion ? undefined : { duration: 0.5 }}
        className="editor-page"
      >
        <motion.h2
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={reducedMotion ? false : { opacity: 1, y: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.5 }}
          className="editor-page-h2"
        >
          Reel not found
        </motion.h2>
        {allReels.length === 0 ? (
          <motion.p
            initial={reducedMotion ? false : { opacity: 0, x: 20 }}
            animate={reducedMotion ? false : { opacity: 1, x: 0 }}
            transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.2 }}
            className="editor-page-p"
          >
            No reels available yet. Create a reel to edit.
          </motion.p>
        ) : null}
        <motion.button
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={reducedMotion ? false : { opacity: 1, y: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.4 }}
        >
          <a href="/create" className="btn btn-outline btn-medium">
            Create Reel
          </a>
        </motion.button>
      </motion.div>
    );
  }

  const handleSave = async () => {
    if (!reel) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // Prepare update data - store UI control values in research_data as JSON
      const updateData = {};

      // Extract UI control values from reel state
      const uiControls = {
        hook: reel.hook || '',
        duration: reel.duration || 12,
        tone: reel.tone || 'informative',
        visualStyle: reel.visualStyle || 'modern',
        voice: reel.voice || 'neutral',
        captions: reel.captions || 'none',
        cta: reel.cta || ''
      };

      // Merge with existing research_data (if any) or create new
      let mergedResearchData = {};
      if (reel.research_data) {
        try {
          mergedResearchData = JSON.parse(reel.research_data);
        } catch (_e) { // eslint-disable-line no-unused-vars
          // If not JSON, treat as plain text and preserve it
          mergedResearchData = { legacyText: reel.research_data };
        }
      }

      // Add UI controls to research data
      mergedResearchData.uiControls = uiControls;
      updateData.research_data = JSON.stringify(mergedResearchData);

      // Also update script if provided
      if (reel.script !== undefined && reel.script.trim() !== '') {
        updateData.script = reel.script;
      }
      if (reel.captions !== undefined && reel.captions.trim() !== '') {
        updateData.caption_text = reel.captions;
      }

      const response = await api.put(`/api/reel/${reel.id}`, updateData);

      setReel(response.data);
      setSaveSuccess(true);
      setIsSaving(false);

      // Show success message for 2 seconds then hide
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    } catch (err) {
      setIsSaving(false);
      setSaveError('Failed to save changes. Please try again.');
      console.error('Error saving reel:', err);
    }
  };

  const handleRender = async () => {
    if (!reel) return;
    setIsRendering(true);
    setRenderMessage('');
    try {
      const response = await api.post(`/api/reels/${reel.id}/render`);
      setRenderMessage(`Render job ${response.data.id} queued. Track it in Jobs.`);
    } catch (err) {
      setRenderMessage(err?.response?.data?.detail || 'Could not queue the render job.');
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 30 }}
      animate={reducedMotion ? false : { opacity: 1, y: 0 }}
      transition={reducedMotion ? undefined : { duration: 0.6 }}
      className="editor-page"
    >
      <motion.h1
        initial={reducedMotion ? false : { opacity: 0, x: -50 }}
        animate={reducedMotion ? false : { opacity: 1, x: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.8, delay: 0.2 }}
        className="editor-page-h1"
      >
        Reel Editor
      </motion.h1>

      {saveError && (
        <Card elevated className="editor-alert editor-alert-error">
          <motion.p
            initial={reducedMotion ? false : { opacity: 0, x: 20 }}
            animate={reducedMotion ? false : { opacity: 1, x: 0 }}
            transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.2 }}
          >
            {saveError}
          </motion.p>
          <motion.button
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={reducedMotion ? false : { opacity: 1, y: 0 }}
            transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.5 }}
            onClick={() => setSaveError(null)}
          >
            <span className="btn btn-outline btn-small">Close</span>
          </motion.button>
        </Card>
      )}

      {saveSuccess && (
        <Card elevated className="editor-alert editor-alert-success">
          <motion.p
            initial={reducedMotion ? false : { opacity: 0, x: 20 }}
            animate={reducedMotion ? false : { opacity: 1, x: 0 }}
            transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.2 }}
          >
            Changes saved successfully!
          </motion.p>
        </Card>
      )}

      <motion.div
        className="editor-layout"
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={reducedMotion ? false : { opacity: 1 }}
        transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.5 }}
      >
        {/* Video Preview Section */}
        <motion.div
          className="editor-preview"
          initial={reducedMotion ? false : { opacity: 0, x: -30 }}
          animate={reducedMotion ? false : { opacity: 1, x: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.6, delay: 0.6 }}
        >
          <motion.h2
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={reducedMotion ? false : { opacity: 1, y: 0 }}
            transition={reducedMotion ? undefined : { duration: 0.5 }}
            className="editor-preview-h2"
          >
            Preview
          </motion.h2>
          {videoUrl ? (
            <AuthenticatedVideo
              reelId={reelId}
              controls
              autoPlay
              style={{ width: '100%', maxWidth: '400px', borderRadius: 'var(--radius)' }}
            />
          ) : (
            <motion.div
              className="placeholder"
              initial={reducedMotion ? false : { opacity: 0, scale: 0.8 }}
              animate={reducedMotion ? false : { opacity: 1, scale: 1 }}
              transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.2 }}
            >
              Video Preview
              {!reel.video_path && (
                <p style={{ marginTop: 'var(--spacing-2)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No video generated yet
                </p>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Editor Controls Section */}
        <motion.div
          className="editor-controls"
          initial={reducedMotion ? false : { opacity: 0, x: 30 }}
          animate={reducedMotion ? false : { opacity: 1, x: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.6, delay: 0.8 }}
        >
          <motion.h2
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={reducedMotion ? false : { opacity: 1, y: 0 }}
            transition={reducedMotion ? undefined : { duration: 0.5 }}
            className="editor-controls-h2"
          >
            Reel Properties
          </motion.h2>

          {/* Editable Fields */}
          <div className="editor-form">
            <div className="editor-form-group">
              <label htmlFor="hook" className="editor-form-label">
                Hook
              </label>
              <Input
                type="text"
                id="hook"
                value={reel.hook || ''}
                onChange={(e) => {
                  setReel(prev => ({ ...prev, hook: e.target.value }));
                }}
                className="editor-form-input"
                placeholder="Enter hook text..."
              />
            </div>

            <div className="editor-form-group">
              <label htmlFor="script" className="editor-form-label">
                Script
              </label>
              <Input
                type="textarea"
                id="script"
                value={reel.script || ''}
                onChange={(e) => {
                  setReel(prev => ({ ...prev, script: e.target.value }));
                }}
                className="editor-form-textarea"
                rows={4}
                placeholder="Enter script text..."
              />
            </div>

            <div className="editor-form-group editor-grid-cols-2">
              <div>
                <label htmlFor="duration" className="editor-form-label">
                  Duration (seconds)
                </label>
                <Input
                  type="number"
                  id="duration"
                  value={reel.duration || 12}
                  onChange={(e) => {
                    setReel(prev => ({ ...prev, duration: parseInt(e.target.value) || 12 }));
                  }}
                  className="editor-form-input"
                  min="5"
                  max="60"
                />
              </div>

              <div>
                <label htmlFor="tone" className="editor-form-label">
                  Tone
                </label>
                <Input
                  type="select"
                  id="tone"
                  value={reel.tone || 'informative'}
                  onChange={(e) => {
                    setReel(prev => ({ ...prev, tone: e.target.value }));
                  }}
                  className="editor-form-select"
                >
                  <option value="informative">Informative</option>
                  <option value="exciting">Exciting</option>
                  <option value="calm">Calm</option>
                  <option value="urgent">Urgent</option>
                  <option value="humorous">Humorous</option>
                </Input>
              </div>
            </div>

            <div className="editor-form-group editor-grid-cols-2">
              <div>
                <label htmlFor="visualStyle" className="editor-form-label">
                  Visual Style
                </label>
                <Input
                  type="select"
                  id="visualStyle"
                  value={reel.visualStyle || 'modern'}
                  onChange={(e) => {
                    setReel(prev => ({ ...prev, visualStyle: e.target.value }));
                  }}
                  className="editor-form-select"
                >
                  <option value="modern">Modern</option>
                  <option value="cinematic">Cinematic</option>
                  <option value="minimal">Minimal</option>
                  <option value="vibrant">Vibrant</option>
                  <option value="classic">Classic</option>
                </Input>
              </div>

              <div>
                <label htmlFor="voice" className="editor-form-label">
                  Voice
                </label>
                <Input
                  type="select"
                  id="voice"
                  value={reel.voice || 'neutral'}
                  onChange={(e) => {
                    setReel(prev => ({ ...prev, voice: e.target.value }));
                  }}
                  className="editor-form-select"
                >
                  <option value="neutral">Neutral</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="energetic">Energetic</option>
                  <option value="calm">Calm</option>
                </Input>
              </div>
            </div>

            <div className="editor-form-group">
              <label htmlFor="captions" className="editor-form-label">
                Captions
              </label>
              <Input
                type="select"
                id="captions"
                value={reel.captions || 'none'}
                onChange={(e) => {
                  setReel(prev => ({ ...prev, captions: e.target.value }));
                }}
                className="editor-form-select"
              >
                <option value="none">None</option>
                <option value="auto">Auto-generated</option>
                <option value="manual">Manual</option>
              </Input>
            </div>

            <div className="editor-form-group">
              <label htmlFor="cta" className="editor-form-label">
                Call to Action
              </label>
              <Input
                type="text"
                id="cta"
                value={reel.cta || ''}
                onChange={(e) => {
                  setReel(prev => ({ ...prev, cta: e.target.value }));
                }}
                className="editor-form-input"
                placeholder="Enter CTA text (e.g., 'Follow for more')"
              />
            </div>

            {/* Save Button */}
            <motion.button
              onClick={handleSave}
              disabled={isSaving}
              className="editor-save-button"
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              animate={reducedMotion ? false : { opacity: 1, y: 0 }}
              transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.8 }}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </motion.button>
            {!reel.video_path && (
              <motion.button
                type="button"
                onClick={handleRender}
                disabled={isRendering}
                className="editor-save-button"
              >
                {isRendering ? 'Queueing render...' : 'Render this Reel'}
              </motion.button>
            )}
            {renderMessage && <p role="status">{renderMessage}</p>}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
