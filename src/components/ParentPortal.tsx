import React, { useState } from 'react';
import { 
  User, Baby, TrendingUp, Award, Printer, ShieldAlert,
  ClipboardList, CheckCircle2, QrCode, BookOpen, Clock, Calendar, Bell, UserCheck, HeartPulse, Package
} from 'lucide-react';
import { Student, Assessment, AssessmentType, Term, Notification, CalendarEvent, AttendanceRecord, SchoolNotice, BehaviorLog, SickbayLog, AssetTracker } from '../types';
import SchoolCalendar from './SchoolCalendar';
import ReportCardSheet from './ReportCardSheet';

interface ParentPortalProps {
  parentPhone: string;
  associatedStudents: Student[];
  assessments: Assessment[];
  onLogPayload: (type: 'HTMX' | 'SSR' | 'SYSTEM', method: 'GET' | 'POST' | 'PUT', url: string, payload: string, response: string) => void;
  notifications: Notification[];
  onMarkNotificationAsRead: (id: string, phone: string) => void;
  calendarEvents: CalendarEvent[];
  attendance: AttendanceRecord[];
  notices?: SchoolNotice[];
  behaviorLogs?: BehaviorLog[];
  sickbayLogs?: SickbayLog[];
  assets?: AssetTracker[];
  pendingAssignments?: Array<{id: string; subject: string; dueDate: string; title: string; description: string}>;
}

