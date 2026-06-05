import React, { useState, useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'

// Layout elements
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'

// Core Pages
import { Auth } from './components/pages/Auth'
import { Dashboard } from './components/pages/Dashboard'
import { Tasks } from './components/pages/Tasks'
import { Habits } from './components/pages/Habits'
import { Pomodoro } from './components/pages/Pomodoro'
import { Calendar } from './components/pages/Calendar'
import { Prep } from './components/pages/Prep'
import { AIPlanner } from './components/pages/AIPlanner'
import { AICoach } from './components/pages/AICoach'
import { Reflections } from './components/pages/Reflections'
import { Leaderboard } from './components/pages/Leaderboard'
import { Admin } from './components/pages/Admin'
import { Community } from './components/pages/Community'
import { Profile } from './components/pages/Profile'

export const App: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore()
  const { initTheme } = useThemeStore()
  
  // Manage tabs internally to avoid routing friction on local previews
  const [currentTab, setCurrentTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)

  useEffect(() => {
    initTheme()
  }, [])

  // If not signed in, force authentication forms
  if (!isAuthenticated) {
    return <Auth />
  }

  // Set tab and reset viewing user ID
  const handleSetTab = (tab: string) => {
    setCurrentTab(tab)
    setViewingUserId(null)
  }

  // Render active workspace tabs
  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard />
      case 'tasks':
        return <Tasks />
      case 'habits':
        return <Habits />
      case 'pomodoro':
        return <Pomodoro />
      case 'calendar':
        return <Calendar />
      case 'prep':
        return <Prep />
      case 'leaderboard':
        return (
          <Leaderboard 
            onViewProfile={(userId) => {
              setViewingUserId(userId)
              setCurrentTab('profile')
            }} 
          />
        )
      case 'community':
        return <Community />
      case 'admin':

        return user?.role === 'admin' ? <Admin /> : <Dashboard />
      case 'ai-planner':
        return <AIPlanner />
      case 'ai-coach':
        return <AICoach />
      case 'reflections':
        return <Reflections />
      case 'profile':
        return <Profile viewingUserId={viewingUserId} setViewingUserId={setViewingUserId} />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex text-slate-800 dark:text-slate-200 transition-colors duration-300">
      {/* Mobile backdrop overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-900/50 dark:bg-slate-950/60 backdrop-blur-sm z-25 transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Navigation Panels */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={handleSetTab} 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      
      {/* Workspace Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden lg:pl-64">
        <Header 
          currentTab={currentTab} 
          setCurrentTab={handleSetTab} 
          setSidebarOpen={setSidebarOpen}
        />
        
        <main className="flex-1 flex flex-col">
          {renderTabContent()}
        </main>
      </div>
    </div>
  )
}
export default App
