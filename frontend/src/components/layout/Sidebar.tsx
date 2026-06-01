import React from 'react'
import { 
  LayoutDashboard, 
  CheckSquare, 
  Flame, 
  Timer, 
  Calendar, 
  GraduationCap, 
  Brain, 
  BookOpen, 
  LogOut,
  ChevronRight,
  Compass
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

interface SidebarProps {
  currentTab: string
  setCurrentTab: (tab: string) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const { logout, user } = useAuthStore()

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'habits', label: 'Habits', icon: Flame },
    { id: 'pomodoro', label: 'Pomodoro', icon: Timer },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'prep', label: 'Placement Prep', icon: GraduationCap },
    { id: 'ai-planner', label: 'AI Study Planner', icon: Compass },
    { id: 'ai-coach', label: 'AI Coach Insights', icon: Brain },
    { id: 'reflections', label: 'Daily Reflection', icon: BookOpen },
  ]

  return (
    <aside className="w-64 bg-card-light dark:bg-card-dark border-r border-border-light dark:border-border-dark flex flex-col h-screen fixed left-0 top-0 z-30 transition-all duration-300">
      {/* Brand Header */}
      <div className="p-6 border-b border-border-light dark:border-border-dark flex items-center gap-3">
        <div className="w-9 h-9 bg-primary dark:bg-primary-dark rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-blue font-sans">
          C
        </div>
        <div>
          <h1 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 tracking-tight font-sans">
            CodePilot <span className="text-primary font-bold text-sm bg-primary/10 px-1.5 py-0.5 rounded">AI</span>
          </h1>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive 
                  ? 'bg-primary text-white shadow-blue scale-[1.02]' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'} />
                <span>{item.label}</span>
              </div>
              {isActive && <ChevronRight size={14} className="text-white/80" />}
            </button>
          )
        })}
      </nav>

      {/* User Session profile Footer */}
      <div className="p-4 border-t border-border-light dark:border-border-dark space-y-3">
        <div className="flex items-center gap-3 p-2">
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 select-none">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="overflow-hidden">
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{user?.name}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/5 text-sm font-bold transition-all duration-150"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
