import React, { useState, useEffect } from 'react'
import { 
  CheckSquare, 
  Flame, 
  Timer, 
  TrendingUp, 
  Sparkles, 
  Check, 
  AlertTriangle,
  Brain,
  ExternalLink
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../../services/api'
import { DSA_QUESTIONS } from './neetcodeQuestions'

interface TaskItem {
  id: string
  title: string
  description?: string
  status: string
  due_date?: string
  priority: string
  category: string
}

interface HabitItem {
  id: string
  title: string
  completed_today: boolean
  streak: number
}

interface AnalyticsData {
  weekly_metrics: {
    total_focus_minutes: number
    tasks_completed_count: number
    habits_completed_count: number
    average_productivity_score: number
  }
  daily_chart: Array<{
    date: string
    productivity_score: number
    focus_minutes: number
    tasks_completed: number
    coding_solved: number
  }>
}

interface CoachDiagnostic {
  productivity_score: number
  insights: string
  optimization_suggestion: string
  burnout: {
    detected: boolean
    percentage: number
    recovery_plan: string
  }
}

interface PlacementScore {
  score: number
  readiness_level: string
}

export const Dashboard: React.FC = () => {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [habits, setHabits] = useState<HabitItem[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [coach, setCoach] = useState<CoachDiagnostic | null>(null)
  const [placement, setPlacement] = useState<PlacementScore | null>(null)
  const [codingProgress, setCodingProgress] = useState<any>(null)
  
  const [loading, setLoading] = useState(true)
  const [generatingChallenge, setGeneratingChallenge] = useState(false)

  const getExternalLink = (desc?: string) => {
    if (!desc) return null
    const match = desc.match(/https?:\/\/[^\s]+/)
    return match ? match[0] : null
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const [tasksRes, habitsRes, analyticsRes, coachRes, placementRes, codingRes] = await Promise.all([
        api.get('/api/tasks?status=pending'),
        api.get('/api/habits'),
        api.get('/api/analytics'),
        api.get('/api/coach/diagnostic'),
        api.get('/api/placement/readiness'),
        api.get('/api/coding/progress')
      ])
      setTasks(tasksRes.data)
      setHabits(habitsRes.data)
      setAnalytics(analyticsRes.data)
      setCoach(coachRes.data)
      setPlacement(placementRes.data)
      setCodingProgress(codingRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleAddDailyCodingChallenge = async () => {
    if (generatingChallenge) return
    setGeneratingChallenge(true)
    try {
      const categories = Object.keys(DSA_QUESTIONS)
      const randomCategory = categories[Math.floor(Math.random() * categories.length)]
      const questions = DSA_QUESTIONS[randomCategory]
      const randomQuestion = questions[Math.floor(Math.random() * questions.length)]

      const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]

      await api.post('/api/tasks', {
        title: `Solve: ${randomQuestion.title} (${randomQuestion.difficulty})`,
        priority: 'high',
        category: 'interview_preparation',
        due_date: `${todayStr}T12:00:00Z`,
        description: `LeetCode Link: ${randomQuestion.link}`
      })

      await fetchData()
    } catch (e) {
      console.error("Failed to add daily coding challenge task:", e)
      alert("Failed to add daily coding challenge.")
    } finally {
      setGeneratingChallenge(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Toggle habit check-in directly on Dashboard
  const handleToggleHabit = async (habitId: string, currentStatus: boolean) => {
    const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]
    try {
      await api.post(`/api/habits/${habitId}/check`, {
        date: todayStr,
        completed: !currentStatus
      })
      // Refresh
      fetchData()
    } catch (e) {
      console.error(e)
    }
  }

  // Complete task directly on Dashboard
  const handleCompleteTask = async (taskId: string) => {
    try {
      await api.put(`/api/tasks/${taskId}`, { status: 'completed' })
      fetchData()
    } catch (e) {
      console.error(e)
    }
  }

  if (loading && !analytics) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[70vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // Format short date for chart (e.g. "2026-05-30" -> "30 May")
  const chartData = analytics?.daily_chart.map(item => {
    try {
      const parts = item.date.split('-')
      const day = parts[2]
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const monthIndex = parseInt(parts[1]) - 1
      return {
        ...item,
        displayDate: `${day} ${months[monthIndex]}`
      }
    } catch (e) {
      return { ...item, displayDate: item.date }
    }
  }) || []

  return (
    <div className="flex-1 p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full min-h-screen">
      
      {/* 1. Header Grid Metrics (4 glow cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Productivity Score card */}
        <div className="glass-card p-6 flex flex-col justify-between hover:scale-[1.01] transition-all glow-blue relative overflow-hidden">
          <div className="flex items-center justify-between">
            <h4 className="text-slate-500 font-bold text-xs uppercase tracking-wider">Productivity Score</h4>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-slate-800 dark:text-slate-100 font-sans">
              {coach?.productivity_score || 0}%
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-2 font-medium">
            Computed on focus hours & achievements.
          </div>
        </div>

        {/* Coding Solved Streak card */}
        <div className="glass-card p-6 flex flex-col justify-between hover:scale-[1.01] transition-all glow-rose">
          <div className="flex items-center justify-between">
            <h4 className="text-slate-500 font-bold text-xs uppercase tracking-wider">Coding Streak</h4>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
              <Flame size={16} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-slate-800 dark:text-slate-100 font-sans">
              {codingProgress?.current_streak || 0}
            </span>
            <span className="text-xs font-bold text-slate-400">days streak</span>
          </div>
          <div className="text-xs text-slate-400 mt-2 font-medium">
            {analytics?.daily_chart?.[analytics.daily_chart.length - 1]?.coding_solved || 0} problems solved today.
          </div>
        </div>

        {/* Focus Hours card */}
        <div className="glass-card p-6 flex flex-col justify-between hover:scale-[1.01] transition-all glow-emerald">
          <div className="flex items-center justify-between">
            <h4 className="text-slate-500 font-bold text-xs uppercase tracking-wider">Focus Time</h4>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Timer size={16} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-slate-800 dark:text-slate-100 font-sans">
              {Math.round((analytics?.weekly_metrics?.total_focus_minutes || 0) / 60 * 10) / 10}
            </span>
            <span className="text-xs font-bold text-slate-400">hours this week</span>
          </div>
          <div className="text-xs text-slate-400 mt-2 font-medium">
            Avg Pomodoro logs: {analytics?.weekly_metrics?.total_focus_minutes || 0}m.
          </div>
        </div>

        {/* Placement Score Card */}
        <div className="glass-card p-6 flex flex-col justify-between hover:scale-[1.01] transition-all glow-violet">
          <div className="flex items-center justify-between">
            <h4 className="text-slate-500 font-bold text-xs uppercase tracking-wider">Placement Score</h4>
            <div className="w-8 h-8 rounded-lg bg-accent-violet/10 flex items-center justify-center text-accent-violet">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-slate-800 dark:text-slate-100 font-sans">
              {placement?.score || 0}%
            </span>
            <span className="text-xs font-bold text-slate-400">{placement?.readiness_level}</span>
          </div>
          <div className="text-xs text-slate-400 mt-2 font-medium">
            Based on DSA, Resume & mock levels.
          </div>
        </div>

      </div>

      {/* 2. Middle Row: Main Grid (Chart & AI vs Todo checklists) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Analytical Chart & Coach Suggestions */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Weekly Analytics AreaChart */}
          <div className="glass-card p-6">
            <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-200 mb-6">Weekly Performance Analytics</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="prodColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b"/>
                  <XAxis dataKey="displayDate" stroke="#64748b" fontSize={11} fontWeight={500}/>
                  <YAxis stroke="#64748b" fontSize={11} fontWeight={500} domain={[0, 100]}/>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#131926', 
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                  />
                  <Area type="monotone" dataKey="productivity_score" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#prodColor)" name="Productivity" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Coach insights card */}
          {coach && (
            <div className="glass-card p-6 bg-gradient-to-r from-primary/5 via-accent-violet/5 to-transparent border-l-4 border-l-primary">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="text-primary animate-pulse" size={18} />
                <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">AI Coach Assistant Recommendations</h3>
              </div>
              <div className="space-y-4 text-sm leading-relaxed">
                <div>
                  <h4 className="font-bold text-slate-700 dark:text-slate-350">Productivity Analysis:</h4>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">{coach.insights}</p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-700 dark:text-slate-350">Time Optimization Suggestion:</h4>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">{coach.optimization_suggestion}</p>
                </div>
                
                {/* Burnout indicator warnings */}
                {coach.burnout.detected && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl flex items-start gap-3 mt-3">
                    <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                    <div>
                      <h5 className="font-bold text-xs">Burnout Alert ({coach.burnout.percentage}% Stress Level)</h5>
                      <p className="text-xs leading-relaxed mt-1">{coach.burnout.recovery_plan}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right 1 Column: Today's Tasks & Habits checklists */}
        <div className="space-y-8">
          
          {/* Today's Tasks list */}
          <div className="glass-card p-6 flex flex-col max-h-[380px]">
            <div className="flex items-center justify-between pb-4 border-b border-border-light dark:border-border-dark mb-4">
              <div className="flex items-center gap-2">
                <CheckSquare size={16} className="text-primary" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Today's Open Tasks</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={generatingChallenge}
                  onClick={handleAddDailyCodingChallenge}
                  className="p-1 hover:bg-primary/10 text-primary rounded-lg transition-all flex items-center justify-center shrink-0 disabled:opacity-50"
                  title="Add Daily Coding Challenge from NeetCode 150"
                >
                  <Brain size={14} className={generatingChallenge ? "animate-spin" : "animate-pulse"} />
                </button>
                <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {tasks.length}
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-3.5">
                  <p className="text-xs text-center text-slate-500 font-medium">No tasks left for today! 🎉</p>
                  <button
                    type="button"
                    disabled={generatingChallenge}
                    onClick={handleAddDailyCodingChallenge}
                    className="bg-primary hover:bg-primary-dark text-white text-[10px] font-extrabold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-primary/10 disabled:opacity-50"
                  >
                    {generatingChallenge ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Brain size={12} />
                    )}
                    <span>Daily DSA Challenge</span>
                  </button>
                </div>
              ) : (
                tasks.map((task) => {
                  const solveUrl = getExternalLink(task.description)
                  return (
                    <div 
                      key={task.id} 
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all text-xs font-semibold"
                    >
                      <div className="flex items-center gap-2 max-w-[70%]">
                        <button
                          onClick={() => handleCompleteTask(task.id)}
                          className="w-4 h-4 rounded border border-slate-350 dark:border-slate-700 flex items-center justify-center hover:border-primary text-transparent hover:text-primary transition-all shrink-0"
                        >
                          <Check size={10} />
                        </button>
                        <span className="text-slate-800 dark:text-slate-200 truncate" title={task.title}>{task.title}</span>
                        {solveUrl && (
                          <a
                            href={solveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 hover:bg-primary/15 text-primary rounded transition-all flex items-center justify-center shrink-0"
                            title="Solve LeetCode coding problem"
                          >
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                      
                      {/* Priority indicator tag */}
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold shrink-0 ${
                        task.priority === 'urgent' ? 'bg-rose-500/10 text-rose-500' :
                        task.priority === 'high' ? 'bg-amber-500/10 text-amber-500' :
                        'bg-slate-300/30 text-slate-500'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Today's Habits checklist */}
          <div className="glass-card p-6 flex flex-col max-h-[380px]">
            <div className="flex items-center justify-between pb-4 border-b border-border-light dark:border-border-dark mb-4">
              <div className="flex items-center gap-2">
                <Flame size={16} className="text-rose-500" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Today's Habits</h3>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {habits.length === 0 ? (
                <p className="text-xs text-center text-slate-500 py-10">No habits configured yet.</p>
              ) : (
                habits.map((habit) => (
                  <div 
                    key={habit.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all text-xs font-semibold"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleHabit(habit.id, habit.completed_today)}
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                          habit.completed_today 
                            ? 'bg-rose-500 border-rose-600 text-white' 
                            : 'border-slate-300 dark:border-slate-700 text-transparent hover:border-rose-500'
                        }`}
                      >
                        <Check size={10} />
                      </button>
                      <span className="text-slate-800 dark:text-slate-200 truncate w-32">{habit.title}</span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                      <Flame size={12} className="text-rose-500" />
                      <span>{habit.streak}d streak</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}
