'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api';
import { Spinner } from '@/components/ui';
import { resolveAssetUrl } from '@/lib/assetUrl';
import { FaArrowLeft, FaMagnifyingGlass, FaChevronDown } from 'react-icons/fa6';
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
  companyName?: string | null;
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

const formatDate = (value?: string | null) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString();
};

const toTime = (value?: string | null) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

export default function MessagesPage() {
  const router = useRouter();
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
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

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
          .map((conv: Conversation) => user?.role === 'applicant' ? conv.recruiter_id : conv.applicant_id)
          .filter((id: string | undefined) => Boolean(id)),
      )] as string[];

      const profileEntries = await Promise.all(
        participantIds.map(async (id) => {
          try {
            const profileRes = await api.get<PublicUserProfile>(`/users/public/${id}`);
            return [id, profileRes.data] as const;
          } catch {
            return [id, null] as const;
          }
        }),
      );

      const profileMap = new Map(profileEntries);

      const enrichedConversations = rawConversations.map((conv: Conversation) => {
        const participantId = user?.role === 'applicant' ? conv.recruiter_id : conv.applicant_id;
        const profile = profileMap.get(participantId);
        const participantName =
          (user?.role === 'applicant' ? conv.companyName?.trim() : null) ||
          profile?.profile?.companyName ||
          profile?.profile?.name ||
          null;
        return {
          ...conv,
          participant: {
            id: participantId,
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
  }, [user?.role]);

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
    <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 pb-4">
      <div className="rounded-[24px] md:rounded-[30px] bg-[#ecebe6] p-3 md:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
        <div className="flex h-[calc(100dvh-9.5rem)] min-h-[500px] max-h-[680px] gap-3 overflow-hidden">
          {/* Left Sidebar - Conversations */}
          <div className={`rounded-[22px] bg-[#f7f7f5] p-3 md:p-4 flex-col w-full md:w-[31%] ${selectedConvId ? 'hidden md:flex' : 'flex'}`}>
            {/* Search Bar */}
            <div className="pb-3">
              <div className="relative">
                <FaMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80" size={15} />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 h-11 rounded-full bg-black text-white text-base placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-lime-300"
                />
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {sortedConversations.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm">
                  <p className="font-semibold text-slate-700">Inbox is empty</p>
                  <p className="mt-1">You have no conversations yet.</p>
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
                        void fetchMessages(conv.id);
                      }}
                      className={`rounded-2xl border cursor-pointer transition px-3 py-2.5 ${isSelected
                          ? 'bg-white border-lime-300'
                          : 'bg-white border-[#ecebe7] hover:border-slate-300'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden text-sm font-semibold flex-shrink-0">
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
                          <p className="text-[15px] md:text-[16px] font-bold text-slate-900 truncate leading-[1.2]">
                            {participant?.name || participant?.email || 'Conversation'}
                          </p>
                          <p className="text-xs md:text-[13px] text-slate-500 truncate mt-0.5">{conv.last_message || 'No messages yet'}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Side - Messages & Info */}
          <div className={`flex-1 flex-col min-w-0 ${selectedConvId ? 'flex' : 'hidden md:flex'}`}>
            {selectedConvId ? (
              <>
                <div className="flex-1 min-h-0 min-w-0 flex gap-3">
                  <div className="flex-1 min-h-0 min-w-0 flex flex-col rounded-[22px] bg-white border border-[#e5e3dd] overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#ece9e2] flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedConvId(null)}
                        className="md:hidden inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                        aria-label="Back to conversations"
                      >
                        <FaArrowLeft size={14} />
                      </button>
                      <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-xs font-semibold shrink-0">
                        {selectedParticipant?.avatar || selectedParticipant?.logo_url ? (
                          <img
                            src={resolveAssetUrl(selectedParticipant?.avatar || selectedParticipant?.logo_url || '') || ''}
                            alt={selectedParticipant?.name || ''}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          getInitials(selectedParticipant?.name || selectedParticipant?.email || 'U')
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[16px] font-bold text-slate-900 truncate">
                          {selectedParticipant?.name || selectedParticipant?.email || 'Conversation'}
                        </p>
                      </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 bg-white">
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
                                className={`max-w-[85%] md:max-w-[75%] px-4 py-3 rounded-[20px] ${isOwnMessage
                                    ? 'bg-[#d6f2a5] text-black rounded-br-sm shadow-sm'
                                    : 'bg-[#f5f4f0] text-slate-900 rounded-bl-sm'
                                  }`}
                              >
                                <p className="text-[14px] leading-relaxed break-words">{msg.body}</p>
                                <p className={`text-[11px] mt-1.5 ${isOwnMessage ? 'text-black/60' : 'text-slate-500'}`}>
                                  {formatTime(msg.created_at)}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Input Area */}
                    <div className="p-3 md:px-5 md:py-4 md:pb-5 border-t border-[#ece9e2] bg-white shrink-0">
                      <div className="flex gap-2 min-w-0">
                        <input
                          type="text"
                          placeholder="Type a message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSendMessage();
                          }}
                          disabled={sendingMessage}
                          className="flex-1 min-w-0 px-4 py-3 md:px-5 rounded-full bg-[#f8f7f5] border-none text-[14px] focus:outline-none focus:ring-2 focus:ring-lime-300 transition-shadow"
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={sendingMessage || !newMessage.trim()}
                          className="px-5 md:px-6 py-3 shrink-0 rounded-full bg-black text-white font-semibold text-[13px] md:text-sm hover:bg-slate-800 focus:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {sendingMessage ? 'Sending...' : 'Send'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Side Info Panel */}
                  <aside className="hidden lg:block w-[31%] rounded-[22px] bg-[#f2f1ee] p-5 overflow-y-auto">
                    <h4 className="text-[20px] font-extrabold text-slate-900 mb-5 px-1 tracking-tight">General Info</h4>
                    <div className="rounded-[20px] bg-white border border-[#e6e3dc] shadow-sm p-4 mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-xs font-semibold shrink-0">
                          {selectedParticipant?.avatar || selectedParticipant?.logo_url ? (
                            <img
                              src={resolveAssetUrl(selectedParticipant?.avatar || selectedParticipant?.logo_url || '') || ''}
                              alt={selectedParticipant?.name || ''}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            getInitials(selectedParticipant?.name || selectedParticipant?.email || 'U')
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-bold text-slate-900 truncate">
                            {selectedParticipant?.name || 'N/A'}
                          </p>
                          <p className="text-[12px] text-slate-500 truncate mt-0.5">{selectedParticipant?.email || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1 text-xs text-slate-600">
                        <p><span className="font-semibold">Email</span></p>
                        <p>{selectedParticipant?.email || 'N/A'}</p>
                        <p className="pt-1"><span className="font-semibold">Date Created</span></p>
                        <p>{formatDate(selectedConversationItem?.last_message_at || selectedConversation?.last_message_at)}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {/* About Company */}
                      <div className="rounded-[20px] bg-white border border-[#e6e3dc] overflow-hidden shadow-sm">
                        <button
                          type="button"
                          onClick={() => setExpandedSection(expandedSection === 'about' ? null : 'about')}
                          className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                        >
                          <span>About Company</span>
                          <span className={`w-5 h-5 rounded-full bg-black text-white inline-flex items-center justify-center transition-transform duration-200 ${expandedSection === 'about' ? 'rotate-180' : ''}`}>
                            <FaChevronDown size={10} />
                          </span>
                        </button>
                        {expandedSection === 'about' && (
                          <div className="px-4 pb-4 text-xs text-slate-600 animate-in fade-in slide-in-from-top-1">
                            <p className="leading-relaxed">
                              {selectedConversationItem?.companyName 
                                ? `${selectedConversationItem.companyName} is committed to building the future of technology through innovation and collaboration.`
                                : "No company information available at this time."}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Shared Files */}
                      <div className="rounded-[20px] bg-white border border-[#e6e3dc] overflow-hidden shadow-sm">
                        <button
                          type="button"
                          onClick={() => setExpandedSection(expandedSection === 'files' ? null : 'files')}
                          className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                        >
                          <span>Shared Files</span>
                          <span className={`w-5 h-5 rounded-full bg-black text-white inline-flex items-center justify-center transition-transform duration-200 ${expandedSection === 'files' ? 'rotate-180' : ''}`}>
                            <FaChevronDown size={10} />
                          </span>
                        </button>
                        {expandedSection === 'files' && (
                          <div className="px-4 pb-4 text-xs text-slate-500 text-center italic animate-in fade-in slide-in-from-top-1">
                            No files have been shared in this conversation.
                          </div>
                        )}
                      </div>

                      {/* Shared Links */}
                      <div className="rounded-[20px] bg-white border border-[#e6e3dc] overflow-hidden shadow-sm">
                        <button
                          type="button"
                          onClick={() => setExpandedSection(expandedSection === 'links' ? null : 'links')}
                          className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                        >
                          <span>Shared Links</span>
                          <span className={`w-5 h-5 rounded-full bg-black text-white inline-flex items-center justify-center transition-transform duration-200 ${expandedSection === 'links' ? 'rotate-180' : ''}`}>
                            <FaChevronDown size={10} />
                          </span>
                        </button>
                        {expandedSection === 'links' && (
                          <div className="px-4 pb-4 text-xs text-slate-500 text-center italic animate-in fade-in slide-in-from-top-1">
                            No links have been shared in this conversation.
                          </div>
                        )}
                      </div>
                    </div>
                  </aside>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center rounded-[22px] bg-white border border-[#e5e3dd]">
                <div className="text-center text-slate-500">
                  <p className="text-lg font-semibold">Inbox is empty</p>
                  <p className="text-sm mt-1">Start a conversation to see messages here.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
