import React from "react";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { getAvatarColor, stringToColor } from "@/utils/common";
import { useTheme } from "./theme-provider";

// List of tailwind background + text color pairs
const colorPairs = [
  { bg: "bg-red-100 hover:bg-red-200", text: "text-red-800" },
  { bg: "bg-green-100 hover:bg-green-200", text: "text-green-800" },
  { bg: "bg-blue-100 hover:bg-blue-200", text: "text-blue-800" },
  { bg: "bg-yellow-100 hover:bg-yellow-200", text: "text-yellow-800" },
  { bg: "bg-purple-100 hover:bg-purple-200", text: "text-purple-800" },
  { bg: "bg-pink-100 hover:bg-pink-200", text: "text-pink-800" },
  { bg: "bg-indigo-100 hover:bg-indigo-200", text: "text-indigo-800" },
  { bg: "bg-teal-100 hover:bg-teal-200", text: "text-teal-800" },
];

function getColorIndex(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % colorPairs.length;
}

export type ColorBadgeProps = {
  value: string;
  children: React.ReactNode;
  className?: string;
};

const ColorBadge: React.FC<ColorBadgeProps> = ({ value, children, className }) => {
  const { theme } = useTheme();
  const index = value ? getColorIndex(value) : 0;
  const { bg, text } = colorPairs[index];
  const bgColor = value ? getAvatarColor(value, theme === "dark" ? 0.2 : 0) : '';
  const textColor = value ? getAvatarColor(value, theme === "dark" ? 1 : 0.8) : '';
  return <Badge className={cn("capitalize text-nowrap", bg, text, className)} style={{ backgroundColor: bgColor, color: textColor }}>{children}</Badge>;
};

export default ColorBadge;
