import { cn } from "@/lib/utils";
import { IconLayoutNavbarCollapse } from "@tabler/icons-react";
import {
  AnimatePresence,
  MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";

import { useRef, useState } from "react";

export type DockMode = "dock" | "sidebar";

export const FloatingDock = ({
  items,
  desktopClassName,
  mobileClassName,
  mode = "dock",
  glassy = false,
}: {
  items: { title: string; icon: React.ReactNode; href: string; onClick?: () => void }[];
  desktopClassName?: string;
  mobileClassName?: string;
  mode?: DockMode;
  glassy?: boolean;
}) => {
  if (mode === "sidebar") {
    return <FloatingDockSidebar items={items} className={desktopClassName} />;
  }

  return (
    <>
      <FloatingDockDesktop items={items} className={desktopClassName} glassy={glassy} />
      <FloatingDockMobile items={items} className={mobileClassName} />
    </>
  );
};

const FloatingDockMobile = ({
  items,
  className,
}: {
  items: { title: string; icon: React.ReactNode; href: string; onClick?: () => void }[];
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("relative block md:hidden", className)}>
      <AnimatePresence>
        {open && (
          <motion.div
            layoutId="nav"
            className="absolute inset-x-0 bottom-full mb-2 flex flex-col gap-2"
          >
            {items.map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: 10,
                  transition: {
                    delay: idx * 0.05,
                  },
                }}
                transition={{ delay: (items.length - 1 - idx) * 0.05 }}
              >
                <div
                  onClick={item.onClick}
                  style={{ cursor: item.onClick ? 'pointer' : 'default' }}
                  className="flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-sm bg-white/30 dark:bg-slate-800/60 border border-white/40 dark:border-slate-600/50"
                >
                  <div className="h-4 w-4">{item.icon}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 dark:bg-neutral-800"
      >
        <IconLayoutNavbarCollapse className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
      </button>
    </div>
  );
};

const FloatingDockDesktop = ({
  items,
  className,
  glassy = false,
}: {
  items: { title: string; icon: React.ReactNode; href: string; onClick?: () => void }[];
  className?: string;
  glassy?: boolean;
}) => {
  let mouseX = useMotionValue(Infinity);
  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        glassy
          ? "mx-auto hidden h-20 items-end gap-12 rounded-2xl backdrop-blur-3xl bg-purple-100/6 dark:bg-purple-900/8 px-4 pb-3 md:flex border border-purple-300/60 dark:border-purple-600/50 shadow-2xl ring-1 ring-purple-300/35 dark:ring-purple-600/25"
          : "mx-auto hidden h-20 items-end gap-12 rounded-2xl bg-white dark:bg-black px-4 pb-3 md:flex border border-gray-200 dark:border-gray-700 shadow-lg",
        className,
      )}
    >
      {/* Navigation Items */}
      <div className="flex items-end gap-12">
        {items.slice(0, Math.ceil(items.length / 2)).map((item) => (
          <IconContainer mouseX={mouseX} key={item.title} glassy={glassy} {...item} />
        ))}
      </div>

      {/* Zopkit Branding */}
      <div className={`flex flex-col items-center justify-end px-6 py-2 mx-4 rounded-lg border shadow-lg ${glassy ? 'backdrop-blur-3xl bg-purple-100/5 dark:bg-purple-900/6 border-purple-300/50 dark:border-purple-600/40 ring-1 ring-purple-300/25 dark:ring-purple-600/15' : 'bg-white dark:bg-black border-gray-200 dark:border-gray-700'}`}>
        <div className="text-2xl font-bold text-neutral-600 dark:text-slate-200 tracking-wider">
          ZOPKIT
        </div>
        <div className="w-8 h-1 bg-gradient-to-r from-emerald-400 to-teal-400 dark:from-emerald-300 dark:to-teal-300 rounded-full mt-1 shadow-sm"></div>
      </div>

      {/* Navigation Items */}
      <div className="flex items-end gap-12">
        {items.slice(Math.ceil(items.length / 2)).map((item) => (
          <IconContainer mouseX={mouseX} key={item.title} glassy={glassy} {...item} />
        ))}
      </div>
    </motion.div>
  );
};

const FloatingDockSidebar = ({
  items,
  className,
}: {
  items: { title: string; icon: React.ReactNode; href: string; onClick?: () => void }[];
  className?: string;
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <motion.div
      className={cn(
        "flex flex-col h-screen backdrop-blur-xl bg-white/10 dark:bg-slate-900/20 border-r border-white/30 dark:border-slate-700/40",
        isCollapsed ? "w-16" : "w-64",
        className
      )}
      initial={false}
      animate={{ width: isCollapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-neutral-800">
        {!isCollapsed && (
          <motion.h2
            className="text-lg font-semibold text-neutral-900 dark:text-neutral-100"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Navigation
          </motion.h2>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <IconLayoutNavbarCollapse
            className={cn(
              "h-5 w-5 text-neutral-500 dark:text-neutral-400 transition-transform",
              isCollapsed ? "rotate-180" : ""
            )}
          />
        </button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 py-4 space-y-2 px-2">
        {items.map((item, idx) => (
            <motion.div
            key={item.title}
            onClick={item.onClick}
            className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-lg backdrop-blur-sm bg-white/5 dark:bg-slate-800/20 hover:bg-white/20 dark:hover:bg-slate-700/30 transition-all duration-200 border border-transparent hover:border-white/20 dark:hover:border-slate-600/30 group",
              isCollapsed ? "justify-center" : "",
              item.onClick ? "cursor-pointer" : ""
            )}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <div className={cn(
              "flex-shrink-0",
              isCollapsed ? "h-6 w-6" : "h-5 w-5"
            )}>
              {item.icon}
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {item.title}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

function IconContainer({
  mouseX,
  title,
  icon,
  onClick,
  glassy = false,
}: {
  mouseX: MotionValue;
  title: string;
  icon: React.ReactNode;
  onClick?: () => void;
  glassy?: boolean;
}) {
  let ref = useRef<HTMLDivElement>(null);

  let distance = useTransform(mouseX, (val) => {
    let bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };

    return val - bounds.x - bounds.width / 2;
  });

  let widthTransform = useTransform(distance, [-150, 0, 150], [50, 100, 50]);
  let heightTransform = useTransform(distance, [-150, 0, 150], [50, 100, 50]);

  let widthTransformIcon = useTransform(distance, [-150, 0, 150], [25, 50, 25]);
  let heightTransformIcon = useTransform(
    distance,
    [-150, 0, 150],
    [25, 50, 25],
  );

  let width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  let height = useSpring(heightTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  let widthIcon = useSpring(widthTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  let heightIcon = useSpring(heightTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <motion.div
        ref={ref}
        style={{ width, height }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`relative flex aspect-square items-center justify-center rounded-full border ${glassy ? 'backdrop-blur-3xl bg-purple-100/8 dark:bg-purple-800/15 border-purple-300/60 dark:border-purple-600/50 ring-1 ring-purple-300/30 dark:ring-purple-600/20' : 'bg-white dark:bg-black border-gray-200 dark:border-gray-700'}`}
      >
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 10, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 2, x: "-50%" }}
              className="absolute -top-8 left-1/2 w-fit rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs whitespace-pre text-neutral-700 dark:border-neutral-900 dark:bg-neutral-800 dark:text-white"
            >
              {title}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          style={{ width: widthIcon, height: heightIcon }}
          className="flex items-center justify-center"
        >
          {icon}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
