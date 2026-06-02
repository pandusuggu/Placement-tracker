import React, { useState, useEffect } from 'react'
import { Trophy, RefreshCw, Search } from 'lucide-react'
import api from '../../services/api'

interface LeaderboardItem {
  user_id: string
  name: string
  email: string
  avatar?: string
  target_role: string
  college: string
  weekly_problems_solved: number
  weekly_focus_hours: number
  score: number
  rank: number
}

export const Leaderboard: React.FC = () => {
  const [items, setItems] = useState<LeaderboardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/leaderboard')
      setItems(res.data)
    } catch (err) {
      console.error('Failed to fetch leaderboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const res = await api.get('/api/leaderboard')
      setItems(res.data)
    } catch (err) {
      console.error('Failed to refresh leaderboard:', err)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.target_role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.college.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const podium = items.slice(0, 3)

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-2xl text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <Trophy className="text-primary w-7 h-7" /> Weekly Leaderboard
          </h2>
          <p className="text-xs text-slate-500 mt-1.5">
            Compare and track weekly coding and productivity contributions across all registered users.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="bg-primary hover:bg-primary-dark text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 self-start transition-all shadow-blue disabled:opacity-50"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Rankings'}</span>
        </button>
      </div>

      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* Top 3 Podium Cards */}
          {podium.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4">
              {/* 2nd Place */}
              {podium[1] && (
                <div className="glass-card p-6 border-slate-200/50 dark:border-slate-800/50 flex flex-col items-center text-center relative overflow-hidden order-2 md:order-1 h-[260px] justify-between">
                  <div className="absolute top-3 left-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-500 rounded-full w-7 h-7 flex items-center justify-center text-xs font-black shadow-inner">
                    #2
                  </div>
                  <div className="flex flex-col items-center space-y-3 pt-4">
                    <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 flex items-center justify-center font-black text-2xl text-slate-600 dark:text-slate-300 shadow">
                      {podium[1].name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm truncate max-w-[150px]">{podium[1].name}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase truncate max-w-[150px] mt-0.5">{podium[1].target_role}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 w-full">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase px-2">
                      <span>Solved: {podium[1].weekly_problems_solved}</span>
                      <span>Hours: {podium[1].weekly_focus_hours}h</span>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-1.5 px-3 rounded-xl font-black text-xs text-slate-600 dark:text-slate-300">
                      Score: {podium[1].score} pts
                    </div>
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {podium[0] && (
                <div className="glass-card p-6 border-primary/30 bg-primary/5 dark:bg-primary/5 flex flex-col items-center text-center relative overflow-hidden order-1 md:order-2 h-[300px] justify-between shadow-blue">
                  <div className="absolute top-3 left-3 bg-amber-500/20 border border-amber-500/30 text-amber-500 rounded-full w-8 h-8 flex items-center justify-center text-xs font-black shadow-md">
                    👑
                  </div>
                  <div className="flex flex-col items-center space-y-3 pt-6">
                    <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center font-black text-3xl text-primary shadow">
                      {podium[0].name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 dark:text-slate-100 text-base truncate max-w-[180px]">{podium[0].name}</h4>
                      <p className="text-[10px] text-primary font-bold uppercase truncate max-w-[180px] mt-0.5 tracking-wider">{podium[0].target_role}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 w-full">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase px-2">
                      <span>Solved: {podium[0].weekly_problems_solved}</span>
                      <span>Hours: {podium[0].weekly_focus_hours}h</span>
                    </div>
                    <div className="bg-primary text-white py-2 px-4 rounded-xl font-black text-sm shadow-blue">
                      Score: {podium[0].score} pts
                    </div>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {podium[2] && (
                <div className="glass-card p-6 border-slate-200/50 dark:border-slate-800/50 flex flex-col items-center text-center relative overflow-hidden order-3 h-[240px] justify-between">
                  <div className="absolute top-3 left-3 bg-amber-600/10 border border-amber-600/20 text-amber-600 rounded-full w-7 h-7 flex items-center justify-center text-xs font-black shadow-inner">
                    #3
                  </div>
                  <div className="flex flex-col items-center space-y-3 pt-4">
                    <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-650 flex items-center justify-center font-black text-xl text-slate-600 dark:text-slate-350 shadow">
                      {podium[2].name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm truncate max-w-[150px]">{podium[2].name}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase truncate max-w-[150px] mt-0.5">{podium[2].target_role}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 w-full">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase px-2">
                      <span>Solved: {podium[2].weekly_problems_solved}</span>
                      <span>Hours: {podium[2].weekly_focus_hours}h</span>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-1.5 px-3 rounded-xl font-black text-xs text-slate-600 dark:text-slate-300">
                      Score: {podium[2].score} pts
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search and Table Grid */}
          <div className="space-y-4 pt-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, target role, or college..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="glass-input pl-10 text-xs py-2.5"
              />
            </div>

            <div className="glass-card overflow-hidden border-slate-200 dark:border-slate-800/80">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border-light dark:border-border-dark text-slate-400 font-extrabold uppercase tracking-wider">
                      <th className="p-4 w-16 text-center">Rank</th>
                      <th className="p-4">User</th>
                      <th className="p-4">College</th>
                      <th className="p-4">Target Role</th>
                      <th className="p-4 text-center">Solved (7d)</th>
                      <th className="p-4 text-center">Focus Time (7d)</th>
                      <th className="p-4 text-right">Leaderboard Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light dark:divide-border-dark font-medium">
                    {filteredItems.map((item) => (
                      <tr 
                        key={item.user_id} 
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all ${item.rank === 1 ? 'bg-primary/5 dark:bg-primary/5' : ''}`}
                      >
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-[11px] ${
                            item.rank === 1 ? 'bg-amber-500 text-white' :
                            item.rank === 2 ? 'bg-slate-300 text-slate-700' :
                            item.rank === 3 ? 'bg-amber-650 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}>
                            {item.rank}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-350 dark:border-slate-700 flex items-center justify-center font-bold text-slate-750 dark:text-slate-250 select-none">
                              {item.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h5 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">{item.name}</h5>
                              <p className="text-[10px] text-slate-400 lowercase font-medium">{item.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-slate-650 dark:text-slate-400">{item.college}</td>
                        <td className="p-4 text-slate-650 dark:text-slate-400">{item.target_role}</td>
                        <td className="p-4 text-center text-slate-850 dark:text-slate-200 font-bold">{item.weekly_problems_solved}</td>
                        <td className="p-4 text-center text-slate-850 dark:text-slate-200 font-bold">{item.weekly_focus_hours} hrs</td>
                        <td className="p-4 text-right">
                          <span className="font-black text-primary text-xs bg-primary/10 px-2.5 py-1.5 rounded-xl border border-primary/20">
                            {item.score} pts
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredItems.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-550 dark:text-slate-450 font-bold">
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
      )}
    </div>
  )
}
export default Leaderboard
