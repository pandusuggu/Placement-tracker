import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import {
  Brain, GraduationCap, Target, Code2, Sparkles, User,
  X, LogOut, ChevronRight, ChevronLeft, Check, Compass
} from 'lucide-react'

// Gradient presets for avatar fallback
const AVATAR_GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-emerald-400 to-teal-600',
  'from-violet-500 to-purple-600',
  'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-500',
  'from-fuchsia-500 to-pink-700'
]

const TARGET_ROLES = [
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Mobile Engineer (iOS/Android)',
  'Data Scientist / AI Engineer',
  'DevOps Engineer',
  'QA / Test Engineer'
]

const DEFAULT_TOPICS = ['Arrays', 'Strings', 'Trees', 'Graphs', 'DBMS', 'Operating Systems', 'Computer Networks', 'OOP']

export const Onboarding: React.FC = () => {
  const { user, updateProfile, logout } = useAuthStore()
  
  // Step state (1 to 4)
  const [step, setStep] = useState(1)

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingText, setLoadingText] = useState('Syncing profile preferences...')

  // Step 1: Profile & College Setup
  const [name, setName] = useState(user?.name || '')
  const [college, setCollege] = useState(user?.college || '')
  const [branch, setBranch] = useState(user?.branch || '')
  const [cgpa, setCgpa] = useState<string>(user?.cgpa ? String(user.cgpa) : '')
  const [gradYear, setGradYear] = useState<string>(user?.graduation_year ? String(user.graduation_year) : '2026')
  const [avatar, setAvatar] = useState(user?.avatar || '')

  // Step 2: Placement Targets
  const [targetRole, setTargetRole] = useState(user?.target_role || 'Software Engineer')
  const [dailyHours, setDailyHours] = useState<number>(user?.daily_available_hours || 4)
  const [targetCompanies, setTargetCompanies] = useState<string[]>([])
  const [companyInput, setCompanyInput] = useState('')

  // Step 3: Coding Handles
  const [leetcodeUser, setLeetcodeUser] = useState('')
  const [gfgUser, setGfgUser] = useState('')
  const [codechefUser, setCodechefUser] = useState('')
  const [hackerrankUser, setHackerrankUser] = useState('')

  // Step 4: AI Pre-generation Settings
  const [skillLevel, setSkillLevel] = useState('intermediate')
  const [selectedTopics, setSelectedTopics] = useState<string[]>(DEFAULT_TOPICS)
  const [customTopicInput, setCustomTopicInput] = useState('')

  // Handle Loading Text rotation during AI generation
  useEffect(() => {
    if (!isSubmitting) return

    const messages = [
      'Saving onboarding profile variables...',
      'Configuring GeeksforGeeks, LeetCode, and CodeChef endpoints...',
      'Initializing student dashboard metrics...',
      'Calling AI planner engine (Gemini API)...',
      'Tailoring your study checklists...',
      'Generating tomorrow\'s time-block optimization plan...',
      'Constructing weekly milestones...',
      'Finalizing CodePilot workspace...'
    ]

    let idx = 0
    const interval = setInterval(() => {
      idx = (idx + 1) % messages.length
      setLoadingText(messages[idx])
    }, 2800)

    return () => clearInterval(interval)
  }, [isSubmitting])

  // File Upload to base64 converter
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      alert('Avatar size must be under 2MB!')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatar(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Handle adding custom company tags
  const handleAddCompany = () => {
    if (companyInput.trim() && !targetCompanies.includes(companyInput.trim())) {
      setTargetCompanies([...targetCompanies, companyInput.trim()])
      setCompanyInput('')
    }
  }

  const handleRemoveCompany = (c: string) => {
    setTargetCompanies(targetCompanies.filter(item => item !== c))
  }

  // Handle adding custom topic tags for AI Planner
  const handleAddTopic = () => {
    if (customTopicInput.trim() && !selectedTopics.includes(customTopicInput.trim())) {
      setSelectedTopics([...selectedTopics, customTopicInput.trim()])
      setCustomTopicInput('')
    }
  }

  const handleRemoveTopic = (t: string) => {
    setSelectedTopics(selectedTopics.filter(item => item !== t))
  }

  // Submit onboarding details and trigger AI Study Planner
  const handleCompleteOnboarding = async () => {
    setIsSubmitting(true)
    try {
      // 1. Submit onboarding profile endpoints
      const onboardPayload = {
        college: college || null,
        branch: branch || null,
        cgpa: cgpa ? parseFloat(cgpa) : null,
        graduation_year: gradYear ? parseInt(gradYear) : null,
        target_role: targetRole,
        daily_available_hours: dailyHours,
        leetcode_username: leetcodeUser || null,
        gfg_username: gfgUser || null,
        codechef_username: codechefUser || null,
        hackerrank_username: hackerrankUser || null,
        avatar: avatar || null
      }

      const onboardRes = await api.put('/api/auth/onboard', onboardPayload)

      // 2. Trigger AI Study Planner roadmap creation
      await api.post('/api/study-planner', {
        target_role: targetRole,
        daily_available_hours: dailyHours,
        skill_level: skillLevel,
        topics_to_learn: selectedTopics
      })

      // 3. Update Auth Store user profile in local storage
      updateProfile(onboardRes.data.user)

    } catch (err: any) {
      console.error(err)
      alert(err.response?.data?.detail || 'Onboarding failed during generation. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-200 transition-colors duration-300 flex flex-col justify-between p-4 md:p-8">
      {/* Top Header */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-3 border-b border-border-light dark:border-border-dark shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-md">
            <Brain size={18} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight flex items-center gap-1.5 font-sans">
              Placement Tracker and Productivity Planner
              <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Setup
              </span>
            </h1>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-xs font-bold text-slate-500 hover:text-rose-500 transition-all"
        >
          <LogOut size={12} />
          <span>Exit Setup</span>
        </button>
      </header>

      {/* Main Form Box */}
      <main className="flex-1 flex items-center justify-center py-8">
        {isSubmitting ? (
          /* Loading Animation Block */
          <div className="glass-card max-w-md w-full p-8 text-center flex flex-col items-center justify-center space-y-6 animate-fade-in-up">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
              <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-primary">
                <Sparkles size={26} className="animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100">Building Workstation</h3>
              <p className="text-xs text-slate-500 font-semibold px-4 animate-pulse">{loadingText}</p>
            </div>
          </div>
        ) : (
          /* Wizard Main Container */
          <div className="glass-card max-w-2xl w-full p-6 md:p-8 flex flex-col justify-between shadow-xl animate-fade-in-up">
            
            {/* Step Indicators */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-border-light dark:border-border-dark">
              {[
                { s: 1, label: 'Profile', icon: <User size={12} /> },
                { s: 2, label: 'Targets', icon: <Target size={12} /> },
                { s: 3, label: 'Platforms', icon: <Code2 size={12} /> },
                { s: 4, label: 'AI Build', icon: <Sparkles size={12} /> }
              ].map(indicator => (
                <div key={indicator.s} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] transition-all duration-300 ${
                    step === indicator.s
                      ? 'bg-primary text-white scale-110 shadow-md shadow-primary/25'
                      : step > indicator.s
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                  }`}>
                    {step > indicator.s ? <Check size={10} strokeWidth={3} /> : indicator.icon}
                  </div>
                  <span className={`text-[10px] font-bold hidden sm:inline ${
                    step === indicator.s ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'
                  }`}>
                    {indicator.label}
                  </span>
                  {indicator.s < 4 && (
                    <div className="w-8 md:w-16 h-[1.5px] bg-slate-200 dark:bg-slate-800 rounded mx-1" />
                  )}
                </div>
              ))}
            </div>

            {/* Step Contents */}
            <div className="flex-1 min-h-[320px]">
              
              {/* STEP 1: Profile & College Setup */}
              {step === 1 && (
                <div className="space-y-5 animate-fade-in">
                  <div>
                    <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <GraduationCap className="text-primary" size={20} />
                      Academic & Profile Settings
                    </h2>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">Introduce yourself and verify your college credentials.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-6 pb-2">
                    {/* Avatar preview and selectors */}
                    <div className="shrink-0 flex flex-col items-center gap-2">
                      <div className={`w-20 h-20 rounded-3xl bg-gradient-to-tr flex items-center justify-center text-white text-2xl font-black shadow-lg overflow-hidden border-2 border-white dark:border-slate-800`}>
                        {avatar ? (
                          <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          name ? name.charAt(0).toUpperCase() : 'C'
                        )}
                      </div>
                      <label className="text-[10px] text-primary hover:underline font-bold cursor-pointer">
                        Upload custom
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                    </div>

                    <div className="flex-1 w-full space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Select Preset Avatars</label>
                      <div className="flex flex-wrap gap-2">
                        {AVATAR_GRADIENTS.map((grad, index) => {
                          const base64AvatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=preset_${index}`
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => setAvatar(base64AvatarUrl)}
                              className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${grad} hover:scale-105 transition-all border border-slate-200/50 dark:border-slate-800 ${
                                avatar === base64AvatarUrl ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-900' : ''
                              }`}
                            />
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-500">
                    <div className="space-y-1">
                      <label>Full Name</label>
                      <input
                        required
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="glass-input text-xs py-2"
                      />
                    </div>
                    <div className="space-y-1">
                      <label>College Name</label>
                      <input
                        required
                        type="text"
                        placeholder="National Institute of Technology"
                        value={college}
                        onChange={(e) => setCollege(e.target.value)}
                        className="glass-input text-xs py-2"
                      />
                    </div>
                    <div className="space-y-1">
                      <label>Branch / Specialization</label>
                      <input
                        required
                        type="text"
                        placeholder="Computer Science & Engineering"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        className="glass-input text-xs py-2"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label>CGPA</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="10"
                          placeholder="e.g. 8.45"
                          value={cgpa}
                          onChange={(e) => setCgpa(e.target.value)}
                          className="glass-input text-xs py-2"
                        />
                      </div>
                      <div className="space-y-1">
                        <label>Graduation Year</label>
                        <select
                          value={gradYear}
                          onChange={(e) => setGradYear(e.target.value)}
                          className="glass-input text-xs py-2 appearance-none"
                        >
                          <option value="2025">2025</option>
                          <option value="2026">2026</option>
                          <option value="2027">2027</option>
                          <option value="2028">2028</option>
                          <option value="2029">2029</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Career Targets & Objectives */}
              {step === 2 && (
                <div className="space-y-5 animate-fade-in">
                  <div>
                    <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Target className="text-primary" size={20} />
                      Career Path Targets
                    </h2>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">Calibrate the AI Planner metrics according to your targets.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs font-semibold text-slate-500">
                    <div className="space-y-1.5">
                      <label>Target Placement Role</label>
                      <select
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        className="glass-input text-xs py-2 appearance-none font-medium"
                      >
                        {TARGET_ROLES.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex justify-between items-center">
                        <span>Daily Available Study Time</span>
                        <span className="text-primary font-bold">{dailyHours} Hours</span>
                      </label>
                      <div className="flex items-center gap-3 pt-1">
                        <input
                          type="range"
                          min="1"
                          max="12"
                          value={dailyHours}
                          onChange={(e) => setDailyHours(parseInt(e.target.value))}
                          className="flex-1 accent-primary h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Target Companies Tag Container */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <label>Dream Companies / Tiers</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. Google, Amazon, Razorpay"
                          value={companyInput}
                          onChange={(e) => setCompanyInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCompany())}
                          className="glass-input text-xs py-2"
                        />
                        <button
                          type="button"
                          onClick={handleAddCompany}
                          className="px-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 font-bold"
                        >
                          Add
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {targetCompanies.map(c => (
                          <span
                            key={c}
                            className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 rounded-full text-[10px] font-bold"
                          >
                            <span>{c}</span>
                            <button type="button" onClick={() => handleRemoveCompany(c)} className="text-primary hover:text-red-500 font-bold">
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                        {targetCompanies.length === 0 && (
                          <p className="text-[10px] text-slate-400 font-semibold italic">No companies added yet. Press Enter or click Add.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Coding Platform Sync */}
              {step === 3 && (
                <div className="space-y-5 animate-fade-in">
                  <div>
                    <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Code2 className="text-primary" size={20} />
                      Sync Coding Profiles (Optional)
                    </h2>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">Link your coding profile handles to sync solved stats instantly.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-500">
                    <div className="space-y-1">
                      <label>LeetCode Username</label>
                      <input
                        type="text"
                        placeholder="leetcode_id"
                        value={leetcodeUser}
                        onChange={(e) => setLeetcodeUser(e.target.value)}
                        className="glass-input text-xs py-2"
                      />
                    </div>
                    <div className="space-y-1">
                      <label>GeeksforGeeks Username</label>
                      <input
                        type="text"
                        placeholder="gfg_id"
                        value={gfgUser}
                        onChange={(e) => setGfgUser(e.target.value)}
                        className="glass-input text-xs py-2"
                      />
                    </div>
                    <div className="space-y-1">
                      <label>CodeChef Username</label>
                      <input
                        type="text"
                        placeholder="codechef_id"
                        value={codechefUser}
                        onChange={(e) => setCodechefUser(e.target.value)}
                        className="glass-input text-xs py-2"
                      />
                    </div>
                    <div className="space-y-1">
                      <label>HackerRank Username</label>
                      <input
                        type="text"
                        placeholder="hackerrank_id"
                        value={hackerrankUser}
                        onChange={(e) => setHackerrankUser(e.target.value)}
                        className="glass-input text-xs py-2"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-850 rounded-2xl flex items-start gap-2 text-[10.5px] text-slate-500 leading-relaxed font-semibold">
                    <Sparkles size={16} className="text-primary shrink-0 animate-bounce mt-0.5" />
                    <span>You can add or modify usernames at any point inside your Profile page. We query platform APIs daily to keep your streaks and dashboard graphs updated.</span>
                  </div>
                </div>
              )}

              {/* STEP 4: AI Study Planner Setups */}
              {step === 4 && (
                <div className="space-y-5 animate-fade-in">
                  <div>
                    <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Sparkles className="text-violet-500 animate-pulse" size={20} />
                      AI Roadmap Builder Settings
                    </h2>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">Finalize topics to pre-generate your personalized career workspace.</p>
                  </div>

                  <div className="space-y-4 text-xs font-semibold text-slate-500">
                    <div className="space-y-1.5">
                      <label>Your DSA Skill Level</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { val: 'beginner', label: 'Beginner', desc: 'No/little experience' },
                          { val: 'intermediate', label: 'Intermediate', desc: 'Solved 50+ DSA problems' },
                          { val: 'advanced', label: 'Advanced', desc: 'Proficient in patterns' }
                        ].map(level => (
                          <button
                            key={level.val}
                            type="button"
                            onClick={() => setSkillLevel(level.val)}
                            className={`p-3 rounded-xl border text-center transition-all flex flex-col justify-center items-center gap-0.5 cursor-pointer ${
                              skillLevel === level.val
                                ? 'bg-primary/5 border-primary text-slate-800 dark:text-slate-100 ring-1 ring-primary'
                                : 'bg-slate-100/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-900'
                            }`}
                          >
                            <span className="font-extrabold">{level.label}</span>
                            <span className="text-[8px] text-slate-400 font-semibold hidden md:inline">{level.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Topics Tag Creator */}
                    <div className="space-y-1.5">
                      <label>Topics to Include in AI Plan</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. Trees, Dynamic Programming, DBMS"
                          value={customTopicInput}
                          onChange={(e) => setCustomTopicInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTopic())}
                          className="glass-input text-xs py-2"
                        />
                        <button
                          type="button"
                          onClick={handleAddTopic}
                          className="px-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 font-bold"
                        >
                          Add
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {selectedTopics.map(t => (
                          <span
                            key={t}
                            className="flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/20 text-violet-500 px-2.5 py-1 rounded-full text-[10px] font-bold"
                          >
                            <span>{t}</span>
                            <button type="button" onClick={() => handleRemoveTopic(t)} className="text-violet-500 hover:text-red-500 font-bold">
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                        {selectedTopics.length === 0 && (
                          <p className="text-[10px] text-slate-400 font-semibold italic">Please add at least one topic to learn!</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-border-light dark:border-border-dark mt-6">
              <button
                type="button"
                onClick={() => setStep(prev => prev - 1)}
                disabled={step === 1}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft size={14} />
                <span>Back</span>
              </button>

              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 1 && (!name.trim() || !college.trim() || !branch.trim())) {
                      alert('Please fill in your name, college, and branch details before proceeding.')
                      return
                    }
                    setStep(prev => prev + 1)
                  }}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  <span>Continue</span>
                  <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCompleteOnboarding}
                  disabled={selectedTopics.length === 0}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent-violet text-white text-xs font-bold shadow-md shadow-primary/25 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <Compass size={14} />
                  <span>Launch Workspace 🚀</span>
                </button>
              )}
            </div>

          </div>
        )}
      </main>

      {/* Footer copyright */}
      <footer className="max-w-6xl w-full mx-auto text-center text-[10px] text-slate-400 font-semibold py-3 border-t border-border-light dark:border-border-dark shrink-0">
        &copy; {new Date().getFullYear()} Placement Tracker and Productivity Planner. Built for premium career placement and preparation insights.
      </footer>
    </div>
  )
}
