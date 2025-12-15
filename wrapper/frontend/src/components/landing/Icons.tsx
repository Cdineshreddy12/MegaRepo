import React from 'react';

import { Building2, Users, Briefcase, Cog, DollarSign, GraduationCap, LucideIcon } from 'lucide-react';

export const iconMap: Record<string, LucideIcon> = {
  'Building2': Building2,
  'Users': Users,
  'Briefcase': Briefcase,
  'Cog': Cog,
  'DollarSign': DollarSign,
  'GraduationCap': GraduationCap,
};

interface IconProps {
  name: string;
  className?: string;
}

export const DynamicIcon: React.FC<IconProps> = ({ name, className }) => {
  const IconComponent = iconMap[name] || Building2;
  return <IconComponent className={className} />;
};







