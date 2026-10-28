import { motion, useReducedMotion } from 'framer-motion';

export default function Home() {
  const reducedMotion = useReducedMotion();
  const motionProps = (reducedMotion, props) =>
    reducedMotion ? {} : props;

  return (
    <motion.div
      {...motionProps(reducedMotion, {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
        transition: { duration: 0.5 }
      })}
    >
      <motion.h1
        {...motionProps(reducedMotion, {
          initial: { opacity: 0, x: -50 },
          animate: { opacity: 1, x: 0 },
          transition: { duration: 0.8, delay: 0.2 }
        })}
      >
        Home page
      </motion.h1>
      <motion.p
        {...motionProps(reducedMotion, {
          initial: { opacity: 0, x: 50 },
          animate: { opacity: 1, x: 0 },
          transition: { duration: 0.8, delay: 0.4 }
        })}
      >
        This is the home page.
      </motion.p>
    </motion.div>
  );
}