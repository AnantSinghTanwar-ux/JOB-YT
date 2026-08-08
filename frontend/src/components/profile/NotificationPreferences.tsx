'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '@/lib/api';
import { Spinner } from '@/components/ui';
import toast from 'react-hot-toast';

import { usePushNotifications } from '@/hooks/usePushNotifications';

type EventPreference = {
  event_type: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  whatsapp_enabled: boolean;
};

// Define the display groupings and labels
const PREFERENCE_GROUPS = [
  {
    category: "Applications & Interviews",
    events: [
      { id: "application_submitted", label: "Application Submitted" },
      { id: "application_status", label: "Status Updates" },
      { id: "interview_invited", label: "Interview Invitations" },
      { id: "interview_reminder_24h", label: "24h Interview Reminders" },
      { id: "interview_reminder_2h", label: "2h Interview Reminders" },
    ]
  },
  {
    category: "Auto-Apply & Deadlines",
    events: [
      { id: "auto_apply_digest", label: "Daily Auto-Apply Digest" },
      { id: "deadline_alert", label: "Saved Job Deadline Alerts" },
    ]
  },
  {
    category: "Billing & Account",
    events: [
      { id: "credits_exhausted", label: "Credits Exhausted" },
      { id: "low_credit", label: "Low Credit Alerts" },
      { id: "subscription_expiry_7d", label: "Subscription Expiry (7 Days)" },
    ]
  },
  {
    category: "Marketing & Broadcasts",
    events: [
      { id: "employer_broadcast", label: "Employer Broadcasts & Marketing" },
    ]
  }
];

