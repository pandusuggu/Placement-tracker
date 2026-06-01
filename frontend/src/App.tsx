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

export const App: React.FC = () => {
  const { isAuthenticated } = useAuthStore()
  const { initTheme } = useThemeStore()
  
  // Manage tabs internally to avoid routing friction on local previews
  const [currentTab, setCurrentTab] = useState('dashboard')

  useEffect(() => {
    initTheme()
  }, [])

  // If not signed in, force authentication forms
  if (!isAuthenticated) {
    return <Auth />
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
      case 'ai-planner':
        return <AIPlanner />
      case 'ai-coach':
        return <AICoach />
      case 'reflections':
        return <Reflections />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex text-slate-800 dark:text-slate-200 transition-colors duration-300">
      {/* Navigation Panels */}
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      
      {/* Workspace Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <Header currentTab={currentTab} setCurrentTab={setCurrentTab} />
        
        <main className="flex-1 flex flex-col">
          {renderTabContent()}
        </main>
      </div>
    </div>
  )
}
export default App
