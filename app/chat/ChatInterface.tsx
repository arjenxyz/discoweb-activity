'use client';

import { useEffect, useMemo, useRef, useState, useCallback, type ChangeEvent } from 'react';
import Image from 'next/image';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { apiUrl } from '@/lib/api';
import { useChat } from '../../lib/utils/useChat';
import { 
  Send, 
  Search, 
  Hash, 
  MessageCircle, 
  HelpCircle, 
  Users,
  Smile,
  Paperclip,
  MoreVertical,
  Pin,
  Reply,
  Edit2,
  Trash2,
  Check,
  Loader2,
  Image as ImageIcon,
  File,
  X,
  ArrowDown
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type UserStatus = 'online' | 'offline' | 'away' | 'dnd';

type User = {
  id: string;
  username?: string;
  avatar?: string;
  status?: UserStatus;
  last_seen?: string;
};

type Room = {
  id: string;
  room_type: 'dm' | 'group' | 'help';
  name?: string | null;
  description?: string | null;
  avatar_url?: string | null;
  last_message_at?: string | null;
  last_message_preview?: string | null;
  unread_count?: number;
  is_persistent?: boolean;
  is_archived?: boolean;
};

type Message = {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  content_type: 'text' | 'system' | 'file';
  metadata?: Record<string, unknown>;
  reply_to?: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  edited_at?: string | null;
  reactions?: MessageReaction[];
  attachments?: MessageAttachment[];
};

type MessageReaction = {
  emoji: string;
  user_id: string;
  count: number;
  users: string[];
};

type MessageAttachment = {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  thumbnail_url?: string;
};

type TypingUser = {
  user_id: string;
  username: string;
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function ChatInterface() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  // State
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const CHAT_RULES_VERSION = process.env.NEXT_PUBLIC_CHAT_RULES_VERSION ?? '1';
  const [chatAccepted, setChatAccepted] = useState<boolean>(false);
  const [, setNeedsChatAcceptance] = useState<boolean>(false);
  
  // Input state
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  
  // File upload state
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [] = useState<Record<string, number>>({});
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastScrollPos = useRef<number>(0);

  // ============================================================================
  // AUTHENTICATION CHECK
  // ============================================================================
  
  // `discordUser` lives in localStorage, which isn't available during SSR.
  // Start with `null` so server and initial client render match, then update
  // after hydration using an effect. This prevents the hydration mismatch
  // that occurred when the UI switched between login screen and chat.
  const [discordUser, setDiscordUser] = useState<string | null>(null);
  useEffect(() => {
    setDiscordUser(localStorage.getItem('discordUser'));
    try {
      const v = localStorage.getItem('chatRulesAcceptedVersion');
      setChatAccepted(v === CHAT_RULES_VERSION);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      setChatAccepted(false);
    }
  }, [CHAT_RULES_VERSION]);

  // when the stored discord object changes, parse it to obtain an ID and
  // ensure the `users` table contains a matching record.  we also set
  // currentUserId from the discord payload so that room queries work even if
  // supabase auth session is missing.
  useEffect(() => {
    if (!discordUser || !client) return;
    (async () => {
      try {
        // first, ensure we have a valid supabase session (so auth.uid() is set)
        const { data: { session } } = await client.auth.getSession();
        const supaId = session?.user?.id;
        if (!supaId) {
          console.warn('[chat] no supabase session; skipping user upsert');
          return;
        }

        const du = JSON.parse(discordUser) as { id?: string; username?: string; avatar?: string };
        if (du.id) {
          // use the Supabase UUID as primary key, store the Discord snowflake
          // in a separate `discord_id` column to avoid RLS conflicts.
          setCurrentUserId(supaId);
          try {
            const result = await client
              .from('users')
              .upsert({
                id: supaId,
                discord_id: du.id,
                username: du.username,
                avatar: du.avatar,
              });

            console.debug('upsert discord user result', result);

            const errObj = (result as { error?: { code?: string; [key: string]: unknown } })?.error;
            if (errObj && typeof errObj === 'object' && Object.keys(errObj).length > 0) {
              // If the error indicates a uuid parsing problem, fall back below.
              if ('code' in errObj && errObj.code === '22P02') {
                throw errObj; // jump to catch to attempt fallback upsert
              }
              console.error('Failed to upsert discord user', JSON.stringify(result));
            }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (upsertErr) {
            // If inserting into `id` failed because the DB expects uuids,
            // try to store the Discord snowflake in a text column named
            // `discord_id` (if present). This makes the client compatible
            // with both legacy text-id schemas and UUID-based schemas.
            try {
              const fallback = await client
                .from('users')
                .upsert({ discord_id: du.id, username: du.username, avatar: du.avatar });

              console.debug('fallback upsert discord user result', fallback);

              const ferr = (fallback as { error?: { code?: string; [key: string]: unknown } })?.error;
              if (ferr && typeof ferr === 'object' && Object.keys(ferr).length > 0) {
                console.error('Failed fallback upsert for discord user', JSON.stringify(fallback));

                // If the failure is caused by row-level security (42501),
                // perform the upsert via a secure server-side API that uses
                // the Supabase service role key. This avoids exposing the
                // service key to clients while allowing the server to
                // perform the necessary write.
                try {
                  if ((ferr as { code?: string })?.code === '42501') {
                    const resp = await fetch(apiUrl('/api/upsert-discord-user'), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: du.id, username: du.username, avatar: du.avatar })
                    });
                    const json = await resp.json();
                    console.debug('server upsert result', json);
                    if (!resp.ok) {
                      console.error('Server upsert responded with status', resp.status, json);
                      setError('KullanÄ±cÄ± veritabanÄ±na kaydedilemedi');
                      setNeedsChatAcceptance(true);
                    }
                  }
                } catch (e3) {
                  console.error('Server upsert failed', e3);
                  setNeedsChatAcceptance(true);
                }
              }
            } catch (e2) {
              console.error('Could not upsert discord user (both primary and fallback attempts failed)', e2);
            }
          }
        }
      } catch (e) {
        console.error('Could not parse discordUser from localStorage', e);
      }
    })();
  }, [discordUser, client]);

  // logging in is now controlled by having a discord token and accepting chat rules;
  // supabase session is only used for updating status and subscriptions.
  const isLoggedIn = !!discordUser && chatAccepted;

  const acceptChatRules = async () => {
    if (!discordUser) return;
    try {
      const du = JSON.parse(discordUser) as { id?: string; username?: string; avatar?: string; name?: string };
      // Try server upsert (best-effort). If it fails, still honor local acceptance
      try {
        await fetch(apiUrl('/api/upsert-discord-user'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: du.id, username: du.username, avatar: du.avatar, name: du.name })
        });
      } catch (e) {
        console.error('acceptChatRules: server upsert failed', e);
      }
    } catch (e) {
      console.error('acceptChatRules: could not parse discordUser', e);
    }

    try {
      localStorage.setItem('chatRulesAcceptedVersion', CHAT_RULES_VERSION);
    } catch {}
    setChatAccepted(true);
    setNeedsChatAcceptance(false);
    setError(null);
  };

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  // Load current user
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!client) return;
        const { data } = await client.auth.getUser();
        if (!mounted) return;
        const userId = data?.user?.id;
        setCurrentUserId(userId ?? null);
        
        // Update user status to online
        if (userId) {
          await client
            .from('users')
            .upsert({ 
              id: userId, 
              status: 'online',
              last_seen: new Date().toISOString()
            });
        }
      } catch (err) {
        console.error('Failed to get user:', err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [client]);

  // Load rooms
  useEffect(() => {
    // keep fetching even if we don't yet know the current user; persistent
    // rooms should always be visible
    const loadRooms = async () => {
      try {
        // Fetch rooms where the user is a member (if we have a user)
        let memberRooms: Room[] = [];
        if (currentUserId) {
          const { data, error } = await client
            .from('rooms')
            .select(`
              *,
              room_members!inner(unread_count, is_pinned, last_read_at)
            `)
            .eq('room_members.user_id', currentUserId)
            .eq('is_archived', false)
            .order('last_message_at', { ascending: false, nullsFirst: false });

          if (error) throw error;
          memberRooms = data || [];
        }

        // Fetch persistent rooms (visible to everyone)
        const { data: persistentData, error: persistentError } = await client
          .from('rooms')
          .select('*')
          .eq('is_persistent', true)
          .eq('is_archived', false)
          .order('last_message_at', { ascending: false, nullsFirst: false });

        if (persistentError) throw persistentError;
        const persistentRooms: Room[] = persistentData || [];

        // Merge and dedupe (memberRooms first)
        const map = new Map<string, Room>();
        memberRooms.forEach(r => map.set(r.id, r));
        persistentRooms.forEach(r => { if (!map.has(r.id)) map.set(r.id, r); });

        const merged = Array.from(map.values()).sort((a, b) => {
          const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
          const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
          return tb - ta;
        });

        setRooms(merged);

        // Auto-select first room if none selected
        if (!activeRoom && merged && merged.length > 0) {
          setActiveRoom(merged[0].id);
        }
      } catch (err) {
        console.error('Failed to load rooms:', err);
        setError('Odalar yÃ¼klenemedi');
      }
    };

    loadRooms();

    // Subscribe to room changes
    // only reload rooms when a *persistent* room changes; otherwise every
    // message update (which bumps last_message_at) would trigger a full
    // refetch and may appear like the UI is constantly refreshing.
    const subscription = client
      .channel('rooms_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',          // only care when new persistent room is created
          schema: 'public',
          table: 'rooms',
          filter: 'is_persistent=eq.true',
        },
        () => {
          loadRooms();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [client, currentUserId, activeRoom]);

  // Load users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data, error } = await client
          .from('users')
          .select('id, username, avatar, status, last_seen')
          .limit(1000);

        if (error) throw error;

        const userMap: Record<string, User> = {};
        data?.forEach((user: User) => {
          userMap[user.id] = user;
        });
        setUsers(userMap);
      } catch (err) {
        console.error('Failed to load users:', err);
      }
    };

    loadUsers();

    // Subscribe to user status changes
    const subscription = client
      .channel('user_presence')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
        },
        (payload: { eventType: string; new: User }) => {
          setUsers(prev => ({
            ...prev,
            [payload.new.id]: payload.new
          }));
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [client]);

  // ============================================================================
  // CHAT HOOK INTEGRATION
  // ============================================================================

  const {
    messages,
    sendMessage: chatSendMessage,
    isLoading: messagesLoading,
  } = useChat({
    roomId: activeRoom,
    currentUserId,
    supabaseClient: client,
    onNewMessage: () => {
      // Auto-scroll if user is near bottom
      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        if (scrollHeight - scrollTop - clientHeight < 200) {
          setTimeout(() => scrollToBottom(true), 100);
        } else {
          setShowScrollDown(true);
        }
      }
    },
    onTyping: (userId: string, isTyping: boolean) => {
      const username = users[userId]?.username || userId;
      
      setTypingUsers(prev => {
        if (isTyping) {
          if (!prev.find(u => u.user_id === userId)) {
            return [...prev, { user_id: userId, username }];
          }
          return prev;
        } else {
          return prev.filter(u => u.user_id !== userId);
        }
      });
    },
  });

  // ============================================================================
  // SCROLL MANAGEMENT
  // ============================================================================

  const scrollToBottom = useCallback((smooth = false) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
      setShowScrollDown(false);
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    setShowScrollDown(distanceFromBottom > 200);
    lastScrollPos.current = scrollTop;
  }, []);

  // Initial scroll
  useEffect(() => {
    if (messages.length > 0 && scrollRef.current) {
      const isFirstLoad = lastScrollPos.current === 0;
      scrollToBottom(!isFirstLoad);
    }
  }, [activeRoom, scrollToBottom]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  const sendMessage = async () => {
    if (!isLoggedIn) {
      console.warn('[sendMessage] blocked: not logged in', {
        discordUser,
        chatAccepted,
      });
      return;
    }
    if (!activeRoom) {
      console.warn('[sendMessage] blocked: no active room');
      return;
    }
    if (!input.trim() && uploadingFiles.length === 0) {
      return;
    }
    try {
      const messageContent = input.trim();
      setInput('');
      setReplyTo(null);
      
      // Handle file uploads
      const attachments: string[] = [];
      if (uploadingFiles.length > 0) {
        for (const file of uploadingFiles) {
          // Simulate file upload - replace with actual upload logic
          const fileUrl = await uploadFile(file);
          attachments.push(fileUrl);
        }
        setUploadingFiles([]);
      }

      // Send message
      await chatSendMessage(messageContent);

      // Mark room as read
      await markRoomAsRead(activeRoom);
      
      scrollToBottom(true);
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Mesaj gÃ¶nderilemedi');
    }
  };

  const editMessage = async (messageId: string, newContent: string) => {
    try {
      await client
        .from('messages')
        .update({ 
          content: newContent, 
          is_edited: true, 
          edited_at: new Date().toISOString() 
        })
        .eq('id', messageId);
      
      setEditingMessage(null);
      setInput('');
    } catch (err) {
      console.error('Failed to edit message:', err);
      setError('Mesaj dÃ¼zenlenemedi');
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Bu mesajÄ± silmek istediÄŸinizden emin misiniz?')) return;
    
    try {
      await client
        .from('messages')
        .update({ 
          is_deleted: true, 
          deleted_at: new Date().toISOString() 
        })
        .eq('id', messageId);
    } catch (err) {
      console.error('Failed to delete message:', err);
      setError('Mesaj silinemedi');
    }
  };

  const reactToMessage = async (messageId: string, emoji: string) => {
    try {
      await client
        .from('message_reactions')
        .upsert({
          message_id: messageId,
          user_id: currentUserId,
          emoji
        });
      
      setShowEmojiPicker(null);
    } catch (err) {
      console.error('Failed to react:', err);
    }
  };

  const removeReaction = async (messageId: string, emoji: string) => {
    try {
      await client
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', currentUserId)
        .eq('emoji', emoji);
    } catch (err) {
      console.error('Failed to remove reaction:', err);
    }
  };

  // ============================================================================
  // TYPING INDICATORS
  // ============================================================================

  const broadcastTyping = useCallback(async (isTyping: boolean) => {
    if (!activeRoom || !currentUserId) return;
    
    try {
      if (isTyping) {
        await client
          .from('typing_indicators')
          .upsert({
            room_id: activeRoom,
            user_id: currentUserId,
            expires_at: new Date(Date.now() + 5000).toISOString()
          });
      } else {
        await client
          .from('typing_indicators')
          .delete()
          .eq('room_id', activeRoom)
          .eq('user_id', currentUserId);
      }
    } catch (err) {
      console.error('Failed to broadcast typing:', err);
    }
  }, [client, activeRoom, currentUserId]);

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    
    if (value.trim()) {
      broadcastTyping(true);
      
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = window.setTimeout(() => {
        broadcastTyping(false);
      }, 2000);
    } else {
      broadcastTyping(false);
    }
  };

  // Cleanup typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      broadcastTyping(false);
    };
  }, [broadcastTyping]);

  // ============================================================================
  // FILE HANDLING
  // ============================================================================

  const uploadFile = async (file: File): Promise<string> => {
    // Simulate upload - replace with actual Supabase Storage upload
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`https://example.com/files/${file.name}`);
      }, 1000);
    });
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadingFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  // ============================================================================
  // ROOM MANAGEMENT
  // ============================================================================

  const markRoomAsRead = async (roomId: string) => {
    if (!currentUserId) return;
    
    try {
      await client
        .from('room_members')
        .update({ 
          unread_count: 0, 
          last_read_at: new Date().toISOString() 
        })
        .eq('room_id', roomId)
        .eq('user_id', currentUserId);
      
      // Update local state
      setRooms(prev => prev.map(r => 
        r.id === roomId ? { ...r, unread_count: 0 } : r
      ));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const searchMessages = async (query: string) => {
    if (!query.trim() || !currentUserId) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await client
        .rpc('search_messages', {
          p_user_id: currentUserId,
          p_query: query,
          p_limit: 50
        });
      
      if (error) throw error;
      
      // Handle search results - you can show them in a modal or sidebar
      console.log('Search results:', data);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const createDMRoom = async (targetUserId: string) => {
    if (!currentUserId) return;
    
    try {
      const { data: roomId } = await client
        .rpc('get_or_create_dm_room', {
          uid_a: currentUserId,
          uid_b: targetUserId
        });
      
      if (roomId) {
        setActiveRoom(roomId);
        setSearchQuery('');
      }
    } catch (err) {
      console.error('Failed to create DM:', err);
      setError('Ã–zel mesaj oluÅŸturulamadÄ±');
    }
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getRoomIcon = (room: Room) => {
    switch (room.room_type) {
      case 'dm':
        return <MessageCircle className="w-4 h-4" />;
      case 'group':
        return <Users className="w-4 h-4" />;
      case 'help':
        return <HelpCircle className="w-4 h-4" />;
      default:
        return <Hash className="w-4 h-4" />;
    }
  };

  const getRoomName = (room: Room) => {
    if (room.name) return room.name;
    if (room.room_type === 'dm') return 'Ã–zel Mesaj';
    return 'Sohbet';
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return 'BugÃ¼n';
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'DÃ¼n';
    } else {
      return d.toLocaleDateString('tr-TR', { 
        day: 'numeric', 
        month: 'long',
        year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const shouldShowDateSeparator = (currentMsg: Message, prevMsg?: Message) => {
    if (!prevMsg) return true;
    const currentDate = new Date(currentMsg.created_at).toDateString();
    const prevDate = new Date(prevMsg.created_at).toDateString();
    return currentDate !== prevDate;
  };

  const getUserStatus = (userId: string): UserStatus => {
    const user = users[userId];
    if (!user) return 'offline';
    
    // Check if user was seen in last 5 minutes
    if (user.last_seen) {
      const lastSeen = new Date(user.last_seen);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastSeen.getTime()) / 1000 / 60;
      
      if (diffMinutes < 5) return user.status || 'online';
    }
    
    return 'offline';
  };

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'dnd': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: UserStatus) => {
    switch (status) {
      case 'online': return 'Ã‡evrimiÃ§i';
      case 'away': return 'Uzakta';
      case 'dnd': return 'RahatsÄ±z Etmeyin';
      default: return 'Ã‡evrimdÄ±ÅŸÄ±';
    }
  };

  // ============================================================================
  // RENDER GUARDS
  // ============================================================================

  if (!discordUser) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0a0b0e]">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold text-white mb-4">
            Sohbete HoÅŸ Geldiniz
          </h2>
          <p className="text-white/60 mb-6">Devam etmek iÃ§in Discord ile giriÅŸ yapÄ±n</p>
          <button className="px-6 py-3 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-lg transition-colors">
            Discord ile GiriÅŸ Yap
          </button>
        </div>
      </div>
    );
  }

  if (!chatAccepted) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0a0b0e] text-white p-6">
        <div className="max-w-2xl w-full bg-[#13141a] border border-white/5 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Sohbet KurallarÄ±</h2>
          <div className="text-sm text-white/70 mb-4">
            <ul className="list-disc list-inside space-y-2">
              <li>SaygÄ±lÄ± olun.</li>
              <li>Reklam veya saldÄ±rgan iÃ§erik yasaktÄ±r.</li>
              <li>KiÅŸisel verileri paylaÅŸmayÄ±n.</li>
            </ul>
            <p className="mt-3 text-xs text-white/50">Bu kurallarÄ± onayladÄ±ÄŸÄ±nÄ±zda sohbet kullanÄ±m hakkÄ±, bir sonraki geliÅŸtirici kural deÄŸiÅŸikliÄŸine kadar geÃ§erli olacaktÄ±r.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={acceptChatRules}
              className="px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] rounded-lg"
            >
              OnaylÄ±yorum
            </button>
            <button
              onClick={() => { setError('Sohbet kurallarÄ±nÄ± kabul etmeniz gerekiyor'); }}
              className="px-4 py-2 bg-transparent border border-white/10 rounded-lg"
            >
              VazgeÃ§
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // FILTERED DATA
  // ============================================================================

  const filteredRooms = rooms.filter(room => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (room.name ?? '').toLowerCase().includes(query) ||
      room.room_type.toLowerCase().includes(query) ||
      (room.description ?? '').toLowerCase().includes(query)
    );
  });

  const currentRoom = rooms.find(r => r.id === activeRoom);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="fixed inset-0 z-50 flex bg-[#0a0b0e] text-white">
      {/* ========== SIDEBAR ========== */}
      <div className="w-80 bg-[#13141a] border-r border-white/5 flex flex-col">
        {/* Search header */}
        <div className="p-4 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  searchMessages(searchQuery);
                }
              }}
              placeholder="Sohbet ara veya baÅŸlat..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#0a0b0e] border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#5865f2] transition-colors"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 animate-spin" />
            )}
          </div>
        </div>

        {/* Rooms list */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            {filteredRooms.map((room) => {
              const isActive = activeRoom === room.id;
              const hasUnread = (room.unread_count ?? 0) > 0;
              
              return (
                <button
                  key={room.id}
                  onClick={() => {
                    setActiveRoom(room.id);
                    markRoomAsRead(room.id);
                  }}
                  className={`w-full p-3 rounded-lg transition-all duration-200 group ${
                    isActive
                      ? 'bg-[#5865f2]/10 border border-[#5865f2]/30'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Room icon/avatar */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                      isActive ? 'bg-[#5865f2] text-white' : 'bg-white/5 text-white/60 group-hover:bg-white/10'
                    } transition-colors`}>
                      {room.avatar_url ? (
                        <Image 
                          src={room.avatar_url} 
                          alt={room.name || 'Room'} 
                          width={40} 
                          height={40}
                          className="rounded-lg"
                        />
                      ) : (
                        getRoomIcon(room)
                      )}
                    </div>

                    {/* Room info */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`text-sm font-medium truncate ${
                          hasUnread ? 'text-white font-semibold' : 'text-white/80'
                        }`}>
                          {getRoomName(room)}
                        </h3>
                        {room.last_message_at && (
                          <span className="text-xs text-white/40 flex-shrink-0 ml-2">
                            {formatTime(room.last_message_at)}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <p className={`text-xs truncate ${
                          hasUnread ? 'text-white/70 font-medium' : 'text-white/40'
                        }`}>
                          {room.last_message_preview || 'HenÃ¼z mesaj yok'}
                        </p>
                        {hasUnread && (
                          <span className="flex-shrink-0 ml-2 px-2 py-0.5 bg-[#5865f2] text-white text-xs font-bold rounded-full min-w-[20px] text-center">
                            {room.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

            {filteredRooms.length === 0 && (
              <div className="text-center py-8 text-white/40 text-sm">
                {searchQuery ? 'Sohbet bulunamadÄ±' : 'HenÃ¼z sohbet yok'}
              </div>
            )}
          </div>
        </div>

        {/* User info */}
        {currentUserId && users[currentUserId] && (
          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-3">
              <div className="relative">
                {users[currentUserId].avatar ? (
                  <Image
                    src={users[currentUserId].avatar!}
                    alt="You"
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#5865f2] flex items-center justify-center text-white font-semibold">
                    {users[currentUserId].username?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                )}
                <div className={`absolute bottom-0 right-0 w-3 h-3 ${getStatusColor('online')} border-2 border-[#13141a] rounded-full`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {users[currentUserId].username || 'Anonymous'}
                </div>
                <div className="text-xs text-white/40">
                  {getStatusText('online')}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========== MAIN CHAT AREA ========== */}
      <div className="flex-1 flex flex-col">
        {/* Chat header */}
        <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#13141a]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#5865f2]/10 flex items-center justify-center border border-[#5865f2]/30">
              {currentRoom && getRoomIcon(currentRoom)}
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                {currentRoom ? getRoomName(currentRoom) : 'Sohbet'}
              </h2>
              {typingUsers.length > 0 && (
                <p className="text-xs text-[#5865f2] font-medium">
                  {typingUsers[0].username} yazÄ±yor
                  {typingUsers.length > 1 && ` ve ${typingUsers.length - 1} kiÅŸi daha`}
                  <span className="animate-pulse">...</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              title="Sabitle"
            >
              <Pin className="w-5 h-5 text-white/60" />
            </button>
            <button 
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              title="Ara"
              onClick={() => searchMessages(searchQuery)}
            >
              <Search className="w-5 h-5 text-white/60" />
            </button>
            <button 
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              title="Daha fazla"
            >
              <MoreVertical className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 bg-[#0f131d] relative"
        >
          {messagesLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-white/40 text-center">
              <div>
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium mb-2">HenÃ¼z mesaj yok</p>
                <p className="text-sm">Ä°lk mesajÄ± gÃ¶ndererek sohbeti baÅŸlatÄ±n</p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-1">
              {messages.map((msg, idx) => {
                const message = msg as Message;
                const prevMsg = idx > 0 ? (messages[idx - 1] as Message) : undefined;
                const showAvatar = !prevMsg || prevMsg.sender_id !== message.sender_id;
                const showDate = shouldShowDateSeparator(message, prevMsg);
                const user = users[message.sender_id];
                const isConsecutive = prevMsg && prevMsg.sender_id === message.sender_id && !showDate;
                const isOwnMessage = message.sender_id === currentUserId;

                if (message.is_deleted) {
                  return (
                    <div key={message.id} className="py-1 px-3 text-white/30 text-sm italic">
                      Bu mesaj silindi
                    </div>
                  );
                }

                return (
                  <div key={message.id}>
                    {/* Date separator */}
                    {showDate && (
                      <div className="flex items-center justify-center my-6">
                        <div className="px-3 py-1 bg-[#13141a] border border-white/10 rounded-full text-xs text-white/60 font-medium">
                          {formatDate(message.created_at)}
                        </div>
                      </div>
                    )}

                    {/* Message */}
                    <div
                      className={`flex items-start gap-3 py-0.5 px-3 rounded-lg hover:bg-white/[0.02] transition-colors group ${
                        isConsecutive ? 'mt-0' : 'mt-4'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="flex-shrink-0 w-10">
                        {showAvatar ? (
                          <div className="relative">
                            {user?.avatar ? (
                              <Image
                                src={user.avatar}
                                alt={user.username || 'User'}
                                width={40}
                                height={40}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5865f2] to-[#3b47d4] flex items-center justify-center text-white font-semibold">
                                {(user?.username ?? message.sender_id)?.charAt?.(0)?.toUpperCase() ?? '?'}
                              </div>
                            )}
                            {/* Online status */}
                            <div className={`absolute bottom-0 right-0 w-3 h-3 ${getStatusColor(getUserStatus(message.sender_id))} border-2 border-[#0f131d] rounded-full`} />
                          </div>
                        ) : (
                          <span className="text-[10px] text-white/30 opacity-0 group-hover:opacity-100 transition-opacity">
                            {formatTime(message.created_at)}
                          </span>
                        )}
                      </div>

                      {/* Message content */}
                      <div className="flex-1 min-w-0">
                        {showAvatar && (
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-sm font-semibold text-white/90">
                              {user?.username || message.sender_id}
                            </span>
                            <span className="text-xs text-white/40">
                              {formatTime(message.created_at)}
                            </span>
                            {message.is_edited && (
                              <span className="text-[10px] text-white/30 italic">
                                (dÃ¼zenlendi)
                              </span>
                            )}
                          </div>
                        )}

                        {/* Reply reference */}
                        {message.reply_to && (
                          <div className="mb-2 pl-3 border-l-2 border-white/20 py-1">
                            <div className="text-xs text-white/40 flex items-center gap-1">
                              <Reply className="w-3 h-3" />
                              <span>YanÄ±tlanan mesaj</span>
                            </div>
                          </div>
                        )}

                        {/* Message text */}
                        <p className="text-sm text-white/80 leading-relaxed break-words whitespace-pre-wrap">
                          {message.content}
                        </p>

                        {/* Attachments */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {message.attachments.map((attachment) => (
                              <div
                                key={attachment.id}
                                className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10"
                              >
                                {attachment.file_type.startsWith('image/') ? (
                                  <ImageIcon className="w-5 h-5 text-white/60" />
                                ) : (
                                  <File className="w-5 h-5 text-white/60" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm text-white/80 truncate">
                                    {attachment.file_name}
                                  </div>
                                  <div className="text-xs text-white/40">
                                    {(attachment.file_size / 1024).toFixed(1)} KB
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reactions */}
                        {message.reactions && message.reactions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {message.reactions.map((reaction) => (
                              <button
                                key={reaction.emoji}
                                onClick={() => {
                                  if (reaction.users.includes(currentUserId!)) {
                                    removeReaction(message.id, reaction.emoji);
                                  } else {
                                    reactToMessage(message.id, reaction.emoji);
                                  }
                                }}
                                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                                  reaction.users.includes(currentUserId!)
                                    ? 'bg-[#5865f2]/20 border border-[#5865f2]/40'
                                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                                }`}
                              >
                                <span>{reaction.emoji}</span>
                                <span className="text-white/60">{reaction.count}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Message actions */}
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-1 bg-[#13141a] border border-white/10 rounded-lg p-1">
                          <button
                            onClick={() => setShowEmojiPicker(message.id)}
                            className="p-1.5 hover:bg-white/10 rounded transition-colors"
                            title="Tepki ekle"
                          >
                            <Smile className="w-4 h-4 text-white/60" />
                          </button>
                          <button
                            onClick={() => setReplyTo(message)}
                            className="p-1.5 hover:bg-white/10 rounded transition-colors"
                            title="YanÄ±tla"
                          >
                            <Reply className="w-4 h-4 text-white/60" />
                          </button>
                          {isOwnMessage && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingMessage(message);
                                  setInput(message.content);
                                }}
                                className="p-1.5 hover:bg-white/10 rounded transition-colors"
                                title="DÃ¼zenle"
                              >
                                <Edit2 className="w-4 h-4 text-white/60" />
                              </button>
                              <button
                                onClick={() => deleteMessage(message.id)}
                                className="p-1.5 hover:bg-red-500/10 rounded transition-colors"
                                title="Sil"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Emoji picker */}
                    {showEmojiPicker === message.id && (
                      <div className="absolute z-50 mt-2 p-2 bg-[#13141a] border border-white/10 rounded-lg shadow-lg">
                        <div className="grid grid-cols-8 gap-1">
                          {['ğŸ‘', 'â¤ï¸', 'ğŸ˜‚', 'ğŸ˜®', 'ğŸ˜¢', 'ğŸ”¥', 'âœ…', 'ğŸ‘'].map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => reactToMessage(message.id, emoji)}
                              className="p-2 hover:bg-white/10 rounded transition-colors text-xl"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Scroll to bottom button */}
          {showScrollDown && (
            <button
              onClick={() => scrollToBottom(true)}
              className="fixed bottom-24 right-8 p-3 bg-[#5865f2] hover:bg-[#4752c4] rounded-full shadow-lg transition-all"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-white/5 p-4 bg-[#13141a]">
          <div className="max-w-4xl mx-auto">
            {/* Reply/Edit bar */}
            {(replyTo || editingMessage) && (
              <div className="mb-2 p-3 bg-white/5 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {replyTo ? (
                    <>
                      <Reply className="w-4 h-4 text-[#5865f2]" />
                      <span className="text-sm text-white/60">
                        {users[replyTo.sender_id]?.username || 'Birine'} yanÄ±t veriliyor
                      </span>
                    </>
                  ) : (
                    <>
                      <Edit2 className="w-4 h-4 text-[#5865f2]" />
                      <span className="text-sm text-white/60">
                        Mesaj dÃ¼zenleniyor
                      </span>
                    </>
                  )}
                </div>
                <button
                  onClick={() => {
                    setReplyTo(null);
                    setEditingMessage(null);
                    setInput('');
                  }}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>
            )}

            {/* File previews */}
            {uploadingFiles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {uploadingFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="relative p-2 bg-white/5 rounded-lg border border-white/10 flex items-center gap-2"
                  >
                    <File className="w-4 h-4 text-white/60" />
                    <span className="text-sm text-white/80">{file.name}</span>
                    <button
                      onClick={() => removeFile(idx)}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                      <X className="w-3 h-3 text-white/60" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mb-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="p-1 hover:bg-red-500/20 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Input bar */}
            <div className="flex items-end gap-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 hover:bg-white/5 rounded-lg transition-colors flex-shrink-0"
                title="Dosya ekle"
              >
                <Paperclip className="w-5 h-5 text-white/60" />
              </button>

              <div className="flex-1 bg-[#0a0b0e] border border-white/10 rounded-xl focus-within:border-[#5865f2] transition-colors relative">
                <input
                  type="text"
                  value={input}
                  onChange={onInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (editingMessage) {
                        editMessage(editingMessage.id, input);
                      } else {
                        sendMessage();
                      }
                    }
                    if (e.key === 'Escape') {
                      setReplyTo(null);
                      setEditingMessage(null);
                      setInput('');
                    }
                  }}
                  placeholder={
                    editingMessage 
                      ? 'MesajÄ± dÃ¼zenle...' 
                      : replyTo 
                      ? 'YanÄ±t yaz...'
                      : 'Mesaj yazÄ±n...'
                  }
                  disabled={!isLoggedIn}
                  className="w-full px-4 py-3 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
                />
                {!isLoggedIn && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-sm">
                    GiriÅŸ yapmadan mesaj gÃ¶nderemezsiniz
                  </div>
                )}
              </div>

              <button
                className="p-2.5 hover:bg-white/5 rounded-lg transition-colors flex-shrink-0"
                title="Emoji ekle"
              >
                <Smile className="w-5 h-5 text-white/60" />
              </button>

              <button
                onClick={() => {
                  if (editingMessage) {
                    editMessage(editingMessage.id, input);
                  } else {
                    sendMessage();
                  }
                }}
                disabled={!input.trim() && uploadingFiles.length === 0}
                className="p-2.5 bg-[#5865f2] hover:bg-[#4752c4] disabled:bg-white/10 disabled:cursor-not-allowed rounded-lg transition-colors flex-shrink-0"
                title={editingMessage ? 'Kaydet' : 'GÃ¶nder'}
              >
                {editingMessage ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Status indicators */}
            <div className="mt-2 text-xs text-white/40 flex items-center gap-4">
              {typingUsers.length > 0 && (
                <span>
                  {typingUsers[0].username} yazÄ±yor
                  {typingUsers.length > 1 && ` ve ${typingUsers.length - 1} kiÅŸi daha`}
                  <span className="animate-pulse">...</span>
                </span>
              )}
              {currentRoom && (
                <span>
                  {currentRoom.room_type === 'dm' && 'ğŸ”’ Åifreli sohbet'}
                  {currentRoom.room_type === 'help' && 'ğŸ’¬ YardÄ±m odasÄ±'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



