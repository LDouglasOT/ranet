import React, { useState } from 'react';
import { 
  Users, UserPlus, BookOpen, GraduationCap, Grid, ClipboardList,
  CheckCircle2, Plus, Trash2, Printer, QrCode, Sparkles, Bell, Send, AlertTriangle,
  Search, Calendar, Clock
} from 'lucide-react';
import { Student, SubjectAssignment, Assessment, User, ClassStream, Subject, Notification, CalendarEvent, CalendarEventType } from '../types';
import CsvStudentImporter from './CsvStudentImporter';
import SchoolCalendar from './SchoolCalendar';
import ReportCardSheet from './ReportCardSheet';

interface AdminPortalProps {
  currentAdmin: { name: string };
  teachers: User[];
  students: Student[];
  assignments: SubjectAssignment[];
  onAddAssignment: (teacherId: string, classStream: ClassStream, subject: Subject) => void;
  onRemoveAssignment: (assignmentId: string) => void;
  assessments: Assessment[];
  onLogPayload: (type: 'HTMX' | 'SSR' | 'SYSTEM', method: 'GET' | 'POST' | 'PUT', url: string, payload: string, response: string) => void;
  onImportStudents: (newStudents: Student[]) => void;
  notifications: Notification[];
  onAddNotification: (newNotification: Omit<Notification, 'id' | 'date' | 'readBy'>) => void;
  calendarEvents: CalendarEvent[];
  onAddCalendarEvent: (newEvent: Omit<CalendarEvent, 'id'>) => void;
  onRemoveCalendarEvent: (id: string) => void;
}

