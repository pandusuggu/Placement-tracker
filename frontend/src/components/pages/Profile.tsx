import React, { useState, useEffect } from 'react'
import { 
  GraduationCap, RefreshCw, Save, Flame, Sparkles, 
  UploadCloud, AlertTriangle, BookOpen, Sliders, Award as AwardIcon, Check
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import { DSA_QUESTIONS } from './neetcodeQuestions'
import { BLIND75_QUESTIONS } from './blind75Questions'

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
  weekly_rank?: number | null
  weekly_score?: number
  dsa_progress?: Record<string, string>
  core_subjects_progress?: Record<string, number>
  aptitude_progress?: Record<string, number>
  projects_progress?: Array<{
    name: string
    description?: string
    completion_percentage: number
  }>
}

interface PlacementReadiness {
  score: number
  readiness_level: string
  resume_ats_score?: number
  resume_strengths?: string[]
  resume_improvements?: string[]
  resume_suggestions?: string[]
}

interface ProfileProps {
  viewingUserId?: string | null
  setViewingUserId?: (userId: string | null) => void
}

const AVATAR_GRADIENTS = [
  'from-blue-500 to-indigo-600 shadow-blue',
  'from-purple-500 to-pink-600 shadow-pink',
  'from-emerald-400 to-teal-600 shadow-emerald',
  'from-amber-400 to-rose-600 shadow-amber',
  'from-violet-600 to-purple-800 shadow-indigo',
  'from-slate-700 to-slate-900 shadow-slate',
]

