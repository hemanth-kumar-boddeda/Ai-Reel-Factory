import { motion, useReducedMotion } from 'framer-motion';

export default function Templates() {
  const reducedMotion = useReducedMotion();

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
        Templates
      </motion.h1>
      <motion.p
        initial={reducedMotion ? false : { opacity: 0, x: 50 }}
        animate={reducedMotion ? false : { opacity: 1, x: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.8, delay: 0.4 }}
      >
        Browse and use reel templates
      </motion.p>
      {/* Templates grid implementation to be done */}
      <motion.div
        className="templates-grid"
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={reducedMotion ? false : { opacity: 1 }}
        transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.6 }}
      >
        {/* Templates grid implementation will go here */}
      </motion.div>
    </motion.div>
  );
}