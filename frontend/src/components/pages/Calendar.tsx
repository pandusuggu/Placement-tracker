import React, { useState, useEffect } from 'react'
import { Clock, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../../services/api'

interface CalendarEventItem {
  id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  event_type: string
  reference_id?: string
}

export const Calendar: React.FC = () => {
  const [events, setEvents] = useState<CalendarEventItem[]>([])
  
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  // New Event form fields
  const [showAddForm, setShowAddForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventTime, setEventTime] = useState('12:00')
  const [eventType, setEventType] = useState('custom')

  const fetchEvents = async () => {
    try {
      const res = await api.get('/api/calendar')
      setEvents(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    // Build ISO start & end times
    const startStr = `${selectedDate.toISOString().split('T')[0]}T${eventTime}:00`
    const start = new Date(startStr)
    const end = new Date(start.getTime() + 60 * 60 * 1000) // Default 1 hour duration

    try {
      await api.post('/api/calendar', {
        title,
        description: description || undefined,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        event_type: eventType
      })
      setTitle('')
      setDescription('')
      setEventTime('12:00')
      setEventType('custom')
      setShowAddForm(false)
      fetchEvents()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    // Check if it's virtual
    if (eventId.startsWith('task-virtual-')) return
    try {
      await api.delete(`/api/calendar/${eventId}`)
      setEvents(events.filter(e => e.id !== eventId))
    } catch (e) {
      console.error(e)
    }
  }

  // Monthly Calendar Math helpers
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const monthsList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  
  const firstDayIndex = new Date(year, month, 1).getDay() // 0 = Sun, 1 = Mon
  const totalDays = new Date(year, month + 1, 0).getDate()

  const daysArray = []
  // Fill leading empty cells
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null)
  }
  // Fill actual dates
  for (let i = 1; i <= totalDays; i++) {
    daysArray.push(new Date(year, month, i))
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  // Filter events matching a date
  const getEventsForDate = (date: Date) => {
    const checkStr = date.toISOString().split('T')[0]
    return events.filter(e => e.start_time.split('T')[0] === checkStr)
  }

  const activeDayEvents = getEventsForDate(selectedDate)

  return (
    <div className="flex-1 p-4 md:p-8 space-y-8 max-w-5xl mx-auto w-full min-h-screen">
      
      {/* Visual split columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Month Grid */}
        <div className="md:col-span-2 glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-200">
              {monthsList[month]} {year}
            </h3>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevMonth}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleNextMonth}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Grid Headers */}
          <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-400">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <span key={d} className="py-2">{d}</span>
            ))}
          </div>

          {/* Calendar Grid Cells */}
          <div className="grid grid-cols-7 gap-1">
            {daysArray.map((date, idx) => {
              if (!date) return <div key={idx} className="aspect-square bg-slate-50/50 dark:bg-slate-950/20 rounded-xl" />
              
              const isSelected = date.toDateString() === selectedDate.toDateString()
              const isToday = date.toDateString() === new Date().toDateString()
              const dayEvents = getEventsForDate(date)

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(date)}
                  className={`aspect-square flex flex-col justify-between p-2 rounded-xl text-xs font-bold transition-all border ${
                    isSelected 
                      ? 'bg-primary text-white border-primary shadow-blue scale-[1.03]' 
                      : isToday
                      ? 'bg-primary/5 border-primary/20 text-primary'
                      : 'border-slate-100/50 dark:border-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-300'
                  }`}
                >
                  <span className="self-end">{date.getDate()}</span>
                  
                  {/* Event indicators */}
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 justify-center w-full mt-1">
                      {dayEvents.slice(0, 3).map((e, eidx) => (
                        <div 
                          key={eidx} 
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-white' :
                            e.event_type === 'task' ? 'bg-primary' :
                            e.event_type === 'study_session' ? 'bg-emerald-500' :
                            'bg-accent-violet'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right 1 Column: Selected date items list & add form */}
        <div className="space-y-6">
          
          {/* Day list header */}
          <div className="glass-card p-6 flex flex-col max-h-[380px]">
            <div className="flex items-center justify-between pb-4 border-b border-border-light dark:border-border-dark mb-4">
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  {selectedDate.toLocaleDateString([], { dateStyle: 'medium' })}
                </h4>
                <p className="text-[10px] text-slate-500 font-medium">Scheduled items</p>
              </div>

              <button
                onClick={() => setShowAddForm(prev => !prev)}
                className="w-8 h-8 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-all"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {activeDayEvents.length === 0 ? (
                <p className="text-xs text-center text-slate-500 py-10">No events scheduled.</p>
              ) : (
                activeDayEvents.map((event) => (
                  <div 
                    key={event.id}
                    className="p-3 rounded-xl bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 flex justify-between items-start text-xs font-semibold"
                  >
                    <div>
                      <h5 className="font-bold text-slate-800 dark:text-slate-200">{event.title}</h5>
                      <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        <Clock size={10} />
                        {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {!event.id.startsWith('task-virtual-') && (
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Inline Add Event modal/form */}
          {showAddForm && (
            <form onSubmit={handleCreateEvent} className="glass-card p-6 space-y-4 animate-fade-in-up">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 pb-2 border-b border-border-light dark:border-border-dark">
                Schedule Event
              </h4>
              
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 dark:text-slate-400">Event Name</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. GeeksforGeeks Contest"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="glass-input text-xs py-2"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500 dark:text-slate-400">Start Time</label>
                  <input
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="glass-input text-xs py-2"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500 dark:text-slate-400">Type</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="glass-input text-xs py-2 appearance-none"
                  >
                    <option value="custom">Custom</option>
                    <option value="study_session">Study Session</option>
                    <option value="habit">Habit Routine</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-[10px] font-bold text-slate-500 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-[10px] font-bold text-white bg-primary hover:bg-primary-dark px-3 py-1.5 rounded-lg"
                >
                  Schedule
                </button>
              </div>
            </form>
          )}

        </div>

      </div>

    </div>
  )
}