export const Profile: React.FC<ProfileProps> = ({ viewingUserId, setViewingUserId }) => {
  const { user, updateProfile } = useAuthStore()
  const currentUserId = user?.id
  const isReadOnly = !!viewingUserId && viewingUserId !== currentUserId

  const [progress, setProgress] = useState<CodingProgressData | null>(null)
  const [readiness, setReadiness] = useState<PlacementReadiness | null>(null)
  const [viewingUser, setViewingUser] = useState<any>(null)
  const [weeklyRank, setWeeklyRank] = useState<number | null>(null)
  
  // Form states
  const [name, setName] = useState('')
  const [college, setCollege] = useState('')
  const [branch, setBranch] = useState('')
  const [cgpa, setCgpa] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [dailyHours, setDailyHours] = useState('4')
  const [gradYear, setGradYear] = useState('2027')
  const [avatar, setAvatar] = useState(AVATAR_GRADIENTS[0])

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
      if (isReadOnly) {
        const res = await api.get(`/api/auth/profile/${viewingUserId}`)
        setViewingUser(res.data.user)
        setProgress(res.data.progress)
        setReadiness(res.data.readiness)
        setWeeklyRank(res.data.weekly_rank)
      } else {
        const progRes = await api.get('/api/coding/progress')
        setProgress(progRes.data)
        setLeetcode(progRes.data.leetcode_username || '')
        setCodechef(progRes.data.codechef_username || '')
        setWeeklyRank(progRes.data.weekly_rank)

        const readRes = await api.get('/api/placement/readiness')
        setReadiness(readRes.data)

        // Sync local states with current user
        if (user) {
          setName(user.name || '')
          setCollege(user.college || '')
          setBranch(user.branch || '')
          setCgpa(user.cgpa !== undefined && user.cgpa !== null ? String(user.cgpa) : '')
          setTargetRole(user.target_role || '')
          setDailyHours(user.daily_available_hours ? String(user.daily_available_hours) : '4')
          setGradYear(user.graduation_year ? String(user.graduation_year) : '2027')
          setAvatar(user.avatar || AVATAR_GRADIENTS[0])
        }
      }
    } catch (e) {
      console.error('Failed to load profile parameters:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfileData()
  }, [viewingUserId])

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
      setWeeklyRank(progRes.data.weekly_rank)
      
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

  const displayedUser = isReadOnly ? viewingUser : user
  const avatarInitials = (displayedUser?.name?.charAt(0).toUpperCase()) || 'U'
  const userAvatar = displayedUser?.avatar || avatar

  const leetcodeTotal = (progress?.leetcode_easy_solved || 0) + (progress?.leetcode_medium_solved || 0) + (progress?.leetcode_hard_solved || 0)
  const codechefTotal = (progress?.codechef_easy_solved || 0) + (progress?.codechef_medium_solved || 0) + (progress?.codechef_hard_solved || 0)
  
  // Placement Prep Stats calculations
  const neetcodeTotalCount = Object.values(DSA_QUESTIONS).reduce((sum, list) => sum + list.length, 0)
  const dsaProg = progress?.dsa_progress
  const neetcodeSolvedCount = dsaProg 
    ? Object.keys(dsaProg).filter(key => {
        const isCompleted = dsaProg[key] === 'completed'
        if (!isCompleted) return false
        return Object.values(DSA_QUESTIONS).some(list => list.some(q => q.id === key))
      }).length
    : 0

  const blindTotalCount = Object.values(BLIND75_QUESTIONS).reduce((sum, list) => sum + list.length, 0)
  const blindSolvedCount = dsaProg 
    ? Object.keys(dsaProg).filter(key => {
        const isCompleted = dsaProg[key] === 'completed'
        if (!isCompleted) return false
        return Object.values(BLIND75_QUESTIONS).some(list => list.some(q => q.id === key))
      }).length
    : 0

  const avgCoreCS = progress?.core_subjects_progress
    ? (Object.values(progress.core_subjects_progress) as number[]).reduce((a, b) => a + b, 0) / 4
    : 0
  const avgAptitude = progress?.aptitude_progress
    ? (Object.values(progress.aptitude_progress) as number[]).reduce((a, b) => a + b, 0) / 3
    : 0
  
  const dbmsProgress = progress?.core_subjects_progress?.["DBMS"] || 0
  const osProgress = progress?.core_subjects_progress?.["OS"] || 0
  const cnProgress = progress?.core_subjects_progress?.["CN"] || 0
  const oopProgress = progress?.core_subjects_progress?.["OOP"] || 0

  const quantProgress = progress?.aptitude_progress?.["Quantitative Aptitude"] || 0
  const logicalProgress = progress?.aptitude_progress?.["Logical Reasoning"] || 0
  const verbalProgress = progress?.aptitude_progress?.["Verbal Ability"] || 0

  const projectsCount = progress?.projects_progress?.length || 0
  const completedProjectsCount = progress?.projects_progress?.filter((p: any) => p.completion_percentage === 100).length || 0

  return (
    <div className="flex-1 p-4 md:p-8 space-y-8 max-w-6xl mx-auto w-full min-h-screen">
      
      {/* Go Back button (Public profile view mode only) */}
      {isReadOnly && (
        <div className="flex justify-between items-center bg-slate-500/5 p-3 rounded-2xl border border-slate-200/30 dark:border-slate-800/40">
          <button
            onClick={() => setViewingUserId?.(null)}
            className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-350 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 font-bold px-4 py-2 rounded-xl text-xs transition-all active:scale-95"
          >
            ← Back to Leaderboard
          </button>
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-black">
            Public Member Profile View
          </span>
        </div>
      )}

      {/* Profile Banner / Header */}
      <div className="glass-card p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 relative overflow-hidden bg-gradient-to-r from-primary/5 via-violet-500/5 to-transparent">
        <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          {/* Avatar frame */}
          <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${userAvatar} flex items-center justify-center text-white text-4xl font-extrabold select-none shadow-lg transform hover:scale-[1.03] transition-all duration-300`}>
            {avatarInitials}
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">{displayedUser?.name}</h1>
            <p className="text-xs text-slate-500 font-semibold">{displayedUser?.email}</p>
            
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-4">
              {displayedUser?.target_role && (
                <span className="text-[10px] bg-primary/10 text-primary px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                  🎯 {displayedUser.target_role}
                </span>
              )}
              {displayedUser?.college && (
                <span className="text-[10px] bg-violet-500/10 text-violet-500 dark:text-violet-400 px-3 py-1 rounded-full font-bold">
                  🏫 {displayedUser.college}
                </span>
              )}
              {displayedUser?.cgpa && (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full font-bold">
                  🏆 CGPA: {displayedUser.cgpa}
                </span>
              )}
              {weeklyRank && (
                <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                  🏅 Leaderboard Rank: #{weeklyRank}
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

      {/* Placement Preparation Metrics */}
      <div className="glass-card p-6 space-y-6 bg-gradient-to-r from-violet-500/5 via-primary/5 to-transparent">
        <div className="flex items-center gap-2.5 pb-3.5 border-b border-border-light dark:border-border-dark">
          <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Placement Preparation Statistics</h3>
            <p className="text-[10px] text-slate-500 font-medium">Progress across DSA roadmaps, theoretical CS, and aptitude</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* NeetCode 150 widget */}
          <div className="p-4 bg-slate-500/5 rounded-2xl border border-slate-200/40 dark:border-slate-850 space-y-2 relative overflow-hidden">
            <span className="text-[9.5px] uppercase tracking-wider text-slate-400 font-extrabold">NeetCode 150 DSA</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-slate-800 dark:text-slate-100">{neetcodeSolvedCount}</span>
              <span className="text-xs text-slate-400 font-bold">/ {neetcodeTotalCount} solved</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary h-full transition-all duration-500" style={{ width: `${neetcodeTotalCount ? (neetcodeSolvedCount / neetcodeTotalCount) * 100 : 0}%` }}></div>
            </div>
          </div>

          {/* Blind 75 widget */}
          <div className="p-4 bg-slate-500/5 rounded-2xl border border-slate-200/40 dark:border-slate-850 space-y-2 relative overflow-hidden">
            <span className="text-[9.5px] uppercase tracking-wider text-slate-400 font-extrabold">Blind 75 DSA</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-slate-800 dark:text-slate-100">{blindSolvedCount}</span>
              <span className="text-xs text-slate-400 font-bold">/ {blindTotalCount} solved</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${blindTotalCount ? (blindSolvedCount / blindTotalCount) * 100 : 0}%` }}></div>
            </div>
          </div>

          {/* Theoretical CS widget */}
          <div className="p-4 bg-slate-500/5 rounded-2xl border border-slate-200/40 dark:border-slate-850 space-y-2 relative overflow-hidden">
            <span className="text-[9.5px] uppercase tracking-wider text-slate-400 font-extrabold">Core CS Subjects</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-slate-800 dark:text-slate-100">{Math.round(avgCoreCS)}%</span>
              <span className="text-xs text-slate-400 font-bold">average progress</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden">
              <div className="bg-violet-500 h-full transition-all duration-500" style={{ width: `${avgCoreCS}%` }}></div>
            </div>
          </div>

          {/* Aptitude Prep widget */}
          <div className="p-4 bg-slate-500/5 rounded-2xl border border-slate-200/40 dark:border-slate-850 space-y-2 relative overflow-hidden">
            <span className="text-[9.5px] uppercase tracking-wider text-slate-400 font-extrabold">Aptitude & Reasoning</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-slate-800 dark:text-slate-100">{Math.round(avgAptitude)}%</span>
              <span className="text-xs text-slate-400 font-bold">average progress</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${avgAptitude}%` }}></div>
            </div>
          </div>
        </div>

        {/* Detailed breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Core subjects details */}
          <div className="p-4 bg-slate-500/5 rounded-2xl border border-slate-200/40 dark:border-slate-850 space-y-3">
            <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">CS Core Subject Progress</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex justify-between items-center bg-slate-100/50 dark:bg-slate-900/50 p-2.5 rounded-xl">
                <span className="text-slate-500 dark:text-slate-400 font-bold">DBMS</span>
                <span className="font-black text-slate-800 dark:text-slate-200">{dbmsProgress}%</span>
              </div>
              <div className="flex justify-between items-center bg-slate-100/50 dark:bg-slate-900/50 p-2.5 rounded-xl">
                <span className="text-slate-500 dark:text-slate-400 font-bold">OS</span>
                <span className="font-black text-slate-800 dark:text-slate-200">{osProgress}%</span>
              </div>
              <div className="flex justify-between items-center bg-slate-100/50 dark:bg-slate-900/50 p-2.5 rounded-xl">
                <span className="text-slate-500 dark:text-slate-400 font-bold">CN</span>
                <span className="font-black text-slate-800 dark:text-slate-200">{cnProgress}%</span>
              </div>
              <div className="flex justify-between items-center bg-slate-100/50 dark:bg-slate-900/50 p-2.5 rounded-xl">
                <span className="text-slate-500 dark:text-slate-400 font-bold">OOP</span>
                <span className="font-black text-slate-800 dark:text-slate-200">{oopProgress}%</span>
              </div>
            </div>
          </div>

          {/* Aptitude & Projects details */}
          <div className="p-4 bg-slate-500/5 rounded-2xl border border-slate-200/40 dark:border-slate-850 space-y-3">
            <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Aptitude & Portfolio Stats</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex justify-between items-center bg-slate-100/50 dark:bg-slate-900/50 p-2.5 rounded-xl">
                <span className="text-slate-500 dark:text-slate-400 font-bold">Quant Prep</span>
                <span className="font-black text-slate-800 dark:text-slate-200">{quantProgress}%</span>
              </div>
              <div className="flex justify-between items-center bg-slate-100/50 dark:bg-slate-900/50 p-2.5 rounded-xl">
                <span className="text-slate-500 dark:text-slate-400 font-bold">Logical Prep</span>
                <span className="font-black text-slate-800 dark:text-slate-200">{logicalProgress}%</span>
              </div>
              <div className="flex justify-between items-center bg-slate-100/50 dark:bg-slate-900/50 p-2.5 rounded-xl">
                <span className="text-slate-500 dark:text-slate-400 font-bold">Verbal Prep</span>
                <span className="font-black text-slate-800 dark:text-slate-200">{verbalProgress}%</span>
              </div>
              <div className="flex justify-between items-center bg-slate-100/50 dark:bg-slate-900/50 p-2.5 rounded-xl">
                <span className="text-slate-500 dark:text-slate-400 font-bold">Projects Done</span>
                <span className="font-black text-slate-800 dark:text-slate-200">{completedProjectsCount} / {projectsCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Settings Edit, Connect Accounts, Platform Solved Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (Col span 2): Account Settings & Resume auditor */}
        <div className="lg:col-span-2 space-y-8">
          
          {isReadOnly ? (
            /* Public viewing profile details card */
            <div className="glass-card p-6 space-y-6">
              <div className="flex items-center gap-2.5 pb-3.5 border-b border-border-light dark:border-border-dark">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Sliders size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Academic & Profile Details</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Member's academic background and study settings</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                <div className="p-3.5 bg-slate-500/5 rounded-2xl space-y-1">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Full Name</span>
                  <p className="text-slate-800 dark:text-slate-200 font-black text-sm">{displayedUser?.name || 'N/A'}</p>
                </div>
                <div className="p-3.5 bg-slate-500/5 rounded-2xl space-y-1">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Target Career Role</span>
                  <p className="text-slate-800 dark:text-slate-200 font-black text-sm">{displayedUser?.target_role || 'Software Engineer'}</p>
                </div>
                <div className="p-3.5 bg-slate-500/5 rounded-2xl space-y-1">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">College / Institution</span>
                  <p className="text-slate-800 dark:text-slate-200 font-black text-sm">{displayedUser?.college || 'N/A'}</p>
                </div>
                <div className="p-3.5 bg-slate-500/5 rounded-2xl space-y-1">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Branch / Discipline</span>
                  <p className="text-slate-800 dark:text-slate-200 font-black text-sm">{displayedUser?.branch || 'N/A'}</p>
                </div>
                <div className="p-3.5 bg-slate-500/5 rounded-2xl space-y-1">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Current CGPA</span>
                  <p className="text-slate-800 dark:text-slate-200 font-black text-sm">{displayedUser?.cgpa !== undefined && displayedUser?.cgpa !== null ? displayedUser.cgpa : 'N/A'}</p>
                </div>
                <div className="p-3.5 bg-slate-500/5 rounded-2xl space-y-1">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Graduation Year</span>
                  <p className="text-slate-800 dark:text-slate-200 font-black text-sm">{displayedUser?.graduation_year || 'N/A'}</p>
                </div>
                <div className="col-span-1 md:col-span-2 p-3.5 bg-slate-500/5 rounded-2xl space-y-1">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Daily Available Study Time Limit</span>
                  <p className="text-slate-800 dark:text-slate-200 font-black text-sm">{displayedUser?.daily_available_hours || '4.0'} Hours / Day</p>
                </div>
              </div>
            </div>
          ) : (
            /* Editable Account Settings Form */
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
                    <label className="text-[10px] font-bold text-slate-455 uppercase">Graduation Year</label>
                    <input
                      type="number"
                      value={gradYear}
                      onChange={(e) => setGradYear(e.target.value)}
                      className="glass-input text-xs py-2.5 focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-455 uppercase">Daily Study Time Limit (Hours)</label>
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
          )}

          {/* Resume Auditor Section */}
          <div className="glass-card p-6 space-y-5">
            <div className="flex items-center gap-2.5 pb-3.5 border-b border-border-light dark:border-border-dark">
              <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                <BookOpen size={16} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">ATS Resume Auditor</h3>
                <p className="text-[10px] text-slate-500 font-medium">Verify resume score and target improvements</p>
              </div>
            </div>

            {isReadOnly ? (
              /* Public read-only resume details */
              readiness?.resume_ats_score !== undefined && readiness.resume_ats_score > 0 ? (
                <div className="space-y-4">
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
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 bg-slate-500/5 rounded-2xl border border-dashed border-slate-200/40 dark:border-slate-800/60 py-12 text-slate-500">
                  <AlertTriangle size={28} className="text-slate-400 animate-pulse" />
                  <p className="text-xs font-extrabold mt-3 text-slate-700 dark:text-slate-350">No resume analyzed</p>
                  <p className="text-[10px] text-slate-400 mt-1">This user has not scanned an ATS resume yet.</p>
                </div>
              )
            ) : (
              /* Editable Resume Uploader & Results */
              <>
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

                {resumeAnalyzing && (
                  <div className="border border-slate-200 dark:border-slate-800/80 rounded-xl p-8 flex flex-col items-center justify-center gap-4 bg-slate-500/5">
                    <div className="w-8.5 h-8.5 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-205">Auditing Resume...</p>
                      <p className="text-[10px] text-slate-405 mt-1">Scanning text structure & parsing keyword alignments</p>
                    </div>
                  </div>
                )}

                {resumeError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle size={14} className="shrink-0 animate-bounce" />
                    <span>{resumeError}</span>
                  </div>
                )}

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
              </>
            )}
          </div>
        </div>

        {/* Right Column: Connect Handles, Platform Stats, streaks */}
        <div className="space-y-8">
          
          {isReadOnly ? (
            /* Linked handles read-only card */
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3.5 border-b border-border-light dark:border-border-dark">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <GraduationCap size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Connected Handles</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Synced handles on competitive platforms</p>
                </div>
              </div>

              <div className="space-y-3 font-semibold text-xs">
                <div className="flex justify-between items-center bg-slate-550/5 p-3.5 rounded-2xl border border-slate-200/30 dark:border-slate-850">
                  <span className="text-slate-500 font-bold block">LeetCode Handle</span>
                  <span className="font-black text-slate-800 dark:text-slate-200">{progress?.leetcode_username || 'Not connected'}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-550/5 p-3.5 rounded-2xl border border-slate-200/30 dark:border-slate-850">
                  <span className="text-slate-500 font-bold block">CodeChef Handle</span>
                  <span className="font-black text-slate-800 dark:text-slate-200">{progress?.codechef_username || 'Not connected'}</span>
                </div>
              </div>
            </div>
          ) : (
            /* Connect handles update form */
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
          )}

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
