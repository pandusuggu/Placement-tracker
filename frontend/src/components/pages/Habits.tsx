import React, { useState, useEffect } from 'react'
import { Plus, Check, Flame, Trash2, Award, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../../services/api'

interface HabitItem {
  id: string
  title: string
  description?: string
  streak: number
  longest_streak: number
  completed_today: boolean
}

export const Habits: React.FC = () => {
  const [habits, setHabits] = useState<HabitItem[]>([])
  const [heatmap, setHeatmap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  // Form values
  const [showAddForm, setShowAddForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const fetchData = async () => {
    try {
      setLoading(true)
      const [habitsRes, heatmapRes] = await Promise.all([
        api.get('/api/habits'),
        api.get('/api/habits/heatmap')
      ])
      setHabits(habitsRes.data)
      setHeatmap(heatmapRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    try {
      await api.post('/api/habits', {
        title,
        description: description || undefined
      })
      setTitle('')
      setDescription('')
      setShowAddForm(false)
      fetchData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleToggleCheck = async (habit: HabitItem) => {
    const todayStr = new Date().toISOString().split('T')[0]
    try {
      await api.post(`/api/habits/${habit.id}/check`, {
        date: todayStr,
        completed: !habit.completed_today
      })
      fetchData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeleteHabit = async (habitId: string) => {
    try {
      await api.delete(`/api/habits/${habitId}`)
      fetchData()
    } catch (e) {
      console.error(e)
    }
  }

  const [currentDate, setCurrentDate] = useState(new Date())

  // Monthly Calendar Math helpers
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const monthsList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  
  const firstDayIndex = new Date(year, month, 1).getDay()
  const totalDays = new Date(year, month + 1, 0).getDate()

  const getMonthlyGridData = () => {
    const grid = []
    // Fill leading empty cells
    for (let i = 0; i < firstDayIndex; i++) {
      grid.push(null)
    }
    // Fill actual dates
    for (let i = 1; i <= totalDays; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      const count = heatmap[dateStr] || 0
      grid.push({
        date: dateStr,
        dayNum: i,
        count
      })
    }
    return grid
  }

  const monthlyGrid = getMonthlyGridData()

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  // Heatmap coloring based on total daily clicks
  const getHeatmapColorClass = (count: number) => {
    if (count === 0) return 'bg-slate-100 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-850 text-slate-400 dark:text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-900'
    if (count === 1) return 'bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-455 hover:bg-rose-500/20'
    if (count === 2) return 'bg-rose-500/40 border border-rose-500/30 text-rose-600 dark:text-rose-300 hover:bg-rose-500/50'
    return 'bg-rose-500 border border-rose-600 text-white hover:bg-rose-600 shadow-md shadow-rose-500/10' // 3 or more ticks
  }

  return (
    <div className="flex-1 p-8 space-y-8 max-w-5xl mx-auto w-[calc(100%-16rem)] ml-64 min-h-screen">
      
      {/* 1. Header with stats summaries */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 font-medium">Commit to your daily developer routine habits.</p>
        </div>
        <button
          onClick={() => setShowAddForm(prev => !prev)}
          className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold px-4 py-2.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all"
        >
          <Plus size={16} />
          <span>New Habit</span>
        </button>
      </div>

      {/* 2. Create Habit Form */}
      {showAddForm && (
        <form onSubmit={handleCreateHabit} className="glass-card p-6 space-y-4 animate-fade-in-up">
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Establish a New Habit</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Habit Name</label>
              <input
                required
                type="text"
                placeholder="e.g. Solve 2 LeetCode Mediums"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="glass-input"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Short Description (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Before 9 AM morning routines"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="glass-input"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs font-bold text-slate-500 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-xs font-bold text-white bg-primary hover:bg-primary-dark px-4 py-2 rounded-xl"
            >
              Save Habit
            </button>
          </div>
        </form>
      )}

      {/* 3. Heatmap visualization widget */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Award size={18} className="text-rose-500" />
            <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-200">Routines Commitment Heatmap</h3>
          </div>
          
          {/* Month Navigation */}
          <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-900/50 px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-800">
            <button 
              type="button" 
              onClick={handlePrevMonth}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 transition-all"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 w-24 text-center">
              {monthsList[month]} {year}
            </span>
            <button 
              type="button" 
              onClick={handleNextMonth}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-6">Aggregated habit completion check-ins styled as a calendar month.</p>
        
        {/* Heatmap Grid */}
        <div className="flex flex-col items-center max-w-sm mx-auto">
          {/* Calendar Headers */}
          <div className="grid grid-cols-7 w-full text-center text-[10px] font-bold text-slate-400 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <span key={d} className="py-1">{d}</span>
            ))}
          </div>

          {/* Calendar Cells */}
          <div className="grid grid-cols-7 gap-1.5 w-full">
            {monthlyGrid.map((day, idx) => {
              if (!day) {
                return (
                  <div 
                    key={`empty-${idx}`} 
                    className="aspect-square rounded-lg bg-slate-50/10 dark:bg-slate-950/5 opacity-20 border border-transparent"
                  />
                )
              }
              const colorClass = getHeatmapColorClass(day.count)
              return (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.count} habits completed`}
                  className={`aspect-square rounded-lg hover:scale-105 transition-all cursor-pointer flex items-center justify-center text-[10px] font-bold relative border border-transparent ${colorClass}`}
                >
                  <span>
                    {day.dayNum}
                  </span>
                </div>
              )
            })}
          </div>
          
          <div className="flex items-center gap-2 self-end mt-4 text-[10px] text-slate-400 font-bold">
            <span>Less</span>
            <div className="w-3 h-3 rounded-sm bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800" />
            <div className="w-3 h-3 rounded-sm bg-rose-500/10 border border-rose-500/20" />
            <div className="w-3 h-3 rounded-sm bg-rose-500/40 border border-rose-500/30" />
            <div className="w-3 h-3 rounded-sm bg-rose-500 border border-rose-600" />
            <span>More</span>
          </div>
        </div>
      </div>

      {/* 4. Active habits checklist */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : habits.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-500">
          No habits established yet. Create one above to begin!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {habits.map((habit) => (
            <div 
              key={habit.id}
              className={`glass-card p-6 flex flex-col justify-between border-t-4 transition-all hover:scale-[1.01] ${
                habit.completed_today ? 'border-t-rose-500' : 'border-t-slate-300 dark:border-t-slate-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-extrabold text-base text-slate-800 dark:text-slate-100">{habit.title}</h4>
                    {habit.description && (
                      <p className="text-xs text-slate-500 mt-1">{habit.description}</p>
                    )}
                  </div>
                  
                  {/* Action buttons */}
                  <button
                    onClick={() => handleDeleteHabit(habit.id)}
                    className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-500/5 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Habit checkmark toggle */}
                <button
                  onClick={() => handleToggleCheck(habit)}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border mt-6 text-xs font-bold transition-all ${
                    habit.completed_today
                      ? 'bg-rose-500 border-rose-600 text-white shadow-rose-500/10'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-rose-500/50 hover:bg-rose-500/5'
                  }`}
                >
                  <Check size={14} />
                  <span>{habit.completed_today ? 'Completed Today!' : 'Mark Completed Today'}</span>
                </button>
              </div>

              {/* Habit records */}
              <div className="flex items-center justify-between border-t border-border-light dark:border-border-dark mt-6 pt-4 text-xs font-bold text-slate-500">
                <div className="flex items-center gap-1">
                  <Flame size={14} className="text-rose-500" />
                  <span>Streak: {habit.streak} days</span>
                </div>
                <div>
                  <span>Record: {habit.longest_streak} days</span>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  )
}
