import React, { useState } from 'react';
import { User } from '../types';
import { setAuthToken, getApiBaseUrl, setCustomApiUrl } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { 
  GraduationCap, Lock, Mail, User as UserIcon, 
  Building, ArrowRight, ShieldCheck, AlertCircle, Sun, Moon,
  School, Landmark, CheckCircle2, UserCheck, Shield, Eye, EyeOff,
  Server, RefreshCw, KeyRound, Sparkles
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { theme, toggleTheme } = useTheme();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [requestedRole, setRequestedRole] = useState<'FACULTY' | 'ADMIN'>('FACULTY');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [institution, setInstitution] = useState('Autonomous Institute of Technology');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  
  // Backend connection settings
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [customApiInput, setCustomApiInput] = useState(getApiBaseUrl());
  const [serverStatus, setServerStatus] = useState<'idle' | 'checking' | 'healthy' | 'unreachable'>('idle');

  const checkServerHealth = async () => {
    setServerStatus('checking');
    try {
      const normalized = customApiInput.trim() ? (customApiInput.trim().endsWith('/api') ? customApiInput.trim() : `${customApiInput.trim().replace(/\/+$/, '')}/api`) : getApiBaseUrl();
      const testEndpoint = `${normalized.replace(/\/api$/, '')}/health`;
      const res = await fetch(testEndpoint, { signal: AbortSignal.timeout(5000) }).catch(() => null);
      if (res && res.ok) {
        setServerStatus('healthy');
      } else {
        const apiRes = await fetch(`${normalized}/auth/me`, { signal: AbortSignal.timeout(5000) }).catch(() => null);
        if (apiRes && (apiRes.status === 401 || apiRes.status === 200)) {
          setServerStatus('healthy');
        } else {
          setServerStatus('unreachable');
        }
      }
    } catch {
      setServerStatus('unreachable');
    }
  };

  const handleSaveServerUrl = () => {
    setCustomApiUrl(customApiInput);
    const normalized = getApiBaseUrl();
    setCustomApiInput(normalized);
    setSuccessNotice(`API base URL updated to: ${normalized}`);
    setShowServerConfig(false);
  };

  const quickFill = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setIsRegister(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);
    setLoading(true);

    const activeApiBase = getApiBaseUrl();

    try {
      if (isRegister) {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match. Please verify and re-type your password.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }

        const res = await fetch(`${activeApiBase}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
            full_name: fullName.trim() || 'Professor',
            department: department.trim(),
            institution: institution.trim(),
            role: requestedRole,
            designation: requestedRole === 'ADMIN' ? 'Academic Dean' : 'Faculty Member',
            tenant_id: 'default_tenant'
          })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.detail || `Registration failed (${res.status} ${res.statusText})`);
        }

        setSuccessNotice(
          `Registration submitted for ${fullName.trim()} (${requestedRole === 'ADMIN' ? 'Dean Office' : 'Faculty'}). Your account is awaiting authorization from the administrator. Once approved, you can sign in.`
        );
        setIsRegister(false);
        setPassword('');
        setConfirmPassword('');
      } else {
        const res = await fetch(`${activeApiBase}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password
          })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error(`API endpoint not found at ${activeApiBase}/auth/login. Please verify backend URL.`);
          }
          throw new Error(data.detail || 'Invalid email or password.');
        }

        setAuthToken(data.access_token);
        onLoginSuccess(data.user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error. Please check server connectivity.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center p-4 relative font-sans transition-colors duration-200">
      {/* Top action buttons */}
      <div className="absolute top-6 right-6 flex items-center gap-2 z-20">
        <button
          onClick={() => setShowServerConfig(!showServerConfig)}
          title="Configure API Server URL"
          className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 shadow-sm transition flex items-center gap-1.5 text-xs font-medium"
        >
          <Server className="w-4 h-4 text-blue-500" />
          <span className="hidden sm:inline">Server Config</span>
        </button>

        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-amber-400 shadow-sm transition"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md academic-card p-8 shadow-xl relative z-10 space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white mx-auto flex items-center justify-center shadow-md">
            <Landmark className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Autonomous Examination & Courseware Portal
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Institutional Faculty Academic Management & Autonomous Examination System
          </p>
        </div>

        {/* Server Config Drawer / Modal */}
        {showServerConfig && (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-blue-300 dark:border-blue-900 text-xs space-y-2.5">
            <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <Server className="w-4 h-4 text-blue-500" /> Backend API URL
              </span>
              {serverStatus === 'healthy' && (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
              )}
              {serverStatus === 'unreachable' && (
                <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1 text-[11px]">
                  <AlertCircle className="w-3 h-3" /> Offline
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customApiInput}
                onChange={(e) => setCustomApiInput(e.target.value)}
                placeholder="e.g. https://your-backend.onrender.com/api"
                className="flex-1 px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs"
              />
              <button
                type="button"
                onClick={checkServerHealth}
                disabled={serverStatus === 'checking'}
                className="px-2.5 py-1.5 rounded-md bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition"
                title="Test Connection"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${serverStatus === 'checking' ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setCustomApiInput(getApiBaseUrl());
                  setShowServerConfig(false);
                }}
                className="px-2 py-1 text-slate-500 hover:text-slate-700 text-[11px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveServerUrl}
                className="px-3 py-1 bg-blue-600 text-white rounded-md text-[11px] font-medium hover:bg-blue-700"
              >
                Save URL
              </button>
            </div>
          </div>
        )}

        {/* 1-Click Quick Demo Login Chips */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <KeyRound className="w-3 h-3 text-amber-500" /> Quick Sign-In Accounts:
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => quickFill('superadmin@autonomous.edu', 'SuperAdmin@2026')}
              className="p-1.5 rounded-lg border border-purple-200 dark:border-purple-900/50 bg-purple-50/70 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-[11px] font-semibold text-center transition"
              title="Super Admin (superadmin@autonomous.edu / SuperAdmin@2026)"
            >
              🛡️ Super Admin
            </button>
            <button
              type="button"
              onClick={() => quickFill('dean@autonomous.edu', 'Admin@123')}
              className="p-1.5 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-[11px] font-semibold text-center transition"
              title="Dean Admin (dean@autonomous.edu / Admin@123)"
            >
              🏛️ Dean (Admin)
            </button>
            <button
              type="button"
              onClick={() => quickFill('faculty@autonomous.edu', 'Faculty@123')}
              className="p-1.5 rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[11px] font-semibold text-center transition"
              title="Faculty (faculty@autonomous.edu / Faculty@123)"
            >
              🎓 Faculty
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {successNotice && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-600/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-600/40 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">{error}</p>
              {error.includes('not found') && (
                <button
                  type="button"
                  onClick={() => setShowServerConfig(true)}
                  className="underline text-rose-700 dark:text-rose-300 text-[11px] font-medium"
                >
                  Click here to configure Backend URL
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab Switcher (Sign In vs Register) */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(null); }}
            className={`w-1/2 py-2 text-xs font-semibold rounded-md transition ${
              !isRegister
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(null); }}
            className={`w-1/2 py-2 text-xs font-semibold rounded-md transition ${
              isRegister
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Create New Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Registration Role Selection */}
          {isRegister && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Institutional Role <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRequestedRole('FACULTY')}
                  className={`p-2.5 rounded-lg border text-left text-xs font-semibold flex items-center gap-2 transition ${
                    requestedRole === 'FACULTY'
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="leading-tight">Faculty</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Instructor / Prof</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRequestedRole('ADMIN')}
                  className={`p-2.5 rounded-lg border text-left text-xs font-semibold flex items-center gap-2 transition ${
                    requestedRole === 'ADMIN'
                      ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-700 dark:text-amber-300 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="leading-tight">Dean (Admin)</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Academic Office</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Full Name (Registration only) */}
          {isRegister && (
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Full Name & Title <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. K. Ramanathan"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Institutional Email */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Institutional Email ID <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="username@autonomous.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-10 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4 text-blue-600 dark:text-blue-400" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password (Registration only) */}
          {isRegister && (
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-10 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4 text-blue-600 dark:text-blue-400" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Department (Registration only) */}
          {isRegister && (
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Academic Department
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Computer Science & Engineering"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary text-xs flex items-center justify-center gap-2 py-2.5 mt-2"
          >
            <span>{isRegister ? 'Submit Account for Approval' : 'Sign In to Portal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Informational Guidance */}
        <div className="pt-1 text-center">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {isRegister 
              ? 'New user accounts are submitted with pending status and require Super Admin / Dean approval before sign in.'
              : 'Sign in with your verified institutional email and password to access the academic workspace.'
            }
          </p>
        </div>

        {/* Footer Security Badge */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Institutional Multi-Tenant Security & Role Isolation</span>
        </div>
      </div>
    </div>
  );
};
