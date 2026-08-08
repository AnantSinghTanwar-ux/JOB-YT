'use client';

import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';
import { Notification } from '@/types';
import { getSocket } from '@/lib/socket';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await api.getPaginated<Notification>(`/notifications?page=${page}&limit=20`);
      setNotifications(res.data ?? []);
      setUnread((res as unknown as { unread: number }).unread ?? res.unread ?? 0);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (error) {
      console.error('[useNotifications] Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleNotification = (newNotification: Notification) => {
      setNotifications(prev => [newNotification, ...prev]);
      setUnread(prev => prev + 1);
    };

    const socket = getSocket();
    if (socket) {
      socket.on('notification', handleNotification);
    }

    return () => {
      if (socket) {
        socket.off('notification', handleNotification);
      }
    };
  }, []);

  const markRead = useCallback(async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await api.patch('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    await api.delete(`/notifications/${id}`);
    setNotifications((prev) => {
      const deleted = prev.find((n) => n.id === id);
      if (deleted && !deleted.read) {
        setUnread((c) => Math.max(0, c - 1));
      }
      return prev.filter((n) => n.id !== id);
    });
  }, []);

  return { notifications, unread, isLoading, pagination, fetchNotifications, markRead, markAllRead, deleteNotification };
};

