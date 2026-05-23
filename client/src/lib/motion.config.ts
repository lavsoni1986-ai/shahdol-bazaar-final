// motion.config.ts
import { Variants } from "framer-motion";

export const spring = {
  type: "spring" as const,
  stiffness: 120,
  damping: 14,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 25 },
  show: {
    opacity: 1,
    y: 0,
    transition: spring,
  },
};

export const stagger: Variants = {
  show: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

export const scaleHover = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.97 },
  transition: { type: "spring" as const, stiffness: 200 },
};