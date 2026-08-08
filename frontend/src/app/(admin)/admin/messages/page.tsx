'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api';
import { Spinner } from '@/components/ui';
import { resolveAssetUrl } from '@/lib/assetUrl';
import { FaArrowLeft, FaMagnifyingGlass } from 'react-icons/fa6';
import { ROUTES } from '@/constants';
import { useAuthStore } from '@/store/auth.store';

interface User {
  id: string;
  name: string;
  email: string;
}

interface ConversationDetail {
  id: string;
  recruiter_id: string;
  applicant_id: string;
  job_id: string | null;
  recruiter?: User;
  applicant?: User;
  last_message_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

interface SendMessageData {
  message?: Message;
}

interface Conversation {
  id: string;
  recruiter_id: string;
  applicant_id: string;
  job_id: string | null;
  last_message_at: string;
  last_message?: string;
  participant?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    avatar?: string | null;
    logo_url?: string | null;
  };
  unread?: boolean;
}

interface PublicUserProfile {
  id: string;
  email?: string;
  role?: string;
  profile?: {
    name?: string | null;
    companyName?: string | null;
    photo_url?: string | null;
    logo_url?: string | null;
  };
}

const getInitials = (name: string): string => {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
};

const formatTime = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString();
};

const toTime = (value?: string | null) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

