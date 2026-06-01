import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, Timer, Award, Sparkles } from 'lucide-react'
import api from '../../services/api'

interface PomodoroSessionHistory {
  total_minutes: number
  completed_count: number
  today_minutes: number
  history: Array<{
    id: string
    duration: number
    mode: string
    created_at: string
  }>
}

export const Pomodoro: React.FC = () => {
  // Modes: 25 focus + 5 break OR 50 focus + 10 break OR custom focus
  const [sessionMode, setSessionMode] = useState<'25/5' | '50/10'>('25/5')
  const [timeLeft, setTimeLeft] = useState(25 * 60) // defaults to 25 minutes
  const [isRunning, setIsRunning] = useState(false)
  const [isBreak, setIsBreak] = useState(false)

  const [historyData, setHistoryData] = useState<PomodoroSessionHistory | null>(null)
  
  const timerRef = useRef<number | null>(null)
  const initialDurationRef = useRef(25 * 60)

  const fetchHistory = async () => {
    try {
      const res = await api.get('/api/pomodoro')
      setHistoryData(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  // Change modes
  const handleModeChange = (mode: '25/5' | '50/10') => {
    setIsRunning(false)
    setIsBreak(false)
    setSessionMode(mode)
    const minutes = mode === '25/5' ? 25 : 50
    setTimeLeft(minutes * 60)
    initialDurationRef.current = minutes * 60
  }

  // Ticking countdown
  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSessionComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRunning, isBreak])

  const handleSessionComplete = async () => {
    setIsRunning(false)
    
    // Play a mock beep audio notification
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = context.createOscillator()
      const gain = context.createGain()
      osc.connect(gain)
      gain.connect(context.destination)
      osc.frequency.setValueAtTime(880, context.currentTime) // High-pitch beep
      gain.gain.setValueAtTime(0.1, context.currentTime)
      osc.start()
      osc.stop(context.currentTime + 0.4)
    } catch (e) {
      console.warn("AudioContext block by browser permissions:", e)
    }

    if (!isBreak) {
      // Focus session completed! Log to database
      const mins = sessionMode === '25/5' ? 25 : 50
      try {
        await api.post('/api/pomodoro', {
          duration: mins,
          mode: sessionMode,
          completed: true
        })
        fetchHistory()
      } catch (e) {
        console.error(e)
      }
      
      // Auto toggle to break mode
      setIsBreak(true)
      const breakMins = sessionMode === '25/5' ? 5 : 10
      setTimeLeft(breakMins * 60)
      initialDurationRef.current = breakMins * 60
    } else {
      // Break completed, back to Focus Mode
      setIsBreak(false)
      const focusMins = sessionMode === '25/5' ? 25 : 50
      setTimeLeft(focusMins * 60)
      initialDurationRef.current = focusMins * 60
    }
  }

  const handlePlayPause = () => {
    setIsRunning(prev => !prev)
  }

  const handleReset = () => {
    setIsRunning(false)
    setIsBreak(false)
    const minutes = sessionMode === '25/5' ? 25 : 50
    setTimeLeft(minutes * 60)
    initialDurationRef.current = minutes * 60
  }

  // Format countdown string "MM:SS"
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate visual ring completion percentage
  const total = initialDurationRef.current
  const strokeDashoffset = total > 0 ? ((total - timeLeft) / total) * 282.6 : 0

  return (
    <div className="flex-1 p-4 md:p-8 space-y-8 max-w-5xl mx-auto w-full min-h-screen">
      
      {/* Split visual column */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Circular Timer screen */}
        <div className="md:col-span-2 glass-card p-8 flex flex-col items-center justify-center space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Timer className={isBreak ? 'text-emerald-500' : 'text-primary animate-pulse'} size={20} />
            <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
              {isBreak ? 'Break Session Interval' : 'Deep Study Focus Duration'}
            </h3>
          </div>

          {/* Preset Buttons */}
          <div className="flex gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
            {(['25/5', '50/10'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => handleModeChange(mode)}
                disabled={isRunning}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
                  sessionMode === mode 
                    ? 'bg-white dark:bg-card-dark text-slate-800 dark:text-slate-150 shadow-sm border border-slate-200 dark:border-slate-800' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {mode} Mode
              </button>
            ))}
          </div>

          {/* Circular Countdown Progress Ring */}
          <div className="relative w-64 h-64 flex items-center justify-center">
            
            {/* SVG circle backdrop */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                className="stroke-slate-200 dark:stroke-slate-900 fill-none"
                strokeWidth="4"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                className={`fill-none transition-all duration-300 ${isBreak ? 'stroke-emerald-500' : 'stroke-primary'}`}
                strokeWidth="4.5"
                strokeDasharray="282.6"
                strokeDashoffset={282.6 - strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>

            {/* In-circle clock */}
            <div className="absolute text-center">
              <span className="text-4xl font-extrabold font-mono tracking-wider text-slate-800 dark:text-slate-100">
                {formatTime(timeLeft)}
              </span>
              <p className="text-[10px] uppercase font-bold text-slate-450 tracking-widest mt-1">
                {isBreak ? 'Chill break' : 'Stay Focused'}
              </p>
            </div>

          </div>

          {/* Clock controls */}
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={handleReset}
              className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all"
            >
              <RotateCcw size={16} />
            </button>
            
            <button
              onClick={handlePlayPause}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-all shadow-lg hover:scale-105 active:scale-[0.97] ${
                isBreak 
                  ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' 
                  : 'bg-primary hover:bg-primary-dark shadow-primary/20'
              }`}
            >
              {isRunning ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
            </button>

            <div className="w-10" /> {/* Spacer */}
          </div>

        </div>

        {/* Right 1 Column: Stats summary board */}
        <div className="space-y-6">
          
          {/* Diagnostic overview box */}
          <div className="glass-card p-6 flex flex-col items-center text-center space-y-4">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Award size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Daily Focus Statistics</h3>
              <p className="text-xs text-slate-500 mt-1">Metrics gathered across focus logs.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 w-full border-t border-border-light dark:border-border-dark pt-4">
              <div>
                <span className="text-xl font-extrabold text-slate-800 dark:text-slate-150">
                  {historyData?.completed_count || 0}
                </span>
                <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">Sessions Done</p>
              </div>
              
              <div>
                <span className="text-xl font-extrabold text-slate-800 dark:text-slate-150">
                  {historyData?.today_minutes || 0}m
                </span>
                <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">Minutes Today</p>
              </div>
            </div>
          </div>

          {/* History tracker widget */}
          <div className="glass-card p-6 flex flex-col max-h-[300px]">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-4 pb-2 border-b border-border-light dark:border-border-dark">
              Recent Completed Sessions
            </h4>
            <div className="flex-1 overflow-y-auto space-y-2.5">
              {!historyData?.history || historyData.history.length === 0 ? (
                <p className="text-xs text-center text-slate-500 py-6">No session logs found.</p>
              ) : (
                historyData.history.map((session) => (
                  <div 
                    key={session.id} 
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100/50 dark:bg-slate-900/50 text-xs font-semibold"
                  >
                    <span className="text-slate-800 dark:text-slate-250 flex items-center gap-1.5">
                      <Sparkles size={12} className="text-primary" />
                      Focus session Completed
                    </span>
                    <span className="text-slate-450 font-bold">
                      {session.duration} min
                    </span>
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
