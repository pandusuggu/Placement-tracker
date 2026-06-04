import React, { useState, useEffect } from 'react'
import { Sparkles, Calendar, Clock, Target, Plus, X } from 'lucide-react'
import api from '../../services/api'

interface RoadmapData {
  id: string
  target_role: string
  daily_available_hours: number
  skill_level: string
  topics_to_learn: string[]
  daily_plan: string
  weekly_roadmap: string
  monthly_roadmap: string
  recommendations: string[]
  learning_priorities: string[]
}

export const AIPlanner: React.FC = () => {
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [role, setRole] = useState('Software Engineer')
  const [hours, setHours] = useState(4)
  const [level, setLevel] = useState('intermediate')
  const [topics, setTopics] = useState<string[]>([])
  const [topicInput, setTopicInput] = useState('')

  const fetchRoadmap = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/study-planner/current')
      if (res.data && res.data.id) {
        setRoadmap(res.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoadmap()
  }, [])

  const handleAddTopic = () => {
    if (topicInput.trim() && !topics.includes(topicInput.trim())) {
      setTopics([...topics, topicInput.trim()])
      setTopicInput('')
    }
  }

  const handleRemoveTopic = (t: string) => {
    setTopics(topics.filter(item => item !== t))
  }

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (topics.length === 0) return

    setGenerating(true)
    setError(null)
    try {
      const res = await api.post('/api/study-planner', {
        target_role: role,
        daily_available_hours: hours,
        skill_level: level,
        topics_to_learn: topics
      })
      setRoadmap(res.data)
    } catch (e: any) {
      console.error(e)
      setError(e.response?.data?.detail || "AI Study Plan Generation failed. Check API key configuration or try again.")
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[70vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-4 md:p-8 space-y-8 max-w-5xl mx-auto w-full min-h-screen">
      
      {/* Visual split columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Form settings inputs */}
        <div className="glass-card p-6 h-fit space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border-light dark:border-border-dark">
            <Target size={18} className="text-primary" />
            <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-200">Plan Customizer</h3>
          </div>
          
          <form onSubmit={handleGeneratePlan} className="space-y-4 text-xs font-semibold text-slate-500">
            <div className="space-y-1">
              <label>Target Placement Role</label>
              <input
                required
                type="text"
                placeholder="e.g. Frontend React Engineer"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="glass-input text-xs py-2"
              />
            </div>

            <div className="space-y-1">
              <label>Daily Study Time (Hours)</label>
              <input
                required
                type="number"
                min="1"
                max="16"
                value={hours}
                onChange={(e) => setHours(parseFloat(e.target.value))}
                className="glass-input text-xs py-2"
              />
            </div>

            <div className="space-y-1">
              <label>Current Skill Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="glass-input text-xs py-2 appearance-none"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Target Topics tag creator */}
            <div className="space-y-2">
              <label>Topics to Master</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Trees, DBMS"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTopic())}
                  className="glass-input text-xs py-2"
                />
                <button
                  type="button"
                  onClick={handleAddTopic}
                  className="px-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl hover:bg-slate-200"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Topics tags rendered */}
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                {topics.map(t => (
                  <span 
                    key={t}
                    className="flex items-center gap-1 bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full text-[10px]"
                  >
                    <span>{t}</span>
                    <button type="button" onClick={() => handleRemoveTopic(t)} className="text-primary hover:text-red-500">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={generating || topics.length === 0}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent-violet text-white font-bold shadow-blue hover:opacity-90 active:scale-[0.98] disabled:opacity-50 text-xs mt-2"
            >
              <Sparkles size={14} />
              <span>{generating ? 'AI Generating Plan...' : 'Generate Study Roadmap'}</span>
            </button>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-[11px] font-semibold mt-2 text-center animate-fade-in">
                {error}
              </div>
            )}

          </form>
        </div>

        {/* Right Columns: AI Output Plans */}
        <div className="md:col-span-2 space-y-6">
          {!roadmap ? (
            <div className="glass-card p-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-4">
              <Sparkles size={32} className="text-primary animate-pulse" />
              <div>
                <h4 className="font-bold text-slate-700 dark:text-slate-350">Configure Your Career Path</h4>
                <p className="text-xs text-slate-500 mt-1">Specify target roles and learning topics to generate your custom path.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in-up">
              
              {/* Daily Checklist */}
              <div className="glass-card p-6">
                <div className="flex items-center gap-2 pb-3 border-b border-border-light dark:border-border-dark mb-4">
                  <Clock size={16} className="text-primary" />
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Daily Study Checklist Outline</h4>
                </div>
                <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 whitespace-pre-line bg-slate-100/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/50 dark:border-slate-850">
                  {roadmap.daily_plan}
                </div>
              </div>

              {/* Weekly Milestones */}
              <div className="glass-card p-6">
                <div className="flex items-center gap-2 pb-3 border-b border-border-light dark:border-border-dark mb-4">
                  <Calendar size={16} className="text-accent-violet" />
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Weekly Milestones Strategy</h4>
                </div>
                <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 whitespace-pre-line bg-slate-100/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/50 dark:border-slate-850">
                  {roadmap.weekly_roadmap}
                </div>
              </div>



              {/* AI learning tips recommendations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass-card p-6 space-y-3">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-slate-400">Coach Learning Tips</h5>
                  <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-405 dark:text-slate-400 font-medium">
                    {roadmap.recommendations.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>

                <div className="glass-card p-6 space-y-3">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-slate-400">High Priority Subjects</h5>
                  <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-405 dark:text-slate-400 font-medium">
                    {roadmap.learning_priorities.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

            </div>
          )}
        </div>

      </div>

    </div>
  )
}
