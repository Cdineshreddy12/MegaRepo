import React, { useEffect, useRef, useState } from "react";
import Typography, { TypographyVariant } from "./Typography";

interface NumberAnimationProps {
  from?: number;
  to: number;
  duration?: number; // in ms
  formatter?: (n: number) => string;
  className?: string;
  variant?: TypographyVariant
}

const NumberAnimation: React.FC<NumberAnimationProps> = ({
  from = 0,
  to,
  duration = 1000,
  formatter = (n) => n.toLocaleString(),
  className,
  variant = 'h2'
}) => {
  const [value, setValue] = useState(from);
  const frame = useRef<number>();

  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const current = from + (to - from) * progress;
      setValue(current);
      if (progress < 1) {
        frame.current = requestAnimationFrame(animate);
      }
    };
    frame.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame.current!);
  }, [from, to, duration]);

  return <Typography variant={variant} className={className}>{formatter(Math.round(value))}</Typography>;
};

export default NumberAnimation;
