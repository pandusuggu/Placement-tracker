import React, { useState } from 'react'
import { Mail, Lock, User, AlertCircle, CheckCircle, Building, GraduationCap } from 'lucide-react'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'

export const Auth: React.FC = () => {
  const { setAuth } = useAuthStore()
  const [isLogin, setIsLogin] = useState(true)
  const [isForgot, setIsForgot] = useState(false)
  const [isAdminMode, setIsAdminMode] = useState(false)
  
  // Form values
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [adminPasscode, setAdminPasscode] = useState('')
  const [college, setCollege] = useState('')
  const [branch, setBranch] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)

    try {
      if (isForgot) {
        const res = await api.post('/api/auth/forgot-password', { email })
        setSuccessMsg(res.data.message)
      } else if (isLogin) {
        const res = await api.post('/api/auth/login', { email, password })
        if (isAdminMode && res.data.user.role !== 'admin') {
          setError('This portal is restricted to Placement Admins only.')
          setLoading(false)
          return
        }
        setAuth(res.data.access_token, res.data.user)
      } else {
        const payload: any = {
          name,
          email,
          password,
          role: isAdminMode ? 'admin' : 'user',
          college: college || undefined,
          branch: branch || undefined
        }
        if (isAdminMode) {
          payload.admin_passcode = adminPasscode
        }
        const res = await api.post('/api/auth/register', payload)
        setAuth(res.data.access_token, res.data.user)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed. Please verify credentials.')
    } finally {
      setLoading(false)
    }
  }

  // Google Sign-In Simulator
  const handleGoogleLoginSimulate = async () => {
    setLoading(true)
    setError('')
    try {
      const mockGoogleToken = 'google_oauth_token_simulated_2026'
      const simulatedEmail = email || 'student.engineer@university.edu'
      const simulatedName = name || 'Aspiring Dev'
      
      const res = await api.post('/api/auth/google', {
        token: mockGoogleToken,
        email: simulatedEmail,
        name: simulatedName,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${simulatedName}`
      })
      
      if (isAdminMode && res.data.user.role !== 'admin') {
        setError('This portal is restricted to Placement Admins only.')
        setLoading(false)
        return
      }
      
      setAuth(res.data.access_token, res.data.user)
    } catch (err: any) {
      setError('Google Sign-In simulation failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background-light dark:bg-background-dark p-6 relative overflow-hidden font-sans">
      
      {/* Decorative backdrop shapes */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-accent-violet/10 blur-[120px] pointer-events-none"></div>
 
      <div className="w-full max-w-md animate-fade-in-up">
        {/* Core Header logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl shadow-blue mb-4">
            P
          </div>
          <h1 className="font-extrabold text-xl tracking-tight text-slate-800 dark:text-slate-100 text-center">
            Welcome to Placement Tracker & Productivity Planner
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 text-center px-4">
            AI-powered productivity, routines, habit scheduler, and placement prep coach.
          </p>
        </div>
 
        {/* Auth form card container */}
        <div className="glass-card p-8">
          <h2 className="font-extrabold text-lg text-slate-800 dark:text-slate-200 mb-6">
            {isForgot
              ? 'Reset Password'
              : isAdminMode
              ? isLogin
                ? 'Placement Admin Sign In'
                : 'Create Placement Admin Account'
              : isLogin
              ? 'Sign In to Account'
              : 'Create Your Account'}
          </h2>
 
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            
            {/* Error notifications */}
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
 
            {/* Success notifications */}
            {successMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle size={16} />
                <span>{successMsg}</span>
              </div>
            )}
 
            {/* Register: Name Input */}
            {!isLogin && !isForgot && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    required
                    type="text"
                    placeholder="Enter name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="glass-input pl-10"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>
            )}

            {/* Register: College and Branch Inputs */}
            {!isLogin && !isForgot && (
              <>
                <div className="space-y-1.5 animate-fade-in-up">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">College Name</label>
                  <div className="relative">
                    <Building size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      required={!isAdminMode}
                      type="text"
                      placeholder="e.g. State University"
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      className="glass-input pl-10"
                      style={{ paddingLeft: '2.5rem' }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 animate-fade-in-up">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Branch / Department</label>
                  <div className="relative">
                    <GraduationCap size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      required={!isAdminMode}
                      type="text"
                      placeholder="e.g. Computer Science"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="glass-input pl-10"
                      style={{ paddingLeft: '2.5rem' }}
                    />
                  </div>
                </div>
              </>
            )}
 
            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  type="email"
                  placeholder="name@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input pl-10"
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>
 
            {/* Password Input */}
            {!isForgot && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Password</label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => setIsForgot(true)}
                      className="text-xs text-primary hover:underline font-semibold"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    required
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="glass-input pl-10"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>
            )}

            {/* Admin: Passcode Input */}
            {isAdminMode && !isLogin && !isForgot && (
              <div className="space-y-1.5 animate-fade-in-up">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Admin Registration Passcode</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    required
                    type="password"
                    placeholder="Enter admin security key"
                    value={adminPasscode}
                    onChange={(e) => setAdminPasscode(e.target.value)}
                    className="glass-input pl-10"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>
            )}
 
            {/* Submit Actions */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl transition-all shadow-blue active:scale-[0.98] disabled:opacity-50 text-sm flex items-center justify-center"
            >
              {loading ? 'Processing...' : isForgot ? 'Request Reset Link' : isLogin ? (isAdminMode ? 'Sign In as Admin' : 'Sign In') : (isAdminMode ? 'Register Admin' : 'Create Account')}
            </button>
          </form>
 
          {/* Social Sign-In buttons */}
          {!isForgot && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-[1px] bg-slate-200 dark:bg-slate-800"></div>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase">Or continue with</span>
                <div className="flex-1 h-[1px] bg-slate-200 dark:bg-slate-800"></div>
              </div>
 
              <button
                onClick={handleGoogleLoginSimulate}
                className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-350 hover:text-slate-900 dark:hover:text-slate-100 transition-all text-sm font-semibold shadow-sm"
              >
                {/* Standard Google vector logo */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.48 14.98 1 12 1 7.24 1 3.2 3.73 1.24 7.68l3.87 3a7 7 0 0 1 6.89-5.64z"/>
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3.01h3.87c2.26-2.08 3.55-5.14 3.55-8.88z"/>
                  <path fill="#FBBC05" d="M5.11 10.68a6.97 6.97 0 0 1 0-4.36L1.24 3.32a11.96 11.96 0 0 0 0 10.36l3.87-3z"/>
                  <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.87-3c-1.1.74-2.5 1.18-4.09 1.18a7 7 0 0 1-6.89-5.64l-3.87 3A11.97 11.97 0 0 0 12 23z"/>
                </svg>
                <span>Google OAuth Login</span>
              </button>
            </div>
          )}
 
          {/* Subtext toggles */}
          <div className="mt-6 text-center text-xs">
            {isForgot ? (
              <button 
                onClick={() => setIsForgot(false)}
                className="text-primary font-bold hover:underline"
              >
                Back to Sign In
              </button>
            ) : isLogin ? (
              <p className="text-slate-500">
                New to Placement Tracker?{' '}
                <button
                  onClick={() => setIsLogin(false)}
                  className="text-primary font-bold hover:underline"
                >
                  Create an account
                </button>
              </p>
            ) : (
              <p className="text-slate-500">
                Already registered?{' '}
                <button
                  onClick={() => setIsLogin(true)}
                  className="text-primary font-bold hover:underline"
                >
                  Sign In instead
                </button>
              </p>
            )}
          </div>

          {/* Admin Portal Dedicated Toggle Link */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/85 text-center">
            <button
              onClick={() => {
                setIsAdminMode(!isAdminMode)
                setIsLogin(true)
                setIsForgot(false)
                setName('')
                setEmail('')
                setPassword('')
                setAdminPasscode('')
                setCollege('')
                setBranch('')
                setError('')
                setSuccessMsg('')
              }}
              className="text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-primary transition-all flex items-center justify-center gap-1 mx-auto"
            >
              {isAdminMode ? '← Back to Student Portal' : 'Placement Coordinator / Admin Portal →'}
            </button>
          </div>
 
        </div>
      </div>
    </div>
  )
}
