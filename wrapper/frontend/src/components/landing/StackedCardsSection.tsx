import React, { useRef } from 'react';
import { motion, useScroll, useTransform, MotionValue, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight, Activity, TrendingUp, Calendar, DollarSign, Users, Award, Layers, BarChart3, PieChart, List, FileText, MapPin, UserPlus, Share2, Code, Layout, Globe, Zap, Box } from 'lucide-react';
import { BusinessApp, Product } from '../../types';

interface CardProps {
  app: BusinessApp;
  index: number;
  total: number;
  scrollYProgress: MotionValue<number>;
  positionRange: number[];
  targetScale: number;
  isLast: boolean;
  isActive: boolean;
  onClick: () => void;
}

// --- COLOR THEME MAPPING ---

// Pre-defined maps to ensure Tailwind classes are always generated correctly
const THEMES: Record<string, any> = {
  blue: {
    bgLight: 'bg-blue-50',
    bgMedium: 'bg-blue-100',
    bgDark: 'bg-blue-600',
    textLight: 'text-blue-500',
    textDark: 'text-blue-700',
    border: 'border-blue-200',
    gradient: 'from-blue-500 to-cyan-500',
    shadow: 'shadow-blue-500/20'
  },
  green: {
    bgLight: 'bg-emerald-50',
    bgMedium: 'bg-emerald-100',
    bgDark: 'bg-emerald-600',
    textLight: 'text-emerald-500',
    textDark: 'text-emerald-700',
    border: 'border-emerald-200',
    gradient: 'from-emerald-500 to-green-500',
    shadow: 'shadow-emerald-500/20'
  },
  purple: {
    bgLight: 'bg-purple-50',
    bgMedium: 'bg-purple-100',
    bgDark: 'bg-purple-600',
    textLight: 'text-purple-500',
    textDark: 'text-purple-700',
    border: 'border-purple-200',
    gradient: 'from-purple-500 to-pink-500',
    shadow: 'shadow-purple-500/20'
  },
  orange: {
    bgLight: 'bg-orange-50',
    bgMedium: 'bg-orange-100',
    bgDark: 'bg-orange-600',
    textLight: 'text-orange-500',
    textDark: 'text-orange-700',
    border: 'border-orange-200',
    gradient: 'from-orange-500 to-red-500',
    shadow: 'shadow-orange-500/20'
  },
  indigo: {
    bgLight: 'bg-indigo-50',
    bgMedium: 'bg-indigo-100',
    bgDark: 'bg-indigo-600',
    textLight: 'text-indigo-500',
    textDark: 'text-indigo-700',
    border: 'border-indigo-200',
    gradient: 'from-indigo-500 to-violet-500',
    shadow: 'shadow-indigo-500/20'
  },
  teal: {
    bgLight: 'bg-teal-50',
    bgMedium: 'bg-teal-100',
    bgDark: 'bg-teal-600',
    textLight: 'text-teal-500',
    textDark: 'text-teal-700',
    border: 'border-teal-200',
    gradient: 'from-teal-500 to-emerald-500',
    shadow: 'shadow-teal-500/20'
  }
};

// --- VISUAL COMPONENTS ---

// --- VISUAL TEMPLATES ---

const ChartVisual = ({ type = 'bar', color = 'blue' }: { type?: 'bar' | 'line' | 'pie', color?: string }) => {
  const theme = THEMES[color] || THEMES['blue'];
  return (
    <div className="w-full h-full p-6 flex flex-col preserve-3d">
      <div className="flex justify-between items-center mb-6" style={{ transform: 'translateZ(20px)' }}>
        <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-xl shadow-sm border border-slate-100">
          <span className={`text-xs font-bold ${theme.textDark} uppercase tracking-wide`}>Analytics</span>
        </div>
        <BarChart3 className={`w-5 h-5 ${theme.textLight}`} />
      </div>
      <div className="flex-1 bg-white/50 backdrop-blur-sm rounded-xl border border-white/60 p-4 flex items-end justify-between gap-2 relative shadow-inner" style={{ transform: 'translateZ(10px)' }}>
        {[40, 70, 50, 90, 60, 80, 45].map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{ duration: 0.8, delay: i * 0.1 }}
            className={`flex-1 rounded-t-lg ${theme.bgDark} opacity-90`}
          />
        ))}
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none opacity-20">
          <div className="w-full h-px bg-slate-400"></div>
          <div className="w-full h-px bg-slate-400"></div>
          <div className="w-full h-px bg-slate-400"></div>
        </div>
      </div>
    </div>
  );
};

