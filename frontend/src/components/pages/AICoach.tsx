import React, { useState, useEffect } from 'react'
import { Brain, AlertTriangle, ShieldCheck, Heart, RefreshCw, MessageSquare, Sparkles, Check } from 'lucide-react'
import api from '../../services/api'

interface CoachDiagnostic {
  productivity_score: number
  insights: string
  optimization_suggestion: string
  burnout: {
    detected: boolean
    percentage: number
    recovery_plan: string
    schedule_adjustments: string[]
  }
}

export const AICoach: React.FC = () => {
  const [coach, setCoach] = useState<CoachDiagnostic | null>(null)
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)
  const [acknowledgedTips, setAcknowledgedTips] = useState<Record<string, boolean>>({})

  // Chatbot states
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: "Hi! I am your AI Productivity Coach. Ask me any questions about your schedule, roadmap, tasks, or time management tips!" }
  ])
  const [chatInput, setChatInput] = useState('')
  const [sending, setSending] = useState(false)
  const chatEndRef = React.useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || sending) return

    const userMessage = chatInput.trim()
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setChatInput('')
    setSending(true)

    try {
      const res = await api.post('/api/coach/chat', {
        message: userMessage,
        chat_type: 'coach'
      })

      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }])
    } catch (err: any) {
      console.error(err)
      const detail = err.response?.data?.detail || "Sorry, I had trouble processing that request."
      setMessages(prev => [...prev, { role: 'assistant', content: detail }])
    } finally {
      setSending(false)
    }
  }

  const fetchCoachData = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/coach/diagnostic')
      setCoach(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleRecalculate = async () => {
    try {
      setRecalculating(true)
      const res = await api.get('/api/coach/diagnostic')
      setCoach(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setRecalculating(false)
    }
  }

  const discussWithCoach = async (topic: string, text: string) => {
    const promptMessage = `Hi Coach! I'd like to discuss my AI Coach insights regarding ${topic}: "${text}". Can you explain this behavior and suggest some concrete steps I should take next?`
    if (sending) return

    setMessages(prev => [...prev, { role: 'user', content: promptMessage }])
    setSending(true)

    try {
      const res = await api.post('/api/coach/chat', {
        message: promptMessage,
        chat_type: 'coach'
      })

      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }])
    } catch (err: any) {
      console.error(err)
      const detail = err.response?.data?.detail || "Sorry, I had trouble processing that request."
      setMessages(prev => [...prev, { role: 'assistant', content: detail }])
    } finally {
      setSending(false)
    }
  }

  const toggleTip = (tip: string) => {
    setAcknowledgedTips(prev => ({
      ...prev,
      [tip]: !prev[tip]
    }))
  }

  const fetchChatHistory = async () => {
    try {
      const res = await api.get('/api/coach/chat/history?chat_type=coach')
      if (res.data && res.data.messages && res.data.messages.length > 0) {
        setMessages(res.data.messages)
      }
    } catch (e) {
      console.error("Failed to fetch chat history:", e)
    }
  }

  useEffect(() => {
    fetchCoachData()
    fetchChatHistory()
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[70vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full min-h-screen">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-border-light dark:border-border-dark">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
              <Brain size={22} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                AI Coach Insights
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Live diagnostics
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Dynamic productivity diagnostics and burnout engine indicators.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleRecalculate}
          disabled={recalculating || loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none self-start md:self-auto"
        >
          <RefreshCw size={14} className={recalculating ? 'animate-spin' : ''} />
          <span>{recalculating ? 'Re-evaluating Metrics...' : 'Recalculate with AI'}</span>
        </button>
      </div>

      {coach && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up">
          
          {/* Left Column: Diagnostics (Col-span 2) */}
          <div className={`lg:col-span-2 space-y-8 transition-all duration-300 ${recalculating ? 'opacity-60 pointer-events-none' : ''}`}>
            
            {/* Main gauge row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Productivity Analysis Card */}
              <div className="glass-card p-6 flex flex-col justify-between space-y-6 relative overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-border-light dark:border-border-dark">
                  <div className="flex items-center gap-2">
                    <Brain className="text-primary animate-pulse" size={18} />
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Productivity Analysis</h3>
                  </div>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Metrics AI
                  </span>
                </div>

                {/* Circular Gauge and Description */}
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="shrink-0 relative">
                    <svg width="120" height="120" className="transform -rotate-90">
                      <defs>
                        <linearGradient id="prodGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        className="stroke-slate-200 dark:stroke-slate-850"
                        strokeWidth="10"
                        fill="transparent"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        stroke="url(#prodGradient)"
                        strokeWidth="10"
                        strokeDasharray={314.16}
                        strokeDashoffset={314.16 - (coach.productivity_score / 100) * 314.16}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-1000 ease-out"
                        style={{ filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.3))' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-black text-slate-800 dark:text-slate-100 font-sans">{coach.productivity_score}%</span>
                      <span className="text-[8px] uppercase tracking-wider text-slate-400 font-extrabold">Productive</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Sparkles className="text-violet-500 animate-pulse" size={14} />
                      <span className="font-extrabold text-slate-700 dark:text-slate-300">Performance Status</span>
                    </div>
                    <p className="text-slate-550 dark:text-slate-400 text-[11px] leading-relaxed">
                      {coach.productivity_score >= 80 
                        ? "Outstanding performance. Your study habits and consistency are highly optimized."
                        : coach.productivity_score >= 60
                        ? "Good stability, but there's room for optimizing focus blocks and scheduling daily goals."
                        : "Focus and task completion metrics indicate significant bottlenecks. Consider restructuring your schedule."
                      }
                    </p>
                  </div>
                </div>

                {/* Details list */}
                <div className="space-y-4 text-xs font-semibold text-slate-500">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <h4 className="text-slate-700 dark:text-slate-350">Diagnostic Analysis Summary:</h4>
                      <button 
                        onClick={() => discussWithCoach('Diagnostic Analysis Summary', coach.insights)}
                        className="flex items-center gap-1 text-[10px] text-primary hover:text-primary-dark dark:hover:text-primary-light font-bold transition-colors bg-primary/5 hover:bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/10"
                        title="Discuss this insight with AI Coach"
                      >
                        <MessageSquare size={10} />
                        <span>Discuss</span>
                      </button>
                    </div>
                    <p className="text-slate-600 dark:text-slate-450 mt-1 leading-relaxed font-normal bg-slate-100/50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/50 dark:border-slate-850">
                      {coach.insights}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <h4 className="text-slate-700 dark:text-slate-350">Tomorrow's Time Optimization:</h4>
                      <button 
                        onClick={() => discussWithCoach('Time Optimization Recommendation', coach.optimization_suggestion)}
                        className="flex items-center gap-1 text-[10px] text-primary hover:text-primary-dark dark:hover:text-primary-light font-bold transition-colors bg-primary/5 hover:bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/10"
                        title="Discuss this optimization with AI Coach"
                      >
                        <MessageSquare size={10} />
                        <span>Discuss</span>
                      </button>
                    </div>
                    <p className="text-slate-600 dark:text-slate-450 mt-1 leading-relaxed font-normal bg-slate-100/50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/50 dark:border-slate-850">
                      {coach.optimization_suggestion}
                    </p>
                  </div>
                </div>
              </div>

              {/* Burnout Engine Status Card */}
              <div className="glass-card p-6 flex flex-col justify-between space-y-6 relative overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-border-light dark:border-border-dark">
                  <div className="flex items-center gap-2">
                    <Heart className={`animate-pulse ${coach.burnout.detected ? 'text-rose-500' : 'text-emerald-500'}`} size={18} />
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Burnout Engine Indicators</h3>
                  </div>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    coach.burnout.detected 
                      ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' 
                      : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  }`}>
                    {coach.burnout.detected ? 'Warning Active' : 'Normal Stress'}
                  </span>
                </div>

                {/* Circular Gauge and Stress Load Description */}
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="shrink-0 relative">
                    <svg width="120" height="120" className="transform -rotate-90">
                      <defs>
                        <linearGradient id="stressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor={coach.burnout.percentage >= 60 ? '#f43f5e' : '#10b981'} />
                          <stop offset="100%" stopColor={coach.burnout.percentage >= 60 ? '#be123c' : '#047857'} />
                        </linearGradient>
                      </defs>
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        className="stroke-slate-200 dark:stroke-slate-850"
                        strokeWidth="10"
                        fill="transparent"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        stroke="url(#stressGradient)"
                        strokeWidth="10"
                        strokeDasharray={314.16}
                        strokeDashoffset={314.16 - (coach.burnout.percentage / 100) * 314.16}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-1000 ease-out"
                        style={{ 
                          filter: coach.burnout.percentage >= 60 
                            ? 'drop-shadow(0 0 4px rgba(244, 63, 94, 0.3))' 
                            : 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.3))' 
                        }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className={`text-2xl font-black font-sans ${coach.burnout.percentage >= 60 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {coach.burnout.percentage}%
                      </span>
                      <span className="text-[8px] uppercase tracking-wider text-slate-400 font-extrabold">Stress Load</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={coach.burnout.percentage >= 60 ? 'text-rose-500' : 'text-emerald-500'} size={14} />
                      <span className="font-extrabold text-slate-700 dark:text-slate-300">Pacing Diagnostics</span>
                    </div>
                    <p className="text-slate-550 dark:text-slate-400 text-[11px] leading-relaxed">
                      {coach.burnout.percentage >= 80
                        ? "Critical risk of burnout detected. Immediate rest, session reductions, and lighter task loading are recommended."
                        : coach.burnout.percentage >= 60
                        ? "Moderate-high stress. You are pushing your limits, make sure to take breaks and plan rest intervals."
                        : "Healthy workload levels. You are keeping a sustainable schedule with minimal stress signs."
                      }
                    </p>
                  </div>
                </div>

                {/* Recovery Plan Text */}
                <div className="space-y-2 text-xs font-semibold text-slate-500">
                  <div className="flex justify-between items-center">
                    <h4 className="text-slate-700 dark:text-slate-350">AI Burnout Recovery Plan:</h4>
                    <button 
                      onClick={() => discussWithCoach('Burnout Recovery Plan', coach.burnout.recovery_plan)}
                      className="flex items-center gap-1 text-[10px] text-primary hover:text-primary-dark dark:hover:text-primary-light font-bold transition-colors bg-primary/5 hover:bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/10"
                      title="Discuss burnout plan with AI Coach"
                    >
                      <MessageSquare size={10} />
                      <span>Discuss</span>
                    </button>
                  </div>
                  <div className="text-slate-600 dark:text-slate-450 leading-relaxed font-normal bg-slate-100/50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/50 dark:border-slate-850">
                    {coach.burnout.recovery_plan}
                  </div>
                </div>
              </div>

            </div>

            {/* Schedule adjustments box */}
            {coach.burnout.schedule_adjustments && coach.burnout.schedule_adjustments.length > 0 && (
              <div className="glass-card p-6 bg-gradient-to-r from-rose-500/5 via-transparent to-transparent border-l-4 border-l-rose-500 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="text-rose-500 animate-bounce" size={18} />
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">AI Schedule Redesign Recommendations</h3>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {Object.values(acknowledgedTips).filter(Boolean).length} of {coach.burnout.schedule_adjustments.length} Applied
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {coach.burnout.schedule_adjustments.map((tip, idx) => {
                    const isAcknowledged = !!acknowledgedTips[tip];
                    return (
                      <div 
                        key={idx} 
                        onClick={() => toggleTip(tip)}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-300 cursor-pointer ${
                          isAcknowledged 
                            ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-400 dark:text-slate-500' 
                            : 'bg-slate-100/30 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-850 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <button 
                          type="button"
                          className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                            isAcknowledged 
                              ? 'bg-emerald-500 border-emerald-500 text-white' 
                              : 'border-slate-350 dark:border-slate-700 hover:border-primary'
                          }`}
                        >
                          {isAcknowledged && <Check size={12} strokeWidth={3} />}
                        </button>
                        <div className="flex-1 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs font-semibold leading-relaxed">
                          <span className={isAcknowledged ? 'line-through text-slate-400 dark:text-slate-500' : ''}>{tip}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${
                              isAcknowledged 
                                ? 'bg-emerald-500/10 text-emerald-500' 
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                            }`}>
                              {isAcknowledged ? 'Applied' : 'Acknowledge'}
                            </span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                discussWithCoach('Schedule Recommendation', tip);
                              }}
                              className="p-1 hover:bg-primary/10 rounded text-slate-400 hover:text-primary transition-all"
                              title="Discuss with Coach"
                            >
                              <MessageSquare size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Safe status callout */}
            {!coach.burnout.detected && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-500 rounded-2xl flex items-center gap-2 text-xs font-semibold">
                <ShieldCheck size={18} />
                <span>Burnout engine states you are pacing yourself perfectly. Keep up the high study consistency!</span>
              </div>
            )}

          </div>

          {/* Right Column: Chatbot */}
          <div className="glass-card flex flex-col h-[650px] justify-between overflow-hidden border border-border-light dark:border-border-dark">
            <div className="p-4 border-b border-border-light dark:border-border-dark flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Brain size={18} className="text-primary animate-pulse" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Coach Chatbot 💬</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Ask doubts about your study plan & habits</p>
                </div>
              </div>
              {messages.length > 1 && (
                <button
                  onClick={async () => {
                    if (confirm("Are you sure you want to clear your chat history?")) {
                      try {
                        await api.delete('/api/coach/chat/history?chat_type=coach')
                      } catch (err) {
                        console.error("Failed to clear chat history from server:", err)
                      }
                      setMessages([
                        { role: 'assistant', content: "Hi! I am your AI Productivity Coach. Ask me any questions about your schedule, roadmap, tasks, or time management tips!" }
                      ])
                    }
                  }}
                  className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {/* AI Guidelines Rate Limit Banner */}
            <div className="bg-primary/5 border-b border-border-light dark:border-border-dark px-4 py-2 flex items-center gap-2 text-[10px] text-slate-600 dark:text-slate-400 font-semibold bg-gradient-to-r from-primary/5 via-violet-500/5 to-transparent shrink-0">
              <Sparkles size={12} className="text-primary animate-pulse shrink-0" />
              <span>AI Guidelines: 2 requests/min • 100 requests/day • Concise answers to save tokens.</span>
            </div>

            {/* Chat Messages scroll area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar bg-slate-50/10 dark:bg-slate-950/10">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed font-medium ${
                      m.role === 'user'
                        ? 'bg-primary text-white rounded-tr-none shadow-blue'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-tl-none border border-slate-200/50 dark:border-slate-800'
                    }`}
                  >
                    <div className="whitespace-pre-line leading-relaxed">{m.content}</div>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-900 text-slate-400 rounded-2xl rounded-tl-none p-3 text-xs flex items-center gap-1.5 border border-slate-200/50 dark:border-slate-800">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-border-light dark:border-border-dark flex gap-2 bg-slate-50/50 dark:bg-slate-900/50">
              <input
                type="text"
                placeholder="Ask me something about your schedule..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 glass-input py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !chatInput.trim()}
                className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>

        </div>
      )}

    </div>
  )
}
