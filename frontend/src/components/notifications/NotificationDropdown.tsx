import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { FaBell, FaCheck, FaTimes } from 'react-icons/fa';
import { useNotifications } from '@/hooks/useNotifications';
import { ROUTES } from '@/constants';
import { formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { notifications, unread, fetchNotifications, markRead, markAllRead } = useNotifications();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleNotificationClick = (notif: any) => {
    if (!notif.read) markRead(notif.id);
    setIsOpen(false);
    if (notif.action_url) {
      router.push(notif.action_url);
    }
  };

  const latestNotifications = notifications.slice(0, 10);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all focus:outline-none"
      >
        <FaBell className="text-lg" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full shadow-sm">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 z-50">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unread > 0 && (
              <button
                onClick={() => void markAllRead()}
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {latestNotifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                No new notifications
              </div>
            ) : (
              latestNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`cursor-pointer border-b p-4 transition-colors hover:bg-gray-50 ${!notif.read ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="flex gap-3">
                    <div className="flex-1 space-y-1">
                      <p className={`text-sm ${!notif.read ? 'font-semibold text-gray-900' : 'text-gray-800'}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-gray-600 line-clamp-2">{notif.body}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{formatDate(notif.created_at)}</p>
                    </div>
                    {!notif.read && (
                      <div className="mt-1 h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t p-2">
            <Link
              href={ROUTES.notifications}
              onClick={() => setIsOpen(false)}
              className="block w-full rounded-lg py-2 text-center text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
            >
              View All Notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