const PipelineVisual = ({ color = 'blue' }: { color?: string }) => {
  const theme = THEMES[color] || THEMES['blue'];
  return (
    <div className="w-full h-full p-6 flex flex-col gap-3 preserve-3d">
      <div className="flex justify-between items-center mb-2" style={{ transform: 'translateZ(20px)' }}>
        <span className="text-sm font-bold text-slate-700">Pipeline Stages</span>
        <span className={`text-xs ${theme.bgLight} ${theme.textDark} px-2 py-1 rounded-full font-bold`}>Active</span>
      </div>
      {[
        { label: 'Lead In', val: '100%', count: 45 },
        { label: 'Contacted', val: '75%', count: 32 },
        { label: 'Qualified', val: '50%', count: 18 },
        { label: 'Negotiation', val: '25%', count: 8 }
      ].map((stage, i) => (
        <div key={i} className="relative" style={{ transform: `translateZ(${15 - i * 3}px)` }}>
          <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase mb-1">
            <span>{stage.label}</span>
            <span>{stage.count}</span>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: stage.val }}
              transition={{ duration: 1, delay: i * 0.2 }}
              className={`h-full ${theme.bgDark} rounded-full`}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const TableVisual = ({ color = 'blue' }: { color?: string }) => {
  const theme = THEMES[color] || THEMES['blue'];
  return (
    <div className="w-full h-full p-5 flex flex-col gap-3 preserve-3d">
      <div className="flex items-center gap-2 mb-2" style={{ transform: 'translateZ(20px)' }}>
        <List className={`w-4 h-4 ${theme.textDark}`} />
        <span className="text-sm font-bold text-slate-700">Records</span>
      </div>
      <div className="bg-white/60 backdrop-blur-md rounded-xl border border-white/50 shadow-sm overflow-hidden flex-1" style={{ transform: 'translateZ(10px)' }}>
        <div className="grid grid-cols-4 gap-2 p-3 border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase">
          <span className="col-span-2">Name</span>
          <span>Status</span>
          <span className="text-right">Value</span>
        </div>
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="grid grid-cols-4 gap-2 p-3 border-b border-slate-50 items-center hover:bg-white/80 transition-colors"
          >
            <div className="col-span-2 flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full ${theme.bgLight} flex-shrink-0`}></div>
              <div className="h-2 w-16 bg-slate-200 rounded-full"></div>
            </div>
            <div><div className={`h-4 w-12 ${i % 2 === 0 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'} rounded-full flex items-center justify-center text-[8px] font-bold`}>ACTIVE</div></div>
            <div className="text-right"><div className="h-2 w-8 bg-slate-200 rounded-full ml-auto"></div></div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const KanbanVisual = ({ color = 'blue' }: { color?: string }) => {
  const theme = THEMES[color] || THEMES['blue'];
  return (
    <div className="w-full h-full p-4 flex gap-3 preserve-3d">
      {['To Do', 'In Prog', 'Done'].map((col, i) => (
        <div key={i} className="flex-1 bg-slate-50/80 rounded-xl border border-slate-100 p-2 flex flex-col gap-2" style={{ transform: `translateZ(${10 + i * 5}px)` }}>
          <div className="text-[10px] font-bold text-slate-400 uppercase px-1">{col}</div>
          {[1, 2].map((card) => (
            <motion.div
              key={card}
              whileHover={{ scale: 1.05, y: -2 }}
              className="bg-white p-2 rounded-lg shadow-sm border border-slate-100"
            >
              <div className={`w-8 h-1 rounded-full ${theme.bgDark} mb-2 opacity-50`}></div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full mb-1"></div>
              <div className="h-1.5 w-2/3 bg-slate-100 rounded-full"></div>
            </motion.div>
          ))}
        </div>
      ))}
    </div>
  );
};

const MapVisual = ({ color = 'blue' }: { color?: string }) => {
  const theme = THEMES[color] || THEMES['blue'];
  return (
    <div className="w-full h-full relative overflow-hidden rounded-2xl preserve-3d bg-slate-50">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      {/* Map Points */}
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ top: `${20 + i * 25}%`, left: `${30 + i * 20}%`, transform: 'translateZ(20px)' }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.2 }}
        >
          <div className={`relative flex items-center justify-center w-8 h-8 rounded-full ${theme.bgLight} shadow-lg border-2 border-white text-white`}>
            <MapPin className={`w-4 h-4 ${theme.textDark}`} />
            <div className={`absolute -bottom-1 w-1 h-1 bg-slate-400 rounded-full`}></div>
          </div>
          <motion.div
            className={`absolute inset-0 rounded-full ${theme.bgDark}`}
            initial={{ opacity: 0.5, scale: 1 }}
            animate={{ opacity: 0, scale: 2 }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
      ))}
    </div>
  );
};

