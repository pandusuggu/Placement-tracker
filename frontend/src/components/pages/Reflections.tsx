import React, { useState, useEffect } from 'react'
import { Sparkles, Calendar, PenTool } from 'lucide-react'
import api from '../../services/api'

interface ReflectionItem {
  id: string
  date: string
  q_well: string
  q_distracted: string
  q_improve: string
  ai_summary?: string
  improvement_suggestions: string[]
}

export const Reflections: React.FC = () => {
  const [reflections, setReflections] = useState<ReflectionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form values
  const [well, setWell] = useState('')
  const [distracted, setDistracted] = useState('')
  const [improve, setImprove] = useState('')
  
  const [recentSummary, setRecentSummary] = useState<ReflectionItem | null>(null)

  const fetchReflections = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/reflections/history')
      setReflections(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReflections()
  }, [])

  const handleSubmitReflection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!well.trim() || !distracted.trim() || !improve.trim()) return

    setSaving(true)
    const todayStr = new Date().toISOString().split('T')[0]
    try {
      const res = await api.post('/api/reflections', {
        date: todayStr,
        q_well: well,
        q_distracted: distracted,
        q_improve: improve
      })
      setRecentSummary(res.data)
      
      // Reset
      setWell('')
      setDistracted('')
      setImprove('')
      
      fetchReflections()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (loading && reflections.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[70vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-4 md:p-8 space-y-8 max-w-5xl mx-auto w-full min-h-screen">
      
      {/* Visual split layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Reflection Form */}
        <div className="glass-card p-6 h-fit space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border-light dark:border-border-dark">
            <PenTool size={18} className="text-primary" />
            <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-200">Daily Journal</h3>
          </div>
          
          <form onSubmit={handleSubmitReflection} className="space-y-4 text-xs font-semibold text-slate-500">
            <div className="space-y-1">
              <label>What went well today?</label>
              <textarea
                required
                placeholder="e.g. Mastered BST traversal patterns"
                value={well}
                onChange={(e) => setWell(e.target.value)}
                className="glass-input h-16 resize-none text-xs"
              />
            </div>

            <div className="space-y-1">
              <label>What distracted you today?</label>
              <textarea
                required
                placeholder="e.g. Spent 2 hours scrolling YouTube videos"
                value={distracted}
                onChange={(e) => setDistracted(e.target.value)}
                className="glass-input h-16 resize-none text-xs"
              />
            </div>

            <div className="space-y-1">
              <label>What will you improve tomorrow?</label>
              <textarea
                required
                placeholder="e.g. Put phone in other room during study sessions"
                value={improve}
                onChange={(e) => setImprove(e.target.value)}
                className="glass-input h-16 resize-none text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2.5 rounded-xl transition-all shadow-blue disabled:opacity-50 text-xs"
            >
              {saving ? 'AI Analyzing Journal...' : 'Submit Reflection'}
            </button>
          </form>
        </div>

        {/* Right Columns: AI Output Insights */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Recent AI analysis highlight */}
          {recentSummary && (
            <div className="glass-card p-6 bg-gradient-to-r from-primary/5 via-accent-violet/5 to-transparent border-l-4 border-l-primary animate-fade-in-up">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="text-primary animate-pulse" size={18} />
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">AI Daily Journal Feedback</h4>
              </div>
              <div className="space-y-3 text-xs leading-relaxed">
                <div>
                  <h5 className="font-bold text-slate-700 dark:text-slate-350">AI Synthesis:</h5>
                  <p className="text-slate-600 dark:text-slate-405 dark:text-slate-400 mt-1">{recentSummary.ai_summary}</p>
                </div>
                {recentSummary.improvement_suggestions && recentSummary.improvement_suggestions.length > 0 && (
                  <div>
                    <h5 className="font-bold text-slate-700 dark:text-slate-350">Actionable Adjustments:</h5>
                    <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-600 dark:text-slate-400 font-medium">
                      {recentSummary.improvement_suggestions.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Archive listing */}
          <div className="glass-card p-6 flex flex-col">
            <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-200 mb-6">Historical Reflection Journals</h3>
            
            {reflections.length === 0 ? (
              <p className="text-xs text-center text-slate-500 py-10">No past entries recorded. Submit your first one today!</p>
            ) : (
              <div className="space-y-6 max-h-[500px] overflow-y-auto pr-1">
                {reflections.map((item) => (
                  <div key={item.id} className="p-4 rounded-xl bg-slate-100/30 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-slate-800/50">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Calendar size={14} className="text-primary" />
                        {new Date(item.date).toLocaleDateString([], { dateStyle: 'medium' })}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[11px] leading-relaxed text-slate-500">
                      <div>
                        <h5 className="font-extrabold text-slate-700 dark:text-slate-350">What went well:</h5>
                        <p className="mt-1 text-slate-600 dark:text-slate-400 font-medium">{item.q_well}</p>
                      </div>
                      <div>
                        <h5 className="font-extrabold text-slate-700 dark:text-slate-350">Distractions faced:</h5>
                        <p className="mt-1 text-slate-655 text-slate-600 dark:text-slate-400 font-medium">{item.q_distracted}</p>
                      </div>
                      <div>
                        <h5 className="font-extrabold text-slate-700 dark:text-slate-350">Improvements:</h5>
                        <p className="mt-1 text-slate-655 text-slate-600 dark:text-slate-400 font-medium">{item.q_improve}</p>
                      </div>
                    </div>

                    {item.ai_summary && (
                      <div className="mt-3 p-3 bg-primary/5 rounded-xl border border-primary/10 text-xs text-slate-650 dark:text-slate-400 leading-relaxed">
                        <span className="font-bold flex items-center gap-1 mb-1">
                          <Sparkles size={12} className="text-primary animate-pulse" />
                          Coach Synthesis
                        </span>
                        <p className="font-medium">{item.ai_summary}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  )
}
