import React, { useState, useEffect } from 'react'
import { 
  GraduationCap, RefreshCw, Save, Flame, Sparkles, 
  UploadCloud, AlertTriangle, BookOpen, Sliders, Award as AwardIcon, Check
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'

interface CodingProgressData {
  leetcode_username?: string
  codechef_username?: string
  leetcode_easy_solved: number
  leetcode_medium_solved: number
  leetcode_hard_solved: number
  codechef_easy_solved: number
  codechef_medium_solved: number
  codechef_hard_solved: number
  current_streak: number
  longest_streak: number
  resume_status: string
}

interface PlacementReadiness {
  score: number
  readiness_level: string
  resume_ats_score?: number
  resume_strengths?: string[]
  resume_improvements?: string[]
  resume_suggestions?: string[]
}

const AVATAR_GRADIENTS = [
  'from-blue-500 to-indigo-600 shadow-blue',
  'from-purple-500 to-pink-600 shadow-pink',
  'from-emerald-400 to-teal-600 shadow-emerald',
  'from-amber-400 to-rose-600 shadow-amber',
  'from-violet-600 to-purple-800 shadow-indigo',
  'from-slate-700 to-slate-900 shadow-slate',
]

export const Profile: React.FC = () => {
  const { user, updateProfile } = useAuthStore()
  const [progress, setProgress] = useState<CodingProgressData | null>(null)
  const [readiness, setReadiness] = useState<PlacementReadiness | null>(null)
  
  // Form states
  const [name, setName] = useState(user?.name || '')
  const [college, setCollege] = useState(user?.college || '')
  const [branch, setBranch] = useState(user?.branch || '')
  const [cgpa, setCgpa] = useState(user?.cgpa !== undefined ? String(user.cgpa) : '')
  const [targetRole, setTargetRole] = useState(user?.target_role || '')
  const [dailyHours, setDailyHours] = useState(user?.daily_available_hours ? String(user.daily_available_hours) : '4')
  const [gradYear, setGradYear] = useState(user?.graduation_year ? String(user.graduation_year) : '2027')
  const [avatar, setAvatar] = useState(user?.avatar || AVATAR_GRADIENTS[0])

  // Handles states
  const [leetcode, setLeetcode] = useState('')
  const [codechef, setCodechef] = useState('')

  // Sync / Loader states
  const [updating, setUpdating] = useState(false)
  const [syncingHandles, setSyncingHandles] = useState(false)
  const [loading, setLoading] = useState(true)

  // Resume Upload states
  const [resumeAnalyzing, setResumeAnalyzing] = useState(false)
  const [resumeError, setResumeError] = useState<string | null>(null)

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      const progRes = await api.get('/api/coding/progress')
      setProgress(progRes.data)
      setLeetcode(progRes.data.leetcode_username || '')
      setCodechef(progRes.data.codechef_username || '')

      const readRes = await api.get('/api/placement/readiness')
      setReadiness(readRes.data)
    } catch (e) {
      console.error('Failed to load profile parameters:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfileData()
  }, [])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setUpdating(true)
    try {
      const payload = {
        name,
        college: college || null,
        branch: branch || null,
        cgpa: cgpa ? parseFloat(cgpa) : null,
        target_role: targetRole || null,
        daily_available_hours: dailyHours ? parseFloat(dailyHours) : 4.0,
        graduation_year: gradYear ? parseInt(gradYear) : 2027,
        avatar
      }
      
      const res = await api.put('/api/auth/profile', payload)
      updateProfile(res.data.user)
      alert("Profile details updated successfully!")
    } catch (err: any) {
      console.error(err)
      alert(err.response?.data?.detail || "Failed to update profile settings.")
    } finally {
      setUpdating(false)
    }
  }

  const handleSaveHandles = async (e: React.FormEvent) => {
    e.preventDefault()
    setSyncingHandles(true)
    try {
      await api.put('/api/coding/usernames', {
        leetcode_username: leetcode,
        codechef_username: codechef,
        gfg_username: "",
        hackerrank_username: ""
      })
      
      // Reload stats
      const progRes = await api.get('/api/coding/progress')
      setProgress(progRes.data)
      
      const readRes = await api.get('/api/placement/readiness')
      setReadiness(readRes.data)

      alert("Coding platform handles updated and synced successfully!")
    } catch (err: any) {
      console.error(err)
      alert(err.response?.data?.detail || "Failed to sync platform handles.")
    } finally {
      setSyncingHandles(false)
    }
  }

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const filename = file.name.toLowerCase()
    if (!filename.endsWith('.pdf') && !filename.endsWith('.txt')) {
      setResumeError("Only PDF and TXT files are supported.")
      return
    }

    setResumeError(null)
    setResumeAnalyzing(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await api.post('/api/placement/resume/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      setReadiness(res.data)
      
      if (progress) {
        setProgress({
          ...progress,
          resume_status: res.data.resume_status || 'completed'
        })
      }
      alert("Resume uploaded and analyzed successfully!")
    } catch (err: any) {
      console.error(err)
      setResumeError(err.response?.data?.detail || "Failed to analyze resume. Please try again.")
    } finally {
      setResumeAnalyzing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[70vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const leetcodeTotal = (progress?.leetcode_easy_solved || 0) + (progress?.leetcode_medium_solved || 0) + (progress?.leetcode_hard_solved || 0)
  const codechefTotal = (progress?.codechef_easy_solved || 0) + (progress?.codechef_medium_solved || 0) + (progress?.codechef_hard_solved || 0)
  
  // Extract avatar color index or default
  const avatarInitials = name.charAt(0).toUpperCase() || 'U'

  return (
    <div className="flex-1 p-4 md:p-8 space-y-8 max-w-6xl mx-auto w-full min-h-screen">
      
      {/* Profile Banner / Header */}
      <div className="glass-card p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 relative overflow-hidden bg-gradient-to-r from-primary/5 via-violet-500/5 to-transparent">
        <div className="flex flex-col sm:flex-row items-center gap-5.5 text-center sm:text-left">
          {/* Avatar frame */}
          <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${avatar} flex items-center justify-center text-white text-4xl font-extrabold select-none shadow-lg transform hover:scale-[1.03] transition-all duration-300`}>
            {avatarInitials}
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">{name || user?.name}</h1>
            <p className="text-xs text-slate-500 font-semibold">{user?.email}</p>
            
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3.5">
              {targetRole && (
                <span className="text-[10px] bg-primary/10 text-primary px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                  🎯 {targetRole}
                </span>
              )}
              {college && (
                <span className="text-[10px] bg-violet-500/10 text-violet-500 dark:text-violet-400 px-3 py-1 rounded-full font-bold">
                  🏫 {college}
                </span>
              )}
              {cgpa && (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full font-bold">
                  🏆 CGPA: {cgpa}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sync status / quick score */}
        {readiness && (
          <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 px-5 py-3 rounded-2xl text-primary font-bold shadow-sm shadow-primary/5">
            <div>
              <span className="text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold block">Readiness Score</span>
              <span className="text-2xl font-black">{readiness.score}%</span>
            </div>
            <div className="p-2.5 bg-primary/15 rounded-xl">
              <AwardIcon size={20} className="text-primary animate-pulse" />
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Settings Edit, Connect Accounts, Platform Solved Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (Col span 2): Account Settings */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center gap-2.5 pb-3.5 border-b border-border-light dark:border-border-dark">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Sliders size={16} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Account Settings</h3>
                <p className="text-[10px] text-slate-500 font-medium">Update academic details and preferences</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {/* Avatar chooser */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Choose Profile Theme Gradient</label>
                <div className="flex flex-wrap gap-2.5">
                  {AVATAR_GRADIENTS.map((grad) => (
                    <button
                      key={grad}
                      type="button"
                      onClick={() => setAvatar(grad)}
                      className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center border-2 transition-all transform active:scale-95 ${
                        avatar === grad 
                          ? 'border-slate-800 dark:border-slate-100 scale-105 shadow-md' 
                          : 'border-transparent hover:scale-102 hover:border-slate-400/50'
                      }`}
                    >
                      {avatar === grad && <Check size={14} className="text-white drop-shadow-sm font-black" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase">Full Name</label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="glass-input text-xs py-2.5 focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase">Target Career Role</label>
                  <input
                    type="text"
                    placeholder="e.g. SDE, Front End Architect"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="glass-input text-xs py-2.5 focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase">College / Institution</label>
                  <input
                    type="text"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    className="glass-input text-xs py-2.5 focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase">Branch / Discipline</label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science, Electronics"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="glass-input text-xs py-2.5 focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase">Current CGPA</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    placeholder="e.g. 9.15"
                    value={cgpa}
                    onChange={(e) => setCgpa(e.target.value)}
                    className="glass-input text-xs py-2.5 focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase">Graduation Year</label>
                  <input
                    type="number"
                    value={gradYear}
                    onChange={(e) => setGradYear(e.target.value)}
                    className="glass-input text-xs py-2.5 focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-450 uppercase">Daily Study Time Limit (Hours)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={dailyHours}
                    onChange={(e) => setDailyHours(e.target.value)}
                    className="glass-input text-xs py-2.5 focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={updating}
                  className="bg-primary hover:bg-primary-dark text-white font-bold text-xs px-5 py-3 rounded-xl flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{updating ? 'Saving Changes...' : 'Save Profile Settings'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Resume Upload section */}
          <div className="glass-card p-6 space-y-5">
            <div className="flex items-center gap-2.5 pb-3.5 border-b border-border-light dark:border-border-dark">
              <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                <BookOpen size={16} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">ATS Resume Auditor</h3>
                <p className="text-[10px] text-slate-500 font-medium">Verify your resume score and target improvements</p>
              </div>
            </div>

            {/* Upload form dropzone */}
            {!resumeAnalyzing && !readiness?.resume_ats_score && (
              <div className="border border-dashed border-slate-350 dark:border-slate-750 hover:border-primary/55 rounded-xl p-6 flex flex-col items-center justify-center gap-3 bg-slate-500/5 transition-all relative cursor-pointer group">
                <input
                  type="file"
                  accept=".pdf,.txt"
                  onChange={handleResumeUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud size={30} className="text-slate-400 group-hover:text-primary transition-all duration-300" />
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Drag & drop or Click to upload resume</p>
                  <p className="text-[10px] text-slate-400 mt-1">Supports PDF & TXT formats (Max 5MB)</p>
                </div>
              </div>
            )}

            {/* Loading scan */}
            {resumeAnalyzing && (
              <div className="border border-slate-200 dark:border-slate-800/80 rounded-xl p-8 flex flex-col items-center justify-center gap-4 bg-slate-500/5">
                <div className="w-8.5 h-8.5 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-205">Auditing Resume...</p>
                  <p className="text-[10px] text-slate-405 mt-1">Scanning text structure & parsing keyword alignments</p>
                </div>
              </div>
            )}

            {/* Scan Error */}
            {resumeError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0 animate-bounce" />
                <span>{resumeError}</span>
              </div>
            )}

            {/* Audit Results */}
            {!resumeAnalyzing && readiness?.resume_ats_score !== undefined && readiness.resume_ats_score > 0 && (
              <div className="space-y-4 animate-fade-in">
                
                {/* Visual ATS score gauge */}
                <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-primary animate-pulse" />
                    <div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-350 block">ATS Score</span>
                      <span className="text-[10px] text-slate-400 font-medium">Scanned via Placement AI Engine</span>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span className={`text-2xl font-black ${
                      readiness.resume_ats_score >= 80 ? 'text-emerald-500' :
                      readiness.resume_ats_score >= 50 ? 'text-amber-500' : 'text-rose-500'
                    }`}>
                      {readiness.resume_ats_score}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">/100</span>
                  </div>
                </div>

                {/* Audit details: strengths, improvements, suggestions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {readiness.resume_strengths && readiness.resume_strengths.length > 0 && (
                    <div className="space-y-2 p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl text-xs font-semibold">
                      <span className="text-[9.5px] uppercase tracking-wider text-emerald-500 font-bold">🟢 Strengths</span>
                      <ul className="space-y-1.5">
                        {readiness.resume_strengths.map((s, i) => (
                          <li key={i} className="text-slate-600 dark:text-slate-400 pl-3 relative font-medium leading-relaxed">
                            <span className="absolute left-0 top-2 w-1 h-1 bg-emerald-500 rounded-full" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {readiness.resume_improvements && readiness.resume_improvements.length > 0 && (
                    <div className="space-y-2 p-3 bg-rose-500/5 border border-rose-500/15 rounded-xl text-xs font-semibold">
                      <span className="text-[9.5px] uppercase tracking-wider text-rose-500 font-bold">🔴 Concerns</span>
                      <ul className="space-y-1.5">
                        {readiness.resume_improvements.map((imp, i) => (
                          <li key={i} className="text-slate-600 dark:text-slate-400 pl-3 relative font-medium leading-relaxed">
                            <span className="absolute left-0 top-2 w-1 h-1 bg-rose-500 rounded-full" />
                            {imp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {readiness.resume_suggestions && readiness.resume_suggestions.length > 0 && (
                    <div className="md:col-span-2 space-y-2 p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl text-xs font-semibold">
                      <span className="text-[9.5px] uppercase tracking-wider text-amber-550 font-bold">💡 Recommendations</span>
                      <ul className="space-y-1.5">
                        {readiness.resume_suggestions.map((sug, i) => (
                          <li key={i} className="text-slate-600 dark:text-slate-400 pl-3 relative font-medium leading-relaxed">
                            <span className="absolute left-0 top-2 w-1 h-1 bg-amber-500 rounded-full" />
                            {sug}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Re-upload uploader label */}
                <div className="flex justify-end pt-2">
                  <label className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 text-[10px] font-bold py-2 px-3.5 rounded-xl cursor-pointer transition-all relative">
                    <input
                      type="file"
                      accept=".pdf,.txt"
                      onChange={handleResumeUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    🔄 Update & Re-run ATS Audit
                  </label>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* Right Column: Connect Handles, Platform Stats, streaks */}
        <div className="space-y-8">
          
          {/* Coding handles update */}
          <div className="glass-card p-6 space-y-5">
            <div className="flex items-center gap-2.5 pb-3.5 border-b border-border-light dark:border-border-dark">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <GraduationCap size={16} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Coding Profiles</h3>
                <p className="text-[10px] text-slate-500 font-medium">Link coding platforms to sync solves</p>
              </div>
            </div>

            <form onSubmit={handleSaveHandles} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9.5px] font-bold text-slate-450 uppercase block">LeetCode Username</label>
                <input
                  type="text"
                  placeholder="e.g. user_leetcode"
                  value={leetcode}
                  onChange={(e) => setLeetcode(e.target.value)}
                  className="glass-input text-xs py-2 focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9.5px] font-bold text-slate-455 uppercase block">CodeChef Username</label>
                <input
                  type="text"
                  placeholder="e.g. user_codechef"
                  value={codechef}
                  onChange={(e) => setCodechef(e.target.value)}
                  className="glass-input text-xs py-2 focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={syncingHandles}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
              >
                <RefreshCw size={12} className={syncingHandles ? 'animate-spin' : ''} />
                <span>{syncingHandles ? 'Syncing Profiles...' : 'Sync & Save Handles'}</span>
              </button>
            </form>
          </div>

          {/* Streaks Widget */}
          {progress && (
            <div className="glass-card p-5 border-slate-205 dark:border-slate-800/80 flex items-center justify-between bg-gradient-to-br from-amber-500/5 to-transparent">
              <div className="space-y-1">
                <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Flame size={12} className="text-amber-500 fill-amber-500/10 animate-bounce" /> Current Streak
                </span>
                <h4 className="text-2xl font-black text-slate-800 dark:text-slate-200">{progress.current_streak} days</h4>
                <p className="text-[9.5px] text-slate-500 font-bold uppercase">Longest: {progress.longest_streak} days</p>
              </div>
              <div className="p-3 bg-amber-500/15 rounded-2xl text-amber-500 shadow-inner">
                <Flame size={24} className="fill-amber-500/10" />
              </div>
            </div>
          )}

          {/* Platforms Solved Breakdown */}
          {progress && (
            <div className="glass-card p-6 space-y-6">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">Coding Platform Stats</h4>
              
              {/* LeetCode stats */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-300">LeetCode Solved</span>
                  <span className="text-slate-800 dark:text-slate-200">{leetcodeTotal} total</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-center">
                  <div className="bg-emerald-500/10 text-emerald-500 p-2 rounded-xl">
                    <span className="block text-xs font-black">{progress.leetcode_easy_solved}</span>
                    <span>Easy</span>
                  </div>
                  <div className="bg-primary/10 text-primary p-2 rounded-xl">
                    <span className="block text-xs font-black">{progress.leetcode_medium_solved}</span>
                    <span>Medium</span>
                  </div>
                  <div className="bg-rose-500/10 text-rose-500 p-2 rounded-xl">
                    <span className="block text-xs font-black">{progress.leetcode_hard_solved}</span>
                    <span>Hard</span>
                  </div>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-500 h-full" style={{ width: `${leetcodeTotal ? (progress.leetcode_easy_solved / leetcodeTotal) * 100 : 0}%` }}></div>
                  <div className="bg-primary h-full" style={{ width: `${leetcodeTotal ? (progress.leetcode_medium_solved / leetcodeTotal) * 100 : 0}%` }}></div>
                  <div className="bg-rose-500 h-full" style={{ width: `${leetcodeTotal ? (progress.leetcode_hard_solved / leetcodeTotal) * 100 : 0}%` }}></div>
                </div>
              </div>

              {/* CodeChef stats */}
              <div className="space-y-2 pt-4 border-t border-slate-205/30 dark:border-slate-800/40">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-300">CodeChef Solved</span>
                  <span className="text-slate-800 dark:text-slate-200">{codechefTotal} total</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-center">
                  <div className="bg-emerald-500/10 text-emerald-500 p-2 rounded-xl">
                    <span className="block text-xs font-black">{progress.codechef_easy_solved}</span>
                    <span>Easy</span>
                  </div>
                  <div className="bg-primary/10 text-primary p-2 rounded-xl">
                    <span className="block text-xs font-black">{progress.codechef_medium_solved}</span>
                    <span>Medium</span>
                  </div>
                  <div className="bg-rose-500/10 text-rose-500 p-2 rounded-xl">
                    <span className="block text-xs font-black">{progress.codechef_hard_solved}</span>
                    <span>Hard</span>
                  </div>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-500 h-full" style={{ width: `${codechefTotal ? (progress.codechef_easy_solved / codechefTotal) * 100 : 0}%` }}></div>
                  <div className="bg-primary h-full" style={{ width: `${codechefTotal ? (progress.codechef_medium_solved / codechefTotal) * 100 : 0}%` }}></div>
                  <div className="bg-rose-500 h-full" style={{ width: `${codechefTotal ? (progress.codechef_hard_solved / codechefTotal) * 100 : 0}%` }}></div>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  )
}
export default Profile
