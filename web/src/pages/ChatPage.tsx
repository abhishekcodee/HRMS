import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Plus,
  Users,
  Megaphone,
  Search,
  Send,
  Paperclip,
  Image as ImageIcon,
  Smile,
  X,
  CheckCheck,
  Trash2,
  Reply,
  ArrowLeft,
  FileText,
  Download,
  Maximize2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Avatar, Badge, Button, Input, LoadingSpinner, Modal, Alert } from '../components/ui';
import {
  fetchConversations,
  fetchConversationMessages,
  initiatePrivateChat,
  sendChatMessage,
  uploadChatAttachment,
  markChatAsRead,
  deleteChatMessage,
  resolveFileUrl,
  ChatConversation,
  ChatMessage
} from '../services/chatApi';
import { getChatSocket } from '../services/chatSocket';
import { NewChatModal } from '../components/chat/NewChatModal';
import { CreateGroupModal } from '../components/chat/CreateGroupModal';
import { PostAnnouncementModal } from '../components/chat/PostAnnouncementModal';
import { EmojiPickerPopover } from '../components/chat/EmojiPickerPopover';
import './ChatPage.css';

export const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // Filter State
  const [activeTab, setActiveTab] = useState<'all' | 'private' | 'group' | 'announcement' | 'department'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // Input & Reply State
  const [messageText, setMessageText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map()); // convId -> typingUserName
  const [uploading, setUploading] = useState(false);

  // Image Lightbox Modal State
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  // UI Modals & Popovers
  const [chatError, setChatError] = useState<string | null>(null);
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isPostAnnounceOpen, setIsPostAnnounceOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mobileShowMain, setMobileShowMain] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // 1. Initial Load: Fetch Conversations & Connect Socket
  useEffect(() => {
    loadConversations();

    const socket = getChatSocket();

    socket.emit('get_online_users');

    socket.on('online_users_list', (userIds: string[]) => {
      setOnlineUserIds(new Set(userIds));
    });

    socket.on('user_online', ({ userId }: { userId: string }) => {
      setOnlineUserIds((prev) => new Set(prev).add(userId));
    });

    socket.on('user_offline', ({ userId }: { userId: string }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    socket.on('new_message', (msg: ChatMessage) => {
      setMessages((prevMsgs) => {
        if (msg.conversationId === activeConvId) {
          if (prevMsgs.some((m) => m.id === msg.id)) return prevMsgs;
          return [...prevMsgs, msg];
        }
        return prevMsgs;
      });

      loadConversations();
    });

    socket.on('user_typing', ({ conversationId, userName }: { conversationId: string; userName: string }) => {
      setTypingUsers((prev) => new Map(prev).set(conversationId, userName));
    });

    socket.on('user_stop_typing', ({ conversationId }: { conversationId: string }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.delete(conversationId);
        return next;
      });
    });

    return () => {
      socket.off('online_users_list');
      socket.off('user_online');
      socket.off('user_offline');
      socket.off('new_message');
      socket.off('user_typing');
      socket.off('user_stop_typing');
    };
  }, [activeConvId]);

  // Toggle body class for mobile full-screen WhatsApp view
  useEffect(() => {
    if (mobileShowMain) {
      document.body.classList.add('mobile-chat-active');
    } else {
      document.body.classList.remove('mobile-chat-active');
    }
    return () => {
      document.body.classList.remove('mobile-chat-active');
    };
  }, [mobileShowMain]);

  // Auto Scroll Messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const data = await fetchConversations();
      setConversations(data);
      if (!activeConvId && data.length > 0) {
        setActiveConvId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load chat conversations:', err);
    } finally {
      setLoadingConvs(false);
    }
  };

  // Select Active Conversation
  const handleSelectConversation = async (convId: string) => {
    setActiveConvId(convId);
    setMobileShowMain(true);
    setLoadingMsgs(true);
    try {
      const msgs = await fetchConversationMessages(convId);
      setMessages(msgs);
      await markChatAsRead(convId);
      getChatSocket().emit('mark_read', { conversationId: convId });

      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
      );
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMsgs(false);
    }
  };

  // Initiate Direct Private Chat
  const handleStartPrivateChat = async (targetUserId: string) => {
    try {
      const convId = await initiatePrivateChat(targetUserId);
      await loadConversations();
      handleSelectConversation(convId);
    } catch (err: any) {
      setChatError(err.message || 'Failed to start private chat');
    }
  };

  // Send Chat Message
  const handleSendMessage = async (fileData?: { fileUrl: string; fileName: string; fileSize: string; fileType: string }) => {
    if (!activeConvId) return;
    if (!fileData && !messageText.trim()) return;

    const payload = {
      conversationId: activeConvId,
      message: messageText.trim(),
      messageType: fileData
        ? fileData.fileType.startsWith('image/')
          ? 'image'
          : 'file'
        : 'text',
      fileUrl: fileData?.fileUrl,
      fileName: fileData?.fileName,
      fileSize: fileData?.fileSize,
      fileType: fileData?.fileType,
      replyToMessageId: replyingTo?.id,
    };

    try {
      setMessageText('');
      setReplyingTo(null);
      getChatSocket().emit('typing_stop', { conversationId: activeConvId });

      const newMsg = await sendChatMessage(payload);
      setMessages((prev) => [...prev, newMsg]);
      loadConversations();
    } catch (err: any) {
      setChatError(err.message || 'Failed to send message.');
    }
  };

  // Process File/Image Upload
  const processUploadedFile = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadChatAttachment(file);
      await handleSendMessage(result);
    } catch (err: any) {
      setChatError(err.message || 'File upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processUploadedFile(file);
  };

  // Clipboard Paste Image Handler
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          processUploadedFile(file);
          break;
        }
      }
    }
  };

  // Drag & Drop Image Handler
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processUploadedFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // Typing Emitter
  const handleTyping = (text: string) => {
    setMessageText(text);
    if (!activeConvId) return;
    const socket = getChatSocket();

    if (text.length > 0) {
      socket.emit('typing_start', { conversationId: activeConvId });
    } else {
      socket.emit('typing_stop', { conversationId: activeConvId });
    }
  };

  // Delete Message
  const confirmDeleteMessage = async () => {
    if (!deleteMessageId) return;
    const msgId = deleteMessageId;
    setDeleteMessageId(null);
    try {
      await deleteChatMessage(msgId);
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, isDeleted: true, message: 'This message was deleted.' } : m))
      );
    } catch (err: any) {
      setChatError(err.message || 'Failed to delete message');
    }
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (activeTab !== 'all' && c.type !== activeTab) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.targetUser && c.targetUser.fullName.toLowerCase().includes(q)) ||
        (c.departmentName && c.departmentName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const isTargetOnline =
    activeConv?.type === 'private' && activeConv.targetUser && onlineUserIds.has(activeConv.targetUser.id);

  const isUserAdminOrEmployer = String(user?.role) === 'admin' || String(user?.role) === 'employer' || String(user?.role) === 'ADMIN' || String(user?.role) === 'EMPLOYER';

  return (
    <div className="chat-container">
      {/* 1. LEFT SIDEBAR */}
      <aside className={`chat-sidebar ${mobileShowMain ? 'hidden-mobile' : ''}`}>
        <div className="chat-sidebar-header">
          {/* Authenticated Profile Banner */}
          <div className="chat-user-banner">
            <Avatar name={user?.fullName || 'User'} src={user?.profilePhoto} size="md" status="online" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.925rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.fullName}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success-text)' }} />
                Online
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="chat-actions-row">
            <Button
              variant="outline"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => setIsNewChatOpen(true)}
              style={{ flex: 1, fontSize: '0.8rem' }}
            >
              New Chat
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Users size={16} />}
              onClick={() => setIsCreateGroupOpen(true)}
              style={{ flex: 1, fontSize: '0.8rem' }}
            >
              New Group
            </Button>
          </div>

          {/* Search Box */}
          <Input
            placeholder="Search conversations..."
            icon={<Search size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter Tabs */}
        <div className="chat-filter-tabs">
          {(['all', 'private', 'group', 'announcement', 'department'] as const).map((tab) => (
            <button
              key={tab}
              className={`chat-filter-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab ? tab.charAt(0).toUpperCase() + tab.slice(1) : ''}
            </button>
          ))}
        </div>

        {/* Conversation List */}
        <div className="conversation-list">
          {loadingConvs ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <LoadingSpinner size="sm" text="Loading chats..." />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No conversations found.
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isSelected = c.id === activeConvId;
              const isOnline = c.type === 'private' && c.targetUser && onlineUserIds.has(c.targetUser.id);

              return (
                <div
                  key={c.id}
                  className={`conversation-item ${isSelected ? 'active' : ''}`}
                  onClick={() => handleSelectConversation(c.id)}
                >
                  <Avatar
                    name={c.name}
                    src={c.avatarUrl}
                    size="md"
                    status={isOnline ? 'online' : undefined}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.name}
                      </span>
                      {c.lastMessage && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {new Date(c.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                      <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
                        {typingUsers.has(c.id) ? (
                          <span style={{ color: 'var(--primary-500)', fontStyle: 'italic' }}>
                            {typingUsers.get(c.id)} is typing...
                          </span>
                        ) : c.lastMessage ? (
                          c.lastMessage.text || (c.lastMessage.messageType === 'image' ? '📷 Photo' : c.lastMessage.messageType === 'file' ? '📎 File' : 'Sent a message')
                        ) : (
                          'No messages yet'
                        )}
                      </span>

                      {c.unreadCount > 0 && (
                        <span
                          style={{
                            backgroundColor: 'var(--primary-500)',
                            color: '#fff',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            borderRadius: '10px',
                            padding: '0.1rem 0.45rem',
                          }}
                        >
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* 2. CHAT MAIN PANE */}
      <main className="chat-main" onDragOver={handleDragOver} onDrop={handleDrop}>
        {activeConv ? (
          <>
            {/* Header */}
            <header className="chat-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  className="mobile-only"
                  onClick={() => setMobileShowMain(false)}
                  title="Back to conversations"
                >
                  <ArrowLeft size={20} />
                </button>

                <Avatar name={activeConv.name} src={activeConv.avatarUrl} size="md" status={isTargetOnline ? 'online' : undefined} />

                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {activeConv.name}
                    <Badge variant={activeConv.type === 'announcement' ? 'error' : activeConv.type === 'department' ? 'warning' : 'info'}>
                      {(activeConv.type || 'direct').toUpperCase()}
                    </Badge>
                  </div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                    {activeConv.type === 'private'
                      ? isTargetOnline ? '● Active now' : 'Offline'
                      : activeConv.description || `${activeConv.participants.length} members`}
                  </div>
                </div>
              </div>

              {/* Action for HR/Admin to Post Broadcast */}
              {isUserAdminOrEmployer && activeConv.type === 'announcement' && (
                <Button variant="primary" size="sm" icon={<Megaphone size={16} />} onClick={() => setIsPostAnnounceOpen(true)}>
                  Broadcast Announcement
                </Button>
              )}
            </header>

            {/* Messages Scroll Area */}
            <div className="chat-messages-container">
              {loadingMsgs ? (
                <div style={{ margin: 'auto' }}>
                  <LoadingSpinner size="md" text="Loading message history..." />
                </div>
              ) : messages.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                  <p style={{ fontWeight: 600 }}>No messages in this conversation yet.</p>
                  <p style={{ fontSize: '0.8rem' }}>Say hello to start the team conversation!</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isOwn = m.senderId === user?.id;

                  return (
                    <div key={m.id} className={`message-wrapper ${isOwn ? 'own' : ''}`}>
                      {!isOwn && <Avatar name={m.senderName} src={m.senderAvatar} size="sm" />}

                      <div className="message-bubble">
                        {!isOwn && <div className="message-sender">{m.senderName}</div>}

                        {/* Replying Context */}
                        {m.replyTo && (
                          <div className="reply-preview-box">
                            <strong>{m.replyTo.senderName}:</strong> {m.replyTo.text}
                          </div>
                        )}

                        {/* Image Attachment with Lightbox Zoom Trigger */}
                        {m.messageType === 'image' && m.fileUrl && (
                          <div
                            style={{ marginBottom: '0.4rem', position: 'relative', cursor: 'pointer' }}
                            onClick={() => setLightboxImage({ url: resolveFileUrl(m.fileUrl!), title: m.fileName || 'Shared Image' })}
                          >
                            <img
                              src={resolveFileUrl(m.fileUrl)}
                              alt={m.fileName || 'Attachment'}
                              style={{ maxWidth: '280px', maxHeight: '280px', borderRadius: '8px', border: '1px solid var(--border-color)', objectFit: 'cover' }}
                            />
                            <div
                              style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                backgroundColor: 'rgba(0,0,0,0.6)',
                                color: '#fff',
                                padding: '0.2rem 0.4rem',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                            >
                              <Maximize2 size={12} /> Click to expand
                            </div>
                          </div>
                        )}

                        {/* File Attachment */}
                        {m.messageType === 'file' && m.fileUrl && (
                          <a
                            href={resolveFileUrl(m.fileUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.5rem',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(0,0,0,0.05)',
                              color: 'inherit',
                              textDecoration: 'none',
                              marginBottom: '0.4rem',
                            }}
                          >
                            <FileText size={20} />
                            <div style={{ flex: 1, minWidth: 0, fontSize: '0.8rem' }}>
                              <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.fileName}</div>
                              <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{m.fileSize}</div>
                            </div>
                            <Download size={16} />
                          </a>
                        )}

                        {/* Text Message */}
                        <div className="message-text" style={{ fontStyle: m.isDeleted ? 'italic' : 'normal', opacity: m.isDeleted ? 0.7 : 1 }}>
                          {m.message}
                        </div>

                        {/* Message Meta & Action Tools */}
                        <div className="message-meta">
                          <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isOwn && <CheckCheck size={14} style={{ color: 'var(--primary-glow)' }} />}

                          {!m.isDeleted && (
                            <div style={{ display: 'inline-flex', gap: '0.35rem', marginLeft: '0.5rem' }}>
                              <button
                                onClick={() => setReplyingTo(m)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.7 }}
                                title="Reply"
                              >
                                <Reply size={13} />
                              </button>
                              {(isOwn || String(user?.role) === 'admin' || String(user?.role) === 'ADMIN') && (
                                <button
                                  onClick={() => setDeleteMessageId(m.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.7 }}
                                  title="Delete"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <footer className="chat-input-container">
              {/* Replying Preview Bar */}
              {replyingTo && (
                <div className="reply-bar">
                  <div>
                    <span style={{ fontWeight: 600 }}>Replying to {replyingTo.senderName}:</span>{' '}
                    <span style={{ color: 'var(--text-muted)' }}>{replyingTo.message}</span>
                  </div>
                  <button onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Input Row */}
              <div className="chat-input-row">
                {/* Generic File Picker Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
                />

                {/* Direct Image Picker Input */}
                <input
                  type="file"
                  ref={imageInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                  accept="image/*"
                />

                {/* WhatsApp Pill Capsule */}
                <div className="chat-input-pill">
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      className="chat-pill-btn"
                      onClick={() => setShowEmojiPicker((prev) => !prev)}
                      title="Add Emoji"
                    >
                      <Smile size={20} />
                    </button>
                    {showEmojiPicker && (
                      <EmojiPickerPopover
                        onSelectEmoji={(emoji) => setMessageText((prev) => prev + emoji)}
                        onClose={() => setShowEmojiPicker(false)}
                      />
                    )}
                  </div>

                  <textarea
                    className="chat-textarea"
                    placeholder="Message..."
                    value={messageText}
                    onChange={(e) => handleTyping(e.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    rows={1}
                  />

                  <button
                    type="button"
                    className="chat-pill-btn"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach File"
                  >
                    <Paperclip size={19} />
                  </button>

                  <button
                    type="button"
                    className="chat-pill-btn"
                    onClick={() => imageInputRef.current?.click()}
                    title="Send Image"
                  >
                    <ImageIcon size={19} />
                  </button>
                </div>

                {/* WhatsApp Circular Action Button */}
                <button
                  type="button"
                  className="chat-send-circle-btn"
                  onClick={() => handleSendMessage()}
                  disabled={!messageText.trim() && !uploading}
                  title="Send Message"
                >
                  <Send size={18} style={{ marginLeft: messageText.trim() ? '2px' : 0 }} />
                </button>
              </div>
            </footer>
          </>
        ) : (
          /* Empty State when no active conversation selected */
          <div style={{ margin: 'auto', textAlign: 'center', padding: '2rem' }}>
            <MessageSquare size={64} style={{ color: 'var(--primary-500)', opacity: 0.5, marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Welcome to HRMS Internal Chat</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0.5rem auto 1.5rem', fontSize: '0.9rem' }}>
              Connect and collaborate seamlessly with team members across departments and organizations in real-time.
            </p>
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setIsNewChatOpen(true)}>
              Start New Conversation
            </Button>
          </div>
        )}
      </main>

      {/* 3. MODALS */}
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        onSelectUser={handleStartPrivateChat}
      />

      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onGroupCreated={(convId) => {
          loadConversations();
          handleSelectConversation(convId);
        }}
      />

      <PostAnnouncementModal
        isOpen={isPostAnnounceOpen}
        onClose={() => setIsPostAnnounceOpen(false)}
        onSuccess={() => {
          loadConversations();
          if (activeConvId) handleSelectConversation(activeConvId);
        }}
      />

      {/* 4. FULLSCREEN IMAGE LIGHTBOX MODAL */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            backdropFilter: 'blur(5px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '-40px',
                right: 0,
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
                color: '#fff',
              }}
            >
              <a
                href={lightboxImage.url}
                download={lightboxImage.title}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', fontSize: '0.9rem' }}
              >
                <Download size={18} /> Download
              </a>
              <button
                onClick={() => setLightboxImage(null)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.title}
              style={{
                maxWidth: '90vw',
                maxHeight: '80vh',
                borderRadius: '8px',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
                objectFit: 'contain',
              }}
            />
            <div style={{ color: '#fff', marginTop: '0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>
              {lightboxImage.title}
            </div>
          </div>
        </div>
      )}

      {/* Delete Message Confirmation Modal */}
      <Modal isOpen={Boolean(deleteMessageId)} onClose={() => setDeleteMessageId(null)} title="Confirm Delete Message">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Are you sure you want to delete this message? This cannot be undone.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button variant="outline" onClick={() => setDeleteMessageId(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDeleteMessage}>Delete Message</Button>
          </div>
        </div>
      </Modal>

      {/* Chat Error Notification Modal */}
      <Modal isOpen={Boolean(chatError)} onClose={() => setChatError(null)} title="Chat Notification">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Alert variant="error" title="Action Failed">
            {chatError}
          </Alert>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" onClick={() => setChatError(null)}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ChatPage;
