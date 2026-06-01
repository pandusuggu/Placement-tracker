import React, { useState, useEffect } from 'react'
import { Plus, Check, Trash2, Calendar, Sparkles, Filter } from 'lucide-react'
import api from '../../services/api'

interface TaskItem {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  category: string
  due_date?: string
  rescheduled_count: number
}

export const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filtering & Sorting
  const [filterStatus, setFilterStatus] = useState<string>('pending') // "all", "pending", "completed"
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('due_date')

  // Form inputs
  const [showAddForm, setShowAddForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [category, setCategory] = useState('study')
  const [dueDate, setDueDate] = useState('')
  
  const [rescheduling, setRescheduling] = useState(false)
  const [rescheduleMessage, setRescheduleMessage] = useState('')

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/api/tasks`, {
        params: {
          status: filterStatus === 'all' ? undefined : filterStatus,
          category: filterCategory === 'all' ? undefined : filterCategory,
          sort: sortBy
        }
      })
      setTasks(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [filterStatus, filterCategory, sortBy])

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    try {
      await api.post('/api/tasks', {
        title,
        description: description || undefined,
        priority,
        category,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined
      })
      
      // Reset
      setTitle('')
      setDescription('')
      setPriority('medium')
      setCategory('study')
      setDueDate('')
      setShowAddForm(false)
      
      fetchTasks()
    } catch (e) {
      console.error(e)
    }
  }

  const handleToggleComplete = async (task: TaskItem) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed'
    try {
      await api.put(`/api/tasks/${task.id}`, { status: nextStatus })
      fetchTasks()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await api.delete(`/api/tasks/${taskId}`)
      setTasks(tasks.filter(t => t.id !== taskId))
    } catch (e) {
      console.error(e)
    }
  }

  // Smart Rescheduler API trigger
  const handleSmartReschedule = async () => {
    setRescheduling(true)
    setRescheduleMessage('')
    try {
      const res = await api.post('/api/tasks/reschedule')
      setRescheduleMessage(`AI Rescheduling Complete: updated ${res.data.rescheduled_tasks_count} overdue items.`)
      fetchTasks()
    } catch (e) {
      setRescheduleMessage('Smart rescheduling failed.')
    } finally {
      setRescheduling(false)
      setTimeout(() => setRescheduleMessage(''), 5000)
    }
  }

  const categories = ['all', 'study', 'health', 'personal', 'projects', 'interview_preparation', 'work']

  return (
    <div className="flex-1 p-4 md:p-8 space-y-8 max-w-5xl mx-auto w-full min-h-screen">
      
      {/* 1. Header with Smart Rescheduler action */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 font-medium">Keep track of your study routines and tasks.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleSmartReschedule}
            disabled={rescheduling}
            className="flex items-center gap-2 bg-gradient-to-r from-primary to-accent-violet text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:opacity-90 shadow-blue active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Sparkles size={16} />
            <span>{rescheduling ? 'AI Rescheduling...' : 'AI Auto-Reschedule'}</span>
          </button>
          
          <button
            onClick={() => setShowAddForm(prev => !prev)}
            className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold px-4 py-2.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <Plus size={16} />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Overdue alert banner if smart reschedule completes */}
      {rescheduleMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in-up">
          <Sparkles size={16} />
          <span>{rescheduleMessage}</span>
        </div>
      )}

      {/* 2. Create Task Modal / Dropdown */}
      {showAddForm && (
        <form onSubmit={handleCreateTask} className="glass-card p-6 space-y-4 animate-fade-in-up">
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">New Task Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Task Title</label>
              <input
                required
                type="text"
                placeholder="e.g. Solve Binary Tree questions"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="glass-input"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Due Date</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="glass-input"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="glass-input appearance-none"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent Priority</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="glass-input appearance-none"
              >
                <option value="study">Study</option>
                <option value="health">Health</option>
                <option value="personal">Personal</option>
                <option value="projects">Projects</option>
                <option value="interview_preparation">Interview Preparation</option>
                <option value="work">Work</option>
              </select>
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-500">Description (Optional)</label>
              <textarea
                placeholder="Details about topics, steps, and targets..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="glass-input h-20 resize-none"
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
              Add Task
            </button>
          </div>
        </form>
      )}

      {/* 3. Controls Filter Bar */}
      <div className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Left: Toggles */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
          {['pending', 'completed', 'all'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                filterStatus === status 
                  ? 'bg-white dark:bg-card-dark text-slate-800 dark:text-slate-200 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Right: Filters & Sorting selectors */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <Filter size={14} />
            <span>Category:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 outline-none"
            >
              {categories.map(c => (
                <option key={c} value={c} className="capitalize dark:bg-card-dark">{c.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 outline-none"
            >
              <option value="due_date" className="dark:bg-card-dark">Due Date</option>
              <option value="priority" className="dark:bg-card-dark">Priority</option>
              <option value="created_at" className="dark:bg-card-dark">Created Date</option>
            </select>
          </div>
        </div>

      </div>

      {/* 4. Tasks list render */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-500">
          No tasks found matching your filters. Write one above!
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div 
              key={task.id}
              className={`glass-card p-4 flex items-center justify-between border-l-4 transition-all hover:scale-[1.005] ${
                task.status === 'completed' ? 'opacity-60 border-l-slate-400' :
                task.priority === 'urgent' ? 'border-l-rose-500' :
                task.priority === 'high' ? 'border-l-amber-500' :
                task.priority === 'medium' ? 'border-l-primary' :
                'border-l-slate-300'
              }`}
            >
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleToggleComplete(task)}
                  className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                    task.status === 'completed' 
                      ? 'bg-slate-400 border-slate-500 text-white' 
                      : 'border-slate-300 dark:border-slate-700 text-transparent hover:border-primary hover:text-primary'
                  }`}
                >
                  <Check size={12} />
                </button>

                <div>
                  <h4 className={`font-bold text-sm text-slate-800 dark:text-slate-100 ${task.status === 'completed' ? 'line-through text-slate-500' : ''}`}>
                    {task.title}
                  </h4>
                  {task.description && (
                    <p className="text-xs text-slate-500 mt-1 max-w-md line-clamp-1">{task.description}</p>
                  )}
                  
                  {/* Metadata tags */}
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-550 dark:text-slate-400 font-bold">
                    <span className="bg-slate-200/50 dark:bg-slate-800/50 px-2 py-0.5 rounded capitalize">
                      {task.category.replace('_', ' ')}
                    </span>
                    {task.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(task.due_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    )}
                    {task.rescheduled_count > 0 && (
                      <span className="text-rose-500 font-bold">
                        Rescheduled {task.rescheduled_count}x
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <button
                onClick={() => handleDeleteTask(task.id)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/5 transition-all"
              >
                <Trash2 size={16} />
              </button>

            </div>
          ))}
        </div>
      )}

    </div>
  )
}
