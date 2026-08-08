'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api';
import { Spinner } from '@/components/ui';
import { resolveAssetUrl } from '@/lib/assetUrl';
import { FaMagnifyingGlass, FaChevronDown, FaChevronLeft } from 'react-icons/fa6';
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
  created_at?: string;
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
    phone?: string | null;
  };
  unread?: boolean;
  created_at?: string;
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
    phone?: string | null;
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
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
};

const toTime = (value?: string | null) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

export default function MessagesPage() {
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get<any>('/messages/conversations');
      const rawConversations = Array.isArray(res.data?.conversations) ? res.data.conversations : Array.isArray(res.data) ? res.data : [];
      
      const participantIds = [...new Set(rawConversations.map((conv: Conversation) => conv.applicant_id).filter((id: string | undefined) => Boolean(id)))] as string[];

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
            phone: profile?.profile?.phone || null,
          },
          created_at: conv.created_at,
        };
      });

      setConversations(enrichedConversations);
    } catch (err) {
      toast.error('Failed to load conversations');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

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
              created_at: selectedMeta.created_at,
            }
          : null,
      );

      let msgs = msgRes.data?.messages || msgRes.data || [];
      if (!Array.isArray(msgs)) msgs = [];
      const sortedMsgs = msgs.sort((a: Message, b: Message) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setMessages(sortedMsgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      toast.error('Failed to load messages');
      setSelectedConversation(null);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, [conversations, user?.id]);

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
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
      setNewMessage('');
      void fetchConversations();
    } catch (err) {
      toast.error('Failed to send message');
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
    if (typeof window !== 'undefined' && window.innerWidth < 768) return;
    if (!selectedConvId && conversations.length > 0) {
      const firstValidConversation = conversations.find((conv) => Boolean(conv.participant?.name?.trim() || conv.participant?.email?.trim()));
      if (firstValidConversation) setSelectedConvId(firstValidConversation.id);
    }
  }, [initialConversationId, selectedConvId, conversations]);

  useEffect(() => {
    if (selectedConvId) void fetchMessages(selectedConvId);
  }, [selectedConvId, fetchMessages]);

  const sortedConversations = useMemo(() => {
    return [...conversations]
      .sort((a, b) => toTime(b.last_message_at) - toTime(a.last_message_at))
      .filter((conv) =>
        (!searchQuery ||
          (conv.participant?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (conv.participant?.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (conv.last_message || '').toLowerCase().includes(searchQuery.toLowerCase()))
      );
  }, [conversations, searchQuery]);

  const selectedConversationItem = useMemo(
    () => conversations.find((conv) => conv.id === selectedConvId) || null,
    [conversations, selectedConvId],
  );

  const selectedParticipant = selectedConversationItem?.participant;

  const sharedLinks = useMemo(() => {
    const links: string[] = [];
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    messages.forEach((msg) => {
      const found = msg.body.match(urlRegex);
      if (found) links.push(...found);
    });
    return [...new Set(links)];
  }, [messages]);

  const sharedFiles = useMemo(() => {
    // In the future, if we have an attachments field in messages, we can extract it here.
    // For now, we can check for common file extension patterns in links.
    const fileExtensions = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.zip'];
    return sharedLinks.filter((link) => fileExtensions.some((ext) => link.toLowerCase().includes(ext)));
  }, [sharedLinks]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto h-[calc(100vh-100px)] overflow-hidden flex animate-pulse gap-6 px-4">
        <div className="w-[340px] flex-shrink-0 bg-slate-100 rounded-[32px] h-full" />
        <div className="flex-1 bg-slate-50 rounded-[32px] h-full" />
        <div className="w-[280px] flex-shrink-0 bg-slate-100 rounded-[32px] h-full hidden lg:block" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-100px)] overflow-hidden">
      {/* Main Container */}
      <div 
        className="w-full max-w-[1208px] h-full max-h-[731px] bg-[#ece9e2] rounded-[32px] flex flex-col md:flex-row overflow-hidden p-4 md:p-6 gap-4 md:gap-6 shadow-sm"
      >
        
        {/* LEFT PANEL - Chat List: full on mobile when no convo, hidden on mobile when convo selected */}
        <div className={`${selectedConvId ? 'hidden md:flex' : 'flex'} w-full md:w-[300px] lg:w-[340px] flex-col gap-5 flex-shrink-0`}>
          {/* Header */}
          <div className="px-2">
            <h2 className="text-[28px] font-black tracking-tight text-black font-display">Messages</h2>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <FaMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40" size={16} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-4 rounded-2xl bg-white border border-black/5 text-black text-[14px] font-bold placeholder-black/30 focus:outline-none focus:ring-2 focus:ring-lime-300 transition-all shadow-sm"
            />
          </div>

          {/* Chat List with Custom Scrollbar */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-black/20">
            {sortedConversations.length === 0 ? (
              <div className="p-8 text-center bg-white/40 rounded-2xl border-2 border-dashed border-black/5">
                  <p className="text-black/30 text-[11px] font-black uppercase tracking-widest">Inbox is empty</p>
              </div>
            ) : (
              sortedConversations.map((conv) => {
                const participant = conv.participant;
                const isSelected = conv.id === selectedConvId;
                const avatarUrl = participant?.avatar || participant?.logo_url || 'https://api.dicebear.com/7.x/notionists/svg?seed=' + participant?.name;

                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setSelectedConvId(conv.id);
                      router.replace(`${ROUTES.recruiterMessages}?conversationId=${conv.id}`);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                      isSelected ? 'bg-white border-[1.5px] border-lime-300 shadow-md' : 'bg-white/60 hover:bg-white border-[1.5px] border-transparent shadow-sm'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border border-black/5">
                      <img src={resolveAssetUrl(avatarUrl) || undefined} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-black text-black truncate leading-tight">
                        {participant?.name || participant?.email || 'User'}
                      </p>
                      <p className="text-[12px] font-bold text-black/50 truncate leading-tight mt-1">
                        {conv.last_message ? (msg => msg.length > 30 ? msg.substring(0,30) + '..' : msg)(conv.last_message) : 'No messages'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* MIDDLE PANEL - Chat Area: full on mobile when convo selected, hidden on mobile when no convo */}
        <div className={`${selectedConvId ? 'flex' : 'hidden md:flex'} flex-1 flex-col h-full bg-transparent min-w-0`}>
          {selectedConvId ? (
            <>
              {/* Chat Header with back button on mobile */}
              <div className="bg-white rounded-2xl px-5 md:px-6 py-4 flex items-center justify-between gap-3 md:gap-4 flex-shrink-0 shadow-sm border border-black/5 mb-4">
                <div className="flex items-center gap-4">
                    <button
                    className="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-black text-white shrink-0 active:scale-95 transition-transform"
                    onClick={() => setSelectedConvId(null)}
                    aria-label="Back to conversations"
                    >
                    <FaChevronLeft size={14} />
                    </button>
                    <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden border border-black/5">
                        <img src={resolveAssetUrl(selectedParticipant?.avatar || selectedParticipant?.logo_url || 'https://api.dicebear.com/7.x/notionists/svg?seed=' + selectedParticipant?.name) || undefined} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h3 className="text-[18px] font-black text-black leading-tight">
                            {selectedParticipant?.name || selectedParticipant?.email || 'User'}
                        </h3>
                        <p className="text-[11px] font-bold text-black/40 uppercase tracking-widest mt-1">Applicant</p>
                    </div>
                </div>
              </div>

              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto space-y-6 mb-4 pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-black/20 px-2 py-4">
                {messagesLoading ? (
                  <div className="flex justify-center items-center h-full"><Spinner /></div>
                ) : messages.length === 0 ? (
                  <div className="text-center mt-20">
                      <div className="w-16 h-16 bg-white/40 rounded-full flex items-center justify-center mx-auto mb-4 border border-black/5">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-black/30" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
                      </div>
                      <p className="text-black/40 text-[13px] font-bold">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwnMessage = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                        <div className="flex flex-col max-w-[75%]">
                          <div
                            className={`px-5 py-3.5 rounded-2xl shadow-sm ${
                              isOwnMessage
                                ? 'bg-lime-300 text-black rounded-tr-sm'
                                : 'bg-white border border-black/5 text-black rounded-tl-sm'
                            }`}
                          >
                            <p className="text-[15px] font-medium leading-relaxed break-words">{msg.body}</p>
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider text-black/30 mt-2 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                            {formatTime(msg.created_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="bg-white rounded-2xl p-3 pl-5 flex gap-3 flex-shrink-0 shadow-sm border border-black/5 items-center">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                  disabled={sendingMessage}
                  className="flex-1 bg-transparent text-[15px] font-bold text-black placeholder-black/30 focus:outline-none"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                  className="px-8 py-3.5 rounded-xl bg-black text-lime-300 text-[14px] font-black uppercase tracking-wider hover:bg-slate-900 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-md shadow-black/10"
                >
                  {sendingMessage ? '...' : 'Send'}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 bg-white/40 rounded-[32px] border-2 border-dashed border-black/5 flex flex-col items-center justify-center p-10 text-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-black/5">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-black/20" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <h3 className="text-xl font-black text-black mb-2">Your Messages</h3>
                <p className="text-[14px] font-bold text-black/40">Select a conversation from the list to start messaging with applicants.</p>
            </div>
          )}
        </div>

        {/* RIGHT PANEL - General Info: hidden on mobile and tablet */}
        <div className={`${selectedConvId ? 'hidden lg:flex' : 'hidden'} w-[280px] flex-col gap-4 flex-shrink-0`}>
          <h4 className="text-[18px] font-black text-black px-2 mt-2 font-display">General Info</h4>
          
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border border-black/5">
                <img src={resolveAssetUrl(selectedParticipant?.avatar || selectedParticipant?.logo_url || 'https://api.dicebear.com/7.x/notionists/svg?seed=' + selectedParticipant?.name) || undefined} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="text-[16px] font-black text-black truncate leading-tight">
                  {selectedParticipant?.name || 'Applicant'}
                </p>
                <p className="text-[11px] font-bold text-black/40 uppercase tracking-widest mt-1">Applicant</p>
              </div>
            </div>
            
            <div className="space-y-5 border-t border-black/5 pt-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-black/30 mb-1">Email Address</p>
                <p className="text-[13px] text-black font-bold truncate bg-slate-50 p-2.5 rounded-xl border border-black/5" title={selectedParticipant?.email || ''}>{selectedParticipant?.email || 'N/A'}</p>
              </div>
              {selectedParticipant?.phone && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/30 mb-1">Phone Number</p>
                  <p className="text-[13px] text-black font-bold bg-slate-50 p-2.5 rounded-xl border border-black/5">{selectedParticipant.phone}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-black/30 mb-1">Conversation Started</p>
                <p className="text-[13px] text-black font-bold bg-slate-50 p-2.5 rounded-xl border border-black/5">
                  {formatDateTime(selectedConversationItem?.created_at || selectedConversation?.created_at || selectedConversationItem?.last_message_at)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 flex items-center justify-between shadow-sm border border-black/5 cursor-pointer hover:bg-slate-50 transition-colors group">
            <div className="flex flex-col">
              <span className="text-[14px] font-black text-black">Shared Files</span>
              <span className="text-[11px] font-bold text-black/40 mt-0.5">{sharedFiles.length} files</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-black flex items-center justify-center text-black/40 group-hover:text-white transition-colors">
              <FaChevronDown size={12} />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 flex items-center justify-between shadow-sm border border-black/5 cursor-pointer hover:bg-slate-50 transition-colors group">
            <div className="flex flex-col">
              <span className="text-[14px] font-black text-black">Shared Links</span>
              <span className="text-[11px] font-bold text-black/40 mt-0.5">{sharedLinks.length} links</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-black flex items-center justify-center text-black/40 group-hover:text-white transition-colors">
              <FaChevronDown size={12} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
