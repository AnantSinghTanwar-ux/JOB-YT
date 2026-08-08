import { api, ApiError } from '@/lib/api';

interface ConversationPayload {
  id: string;
}

export async function createConversation(recipientId: string, jobId?: string): Promise<string> {
  if (!recipientId) {
    throw new ApiError('Recipient is required', 400, 'RECIPIENT_REQUIRED');
  }

  const res = await api.post<ConversationPayload>('/messages/conversations', {
    recipientId,
    jobId,
  });

  const conversationId = res.data?.id;
  if (!conversationId) {
    throw new ApiError('Conversation response is missing id', 500, 'INVALID_CONVERSATION_RESPONSE');
  }

  return conversationId;
}
