import React, { useState } from 'react';
import { NotificationBell } from './NotificationBell';
import { NotificationPanel } from './NotificationPanel';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationManagerProps {
  className?: string;
}

export const NotificationManager: React.FC<NotificationManagerProps> = ({
  className
}) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAsDismissed,
    markAllAsRead
  } = useNotifications();

  const handleBellClick = () => {
    setIsPanelOpen(true);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
  };

  return (
    <>
      <NotificationBell
        unreadCount={unreadCount}
        onClick={handleBellClick}
        className={className}
      />

      <NotificationPanel
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onDismiss={markAsDismissed}
        onMarkAllAsRead={markAllAsRead}
        loading={loading}
      />
    </>
  );
};
