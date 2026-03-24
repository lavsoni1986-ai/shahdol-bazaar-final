// LiquidMotion - Cinematic Sovereign Transitions
// Framer Motion wrapper for $100M SaaS aesthetic

import { ReactNode } from "react";
import { motion, AnimatePresence, Variants, TargetAndTransition, VariantLabels } from "framer-motion";

// Page transition variants
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.98,
    y: 20,
  },
  enter: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1], // cubic-bezier for smooth "liquid" feel
      when: "beforeChildren",
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: -20,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

// Staggered children variants
export const staggerVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.3,
    },
  },
};

// Card hover variants
export const cardHoverVariants: Variants = {
  rest: {
    scale: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.175, 0.885, 0.32, 1.275], // spring-like
    },
  },
  hover: {
    scale: 1.02,
    y: -8,
    transition: {
      duration: 0.4,
      ease: [0.175, 0.885, 0.32, 1.275],
    },
  },
};

// Floating animation variants
export const floatVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.8,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: "easeOut",
    },
  },
  float: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// Neural pulse variants for AI status
export const neuralPulseVariants: Variants = {
  idle: {
    boxShadow: "0 0 0 0 rgba(249, 115, 22, 0.7)",
    scale: 1,
  },
  pulse: {
    boxShadow: [
      "0 0 0 0 rgba(249, 115, 22, 0.7)",
      "0 0 0 20px rgba(249, 115, 22, 0)",
    ],
    scale: [1, 1.1, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// Props interfaces
interface LiquidPageProps {
  children: ReactNode;
  className?: string;
}

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

interface MotionCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  viewport?: object;
  initial?: boolean | TargetAndTransition | VariantLabels;
}

// Liquid Page Wrapper
export function LiquidPage({ children, className = "" }: LiquidPageProps) {
  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={pageVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Stagger Container for animated lists
export function StaggerContainer({ children, className = "", delay = 0.1 }: StaggerContainerProps) {
  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={{
        enter: {
          transition: {
            staggerChildren: delay,
            delayChildren: delay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Motion Card with hover effects
export function MotionCard({ children, className = "", onClick, viewport, initial }: MotionCardProps) {
  return (
    <motion.div
      variants={cardHoverVariants}
      initial={initial !== undefined ? initial : "rest"}
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
      className={className}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
      viewport={viewport}
    >
      {children}
    </motion.div>
  );
}

// Floating element component
export function FloatingElement({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{
        initial: {
          opacity: 0,
          scale: 0.8,
        },
        animate: {
          opacity: 1,
          scale: 1,
          transition: {
            duration: 0.8,
            ease: "easeOut",
            delay,
          },
        },
        float: {
          y: [0, -10, 0],
          transition: {
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          },
        },
      }}
      whileHover="float"
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Neural Pulse indicator for AI status
export function NeuralPulse({ active = false, className = "" }: { active?: boolean; className?: string }) {
  return (
    <motion.div
      animate={active ? "pulse" : "idle"}
      variants={neuralPulseVariants}
      className={`rounded-full ${className}`}
      style={{
        width: 12,
        height: 12,
        backgroundColor: "rgba(249, 115, 22, 0.9)",
      }}
    />
  );
}

// Animate presence wrapper for route changes
export function LiquidRoute({ children, location }: { children: ReactNode; location: string | [path: string] }) {
  const key = Array.isArray(location) ? location[0] : location;
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={pageVariants}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Glass card effect with motion
export function GlassCardMotion({ children, className = "", onClick }: MotionCardProps) {
  return (
    <motion.div
      variants={cardHoverVariants}
      initial="rest"
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
      className={`glass-card backdrop-blur-md bg-white/5 border border-white/10 rounded-xl ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      {children}
    </motion.div>
  );
}

// Animated counter for stats
export function AnimatedCounter({ 
  value, 
  duration = 2 
}: { 
  value: number; 
  duration?: number 
}) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {value.toLocaleString()}
    </motion.span>
  );
}

// Slide in from direction
export function SlideIn({ 
  children, 
  direction = "up", 
  className = "",
  delay = 0 
}: { 
  children: ReactNode; 
  direction?: "up" | "down" | "left" | "right";
  className?: string;
  delay?: number;
}) {
  const directions = {
    up: { y: 50, x: 0 },
    down: { y: -50, x: 0 },
    left: { x: 50, y: 0 },
    right: { x: -50, y: 0 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directions[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ 
        duration: 0.6, 
        delay,
        ease: [0.22, 1, 0.36, 1] 
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Scale in animation
export function ScaleIn({ 
  children, 
  className = "",
  delay = 0 
}: { 
  children: ReactNode; 
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        duration: 0.5, 
        delay,
        ease: [0.175, 0.885, 0.32, 1.275] // spring-like
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export { motion, AnimatePresence };