export default function ParentPortal({
  parentPhone,
  associatedStudents,
  assessments,
  onLogPayload,
  notifications,
  onMarkNotificationAsRead,
  calendarEvents,
  attendance,
  notices = [],
  behaviorLogs = [],
  sickbayLogs = [],
  assets = [],
  pendingAssignments = []
}: ParentPortalProps) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(
    associatedStudents[0] || null
  );
  const [activeTab, setActiveTab] = useState<'ca' | 'trends' | 'report' | 'bulletin' | 'pulse' | 'homework'>('ca');
  const [trendsMode, setTrendsMode] = useState<'absolute' | 'zscore'>('absolute');
  const [showQrCheck, setShowQrCheck] = useState(false);
  const [printMode, setPrintMode] = useState(false);

  if (associatedStudents.length === 0 || !selectedStudent) {
    return (
      <div className="bg-white rounded-xl shadow-md p-10 text-center border">
        <ShieldAlert size={40} className="text-amber-500 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800">No Student Records Found</h3>
        <p className="text-xs text-slate-500 mt-1">Please consult the administration of the school to register your device phone: {parentPhone}</p>
      </div>
    );
  }

  // Filter current student's tests
  const studentAssessments = assessments.filter(a => a.studentId === selectedStudent.id);

  // Switch students with log behavior
  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    const htmlResponse = `<header id="parent-child-header" class="animate-fade-in p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center gap-3">
  <img src="${student.avatar}" class="h-12 w-12 rounded-full border border-indigo-200" />
  <div>
    <h3 class="font-black text-slate-800 text-sm">Active Child Swapped: ${student.name}</h3>
    <span class="text-xs text-slate-500">School Stream: ${student.classStream}</span>
  </div>
</header>`;

    onLogPayload(
      'HTMX', 
      'GET', 
      `/portal/parent/select-child/?student_id=${student.id}`, 
      '', 
      htmlResponse
    );
  };

  const getSuggGrading = (score: number) => {
    if (score >= 90) return { div: 'D1', label: 'Distinction 1', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (score >= 80) return { div: 'D2', label: 'Distinction 2', color: 'text-emerald-600 bg-emerald-50/50 border-emerald-100' };
    if (score >= 70) return { div: 'C3', label: 'Credit 3', color: 'text-sky-700 bg-sky-50 border-sky-100' };
    if (score >= 60) return { div: 'C4', label: 'Credit 4', color: 'text-indigo-700 bg-indigo-50 border-indigo-100' };
    if (score >= 50) return { div: 'C5', label: 'Credit 5', color: 'text-slate-600 bg-slate-50 border-slate-200' };
    if (score >= 45) return { div: 'P7', label: 'Pass 7', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    if (score >= 40) return { div: 'P8', label: 'Pass 8', color: 'text-orange-700 bg-orange-50 border-orange-200' };
    return { div: 'F9', label: 'Fail 9', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  // Mock class average comparison benchmarks
  const CLASS_AVERAGES: Record<string, Record<string, number>> = {
    'Mathematics': { 'Term 1': 68, 'Term 2': 71, 'Term 3': 73 },
    'English': { 'Term 1': 74, 'Term 2': 76, 'Term 3': 78 },
    'Science': { 'Term 1': 69, 'Term 2': 72, 'Term 3': 74 },
    'Social Studies': { 'Term 1': 75, 'Term 2': 79, 'Term 3': 81 },
  };

  // Standard deviations for each subject stream
  const CLASS_STDEVS: Record<string, Record<string, number>> = {
    'Mathematics': { 'Term 1': 8.5, 'Term 2': 9.0, 'Term 3': 10.2 },
    'English': { 'Term 1': 7.2, 'Term 2': 8.0, 'Term 3': 6.8 },
    'Science': { 'Term 1': 9.5, 'Term 2': 10.0, 'Term 3': 11.0 },
    'Social Studies': { 'Term 1': 6.0, 'Term 2': 6.5, 'Term 3': 7.0 },
  };

  // Convert mathematical Z-score to Cumulative Standard Normal Percentile (approximation)
  const getPercentileFromZ = (z: number): number => {
    if (z < -3) return 1;
    if (z > 3) return 99;
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    const prob = z > 0 ? 1 - p : p;
    return Math.round(prob * 100);
  };

  const getZStats = (sub: string, term: string, score: number) => {
    const avg = CLASS_AVERAGES[sub]?.[term] || 70;
    const sd = CLASS_STDEVS[sub]?.[term] || 8.0;
    const z = (score - avg) / sd;
    const percentile = getPercentileFromZ(z);
    return { z, percentile, avg, sd };
  };

  const subjects = ['Mathematics', 'English', 'Science', 'Social Studies'] as const;

  // Compute stats
  const t3ExamMarks = studentAssessments.filter(a => a.term === 'Term 3' && a.type === 'END-OF-TERM');
  const t3Average = t3ExamMarks.length > 0 
    ? Math.round(t3ExamMarks.reduce((sum, current) => sum + current.score, 0) / t3ExamMarks.length) 
    : 0;

  // Compute notifications relevant to the active child (ALL, specific class stream, or custom target selected)
  const relevantNotifications = notifications.filter(
    n => n.targetStream === 'ALL' || 
         n.targetStream === selectedStudent.classStream ||
         (n.targetStream === 'CUSTOM' && (
           (n.targetSelectedStudents && n.targetSelectedStudents.includes(selectedStudent.id)) ||
           (n.targetSelectedParents && n.targetSelectedParents.includes(selectedStudent.parentName)) ||
           (n.targetSelectedPhones && n.targetSelectedPhones.includes(selectedStudent.parentPhone))
         ))
  );
  const unreadCount = relevantNotifications.filter(
    n => !n.readBy.includes(parentPhone)
  ).length;

  return (
    <div id="parent-portal-host" className="space-y-6">
      
      {/* Print Overlay cover block if printing mode active */}
      {printMode && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-[800px] p-8 md:p-12 shadow-2xl rounded-2xl relative border">
            
            {/* Header controls inside printed lightbox */}
            <div className="absolute right-6 top-6 flex items-center gap-2 print:hidden">
              <button 
                onClick={() => {
                  window.print();
                  onLogPayload('SYSTEM', 'POST', '/portal/parent/print-trigger/', `student_id=${selectedStudent.id}`, `<!-- Printing initialized -->`);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 font-bold px-4 py-2 rounded-lg text-white flex items-center gap-2 text-xs transition-all shadow-md"
              >
                <Printer size={13} />
                <span>Trigger System Print Dialog</span>
              </button>
              <button 
                onClick={() => setPrintMode(false)}
                className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold px-4 py-2 rounded-lg text-xs transition-all"
              >
                Close View
              </button>
            </div>

            {/* A4 Document layout block */}
            <div className="border-[3px] border-double border-slate-900 p-6 md:p-10 font-serif text-slate-900 select-text leading-relaxed">
              
              {/* Document Header */}
              <div className="text-center space-y-2 border-b-2 border-slate-900 pb-6 relative">
                
                {/* Visual badge mock */}
                <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full border border-slate-900 flex items-center justify-center text-slate-900 font-bold tracking-widest text-lg">
                  KPS
                </div>
                
                <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider">KAMPALA MODEL PRIMARY SCHOOL</h1>
                <p className="text-xs uppercase font-sans tracking-widest text-slate-600 font-semibold">
                  Motto: "Discipline and Hardwork Ensure Excellence"
                </p>
                <p className="text-xs font-serif italic text-slate-500">
                  P.O. Box 4529, Jinja Road, Kampala | Tel: +256-414-300400
                </p>

                <div className="bg-slate-900 text-white font-sans text-[11px] font-bold px-4 py-1.5 inline-block rounded uppercase tracking-wider mt-4">
                  OFFICIAL TERMINAL ACADEMIC REPORT CARD
                </div>
              </div>

              {/* Student Metadata Card layout */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-6 text-sm font-sans">
                <div className="space-y-0.5">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Pupil Full Name</span>
                  <span className="font-extrabold text-slate-950">{selectedStudent.name}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Class Stream</span>
                  <span className="font-extrabold text-slate-950">{selectedStudent.classStream}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Year / Academic Session</span>
                  <span className="font-extrabold text-slate-950">2026 Academic Term 3</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Parent Contact ID</span>
                  <span className="font-mono font-bold text-slate-950">{selectedStudent.parentPhone}</span>
                </div>
              </div>

              {/* Report Table */}
              <table className="w-full border-collapse border border-slate-900 text-left text-xs font-sans mt-2">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-900 uppercase font-black text-slate-900">
                    <th className="p-2.5 border border-slate-900">Subject</th>
                    <th className="p-2.5 border border-slate-900 text-center">T3 Test (20)</th>
                    <th className="p-2.5 border border-slate-900 text-center">T3 Mid (30)</th>
                    <th className="p-2.5 border border-slate-900 text-center">T3 Exam (50)</th>
                    <th className="p-2.5 border border-slate-900 text-center">Total (100)</th>
                    <th className="p-2.5 border border-slate-900 text-center">Grade</th>
                    <th className="p-2.5 border border-slate-900 min-w-[200px]">Remarks / Teacher Initials</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-400">
                  {subjects.map((subj) => {
                    const mathTest = assessments.find(a => a.studentId === selectedStudent.id && a.subject === subj && a.type === 'TEST' && a.term === 'Term 3')?.score || 72;
                    const mathMid = assessments.find(a => a.studentId === selectedStudent.id && a.subject === subj && a.type === 'MID-TERM' && a.term === 'Term 3')?.score || 75;
                    const mathEnd = assessments.find(a => a.studentId === selectedStudent.id && a.subject === subj && a.type === 'END-OF-TERM' && a.term === 'Term 3')?.score || 80;

                    // Aggregate score
                    const total = Math.round((mathTest * 0.2) + (mathMid * 0.3) + (mathEnd * 0.5));
                    const grade = getSuggGrading(total);

                    // Remarks presets
                    const remarkMap: Record<string, string> = {
                      'Mathematics': 'Outstanding numeracy skills. Has consistent problem-solving ability. - C.M',
                      'English': 'Articulate command of vocabulary. Participates beautifully in grammar. - J.N',
                      'Science': 'Excellent curiosity. Exhibits strong command of environmental science keys. - A.S',
                      'Social Studies': 'Satisfactory historical insight. Very keen learner. - J.N'
                    };

                    return (
                      <tr key={subj} className="align-top hover:bg-slate-50">
                        <td className="p-2.5 border border-slate-900 font-bold">{subj}</td>
                        <td className="p-2.5 border border-slate-900 text-center font-mono">{mathTest}</td>
                        <td className="p-2.5 border border-slate-900 text-center font-mono">{mathMid}</td>
                        <td className="p-2.5 border border-slate-900 text-center font-mono">{mathEnd}</td>
                        <td className="p-2.5 border border-slate-900 text-center font-mono font-black">{total}</td>
                        <td className="p-2.5 border border-slate-900 text-center font-mono font-extrabold">{grade.div}</td>
                        <td className="p-2.5 border border-slate-900 italic text-slate-700 text-[11px]">{remarkMap[subj]}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Summary Block */}
              <div className="mt-6 border border-slate-900 p-4 rounded bg-slate-50 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                <div className="space-y-1">
                  <p><strong>Total Terminal Marks:</strong> 312 / 400</p>
                  <p><strong>Computed Term Average:</strong> {t3Average}%</p>
                  <p><strong>Aggregate Division:</strong> Division 1 (First Grade / UNEB Benchmark)</p>
                </div>
                <div className="space-y-1">
                  <p><strong>Class Position:</strong> 3rd out of 48 candidates</p>
                  <p><strong>Academic Status:</strong> Promoted to P.6 Standard with High Honors</p>
                  <p><strong>Next Term Commences:</strong> 15th September, 2026</p>
                </div>
              </div>

              {/* Anti-forgery security blocks */}
              <div className="mt-8 pt-8 border-t border-dashed border-slate-500/60 flex flex-wrap items-center justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-1.5 text-[11px] font-sans">
                    <div className="w-4 h-4 bg-indigo-100 flex items-center justify-center font-bold text-[9px] text-indigo-700 rounded-full border border-indigo-200">✓</div>
                    <span>Assessed & Locked by WSGI Server Protocol</span>
                  </div>
                  <div>
                    <div className="text-xs font-serif select-none italic text-slate-700 font-semibold border-b border-black w-48 h-8 flex items-end">
                      Sr. Mary Patricia
                    </div>
                    <span className="text-[10px] text-slate-400 font-sans tracking-wide block uppercase font-bold mt-1">Headteacher Signature</span>
                  </div>
                </div>

                {/* Secure QR Mock Code Seal */}
                <div 
                  onClick={() => setShowQrCheck(true)}
                  className="bg-slate-50 hover:bg-slate-100 p-2 border-2 border-slate-950 rounded-lg flex flex-col items-center gap-1 cursor-pointer select-none shadow hover:scale-105 transition-transform"
                >
                  <QrCode size={52} className="text-slate-950" />
                  <span className="text-[8px] font-sans font-bold uppercase tracking-wider text-slate-600">Scan to Verify Registry</span>
                </div>
              </div>

              {/* Warning popup for QR code */}
              {showQrCheck && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 mt-6 text-xs text-emerald-800 space-y-1 relative animate-fade-in font-sans">
                  <button 
                    onClick={() => setShowQrCheck(false)}
                    className="absolute top-2 right-3 font-bold text-emerald-700 hover:text-emerald-900"
                  >
                    ✕
                  </button>
                  <p className="font-bold flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-500" />
                    UNEB Anti-Forgery Decentralized Verification Certified
                  </p>
                  <p className="text-[11px] text-emerald-700 font-mono">
                    Record Hash ID: kmps_2026_p5b_{selectedStudent.id}_d81a94b
                  </p>
                  <p className="text-[10px]">
                    Status: Verified Authentic terminal report published by Kampala Model Primary School Registrar, compatible with secondary admission clearances.
                  </p>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* Parent Header banner */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden relative">
        <div className="bg-gradient-to-r from-teal-700 to-emerald-800 h-2"></div>
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-teal-50 border border-teal-200 h-14 w-14 rounded-full flex items-center justify-center shrink-0">
              <User size={24} className="text-teal-700" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-600 block">Frictionless Guardian Account</span>
              <h2 className="text-xl md:text-2xl font-black text-slate-800">{selectedStudent.parentName}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-slate-400 font-mono">Simulated Phone: {parentPhone}</span>
                <span className="h-1 w-1 bg-slate-300 rounded-full"></span>
                <span className="text-xs text-teal-600 font-bold bg-teal-50 border border-teal-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Baby size={12} />
                  Children Registered: {associatedStudents.length} Sibling Profiles
                </span>
              </div>
            </div>
          </div>

          {/* Child select layout dropdown */}
          <div className="space-y-1 shrink-0">
            <label className="text-[10px] font-bold text-slate-400 uppercase block">Active Pupil Selector</label>
            <div className="relative">
              <select
                value={selectedStudent.id}
                onChange={(e) => {
                  const student = associatedStudents.find(s => s.id === e.target.value);
                  if (student) handleStudentSelect(student);
                }}
                className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2.5 text-sm font-bold pr-10 focus:ring-2 focus:ring-teal-500 hover:border-slate-300 transition-all cursor-pointer appearance-none outline-none"
              >
                {associatedStudents.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.classStream})
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-3.5 pointer-events-none h-2 w-2 border-r-2 border-b-2 border-slate-600 transform rotate-45"></div>
            </div>
          </div>
        </div>
      </div>

      {/* URGENT ALERTS BANNER BAR FOR PARENTS */}
      {relevantNotifications.some(n => n.priority === 'URGENT' && !n.readBy.includes(parentPhone)) && (
        <div id="urgent-broadcast-ribbon" className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs font-sans text-rose-950 animate-pulse shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <ShieldAlert size={18} />
            </div>
            <div>
              <p className="font-extrabold text-rose-900 uppercase tracking-wide">⚠️ CRITICAL ADMINISTRATION BULLETIN RELEASED</p>
              <p className="text-[11px] text-rose-700 font-medium">The headmistress has issued an urgent broadcast. Please read and acknowledge immediately.</p>
            </div>
          </div>
          <button 
            onClick={() => {
              setActiveTab('bulletin');
              onLogPayload('SSR', 'GET', `/portal/parent/tabs/?tab=bulletins`, '', `<!-- Bulletins Tab Partial -->`);
              window.scrollTo({ top: 300, behavior: 'smooth' });
            }}
            className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-[10px] uppercase cursor-pointer tracking-wider shrink-0 transition-colors"
          >
            Read Alert Now
          </button>
        </div>
      )}

      {/* Main Tab Controls */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          onClick={() => {
            setActiveTab('ca');
            onLogPayload('SSR', 'GET', `/portal/parent/tabs/?tab=continuous-assessment`, '', `<!-- Continuous stats partial -->`);
          }}
          className={`flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'ca'
              ? 'border-teal-600 text-teal-700 bg-teal-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardList size={14} />
          Continuous Assessment
        </button>
        <button
          onClick={() => {
            setActiveTab('trends');
            onLogPayload('SSR', 'GET', `/portal/parent/tabs/?tab=trends`, '', `<!-- Trend grids loaded -->`);
          }}
          className={`flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'trends'
              ? 'border-teal-600 text-teal-700 bg-teal-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp size={14} />
          Progress & Term Comparison Trends
        </button>
        <button
          onClick={() => {
            setActiveTab('report');
            onLogPayload('SSR', 'GET', `/portal/parent/tabs/?tab=report-card`, '', `<!-- Render printable sheet -->`);
          }}
          className={`flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'report'
              ? 'border-teal-600 text-teal-700 bg-teal-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award size={14} />
          Report Card View
        </button>
        <button
          onClick={() => {
            setActiveTab('bulletin');
            onLogPayload('SSR', 'GET', `/portal/parent/tabs/?tab=bulletins`, '', `<!-- Bulletins Tab Partial -->`);
          }}
          className={`flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap relative ${
            activeTab === 'bulletin'
              ? 'border-teal-600 text-teal-700 bg-teal-50/20 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bell size={14} className={unreadCount > 0 ? "text-amber-500 animate-bounce" : "text-slate-500"} />
          <span>School Broadcasts</span>
          {unreadCount > 0 && (
            <span className="bg-rose-500 text-white font-mono text-[9px] font-black rounded-full h-4 min-w-[16px] px-1 inline-flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab('calendar');
            onLogPayload('SSR', 'GET', `/portal/parent/tabs/?tab=school-calendar`, '', `<!-- School Calendar Partial -->`);
          }}
          className={`flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'calendar'
              ? 'border-teal-600 text-teal-700 bg-teal-50/20 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar size={14} className="text-emerald-600" />
          <span>School Calendar</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('attendance');
            onLogPayload('SSR', 'GET', `/portal/parent/tabs/?tab=attendance`, '', `<!-- Attendance Registry Tab Partial -->`);
          }}
          className={`flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'attendance'
              ? 'border-teal-600 text-teal-700 bg-teal-50/20 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
<UserCheck size={14} className="text-teal-650" />
           <span>Attendance Registry</span>
         </button>

        <button
          onClick={() => {
            setActiveTab('pulse');
            onLogPayload('SSR', 'GET', `/portal/parent/tabs/?tab=daily-pulse`, '', `<!-- Daily Pulse Tab Partial -->`);
          }}
          className={`flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'pulse'
              ? 'border-teal-600 text-teal-700 bg-teal-50/20 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <HeartPulse size={14} className="text-rose-600" />
          <span>Daily Pulse</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('homework');
            onLogPayload('SSR', 'GET', `/portal/parent/tabs/?tab=homework-assets`, '', `<!-- Homework & Assets Tab Partial -->`);
          }}
          className={`flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'homework'
              ? 'border-teal-600 text-teal-700 bg-teal-50/20 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package size={14} className="text-amber-600" />
          <span>Homework & Assets</span>
        </button>
       </div>

      {/* Tabs panels */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6">
        
        {/* TAB 1: CONTINUOUS ASSESSMENT */}
        {activeTab === 'ca' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Weekly Quizzes & Term Marks</h3>
                <p className="text-xs text-slate-400">Log of granular tests entered by classroom teachers during current session</p>
              </div>
              <span className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">Term 3 Active Log</span>
            </div>

            {studentAssessments.filter(a => a.term === 'Term 3').length === 0 ? (
              <div className="py-12 border-2 border-dashed border-slate-200 text-center rounded-xl text-slate-400">
                <BookOpen size={24} className="mx-auto mb-1.5 opacity-60" />
                <span>No continuous assessments have been submitted for Term 3 yet.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {studentAssessments
                  .filter(a => a.term === 'Term 3')
                  .map((ass) => {
                    const gradeDetails = getSuggGrading(ass.score);
                    
                    return (
                      <div 
                        key={ass.id} 
                        className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between shadow-sm relative overflow-hidden group hover:shadow transition-all hover:bg-white"
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono leading-none font-bold text-indigo-600 block uppercase">
                            {ass.subject}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1">
                            {ass.type === 'TEST' ? 'Weekly Quiz Test Record' : ass.type === 'MID-TERM' ? 'Mid-Term Appraisal' : 'End of Term Terminal'}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                            <Clock size={10} /> Saved date: {ass.date}
                          </span>
                        </div>

                        {/* Grade badge */}
                        <div className="text-right shrink-0">
                          <div className={`font-mono text-xl font-black px-3 py-1 rounded-lg border ${gradeDetails.color} text-center`}>
                            {ass.score}%
                            <span className="block text-[8px] font-mono tracking-widest leading-none mt-1 font-bold">
                              {gradeDetails.div}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PROGRESS TRENDS */}
        {activeTab === 'trends' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-150 pb-4">
              <div className="space-y-0.5">
                <h3 className="text-base font-extrabold text-slate-900">Term-by-Term Progress & Standings</h3>
                <p className="text-xs text-slate-400">Interactive overview comparing marks across Term 1, Term 2, and Term 3 with peers and class averages.</p>
              </div>

              {/* Mode Control for Absolute score vs Relative standing (Z-Score) */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start shrink-0">
                <button
                  onClick={() => {
                    setTrendsMode('absolute');
                    onLogPayload(
                      'SYSTEM',
                      'POST',
                      `/portal/parent/trends-mode/?mode=absolute`,
                      `student_id=${selectedStudent.id}`,
                      `<!-- Switched parent trends view to absolute scores -->
<div class="p-2.5 bg-slate-900 text-indigo-300 font-mono text-[10px] rounded space-y-1">
  <span class="text-white font-extrabold text-xs block">📊 ABSOLUTE GRADES VIEW</span>
  <p>Rendered primary absolute percentages (%) with target benchmarks.</p>
</div>`
                    );
                  }}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    trendsMode === 'absolute'
                      ? 'bg-white text-indigo-950 shadow-sm font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Absolute Scores (%)
                </button>
                <button
                  onClick={() => {
                    setTrendsMode('zscore');
                    onLogPayload(
                      'SYSTEM',
                      'POST',
                      `/portal/parent/trends-mode/?mode=zscore`,
                      `student_id=${selectedStudent.id}`,
                      `<!-- Switched parent trends view to peer-normalized Z-Scores -->
<div class="p-2.5 bg-slate-900 text-teal-300 font-mono text-[10px] rounded space-y-1">
  <span class="text-white font-extrabold text-xs block">📈 Z-SCORE PERCENTILES VIEW</span>
  <p>Calculated dynamic standard score deviations and computed cumulative percentile standings compared to active stream peers.</p>
</div>`
                    );
                  }}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    trendsMode === 'zscore'
                      ? 'bg-white text-teal-950 shadow-sm font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>📊 Standing (Z-Score Percentiles)</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left border rounded-xl overflow-hidden shadow-sm">
                <thead>
                  <tr className="bg-slate-100 text-[11px] font-bold text-slate-600 uppercase border-b">
                    <th className="p-3.5">Subject Stream</th>
                    <th className="p-3.5 text-center">Term 1</th>
                    <th className="p-3.5 text-center">Term 2</th>
                    <th className="p-3.5 text-center">Term 3 (Current)</th>
                    <th className="p-3.5 text-center">
                      {trendsMode === 'absolute' ? 'Progress Curve Status' : 'Rank Standing Status'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {subjects.map((subj) => {
                    // Resolve end marks for T1 & T2
                    const getEolScore = (term: Term) => {
                      const ass = studentAssessments.find(a => a.subject === subj && a.type === 'END-OF-TERM' && a.term === term);
                      return ass ? ass.score : null;
                    };

                    const t1Score = getEolScore('Term 1') || 65;
                    const t2Score = getEolScore('Term 2') || 70;
                    const t3Score = getEolScore('Term 3') || 78;

                    // Calculate Z-Scores & Percentiles
                    const t1Stats = getZStats(subj, 'Term 1', t1Score);
                    const t2Stats = getZStats(subj, 'Term 2', t2Score);
                    const t3Stats = getZStats(subj, 'Term 3', t3Score);

                    // Benchmark average
                    const t3Benchmark = CLASS_AVERAGES[subj]?.['Term 3'] || 75;

                    const isRising = t3Score >= t2Score && t2Score >= t1Score;
                    const beatsBenchmark = t3Score >= t3Benchmark;

                    const isRisingPercentile = t3Stats.percentile >= t2Stats.percentile && t2Stats.percentile >= t1Stats.percentile;
                    const isDecliningPercentile = t3Stats.percentile < t2Stats.percentile && t2Stats.percentile < t1Stats.percentile;

                    return (
                      <tr key={subj} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 leading-tight">{subj}</div>
                          {trendsMode === 'absolute' ? (
                            <span className="text-[10px] text-slate-400 font-serif">
                              Class Target benchmark: {t3Benchmark}%
                            </span>
                          ) : (
                            <span className="text-[10px] text-teal-600 font-mono font-medium">
                              SD Error: ±{CLASS_STDEVS[subj]?.['Term 3']?.toFixed(1) || '8.0'}% | Stream Avg: {CLASS_AVERAGES[subj]?.['Term 3'] || '70'}%
                            </span>
                          )}
                        </td>
                        
                        {/* Term 1 cell */}
                        <td className="p-3.5 text-center">
                          {trendsMode === 'absolute' ? (
                            <div className="space-y-1">
                              <span className="font-mono bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/50 text-slate-600 font-bold">
                                {t1Score}%
                              </span>
                              <div className="text-[9px] text-slate-400">Avg: {CLASS_AVERAGES[subj]?.['Term 1']}%</div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className={`font-mono border px-2.5 py-1 rounded text-xs font-bold inline-block ${
                                t1Stats.z >= 0 ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' : 'bg-slate-100 border-slate-200 text-slate-600'
                              }`}>
                                Z: {t1Stats.z >= 0 ? '+' : ''}{t1Stats.z.toFixed(2)}
                              </span>
                              <div className="text-[10px] font-bold text-slate-500 block">
                                {t1Stats.percentile}th percentile
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Term 2 cell */}
                        <td className="p-3.5 text-center">
                          {trendsMode === 'absolute' ? (
                            <div className="space-y-1">
                              <span className="font-mono bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/50 text-slate-600 font-bold">
                                {t2Score}%
                              </span>
                              <div className="text-[9px] text-slate-400">Avg: {CLASS_AVERAGES[subj]?.['Term 2']}%</div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className={`font-mono border px-2.5 py-1 rounded text-xs font-bold inline-block ${
                                t2Stats.z >= 0 ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' : 'bg-slate-100 border-slate-200 text-slate-600'
                              }`}>
                                Z: {t2Stats.z >= 0 ? '+' : ''}{t2Stats.z.toFixed(2)}
                              </span>
                              <div className="text-[10px] font-bold text-slate-500 block">
                                {t2Stats.percentile}th percentile
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Term 3 cell */}
                        <td className="p-3.5 text-center">
                          {trendsMode === 'absolute' ? (
                            <div className="space-y-1">
                              <span className={`font-mono px-3 py-1.5 rounded-lg border font-black ${
                                beatsBenchmark 
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                  : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                              }`}>
                                {t3Score}%
                              </span>
                              <div className="text-[9px] text-slate-400 font-medium">Avg: {CLASS_AVERAGES[subj]?.['Term 3']}%</div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className={`font-mono border px-2.5 py-1 rounded text-xs font-black inline-block ${
                                t3Stats.z >= 0 
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                  : 'bg-rose-50 border-rose-200 text-rose-800'
                              }`}>
                                Z: {t3Stats.z >= 0 ? '+' : ''}{t3Stats.z.toFixed(2)}
                              </span>
                              <div className={`text-[10px] font-extrabold block ${
                                t3Stats.percentile >= 75 ? 'text-emerald-700' : t3Stats.percentile >= 50 ? 'text-indigo-700' : 'text-amber-700'
                              }`}>
                                {t3Stats.percentile}th percentile
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Status Column */}
                        <td className="p-3.5 text-center">
                          {trendsMode === 'absolute' ? (
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                isRising 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}>
                                {isRising ? '📈 Stable Rise' : '⚖ Fluctuating'}
                              </span>
                              <span className="text-[9px] text-[#4b5563] text-center font-bold">
                                {beatsBenchmark ? '★ Beats school avg' : 'Matches median average'}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                isRisingPercentile 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                  : isDecliningPercentile
                                  ? 'bg-rose-150 text-rose-800 border border-rose-220 animate-pulse'
                                  : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                              }`}>
                                {isRisingPercentile ? '🚀 Peer Gaining' : isDecliningPercentile ? '📉 Yielding Stand' : '⚖ Level Profile'}
                              </span>
                              <span className="text-[9.5px] text-[#4e5560] font-sans font-extrabold">
                                {t3Stats.percentile >= 90 ? 'Top 10% Class Elite' : t3Stats.percentile >= 75 ? 'Upper 25% Quartile' : t3Stats.percentile >= 50 ? 'Above Median Group' : 'Remedial Support'}
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {trendsMode === 'absolute' ? (
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-start gap-3 text-xs text-teal-800">
                <CheckCircle2 size={16} className="text-teal-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">Comparative Standard is active</p>
                  <p className="text-[11px] leading-relaxed opacity-90 mt-0.5">
                    The visual progress displays are compiled automatically based on active continuous assessments of Term 3. You can click on other child profiles in the selector to refresh their unique trend grids instantly.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-900 border border-slate-800 text-white rounded-xl flex items-start gap-3 text-xs">
                <div className="p-1 px-2.5 bg-indigo-500 rounded text-white font-mono text-[10px] font-bold select-none shrink-0 mt-0.5">
                  INFO
                </div>
                <div>
                  <p className="font-extrabold text-slate-200">Understanding Z-Scores & Percentiles standing statistics</p>
                  <p className="text-[11px] leading-relaxed text-slate-400 mt-1">
                    A <strong className="text-white">Z-score</strong> tells you mathematically how far above or below the general class cohort average your student scores:
                  </p>
                  <ul className="list-disc pl-4 mt-1.5 space-y-1 text-[10px] text-slate-350 font-serif">
                    <li><strong className="text-emerald-400">Positive Z-Score (e.g. +1.20)</strong>: Child scored 1.2 standard deviations <strong className="text-white">above</strong> the average of the whole stream.</li>
                    <li><strong className="text-rose-400">Negative Z-Score (e.g. -0.50)</strong>: Child scored 0.5 standard deviations <strong className="text-white">below</strong> the benchmark average.</li>
                    <li><strong className="text-indigo-300">Percentile (e.g. 84th)</strong>: Indicates your child performed <strong className="text-white">better than or equal to 84%</strong> of their classmates in that module.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: REPORT CARD VIEW */}
        {activeTab === 'report' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Primary Report Card (UNEB Standard)</h3>
                <p className="text-xs text-slate-400">View official academic report card with validated security seals.</p>
              </div>
            </div>

            {/* Reusable official report card view */}
            <ReportCardSheet
              student={selectedStudent}
              assessments={assessments}
              term="Term 3"
              showPrintButton={true}
            />
          </div>
        )}

        {/* TAB 4: SCHOOL ANNOUNCEMENTS / BULLETINS */}
        {activeTab === 'bulletin' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b pb-3 mb-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Official School Broadcasts & Urgent Bulletins</h3>
                <p className="text-xs text-slate-400">Official notifications and announcements published by the Headteacher & designated class supervisors</p>
              </div>
              <span className="text-[10px] font-mono bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-bold">
                Phone Registered: {parentPhone}
              </span>
            </div>

            {relevantNotifications.length === 0 ? (
              <div className="py-12 text-center text-slate-450 font-mono text-xs border border-dashed rounded-2xl w-full">
                No active announcements found for class stream {selectedStudent.classStream}.
              </div>
            ) : (
              <div className="space-y-4">
                {relevantNotifications.map(notif => {
                  const isRead = notif.readBy.includes(parentPhone);
                  
                  let priorityStyles = "bg-slate-100 text-slate-700 border-slate-200";
                  if (notif.priority === 'URGENT') priorityStyles = "bg-rose-50 text-rose-700 border-rose-200 font-extrabold animate-pulse";
                  if (notif.priority === 'SUCCESS') priorityStyles = "bg-emerald-50 text-emerald-700 border-emerald-200";
                  if (notif.priority === 'INFO') priorityStyles = "bg-indigo-50 text-indigo-700 border-indigo-200";

                  return (
                    <div 
                      key={notif.id} 
                      className={`p-5 rounded-2xl border transition-all ${
                        isRead 
                          ? 'bg-slate-50/70 border-slate-150 shadow-none hover:bg-slate-50' 
                          : 'bg-white border-teal-200 shadow hover:shadow-md ring-1 ring-teal-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="space-y-1.5 flex-1 min-w-[200px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${priorityStyles}`}>
                              {notif.priority}
                            </span>
                            <span className="text-[9px] bg-slate-100 text-slate-500 font-mono font-bold uppercase px-2 py-0.5 rounded border border-slate-200">
                              To: {notif.targetStream}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">
                              Published: {notif.date}
                            </span>
                          </div>

                          <h4 className="text-base font-extrabold text-slate-900 leading-snug flex items-center gap-2">
                            {notif.title}
                            {!isRead && (
                              <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0" title="Unread Indicator"></span>
                            )}
                          </h4>
                        </div>

                        {!isRead && (
                          <button
                            onClick={() => {
                              onMarkNotificationAsRead(notif.id, parentPhone);
                              // Emulate HTMX database log for Parent Portal marking a message as read
                              onLogPayload(
                                'HTMX',
                                'POST',
                                `/portal/parent/notifications/read/?id=${notif.id}`,
                                `phone_number=${parentPhone}`,
                                `<p class="p-1.5 bg-sky-950 font-mono text-[9px] text-sky-450 border border-sky-900 rounded">
  Successfully updated read status in django_notification_parents table for ID ${notif.id}.
</p>`
                              );
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-3.5 py-1.5 rounded-lg text-[10px] transition-all cursor-pointer whitespace-nowrap self-start shadow"
                          >
                            Mark as Acknowledged
                          </button>
                        )}
                      </div>

                      <p className="mt-3 text-slate-700 text-xs leading-relaxed max-w-3xl font-medium">
                        {notif.content}
                      </p>

                      <div className="mt-4 pt-3 border-t border-slate-150 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Official Dispatch Signature: <strong className="text-slate-600 font-extrabold">{notif.sender}</strong></span>
                        {isRead ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-100">
                            ✓ Read & Acknowledged
                          </span>
                        ) : (
                          <span className="text-amber-600 font-semibold animate-pulse flex items-center gap-1 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-100">
                            ● Action Suggested
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: SCHOOL CALENDAR */}
        {activeTab === 'calendar' && (
          <div className="space-y-4 animate-fade-in">
            <div className="border-b pb-3 mb-2 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Ranet Junior School Calendar & Milestones</h3>
                <p className="text-xs text-slate-400">Keep track of key dates, holidays, examination cycles, and events updated by school administrators.</p>
              </div>
              <span className="text-[10px] font-mono bg-emerald-50 border border-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                Sync Status: Connected
              </span>
            </div>

            <SchoolCalendar events={calendarEvents} isAdmin={false} />
          </div>
        )}

        {/* TAB 6: STUDENT ATTENDANCE */}
        {activeTab === 'attendance' && (
          <div className="space-y-6 animate-fade-in text-xs font-sans">
            <div className="border-b pb-3 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {selectedStudent ? `${selectedStudent.name}'s Attendance Roll` : 'Student Attendance Registry'}
                </h3>
                <p className="text-xs text-slate-400">View real-time check-roll logs and visual calendar standings taken by class tutors.</p>
              </div>
              <span className="text-[10px] bg-teal-50 border border-teal-150 text-teal-850 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
                Active Class: {selectedStudent?.classStream}
              </span>
            </div>
            {!selectedStudent ? (
              <div className="text-center py-10 bg-slate-50 border rounded-xl">
                <p className="text-slate-500 font-bold">Please select on your associated student child card above.</p>
              </div>
            ) : (() => {
              const studentRecords = attendance.filter(r => r.studentId === selectedStudent.id);
              const presentCount = studentRecords.filter(r => r.status === 'PRESENT').length;
              const lateCount = studentRecords.filter(r => r.status === 'LATE').length;
              const absentCount = studentRecords.filter(r => r.status === 'ABSENT').length;
              const totalDays = studentRecords.length;
              const baseAttendanceRate = totalDays > 0 ? Math.round(((presentCount + lateCount) / totalDays) * 100) : 100;
              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-emerald-50 border border-emerald-150 p-3.5 rounded-2xl flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                        <CheckCircle2 size={15} />
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider leading-none">Days Present</span>
                        <span className="text-slate-800 font-extrabold text-sm">{presentCount} Days</span>
                      </div>
                    </div>
                    <div className="bg-amber-50 border border-amber-150 p-3.5 rounded-2xl flex items-center gap-2.5">
                      <div className="p-2 bg-amber-100 text-amber-800 rounded-xl font-medium">
                        <Clock size={15} />
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider leading-none">Days Late</span>
                        <span className="text-slate-800 font-extrabold text-sm">{lateCount} Days</span>
                      </div>
                    </div>
                    <div className="bg-rose-50 border border-rose-150 p-3.5 rounded-2xl flex items-center gap-2.5 animate-fade-in">
                      <div className="p-2 bg-rose-100 text-rose-800 rounded-xl font-medium">
                        <Clock size={15} />
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider leading-none">Absent / Leaves</span>
                        <span className="text-slate-800 font-extrabold text-sm text-rose-700">{absentCount} Days</span>
                      </div>
                    </div>
                    <div className="bg-teal-50 border border-teal-150 p-3.5 rounded-2xl flex items-center gap-2.5">
                      <div className="p-2 bg-teal-100 text-teal-850 rounded-xl font-medium font-bold">
                        <Award size={15} />
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider leading-none">Attendance rate</span>
                        <span className={`font-black text-sm block ${
                          baseAttendanceRate >= 90 ? 'text-emerald-750' : baseAttendanceRate >= 75 ? 'text-amber-700' : 'text-rose-750'
                        }`}>{baseAttendanceRate}%</span>
                      </div>
                    </div>
                  </div>
                  <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    baseAttendanceRate >= 90 ? 'bg-emerald-50/40 border-emerald-150 text-emerald-950' :
                    baseAttendanceRate >= 75 ? 'bg-amber-50/40 border-amber-150 text-amber-950' :
                    'bg-rose-50/40 border-rose-150 text-rose-955'
                  }`}>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-xs block uppercase tracking-wide">
                        {baseAttendanceRate >= 90 ? 'Excellent Standing Academic Attendance' :
                         baseAttendanceRate >= 75 ? 'Warning: Average Standings' :
                         'critical Standing Notice'}
                      </h4>
                      <p className="text-[11px] text-slate-650 font-medium max-w-2xl leading-relaxed">
                        {baseAttendanceRate >= 90 ? `${selectedStudent.name} is keeping pace beautifully with terminal registers.` :
                         baseAttendanceRate >= 75 ? `${selectedStudent.name} has missed or arrived late to a few classroom lectures.` :
                         `Class registries report significant absenteeism for ${selectedStudent.name}.`}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 7: DAILY PULSE */}
        {activeTab === 'pulse' && (
          <div className="space-y-6">
            <div className="border-b pb-3 mb-2">
              <h3 className="text-base font-extrabold text-slate-900">Daily Pulse Feed</h3>
              <p className="text-xs text-slate-400">Real-time updates on school notices, behavior logs, and health status.</p>
            </div>
            <div className="space-y-5 max-h-[500px] overflow-y-auto">
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <Bell size={14} className="text-indigo-600" /> School Notices
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {notices.length === 0 ? (
                    <p className="text-xs text-slate-400">No recent notices.</p>
                  ) : (
                    notices.map((n) => (
                      <div key={n.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-all">
                        <div className="flex items-start justify-between gap-2">
                          <h5 className="font-bold text-slate-800 text-sm">{n.title}</h5>
                          <span className="text-[9px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">{n.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="pt-4 border-t">
                <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600" /> Behavior Timeline
                </h4>
                <div className="space-y-2">
                  {behaviorLogs.length === 0 ? (
                    <p className="text-xs text-slate-400">No behavior records found.</p>
                  ) : (
                    behaviorLogs.map((log) => (
                      <div key={log.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                        log.logType === 'MERIT' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
                      }`}>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 text-[10px] font-bold rounded ${
                            log.logType === 'MERIT' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                          }`}>
                            {log.logType}
                          </span>
                          <span className="text-xs text-slate-700">{log.description}</span>
                        </div>
                        <span className="text-[9px] text-slate-500">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="pt-4 border-t">
                <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <HeartPulse size={14} className="text-amber-600" /> Health Status Alerts
                </h4>
                <div className="space-y-2">
                  {sickbayLogs.length === 0 ? (
                    <p className="text-xs text-slate-400">No sickbay records.</p>
                  ) : (
                    sickbayLogs.map((log) => (
                      <div key={log.id} className={`p-3 rounded-lg border ${
                        log.notifiedParent ? 'bg-teal-50 border-teal-200' : 'bg-amber-50 border-amber-200'
                      }`}>
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-slate-800">Check-in:</span>
                          <span className="text-xs text-slate-600">{log.symptoms}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[9px] text-slate-500">Treatment: {log.treatmentGiven}</span>
                          {log.notifiedParent ? (
                            <span className="text-[9px] bg-teal-600 text-white px-2 py-0.5 rounded-full">Parent Notified</span>
                          ) : (
                            <span className="text-[9px] bg-amber-600 text-white px-2 py-0.5 rounded-full">Pending</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: HOMEWORK & ASSETS */}
        {activeTab === 'homework' && (
          <div className="space-y-6">
            <div className="border-b pb-3 mb-2">
              <h3 className="text-base font-extrabold text-slate-900">Homework & Assets</h3>
              <p className="text-xs text-slate-400">Pending assignments and currently issued school properties.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <BookOpen size={14} className="text-indigo-600" /> Pending Assignments
                </h4>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {pendingAssignments.length === 0 ? (
                    <div className="py-8 text-center text-slate-400">
                      <p className="text-xs">No pending assignments.</p>
                    </div>
                  ) : (
                    pendingAssignments.map((a) => (
                      <div key={a.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-all">
                        <div className="flex items-start justify-between gap-2">
                          <h5 className="font-bold text-slate-800 text-sm">{a.subject}</h5>
                          <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Due: {new Date(a.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{a.title}</p>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{a.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Package size={14} className="text-emerald-600" /> Issued Assets
                </h4>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {(assets && assets.length > 0) ? (
                    assets.filter(ast => !ast.isReturned).map((ast) => (
                      <div key={ast.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                        <div className="flex items-start justify-between gap-2">
                          <h5 className="font-bold text-slate-800 text-sm">{ast.assetName}</h5>
                          <span className="text-[9px] font-mono text-slate-500 bg-slate-200 px-2 py-0.5 rounded">#{ast.serialNumber}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Issued: {new Date(ast.issuedDate).toLocaleDateString()}</p>
                        <span className="inline-block text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full mt-1">Still Issued</span>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-400">
                      <p className="text-xs">No assets currently issued.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
