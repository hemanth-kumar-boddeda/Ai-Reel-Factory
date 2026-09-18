import { motion, useReducedMotion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useReel } from '../hooks/useReel';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Editor() {
  const reducedMotion = useReducedMotion();
  const { reelId } = useParams();
  const navigate = useNavigate();
  const { reels: allReels, loading, error } = useReel();

  const [reel, setReel] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);

  // Fetch specific reel data when component loads or reelId changes
  useEffect(() => {
    const fetchReel = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/api/reel/${reelId}`);
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
          } catch (e) {
            // If research_data is not JSON, ignore UI control parsing
          }
        }

        setReel(reelWithControls);
        // Set video URL if video exists
        if (fetchedReel.video_path) {
          setVideoUrl(`http://localhost:8000/video/${fetchedReel.id}`);
        }
      } catch (err) {
        console.error('Error fetching reel:', err);
      }
    };

    if (reelId) {
      fetchReel();
    }
  }, [reelId]);

  // Fallback to useReel hook data if direct fetch fails
  useEffect(() => {
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
          } catch (e) {
            // If research_data is not JSON, ignore UI control parsing
          }
        }
        setReel(reelWithControls);
        if (foundReel.video_path) {
          setVideoUrl(`http://localhost:8000/video/${foundReel.id}`);
        }
      }
    }
  }, [allReels, reelId]);

  if (loading && !reel) return (
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

  if (error && !reel) return (
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

  if (!reel) {
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
          Reel not found
        </motion.h2>
        {allReels.length === 0 ? (
          <motion.p
            initial={reducedMotion ? false : { opacity: 0, x: 20 }}
            animate={reducedMotion ? false : { opacity: 1, x: 0 }}
            transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.2 }}
          >
            No reels available yet. Create a reel to edit.
          </motion.p>
        ) : null}
        <motion.button
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={reducedMotion ? false : { opacity: 1, y: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.4 }}
          asChild
        >
          <a href="/create" style={{ textDecoration: 'none' }}>
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
        } catch (e) {
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

      const response = await axios.put(`http://localhost:8000/api/reel/${reel.id}`, updateData);

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
      >
        Reel Editor
      </motion.h1>

      {saveError && (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={reducedMotion ? false : { opacity: 1 }}
          transition={reducedMotion ? undefined : { duration: 0.5 }}
        >
          <motion.p
            initial={reducedMotion ? false : { opacity: 0, x: 20 }}
            animate={reducedMotion ? false : { opacity: 1, x: 0 }}
            transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.2 }}
            style={{ color: '#ff6b6b' }}
          >
            {saveError}
          </motion.p>
          <motion.button
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={reducedMotion ? false : { opacity: 1, y: 0 }}
            transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.5 }}
            onClick={() => setSaveError(null)}
          >
            Close
          </motion.button>
        </motion.div>
      )}

      {saveSuccess && (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={reducedMotion ? false : { opacity: 1 }}
          transition={reducedMotion ? undefined : { duration: 0.5 }}
        >
          <motion.p
            initial={reducedMotion ? false : { opacity: 0, x: 20 }}
            animate={reducedMotion ? false : { opacity: 1, x: 0 }}
            transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.2 }}
            style={{ color: '#4ecdc4' }}
          >
            Changes saved successfully!
          </motion.p>
        </motion.div>
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
          >
            Preview
          </motion.h2>
          {videoUrl ? (
            <video
              controls
              autoPlay
              muted
              loop
              playsInline
              style={{ width: '100%', maxWidth: '400px', borderRadius: '8px' }}
              src={videoUrl}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <motion.div
              className="placeholder"
              initial={reducedMotion ? false : { opacity: 0, scale: 0.8 }}
              animate={reducedMotion ? false : { opacity: 1, scale: 1 }}
              transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.2 }}
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
          >
            Reel Properties
          </motion.h2>

          {/* Editable Fields */}
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label htmlFor="hook" className="block mb-2 font-medium">Hook</label>
              <input
                type="text"
                id="hook"
                value={reel.hook || ''}
                onChange={(e) => {
                  setReel(prev => ({ ...prev, hook: e.target.value }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter hook text..."
              />
            </div>

            <div>
              <label htmlFor="script" className="block mb-2 font-medium">Script</label>
              <textarea
                id="script"
                value={reel.script || ''}
                onChange={(e) => {
                  setReel(prev => ({ ...prev, script: e.target.value }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Enter script text..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="duration" className="block mb-2 font-medium">Duration (seconds)</label>
                <input
                  type="number"
                  id="duration"
                  value={reel.duration || 12}
                  onChange={(e) => {
                    setReel(prev => ({ ...prev, duration: parseInt(e.target.value) || 12 }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="5"
                  max="60"
                />
              </div>

              <div>
                <label htmlFor="tone" className="block mb-2 font-medium">Tone</label>
                <select
                  id="tone"
                  value={reel.tone || 'informative'}
                  onChange={(e) => {
                    setReel(prev => ({ ...prev, tone: e.target.value }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="informative">Informative</option>
                  <option value="exciting">Exciting</option>
                  <option value="calm">Calm</option>
                  <option value="urgent">Urgent</option>
                  <option value="humorous">Humorous</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="visualStyle" className="block mb-2 font-medium">Visual Style</label>
                <select
                  id="visualStyle"
                  value={reel.visualStyle || 'modern'}
                  onChange={(e) => {
                    setReel(prev => ({ ...prev, visualStyle: e.target.value }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="modern">Modern</option>
                  <option value="cinematic">Cinematic</option>
                  <option value="minimal">Minimal</option>
                  <option value="vibrant">Vibrant</option>
                  <option value="classic">Classic</option>
                </select>
              </div>

              <div>
                <label htmlFor="voice" className="block mb-2 font-medium">Voice</label>
                <select
                  id="voice"
                  value={reel.voice || 'neutral'}
                  onChange={(e) => {
                    setReel(prev => ({ ...prev, voice: e.target.value }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="neutral">Neutral</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="energetic">Energetic</option>
                  <option value="calm">Calm</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="captions" className="block mb-2 font-medium">Captions</label>
              <select
                id="captions"
                value={reel.captions || 'none'}
                onChange={(e) => {
                  setReel(prev => ({ ...prev, captions: e.target.value }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">None</option>
                <option value="auto">Auto-generated</option>
                <option value="manual">Manual</option>
              </select>
            </div>

            <div>
              <label htmlFor="cta" className="block mb-2 font-medium">Call to Action</label>
              <input
                type="text"
                id="cta"
                value={reel.cta || ''}
                onChange={(e) => {
                  setReel(prev => ({ ...prev, cta: e.target.value }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter CTA text (e.g., 'Follow for more')"
              />
            </div>
          </div>

          {/* Save Button */}
          <motion.button
            onClick={handleSave}
            disabled={isSaving}
            className="mt-6 w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-md hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-200 focus:ring-blue-500 transition-all duration-200"
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={reducedMotion ? false : { opacity: 1, y: 0 }}
            transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.8 }}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}