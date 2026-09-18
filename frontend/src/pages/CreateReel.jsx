import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function CreateReel() {
  const reducedMotion = useReducedMotion();
  const navigate = useNavigate();
  const [idea, setIdea] = useState('');
  const [vision, setVision] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!idea.trim()) {
      setError('Please enter an idea for your reel');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Create a reel with the idea as title and vision as summary
      const reelData {
        source: "User Input",
        title: idea.trim(),
        url: `https://user-input-${Date.now()}`, // Generate a unique URL
        summary: vision.trim() || idea.trim()
        // Score will be calculated by the backend during pipeline processing
      };

      const response = await axios.post('http://localhost:8000/api/reels', reelData);

      setSuccess(true);
      setLoading(false);

      // Navigate to the editor for the newly created reel after a short delay
      setTimeout(() => {
        navigate(`/editor/${response.data.id}`);
      }, 1500);
    } catch (err) {
      setLoading(false);
      setError('Failed to create reel. Please try again.');
      console.error('Error creating reel:', err);
    }
  };

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
        Create New Reel
      </motion.h1>
      <motion.p
        initial={reducedMotion ? false : { opacity: 0, x: 50 }}
        animate={reducedMotion ? false : { opacity: 1, x: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.8, delay: 0.4 }}
      >
        Input: What should this Reel be about?
      </motion.p>

      {error && (
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
            {error}
          </motion.p>
          <motion.button
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={reducedMotion ? false : { opacity: 1, y: 0 }}
            transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.5 }}
            onClick={() => setError(null)}
          >
            Close
          </motion.button>
        </motion.div>
      )}

      {success && (
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
            Reel created successfully! Opening editor...
          </motion.p>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="create-reel-form"
        initial={reducedMotion ? false : { opacity: 0, y: 20 }}
        animate={reducedMotion ? false : { opacity: 1, y: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.6 }}
      >
        <motion.input
          type="text"
          placeholder="Enter your idea..."
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          required
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        />
        <motion.textarea
          placeholder="Describe your vision..."
          value={vision}
          onChange={(e) => setVision(e.target.value)}
          rows={4}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        />
        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {loading ? 'Creating...' : 'Create Reel'}
        </motion.button>
      </form>
    </motion.div>
  );
}