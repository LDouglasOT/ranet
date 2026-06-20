import React, { useState } from 'react';
import { 
  Lock, Phone, User, Key, ArrowRight, ShieldAlert,
  GraduationCap, HelpCircle, CheckCircle2, RefreshCw, Smartphone
} from 'lucide-react';
import { User as UserType, Student } from '../types';

interface LoginScreenProps {
  mockUsers: UserType[];
  mockStudents: Student[];
  onLoginSuccess: (user: { name: string; role: 'ADMIN' | 'TEACHER' | 'PARENT'; phone_number?: string }) => void;
  onLogPayload: (type: 'HTMX' | 'SSR' | 'SYSTEM', method: 'GET' | 'POST' | 'PUT', url: string, payload: string, response: string) => void;
}

export default function LoginScreen({
  mockUsers,
  mockStudents,
  onLoginSuccess,
  onLogPayload
}: LoginScreenProps) {
  // Login Type: 'staff' (Admin/Teacher) vs 'parent'
  const [loginTab, setLoginTab] = useState<'staff' | 'parent'>('staff');

  // Staff Form Inputs
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Parent Form Inputs
  const [parentPhone, setParentPhone] = useState('');
  const [studentPin, setStudentPin] = useState('');

  // Status/Error messages
  const [errorStatus, setErrorStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorStatus('');
    setLoading(true);

    setTimeout(() => {
      const enteredName = username.trim().toLowerCase();
      const user = mockUsers.find(
        u => u.username?.toLowerCase() === enteredName && (u.role === 'ADMIN' || u.role === 'TEACHER')
      );

      if (user) {
        onLoginSuccess({ name: user.name, role: user.role });
        
        // Setup Simulated HTTP call
        const payload = `username=${username}&password=••••••••&csrfmiddlewaretoken=v9x7sP1gJmN8oqLm`;
        const htmlResponse = `<div class="login-banner bg-emerald-50 text-emerald-800 p-4 border border-emerald-400">
  <h3>Authentication Success: ${user.name}</h3>
  <p>User Role: ${user.role} | Token publication active.</p>
</div>`;
        onLogPayload('SSR', 'POST', '/accounts/login/staff/', payload, htmlResponse);
      } else {
        setErrorStatus('Incorrect Username. Check database sandbox shortcuts below!');
        setLoading(false);
      }
    }, 600);
  };

  const handleParentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorStatus('');
    setLoading(true);

    setTimeout(() => {
      const enteredPhone = parentPhone.trim();
      const enteredPin = studentPin.trim();

      // Find matching child registered under that phone and PIN
      const match = mockStudents.find(
        s => s.parentPhone === enteredPhone && s.pin === enteredPin
      );

      if (match) {
        onLoginSuccess({ name: match.parentName, role: 'PARENT', phone_number: enteredPhone });
        
        // Setup Simulated HTTP call
        const payload = `phone_number=${enteredPhone}&student_pin=${enteredPin}`;
        const htmlResponse = `<div class="login-banner bg-emerald-50 text-emerald-800 p-4 border border-teal-400">
  <h3>Parent Entry Granted: ${match.parentName}</h3>
  <p>Matched offspring profiles: [${match.name}]. Rendering mobile viewport layout.</p>
</div>`;
        onLogPayload('SSR', 'POST', '/accounts/login/parent/', payload, htmlResponse);
      } else {
        setErrorStatus('Access Denied. Registered PIN / phone configuration error.');
        setLoading(false);
      }
    }, 600);
  };

  // Preset Shortcuts for demonstration ease!
  const triggerShortcutLogin = (role: 'ADMIN' | 'TEACHER' | 'PARENT') => {
    setLoading(true);
    setErrorStatus('');

    setTimeout(() => {
      if (role === 'ADMIN') {
        const adminUser = mockUsers.find(u => u.role === 'ADMIN')!;
        onLoginSuccess({ name: adminUser.name, role: 'ADMIN' });
        onLogPayload('SSR', 'POST', '/accounts/login/staff/', 'username=admin&password=••••••••&shortcut=true', `<!-- Admin Login Bypassed -->\n<h2>Welcome ${adminUser.name}</h2>`);
      } else if (role === 'TEACHER') {
        const teacherUser = mockUsers.find(u => u.role === 'TEACHER')!;
        onLoginSuccess({ name: teacherUser.name, role: 'TEACHER' });
        onLogPayload('SSR', 'POST', '/accounts/login/staff/', 'username=mulema&password=••••••••&shortcut=true', `<!-- Teacher Login Bypassed -->\n<h2>Welcome ${teacherUser.name}</h2>`);
      } else {
        // Parent Sarah Luzinda
        const studentMatch = mockStudents.find(s => s.parentPhone === '0772123456')!;
        onLoginSuccess({ name: studentMatch.parentName, role: 'PARENT', phone_number: '0772123456' });
        onLogPayload('SSR', 'POST', '/accounts/login/parent/', 'phone_number=0772123456&student_pin=2026&shortcut=true', `<!-- Parent Login Bypassed -->\n<h2>Welcome ${studentMatch.parentName}</h2>`);
      }
    }, 400);
  };

  return (
    <div id="auth-portal-shell" className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 flex flex-col">
      
      {/* Visual Logo and Cover info */}
      <div className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-indigo-900 p-8 text-center text-white relative">
        <div className="absolute top-0 right-0 translate-x-8 -translate-y-4 h-32 w-32 rounded-full bg-indigo-600/20 blur-xl"></div>
        
        <div className="mx-auto h-12 w-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-3">
          <GraduationCap size={26} className="text-white" />
        </div>
        <h1 className="text-xl font-extrabold tracking-tight">KAMPALA MODEL PRIMARY</h1>
        <p className="text-xs text-indigo-200 mt-1 uppercase tracking-widest font-bold">Academic Management Node</p>
      </div>

      {/* Tabs selectors standard credentials vs Parent mobile passcode */}
      <div className="flex border-b">
        <button
          onClick={() => setLoginTab('staff')}
          className={`flex-1 py-3 text-center text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
            loginTab === 'staff'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/20 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User size={13} />
          <span>Staff Credentials Portal</span>
        </button>
        <button
          onClick={() => setLoginTab('parent')}
          className={`flex-1 py-3 text-center text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
            loginTab === 'parent'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/20 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Smartphone size={13} />
          <span>Frictionless Parent Access</span>
        </button>
      </div>

      {/* Primary Forms area */}
      <div className="p-6 flex-1 space-y-4">
        {errorStatus && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2.5 font-bold">
            <ShieldAlert size={14} className="text-rose-500 shrink-0 mt-0.5" />
            <span>{errorStatus}</span>
          </div>
        )}

        {/* STAFF FORM PANEL */}
        {loginTab === 'staff' && (
          <form onSubmit={handleStaffLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Username Index</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 hover:border-slate-300 transition-all outline-none"
                  placeholder="e.g. mulema"
                />
                <User size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Enter Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 hover:border-slate-300 transition-all outline-none"
                  placeholder="••••••••"
                />
                <Lock size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl border border-indigo-500 shadow-lg shadow-indigo-600/10 transition-all text-xs flex items-center justify-center gap-1.5 uppercase font-mono tracking-wider active:scale-98"
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Validating session...</span>
                </>
              ) : (
                <>
                  <span>Sign In as Staff</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        )}

        {/* PARENT PASSWORDLESS FORM PANEL */}
        {loginTab === 'parent' && (
          <form onSubmit={handleParentLogin} className="space-y-4">
            <div className="p-3 bg-indigo-50 border border-indigo-150 text-indigo-900 text-[11px] rounded-xl flex items-start gap-2 leading-relaxed">
              <HelpCircle size={14} className="text-indigo-600 shrink-0 mt-0.5" />
              <p>Frictionless entry: Simply enter your registered primary device phone number and the student security 4-digit PIN.</p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registered Phone Number</label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 hover:border-slate-300 transition-all outline-none"
                  placeholder="e.g. 0772123456"
                />
                <Phone size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Student 4-Digit Security PIN</label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={4}
                  required
                  value={studentPin}
                  onChange={(e) => setStudentPin(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 text-xs font-semibold font-mono tracking-widest focus:ring-2 focus:ring-indigo-500 hover:border-slate-300 transition-all outline-none"
                  placeholder="2026"
                />
                <Key size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl border border-indigo-500 shadow-lg shadow-indigo-600/10 transition-all text-xs flex items-center justify-center gap-1.5 uppercase font-mono tracking-wider active:scale-98"
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Scanning Registry Database...</span>
                </>
              ) : (
                <>
                  <span>Frictionless Mobile Log In</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* QUICK LOGIN HELPER SANDBOX CRITICAL */}
      <div className="bg-slate-50 border-t border-slate-100 p-5 space-y-3 shrink-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
          <CheckCircle2 size={11} className="text-emerald-500" />
          Reviewer Quick Preset Shortcuts
        </span>

        <p className="text-[10px] text-slate-500 leading-tight">
          Click below to select a simulated school profile and instantly observe client portals:
        </p>

        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => triggerShortcutLogin('ADMIN')}
            className="w-full py-1.5 px-3 bg-white hover:bg-slate-100 border rounded-lg text-[11px] font-medium text-slate-800 flex items-center justify-between group text-left cursor-pointer transition-colors"
          >
            <div>
              <span className="font-extrabold text-slate-900 block group-hover:text-indigo-600 leading-tight">Admin Portal Entry</span>
              <span className="text-[9px] text-slate-400">Sister Mary Patricia (Director of Studies / DOS)</span>
            </div>
            <span className="text-indigo-600 font-bold font-mono">Run →</span>
          </button>

          <button
            onClick={() => triggerShortcutLogin('TEACHER')}
            className="w-full py-1.5 px-3 bg-white hover:bg-slate-100 border rounded-lg text-[11px] font-medium text-slate-800 flex items-center justify-between group text-left cursor-pointer transition-colors"
          >
            <div>
              <span className="font-extrabold text-slate-900 block group-hover:text-indigo-600 leading-tight">Teacher Portal Entry (Spreadsheet Grid)</span>
              <span className="text-[9px] text-slate-400">Mr. Christopher Mulema (Mathematics / UNEB Grader)</span>
            </div>
            <span className="text-indigo-600 font-bold font-mono">Run →</span>
          </button>

          <button
            onClick={() => triggerShortcutLogin('PARENT')}
            className="w-full py-1.5 px-3 bg-white hover:bg-slate-100 border rounded-lg text-[11px] font-medium text-slate-800 flex items-center justify-between group text-left cursor-pointer transition-colors"
          >
            <div>
              <span className="font-extrabold text-slate-900 block group-hover:text-indigo-600 leading-tight">Parent Portal Entry (Mobile Siblings view)</span>
              <span className="text-[9px] text-slate-400">Mrs. Sarah Luzinda (Douglas & Chloe Namazzi siblings)</span>
            </div>
            <span className="text-indigo-600 font-bold font-mono">Run →</span>
          </button>
        </div>
      </div>

    </div>
  );
}
