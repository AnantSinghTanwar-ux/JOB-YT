'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Message } from '@/types';
import { Spinner, Button } from '@/components/ui';
import { ROUTES } from '@/constants';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';

type ApiConversation = {
  id: string;
  recruiter_id: string;
  applicant_id: string;
  companyName?: string | null;
  participant?: {
    name?: string | null;
  };
};

const mergeById = (current: Message[], incoming: Message[]): Message[] => {
  const map = new Map<string, Message>();
  for (const item of current) {
    map.set(item.id, item);
  }
  for (const item of incoming) {
    map.set(item.id, item);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
};

const areSameMessages = (a: Message[], b: Message[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].id !== b[i].id) return false;
  }
  return true;
};

const extractMessages = (payload: unknown): Message[] => {
  if (!payload || typeof payload !== 'object') return [];

  const wrapped = payload as {
    data?: unknown;
    messages?: unknown;
  };

  if (Array.isArray(wrapped.messages)) {
    return wrapped.messages as Message[];
  }

  const data = wrapped.data as { messages?: unknown } | unknown[] | undefined;
  if (Array.isArray(data)) {
    return data as Message[];
  }
  if (data && typeof data === 'object' && Array.isArray((data as { messages?: unknown }).messages)) {
    return (data as { messages: Message[] }).messages;
  }
  return [];
};

const extractConversations = (payload: unknown): ApiConversation[] => {
  if (!payload || typeof payload !== 'object') return [];

  const wrapped = payload as {
    data?: unknown;
    conversations?: unknown;
  };

  const data = wrapped.data as { conversations?: unknown } | unknown[] | undefined;
  const raw =
    wrapped.conversations ??
    (Array.isArray(data) ? data : data && typeof data === 'object' ? data.conversations : undefined) ??
    [];

  if (!Array.isArray(raw)) return [];

  return raw.filter(
    (item): item is ApiConversation =>
      Boolean(item && typeof item === 'object' && typeof (item as ApiConversation).id === 'string'),
  );
};

export default function MessageThreadPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const router = useRouter();
  const { conversationId } = use(params);
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [otherUserName, setOtherUserName] = useState('Conversation');
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get<{ messages: Message[] } | Message[]>(`/messages/${conversationId}`);
      const nextMessages = extractMessages(res);
      setMessages((prev) => {
        const merged = mergeById(prev, nextMessages);
        return areSameMessages(prev, merged) ? prev : merged;
      });
    } catch (err) {
      throw err;
    }
  }, [conversationId]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);
      try {
        const [messageRes, convoRes] = await Promise.all([
          api.get<{ messages: Message[] } | Message[]>(`/messages/${conversationId}`),
          api.get<ApiConversation[] | { conversations: ApiConversation[] }>('/messages/conversations').catch(() => ({ data: [] })),
        ]);

        if (!mounted) return;
        const history = extractMessages(messageRes);
        setMessages(history);

        const conversations = extractConversations(convoRes);
        const conversation = conversations.find((c) => c.id === conversationId);
        if (conversation) {
          const fallbackName = user?.role === 'recruiter' ? 'Candidate' : 'Recruiter';
          const companyDisplay =
            user?.role === 'applicant' ? conversation.companyName?.trim() : null;
          setOtherUserName(companyDisplay || conversation.participant?.name?.trim() || fallbackName);

          if (user?.id) {
            const otherId =
              conversation.recruiter_id === user.id
                ? conversation.applicant_id
                : conversation.recruiter_id;

            if (otherId) {
              api
                .get<{ profile?: { name?: string | null; companyName?: string | null } }>(`/users/${otherId}`)
                .then((profileRes) => {
                  const profile = profileRes.data?.profile;
                  const resolvedName =
                    companyDisplay ||
                    profile?.name?.trim() ||
                    profile?.companyName?.trim() ||
                    conversation.participant?.name?.trim() ||
                    fallbackName;
                  setOtherUserName(resolvedName);
                })
                .catch(() => undefined);
            }
          }
        }
      } catch (err) {
        if (!mounted) return;
        toast.error(err instanceof ApiError ? err.message : 'Failed to load messages');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void init();

    return () => {
      mounted = false;
    };
  }, [conversationId, user?.role]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchMessages().catch(() => undefined);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setSending(true);
    try {
      const res = await api.post<{ message: Message } | Message>(`/messages/${conversationId}`, {
        content: input.trim(),
      });
      const newMessage =
        ((res as { data?: { message?: Message } }).data?.message as Message | undefined) ||
        ((res as { data?: Message }).data as Message | undefined);

      if (newMessage) {
        setMessages((prev) => mergeById(prev, [newMessage]));
      } else {
        await fetchMessages();
      }

      setInput('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="mx-auto flex h-[calc(100vh-120px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#d7ddd0] bg-[#f8faf4]">
      <div className="flex items-center justify-between border-b border-[#d7ddd0] bg-white px-4 py-3">
        <div>
          <p className="text-sm text-gray-500">Messages</p>
          <h1 className="text-lg font-bold text-black">{otherUserName}</h1>
        </div>
        <button
          onClick={() => router.push(ROUTES.messages)}
          className="rounded-full border border-black px-3 py-1 text-xs font-semibold text-black hover:bg-black hover:text-white"
        >
          Back
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-[#f3f6ec] p-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-gray-500">No messages yet</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm leading-6 break-words ${
                  isMe ? 'bg-[#bbf52f] text-black' : 'bg-white text-black border border-[#d7ddd0]'
                }`}
              >
                <p>{msg.body}</p>
                <p className={`mt-1 text-[10px] ${isMe ? 'text-black/65' : 'text-gray-500'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex flex-shrink-0 gap-2 border-t border-[#d7ddd0] bg-white p-3">
        <input
          className="flex-1 rounded-xl border border-[#d7ddd0] px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#bbf52f]"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        />
        <Button
          onClick={handleSend}
          isLoading={sending}
          disabled={sending || !input.trim()}
          className="bg-[#bbf52f] text-black hover:brightness-95"
        >
          Send
        </Button>
      </div>
    </div>
  );
}
