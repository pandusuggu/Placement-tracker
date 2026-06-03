import React, { useState, useEffect } from 'react'
import { Shield, RefreshCw, Users, Activity, Search, Clock, Trash2, CheckSquare, Brain, MessageSquare, BookOpen } from 'lucide-react'
import api from '../../services/api'

interface AdminUserItem {
  id: string
  name: string
  email: string
  college: string
  branch: string
  target_role: string
  role: string
  created_at: string
  last_active: string
}

interface AdminStats {
  total_users: number
  online_now: number
  active_today: number
  total_tasks: number
  total_ai_queries: number
  total_messages: number
  total_study_plans: number
  users: AdminUserItem[]
}

export const Admin: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete the student account for "${userName}"? This will erase all of their tasks, Pomodoro sessions, and DSA preparation progress logs. This action cannot be undone.`)) {
      return
    }

    try {
      await api.delete(`/api/admin/users/${userId}`)
      await handleRefresh()
    } catch (err) {
      console.error('Failed to delete student account:', err)
      alert('Failed to delete user account. Verify admin permissions.')
    }
  }

  const fetchStats = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/admin/stats')
      setStats(res.data)
    } catch (err) {
      console.error('Failed to fetch admin stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const res = await api.get('/api/admin/stats')
      setStats(res.data)
    } catch (err) {
      console.error('Failed to refresh admin stats:', err)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const parseUTCDate = (dateStr: string): Date => {
    if (!dateStr) return new Date()
    let cleanStr = dateStr.replace(' ', 'T')
    if (
      !cleanStr.endsWith('Z') && 
      !cleanStr.includes('+') && 
      !cleanStr.includes('GMT') &&
      !/[-+]\d{2}:?\d{2}$/.test(cleanStr)
    ) {
      cleanStr += 'Z'
    }
    return new Date(cleanStr)
  }

  const formatDateTime = (dateStr: string) => {
    try {
      const d = parseUTCDate(dateStr)
      return d.toLocaleString()
    } catch {
      return dateStr
    }
  }

  const isOnline = (lastActiveStr: string) => {
    try {
      const lastActive = parseUTCDate(lastActiveStr)
      const now = new Date()
      // Active in the last 5 minutes (300,000 ms)
      return now.getTime() - lastActive.getTime() < 300000
    } catch {
      return false
    }
  }


  const filteredUsers = stats?.users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.college.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.target_role.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-2xl text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <Shield className="text-primary w-7 h-7" /> Admin Control Panel
          </h2>
          <p className="text-xs text-slate-500 mt-1.5">
            Placement coordinator statistics dashboard to monitor user activity, registrations, and engagement.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="bg-primary hover:bg-primary-dark text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 self-start transition-all shadow-blue disabled:opacity-50"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Metrics'}</span>
        </button>
      </div>

      {loading && !stats ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : stats ? (
        <>
          {/* Stats Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Total Registered Users */}
            <div className="glass-card p-6 border-slate-200 dark:border-slate-800/80 hover:scale-[1.01] transition-all flex items-center justify-between glow-blue">
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Registered Users</span>
                <h4 className="text-3xl font-black text-slate-800 dark:text-slate-100">{stats.total_users}</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Total user accounts</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-inner">
                <Users size={24} />
              </div>
            </div>

            {/* Online Now */}
            <div className="glass-card p-6 border-slate-200 dark:border-slate-800/80 hover:scale-[1.01] transition-all flex items-center justify-between glow-emerald">
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Online Now</span>
                <h4 className="text-3xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {stats.online_now}
                </h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Active in last 5 minutes</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500 shadow-inner">
                <Activity size={24} />
              </div>
            </div>

            {/* Active Today */}
            <div className="glass-card p-6 border-slate-200 dark:border-slate-800/80 hover:scale-[1.01] transition-all flex items-center justify-between glow-blue">
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Today</span>
                <h4 className="text-3xl font-black text-slate-800 dark:text-slate-100">{stats.active_today}</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Active in last 24 hours</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500 shadow-inner">
                <Clock size={24} />
              </div>
            </div>

            {/* Tasks Created */}
            <div className="glass-card p-6 border-slate-200 dark:border-slate-800/80 hover:scale-[1.01] transition-all flex items-center justify-between glow-rose">
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tasks Created</span>
                <h4 className="text-3xl font-black text-slate-800 dark:text-slate-100">{stats.total_tasks}</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Total user tasks</p>
              </div>
              <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500 shadow-inner">
                <CheckSquare size={24} />
              </div>
            </div>

            {/* AI Queries */}
            <div className="glass-card p-6 border-slate-200 dark:border-slate-800/80 hover:scale-[1.01] transition-all flex items-center justify-between glow-violet">
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">AI Queries Generated</span>
                <h4 className="text-3xl font-black text-slate-800 dark:text-slate-100">{stats.total_ai_queries}</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Total AI Requests</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-inner">
                <Brain size={24} />
              </div>
            </div>

            {/* Messages Sent */}
            <div className="glass-card p-6 border-slate-200 dark:border-slate-800/80 hover:scale-[1.01] transition-all flex items-center justify-between glow-violet">
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Messages Sent</span>
                <h4 className="text-3xl font-black text-slate-800 dark:text-slate-100">{stats.total_messages}</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Chat room & private messages</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-inner">
                <MessageSquare size={24} />
              </div>
            </div>

            {/* Study Plans */}
            <div className="glass-card p-6 border-slate-200 dark:border-slate-800/80 hover:scale-[1.01] transition-all flex items-center justify-between glow-blue">
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Study Plans Generated</span>
                <h4 className="text-3xl font-black text-slate-800 dark:text-slate-100">{stats.total_study_plans}</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase">AI placement roadmaps</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-inner">
                <BookOpen size={24} />
              </div>
            </div>
          </div>

          {/* User Details Grid */}
          <div className="space-y-4 pt-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Users size={18} className="text-primary" />
                <span>Application Users List</span>
              </h3>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search user name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="glass-input text-xs py-2"
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>

            <div className="glass-card overflow-hidden border-slate-200 dark:border-slate-800/80">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border-light dark:border-border-dark text-slate-400 font-extrabold uppercase tracking-wider">
                      <th className="p-4">User</th>
                      <th className="p-4">College Details</th>
                      <th className="p-4">Target Role</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Registered Date</th>
                      <th className="p-4">Last Activity</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light dark:divide-border-dark font-medium">
                    {filteredUsers.map((user) => {
                      const userOnline = isOnline(user.last_active)
                      return (
                        <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-350 dark:border-slate-700 flex items-center justify-center font-bold text-slate-750 dark:text-slate-250 select-none">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h5 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">{user.name}</h5>
                                <p className="text-[10px] text-slate-400 lowercase font-medium">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-slate-650 dark:text-slate-400">
                            <div>{user.college}</div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase">{user.branch}</div>
                          </td>
                          <td className="p-4 text-slate-650 dark:text-slate-400">{user.target_role}</td>
                          <td className="p-4">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                              user.role === 'admin' 
                                ? 'bg-primary/10 border-primary/20 text-primary' 
                                : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-850 text-slate-500'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="p-4 text-slate-500 dark:text-slate-550">{formatDateTime(user.created_at)}</td>
                          <td className="p-4 text-slate-500 dark:text-slate-550">{formatDateTime(user.last_active)}</td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider ${
                              userOnline ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-600'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${userOnline ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-600'}`}></span>
                              {userOnline ? 'Online' : 'Offline'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {user.role !== 'admin' && (
                              <button
                                onClick={() => handleDeleteUser(user.id, user.name)}
                                className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-lg transition-all"
                                title="Delete Student Account"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-550 dark:text-slate-450 font-bold">
                          No users found matching search query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
export default Admin