const DocumentVisual = ({ color = 'blue' }: { color?: string }) => {
  const theme = THEMES[color] || THEMES['blue'];
  return (
    <div className="w-full h-full p-8 flex items-center justify-center preserve-3d">
      <motion.div
        className="w-48 bg-white rounded-xl shadow-xl border border-slate-100 p-6 relative"
        style={{ transform: 'translateZ(20px)' }}
        whileHover={{ scale: 1.05, rotate: -2 }}
      >
        <div className={`w-10 h-10 rounded-lg ${theme.bgLight} flex items-center justify-center mb-4`}>
          <FileText className={`w-5 h-5 ${theme.textDark}`} />
        </div>
        <div className="space-y-2">
          <div className="h-2 w-full bg-slate-200 rounded-full"></div>
          <div className="h-2 w-3/4 bg-slate-200 rounded-full"></div>
          <div className="h-2 w-1/2 bg-slate-200 rounded-full"></div>
        </div>
        <div className="mt-6 flex justify-between items-center">
          <div className="h-6 w-16 bg-slate-100 rounded-md"></div>
          <div className={`h-6 w-6 rounded-full ${theme.bgDark} flex items-center justify-center text-white`}>
            <Check size={12} />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const NetworkVisual = ({ color = 'blue' }: { color?: string }) => {
  const theme = THEMES[color] || THEMES['blue'];
  return (
    <div className="w-full h-full relative flex items-center justify-center preserve-3d">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-64 h-64 rounded-full border border-slate-100 animate-[spin_10s_linear_infinite]"></div>
        <div className="absolute w-40 h-40 rounded-full border border-slate-100 animate-[spin_15s_linear_infinite_reverse]"></div>
      </div>
      <motion.div className={`relative z-10 w-16 h-16 rounded-full ${theme.bgDark} shadow-xl flex items-center justify-center text-white`} style={{ transform: 'translateZ(30px)' }}>
        <Globe size={24} />
      </motion.div>
      {[0, 72, 144, 216, 288].map((deg, i) => (
        <motion.div
          key={i}
          className={`absolute w-10 h-10 rounded-full bg-white shadow-lg border border-slate-100 flex items-center justify-center ${theme.textDark}`}
          style={{
            transform: `rotate(${deg}deg) translate(100px) rotate(-${deg}deg) translateZ(20px)`
          }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.1 }}
        >
          <Users size={16} />
        </motion.div>
      ))}
    </div>
  );
};

const CodeVisual = ({ color = 'blue' }: { color?: string }) => {
  const theme = THEMES[color] || THEMES['blue'];
  return (
    <div className="w-full h-full p-6 flex items-center justify-center preserve-3d">
      <div className="w-full max-w-sm bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-700" style={{ transform: 'translateZ(20px)' }}>
        <div className="bg-slate-800 p-2 flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
        </div>
        <div className="p-4 space-y-2 font-mono text-[10px]">
          <div className="flex gap-2">
            <span className="text-purple-400">const</span>
            <span className="text-blue-400">workflow</span>
            <span className="text-white">=</span>
            <span className="text-yellow-300">async</span>
            <span className="text-white">()</span>
            <span className="text-white">{'=>'}</span>
            <span className="text-white">{'{'}</span>
          </div>
          <div className="pl-4 flex gap-2">
            <span className="text-purple-400">await</span>
            <span className="text-green-400">trigger</span>
            <span className="text-white">.</span>
            <span className="text-blue-300">on</span>
            <span className="text-white">('new_lead');</span>
          </div>
          <div className="pl-4 flex gap-2">
            <span className="text-purple-400">if</span>
            <span className="text-white">(</span>
            <span className="text-blue-300">score</span>
            <span className="text-white">{'>'}</span>
            <span className="text-orange-400">80</span>
            <span className="text-white">)</span>
            <span className="text-white">{'{'}</span>
          </div>
          <div className="pl-8 flex gap-2">
            <span className="text-green-400">notify</span>
            <span className="text-white">.</span>
            <span className="text-blue-300">salesTeam</span>
            <span className="text-white">();</span>
          </div>
          <div className="pl-4 text-white">{'}'}</div>
          <div className="text-white">{'}'}</div>
        </div>
      </div>
    </div>
  );
};

// --- MAPPING LOGIC ---

const getModuleVisual = (productName: string, moduleName: string, color: string) => {
  const lowerMod = moduleName.toLowerCase();
  const lowerProd = productName.toLowerCase();

  // 1. Specific Product Overrides
  if (lowerProd.includes('flowtilla')) return <CodeVisual color={color} />;
  if (lowerProd.includes('affiliate') && (lowerMod.includes('network') || lowerMod.includes('fraud'))) return <NetworkVisual color={color} />;
  if (lowerProd.includes('operations') && (lowerMod.includes('logistics') || lowerMod.includes('transport'))) return <MapVisual color={color} />;

  // 2. General Heuristics based on Module Name
  if (lowerMod.includes('analytics') || lowerMod.includes('report') || lowerMod.includes('chart') || lowerMod.includes('dashboard')) {
    return <ChartVisual type="bar" color={color} />;
  }
  if (lowerMod.includes('pipeline') || lowerMod.includes('funnel') || lowerMod.includes('opportunity')) {
    return <PipelineVisual color={color} />;
  }
  if (lowerMod.includes('management') || lowerMod.includes('list') || lowerMod.includes('directory') || lowerMod.includes('inventory') || lowerMod.includes('employee')) {
    return <TableVisual color={color} />;
  }
  if (lowerMod.includes('project') || lowerMod.includes('task') || lowerMod.includes('kanban') || lowerMod.includes('scrum')) {
    return <KanbanVisual color={color} />;
  }
  if (lowerMod.includes('map') || lowerMod.includes('track') || lowerMod.includes('location')) {
    return <MapVisual color={color} />;
  }
  if (lowerMod.includes('invoice') || lowerMod.includes('quote') || lowerMod.includes('document') || lowerMod.includes('contract') || lowerMod.includes('certificate')) {
    return <DocumentVisual color={color} />;
  }
  if (lowerMod.includes('integration') || lowerMod.includes('api') || lowerMod.includes('workflow')) {
    return <CodeVisual color={color} />;
  }

  // 3. Fallback
  return <ChartVisual type="line" color={color} />;
};

// --- MAIN CARD COMPONENT ---

export const StackedCard: React.FC<CardProps> = ({
  app,
  index,
  total,
  scrollYProgress,
  positionRange,
  targetScale,
  isLast,
  isActive,
  onClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeModule, setActiveModule] = React.useState<string | null>(null);

  // -- TINT / OVERLAY LOGIC --
  const nextCardStart = isLast ? 1 : (index + 1) * (1 / total);
  const overlayStart = Math.max(0, nextCardStart - 0.05);
  const overlayEnd = Math.min(1, nextCardStart + 0.1);
  const overlayOpacity = useTransform(
    scrollYProgress,
    [overlayStart, overlayEnd],
    [0, isLast ? 0 : 0.6]
  );
  const scale = useTransform(
    scrollYProgress,
    positionRange,
    [1, isLast ? 1 : targetScale]
  );

  const parallaxRange = [index * (1 / total), (index + 1) * (1 / total)];
  const textParallax = useTransform(scrollYProgress, parallaxRange, [0, -20]);
  const visualParallax = useTransform(scrollYProgress, parallaxRange, [0, -40]);

  const Icon = app.icon;
  const theme = THEMES[app.color] || THEMES['blue'];

  // Mouse tilt effect logic
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseX = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseY = useSpring(y, { stiffness: 150, damping: 20 });

  const rotateX = useTransform(mouseY, [-0.5, 0.5], [15, -15]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-15, 15]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseXVal = (e.clientX - rect.left) / width - 0.5;
    const mouseYVal = (e.clientY - rect.top) / height - 0.5;
    x.set(mouseXVal);
    y.set(mouseYVal);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const renderVisual = () => {
    if (activeModule) {
      return getModuleVisual(app.name, activeModule, app.color);
    }
    // Default fallback to first feature or specific visual
    const firstFeature = app.features[0];
    const firstFeatureName = typeof firstFeature === 'string' ? firstFeature : firstFeature.title;
    return getModuleVisual(app.name, firstFeatureName, app.color);
  };

  return (
    <div
      ref={containerRef}
      className="h-screen flex items-center justify-center sticky top-0 py-6"
    >
      <motion.div
        style={{
          scale,
          zIndex: index,
          transformOrigin: "top center",
        }}
        className="relative w-full max-w-[95vw] lg:max-w-[1400px] h-[85vh] flex flex-col will-change-transform"
      >

        <div className={`relative w-full h-full bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 flex flex-col lg:flex-row isolate ${isLast ? 'shadow-none' : ''} cursor-pointer transition-all duration-300 ${isActive ? 'ring-2 ring-blue-500 shadow-blue-500/20' : 'hover:shadow-xl hover:shadow-slate-500/10'}`} onClick={onClick}>

          {/* Dimming Overlay */}
          <motion.div
            style={{ opacity: overlayOpacity }}
            className="absolute inset-0 bg-slate-950 pointer-events-none z-50 rounded-[2rem]"
            aria-hidden="true"
          />

          {/* --- LEFT SIDE: Content --- */}
          <motion.div
            style={{ y: textParallax }}
            className="w-full lg:w-[40%] p-8 md:p-10 flex flex-col relative z-20 bg-white border-r border-slate-100"
          >
            {/* Header Pill */}
            <div className="flex items-center space-x-3 mb-4">
              <div className={`w-10 h-10 rounded-xl ${theme.bgMedium} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${theme.textDark}`} />
              </div>
              <span className={`text-xs font-bold tracking-wider ${theme.textDark} uppercase bg-slate-50 px-3 py-1 rounded-full border border-slate-100`}>
                Enterprise Suite
              </span>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-2 leading-tight">
              {app.name}
            </h2>

            <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">
              {app.tagline}
            </p>

            {/* Clickable Modules List */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-2 no-scrollbar">
              <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Available Modules</p>
              {app.features.map((feature: string | { title: string }, i: number) => {
                const featureName = typeof feature === 'string' ? feature : feature.title;
                return (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveModule(featureName);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-between group
                    ${activeModule === featureName
                        ? `${theme.bgMedium} ${theme.textDark} shadow-sm ring-1 ring-${app.color}-200`
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }
                  `}
                  >
                    <span>{featureName}</span>
                    {activeModule === featureName && (
                      <motion.div layoutId={`active-check-${app.id}`} initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <Check className="w-4 h-4" />
                      </motion.div>
                    )}
                    {activeModule !== featureName && (
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-50 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    )}
                  </button>
                )
              })}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-slate-900">{app.stats[0].value}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{app.stats[0].label}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `/products/${app.id}`;
                }}
                className={`flex items-center justify-center px-5 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-${app.color}-600 transition-colors font-semibold text-sm group`}
              >
                Know More <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>

          {/* --- RIGHT SIDE: Dynamic Visuals --- */}
          <div
            className={`w-full lg:w-[60%] relative overflow-hidden bg-white flex items-center justify-center p-6 md:p-12 perspective-1000`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Background Glows */}
            <div className="absolute inset-0 pointer-events-none">
              <motion.div
                style={{ x: useTransform(mouseX, [-0.5, 0.5], [-20, 20]), y: useTransform(mouseY, [-0.5, 0.5], [-20, 20]) }}
                className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"
              />
              <motion.div
                style={{ x: useTransform(mouseX, [-0.5, 0.5], [20, -20]), y: useTransform(mouseY, [-0.5, 0.5], [20, -20]) }}
                className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-black/5 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2"
              />
            </div>

            {/* Visual Container with Parallax & Tilt */}
            <motion.div
              style={{
                y: visualParallax,
                rotateX,
                rotateY,
                transformStyle: 'preserve-3d'
              }}
              className="relative w-full max-w-2xl aspect-[16/10] z-10"
            >
              {/* Glass Card Container */}
              <div
                className="w-full h-full bg-white/40 backdrop-blur-xl rounded-2xl border border-white/40 shadow-2xl overflow-hidden relative preserve-3d"
                style={{ transform: 'translateZ(0)' }}
              >
                {/* Inner Highlight Border */}
                <div className="absolute inset-0 border border-white/50 rounded-2xl pointer-events-none z-50"></div>

                {/* Render Specific App Visual */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeModule || 'default'}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full"
                  >
                    {renderVisual()}
                  </motion.div>
                </AnimatePresence>

              </div>

              {/* Decorative Back Layer for depth */}
              <motion.div
                style={{
                  rotateX: useTransform(rotateX, v => -v * 0.5),
                  rotateY: useTransform(rotateY, v => -v * 0.5),
                  z: -50
                }}
                className="absolute -inset-3 bg-white/10 rounded-[2rem] -z-10 blur-md transform translate-y-4 scale-95"
              ></motion.div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

interface StackedCardsSectionProps {
  businessApps: BusinessApp[];
  activeProduct?: Product;
  onProductChange?: (product: Product) => void;
}

export const StackedCardsSection: React.FC<StackedCardsSectionProps> = ({
  businessApps,
  activeProduct,
  onProductChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end']
  });

  const totalCards = businessApps.length;

  // Increase height slightly to ensure smooth scrolling
  const totalHeight = `${totalCards * 100}vh`;

  return (
    <div className="bg-slate-50 relative z-10">
      <div
        ref={containerRef}
        className="relative px-4"
        style={{ height: totalHeight }}
      >
        {businessApps.map((app, index) => {
          // Logic for stacking scale:
          // Last card (top of stack) stays at scale 1.
          // Bottom card scales down the most.
          const targetScale = 1 - ((totalCards - 1 - index) * 0.05);

          // Logic for animation timing:
          // Card i animates (recedes) while Card i+1 is scrolling up to cover it.
          // Card i+1 covers Card i during the scroll interval [i/total, (i+1)/total].
          const rangeStart = index * (1 / totalCards);
          const rangeEnd = (index + 1) * (1 / totalCards);

          // The last card should not recede/dim, so we pass a dummy range or handle in component
          const isLast = index === totalCards - 1;

          // Convert BusinessApp to Product for comparison
          const product: Product = {
            id: app.id,
            name: app.name,
            tagline: app.tagline,
            iconName: app.name.toLowerCase().replace(/\s+/g, ''),
            gradient: app.gradient,
            color: app.color,
            features: app.features,
            stats: app.stats
          };

          return (
            <StackedCard
              key={app.id}
              app={app}
              index={index}
              total={totalCards}
              scrollYProgress={scrollYProgress}
              positionRange={[rangeStart, rangeEnd]}
              targetScale={targetScale}
              isLast={isLast}
              isActive={activeProduct ? activeProduct.id === app.id : false}
              onClick={() => onProductChange?.(product)}
            />
          );
        })}
      </div>

      {/* Spacer to allow the final card to be viewed comfortably */}
      <div className="h-[20vh]" />
    </div>
  );
};






