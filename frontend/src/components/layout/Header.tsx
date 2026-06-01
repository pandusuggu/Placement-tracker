import React, { useState, useEffect } from 'react'
import { Bell, Moon, Sun, Search, CheckSquare, Flame, Timer, GraduationCap } from 'lucide-react'
import { useThemeStore } from '../../store/themeStore'
import api from '../../services/api'

interface HeaderProps {
  currentTab: string
  setCurrentTab: (tab: string) => void
}

interface NotificationItem {
  id: string
  title: string
  message: string
  read: boolean
  notification_type: string
  created_at: string
}

export const Header: React.FC<HeaderProps> = ({ currentTab, setCurrentTab }) => {
  const { theme, toggleTheme } = useThemeStore()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [commandInput, setCommandInput] = useState('')

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/notifications')
      setNotifications(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  const markAllRead = async () => {
    try {
      await api.put('/api/notifications/read-all')
      setNotifications(notifications.map(n => ({ ...n, read: true })))
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 15000) // update every 15s
    return () => clearInterval(interval)
  }, [])

  // Command palette hotkey listener (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowCommandPalette(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  // Filter commands
  const commands = [
    { text: 'Go to Tasks Dashboard', shortcut: '/tasks', action: () => setCurrentTab('tasks'), icon: CheckSquare },
    { text: 'Go to Habit Checklist', shortcut: '/habits', action: () => setCurrentTab('habits'), icon: Flame },
    { text: 'Launch Pomodoro Session', shortcut: '/pomodoro', action: () => setCurrentTab('pomodoro'), icon: Timer },
    { text: 'Go to Placement Prep Hub', shortcut: '/prep', action: () => setCurrentTab('prep'), icon: GraduationCap },
  ]

  const filteredCommands = commands.filter(cmd => 
    cmd.text.toLowerCase().includes(commandInput.toLowerCase()) ||
    cmd.shortcut.includes(commandInput.toLowerCase())
  )

  const handleCommandSelect = (action: () => void) => {
    action()
    setCommandInput('')
    setShowCommandPalette(false)
  }

  return (
    <>
      <header className="h-20 border-b border-border-light dark:border-border-dark flex items-center justify-between px-8 bg-card-light/50 dark:bg-card-dark/50 backdrop-blur-md sticky top-0 z-20 w-[calc(100%-16rem)] ml-64 transition-all duration-300">
        
        {/* Current View Title */}
        <div>
          <h2 className="font-extrabold text-xl capitalize text-slate-800 dark:text-slate-100 tracking-tight font-sans">
            {currentTab === 'prep' ? 'Placement Preparation Hub' : currentTab.replace('-', ' ')}
          </h2>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-4">
          
          {/* Command Palette Trigger */}
          <button 
            onClick={() => setShowCommandPalette(true)}
            className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-xl px-4 py-2 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all text-sm w-64 shadow-sm"
          >
            <Search size={16} />
            <span className="flex-1 text-left">Search / Commands...</span>
          </button>

          {/* Theme Mode Trigger */}
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-850 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-800 dark:hover:text-slate-200 transition-all shadow-sm"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Alert Bell Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(prev => !prev)}
              className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-800 dark:hover:text-slate-200 transition-all shadow-sm"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification dropdown popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-xl rounded-2xl p-4 z-40 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-border-light dark:border-border-dark mb-3">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Alerts</h4>
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllRead} 
                      className="text-xs text-primary hover:underline font-semibold"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                
                {notifications.length === 0 ? (
                  <p className="text-xs text-center text-slate-500 py-6">No notifications found.</p>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((item) => (
                      <div 
                        key={item.id} 
                        className={`p-2.5 rounded-xl border transition-all text-xs ${
                          item.read 
                            ? 'bg-transparent border-transparent text-slate-500' 
                            : 'bg-primary/5 border-primary/10 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <h5 className="font-bold">{item.title}</h5>
                        <p className="mt-1 leading-relaxed">{item.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Command Palette Overlay Modal */}
      {showCommandPalette && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh]">
          <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark w-[500px] rounded-2xl shadow-2xl p-4 animate-fade-in-up">
            <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 mb-4">
              <Search size={18} className="text-slate-400" />
              <input
                autoFocus
                placeholder="Type a command or shortcut..."
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                className="bg-transparent outline-none flex-1 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600"
              />
              <button 
                onClick={() => setShowCommandPalette(false)}
                className="text-xs font-semibold text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400"
              >
                [ESC]
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-extrabold tracking-wider text-slate-400 dark:text-slate-600 uppercase px-2 mb-2">
                Quick Navigation Shortcuts
              </p>
              {filteredCommands.length === 0 ? (
                <p className="text-xs text-slate-500 p-2 text-center">No matching commands found.</p>
              ) : (
                filteredCommands.map((cmd) => {
                  const CommandIcon = cmd.icon
                  return (
                    <button
                      key={cmd.shortcut}
                      onClick={() => handleCommandSelect(cmd.action)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-350 hover:text-slate-900 dark:hover:text-slate-100 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <CommandIcon size={16} className="text-slate-400" />
                        <span>{cmd.text}</span>
                      </div>
                      <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-slate-500 dark:text-slate-400 font-bold">
                        {cmd.shortcut}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
