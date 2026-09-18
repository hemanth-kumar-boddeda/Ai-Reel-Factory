import { motion } from 'framer-motion';

export default function CreateReel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <motion.h1
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        Create New Reel
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        Input: What should this Reel be about?
      </motion.p>
      {/* TODO: Implement creation flow */}
      <motion.div
        className="create-reel-form"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <motion.input
          type="text"
          placeholder="Enter your idea..."
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        />
        <motion.textarea
          placeholder="Describe your vision..."
          rows={4}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Create Reel
        </motion.button>
      </motion.div>
    </motion.div>
  );
}