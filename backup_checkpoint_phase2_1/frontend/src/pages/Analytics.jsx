import { motion, useReducedMotion } from 'framer-motion';

export default function Analytics() {
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
        Analytics
      </motion.h1>
      <motion.p
        initial={reducedMotion ? false : { opacity: 0, x: 50 }}
        animate={reducedMotion ? false : { opacity: 1, x: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.8, delay: 0.4 }}
      >
        Premium animated charts for Views, Reach, Retention, Shares, Saves, Follows
      </motion.p>
      {/* Charts to be implemented */}
      <motion.div
        className="analytics-charts"
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={reducedMotion ? false : { opacity: 1 }}
        transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.6 }}
      >
        {/* Chart components will go here */}
        <motion.div
          className="analytics-chart"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={reducedMotion ? false : { opacity: 1, y: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.5, delay: index * 0.1 }}
        >
          Views Chart
        </motion.div>
        <motion.div
          className="analytics-chart"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={reducedMotion ? false : { opacity: 1, y: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.5, delay: (index + 1) * 0.1 }}
        >
          Reach Chart
        </motion.div>
        <motion.div
          className="analytics-chart"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={reducedMotion ? false : { opacity: 1, y: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.5, delay: (index + 2) * 0.1 }}
        >
          Retention Chart
        </motion.div>
        <motion.div
          className="analytics-chart"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={reducedMotion ? false : { opacity: 1, y: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.5, delay: (index + 3) * 0.1 }}
        >
          Shares Chart
        </motion.div>
        <motion.div
          className="analytics-chart"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={reducedMotion ? false : { opacity: 1, y: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.5, delay: (index + 4) * 0.1 }}
        >
          Saves Chart
        </motion.div>
        <motion.div
          className="analytics-chart"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={reducedMotion ? false : { opacity: 1, y: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.5, delay: (index + 5) * 0.1 }}
        >
          Follows Chart
        </motion.div>
      </motion.div>
    </motion.div>
  );
}