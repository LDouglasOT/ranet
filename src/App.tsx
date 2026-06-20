import React, { useState, useMemo, useEffect } from 'react';
import { 
  LogOut, GraduationCap, Terminal, Bell, HelpCircle, 
  Settings, UserCheck, ShieldCheck, Laptop, CheckCircle, Smartphone, Printer
} from 'lucide-react';
import { Role, Student, SubjectAssignment, Assessment, HtmxLog, AssessmentType, ClassStream, Subject, Notification, CalendarEvent, AttendanceRecord, SchoolNotice, BehaviorLog, SickbayLog, AssetTracker } from './types';
import { MOCK_USERS, MOCK_STUDENTS, INITIAL_ASSIGNMENTS, INITIAL_ASSESSMENTS, INITIAL_NOTIFICATIONS, INITIAL_CALENDAR_EVENTS, buildHistoricalAttendance, INITIAL_NOTICES, INITIAL_BEHAVIOR_LOGS, INITIAL_SICKBAY_LOGS, INITIAL_ASSETS } from './mockData';

// Subcomponents
import LoginScreen from './components/LoginScreen';
import TeacherPortal from './components/TeacherPortal';
import ParentPortal from './components/ParentPortal';
import AdminPortal from './components/AdminPortal';
import HtmxConsole from './components/HtmxConsole';
import SchoolCrest from './components/SchoolCrest';
import ReportCardSheet from './components/ReportCardSheet';

