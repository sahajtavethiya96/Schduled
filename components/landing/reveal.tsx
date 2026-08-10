"use client";

import { motion, useReducedMotion } from "motion/react";

export type RevealDirection =
  | "up"
  | "down"
  | "left"
  | "right"
  | "fade"
  | "scale";

type MotionTarget = Record<string, number>;

const VARIANTS: Record<
  RevealDirection,
  { hidden: MotionTarget; visible: MotionTarget }
> = {
  up: { hidden: { opacity: 0, y: 52 }, visible: { opacity: 1, y: 0 } },
  down: { hidden: { opacity: 0, y: -28 }, visible: { opacity: 1, y: 0 } },
  left: { hidden: { opacity: 0, x: -60 }, visible: { opacity: 1, x: 0 } },
  right: { hidden: { opacity: 0, x: 60 }, visible: { opacity: 1, x: 0 } },
  fade: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
  scale: {
    hidden: { opacity: 0, scale: 0.88 },
    visible: { opacity: 1, scale: 1 },
  },
};

export function Reveal({
  children,
  className,
  delay = 0,
  direction = "up",
  once = true,
  onMouseLeave,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: RevealDirection;
  once?: boolean;
  onMouseLeave?: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const { hidden, visible } = VARIANTS[direction];

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : hidden}
      onMouseLeave={onMouseLeave}
      transition={{
        duration: reduceMotion ? 0 : 0.65,
        delay: reduceMotion ? 0 : delay / 1000,
        ease: [0.22, 1, 0.36, 1],
      }}
      viewport={{ once, amount: 0.15, margin: "0px 0px -60px 0px" }}
      whileInView={reduceMotion ? undefined : visible}
    >
      {children}
    </motion.div>
  );
}