export function NotificationPreferences() {
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<Record<string, EventPreference>>({});
  
  // DND State
  const [dndEnabled, setDndEnabled] = useState(false);
  const [dndStartTime, setDndStartTime] = useState('22:00');
  const [dndEndTime, setDndEndTime] = useState('08:00');
  const [dndTimezone, setDndTimezone] = useState('');
  const [dndSaving, setDndSaving] = useState(false);

  const { subscribeToPush, isSubscribing } = usePushNotifications();

  const fetchPreferences = useCallback(async () => {
    try {
      const [res, dndRes] = await Promise.all([
        api.get<{ success: boolean; preferences: EventPreference[] }>('/notification-preferences'),
        api.get<{ success: boolean; dnd: any }>('/notification-preferences/dnd')
      ]);
      
      const prefMap: Record<string, EventPreference> = {};
      
      // Default template if missing
      const createDefault = (type: string): EventPreference => ({
        event_type: type,
        in_app_enabled: true,
        email_enabled: true,
        push_enabled: false, // Default to false until permission granted
        whatsapp_enabled: false // default false for WhatsApp
      });

      // Populate map from API
      if (res.data?.preferences) {
        res.data.preferences.forEach(p => prefMap[p.event_type] = p);
      }

      // Ensure all grouped events have an entry
      PREFERENCE_GROUPS.forEach(group => {
        group.events.forEach(event => {
          if (!prefMap[event.id]) {
            prefMap[event.id] = createDefault(event.id);
          }
        });
      });

      setPreferences(prefMap);

      if (dndRes.data?.dnd) {
        setDndEnabled(dndRes.data.dnd.dnd_enabled);
        setDndStartTime(dndRes.data.dnd.dnd_start_time || '22:00');
        setDndEndTime(dndRes.data.dnd.dnd_end_time || '08:00');
        setDndTimezone(dndRes.data.dnd.dnd_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
      } else {
        setDndTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
      }
    } catch (err) {
      console.error('Failed to load preferences', err);
      toast.error('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPreferences();
  }, [fetchPreferences]);

  const handleToggle = async (eventType: string, channel: 'in_app_enabled' | 'email_enabled' | 'push_enabled' | 'whatsapp_enabled', currentVal: boolean) => {
    const newVal = !currentVal;
    
    // Optimistic update - immediately move the toggle
    setPreferences(prev => ({
      ...prev,
      [eventType]: {
        ...prev[eventType],
        [channel]: newVal
      }
    }));

    // If they are turning ON push notifications, trigger the subscription flow
    if (channel === 'push_enabled' && newVal === true) {
      const success = await subscribeToPush();
      if (!success) {
        toast.error('Push permission denied. Make sure you are on localhost or HTTPS.');
        // Delay revert so the user visually sees the toggle try to move
        setTimeout(() => {
          setPreferences(prev => ({
            ...prev,
            [eventType]: {
              ...prev[eventType],
              [channel]: currentVal
            }
          }));
        }, 500);
        return; // Abort further updates
      }
    }

    try {
      const payload = {
        in_app_enabled: channel === 'in_app_enabled' ? newVal : preferences[eventType].in_app_enabled,
        email_enabled: channel === 'email_enabled' ? newVal : preferences[eventType].email_enabled,
        push_enabled: channel === 'push_enabled' ? newVal : preferences[eventType].push_enabled,
        whatsapp_enabled: channel === 'whatsapp_enabled' ? newVal : preferences[eventType].whatsapp_enabled,
      };
      
      await api.put(`/notification-preferences/${eventType}`, payload);
      toast.success('Preference updated');
    } catch (err) {
      toast.error('Failed to update preference');
      // Revert on fail
      setPreferences(prev => ({
        ...prev,
        [eventType]: {
          ...prev[eventType],
          [channel]: currentVal
        }
      }));
    }
  };

  if (loading) {
    return <div className="flex justify-center p-6"><Spinner size="sm" /></div>;
  }

  const handleSaveDnd = async () => {
    setDndSaving(true);
    try {
      await api.put('/notification-preferences/dnd', {
        dnd_enabled: dndEnabled,
        dnd_start_time: dndStartTime,
        dnd_end_time: dndEndTime,
        dnd_timezone: dndTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      toast.success('Do Not Disturb settings saved');
    } catch (err) {
      toast.error('Failed to save DND settings');
    } finally {
      setDndSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-[20px] p-6 shadow-sm border border-[#e8e4db] w-full">
      <h3 className="font-normal text-black mb-1 text-[18px] leading-6">Notification Preferences</h3>
      <p className="text-sm text-gray-500 mb-8">Granular control over how you receive alerts and updates.</p>
      
      {/* DND Section */}
      <div className="mb-10 p-5 rounded-xl border border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-medium text-gray-900">Do Not Disturb</h4>
            <p className="text-sm text-gray-500">Pause non-critical notifications during these hours.</p>
          </div>
          <button
            onClick={async () => {
              const newState = !dndEnabled;
              setDndEnabled(newState);
              
              // If turning off DND, save immediately so they don't have to click a hidden button
              if (!newState) {
                setDndSaving(true);
                try {
                  await api.put('/notification-preferences/dnd', {
                    dnd_enabled: false,
                    dnd_start_time: dndStartTime,
                    dnd_end_time: dndEndTime,
                    dnd_timezone: dndTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                  });
                  toast.success('Do Not Disturb disabled');
                } catch (err) {
                  toast.error('Failed to disable DND');
                  setDndEnabled(true); // revert
                } finally {
                  setDndSaving(false);
                }
              }
            }}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${dndEnabled ? 'bg-[#c3ff3d]' : 'bg-gray-200'}`}
          >
            <span 
              className="absolute top-[0px] left-[0px] h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out" 
              style={{ transform: dndEnabled ? 'translateX(20px)' : 'translateX(0px)' }}
            />
          </button>
        </div>

        {dndEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mt-4 animate-in fade-in slide-in-from-top-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Time</label>
              <input 
                type="time" 
                value={dndStartTime}
                onChange={(e) => setDndStartTime(e.target.value)}
                className="w-full rounded-lg border-gray-200 text-sm focus:ring-[#c3ff3d] focus:border-[#c3ff3d]" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Time</label>
              <input 
                type="time" 
                value={dndEndTime}
                onChange={(e) => setDndEndTime(e.target.value)}
                className="w-full rounded-lg border-gray-200 text-sm focus:ring-[#c3ff3d] focus:border-[#c3ff3d]" 
              />
            </div>
            <div>
              <button 
                onClick={handleSaveDnd}
                disabled={dndSaving}
                className="w-full py-2 px-4 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {dndSaving ? 'Saving...' : 'Save DND Schedule'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-8">
        {PREFERENCE_GROUPS.map((group) => (
          <div key={group.category} className="space-y-4">
            <h4 className="font-medium text-gray-900 border-b border-gray-100 pb-2">{group.category}</h4>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-gray-500">
                    <th className="pb-3 font-normal">Event</th>
                    <th className="pb-3 font-normal text-center">In-App</th>
                    <th className="pb-3 font-normal text-center">Email</th>
                    <th className="pb-3 font-normal text-center">Push</th>
                    <th className="pb-3 font-normal text-center">WhatsApp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {group.events.map(event => {
                    const pref = preferences[event.id];
                    return (
                      <tr key={event.id}>
                        <td className="py-3 text-gray-800">{event.label}</td>
                        
                        {/* In-App Toggle */}
                        <td className="py-3 text-center">
                          <button
                            onClick={() => handleToggle(event.id, 'in_app_enabled', pref.in_app_enabled)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${pref.in_app_enabled ? 'bg-[#c3ff3d]' : 'bg-gray-200'}`}
                          >
                            <span 
                              className="absolute top-[0px] left-[0px] h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out" 
                              style={{ transform: pref.in_app_enabled ? 'translateX(20px)' : 'translateX(0px)' }}
                            />
                          </button>
                        </td>

                        {/* Email Toggle */}
                        <td className="py-3 text-center">
                          <button
                            onClick={() => handleToggle(event.id, 'email_enabled', pref.email_enabled)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${pref.email_enabled ? 'bg-[#c3ff3d]' : 'bg-gray-200'}`}
                          >
                            <span 
                              className="absolute top-[0px] left-[0px] h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out" 
                              style={{ transform: pref.email_enabled ? 'translateX(20px)' : 'translateX(0px)' }}
                            />
                          </button>
                        </td>

                        {/* Push Toggle */}
                        <td className="py-3 text-center">
                          <button
                            onClick={() => handleToggle(event.id, 'push_enabled', pref.push_enabled)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${pref.push_enabled ? 'bg-[#c3ff3d]' : 'bg-gray-200'}`}
                          >
                            <span 
                              className="absolute top-[0px] left-[0px] h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out" 
                              style={{ transform: pref.push_enabled ? 'translateX(20px)' : 'translateX(0px)' }}
                            />
                          </button>
                        </td>

                        {/* WhatsApp Toggle */}
                        <td className="py-3 text-center">
                          <button
                            onClick={() => handleToggle(event.id, 'whatsapp_enabled', pref.whatsapp_enabled)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${pref.whatsapp_enabled ? 'bg-[#c3ff3d]' : 'bg-gray-200'}`}
                          >
                            <span 
                              className="absolute top-[0px] left-[0px] h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out" 
                              style={{ transform: pref.whatsapp_enabled ? 'translateX(20px)' : 'translateX(0px)' }}
                            />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