export default function App() {
  // Authentication states
  const [currentUser, setCurrentUser] = useState<{ name: string; role: Role; phone_number?: string } | null>(null);

  // Dynamic Datastores (Stateful)
  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS);
  
  // Public scanned report card routing selection
  const [publicReportCardStudent, setPublicReportCardStudent] = useState<Student | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sId = params.get('studentId') || params.get('reportStudentId');
    if (sId) {
      const found = students.find(s => s.id === sId);
      if (found) {
        setPublicReportCardStudent(found);
      }
    }
  }, [students]);

  const handleClosePublicReport = () => {
    setPublicReportCardStudent(null);
    const newurl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.pushState({path: newurl}, '', newurl);
  };
  const [assessments, setAssessments] = useState<Assessment[]>(INITIAL_ASSESSMENTS);
  const [assignments, setAssignments] = useState<SubjectAssignment[]>(INITIAL_ASSIGNMENTS);
  const [lockedSheets, setLockedSheets] = useState<Record<string, boolean>>({
    'P.5 Blue|Social Studies': true // Pre-lock one stream assignment as a demonstration
  });

  // Dynamic School Crest and Academic House Theme selection
  const [houseTheme, setHouseTheme] = useState<'indigo' | 'emerald' | 'rose' | 'amber'>('indigo');

  // Notifications State & Event Dispatchers
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);

  const handleAddNotification = (newNotification: Omit<Notification, 'id' | 'date' | 'readBy'>) => {
    const notification: Notification = {
      ...newNotification,
      id: `not-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      readBy: []
    };
    setNotifications(prev => [notification, ...prev]);
  };

  const handleMarkNotificationAsRead = (id: string, phone: string) => {
    setNotifications(prev => prev.map(not => {
      if (not.id === id) {
        if (!not.readBy.includes(phone)) {
          return { ...not, readBy: [...not.readBy, phone] };
        }
      }
      return not;
    }));
  };

  // Shared School Calendar State & Event Handlers
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(INITIAL_CALENDAR_EVENTS);
  const [notices, setNotices] = useState<SchoolNotice[]>(INITIAL_NOTICES);
  const [behaviorLogs, setBehaviorLogs] = useState<BehaviorLog[]>(INITIAL_BEHAVIOR_LOGS);
  const [sickbayLogs, setSickbayLogs] = useState<SickbayLog[]>(INITIAL_SICKBAY_LOGS);
  const [assets, setAssets] = useState<AssetTracker[]>(INITIAL_ASSETS);

  // Daily Student Attendance State
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(buildHistoricalAttendance());

  const handleSaveAttendance = (records: AttendanceRecord[]) => {
    setAttendance(prev => {
      // Avoid duplicate records for same student ID + date
      const targetKeys = new Set(records.map(r => `${r.studentId}|${r.date}`));
      const filteredPrev = prev.filter(r => !targetKeys.has(`${r.studentId}|${r.date}`));
      return [...filteredPrev, ...records];
    });
  };

  const handleAddCalendarEvent = (newEvent: Omit<CalendarEvent, 'id'>) => {
    const eventObj: CalendarEvent = {
      ...newEvent,
      id: `cal-${Date.now()}`
    };
    setCalendarEvents(prev => [eventObj, ...prev]);
  };

  const handleRemoveCalendarEvent = (id: string) => {
    setCalendarEvents(prev => prev.filter(e => e.id !== id));
  };

  // Bulk import callback for students CSV tool
  const handleImportStudents = (newStudents: Student[]) => {
    setStudents(prev => [...prev, ...newStudents]);
  };

  // Server Emulator Logs state
  const [logs, setLogs] = useState<HtmxLog[]>([]);

  // Console Drawer view states
  const [isConsoleMinimised, setIsConsoleMinimised] = useState(false);

  // Broadcaster tool
  const addLog = (
    type: 'HTMX' | 'SSR' | 'SYSTEM',
    method: 'GET' | 'POST' | 'PUT',
    url: string,
    payload: string,
    response: string
  ) => {
    const timestamp = new Date().toLocaleTimeString();
    const id = `${Date.now()}-${Math.random()}`;
    setLogs(prev => [
      ...prev,
      {
        id,
        timestamp,
        type,
        method,
        url,
        payload,
        status: 200,
        response
      }
    ]);
  };

  // Seed default boot-up logs
  useEffect(() => {
    addLog(
      'SYSTEM',
      'GET',
      '/sys/bootstrap/',
      'app_version=2.0.4&environment=prod',
      'System bootstrap completed. Loaded 6 Student Profiles, 3 Teachers, and 4 class streams.'
    );
  }, []);

  const handleLoginSuccess = (user: { name: string; role: Role; phone_number?: string }) => {
    setCurrentUser(user);
    addLog(
      'SYSTEM',
      'GET',
      `/portal/initialize/?role=${user.role}`,
      `auth_token_hash=session_auth_${Date.now()}`,
      `Loaded user profile of role: ${user.role}. Standard SSR template fully populated for browser consumption.`
    );
  };

  const handleLogOut = () => {
    const previousRole = currentUser?.role || 'USER';
    setCurrentUser(null);
    addLog(
      'SYSTEM',
      'POST',
      '/accounts/logout/',
      'session_kill=true',
      `Session revoked for previous context [${previousRole}]. Session redirecting to /accounts/login/`
    );
  };

  // Update assessment score state (Autosave endpoint simulation)
  const handleUpdateAssessment = (
    subject: string, // unused parameter mapped by teacher cell key
    studentId: string,
    subjName: string,
    type: AssessmentType,
    score: number
  ) => {
    setAssessments(prev => {
      // Check if exact assessment exists currently
      const index = prev.findIndex(
        a => a.studentId === studentId && 
             a.subject === subjName && 
             a.type === type && 
             a.term === 'Term 3'
      );

      if (index > -1) {
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          score,
          date: new Date().toISOString().split('T')[0]
        };
        return copy;
      } else {
        // Create new
        const newRecord: Assessment = {
          id: `ast-${studentId}-Term_3-${subjName}-${type}`,
          studentId,
          subject: subjName as Subject,
          type,
          term: 'Term 3',
          score,
          date: new Date().toISOString().split('T')[0],
          locked: false,
          enteredByTeacherId: 't1' // Christopher Mulema default
        };
        return [...prev, newRecord];
      }
    });
  };

  // Lock assignment worksheet
  const handleLockAssignment = (classStream: string, subject: string, locked: boolean) => {
    const key = `${classStream}|${subject}`;
    setLockedSheets(prev => ({
      ...prev,
      [key]: locked
    }));
  };

  // Add new deployment assignment (Admin tool)
  const handleAddAssignment = (teacherId: string, classStream: ClassStream, subject: Subject) => {
    const teacherName = MOCK_USERS.find(u => u.id === teacherId)?.name || 'Teacher';
    const newAssignment: SubjectAssignment = {
      id: `as-${Date.now()}`,
      teacherId,
      teacherName,
      classStream,
      subject
    };
    setAssignments(prev => [...prev, newAssignment]);
  };

  // Remove deployment assignment
  const handleRemoveAssignment = (assignmentId: string) => {
    setAssignments(prev => prev.filter(as => as.id !== assignmentId));
  };

  // Resolve parenting portal children under phone number
  const associatedStudents = useMemo(() => {
    if (!currentUser || currentUser.role !== 'PARENT' || !currentUser.phone_number) return [];
    return students.filter(s => s.parentPhone === currentUser.phone_number);
  }, [currentUser, students]);

  // Resolve staff matching user objects
  const currentTeacherObj = useMemo(() => {
    if (!currentUser || currentUser.role !== 'TEACHER') return { id: 't1', name: 'Mr. Christopher Mulema' };
    const match = MOCK_USERS.find(u => u.name === currentUser.name);
    return match ? { id: match.id, name: match.name } : { id: 't1', name: currentUser.name };
  }, [currentUser]);

  const borderTopColor = {
    indigo: 'border-indigo-700',
    emerald: 'border-emerald-600',
    rose: 'border-rose-600',
    amber: 'border-amber-500'
  }[houseTheme];

  return (
    <div className={`min-h-screen bg-[#f8fafc] text-slate-900 border-t-4 ${borderTopColor} flex flex-col font-sans select-none antialiased`}>
      
      {/* PUBLIC VERIFIED REPORT OVERLAY LIMIT */}
      {publicReportCardStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 overflow-y-auto px-4 py-8 flex flex-col items-center justify-start print:absolute print:inset-0 print:bg-white print:p-0 print:block">
          <div className="w-full max-w-3xl space-y-4 print:w-full print:max-w-full print:m-0 print:border-none">
            
            {/* Top Verification Box (hides on print) */}
            <div className="bg-slate-950 text-white rounded-2xl p-4 md:p-6 shadow-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-2xl ring-1 ring-emerald-500/20 shrink-0">
                  <ShieldCheck size={26} className="animate-pulse text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xs font-black tracking-widest flex items-center gap-1.5 text-emerald-400 uppercase">
                    Authentic Student Card Ledger
                  </h3>
                  <p className="text-[11px] text-slate-300 leading-normal">
                    You have securely pulled dynamic terminal academic credentials for <strong>{publicReportCardStudent.name}</strong> from Kampala School e-registry.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3 py-2 rounded-xl text-[11px] flex items-center gap-1 cursor-pointer transition-all shadow-md"
                >
                  <Printer size={12} />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={handleClosePublicReport}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-extrabold px-3 py-2 rounded-xl text-[11px] transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Reusable sheet (Displays beautifully on desktop and formats to standard A4 on print) */}
            <div className="print:m-0 print:p-0">
              <ReportCardSheet 
                student={publicReportCardStudent}
                assessments={assessments}
                term="Term 3"
                showPrintButton={false}
              />
            </div>

          </div>
        </div>
      )}
      
      {/* Top Main Navigation Bar */}
      <nav id="academic-main-navbar" className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm px-4 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo Brand with Dynamic School Crest */}
          <div className="flex items-center gap-3">
            <SchoolCrest 
              themeColor={houseTheme} 
              onClick={() => {
                const themes: ('indigo' | 'emerald' | 'rose' | 'amber')[] = ['indigo', 'emerald', 'rose', 'amber'];
                const nextTheme = themes[(themes.indexOf(houseTheme) + 1) % themes.length];
                setHouseTheme(nextTheme);
                addLog(
                  'SYSTEM',
                  'POST',
                  `/portal/branding/change-crest-theme/?house=${nextTheme}`,
                  `current_house_theme=${houseTheme}&selected_house_theme=${nextTheme}`,
                  `<!-- Dynamic Crest Update -->
<div class="p-3 bg-slate-900 text-indigo-300 font-mono text-[10px] rounded space-y-1">
  <span class="text-white font-extrabold text-xs block">🛡️ CREST HOUSE THEME CHANGED</span>
  <p>Academic branding color updated to align with the active traditional house: <strong>${nextTheme.toUpperCase()} House</strong>.</p>
  <p>Logo border-top indicator instantly refreshed dynamically.</p>
</div>`
                );
              }}
              size={42} 
            />
            
            <div className="h-9 w-px bg-slate-200"></div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400 group-hover:text-amber-500 transition-colors">
                  <GraduationCap size={15} />
                </span>
                <h1 className="text-sm font-black leading-none text-slate-950 uppercase tracking-tight">
                  Ranet Junior School
                </h1>
              </div>
              <span className="text-[10px] text-slate-400 font-mono block mt-0.5 uppercase tracking-widest leading-none">
                Kampala Academic Campus
              </span>
            </div>
          </div>

          {/* User Account State Controls */}
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-slate-900 block leading-tight">{currentUser.name}</span>
                <span className="text-[9px] font-mono tracking-wider font-extrabold text-indigo-600 uppercase">
                  {currentUser.role} PORTAL ACTIVE
                </span>
              </div>
              
              <div className="h-9 w-px bg-slate-200 hidden sm:block"></div>

              <button
                onClick={handleLogOut}
                className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors shadow-sm flex items-center gap-1.5"
                title="End Active Profile Session"
              >
                <LogOut size={13} />
                <span className="hidden xs:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-500 font-bold px-2.5 py-1 rounded border">
                <Laptop size={11} className="text-indigo-500" />
                VIRTUAL WORKSPACE ACTIVE
              </span>
            </div>
          )}
        </div>
      </nav>

      {/* Main Container Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {currentUser ? (
          <div>
            {/* Display relevant view based on roles */}
            {currentUser.role === 'ADMIN' && (
              <AdminPortal
                currentAdmin={{ name: currentUser.name }}
                teachers={MOCK_USERS.filter(u => u.role === 'TEACHER')}
                students={students}
                assignments={assignments}
                onAddAssignment={handleAddAssignment}
                onRemoveAssignment={handleRemoveAssignment}
                assessments={assessments}
                onLogPayload={addLog}
                onImportStudents={handleImportStudents}
                notifications={notifications}
                onAddNotification={handleAddNotification}
                calendarEvents={calendarEvents}
                onAddCalendarEvent={handleAddCalendarEvent}
                onRemoveCalendarEvent={handleRemoveCalendarEvent}
              />
            )}

