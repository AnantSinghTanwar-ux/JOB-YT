'use client';

import { useRouter } from 'next/navigation';
import { Notification } from '@/types';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

// Maps notification type to an icon emoji and color class
const TYPE_META: Record<string, { icon: string; color: string }> = {
  application_submitted:     { icon: '📝', color: 'bg-blue-50' },
  application_status:        { icon: '📋', color: 'bg-indigo-50' },
  interview_invited:         { icon: '📅', color: 'bg-violet-50' },
  interview_reminder_24h:    { icon: '⏰', color: 'bg-purple-50' },
  interview_reminder_2h:     { icon: '🔔', color: 'bg-purple-50' },
  employer_broadcast:        { icon: '📢', color: 'bg-amber-50' },
  deadline_alert:            { icon: '⚡', color: 'bg-orange-50' },
  auto_apply_digest:         { icon: '🤖', color: 'bg-teal-50' },
  daily_recommendation:      { icon: '✨', color: 'bg-sky-50' },
  low_credit:                { icon: '💳', color: 'bg-yellow-50' },
  credits_exhausted:         { icon: '⚠️', color: 'bg-red-50' },
  subscription_expiry_7d:    { icon: '📅', color: 'bg-pink-50' },
  subscription_expiry_3d:    { icon: '📅', color: 'bg-pink-50' },
  subscription_expiry_1d:    { icon: '🚨', color: 'bg-red-50' },
  job_match:                 { icon: '🎯', color: 'bg-green-50' },
  new_message:               { icon: '💬', color: 'bg-slate-50' },
  referral_joined:           { icon: '🎉', color: 'bg-lime-50' },
  payment_success:           { icon: '✅', color: 'bg-green-50' },
  payment_failed:            { icon: '❌', color: 'bg-red-50' },
  interview_cancelled:       { icon: '🚫', color: 'bg-red-50' },
};

const DEFAULT_META = { icon: '🔔', color: 'bg-slate-50' };

interface NotificationListProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const NotificationList = ({ notifications, onMarkRead, onDelete }: NotificationListProps) => {
  const router = useRouter();

  if (!notifications.length) {
    return <p className="py-8 text-center text-sm text-gray-400">No notifications yet.</p>;
  }

  const handleClick = async (notification: Notification) => {
    if (!notification.read) {
      await onMarkRead(notification.id);
    }
    if (notification.action_url) {
      router.push(notification.action_url);
    }
  };

  return (
    <div className="flex flex-col divide-y divide-gray-100">
      {notifications.map((n) => {
        const meta = TYPE_META[n.type] ?? DEFAULT_META;
        return (
          <div
            key={n.id}
            className={cn('flex gap-3 px-4 py-3 group transition-colors', !n.read ? 'bg-blue-50/60' : 'hover:bg-gray-50')}
          >
            {/* Icon */}
            <div className={cn('mt-0.5 h-8 w-8 shrink-0 rounded-xl flex items-center justify-center text-base', meta.color)}>
              {meta.icon}
            </div>

            {/* Content — clickable area */}
            <button
              type="button"
              className="flex-1 text-left min-w-0"
              onClick={() => void handleClick(n)}
            >
              <p className={cn('text-sm leading-snug', !n.read ? 'font-semibold text-gray-900' : 'text-gray-700')}>{n.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
              <p className="mt-1 text-xs text-gray-400">{formatDate(n.created_at)}</p>
            </button>

            {/* Right side: unread dot + delete */}
            <div className="flex flex-col items-center gap-2 pt-1 shrink-0">
              {!n.read && <span className="h-2 w-2 rounded-full bg-blue-500" />}
              {onDelete && (
                <button
                  type="button"
                  title="Delete notification"
                  onClick={(e) => { e.stopPropagation(); void onDelete(n.id); }}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-xs leading-none mt-auto"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
