import { motion } from 'framer-motion';

export default function MetricCard({ label, value, accent, reducedMotion }) {
  const motionProps = (reducedMotion, props) =>
    reducedMotion ? {} : props;

  return (
    <motion.div
      { ...motionProps(reducedMotion, {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
        transition: { duration: 0.5 }
      })}
      className="glass"
    >
      <div className="metric-content">
        <p className="metric-label">{label}</p>
        <p className="metric-value" style={{ color: accent || '#fff' }}>
          {value}
        </p>
      </div>
    </motion.div>
  );
}
