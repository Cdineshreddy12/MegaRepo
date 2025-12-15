"use client";
import { useScroll, useTransform } from "motion/react";
import React from "react";
import { GoogleGeminiEffect } from "@/components/ui/google-gemini-effect";

export default function GoogleGeminiEffectDemo() {
  const ref = React.useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const pathLengthFirst = useTransform(scrollYProgress, [0, 0.2], [0.1, 2]);
  const pathLengthSecond = useTransform(scrollYProgress, [0, 0.2], [0.1, 2]);
  const pathLengthThird = useTransform(scrollYProgress, [0, 0.2], [0.1, 2]);
  const pathLengthFourth = useTransform(scrollYProgress, [0, 0.2], [0.1, 2]);
  const pathLengthFifth = useTransform(scrollYProgress, [0, 0.2], [0.1, 2]);

  return (
    <div
      className="h-[125vh] bg-white w-full border border-gray-200 rounded-md relative pt-40 overflow-clip"
      ref={ref}
    >
      <GoogleGeminiEffect
        pathLengths={[
          pathLengthFirst,
          pathLengthSecond,
          pathLengthThird,
          pathLengthFourth,
          pathLengthFifth,
        ]}
        title="ECOSYSTEM INTERCONNECTIVITY"
        description="Data flows effortlessly between all your applications, eliminating data silos and ensuring consistency."
      />
    </div>
  );
}