export default function AdminMessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialConversationId = searchParams.get('conversationId');
  const { user } = useAuthStore();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get<any>('/messages/conversations');
      const rawConversations = Array.isArray(res.data?.conversations)
        ? res.data.conversations
        : Array.isArray(res.data)
          ? res.data
          : [];

      const participantIds = [...new Set(
        rawConversations
          .map((conv: Conversation) => conv.applicant_id)
          .filter((id: string | undefined) => Boolean(id)),
      )] as string[];

      const profileEntries = await Promise.all(
        participantIds.map(async (id) => {
          try {
            const profileRes = await api.get<PublicUserProfile>(`/users/${id}`);
            return [id, profileRes.data] as const;
          } catch {
            return [id, null] as const;
          }
        }),
      );

      const profileMap = new Map(profileEntries);

      const enrichedConversations = rawConversations.map((conv: Conversation) => {
        const profile = profileMap.get(conv.applicant_id);
        const participantName = profile?.profile?.name || profile?.profile?.companyName || null;
        return {
          ...conv,
          participant: {
            id: conv.applicant_id,
            name: participantName,
            email: profile?.email || null,
            avatar: profile?.profile?.photo_url || null,
            logo_url: profile?.profile?.logo_url || null,
          },
        };
      });

      setConversations(enrichedConversations);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load conversations';
      toast.error(message);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) return;
    setMessagesLoading(true);
    try {
      const msgRes = await api.get<any>(`/messages/conversations/${conversationId}?page=1&limit=50`);

      const selectedMeta = conversations.find((conv) => conv.id === conversationId);
      setSelectedConversation(
        selectedMeta
          ? {
              id: selectedMeta.id,
              recruiter_id: selectedMeta.recruiter_id,
              applicant_id: selectedMeta.applicant_id,
              job_id: selectedMeta.job_id,
              last_message_at: selectedMeta.last_message_at,
            }
          : null,
      );

      let msgs = msgRes.data?.messages || msgRes.data || [];
      if (!Array.isArray(msgs)) msgs = [];
      const sortedMsgs = msgs.sort((a: Message, b: Message) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setMessages(sortedMsgs);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load messages';
      toast.error(message);
      setSelectedConversation(null);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, [conversations]);

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedConvId) return;
    setSendingMessage(true);
    try {
      const response = await api.post<SendMessageData>(`/messages/conversations/${selectedConvId}`, {
        content: newMessage,
      });
      const createdMessage = response.data?.message;
      if (createdMessage) {
        setMessages((prev) => [...prev, createdMessage]);
      }
      setNewMessage('');
      void fetchConversations();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to send message';
      toast.error(message);
    } finally {
      setSendingMessage(false);
    }
  }, [newMessage, selectedConvId, fetchConversations]);

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (initialConversationId) {
      setSelectedConvId(initialConversationId);
      return;
    }

    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return;
    }

    if (!selectedConvId && conversations.length > 0) {
      const firstValidConversation = conversations.find((conv) => {
        const participantName = conv.participant?.name?.trim();
        const participantEmail = conv.participant?.email?.trim();
        return Boolean(participantName || participantEmail);
      });

      if (firstValidConversation) {
        setSelectedConvId(firstValidConversation.id);
      }
    }
  }, [initialConversationId, selectedConvId, conversations]);

  useEffect(() => {
    if (selectedConvId) {
      void fetchMessages(selectedConvId);
    }
  }, [selectedConvId, fetchMessages]);

  const sortedConversations = useMemo(() => {
    return [...conversations]
      .sort((a, b) => toTime(b.last_message_at) - toTime(a.last_message_at))
      .filter((conv) =>
        (!searchQuery ||
          conv.participant?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conv.participant?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conv.last_message?.toLowerCase().includes(searchQuery.toLowerCase()))
      );
  }, [conversations, searchQuery]);

  const selectedConversationItem = useMemo(
    () => conversations.find((conv) => conv.id === selectedConvId) || null,
    [conversations, selectedConvId],
  );

  const selectedParticipant = selectedConversationItem?.participant;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-6">
      <div className="rounded-xl border-2 md:border-4 border-blue-500 bg-white overflow-hidden">
        <div className="flex h-[calc(100dvh-12rem)] min-h-[540px] md:h-[600px]">
          <div
            className={`border-r border-slate-200 flex flex-col bg-white w-full md:w-[360px] md:flex-shrink-0 ${
              selectedConvId ? 'hidden md:flex' : 'flex'
            }`}
          >
            <div className="p-4 border-b border-slate-200">
              <div className="relative">
                <FaMagnifyingGlass className="absolute left-3 top-3 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-full bg-black text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {sortedConversations.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm">
                  <p className="font-semibold text-slate-700">Inbox is empty</p>
                  <p className="mt-1">Start messaging applicants to see chats here.</p>
                </div>
              ) : (
                sortedConversations.map((conv) => {
                  const participant = conv.participant;
                  const isSelected = conv.id === selectedConvId;
                  const avatarUrl = participant?.avatar || participant?.logo_url;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setSelectedConvId(conv.id);
                        router.replace(`${ROUTES.adminMessages}?conversationId=${conv.id}`);
                      }}
                      className={`p-3 md:p-3.5 border-b border-slate-100 cursor-pointer transition ${
                        isSelected
                          ? 'bg-lime-100 border-l-4 border-l-lime-300'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden text-sm font-semibold flex-shrink-0">
                          {avatarUrl ? (
                            <img
                              src={resolveAssetUrl(avatarUrl) || ''}
                              alt={participant?.name || ''}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            getInitials(participant?.name || 'User')
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {participant?.name || participant?.email || 'Conversation'}
                          </p>
                          <p className="text-xs text-slate-600 truncate">{conv.last_message || 'No messages yet'}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className={`flex-1 flex-col bg-white ${selectedConvId ? 'flex' : 'hidden md:flex'}`}>
            {selectedConvId ? (
              <>
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedConvId(null);
                        router.replace(ROUTES.adminMessages);
                      }}
                      className="md:hidden inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 text-slate-700"
                      aria-label="Back to conversations"
                    >
                      <FaArrowLeft size={14} />
                    </button>
                    <h3 className="font-bold text-slate-900 truncate">
                      {selectedParticipant?.name || selectedParticipant?.email || 'Conversation'}
                    </h3>
                  </div>
                </div>

                <div className="flex-1 min-h-0 flex">
                  <div className="flex-1 min-h-0 flex flex-col">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                      {messagesLoading ? (
                        <div className="flex justify-center items-center h-full">
                          <Spinner />
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="text-center text-slate-500 text-sm mt-12">No messages yet</div>
                      ) : (
                        messages.map((msg) => {
                          const isOwnMessage = msg.sender_id === user?.id;
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[85%] md:max-w-xs px-4 py-2 rounded-lg ${
                                  isOwnMessage
                                    ? 'bg-lime-300 text-black'
                                    : 'bg-white text-slate-900 border border-slate-200'
                                }`}
                              >
                                <p className="text-sm break-words">{msg.body}</p>
                                <p className="text-xs text-slate-500 mt-1">{formatTime(msg.created_at)}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="p-4 border-t border-slate-200 bg-white">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Type a message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSendMessage();
                          }}
                          disabled={sendingMessage}
                          className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={sendingMessage || !newMessage.trim()}
                          className="px-4 py-2 rounded-lg bg-lime-300 text-black font-semibold text-sm hover:bg-lime-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          {sendingMessage ? 'Sending...' : 'Send'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <aside className="hidden lg:block w-72 border-l border-slate-200 bg-slate-50 p-4 overflow-y-auto">
                    <h4 className="text-base font-bold text-slate-900 mb-3">General Info</h4>
                    <div className="rounded-xl bg-white border border-slate-200 p-3 mb-3">
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedParticipant?.name || 'N/A'}
                      </p>
                      <p className="text-xs text-slate-600 mt-2">
                        <span className="font-semibold">Email:</span>{' '}
                        {selectedParticipant?.email || 'N/A'}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        <span className="font-semibold">Last activity:</span>{' '}
                        {formatDateTime(selectedConversationItem?.last_message_at || selectedConversation?.last_message_at)}
                      </p>
                    </div>
                  </aside>
                </div>
              </>
            ) : (
              <div className="hidden md:flex flex-1 items-center justify-center">
                <div className="text-center text-slate-500">
                  <p className="text-lg font-semibold">Inbox is empty</p>
                  <p className="text-sm mt-1">Start a new message from the Applications page.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