export default function AdminPortal({
  currentAdmin,
  teachers,
  students,
  assignments,
  onAddAssignment,
  onRemoveAssignment,
  assessments,
  onLogPayload,
  onImportStudents,
  notifications,
  onAddNotification,
  calendarEvents,
  onAddCalendarEvent,
  onRemoveCalendarEvent
}: AdminPortalProps) {
  // Input fields for teacher assignment form
  const [selectedTeacherId, setSelectedTeacherId] = useState(teachers[0]?.id || '');
  const [selectedClass, setSelectedClass] = useState<ClassStream>('P.5 Blue');
  const [selectedSubject, setSelectedSubject] = useState<Subject>('Mathematics');
  const [bulkPrintAll, setBulkPrintAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeReportStudent, setActiveReportStudent] = useState<Student | null>(null);

  // Global filtered students list by name or ID in real-time
  const filteredStudents = students.filter(student => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      student.name.toLowerCase().includes(term) ||
      student.id.toLowerCase().includes(term)
    );
  });

  // Notifications Composer State Variables
  const [notifTitle, setNotifTitle] = useState('');
  const [notifContent, setNotifContent] = useState('');
  const [notifStream, setNotifStream] = useState<'ALL' | ClassStream | 'CUSTOM'>('ALL');
  const [notifPriority, setNotifPriority] = useState<'URGENT' | 'NORMAL' | 'SUCCESS' | 'INFO'>('NORMAL');
  const [notifSender, setNotifSender] = useState(currentAdmin.name);
  const [notifSuccessMsg, setNotifSuccessMsg] = useState<string | null>(null);
  
  // Custom group selection states
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [notifGroupSearch, setNotifGroupSearch] = useState('');
  const [notifCohortFilter, setNotifCohortFilter] = useState<'ALL' | ClassStream>('ALL');

  // Calendar Composer State Variables
  const [calTitle, setCalTitle] = useState('');
  const [calType, setCalType] = useState<CalendarEventType>('EVENT');
  const [calStartDate, setCalStartDate] = useState('2026-06-10');
  const [calEndDate, setCalEndDate] = useState('2026-06-10');
  const [calDescription, setCalDescription] = useState('');
  const [calStream, setCalStream] = useState<'ALL' | ClassStream>('ALL');
  const [calSuccessMsg, setCalSuccessMsg] = useState<string | null>(null);

  const handleCreateCalendarEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calTitle.trim() || !calStartDate || !calEndDate) {
      alert("Please provide at least a title, start date, and end date.");
      return;
    }
    
    onAddCalendarEvent({
      title: calTitle.trim(),
      type: calType,
      startDate: calStartDate,
      endDate: calEndDate,
      description: calDescription.trim() || undefined,
      classStream: calStream
    });

    setCalSuccessMsg(`Successfully scheduled calendar event: "${calTitle.trim()}"`);
    setCalTitle('');
    setCalDescription('');
    
    // Log for the system dashboard / htmx logs
    const paramPayload = `title=${encodeURIComponent(calTitle.trim())}&type=${calType}&start=${calStartDate}&end=${calEndDate}&stream=${calStream}`;
    const responseHtml = `<div class="p-3 bg-indigo-950/90 text-indigo-300 font-mono text-[10px] rounded space-y-1">
  <span class="text-white font-extrabold text-xs block">📅 SCHOOL CALENDAR SYNCED</span>
  <p>POST /portal/admin/calendar/add/ &bull; HTTP/1.1 200 OK</p>
  <p class="text-indigo-400 font-semibold">✓ Event scheduled on active term registry for all roles</p>
</div>`;

    onLogPayload('SYSTEM', 'POST', '/portal/admin/calendar/add/', paramPayload, responseHtml);

    setTimeout(() => {
      setCalSuccessMsg(null);
    }, 4000);
  };

  const handleBroadcastNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifContent.trim()) {
      alert("Please fill in both the title and body content for the announcement.");
      return;
    }

    if (notifStream === 'CUSTOM' && selectedStudentIds.length === 0) {
      alert("Please select at least one student or parent for customized broadcast.");
      return;
    }

    // Capture the target parents & students for the broadcast
    let targetStudents: string[] = [];
    let targetParents: string[] = [];
    let targetPhones: string[] = [];

    if (notifStream === 'CUSTOM') {
      selectedStudentIds.forEach(id => {
        const stud = students.find(s => s.id === id);
        if (stud) {
          targetStudents.push(stud.id);
          if (stud.parentName) targetParents.push(stud.parentName);
          if (stud.parentPhone) targetPhones.push(stud.parentPhone);
        }
      });
    }

    onAddNotification({
      title: notifTitle.trim(),
      content: notifContent.trim(),
      sender: notifSender.trim() || "School Admin",
      targetStream: notifStream,
      priority: notifPriority,
      targetSelectedStudents: notifStream === 'CUSTOM' ? targetStudents : undefined,
      targetSelectedParents: notifStream === 'CUSTOM' ? targetParents : undefined,
      targetSelectedPhones: notifStream === 'CUSTOM' ? targetPhones : undefined
    });

    setNotifSuccessMsg(`Successfully broadcasted announcement to ${notifStream === 'CUSTOM' ? `${targetStudents.length} target pupil(s)` : notifStream === 'ALL' ? 'all parent registers' : `parents in ${notifStream}`}: "${notifTitle.trim()}"`);
    setNotifTitle('');
    setNotifContent('');
    setSelectedStudentIds([]); // clear selected custom targets on success

    // Safe HTMX payload log for full administrative console feedback
    const paramPayload = `title=${encodeURIComponent(notifTitle.trim())}&content=${encodeURIComponent(notifContent.trim())}&target=${notifStream}&priority=${notifPriority}&sender=${encodeURIComponent(notifSender)}${notifStream === 'CUSTOM' ? `&selected_recipients_count=${targetStudents.length}` : ''}`;
    const htmxHtmlResponse = `<div class="p-3 bg-emerald-950/90 text-emerald-300 font-mono text-[10px] rounded space-y-1">
  <span class="text-white font-extrabold text-xs block">📡 NATIVE WSGI BROADCAST SENSING</span>
  <p>POST /portal/admin/broadcast-notification/ &bull; HTTP/1.1 200 OK</p>
  <p>Payload: ${paramPayload.substring(0, 110)}...</p>
  <p class="text-emerald-400 font-semibold">✓ Custom target announcement pushed. Specified targets notified.</p>
</div>`;

    onLogPayload(
      'SYSTEM',
      'POST',
      '/portal/admin/broadcast-notification/',
      paramPayload,
      htmxHtmlResponse
    );

    setTimeout(() => {
      setNotifSuccessMsg(null);
    }, 5000);
  };

  // Form error states
  const [errors, setErrors] = useState('');

  const classStreams: ClassStream[] = ['P.5 Blue', 'P.5 Gold', 'P.6 Green', 'P.6 Red', 'P.7 Eagle', 'P.7 Lion'];
  const subjects: Subject[] = ['Mathematics', 'English', 'Science', 'Social Studies'];

  // Calculate high-level school academic metrics
  const totalPupilsNum = students.length;
  const activeAssignmentsNum = assignments.length;
  const avgOverallScore = assessments.length > 0
    ? Math.round(assessments.reduce((sum, ass) => sum + ass.score, 0) / assessments.length)
    : 72;

  // Render stream comparisons using pure CSS graphs
  const STREAM_STATS = [
    { name: 'P.5 Blue stream', avg: 75, passRate: '94%', count: 24 },
    { name: 'P.5 Gold stream', avg: 82, passRate: '98%', count: 18 },
    { name: 'P.6 Green stream', avg: 71, passRate: '90%', count: 32 },
    { name: 'P.6 Red stream', avg: 68, passRate: '88%', count: 29 },
    { name: 'P.7 Eagle (Candidate)', avg: 88, passRate: '100%', count: 41 },
  ];

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors('');

    if (!selectedTeacherId) {
      setErrors('Please select an active teacher first.');
      return;
    }

    // Exclude duplicates
    const alreadyExists = assignments.some(
      as => as.teacherId === selectedTeacherId && 
            as.classStream === selectedClass && 
            as.subject === selectedSubject
    );

    if (alreadyExists) {
      setErrors('A deployment already exists linking this teacher to this class stream and subject.');
      return;
    }

    onAddAssignment(selectedTeacherId, selectedClass, selectedSubject);

    // Simulated Django Database SQL logging injection
    const teacherName = teachers.find(t => t.id === selectedTeacherId)?.name || 'Teacher';
    const sqlStatement = `INSERT INTO django_subject_assignments (teacher_id, class_stream, subject) VALUES ('${selectedTeacherId}', '${selectedClass}', '${selectedSubject}');`;
    const responseHtml = `<tr id="assign-${Date.now()}" class="bg-emerald-50 text-emerald-950 font-semibold transition-all">
  <td class="p-3">${teacherName}</td>
  <td class="p-3">${selectedClass}</td>
  <td class="p-3">${selectedSubject}</td>
  <td class="p-3 text-emerald-600 block text-xs">Assigned Successfully!</td>
</tr>`;

    onLogPayload(
      'SYSTEM', 
      'POST', 
      `/portal/admin/deploy-assignment/`, 
      `teacher_id=${selectedTeacherId}&class_stream=${selectedClass}&subject=${selectedSubject}&sql=${encodeURIComponent(sqlStatement)}`, 
      responseHtml
    );
  };

  const handleDeassign = (assignmentId: string) => {
    onRemoveAssignment(assignmentId);
    
    onLogPayload(
      'SYSTEM', 
      'POST', 
      `/portal/admin/delete-assignment/`, 
      `assignment_id=${assignmentId}`, 
      `<!-- Deleted Row -->\n<div class="banner">Assignment Row ${assignmentId} wiped from database successfully.</div>`
    );
  };

  const [bulkClassStream, setBulkClassStream] = useState<ClassStream | 'ALL'>('ALL');

  // Filter students for bulk booklet printing
  const bulkSelectedStudents = students.filter(student => {
    if (bulkClassStream !== 'ALL' && student.classStream !== bulkClassStream) return false;
    
    // Also respect current research-search filtering if applicable
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      student.name.toLowerCase().includes(term) ||
      student.id.toLowerCase().includes(term)
    );
  });

  return (
    <div id="admin-portal-main" className="space-y-6">
      
      {/* Printable All booklet modal overlay if triggered */}
      {bulkPrintAll && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-[850px] p-6 md:p-10 shadow-2xl rounded-2xl relative border print:p-0 print:border-none">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6 print:hidden">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">BULK-PRINT BATCH REPORT CARD BOOKLET</h2>
                <p className="text-xs text-slate-500">Official PLE Core grading terminal worksheets. Includes live QR validations and student images.</p>
                
                {/* Stream choosing dropdown filter */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Stream:</span>
                  <select
                    value={bulkClassStream}
                    onChange={(e) => setBulkClassStream(e.target.value as any)}
                    className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-[11px] font-bold text-slate-700 outline-none hover:border-slate-300"
                  >
                    <option value="ALL">All Enrolled Streams ({students.length})</option>
                    <option value="P.5 Blue">P.5 Blue</option>
                    <option value="P.5 Gold">P.5 Gold</option>
                    <option value="P.6 Green">P.6 Green</option>
                    <option value="P.6 Red">P.6 Red</option>
                    <option value="P.7 Eagle">P.7 Eagle</option>
                    <option value="P.7 Lion">P.7 Lion</option>
                  </select>
                  <span className="text-[10px] text-slate-400 font-medium">({bulkSelectedStudents.length} Students selected)</span>
                </div>
              </div>
              
              <div className="flex gap-2 shrink-0">
                <button 
                  onClick={() => {
                    window.print();
                    onLogPayload('SYSTEM', 'POST', '/portal/admin/bulk-print/', `pupils_count=${bulkSelectedStudents.length}&class=${bulkClassStream}`, '<!-- Bulk publish booklet initialized -->');
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-4 py-2.5 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Printer size={13} />
                  <span>Download Booklet / Print</span>
                </button>
                <button 
                  onClick={() => setBulkPrintAll(false)}
                  className="bg-slate-150 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold px-4 py-2.5 rounded-lg text-xs cursor-pointer"
                >
                  Close Batch
                </button>
              </div>
            </div>

            {/* Booklet content (Multiple students sequential print sheets) */}
            <div className="space-y-12 max-h-[60vh] overflow-y-auto p-4 border rounded-xl bg-slate-50 scrollbar-thin select-all print:p-0 print:border-none print:max-h-none print:bg-white print:overflow-visible">
              {bulkSelectedStudents.map((pupil, index) => {
                return (
                  <div key={pupil.id} className="bg-white p-2 rounded-xl shadow-xs print:shadow-none print:break-before-page">
                    <ReportCardSheet
                      student={pupil}
                      assessments={assessments}
                      term="Term 3"
                      showPrintButton={false}
                    />
                  </div>
                );
              })}
              {bulkSelectedStudents.length === 0 && (
                <div className="py-16 text-center text-slate-400 font-mono text-xs">
                  No students matched the chosen Stream and Search filter options.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KPI Top Cards layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-xl shadow p-5 border border-slate-150 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl">
            <Users size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">Pupils Registered</span>
            <span className="text-xl md:text-2xl font-black text-slate-900">{totalPupilsNum} Students</span>
            <span className="text-[10px] text-emerald-600 block font-semibold">✓ UNEB compliance ready</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5 border border-slate-150 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl">
            <GraduationCap size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">Normal average grade</span>
            <span className="text-xl md:text-2xl font-black text-slate-900">{avgOverallScore}% Mean</span>
            <span className="text-[10px] text-teal-600 block font-semibold">★ Grade Division A-B median</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5 border border-slate-150 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-amber-50 border border-amber-100 text-amber-700 rounded-xl">
            <BookOpen size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">Course assignments</span>
            <span className="text-xl md:text-2xl font-black text-slate-900">{activeAssignmentsNum} Active</span>
            <span className="text-[10px] text-slate-500 block font-mono">Teachers assigned: {teachers.length}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5 border border-slate-150 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-sky-50 border border-sky-100 text-sky-700 rounded-xl">
            <ClipboardList size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">Staff Engagement</span>
            <span className="text-xl md:text-2xl font-black text-slate-900">100% Online</span>
            <span className="text-[10px] text-sky-600 block font-semibold">Active threads on WSGI</span>
          </div>
        </div>

      </div>

      {/* GLOBAL STUDENT SEARCH & MASTER ROSTER */}
      <div className="bg-white rounded-xl shadow border border-slate-100 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <Users size={16} className="text-indigo-600" />
              Active Student Directory & Credentials Verification
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">
              Filter registered students, verify credentials, unique IDs, anti-forgery PINs, and guardian contact details.
            </p>
          </div>
          
          {/* Global Search Input */}
          <div className="relative max-w-sm w-full md:w-80">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              id="global-student-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student name or unique ID..."
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg py-2 pl-9 pr-4 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400 placeholder:font-normal text-slate-800"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 font-mono text-[10px] uppercase font-bold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
          <div className="overflow-x-auto border border-slate-150 rounded-xl max-h-[300px] overflow-y-auto scrollbar-thin">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-black uppercase text-slate-500 sticky top-0 z-10">
                <th className="p-3 bg-slate-50">Student Unique ID</th>
                <th className="p-3 bg-slate-50">Full Student Name</th>
                <th className="p-3 bg-slate-50">Gender</th>
                <th className="p-3 bg-slate-50">Designated Stream</th>
                <th className="p-3 bg-slate-50">Anti-Forgery PIN</th>
                <th className="p-3 bg-slate-50">Guardian Contact</th>
                <th className="p-3 bg-slate-50 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 font-sans text-slate-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-mono">
                    No active student registers found matching "{searchTerm}".
                  </td>
                </tr>
              ) : (
                filteredStudents.map((pupil) => (
                  <tr key={pupil.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3">
                      <span className="font-mono bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">
                        {pupil.id}
                      </span>
                    </td>
                    <td className="p-3 font-extrabold text-slate-900">
                      {pupil.name}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        pupil.gender === 'Male' 
                          ? 'bg-blue-50 text-blue-700 border-blue-150' 
                          : 'bg-pink-50 text-pink-700 border-pink-150'
                      }`}>
                        {pupil.gender}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-semibold bg-indigo-50 border border-indigo-150 text-indigo-700 px-2 py-0.5 rounded text-[10px] uppercase font-mono">
                        {pupil.classStream}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-mono font-black text-indigo-700 bg-indigo-50/80 border border-indigo-100 px-2.5 py-0.5 rounded text-[11px]">
                        🔑 {pupil.pin}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="leading-tight">
                        <p className="font-bold text-slate-800">{pupil.parentName || "—"}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{pupil.parentPhone || "—"}</p>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setActiveReportStudent(pupil);
                          onLogPayload('SYSTEM', 'GET', `/portal/admin/student/${pupil.id}/report-card`, '', `<!-- Individual report sheet requested for print -->`);
                        }}
                        className="bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 font-extrabold px-3 py-1 pb-1.5 rounded-lg text-[10px] flex items-center gap-1 ml-auto cursor-pointer transition-all shadow-3xs"
                      >
                        <Printer size={11} className="text-indigo-600" />
                        <span>Print Sheet</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Assign Teachers to Specific Subjects & Streams form */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow p-5 border border-slate-100 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100">
              <UserPlus size={15} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Teacher deployment core</h3>
              <p className="text-[10px] text-slate-400">Add or edit classroom teacher capabilities</p>
            </div>
          </div>

          <form onSubmit={handleCreateAssignment} className="space-y-4">
            {errors && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-[11px] rounded-lg font-bold">
                {errors}
              </div>
            )}

            {/* Select teacher */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase block">Registered Teacher</label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 hover:border-slate-300 transition-all cursor-pointer"
              >
                {teachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Select Class stream */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase block">Class Stream Target</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value as ClassStream)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 hover:border-slate-300 transition-all cursor-pointer"
              >
                {classStreams.map(cs => (
                  <option key={cs} value={cs}>{cs}</option>
                ))}
              </select>
            </div>

            {/* Select Subject */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase block">Academic Course Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value as Subject)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 hover:border-slate-300 transition-all cursor-pointer"
              >
                {subjects.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl border border-indigo-500 shadow-sm transition-all text-xs flex items-center justify-center gap-1.5 tracking-wider uppercase"
            >
              <Plus size={14} />
              Deploy & Assign Staff
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Active Deployment registry table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow border border-slate-100 overflow-hidden flex flex-col">
          
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-extrabold text-slate-900">Active deployments database registry</h3>
              <p className="text-[10px] text-slate-400">Class streams and their active classroom supervisors</p>
            </div>

            <button
              onClick={() => setBulkPrintAll(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 border border-slate-950 rounded-lg text-[10px] flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Printer size={12} />
              Bulk-Print Report Sheets
            </button>
          </div>

          <div className="overflow-y-auto max-h-[300px] divide-y divide-slate-150 flex-1 scrollbar-thin">
            {assignments.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-mono">
                No staff assignments found in the active Django model list.
              </div>
            ) : (
              assignments.map((assignment) => (
                <div key={assignment.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs gap-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-extrabold uppercase">
                      {assignment.subject}
                    </span>
                    <h4 className="font-bold text-slate-900 leading-tight block">{assignment.teacherName}</h4>
                    <span className="text-[10px] text-slate-400 font-serif">Class designated: {assignment.classStream}</span>
                  </div>

                  <button
                    onClick={() => handleDeassign(assignment.id)}
                    className="text-slate-400 hover:text-red-600 transition-colors p-1.5 rounded hover:bg-slate-100"
                    title="Remove Assignment Link"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>


      {/* NATIVE ANNOUNCEMENTS BROADCAST BULLETIN */}
      <div id="announcement-broadcast-manager" className="bg-white rounded-xl shadow border border-slate-100 p-5 space-y-5">
        <div className="border-b border-slate-100 pb-4 flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <Bell size={16} className="text-amber-500 animate-bounce" />
              Parental Broadcast Bulletin & Notification Center
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">
              Create and dispatch real-time emergency, academic, and financial reminders directly to parent accounts.
            </p>
          </div>
          <span className="text-[9px] bg-amber-50 text-amber-700 font-bold border border-amber-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Total Dispatch: {notifications.length} Bulletins
          </span>
        </div>

        {notifSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-950 rounded-xl flex items-center gap-2 animate-fade-in text-xs font-semibold">
            <span className="p-1 bg-emerald-500 text-white rounded-full">✓</span>
            <div className="flex-1">{notifSuccessMsg}</div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Composing Panel */}
          <div className="lg:col-span-1 space-y-3.5 bg-slate-50/50 p-4 rounded-xl border border-slate-150">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-1 bg-slate-100 py-1 px-2.5 rounded border inline-block">
              <Send size={11} className="text-indigo-600" />
              Compose Broadcast
            </h4>

            <form onSubmit={handleBroadcastNotification} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Broadcast Recipients</label>
                <select
                  value={notifStream}
                  onChange={(e) => {
                    setNotifStream(e.target.value as any);
                    if (e.target.value !== 'CUSTOM') {
                      setSelectedStudentIds([]);
                    }
                  }}
                  className="w-full bg-white border border-slate-250 hover:border-slate-350 rounded-lg p-2 font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                >
                  <option value="ALL">All Registered Parents (General Broadcast)</option>
                  {classStreams.map(cs => (
                    <option key={cs} value={cs}>Only Parents of {cs}</option>
                  ))}
                  <option value="CUSTOM">🎯 Specific Group of Students/Parents (Bulk Check List)</option>
                </select>
              </div>

              {/* Checkbox-based bulk selection UI for Custom Recipients */}
              {notifStream === 'CUSTOM' && (
                <div className="space-y-3 p-3 bg-indigo-50/50 border border-indigo-150 rounded-lg animate-fade-in text-[11px]">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-1.5">
                    <span className="font-extrabold text-indigo-900 uppercase text-[9px] tracking-wider block">
                      Targeted Recipients ({selectedStudentIds.length} Selected)
                    </span>
                    <span className="text-[9px] text-slate-400 font-semibold font-mono">BULK COMPOSER</span>
                  </div>

                  {/* Refined filtering controls */}
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      placeholder="Search pupil or guardian name..."
                      value={notifGroupSearch}
                      onChange={(e) => setNotifGroupSearch(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                    />

                    <div className="flex items-center gap-1.5">
                      <select
                        value={notifCohortFilter}
                        onChange={(e) => setNotifCohortFilter(e.target.value as any)}
                        className="flex-1 bg-white border border-slate-200 rounded-md p-1 font-semibold text-slate-700 outline-none text-[10px]"
                      >
                        <option value="ALL">All Streams</option>
                        {classStreams.map(cs => (
                          <option key={cs} value={cs}>{cs}</option>
                        ))}
                      </select>

                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const filteredList = students.filter(student => {
                              const textMatch = !notifGroupSearch || 
                                student.name.toLowerCase().includes(notifGroupSearch.toLowerCase()) || 
                                student.parentName?.toLowerCase().includes(notifGroupSearch.toLowerCase()) ||
                                student.id.toLowerCase().includes(notifGroupSearch.toLowerCase());
                              const streamMatch = notifCohortFilter === 'ALL' || student.classStream === notifCohortFilter;
                              return textMatch && streamMatch;
                            });
                            const newIds = Array.from(new Set([...selectedStudentIds, ...filteredList.map(s => s.id)]));
                            setSelectedStudentIds(newIds);
                          }}
                          className="px-1.5 py-0.5 bg-indigo-100 hover:bg-indigo-200 border border-indigo-200 text-indigo-800 font-extrabold rounded text-[9px] cursor-pointer/all tracking-tight"
                        >
                          All Matches
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!notifGroupSearch && notifCohortFilter === 'ALL') {
                              setSelectedStudentIds([]);
                            } else {
                              const filteredList = students.filter(student => {
                                const textMatch = !notifGroupSearch || 
                                  student.name.toLowerCase().includes(notifGroupSearch.toLowerCase()) || 
                                  student.parentName?.toLowerCase().includes(notifGroupSearch.toLowerCase()) ||
                                  student.id.toLowerCase().includes(notifGroupSearch.toLowerCase());
                                const streamMatch = notifCohortFilter === 'ALL' || student.classStream === notifCohortFilter;
                                return textMatch && streamMatch;
                              });
                              const filteredIds = filteredList.map(s => s.id);
                              setSelectedStudentIds(prev => prev.filter(id => !filteredIds.includes(id)));
                            }
                          }}
                          className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-705 font-extrabold rounded text-[9px] cursor-pointer tracking-tight"
                        >
                          Clear Matches
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Scrollable list of parents and pupils */}
                  <div className="max-h-[140px] overflow-y-auto border border-indigo-100 rounded-md divide-y divide-slate-100 bg-white p-1 scrollbar-thin">
                    {(() => {
                      const matchingList = students.filter(student => {
                        const textMatch = !notifGroupSearch || 
                          student.name.toLowerCase().includes(notifGroupSearch.toLowerCase()) || 
                          student.parentName?.toLowerCase().includes(notifGroupSearch.toLowerCase()) ||
                          student.id.toLowerCase().includes(notifGroupSearch.toLowerCase());
                        const streamMatch = notifCohortFilter === 'ALL' || student.classStream === notifCohortFilter;
                        return textMatch && streamMatch;
                      });

                      if (matchingList.length === 0) {
                        return (
                          <p className="p-3 text-center text-slate-400 text-[10px] items-center">
                            No matching students found in register.
                          </p>
                        );
                      }

                      return matchingList.map(student => {
                        const isChecked = selectedStudentIds.includes(student.id);
                        return (
                          <label 
                            key={student.id} 
                            className={`flex items-start gap-2 p-1.5 rounded hover:bg-slate-50 transition-colors cursor-pointer text-left ${
                              isChecked ? 'bg-indigo-50/40' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                                } else {
                                  setSelectedStudentIds(prev => [...prev, student.id]);
                                }
                              }}
                              className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-100 h-3.5 w-3.5 cursor-pointer accent-indigo-600"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-extrabold text-slate-800 text-[10.5px] truncate flex items-center justify-between">
                                <span>{student.name}</span>
                                <span className="text-[8px] bg-slate-100 text-slate-650 px-1 border border-slate-200 rounded font-normal shrink-0">
                                  {student.classStream}
                                </span>
                              </p>
                              <p className="text-[10px] text-slate-500 font-medium truncate">
                                Guardian: {student.parentName || "Unknown"} (📞 {student.parentPhone})
                              </p>
                            </div>
                          </label>
                        );
                      });
                    })()}
                  </div>

                  <div className="flex items-center justify-between text-[9px] font-mono text-indigo-900/80 font-bold border-t border-indigo-100 pt-1">
                    <span>Active catalog: {students.length} students</span>
                    <span className="bg-indigo-100 font-bold px-1.5 py-0.5 rounded border border-indigo-200">
                      🎯 {selectedStudentIds.length} Chosen
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block">Severity Priority</label>
                  <select
                    value={notifPriority}
                    onChange={(e) => setNotifPriority(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="NORMAL">Normal Info (Slate)</option>
                    <option value="URGENT">⚠️ Emergency / Urgent (Red)</option>
                    <option value="SUCCESS">✓ Success / Celebration (Emerald)</option>
                    <option value="INFO">🔍 Target Advisory (Blue)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block">Dispatched By</label>
                  <input
                    type="text"
                    value={notifSender}
                    onChange={(e) => setNotifSender(e.target.value)}
                    placeholder="Signature sender name"
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Bulletin Title</label>
                <input
                  type="text"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="e.g. Visitation day update, fee reminder"
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Message Content</label>
                <textarea
                  value={notifContent}
                  onChange={(e) => setNotifContent(e.target.value)}
                  placeholder="Draft detailed description to display in parent dashboards..."
                  rows={4}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2.5 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 uppercase font-mono tracking-wider cursor-pointer"
              >
                <Send size={13} />
                Emit Broadcast
              </button>
            </form>
          </div>

          {/* History / Sent Log List */}
          <div className="lg:col-span-2 flex flex-col border border-slate-150 rounded-xl overflow-hidden bg-slate-50/20">
            <div className="bg-slate-50 p-3 border-b border-slate-150 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Active Bulletin Registry & Parent Engagement Feed
              </span>
              <span className="text-[9px] text-slate-400 font-mono">Live synchronization</span>
            </div>

            <div className="divide-y divide-slate-150 max-h-[340px] overflow-y-auto scrollbar-thin flex-1 text-xs">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-mono">
                  There are no announcements currently registered in database memory.
                </div>
              ) : (
                notifications.map((notif) => {
                  let badgeColors = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (notif.priority === 'URGENT') badgeColors = 'bg-rose-50 text-rose-700 border-rose-200';
                  if (notif.priority === 'SUCCESS') badgeColors = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  if (notif.priority === 'INFO') badgeColors = 'bg-indigo-50 text-indigo-700 border-indigo-200';

                  const readCount = notif.readBy.length;

                  return (
                    <div key={notif.id} className="p-4 hover:bg-white transition-colors space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${badgeColors}`}>
                              {notif.priority}
                            </span>
                            <span className="text-[9px] bg-indigo-50 text-indigo-750 px-1.5 py-0.5 rounded font-mono font-bold uppercase border border-indigo-150">
                              Recipients: {notif.targetStream === 'CUSTOM' ? `CUSTOM GROUP (${notif.targetSelectedStudents?.length || 0} Targets)` : notif.targetStream}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">
                              {notif.date}
                            </span>
                          </div>
                          <h5 className="font-extrabold text-slate-900 text-sm leading-tight">{notif.title}</h5>
                        </div>

                        {/* Read count diagnostics */}
                        <div className="shrink-0 text-right">
                          <span className={`inline-block px-2 py-1 rounded-full text-[9px] font-extrabold border ${
                            readCount > 0 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            👁 {readCount === 0 ? 'No reads yet' : readCount === 1 ? 'Read by 1 guardian' : `Read by ${readCount} guardians`}
                          </span>
                        </div>
                      </div>

                      <p className="text-slate-600 leading-relaxed text-[11px] font-medium bg-slate-50/50 p-2.5 rounded border border-slate-100">
                        {notif.content}
                      </p>

                      {notif.targetStream === 'CUSTOM' && notif.targetSelectedParents && notif.targetSelectedParents.length > 0 && (
                        <div className="bg-slate-100/50 border border-slate-200/60 rounded-md p-2 text-[10px] text-slate-500 font-mono">
                          <span className="font-bold text-slate-700 block uppercase text-[8px] tracking-wider mb-1">🎯 Targeted Guardians:</span>
                          <span className="break-words line-clamp-2" title={notif.targetSelectedParents.join(', ')}>
                            {notif.targetSelectedParents.join(', ')}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span>Dispatched signature: <strong>{notif.sender}</strong></span>
                        <span className="font-mono text-[9px] text-slate-300 font-semibold uppercase">ID: {notif.id}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SHARED CAMPUS CALENDAR MANAGER ENGINE */}
      <div id="school-calendar-manager" className="bg-white rounded-xl shadow border border-slate-100 p-5 space-y-5">
        <div className="border-b border-slate-100 pb-4 flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <Calendar size={16} className="text-emerald-600" />
              Kampala Campus Shared Academic Calendar & Term Milestones
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">
              Post term boundaries, national holidays, visitation days, and critical examination schedules. Real-time updates push automatically to teacher panels and guard viewports.
            </p>
          </div>
          <span className="text-[9px] bg-emerald-100 text-emerald-850 px-2.5 py-1 rounded font-mono font-black uppercase border border-emerald-200">
            Term Registry: Live
          </span>
        </div>

        {calSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-800 text-xs rounded-lg flex items-center gap-2 animate-fade-in font-semibold">
            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            <span>{calSuccessMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Event Creation Panel */}
          <div className="lg:col-span-1 space-y-3.5 bg-slate-50/50 p-4 rounded-xl border border-slate-150">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-1 bg-slate-100 py-1 px-2.5 rounded border inline-block">
              <Plus size={11} className="text-emerald-600" />
              Schedule Event Block
            </h4>

            <form onSubmit={handleCreateCalendarEvent} className="space-y-3 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Event Title</label>
                <input
                  type="text"
                  placeholder="e.g. End of Term 3 UNEB Promos"
                  value={calTitle}
                  onChange={(e) => setCalTitle(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block">Event Type</label>
                  <select
                    value={calType}
                    onChange={(e) => setCalType(e.target.value as CalendarEventType)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 font-semibold text-slate-705 outline-none col-span-1"
                  >
                    <option value="TERM_DATES">Term Boundaries</option>
                    <option value="PUBLIC_HOLIDAY">Public Holiday</option>
                    <option value="EXAMS">Exam Period</option>
                    <option value="EVENT">School Activity</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block">Cohort Scope</label>
                  <select
                    value={calStream}
                    onChange={(e) => setCalStream(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 font-semibold text-slate-705 outline-none col-span-1"
                  >
                    <option value="ALL">All Classes</option>
                    {['P.5 Blue', 'P.5 Gold', 'P.6 Green', 'P.6 Red', 'P.7 Eagle', 'P.7 Lion'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block">Start Date</label>
                  <input
                    type="date"
                    value={calStartDate}
                    onChange={(e) => setCalStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block">End Date (Incl.)</label>
                  <input
                    type="date"
                    value={calEndDate}
                    onChange={(e) => setCalEndDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Short Synopsis / description</label>
                <textarea
                  placeholder="Detail guidelines, requirements, uniform changes, or notes..."
                  value={calDescription}
                  onChange={(e) => setCalDescription(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500 min-h-[50px] resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-[11px] font-bold shadow-sm transition-all focus:ring-2 focus:ring-emerald-100 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus size={12} />
                <span>Publish Term Date Block</span>
              </button>
            </form>
          </div>

          {/* Active Calendar Dashboard */}
          <div className="lg:col-span-2">
            <SchoolCalendar
              events={calendarEvents}
              isAdmin={true}
              onRemoveEvent={onRemoveCalendarEvent}
            />
          </div>
        </div>
      </div>

      {/* CSV Roster Importer Tool */}
      <CsvStudentImporter
        students={students}
        onImportStudents={onImportStudents}
        onLogPayload={onLogPayload}
      />

      {/* Bottom Area: Stream-by-stream class comparison dashboard */}
      <div className="bg-white rounded-xl shadow border border-slate-100 p-5 space-y-4">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">Class Stream Performance Grids</h3>
          <p className="text-[10px] text-slate-400">Comparison diagnostics compiled across overall terminal grades</p>
        </div>

        {/* Graphical dashboard using custom styling */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {STREAM_STATS.map((stream) => (
            <div key={stream.name} className="p-4 border rounded-xl bg-slate-50 hover:bg-slate-50/50 transition-all space-y-3 shadow-sm hover:shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">{stream.name}</h4>
                  <span className="text-[10px] text-slate-400 font-mono">Registered Class Volume: {stream.count} pupils</span>
                </div>
                <div className="text-right">
                  <span className="text-xs bg-indigo-50 text-indigo-800 font-black px-2.5 py-0.5 rounded-full border border-indigo-150">
                    {stream.avg}% Avg
                  </span>
                </div>
              </div>

              {/* Progress bar representing performance index */}
              <div className="space-y-1">
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${stream.avg}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase">
                  <span>Lowest Threshold</span>
                  <span className="text-indigo-600">UNEB Pass Median Rate: {stream.passRate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}