import React, { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send, Users, Shield, Trash2, Clock, ArrowLeft } from 'lucide-react'
import api, { API_URL } from '../../services/api'
import { useAuthStore } from '../../store/authStore'

interface ChatMessageItem {
  id: string
  user_id: string
  user_name: string
  user_role: string
  recipient_id?: string | null
  recipient_name?: string | null
  message: string
  created_at: string
}

interface ActiveUserItem {
  id: string
  name: string
  role: string
  college: string
  branch: string
  target_role: string
  last_active: string
}

export const Community: React.FC = () => {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState<ChatMessageItem[]>([])
  const [onlineUsers, setOnlineUsers] = useState<ActiveUserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)
  const [activeChat, setActiveChat] = useState<'global' | ActiveUserItem>('global')
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

  const messageEndRef = useRef<HTMLDivElement>(null)
  const activeChatRef = useRef<'global' | ActiveUserItem>('global')

  // Keep ref in sync so WS callbacks always read the current active chat room
  useEffect(() => {
    activeChatRef.current = activeChat
  }, [activeChat])

  const getWebSocketUrl = () => {
    const token = useAuthStore.getState().token || ''
    let wsUrl = API_URL.replace(/^http/, 'ws')
    return `${wsUrl}/api/chat/ws?token=${token}`
  }

  const fetchHistory = async (chatTarget: 'global' | ActiveUserItem) => {
    try {
      setLoading(true)
      if (chatTarget === 'global') {
        const res = await api.get('/api/chat/history')
        setMessages(res.data)
      } else {
        const res = await api.get(`/api/chat/private/history/${chatTarget.id}`)
        setMessages(res.data)
      }
    } catch (err) {
      console.error('Failed to fetch chat history:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchHistorySilent = async (chatTarget: 'global' | ActiveUserItem) => {
    try {
      if (chatTarget === 'global') {
        const res = await api.get('/api/chat/history')
        setMessages(res.data)
      } else {
        const res = await api.get(`/api/chat/private/history/${chatTarget.id}`)
        setMessages(res.data)
      }
    } catch (err) {
      console.error('Failed to fetch chat history silently:', err)
    }
  }

  const fetchActiveUsers = async () => {
    try {
      const res = await api.get('/api/chat/active')
      // Exclude self from online listing so they can't chat with themselves
      const filtered = res.data.filter((u: any) => u.id !== user?.id)
      setOnlineUsers(filtered)
    } catch (err) {
      console.error('Failed to fetch active users:', err)
    }
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!messageText.trim() || sending) return

    setSending(true)
    try {
      const payload: any = { message: messageText.trim() }
      if (activeChat !== 'global') {
        payload.recipient_id = activeChat.id
      }
      await api.post('/api/chat/send', payload)
      setMessageText('')
    } catch (err) {
      console.error('Failed to send message:', err)
      alert('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleQuickEmoji = async (emoji: string) => {
    if (sending) return
    setSending(true)
    try {
      const payload: any = { message: emoji }
      if (activeChat !== 'global') {
        payload.recipient_id = activeChat.id
      }
      await api.post('/api/chat/send', payload)
    } catch (err) {
      console.error('Failed to send emoji message:', err)
    } finally {
      setSending(false)
    }
  }

  const handleDeleteMessage = async (msgId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this message for all users? This action cannot be undone.')) {
      return
    }

    try {
      await api.delete(`/api/chat/delete/${msgId}`)
      setMessages(prev => prev.filter(m => m.id !== msgId))
    } catch (err) {
      console.error('Failed to delete message:', err)
      alert('Failed to delete message. Verify admin permissions.')
    }
  }

  const handleSwitchChat = (target: 'global' | ActiveUserItem) => {
    setActiveChat(target)
    if (target !== 'global') {
      setUnreadCounts(prev => ({ ...prev, [target.id]: 0 }))
    }
    fetchHistory(target)
  }

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Load online users and active room history
  useEffect(() => {
    fetchHistory(activeChat)
    fetchActiveUsers()
  }, [])

  // Auto scroll to bottom
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // WebSocket Management
  useEffect(() => {
    let ws: WebSocket | null = null
    let reconnectTimeout: any = null
    let fallbackInterval: any = null

    const connectWS = () => {
      try {
        const wsUrl = getWebSocketUrl()
        ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          setWsConnected(true)
          console.log('Community Chat WebSocket connected.')
          if (fallbackInterval) {
            clearInterval(fallbackInterval)
            fallbackInterval = null
          }
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            const activeRoom = activeChatRef.current

            if (data.type === 'message') {
              const isGlobalMessage = !data.recipient_id
              
              if (isGlobalMessage) {
                // If currently viewing global room, add message
                if (activeRoom === 'global') {
                  setMessages(prev => {
                    if (prev.some(m => m.id === data.id)) return prev
                    return [...prev, data]
                  })
                }
              } else {
                // Private message
                const isFromActiveParticipant = activeRoom !== 'global' && (data.user_id === activeRoom.id || data.recipient_id === activeRoom.id)
                
                if (isFromActiveParticipant) {
                  setMessages(prev => {
                    if (prev.some(m => m.id === data.id)) return prev
                    return [...prev, data]
                  })
                } else {
                  // Message is for us, increment unread count for the sender
                  if (data.recipient_id === user?.id) {
                    setUnreadCounts(prev => ({
                      ...prev,
                      [data.user_id]: (prev[data.user_id] || 0) + 1
                    }))
                  }
                }
              }
            } else if (data.type === 'delete') {
              setMessages(prev => prev.filter(m => m.id !== data.id))
            }
          } catch (err) {
            console.error('WebSocket payload parse error:', err)
          }
        }

        ws.onclose = () => {
          setWsConnected(false)
          console.log('Community Chat WebSocket closed. Launching HTTP polling fallback...')
          startFallbackPolling()
          reconnectTimeout = setTimeout(connectWS, 5000)
        }

        ws.onerror = (err) => {
          console.error('WebSocket connection error:', err)
          ws?.close()
        }
      } catch (err) {
        console.error('WebSocket initialization failure:', err)
        startFallbackPolling()
      }
    }

    const startFallbackPolling = () => {
      if (fallbackInterval) return
      fallbackInterval = setInterval(() => {
        fetchHistorySilent(activeChatRef.current)
        fetchActiveUsers()
      }, 4000)
    }

    connectWS()
    startFallbackPolling()

    return () => {
      if (ws) {
        ws.onclose = null
        ws.close()
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      if (fallbackInterval) clearInterval(fallbackInterval)
    }
  }, [])

  const formatMessageTime = (dateStr: string) => {
    try {
      let cleanStr = dateStr.replace(' ', 'T')
      if (!cleanStr.endsWith('Z') && !cleanStr.includes('+') && !/[-+]\d{2}:?\d{2}$/.test(cleanStr)) {
        cleanStr += 'Z'
      }
      const d = new Date(cleanStr)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
      'bg-amber-500/10 text-amber-500 border-amber-500/20',
      'bg-rose-500/10 text-rose-500 border-rose-500/20',
      'bg-purple-500/10 text-purple-500 border-purple-500/20'
    ]
    let sum = 0
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
    return colors[sum % colors.length]
  }

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="font-extrabold text-2xl text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <MessageSquare className="text-primary w-7 h-7" /> Community Chat Room
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-2">
            <span>Discuss preparation strategies, share study tips, and converse with placement coordinators.</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-bold">
              <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`}></span>
              {wsConnected ? 'Live Connection' : 'Polling Fallback'}
            </span>
          </p>
        </div>
      </div>

      {/* Main Panel Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[450px]">
        {/* Left: Chat Stream Column */}
        <div className="lg:col-span-3 glass-card border-slate-200 dark:border-slate-800/80 flex flex-col overflow-hidden h-[60vh] lg:h-[calc(100vh-16rem)] min-h-[400px]">
          
          {/* Chat Stream Sub-Header (Tracks active target room) */}
          <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20 shrink-0">
            <div className="flex items-center gap-3">
              {activeChat !== 'global' && (
                <button
                  onClick={() => handleSwitchChat('global')}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl transition-all"
                  title="Back to Global Room"
                >
                  <ArrowLeft size={16} />
                </button>
              )}
              <div>
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                  {activeChat === 'global' ? 'Global Community Chat Room' : `Private Chat: ${activeChat.name}`}
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {activeChat === 'global' 
                    ? 'Everyone in the workspace can view and send messages here'
                    : `Secure private conversation with ${activeChat.name} (${activeChat.target_role})`}
                </p>
              </div>
            </div>
          </div>

          {/* Scrollable Message Box */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="text-xs text-slate-500">Loading messages...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-2 text-slate-400 dark:text-slate-600">
                <MessageSquare size={36} />
                <p className="text-xs font-bold">
                  {activeChat === 'global'
                    ? 'No messages in this chat yet. Start the conversation!'
                    : `No private messages exchanged with ${activeChat.name} yet. Send a greeting!`}
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.user_id === user?.id
                const isMsgAdmin = msg.user_role === 'admin'
                return (
                  <div key={msg.id} className={`flex items-start gap-3 ${isMe ? 'justify-end' : ''}`}>
                    {/* Avatar (Left side, only if not me) */}
                    {!isMe && (
                      <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-extrabold text-xs shrink-0 select-none ${getAvatarColor(msg.user_name)}`}>
                        {msg.user_name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Chat Bubble Container */}
                    <div className={`max-w-[70%] space-y-1 ${isMe ? 'text-right' : ''}`}>
                      {/* User Header Metadata */}
                      {!isMe && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-extrabold text-slate-750 dark:text-slate-350">{msg.user_name}</span>
                          {isMsgAdmin && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-primary/10 border border-primary/20 text-primary text-[8px] font-black uppercase rounded-full tracking-wider">
                              <Shield size={8} /> Admin
                            </span>
                          )}
                        </div>
                      )}

                      {/* Bubble Body */}
                      <div className="flex items-center gap-2 group">
                        {isMe && user?.role === 'admin' && (
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 dark:hover:bg-slate-900 text-rose-500 rounded-lg transition-all shrink-0 self-center"
                            title="Delete Message"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}

                        <div className={`p-3 rounded-2xl text-xs font-medium border text-left ${
                          isMe 
                            ? 'bg-primary border-primary/10 text-white rounded-tr-none shadow-blue' 
                            : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-slate-800 dark:text-slate-100 rounded-tl-none'
                        }`}>
                          <p className="whitespace-pre-wrap break-all leading-relaxed">{msg.message}</p>
                          <span className={`block text-[8px] mt-1 text-right ${isMe ? 'text-white/60' : 'text-slate-400'}`}>
                            {formatMessageTime(msg.created_at)}
                          </span>
                        </div>

                        {!isMe && user?.role === 'admin' && (
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 dark:hover:bg-slate-900 text-rose-500 rounded-lg transition-all shrink-0 self-center"
                            title="Delete Message"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Avatar (Right side, only if me) */}
                    {isMe && (
                      <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-extrabold text-xs shrink-0 select-none ${getAvatarColor(msg.user_name)}`}>
                        {msg.user_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                )
              })
            )}
            <div ref={messageEndRef} />
          </div>

          {/* Quick Emojis Bar */}
          <div className="px-4 py-2 border-t border-border-light dark:border-border-dark flex items-center gap-2 shrink-0 bg-slate-50/50 dark:bg-slate-950/20">
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">Quick:</span>
            {['👍', '🔥', '🚀', '💻', '💯', '👏', '🧠'].map(emoji => (
              <button
                key={emoji}
                disabled={sending}
                onClick={() => handleQuickEmoji(emoji)}
                className="hover:scale-125 hover:rotate-6 text-sm transition-all focus:outline-none"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Message Input form */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-border-light dark:border-border-dark shrink-0 flex items-center gap-3 bg-card-light dark:bg-card-dark">
            <input
              type="text"
              placeholder={activeChat === 'global' ? 'Broadcast a message to everyone...' : `Send a private message to ${activeChat.name}...`}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              disabled={sending}
              maxLength={500}
              className="flex-1 glass-input py-3 text-xs placeholder:text-slate-400 dark:placeholder:text-slate-650"
            />
            <button
              type="submit"
              disabled={!messageText.trim() || sending}
              className="bg-primary hover:bg-primary-dark text-white font-bold p-3 rounded-xl transition-all shadow-blue disabled:opacity-50 shrink-0"
            >
              <Send size={14} className={sending ? 'animate-pulse' : ''} />
            </button>
          </form>
        </div>

        {/* Right: Online Members Sidebar Column */}
        <div className="lg:col-span-1 glass-card border-slate-200 dark:border-slate-800/80 p-4 md:p-6 flex flex-col overflow-hidden h-[30vh] lg:h-[calc(100vh-16rem)] min-h-[250px]">
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2 shrink-0 border-b border-border-light dark:border-border-dark pb-3">
            <Users size={16} className="text-emerald-500" />
            <span>Online Members ({onlineUsers.length})</span>
          </h3>

          <div className="flex-1 overflow-y-auto pt-3 space-y-3">
            {/* Switch to Global Chat Room */}
            <div 
              onClick={() => handleSwitchChat('global')}
              className={`flex items-center gap-3 p-1.5 rounded-xl cursor-pointer transition-all border border-transparent ${
                activeChat === 'global' 
                  ? 'bg-primary/10 border-primary/20 text-slate-800 dark:text-slate-100'
                  : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/30'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center font-bold text-xs text-primary shrink-0 select-none">
                G
              </div>
              <div className="overflow-hidden">
                <h5 className="font-extrabold text-slate-800 dark:text-slate-200 text-[11px] truncate">
                  Global Chat Room
                </h5>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  Public Broadcast
                </p>
              </div>
            </div>

            {onlineUsers.map((item) => {
              const isAdminItem = item.role === 'admin'
              const isChatActive = activeChat !== 'global' && activeChat.id === item.id
              const hasUnread = unreadCounts[item.id] > 0
              return (
                <div 
                  key={item.id} 
                  onClick={() => handleSwitchChat(item)}
                  className={`flex items-center justify-between p-1.5 rounded-xl cursor-pointer transition-all border border-transparent ${
                    isChatActive 
                      ? 'bg-primary/10 border-primary/20 text-slate-800 dark:text-slate-100' 
                      : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/30'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {/* Status Indicator Avatar */}
                    <div className="relative shrink-0 select-none">
                      <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-extrabold text-xs ${getAvatarColor(item.name)}`}>
                        {item.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-card-light dark:border-card-dark rounded-full"></span>
                    </div>

                    {/* Active User Information */}
                    <div className="overflow-hidden">
                      <h5 className="font-extrabold text-slate-800 dark:text-slate-200 text-[11px] truncate flex items-center gap-1.5">
                        <span>{item.name}</span>
                        {isAdminItem && (
                          <span className="inline-flex px-1 bg-primary/10 border border-primary/20 text-primary text-[7px] font-black uppercase rounded-full tracking-wider">
                            Admin
                          </span>
                        )}
                      </h5>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider truncate mt-0.5">
                        {item.target_role}
                      </p>
                      <p className="text-[8px] text-slate-500 font-semibold truncate">
                        {item.college !== 'N/A' ? item.college : 'Co-Pilot App'}
                      </p>
                    </div>
                  </div>

                  {/* Unread Message Badge */}
                  {hasUnread && (
                    <span className="ml-2 px-2 py-0.5 bg-rose-500 text-white text-[9px] font-extrabold rounded-full animate-bounce shrink-0">
                      {unreadCounts[item.id]}
                    </span>
                  )}
                </div>
              )
            })}
            {onlineUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400 dark:text-slate-600">
                <Clock size={24} />
                <span className="text-[10px] font-bold mt-2">Checking active status...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
export default Community
