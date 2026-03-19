'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { getSupabaseClient } from '../../../lib/supabaseClient';
import { useChat } from '../../../lib/utils/useChat';
import {
  Send,
  Search,
  MessageCircle,
  HelpCircle,
  Users,
  ArrowLeft,
  Plus,
} from 'lucide-react';

// --- types --------------------------------------------------------------

type Message = {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  edited_at?: string | null;
};

type Room = {
  id: string;
  room_type: 'dm' | 'group' | 'help';
  name?: string | null;
  last_message_at?: string | null;
  last_message_preview?: string | null;
  unread_count?: number;
  is_persistent?: boolean;
};

type Profile = {
  id: string;
  username?: string;
  avatar_url?: string;
  status?: 'online' | 'offline' | 'away';
};

// -----------------------------------------------------------------------

export default function ChatWidget() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const router = useRouter();
  const pathname = usePathname();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  // state
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typing, setTyping] = useState<Record<string, boolean>>({});
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [showRoomsMobile, setShowRoomsMobile] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [devViewMessages, setDevViewMessages] = useState<Message[] | null>(null);
  const [devViewTitle, setDevViewTitle] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  // login state
  useEffect(() => {
    const discordUser = localStorage.getItem('discordUser');
    Promise.resolve().then(() => {
      setIsLoggedIn(Boolean(discordUser));
    });
  }, []);

  // load rooms
  useEffect(() => {
    const load = async () => {
      if (!client) return;
      try {
        const res = await client
          .from('rooms')
          .select('*, room_members!inner(unread_count)')
          .order('last_message_at', { ascending: false });
        const data = (res?.data ?? []) as Room[];
        setRooms(data);
        if (data.length > 0) setActiveRoom(data[0].id);
      } catch (e) {
        console.error('room load fail', e);
      }
    };
    load();
  }, [client]);

  // load profiles
  useEffect(() => {
    const load = async () => {
      if (!client) return;
      try {
        const res = await client.from('users').select('id, username, avatar, status').limit(500);
        const map: Record<string, Profile> = {};
        (res?.data ?? []).forEach((u: { id: string; username?: string; avatar?: string; status?: string }) => {
          map[u.id] = {
            id: u.id,
            username: u.username,
            avatar_url: u.avatar,
            status: (u.status === 'online' || u.status === 'offline' || u.status === 'away') ? u.status : 'offline',
          };
        });
        setProfiles(map);
      } catch (e) {
        console.error('profiles load', e);
      }
    };
    load();
  }, [client]);

  // current user
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!client) return;
      try {
        const u = await client.auth.getUser();
        if (mounted) setCurrentUserId(u?.data?.user?.id ?? null);
      } catch {}
    })();
    return () => { mounted = false; };
  }, [client]);

  // chat hook
  const {
    messages: hookMessages,
    sendMessage: chatSendMessage,
    broadcastTyping: chatBroadcastTyping,
  } = useChat({
    roomId: activeRoom,
    currentUserId,
    supabaseClient: client,
    onTyping: (uid, isTyping) => {
      setTyping((t) => ({ ...t, [uid]: isTyping }));
      if (isTyping) {
        setTimeout(() => setTyping((t) => ({ ...t, [uid]: false })), 3000);
      }
    },
  });

  const messages: Message[] = (hookMessages as unknown) as Message[];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!isLoggedIn) {
      alert('Sohbete baÅŸlamadan Ã¶nce Discord ile giriÅŸ yapÄ±n.');
      return;
    }
    if (!activeRoom || input.trim() === '') return;
    setInput('');
    await chatSendMessage(input);
  };

  const broadcastTyping = async (isTyping: boolean) => {
    await chatBroadcastTyping(isTyping);
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInput(v);
    broadcastTyping(true).catch(() => {});
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      broadcastTyping(false).catch(() => {});
    }, 1500);
  };

  const handleSearch = async () => {
    if (!isLoggedIn) {
      alert('Sohbete baÅŸlamadan Ã¶nce Discord ile giriÅŸ yapÄ±n.');
      return;
    }
    const query = searchQuery.trim();
    if (!query) return;
    const discordId = query;
    try {
      let callerId = currentUserId;
      if (!callerId) {
        const du = localStorage.getItem('discordUser');
        try { callerId = du ? JSON.parse(du).id : null; } catch { callerId = null; }
      }
      if (!callerId) {
        alert('Sohbete baÅŸlamadan Ã¶nce Discord ile giriÅŸ yapÄ±n.');
        return;
      }

      // Quick check: if the target ID isn't in the locally-cached profiles,
      // query the `users` table to verify the user exists before calling RPC.
      if (!profiles[discordId]) {
        try {
          const { data: userRow } = await client.from('users').select('id').eq('id', discordId).maybeSingle();
          if (!userRow) {
            alert('KullanÄ±cÄ± bulunamadÄ±.');
            return;
          }
        } catch (err) {
          console.error('User lookup failed', err);
          alert('KullanÄ±cÄ± doÄŸrulanÄ±rken hata oluÅŸtu.');
          return;
        }
      }

      const { data } = await client.rpc('get_or_create_dm_room', {
        uid_a: callerId,
        uid_b: discordId,
      });
      const roomId = data as string;
      const { data: roomRow } = await client.from('rooms').select('*').eq('id', roomId).maybeSingle();
      if (roomRow) {
        setRooms((prev) => [roomRow, ...prev.filter((r) => r.id !== roomRow.id)]);
        setActiveRoom(roomRow.id);
        setSearchQuery('');
      }
    } catch (e) {
      console.error('Search error', e);
      alert('Sohbet oluÅŸturulamadÄ± â€” konsolu kontrol edin.');
    }
  };

  const userSuggestions = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return Object.values(profiles)
      .filter(
        (p) => (p.username ?? '').toLowerCase().includes(q) || p.id.includes(q)
      )
      .map((p) => ({ discordId: p.id, username: p.username ?? p.id, avatar_url: p.avatar_url }))
      .slice(0, 5);
  }, [searchQuery, profiles]);

  const filteredRooms = rooms.filter((room) => {
    if (searchQuery) {
      const s = searchQuery.toLowerCase();
      if (!room.name?.toLowerCase().includes(s) &&
          !room.room_type.toLowerCase().includes(s)) {
        return false;
      }
    }
    return true;
  });

  const typingUsers = Object.keys(typing).filter((k) => typing[k]);

  const getRoomIcon = (room: Room) => {
    switch (room.room_type) {
      case 'dm':
        return <MessageCircle className="w-4 h-4" />;
      case 'group':
        return <Users className="w-4 h-4" />;
      case 'help':
        return <HelpCircle className="w-4 h-4" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'DÃ¼n';
    } else if (days < 7) {
      return d.toLocaleDateString('tr-TR', { weekday: 'short' });
    } else {
      return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    }
  };

  const getMessageTimeDisplay = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const shouldShowDateSeparator = (
    currentMsg: Message,
    prevMsg: Message | undefined
  ) => {
    if (!prevMsg) return true;
    const curr = new Date(currentMsg.created_at).toDateString();
    const prev = new Date(prevMsg.created_at).toDateString();
    return curr !== prev;
  };

  return (
    <div className="flex flex-col md:flex-row h-full bg-[#0a0b0e] text-white overflow-hidden">
      {/* sidebar */}
      <div className="hidden md:flex w-72 bg-[#13141a] border-r border-white/5 flex flex-col">
        <div className="p-4 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              placeholder="Sohbet ara veya yeni baÅŸlat..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#0a0b0e] border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none"
            />
            {userSuggestions.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-[#13141a] border border-white/10 rounded-lg shadow-lg">
                {userSuggestions.map((u) => (
                  <button
                    key={u.discordId}
                    onClick={() => {
                      setSearchQuery(u.discordId);
                      handleSearch();
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 hover:bg-white/10 text-left text-sm"
                  >
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-white/20" />
                    )}
                    <span>{u.username}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {filteredRooms.map((room) => {
            const isActive = activeRoom === room.id;
            const hasUnread = (room.unread_count ?? 0) > 0;
            return (
              <button
                key={room.id}
                onClick={() => setActiveRoom(room.id)}
                className={`w-full p-3 rounded-lg transition-colors ${
                  isActive ? 'bg-[#5865f2]/20' : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-white/5">
                    {getRoomIcon(room)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium truncate">
                      {room.name ?? (room.room_type === 'dm' ? 'Ã–zel Mesaj' : 'Sohbet')}
                    </h3>
                    <p className="text-xs truncate text-white/40">
                      {room.last_message_preview ?? 'HenÃ¼z mesaj yok'}
                    </p>
                    {room.last_message_at && (
                      <span className="text-xs text-white/40">
                        {formatTime(room.last_message_at)}
                      </span>
                    )}
                  </div>
                  {hasUnread && (
                    <span className="ml-2 px-2 py-0.5 bg-[#5865f2] text-white text-xs rounded-full">
                      {room.unread_count}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* main chat area */}
      <div className="flex-1 flex flex-col">
        {isMobile && (
          <div className="h-14 flex items-center justify-between px-4 bg-[#13141a] border-b border-white/5">
            <button
              onClick={() => {
                if (showRoomsMobile) setShowRoomsMobile(false);
                else if (pathname === '/chat') router.back();
              }}
              className="p-2 text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              {showRoomsMobile ? 'âœ•' : pathname === '/chat' ? <ArrowLeft className="w-5 h-5" /> : 'â—€'}
            </button>
            <div className="flex-1 text-center text-sm font-semibold truncate">
              {rooms.find((r) => r.id === activeRoom)?.name ||
                (rooms.find((r) => r.id === activeRoom)?.room_type === 'dm' ? 'Ã–zel Mesaj' : 'Sohbet')}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRoomsMobile((v) => !v)}
                className="p-2 text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                â˜°
              </button>
              <button
                onClick={() => setShowRoomsMobile(true)}
                className="p-2 text-white hover:bg-white/5 rounded-lg transition-colors"
                title="Yeni sohbet"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#13141a]">
          <div className="flex items-center gap-3">
            {pathname === '/chat' && (
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#5865f2]/10 flex items-center justify-center border border-[#5865f2]/30">
                {activeRoom && getRoomIcon(rooms.find((r) => r.id === activeRoom)!)}
              </div>
              <div>
                <h2 className="text-sm font-semibold">
                  {rooms.find((r) => r.id === activeRoom)?.name ||
                    (rooms.find((r) => r.id === activeRoom)?.room_type === 'dm'
                      ? 'Ã–zel Mesaj'
                      : 'Sohbet')}
                </h2>
                {typingUsers.length > 0 && (
                  <p className="text-xs text-[#5865f2] font-medium">
                    {profiles[typingUsers[0]]?.username || 'Biri'} yazÄ±yor
                    {typingUsers.length > 1 && ` ve ${typingUsers.length - 1} kiÅŸi daha`}...
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent p-4"
        >
          {devViewMessages ? (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <span className="font-semibold">{devViewTitle}</span>
                <button
                  onClick={() => setDevViewMessages(null)}
                  className="text-white hover:text-gray-300"
                >âœ•</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {devViewMessages.map((msg) => (
                  <div key={msg.id} className="mb-2">
                    <div className="text-xs text-white/40">
                      {msg.sender_id} â€¢ {getMessageTimeDisplay(msg.created_at)}
                    </div>
                    <div className="text-sm text-white/80">{msg.content}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-1">
              {messages.length === 0 && activeRoom && (
                <div className="text-center text-white/40 mt-10">
                  HenÃ¼z mesaj yok â€“ bir ÅŸey yazÄ±n veya bir oda seÃ§in.
                </div>
              )}
              {messages.map((msg, idx) => {
                const prev = messages[idx - 1];
                const showAvatar = !prev || prev.sender_id !== msg.sender_id;
                const showDate = shouldShowDateSeparator(msg, prev);
                const profile = profiles[msg.sender_id];
                const isConsecutive = prev && prev.sender_id === msg.sender_id && !showDate;

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex items-center justify-center my-6">
                        <div className="px-3 py-1 bg-[#13141a] border border-white/10 rounded-full text-xs text-white/60 font-medium">
                          {new Date(msg.created_at).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                    )}
                    <div
                      className={`flex items-start gap-3 py-1 px-3 rounded-lg hover:bg-white/5 transition-colors ${
                        isConsecutive ? 'mt-0' : 'mt-4'
                      }`}
                    >
                      <div className="flex-shrink-0 w-10">
                        {showAvatar ? (
                          <div className="relative">
                            {profile?.avatar_url ? (
                              <Image
                                src={profile.avatar_url}
                                alt={profile.username || 'User'}
                                width={40}
                                height={40}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-[#5865f2] flex items-center justify-center text-white font-semibold">
                                {(profile?.username ?? msg.sender_id)?.charAt?.(0)?.toUpperCase() ?? '?'}
                              </div>
                            )}
                            {profile?.status === 'online' && (
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#23a55a] border-2 border-[#0a0b0e] rounded-full" />
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-white/30 opacity-0 group-hover:opacity-100 transition-opacity">
                            {getMessageTimeDisplay(msg.created_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {showAvatar && (
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-sm font-semibold text-white/90">
                              {profile?.username || msg.sender_id}
                            </span>
                            <span className="text-xs text-white/40">
                              {getMessageTimeDisplay(msg.created_at)}
                            </span>
                          </div>
                        )}
                        <p className="text-sm text-white/80 leading-relaxed break-words">
                          {msg.content}
                        </p>
                        {msg.edited_at && (
                          <span className="text-[10px] text-white/30 italic ml-1">(dÃ¼zenlendi)</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!devViewMessages && (
          <div className="border-t border-white/5 p-4 bg-[#13141a]">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end gap-3">
                <div className="flex-1 bg-[#0a0b0e] border border-white/10 rounded-xl focus-within:border-[#5865f2] transition-colors relative">
                  <input
                    type="text"
                    value={input}
                    onChange={onInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Mesaj yazÄ±n..."
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
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="p-2.5 bg-[#5865f2] hover:bg-[#4752c4] disabled:bg-white/10 disabled:cursor-not-allowed rounded-lg transition-colors flex-shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* mobile room list overlay */}
      {isMobile && showRoomsMobile && (
        <div className="fixed inset-0 z-50 bg-[#0a0b0e]">
          <div className="h-14 flex items-center px-4 border-b border-white/5">
            <button
              onClick={() => setShowRoomsMobile(false)}
              className="p-2 text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              âœ•
            </button>
            <div className="flex-1 text-center text-sm font-semibold">Sohbetler</div>
          </div>
          <div className="p-4 border-b border-white/5 flex items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                placeholder="Sohbet ara veya yeni baÅŸlat..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#0a0b0e] border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none"
              />
              {userSuggestions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-[#13141a] border border-white/10 rounded-lg shadow-lg">
                  {userSuggestions.map((u) => (
                    <button
                      key={u.discordId}
                      onClick={() => {
                        setSearchQuery(u.discordId);
                        handleSearch();
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 hover:bg-white/10 text-left text-sm"
                    >
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-white/20" />
                      )}
                      <span>{u.username}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => { const el = document.querySelector('#chat-search-input') as HTMLInputElement | null; if (el) el.focus(); }}
              className="ml-2 p-2 hover:bg-white/5 rounded-lg transition-colors"
              title="Yeni sohbet baÅŸlat"
            >
              <Plus className="w-5 h-5 text-white/60" />
            </button>
          </div>
          <div className="overflow-y-auto h-full pt-0">
            <div className="p-2">
              {filteredRooms.map((room) => {
                const isActive = activeRoom === room.id;
                const hasUnread = (room.unread_count ?? 0) > 0;

                return (
                  <button
                    key={room.id}
                    onClick={() => {
                      setActiveRoom(room.id);
                      setShowRoomsMobile(false);
                    }}
                    className={`w-full p-3 rounded-lg transition-colors ${
                      isActive ? 'bg-[#5865f2]/20' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-white/5`}>{getRoomIcon(room)}</div>
                      <div className="flex-1 min-w-0 text-left">
                        <h3 className="text-sm font-medium truncate">
                          {room.name ?? (room.room_type === 'dm' ? 'Ã–zel Mesaj' : 'Sohbet')}
                        </h3>
                        <p className="text-xs truncate text-white/40">
                          {room.last_message_preview || 'HenÃ¼z mesaj yok'}
                        </p>
                        {room.last_message_at && (
                          <span className="text-xs text-white/40">
                            {formatTime(room.last_message_at)}
                          </span>
                        )}
                      </div>
                      {hasUnread && (
                        <span className="ml-2 px-2 py-0.5 bg-[#5865f2] text-white text-xs rounded-full">
                          {room.unread_count}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 8px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      `}</style>
    </div>
  );
}



