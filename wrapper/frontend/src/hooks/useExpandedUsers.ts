import { useState } from 'react';

export function useExpandedUsers() {
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const toggleUserExpansion = (userId: string) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const expandAll = (userIds: string[]) => {
    setExpandedUsers(new Set(userIds));
  };

  const collapseAll = () => {
    setExpandedUsers(new Set());
  };

  const isExpanded = (userId: string) => {
    return expandedUsers.has(userId);
  };

  return {
    expandedUsers,
    toggleUserExpansion,
    expandAll,
    collapseAll,
    isExpanded
  };
}
