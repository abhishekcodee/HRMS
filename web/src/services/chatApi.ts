const API_BASE_URL = `${(import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || ''}/api/v1`;

export function resolveFileUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const backendBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '') || '';
  if (backendBase) {
    return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  // If no VITE_API_URL is configured, in dev use localhost:4000; in prod use current origin (proxied)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `${window.location.protocol}//${window.location.hostname}:4000${url.startsWith('/') ? '' : '/'}${url}`;
  }
  return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

export interface ChatParticipant {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  profilePhoto?: string;
  role: string;
  departmentName?: string;
  designation?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderEmail?: string;
  senderEmployeeId?: string;
  senderAvatar?: string;
  message: string;
  messageType: 'text' | 'image' | 'file' | 'announcement' | 'system';
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  fileType?: string;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  } | null;
  isDeleted?: boolean;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  type: 'private' | 'group' | 'department' | 'announcement';
  name: string;
  description?: string;
  departmentName?: string;
  avatarUrl?: string;
  createdBy: string;
  updatedAt: string;
  targetUser?: ChatParticipant | null;
  participants: ChatParticipant[];
  lastMessage?: {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    messageType: string;
    createdAt: string;
  } | null;
  unreadCount: number;
}

export interface ChatEmployeeSearchResult {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone?: string;
  profilePhoto?: string;
  departmentName?: string;
  designation?: string;
}

function getAuthHeader() {
  const token = localStorage.getItem('hrms_auth_token') || localStorage.getItem('hrms_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchConversations(): Promise<ChatConversation[]> {
  const res = await fetch(`${API_BASE_URL}/chat/conversations`, {
    headers: getAuthHeader(),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to fetch conversations');
  return data.data;
}

export async function fetchConversationMessages(conversationId: string, limit = 50, offset = 0): Promise<ChatMessage[]> {
  const res = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`, {
    headers: getAuthHeader(),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to fetch messages');
  return data.data;
}

export async function initiatePrivateChat(targetUserId: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/chat/conversations/private`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ targetUserId }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to initiate private chat');
  return data.conversationId;
}

export async function createGroupChat(name: string, memberIds: string[], description?: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/chat/conversations/group`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ name, memberIds, description }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to create group chat');
  return data.conversationId;
}

export async function sendChatMessage(payload: {
  conversationId: string;
  message: string;
  messageType?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  fileType?: string;
  replyToMessageId?: string;
}): Promise<ChatMessage> {
  const res = await fetch(`${API_BASE_URL}/chat/messages`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to send message');
  return data.data;
}

export async function uploadChatAttachment(file: File): Promise<{ fileUrl: string; fileName: string; fileSize: string; fileType: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('hrms_auth_token') || localStorage.getItem('hrms_token') || localStorage.getItem('token');
  const res = await fetch(`${API_BASE_URL}/chat/messages/upload`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message || 'File upload failed');
  return data;
}

export async function markChatAsRead(conversationId: string): Promise<void> {
  await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/read`, {
    method: 'POST',
    headers: getAuthHeader(),
  });
}

export async function deleteChatMessage(messageId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/chat/messages/${messageId}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to delete message');
}

export async function searchChatEmployees(q: string): Promise<ChatEmployeeSearchResult[]> {
  const res = await fetch(`${API_BASE_URL}/chat/employees/search?q=${encodeURIComponent(q)}`, {
    headers: getAuthHeader(),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message || 'Search failed');
  return data.data;
}

export async function postHRAnnouncement(title: string, message: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/chat/announcements`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ title, message }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to post announcement');
}

export async function fetchTotalUnreadChatCount(): Promise<number> {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/unread-count`, {
      headers: getAuthHeader(),
    });
    const data = await res.json();
    return data.unreadCount || 0;
  } catch (_) {
    return 0;
  }
}
