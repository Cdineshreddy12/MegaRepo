"use client";
import { cn } from "@/lib/utils";
import { motion, MotionValue, useTransform } from "motion/react";
import React from "react";
import { products } from "../../data/content";
import { DynamicIcon } from "../landing/Icons";

export const GoogleGeminiEffect = ({
  pathLengths,
  title,
  description,
  className,
}: {
  pathLengths: MotionValue[];
  title?: string;
  description?: string;
  className?: string;
}) => {
  // SVG Configuration
  const width = 1440;
  const height = 900; // Increased height for better mobile scaling
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 300; // Radius of the satellite nodes circle

  // Calculate node positions dynamically based on products array
  const nodes = products.map((product, index) => {
    const angle = (index * 360) / products.length; // Even distribution
    const radian = (angle * Math.PI) / 180;
    const x = centerX + radius * Math.cos(radian);
    const y = centerY + radius * Math.sin(radian);
    return { ...product, x, y, angle };
  });

  return (
    <div className={cn("sticky top-0 h-screen w-full overflow-hidden bg-slate-50", className)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-slate-50 to-slate-100 z-0 pointer-events-none" />

      {/* Header Content */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 md:px-8 h-full flex flex-col items-center pt-12 md:pt-20">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-3xl md:text-7xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-b from-slate-900 to-slate-600 tracking-tight"
        >
          {title || `Ecosystem Interconnectivity`}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-sm md:text-xl font-light text-center text-slate-500 mt-4 md:mt-6 max-w-2xl mx-auto"
        >
          {description ||
            `Data flows effortlessly between all your applications, eliminating data silos and ensuring consistency.`}
        </motion.p>
      </div>

      {/* Dynamic Ecosystem SVG */}
      <div className="absolute top-0 mt-16 md:mt-32 p-4 md:p-8 left-0 w-full h-full flex items-center justify-center z-10 pointer-events-none">
        <div className="w-full h-full relative">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Gradients for each product category */}
              {nodes.map((node) => (
                <linearGradient key={node.id} id={`grad-${node.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="1" />
                </linearGradient>
              ))}
            </defs>

            {/* Connection Lines (Scroll Driven) */}
            {nodes.map((node, index) => {
              // We use modulus to cycle through the 5 provided pathLengths if we have more products
              const pathLength = pathLengths[index % pathLengths.length];

              return (
                <g key={`path-group-${node.id}`}>
                  {/* Background faint line */}
                  <path
                    d={`M${node.x},${node.y} C${node.x},${centerY} ${centerX},${node.y} ${centerX},${centerY}`}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    fill="none"
                  />
                  {/* Animated drawing line */}
                  <motion.path
                    d={`M${node.x},${node.y} C${node.x},${centerY} ${centerX},${node.y} ${centerX},${centerY}`}
                    stroke={`url(#grad-${node.id})`}
                    strokeWidth="2"
                    fill="none"
                    style={{ pathLength }}
                  />

                  {/* Data Packets (Continuous Flow) - Moving Inwards */}
                  <motion.circle
                    r="3"
                    fill="#3b82f6"
                    initial={{ offsetDistance: "0%" }}
                    animate={{ offsetDistance: "100%" }}
                    transition={{
                      duration: 2 + (index * 0.2), // Stagger speeds
                      repeat: Infinity,
                      ease: "linear",
                      repeatDelay: 1
                    }}
                    style={{
                      offsetPath: `path("M${node.x},${node.y} C${node.x},${centerY} ${centerX},${node.y} ${centerX},${centerY}")`
                    }}
                  />

                  {/* Data Packets (Continuous Flow) - Moving Outwards */}
                  <motion.circle
                    r="2"
                    fill="#a855f7" // Different color for outbound
                    initial={{ offsetDistance: "0%" }}
                    animate={{ offsetDistance: "100%" }}
                    transition={{
                      duration: 3 + (index * 0.2),
                      repeat: Infinity,
                      ease: "linear",
                      delay: 1
                    }}
                    style={{
                      offsetPath: `path("M${centerX},${centerY} C${centerX},${node.y} ${node.x},${centerY} ${node.x},${node.y}")`
                    }}
                  />
                </g>
              );
            })}

            {/* Satellite Nodes */}
            {nodes.map((node, index) => (
              <g key={`node-${node.id}`}>
                {/* Pulse Effect */}
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r="25"
                  fill="none"
                  stroke={index % 2 === 0 ? "#3b82f6" : "#8b5cf6"}
                  strokeOpacity="0.5"
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 2, repeat: Infinity, delay: index * 0.1 }}
                />

                {/* Node Circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="24"
                  fill="white"
                  stroke="#cbd5e1"
                  strokeWidth="1"
                  className="drop-shadow-md"
                />

                {/* Icon */}
                <foreignObject x={node.x - 12} y={node.y - 12} width="24" height="24">
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <DynamicIcon name={node.iconName} className="w-5 h-5" />
                  </div>
                </foreignObject>

                {/* Text Label */}
                <text
                  x={node.x}
                  y={node.y + 40}
                  textAnchor="middle"
                  fill="#475569"
                  fontSize="11"
                  fontWeight="600"
                  className="uppercase tracking-wider"
                >
                  {node.name.split(" ")[0]}
                </text>
              </g>
            ))}

            {/* Central Hub */}
            <g>
              <circle cx={centerX} cy={centerY} r="60" fill="white" className="drop-shadow-2xl" />
              <circle cx={centerX} cy={centerY} r="60" stroke="#e2e8f0" strokeWidth="1" />
              <circle cx={centerX} cy={centerY} r="50" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" className="animate-[spin_10s_linear_infinite]" />

              <foreignObject x={centerX - 40} y={centerY - 40} width="80" height="80">
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg mb-1">
                    <img
                      src="/src/public/Zopkit Simple Logo.jpg"
                      alt="Zopkit"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Unified Core</span>
                </div>
              </foreignObject>
            </g>

          </svg>
        </div>
      </div>
    </div>
  );
};

export default GoogleGeminiEffect;