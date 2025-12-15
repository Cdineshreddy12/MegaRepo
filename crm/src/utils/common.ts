import { BaseUser, SelectOption } from '@/types/common'
import {formatName } from '@/utils/format'

import uniqBy from 'lodash/uniqBy'

export function deleteProperties(
  obj: { [x: string]: number | string },
  properties: (number | string)[]
) {
  properties.forEach((property: string | number) => {
    if (Object.prototype.hasOwnProperty.call(obj, property)) {
      delete obj[property];
    }
  });
  return obj;
}

type BaseUserWithUserId = BaseUser & { userId: string }
export function getUniqueUsers<T extends BaseUserWithUserId>(data: T[], by: keyof T) {
  return uniqBy(
    data?.map((user) => ({
      id: user.userId || user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    })),
    by
  );
}


export function getUserOptions(users: BaseUserWithUserId[]): SelectOption[] {
  return users.map((user) => ({
    label: `${formatName(user, "FN-LN")}`,
    value: user.userId,
  }));
}

export const toSnakeCase = (str: string) => {
  return str.replace(/\W+/g, ' ')
      .split(/ |\B(?=[A-Z])/)
      .map(word => word.toLowerCase())
      .join('_');
};

export const toPrettyString = (str: string) => {
  if (!str) return str;
  return str.replace(/_/g, ' ');
  
};

export const isAdmin = (userRole: string) => {
  return userRole === 'admin' || userRole === 'super_admin';
}

export function stringToColor(str: string): string {
  let hash = 0;

  // Create hash from string
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert hash to hex color
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += value.toString(16).padStart(2, '0');
  }

  return color;
}

function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((num >> 16) + 255 * percent) | 0);
  const g = Math.min(255, (((num >> 8) & 0x00ff) + 255 * percent) | 0);
  const b = Math.min(255, ((num & 0x0000ff) + 255 * percent) | 0);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export  const getAvatarColor = (initials: string, percent: number = 0.5) => lightenColor(stringToColor(initials), percent); // Light pastel