{currentUser.role === 'TEACHER' && (
              <TeacherPortal
                currentTeacher={currentTeacherObj}
                students={students}
                assignments={assignments}
                assessments={assessments}
                onUpdateAssessment={handleUpdateAssessment}
                onLockAssignment={handleLockAssignment}
                lockedSheets={lockedSheets}
                onLogPayload={addLog}
                calendarEvents={calendarEvents}
                attendance={attendance}
                onSaveAttendance={handleSaveAttendance}
              />
            )}

{currentUser.role === 'PARENT' && (
              <ParentPortal
                parentPhone={currentUser.phone_number || '0772123456'}
                associatedStudents={associatedStudents}
                assessments={assessments}
                onLogPayload={addLog}
                notifications={notifications}
                onMarkNotificationAsRead={handleMarkNotificationAsRead}
                calendarEvents={calendarEvents}
                attendance={attendance}
                notices={notices}
                behaviorLogs={behaviorLogs}
                sickbayLogs={sickbayLogs}
                assets={assets}
                pendingAssignments={[]}
              />
            )}
          </div>
        ) : (
          <div className="py-8 md:py-12 animate-fade-in">
            {/* Beautiful Auth Landing Block */}
            <div className="max-w-md mx-auto space-y-6">
              <LoginScreen
                mockUsers={MOCK_USERS}
                mockStudents={students}
                onLoginSuccess={handleLoginSuccess}
                onLogPayload={addLog}
              />
              
              <div className="bg-indigo-900 text-indigo-100 rounded-2xl p-5 shadow-lg border border-indigo-800 space-y-2 text-center relative overflow-hidden">
                <div className="absolute left-0 bottom-0 rotate-12 translate-y-6 -translate-x-4 opacity-10 font-bold text-6xl font-mono">PWA</div>
                
                <h4 className="font-extrabold text-sm flex items-center justify-center gap-1.5">
                  <Smartphone size={14} className="text-emerald-400" />
                  Installable Progressive Web App (PWA)
                </h4>
                <p className="text-[11px] opacity-90 leading-relaxed text-indigo-200">
                  This academic application is fully armed with a verified <code className="bg-indigo-950 font-mono text-indigo-300 px-1 py-0.5 rounded">manifest.json</code> and offline <code className="bg-indigo-950 font-mono text-indigo-300 px-1 py-0.5 rounded">service-worker.js</code>. Tap Chrome settings to install directly onto any home mobile launcher!
                </p>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* FIXED SERVER TERMINAL CONSOLE EMULATOR & DRAWER */}
      <footer className="mt-auto border-t border-slate-200 bg-white shadow-inner p-4 print:hidden">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Terminal size={13} className="text-indigo-600" />
              Django ORM & HTMX Headers Live Feed Tracker
            </h4>
            <button
              onClick={() => setIsConsoleMinimised(!isConsoleMinimised)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold transition-all px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 rounded-lg cursor-pointer"
            >
              {isConsoleMinimised ? '✦ Show Server Console Feed' : '✕ Collapse Console Feed'}
            </button>
          </div>

          {!isConsoleMinimised && (
            <div className="transition-all duration-300">
              <HtmxConsole 
                logs={logs} 
                onClear={() => {
                  setLogs([]);
                  addLog('SYSTEM', 'GET', '/sys/clear-console/', '', 'Console cleared of state logs.');
                }} 
              />
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
