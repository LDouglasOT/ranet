import React, { useState, useEffect, useRef } from 'react';
import { 
  FileSpreadsheet, Lock, Unlock, CheckCircle, AlertTriangle, 
  Sparkles, MessageSquare, RefreshCw, BarChart2, BookOpen, Users, Calendar,
  TrendingUp, Award, HelpCircle, Brain, UserCheck
} from 'lucide-react';
import { Student, SubjectAssignment, Assessment, AssessmentType, Term, CalendarEvent, AttendanceRecord } from '../types';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, Cell 
} from 'recharts';
import SchoolCalendar from './SchoolCalendar';
import AttendanceManager from './AttendanceManager';
import StudentGrowthModal from './StudentGrowthModal';

interface TeacherPortalProps {
  currentTeacher: { id: string; name: string };
  students: Student[];
  assignments: SubjectAssignment[];
  assessments: Assessment[];
  onUpdateAssessment: (assessmentId: string, studentId: string, subject: string, type: AssessmentType, score: number) => void;
  onLockAssignment: (classStream: string, subject: string, locked: boolean) => void;
  lockedSheets: Record<string, boolean>; // key: "classStream|subject" -> true
  onLogPayload: (type: 'HTMX' | 'SSR' | 'SYSTEM', method: 'GET' | 'POST' | 'PUT', url: string, payload: string, response: string) => void;
  calendarEvents: CalendarEvent[];
  attendance: AttendanceRecord[];
  onSaveAttendance: (records: AttendanceRecord[]) => void;
}

export default function TeacherPortal({
  currentTeacher,
  students,
  assignments,
  assessments,
  onUpdateAssessment,
  onLockAssignment,
  lockedSheets,
  onLogPayload,
  calendarEvents,
  attendance,
  onSaveAttendance
}: TeacherPortalProps) {
  const teacherAssignments = assignments.filter(as => as.teacherId === currentTeacher.id);
  
  const [selectedSheet, setSelectedSheet] = useState<SubjectAssignment | null>(
    teacherAssignments[0] || null
  );
  const [activeTerm, setActiveTerm] = useState<Term>('Term 3'); // active current term for input
  const [showCalendar, setShowCalendar] = useState(true); // default to true on start for prominence
  const [showAttendance, setShowAttendance] = useState(true); // show attendance controller automatically
  const [savingStatus, setSavingStatus] = useState<Record<string, 'idle' | 'saving' | 'saved'>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [customComments, setCustomComments] = useState<Record<string, string>>({}); // studentId -> comment
  const [activeCommentStudent, setActiveCommentStudent] = useState<string | null>(null);
  const [selectedTimelineStudent, setSelectedTimelineStudent] = useState<Student | null>(null);
  const [aiDraftingId, setAiDraftingId] = useState<string | null>(null);

  // Visual Chart and score distribution state
  const [showVisualAnalytics, setShowVisualAnalytics] = useState(true);
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<AssessmentType | 'FINAL'>('FINAL');
  const [autoGradeEnabled, setAutoGradeEnabled] = useState(true);

  // Gemini AI Academic Insights State
  const [aiInsightsOpen, setAiInsightsOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMode, setAiMode] = useState<'student' | 'class'>('student');
  const [aiSelectedStudentId, setAiSelectedStudentId] = useState<string>('');
  const [aiResult, setAiResult] = useState<string>('');
  const [aiIsSimulated, setAiIsSimulated] = useState(false);
  const [aiNotice, setAiNotice] = useState<string>('');
  const [aiError, setAiError] = useState<string>('');

  // Debounce timers for Excel-like auto save on keyup delay: 500ms
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const handleGenerateAcademicInsight = async () => {
    if (!selectedSheet) return;
    setAiLoading(true);
    setAiError('');
    setAiNotice('');
    setAiResult('');

    try {
      let payload: any = {};
      
      if (aiMode === 'student') {
        if (!aiSelectedStudentId) {
          setAiError("Please select a student first to run individual evaluation.");
          setAiLoading(false);
          return;
        }

        const student = activeStudents.find(s => s.id === aiSelectedStudentId);
        if (!student) {
          setAiError("Selected student registration not found.");
          setAiLoading(false);
          return;
        }

        const testScore = getScore(student.id, 'TEST');
        const midScore = getScore(student.id, 'MID-TERM');
        const endScore = getScore(student.id, 'END-OF-TERM');

        const qVal = parseFloat(testScore) || 0;
        const mVal = parseFloat(midScore) || 0;
        const eVal = parseFloat(endScore) || 0;
        const hasAny = testScore !== '' || midScore !== '' || endScore !== '';
        const finalWeighted = hasAny ? Math.round((qVal * 0.20) + (mVal * 0.30) + (eVal * 0.50)) : 0;
        const finalGrade = getLetterGrade(hasAny ? finalWeighted : '').grade;

        payload = {
          type: 'student',
          subject: selectedSheet.subject,
          studentData: {
            name: student.name,
            testScore,
            midScore,
            endScore,
            finalWeighted,
            finalGrade
          }
        };
      } else {
        // Class summary
        const studentSummaryList = activeStudents.map(student => {
          const testScore = getScore(student.id, 'TEST');
          const midScore = getScore(student.id, 'MID-TERM');
          const endScore = getScore(student.id, 'END-OF-TERM');

          const qVal = parseFloat(testScore) || 0;
          const mVal = parseFloat(midScore) || 0;
          const eVal = parseFloat(endScore) || 0;
          const hasAny = testScore !== '' || midScore !== '' || endScore !== '';
          const finalWeighted = hasAny ? Math.round((qVal * 0.20) + (mVal * 0.30) + (eVal * 0.50)) : 0;
          const finalGrade = getLetterGrade(hasAny ? finalWeighted : '').grade;

          return {
            name: student.name,
            weighted: finalWeighted,
            grade: finalGrade
          };
        }).filter(item => item.weighted > 0);

        if (studentSummaryList.length === 0) {
          setAiError("No student scores have been entered for this subject stream yet.");
          setAiLoading(false);
          return;
        }

        const totalSum = studentSummaryList.reduce((sum, item) => sum + item.weighted, 0);
        const classAverage = Math.round(totalSum / studentSummaryList.length);
        const classMax = Math.max(...studentSummaryList.map(item => item.weighted));
        const classMin = Math.min(...studentSummaryList.map(item => item.weighted));

        payload = {
          type: 'class',
          subject: selectedSheet.subject,
          classData: {
            classStream: selectedSheet.classStream,
            studentSummaryList,
            classAverage,
            classMax,
            classMin
          }
        };
      }

      onLogPayload(
        'SYSTEM',
        'POST',
        `/api/insights/generate`,
        JSON.stringify(payload, null, 2),
        `<!-- Initiated server-side proxy query to Gemini model: gemini-3.5-flash -->`
      );

      const response = await fetch('/api/insights/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP Error Status: ${response.status}`);
      }

      const resData = await response.json();
      if (resData.success) {
        setAiResult(resData.insights);
        setAiIsSimulated(!!resData.isSimulated);
        if (resData.notice) {
          setAiNotice(resData.notice);
        }
        
        onLogPayload(
          'SSR',
          'POST',
          `/api/insights/generate`,
          `completed_type=${payload.type}`,
          `<div class="p-2 bg-[#020617] text-[#38bdf8] font-mono text-[9px] rounded leading-relaxed border border-slate-700/60 shadow-md">
  <span class="text-white font-extrabold block">🧠 AI MODEL RESPONSE SUCCESSFUL</span>
  <p>Response Mode: <span class="bg-indigo-900/50 text-indigo-200 px-1 rounded">${resData.isSimulated ? "Simulated Backup" : "Live Gemini"}</span></p>
  <pre class="bg-black/40 p-1.5 mt-1 rounded whitespace-pre-wrap max-h-[140px] overflow-y-auto font-medium text-slate-300 select-text">${resData.insights.substring(0, 150)}...</pre>
</div>`
        );
      } else {
        throw new Error(resData.error || "Failed loading summary analysis.");
      }
    } catch (e: any) {
      console.error(e);
      setAiError(e.message || "Unable to retrieve insights. Check your network or API settings.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAiComment = () => {
    if (aiMode === 'student' && aiSelectedStudentId && aiResult) {
      setCustomComments(prev => ({
        ...prev,
        [aiSelectedStudentId]: aiResult
      }));
      onLogPayload(
        'SYSTEM',
        'PUT',
        `/portal/teacher/comments/save/`,
        `student_id=${aiSelectedStudentId}&ai_comment=${encodeURIComponent(aiResult)}`,
        `<!-- AI insights comment successfully linked to direct record column -->`
      );
    }
  };

  useEffect(() => {
    // Whenever teacher changes or loads first time, reset sheet if invalid
    if (teacherAssignments.length > 0 && !selectedSheet) {
      setSelectedSheet(teacherAssignments[0]);
    }
  }, [currentTeacher, teacherAssignments, selectedSheet]);

  const activeStudents = selectedSheet
    ? students.filter(s => s.classStream === selectedSheet.classStream)
    : [];

  const isSheetLocked = selectedSheet 
    ? !!lockedSheets[`${selectedSheet.classStream}|${selectedSheet.subject}`]
    : false;

  // Fetch or resolve score
  const getScore = (studentId: string, type: AssessmentType): string => {
    if (!selectedSheet) return '';
    const ass = assessments.find(
      a => a.studentId === studentId && 
           a.subject === selectedSheet.subject && 
           a.type === type && 
           a.term === activeTerm
    );
    return ass ? ass.score.toString() : '';
  };

  const getLetterGrade = (scoreText: string | number) => {
    const scoreNum = typeof scoreText === 'number' ? scoreText : parseFloat(scoreText);
    if (scoreText === '' || isNaN(scoreNum)) {
      return { grade: '-', grade_name: 'No Score', color: 'bg-slate-100 text-slate-400 border-slate-200 text-slate-450 font-medium' };
    }
    if (scoreNum >= 90) {
      return { grade: 'A', grade_name: 'Excellent Distinction', color: 'bg-emerald-100 text-emerald-800 border-emerald-300 text-emerald-900 font-extrabold' };
    }
    if (scoreNum >= 80) {
      return { grade: 'B', grade_name: 'Very Good Credit', color: 'bg-indigo-100 text-indigo-800 border-indigo-300 text-indigo-900 font-extrabold' };
    }
    if (scoreNum >= 70) {
      return { grade: 'C', grade_name: 'Good Credit', color: 'bg-cyan-100 text-cyan-800 border-cyan-300 text-cyan-900 font-bold' };
    }
    if (scoreNum >= 60) {
      return { grade: 'D', grade_name: 'Satisfactory Pass', color: 'bg-amber-100 text-amber-800 border-amber-300 text-amber-900 font-bold' };
    }
    if (scoreNum >= 50) {
      return { grade: 'E', grade_name: 'Marginal Pass', color: 'bg-orange-100 text-orange-850 border-orange-300 text-orange-950 font-medium' };
    }
    return { grade: 'F', grade_name: 'Failing / Remedial', color: 'bg-rose-100 text-rose-800 border-rose-300 text-rose-950 font-bold' };
  };

  // Dynamic Score Analytics & Recharts Data pre-processing
  const getAnalyticsAndDistributionData = () => {
    if (!selectedSheet || activeStudents.length === 0) {
      return { 
        chartData: [], 
        stats: { avg: 0, peak: 0, passRate: 0, total: 0, remedialCount: 0 } 
      };
    }

    let totalScore = 0;
    let peakScore = 0;
    let passCount = 0;
    let remedialCount = 0;
    
    // Group grades using Ugandan UNEB conventions
    const bins = {
      '90-100 (D1)': { count: 0, label: 'D1 (Distinction)', color: '#4f46e5' }, // indigo-600
      '80-89 (D2)': { count: 0, label: 'D2 (Distinction)', color: '#6366f1' },  // indigo-500
      '70-79 (C3-4)': { count: 0, label: 'Credit (C3/C4)', color: '#06b6d4' },  // cyan-500
      '60-69 (C5-6)': { count: 0, label: 'Credit (C5/C6)', color: '#10b981' },  // emerald-500
      '50-59 (P7-8)': { count: 0, label: 'Pass (P7/P8)', color: '#f59e0b' },    // amber-500
      'Below 50 (F9)': { count: 0, label: 'F9 (Failing)', color: '#ef4444' }    // red-500
    };

    const studentScores = activeStudents.map(student => {
      const q = parseFloat(getScore(student.id, 'TEST')) || 0;
      const m = parseFloat(getScore(student.id, 'MID-TERM')) || 0;
      const e = parseFloat(getScore(student.id, 'END-OF-TERM')) || 0;
      
      let finalVal = 0;
      if (selectedAnalysisType === 'TEST') {
        finalVal = q;
      } else if (selectedAnalysisType === 'MID-TERM') {
        finalVal = m;
      } else if (selectedAnalysisType === 'END-OF-TERM') {
        finalVal = e;
      } else {
        // Weighted final term grade
        finalVal = Math.round((q * 0.20) + (m * 0.30) + (e * 0.50));
      }
      return finalVal;
    });

    studentScores.forEach(score => {
      totalScore += score;
      if (score > peakScore) peakScore = score;
      if (score >= 50) passCount++;
      if (score < 50) remedialCount++;

      if (score >= 90) {
        bins['90-100 (D1)'].count++;
      } else if (score >= 80) {
        bins['80-89 (D2)'].count++;
      } else if (score >= 70) {
        bins['70-79 (C3-4)'].count++;
      } else if (score >= 60) {
        bins['60-69 (C5-6)'].count++;
      } else if (score >= 50) {
        bins['50-59 (P7-8)'].count++;
      } else {
        bins['Below 50 (F9)'].count++;
      }
    });

    const totalStudents = activeStudents.length;
    const avgScore = totalStudents > 0 ? Math.round(totalScore / totalStudents) : 0;
    const passRate = totalStudents > 0 ? Math.round((passCount / totalStudents) * 100) : 0;

    const chartData = Object.entries(bins).map(([key, value]) => ({
      range: key,
      'Pupils': value.count,
      label: value.label,
      color: value.color
    }));

    return {
      chartData,
      stats: {
        avg: avgScore,
        peak: peakScore,
        passRate,
        total: totalStudents,
        remedialCount
      }
    };
  };

  const { chartData, stats } = getAnalyticsAndDistributionData();

  // Auto-fill template comments
  const handleCommentGenerate = (student: Student, templateType: 'excellent' | 'improving' | 'warning') => {
    const pronoun = student.gender === 'Male' ? 'He' : 'She';
    const objectPronoun = student.gender === 'Male' ? 'him' : 'her';
    const possessive = student.gender === 'Male' ? 'His' : 'Her';
    
    let text = '';
    if (templateType === 'excellent') {
      text = `An outstanding academic performance! [Name] is highly focused, disciplined, and participates effectively. [He/She] continues to set an admirable standard in [Subject].`;
    } else if (templateType === 'improving') {
      text = `Steady academic progress made by [Name] this term. [He/She] displays critical potential but needs to dedicate more hours to practicing [Subject] home tasks. Keep it up!`;
    } else {
      text = `A worrying step backward. [Name] is struggling heavily with foundational keys in [Subject]. [He/She] requires intensive personal remediation and strict supervision.`;
    }

    // Replace tokens
    const populated = text
      .replace(/\[Name\]/g, student.name.split(' ')[0])
      .replace(/\[He\/She\]/g, pronoun)
      .replace(/\[Subject\]/g, selectedSheet?.subject || 'the subject');

    setCustomComments(prev => ({
      ...prev,
      [student.id]: populated
    }));

    // Raise HTMX Logger for comment generation (simulation)
    const logDetails = `SELECT template FROM django_comments WHERE type='${templateType}'`;
    const responseHtml = `<div id="comment-${student.id}" class="comment-bubble font-normal text-[#4f46e5] text-sm bg-[#e0e7ff] p-3 rounded-lg border border-[#c7d2fe]">
  <div class="font-bold flex items-center gap-1"><span class="text-xs text-indigo-500">Auto-Generated Comment</span></div>
  <p>"${populated}"</p>
</div>`;

    onLogPayload(
      'HTMX', 
      'POST', 
      `/portal/teacher/comment-generate/`, 
      `student_id=${student.id}&template=${templateType}&subject=${selectedSheet?.subject}`, 
      responseHtml
    );
  };

  const handleGenerateAiComment = async (student: Student) => {
    if (!selectedSheet) return;
    setAiDraftingId(student.id);

    try {
      const testScore = getScore(student.id, 'TEST');
      const midScore = getScore(student.id, 'MID-TERM');
      const endScore = getScore(student.id, 'END-OF-TERM');

      const qVal = parseFloat(testScore) || 0;
      const mVal = parseFloat(midScore) || 0;
      const eVal = parseFloat(endScore) || 0;
      const hasAny = testScore !== '' || midScore !== '' || endScore !== '';
      const finalWeighted = hasAny ? Math.round((qVal * 0.20) + (mVal * 0.30) + (eVal * 0.50)) : 0;
      const finalGrade = getLetterGrade(hasAny ? finalWeighted : '').grade;

      const payload = {
        type: 'student',
        subject: selectedSheet.subject,
        studentData: {
          name: student.name,
          testScore,
          midScore,
          endScore,
          finalWeighted,
          finalGrade
        }
      };

      onLogPayload(
        'SYSTEM',
        'POST',
        `/api/insights/generate`,
        JSON.stringify(payload, null, 2),
        `<!-- Initiated server-side proxy query to Gemini model: gemini-3.5-flash for grid comment -->`
      );

      const response = await fetch('/api/insights/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP Error Status: ${response.status}`);
      }

      const resData = await response.json();
      if (resData.success) {
        setCustomComments(prev => ({
          ...prev,
          [student.id]: resData.insights
        }));

        onLogPayload(
          'SSR',
          'POST',
          `/api/insights/generate`,
          `completed_student_id=${student.id}`,
          `<div class="p-2 bg-[#020617] text-[#38bdf8] font-mono text-[9px] rounded leading-relaxed border border-slate-700/60 shadow-md">
  <span class="text-white font-extrabold block">🧠 AI DRAFT COMMENT COMPLETED</span>
  <p>Student: ${student.name}</p>
  <p>Response Mode: <span class="bg-indigo-900/50 text-indigo-200 px-1 rounded">${resData.isSimulated ? "Simulated Backup" : "Live Gemini"}</span></p>
  <pre class="bg-black/40 p-1.5 mt-1 rounded whitespace-pre-wrap max-h-[140px] overflow-y-auto font-medium text-slate-300 select-text">${resData.insights}</pre>
</div>`
        );
      } else {
        throw new Error(resData.error || "Failed draft query.");
      }
    } catch (e: any) {
      console.error(e);
      // Construct an elegant feedback fallback safely using local formula benchmarks
      const testScore = getScore(student.id, 'TEST');
      const midScore = getScore(student.id, 'MID-TERM');
      const endScore = getScore(student.id, 'END-OF-TERM');

      const qVal = parseFloat(testScore) || 0;
      const mVal = parseFloat(midScore) || 0;
      const eVal = parseFloat(endScore) || 0;
      const hasAny = testScore !== '' || midScore !== '' || endScore !== '';
      const finalWeighted = hasAny ? Math.round((qVal * 0.20) + (mVal * 0.30) + (eVal * 0.50)) : 0;

      let draft = "";
      if (finalWeighted >= 80) {
        draft = `Excellent academic standing! ${student.name.split(' ')[0]} displays remarkable aptitude and consistency in ${selectedSheet.subject} assessments this term.`;
      } else if (finalWeighted >= 65) {
        draft = `${student.name.split(' ')[0]} exhibits a sound understanding of terminal modules in ${selectedSheet.subject}. Sustained revision will guarantee exceptional output.`;
      } else {
        draft = `Targeted homework support is recommended for ${student.name.split(' ')[0]} to close understanding gaps and master fundamental aspects in ${selectedSheet.subject}.`;
      }

      setCustomComments(prev => ({
        ...prev,
        [student.id]: draft
      }));
    } finally {
      setAiDraftingId(null);
    }
  };

  const handleScoreChange = (studentId: string, type: AssessmentType, rawValue: string) => {
    if (!selectedSheet) return;
    const value = rawValue.trim();
    const cellId = `${studentId}-${type}`;

    // Clean previous validation error
    setValidationErrors(prev => {
      const copy = { ...prev };
      delete copy[cellId];
      return copy;
    });

    // Score validation
    const parsed = parseInt(value, 10);
    if (value !== '' && (isNaN(parsed) || parsed < 0 || parsed > 100)) {
      setValidationErrors(prev => ({
        ...prev,
        [cellId]: 'Scores must be between 0 and 100'
      }));
      return;
    }

    // Trigger grid spinner 'auto-saving'
    setSavingStatus(prev => ({ ...prev, [cellId]: 'saving' }));

    // Clear previous debounce timer
    if (debounceTimers.current[cellId]) {
      clearTimeout(debounceTimers.current[cellId]);
    }

    // HTMX hx-post keyup change delay:500ms simulation
    debounceTimers.current[cellId] = setTimeout(() => {
      const finalScore = value === '' ? 0 : parsed;
      onUpdateAssessment(selectedSheet.subject, studentId, selectedSheet.subject, type, finalScore);
      
      setSavingStatus(prev => ({ ...prev, [cellId]: 'saved' }));
      
      // Simulate underlying Django update HTMX log
      const studentName = students.find(s => s.id === studentId)?.name || 'Pupil';
      const payload = `student_id=${studentId}&subject=${selectedSheet.subject}&type=${type}&term=${activeTerm}&score=${finalScore}&csrfmiddlewaretoken=dJ6df83k2mN1oqP9a`
      const responseHtml = `<td id="cell-${studentId}-${type}" class="p-2 transition-all duration-300 bg-emerald-500/20 text-emerald-800 font-bold border border-emerald-300/60 flex items-center gap-1.5 rounded">
  <span>${finalScore}</span>
  <span class="text-[9px] text-emerald-600 font-normal">hx-saved!</span>
</td>`;

      onLogPayload('HTMX', 'POST', `/api/marks/save/`, payload, responseHtml);

      // Reset 'saved' badge back to idle after 1500ms
      setTimeout(() => {
        setSavingStatus(prev => {
          if (prev[cellId] === 'saved') {
            return { ...prev, [cellId]: 'idle' };
          }
          return prev;
        });
      }, 1500);

    }, 500);
  };

  const handleLockToggle = () => {
    if (!selectedSheet) return;
    const key = `${selectedSheet.classStream}|${selectedSheet.subject}`;
    const nextState = !isSheetLocked;
    onLockAssignment(selectedSheet.classStream, selectedSheet.subject, nextState);

    // Logs the lockdown
    const payload = `class_stream=${selectedSheet.classStream}&subject=${selectedSheet.subject}&action=${nextState ? 'lock' : 'unlock'}`;
    const responseHtml = `<div class="lock-card bg-rose-50 text-rose-800 p-4 rounded-xl border border-rose-200">
  <h4 class="font-bold flex items-center gap-1 text-sm"><span class="text-rose-600">Locked Sheets Notice</span></h4>
  <p class="text-xs text-rose-700">Workbook for ${selectedSheet.classStream} (${selectedSheet.subject}) has been frozen and submitted to the Director of Studies (DOS).</p>
</div>`;

    onLogPayload(
      'SYSTEM', 
      'POST', 
      `/portal/teacher/lock-sheet/`, 
      payload, 
      responseHtml
    );
  };

  return (
    <div id="teacher-portal" className="space-y-6">
      {/* Teacher Profile Info banner */}
      <div className="bg-gradient-to-r from-indigo-800 to-indigo-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 h-44 w-44 rounded-full bg-indigo-700/30 blur-2xl"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-3.5 rounded-xl border border-indigo-400/30">
              <FileSpreadsheet className="text-white" size={28} />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200 block">Registered Teacher Portal</span>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">{currentTeacher.name}</h2>
              <p className="text-xs text-indigo-100 flex items-center gap-1.5 mt-0.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span> Academic Session: 2026/2027 Calendar (Uganda UNEB Primary Syllabus)
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-500/20">
            <span className="text-xs font-bold text-indigo-200 text-right hidden sm:block">SELECT TERM:</span>
            <div className="flex gap-1.5">
              {(['Term 1', 'Term 2', 'Term 3'] as Term[]).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setActiveTerm(t);
                    onLogPayload('SSR', 'GET', `/portal/teacher/?selected_term=${t}`, '', `<!-- Term Switched -->\n<div class="active-tab">Switched Context to ${t}</div>`);
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    activeTerm === t 
                      ? 'bg-white text-indigo-900 shadow' 
                      : 'text-indigo-200 hover:bg-indigo-800/60'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CAMPUS CALENDAR REFERENCE MODULE */}
      <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
        <button
          onClick={() => {
            setShowCalendar(!showCalendar);
            onLogPayload('SYSTEM', 'GET', `/portal/teacher/calendar/toggle/`, '', `<!-- Calendar Toggled -->`);
          }}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-150">
              <Calendar size={15} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">Campus Shared Term Calendar</h3>
              <p className="text-[10px] text-slate-400">View school terms, holidays, assessment blocks & campus activities</p>
            </div>
          </div>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1">
            {showCalendar ? '▼ Collapse Schedule' : '▶ Expand Schedule'}
          </span>
        </button>

        {showCalendar && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/20 animate-fade-in">
            <SchoolCalendar events={calendarEvents} isAdmin={false} />
          </div>
        )}
      </div>

      {/* DAILY ATTENDANCE MANAGER CORE */}
      <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
        <button
          onClick={() => {
            setShowAttendance(!showAttendance);
            onLogPayload('SYSTEM', 'GET', `/portal/teacher/attendance/toggle/`, '', `<!-- Attendance Collapsed/Expanded -->`);
          }}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-teal-50 text-teal-700 rounded-lg border border-teal-150 animate-pulse">
              <UserCheck size={15} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">Assigned Cohorts Daily Attendance Manager</h3>
              <p className="text-[10px] text-slate-400">Take daily registers for classes and analyze student heatmaps</p>
            </div>
          </div>
          <span className="text-xs font-bold text-teal-600 bg-teal-50 border border-teal-100 rounded-lg px-2.5 py-1">
            {showAttendance ? '▼ Collapse Register' : '▶ Expand Register'}
          </span>
        </button>

        {showAttendance && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/10 animate-fade-in">
            <AttendanceManager
              students={students}
              assignedStreams={Array.from(new Set(teacherAssignments.map(ta => ta.classStream)))}
              attendance={attendance}
              onSaveAttendance={onSaveAttendance}
              teacherId={currentTeacher.id}
              onLogPayload={onLogPayload}
            />
          </div>
        )}
      </div>

      {/* Primary Selection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Side: assigned Class Streams & Subjects */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-md p-4 border border-slate-100">
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-1.5">
              <BookOpen size={13} className="text-indigo-500" />
              My Assigned Classes
            </h3>
            
            {teacherAssignments.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No active Class stream assignments found for you.
              </div>
            ) : (
              <div className="space-y-2">
                {teacherAssignments.map((assignment) => {
                  const isSelected = selectedSheet?.id === assignment.id;
                  const isLocked = !!lockedSheets[`${assignment.classStream}|${assignment.subject}`];
                  
                  return (
                    <button
                      key={assignment.id}
                      onClick={() => {
                        setSelectedSheet(assignment);
                        onLogPayload(
                          'SSR', 
                          'GET', 
                          `/portal/teacher/sheet/?stream=${assignment.classStream}&subject=${assignment.subject}`, 
                          '', 
                          `<!-- Switched spreadsheet layout internally -->\n<div id="grid-header">${assignment.classStream} - ${assignment.subject}</div>`
                        );
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between group ${
                        isSelected 
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-950 shadow-sm font-semibold' 
                          : 'bg-slate-50 border-transparent text-slate-700 hover:bg-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-mono text-indigo-600 block group-hover:text-indigo-700">
                          {assignment.subject}
                        </span>
                        <span className="text-sm font-bold text-slate-800">
                          {assignment.classStream}
                        </span>
                      </div>
                      <div>
                        {isLocked ? (
                          <span className="bg-rose-50 border border-rose-200 p-1 rounded text-rose-600 block shadow-sm" title="Finalized of Term marks locked">
                            <Lock size={12} />
                          </span>
                        ) : (
                          <span className="bg-emerald-50 border border-emerald-200 p-1 rounded text-emerald-600 block group-hover:scale-115 transition-transform" title="Active worksheets">
                            <Unlock size={12} />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick tips box */}
          <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 text-[11px] text-amber-800 space-y-2">
            <div className="flex items-center gap-1 font-bold">
              <AlertTriangle size={13} className="text-amber-500 shrink-0" />
              <span>Ugandan Ministry of Education Mandates</span>
            </div>
            <p>1. Keep terminal records up-to-date with testing regimes.</p>
            <p>2. Verify marks with care (over 100 will raise database validation exception flags).</p>
            <p>3. Dynamic templates below automate standard report grading phrases.</p>
          </div>
        </div>

        {/* Right Side: Spreadsheet Workspace / Mark Grid */}
        <div className="lg:col-span-3 space-y-4">
          {selectedSheet ? (
            <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
              
              {/* Sheet Workspace Header */}
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                      {selectedSheet.subject}
                    </span>
                    <span className="font-mono text-slate-400 text-xs">|</span>
                    <span className="text-xs text-slate-500 font-medium">Stream Active:</span>
                    <span className="text-xs text-slate-800 font-bold">{selectedSheet.classStream}</span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-800">
                    Interactivity Excel-like Marks Grid
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  {/* Auto-Grade Toggle */}
                  <button
                    id="auto-grade-toggle-btn"
                    onClick={() => {
                      setAutoGradeEnabled(!autoGradeEnabled);
                      onLogPayload(
                        'SYSTEM',
                        'POST',
                        `/portal/teacher/toggle-autograde/`,
                        `auto_grade_enabled=${!autoGradeEnabled}`,
                        `<div class="p-2.5 bg-slate-900 text-amber-300 font-mono text-[10px] rounded space-y-1">
  <span class="text-white font-extrabold block">✏️ AUTO-GRADE ENGINE TOGGLE</span>
  <p>Dynamic standard calculations on cell inputs are now: <strong>${!autoGradeEnabled ? 'AUTOMATIC (A-F Active)' : 'MANUAL (No auto-letter displays)'}</strong></p>
</div>`
                      );
                    }}
                    className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-2 shadow-sm cursor-pointer ${
                      autoGradeEnabled
                        ? 'bg-amber-50 border-amber-250 text-amber-800'
                        : 'bg-white border-slate-250 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-amber-500 font-extrabold text-xs">A⁺</span>
                    <span>{autoGradeEnabled ? 'Auto-Grade (A-F) On' : 'Auto-Grade (A-F) Off'}</span>
                  </button>

                  {/* Visual Analytics Toggle */}
                  <button
                    onClick={() => {
                      setShowVisualAnalytics(!showVisualAnalytics);
                      onLogPayload(
                        'SYSTEM',
                        'POST',
                        `/portal/teacher/toggle-analytics/`,
                        `show_analytics=${!showVisualAnalytics}`,
                        `<div class="p-2.5 bg-slate-900 text-teal-300 font-mono text-[10px] rounded space-y-1">
  <span class="text-white font-extrabold block">📊 RECHARTS ANALYTICS VIEW PORTAL</span>
  <p>Render Status Toggle: <strong>${!showVisualAnalytics ? 'SHOWN' : 'HIDDEN'}</strong> &bull; Responsive layout redrawn</p>
</div>`
                      );
                    }}
                    className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-2 shadow-sm cursor-pointer ${
                      showVisualAnalytics 
                        ? 'bg-indigo-50 border-indigo-250 text-indigo-800' 
                        : 'bg-white border-slate-250 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <BarChart2 size={13} className={showVisualAnalytics ? "text-indigo-600 animate-bounce" : "text-slate-400"} />
                    <span>{showVisualAnalytics ? 'Hide Chart Dashboard' : 'Show Chart Dashboard'}</span>
                  </button>

                  {/* Academic Insight Trigger */}
                  <button
                    onClick={() => {
                      setAiInsightsOpen(!aiInsightsOpen);
                      onLogPayload(
                        'SYSTEM',
                        'POST',
                        `/portal/teacher/toggle-insights/`,
                        `ai_insights_open=${!aiInsightsOpen}`,
                        `<div class="p-2.5 bg-slate-900 text-purple-300 font-mono text-[10px] rounded space-y-1">
  <span class="text-white font-extrabold block">✨ GEMINI ACADEMIC INSIGHT STUDIO</span>
  <p>Status Toggle: <strong>${!aiInsightsOpen ? 'EXPANDED' : 'COLLAPSED'}</strong> &bull; Initializing options</p>
</div>`
                      );
                    }}
                    className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-2 shadow-sm cursor-pointer ${
                      aiInsightsOpen 
                        ? 'bg-purple-50 border-purple-250 text-purple-800 ring-2 ring-purple-100' 
                        : 'bg-white border-slate-250 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Brain size={13} className={aiInsightsOpen ? "text-purple-600 animate-pulse" : "text-slate-400"} />
                    <span>{aiInsightsOpen ? 'Hide Insights Studio' : 'Gemini Academic Insights'}</span>
                    <span className="bg-purple-100 text-purple-700 text-[8px] font-black uppercase px-1 py-0.5 rounded ml-1 tracking-wider leading-none">AI API</span>
                  </button>

                  {/* Lock Indicator & Trigger */}
                  <button
                    onClick={handleLockToggle}
                    className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-2 shadow-sm ${
                      isSheetLocked 
                        ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100' 
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    {isSheetLocked ? (
                      <>
                        <Lock size={13} />
                        <span>Sheet Locked (Submitted to DOS)</span>
                      </>
                    ) : (
                      <>
                        <Unlock size={13} />
                        <span>Lock & Submit to DOS</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Dynamic Visual Performance Analytics Dashboard */}
              {showVisualAnalytics && (
                <div id="recharts-visual-dashboard" className="p-5 border-b border-slate-150 bg-slate-50/45 space-y-5 animate-fade-in">
                  
                  {/* Dashboard Metrics Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    
                    {/* Average Card */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-150 shadow-sm flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg">
                        <TrendingUp size={16} />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Class Average</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-black text-slate-800">{stats.avg}</span>
                          <span className="text-[10px] text-slate-400 font-mono">/100</span>
                        </div>
                      </div>
                    </div>

                    {/* Peak Score Card */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-150 shadow-sm flex items-center gap-3">
                      <div className="p-2.5 bg-cyan-50 border border-cyan-100 text-cyan-600 rounded-lg">
                        <Award size={16} />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Peak Mark</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-black text-slate-800">{stats.peak}</span>
                          <span className="text-[10px] text-slate-400 font-mono">/100</span>
                        </div>
                      </div>
                    </div>

                    {/* Pass Rate Card */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-150 shadow-sm flex items-center gap-3">
                      <div className={`p-2.5 rounded-lg border ${
                        stats.passRate >= 75 
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                          : 'bg-amber-50 border-amber-100 text-amber-600'
                      }`}>
                        <CheckCircle size={16} />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pass Rate</span>
                        <span className={`text-lg font-black block ${
                          stats.passRate >= 75 ? 'text-emerald-700' : 'text-amber-700'
                        }`}>
                          {stats.passRate}%
                        </span>
                      </div>
                    </div>

                    {/* Total Pupils */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-150 shadow-sm flex items-center gap-3">
                      <div className="p-2.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg">
                        <Users size={16} />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Evaluated</span>
                        <span className="text-lg font-black text-slate-800 block">
                          {stats.total} <span className="text-[10px] text-slate-400 font-medium normal-case">pupils</span>
                        </span>
                      </div>
                    </div>

                    {/* Remedial Target Queue */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-150 shadow-sm flex items-center gap-3 col-span-2 sm:col-span-1">
                      <div className={`p-2.5 rounded-lg border ${
                        stats.remedialCount > 0 
                          ? 'bg-rose-50 border-rose-100 text-rose-600 animate-pulse' 
                          : 'bg-slate-50 border-slate-250 text-slate-400'
                      }`}>
                        <AlertTriangle size={16} />
                      </div>
                      <div className="space-y-0.5 font-sans">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Remedial Aid</span>
                        <span className={`text-lg font-black block ${
                          stats.remedialCount > 0 ? 'text-rose-700 font-semibold' : 'text-slate-500'
                        }`}>
                          {stats.remedialCount} {stats.remedialCount === 1 ? 'pupil' : 'pupils'}
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Chart Layout Box */}
                  <div className="bg-white rounded-xl border border-slate-150 shadow-sm p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-extrabold text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
                          <BarChart2 size={13} className="text-indigo-600" />
                          Grade Band Score Distribution Chart ({selectedSheet.subject})
                        </h4>
                        <p className="text-[10px] font-medium text-slate-400">
                          Identifies how grade counts propagate across the UNEB assessment scale.
                        </p>
                      </div>

                      {/* Score Selector Toggle for Recharts data source */}
                      <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        {([
                          { key: 'TEST', label: 'Quizzes (20%)' },
                          { key: 'MID-TERM', label: 'Mid-Term (30%)' },
                          { key: 'END-OF-TERM', label: 'End Exam (50%)' },
                          { key: 'FINAL', label: 'Weighted Term Grade' }
                        ] as { key: AssessmentType | 'FINAL', label: string }[]).map((tabOption) => (
                          <button
                            key={tabOption.key}
                            onClick={() => {
                              setSelectedAnalysisType(tabOption.key);
                              onLogPayload(
                                'SYSTEM',
                                'POST',
                                `/portal/teacher/change-analytics-metric/`,
                                `class_stream=${selectedSheet.classStream}&subject=${selectedSheet.subject}&metric=${tabOption.key}`,
                                `<div class="p-2.5 bg-slate-900 text-sky-400 font-mono text-[10px] rounded">
  <p>📡 SWITCHED ANALYTICAL METRICS TARGET</p>
  <p>Source switched to <strong>${tabOption.key}</strong> for Recharts payload binding &bull; Class mean computed: <strong>${getAnalyticsAndDistributionData().stats.avg}</strong></p>
</div>`
                              );
                            }}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                              selectedAnalysisType === tabOption.key 
                                ? 'bg-white text-indigo-900 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {tabOption.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Simple explanatory tooltip or empty state */}
                    {stats.total === 0 ? (
                      <div className="h-64 flex flex-col items-center justify-center text-slate-400 font-mono text-xs">
                        No pupils found to evaluate in {selectedSheet.classStream}.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        {/* The responsive Recharts area */}
                        <div className="md:col-span-3 h-64 md:h-72 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={chartData}
                              margin={{ top: 15, right: 10, left: -20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis 
                                dataKey="range" 
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600, fontFamily: 'monospace' }}
                              />
                              <YAxis 
                                tickLine={false}
                                axisLine={false}
                                allowDecimals={false}
                                tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                              />
                              <Tooltip
                                cursor={{ fill: '#f8fafc', opacity: 0.7 }}
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const dataRecord = payload[0].payload;
                                    return (
                                      <div className="p-3 bg-slate-900 border border-slate-800 text-white rounded-xl shadow-xl space-y-1 text-[11px] font-sans">
                                        <p className="font-bold text-slate-300 tracking-wider">
                                          {dataRecord.label}
                                        </p>
                                        <p className="text-xs font-black flex items-center gap-1.5 text-white">
                                          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dataRecord.color }}></span>
                                          Pupils: <strong className="text-amber-400 text-sm font-black">{payload[0].value}</strong>
                                        </p>
                                        <p className="text-[10px] text-slate-400 italic">
                                          Range Grouping: {dataRecord.range}
                                        </p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar 
                                dataKey="Pupils" 
                                radius={[6, 6, 0, 0]} 
                                maxBarSize={48}
                              >
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Chart Legend and contextual advice */}
                        <div className="md:col-span-1 space-y-3.5 bg-slate-50/70 p-4 rounded-xl border border-slate-150 h-full flex flex-col justify-between">
                          <div className="space-y-2.5 pt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block">
                              Visual Legend
                            </span>
                            <div className="space-y-1.5 text-[10px] font-semibold text-slate-700 font-mono">
                              {chartData.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                                  <span className="truncate">{item.label}: <strong>{item.Pupils}</strong></span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-150 text-[10px] font-sans text-slate-500 leading-relaxed space-y-1">
                            <p className="font-bold text-indigo-950 flex items-center gap-1">
                              <Sparkles size={11} className="text-amber-500" />
                              Active Grade Trend Advice:
                            </p>
                            {stats.avg >= 75 ? (
                              <p className="text-emerald-700 font-medium">Excellent mean score of <strong>{stats.avg}</strong> marks. Continue extending candidates with demanding exercises!</p>
                            ) : stats.avg >= 55 ? (
                              <p className="text-slate-600 font-medium font-sans">Moderate progress. Focus on helping pass groups (P7/P8) move up to Credit levels.</p>
                            ) : (
                              <p className="text-rose-700 font-semibold leading-normal">Critical focus needed. Multiple candidates require special remedial support (below 50 marks).</p>
                            )}
                          </div>
                        </div>

                      </div>
                    )}

                  </div>

                </div>
              )}

              {/* Gemini Academic Insights Studio Panel */}
              {aiInsightsOpen && (
                <div id="gemini-insights-studio" className="p-6 border-b border-indigo-150 bg-indigo-50/20 space-y-6 animate-fade-in font-sans">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4 border-b border-indigo-100 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="p-1 px-2 bg-indigo-100 border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase rounded shadow-xs tracking-wider">
                          Gemini 3.5 Flash Model
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">http-method: POST /api/insights/generate</span>
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <Brain size={18} className="text-indigo-600 animate-pulse" />
                        Gemini Academic Insights Studio
                      </h3>
                      <p className="text-xs text-slate-500">
                        Synthesize complex student score vectors into descriptive, polished academic report comments and stream trajectory digests.
                      </p>
                    </div>

                    <button 
                      onClick={() => setAiInsightsOpen(false)}
                      className="text-slate-400 hover:text-slate-600 font-sans text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 px-2.5 py-1 rounded-lg cursor-pointer"
                    >
                      ✕ Close Studio
                    </button>
                  </div>

                  {/* Mode Tabs */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Controls Sidebar */}
                    <div className="md:col-span-1 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Insight Scope</label>
                        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
                          <button
                            type="button"
                            onClick={() => {
                              setAiMode('student');
                              setAiResult('');
                            }}
                            className={`py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer text-center ${
                              aiMode === 'student'
                                ? 'bg-white text-indigo-950 shadow-xs border border-indigo-100/50'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Individual pupil
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAiMode('class');
                              setAiResult('');
                            }}
                            className={`py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer text-center ${
                              aiMode === 'class'
                                ? 'bg-white text-indigo-950 shadow-xs border border-indigo-100/50'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Stream trend
                          </button>
                        </div>
                      </div>

                      {aiMode === 'student' ? (
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Pupil</label>
                            <select
                              value={aiSelectedStudentId}
                              onChange={(e) => {
                                setAiSelectedStudentId(e.target.value);
                                setAiResult('');
                              }}
                              className="w-full bg-white border border-slate-250 hover:border-slate-350 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 py-2 px-3 rounded-lg text-xs font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400"
                            >
                              <option value="">-- Choose Pupil to Analyze --</option>
                              {activeStudents.map((s) => {
                                const testScore = getScore(s.id, 'TEST');
                                const midScore = getScore(s.id, 'MID-TERM');
                                const endScore = getScore(s.id, 'END-OF-TERM');
                                const hasAny = testScore !== '' || midScore !== '' || endScore !== '';
                                return (
                                  <option key={s.id} value={s.id}>
                                    {s.name} ({hasAny ? `${testScore}/${midScore}/${endScore}` : 'No scores'})
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          {/* Quick Student score readout card */}
                          {aiSelectedStudentId && (() => {
                            const student = activeStudents.find(s => s.id === aiSelectedStudentId);
                            if (!student) return null;
                            const testScore = getScore(student.id, 'TEST');
                            const midScore = getScore(student.id, 'MID-TERM');
                            const endScore = getScore(student.id, 'END-OF-TERM');
                            const qVal = parseFloat(testScore) || 0;
                            const mVal = parseFloat(midScore) || 0;
                            const eVal = parseFloat(endScore) || 0;
                            const hasAny = testScore !== '' || midScore !== '' || endScore !== '';
                            const finalWeighted = hasAny ? Math.round((qVal * 0.20) + (mVal * 0.30) + (eVal * 0.50)) : 0;
                            const letterGrade = getLetterGrade(hasAny ? finalWeighted : '').grade;

                            return (
                              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] space-y-1.5 font-mono">
                                <p className="font-bold text-slate-700 font-sans border-b border-slate-150 pb-1 flex items-center justify-between">
                                  <span>Active Vector Status</span>
                                  <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1 border border-indigo-100 rounded">PUPIL PROFILE</span>
                                </p>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Quiz Rate (20%):</span>
                                  <span className="font-bold text-slate-800">{testScore ? `${testScore}%` : 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Mid-Term (30%):</span>
                                  <span className="font-bold text-slate-800">{midScore ? `${midScore}%` : 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">End Exam (50%):</span>
                                  <span className="font-bold text-slate-800">{endScore ? `${endScore}%` : 'N/A'}</span>
                                </div>
                                <div className="flex justify-between pt-1 border-t border-dashed border-slate-205">
                                  <span className="font-bold text-indigo-950 font-sans">Weighted Score:</span>
                                  <span className="font-black text-indigo-700">{finalWeighted}% ({letterGrade})</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="space-y-3 font-sans text-xs text-slate-500">
                          <div className="bg-indigo-50/40 p-3 rounded-lg border border-indigo-100/60 text-[11px] leading-relaxed space-y-2">
                            <p className="font-bold text-indigo-950">📚 Stream Class Digest</p>
                            <p>Analyzing the entire <strong>{selectedSheet?.classStream}</strong> register for <strong>{selectedSheet?.subject}</strong>.</p>
                            <div className="pt-2 border-t border-indigo-100 text-[10px] space-y-1 font-mono">
                              <p>Mean Mark: <strong className="text-slate-800">{stats.avg}%</strong></p>
                              <p>Stream Size: <strong className="text-slate-800">{stats.total} Pupils</strong></p>
                              <p>Max Peak: <strong className="text-slate-800">{stats.peak}%</strong></p>
                            </div>
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleGenerateAcademicInsight}
                        disabled={aiLoading}
                        className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {aiLoading ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" />
                            <span>Interrogating Gemini...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={13} className="text-yellow-300 fill-yellow-300" />
                            <span>Generate AI Insights</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Result Panel */}
                    <div className="md:col-span-3 bg-white border border-indigo-100 rounded-xl p-5 shadow-xs flex flex-col justify-between min-h-[190px]">
                      <div className="space-y-3 h-full overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">
                            Synthesized Narrative Output
                          </span>
                          {aiIsSimulated && (
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <AlertTriangle size={9} /> Offline backup
                            </span>
                          )}
                        </div>

                        {aiError && (
                          <div className="p-3 bg-rose-50 border border-rose-150 text-rose-800 text-xs rounded-lg flex items-start gap-2">
                            <AlertTriangle size={15} className="shrink-0 text-rose-500 mt-0.5" />
                            <span>{aiError}</span>
                          </div>
                        )}

                        {!aiError && !aiResult && !aiLoading && (
                          <div className="h-full flex flex-col items-center justify-center pt-8 text-center text-slate-400 space-y-2">
                            <Brain size={28} className="text-slate-300 animate-pulse" />
                            <div>
                              <p className="text-xs font-bold text-slate-700">Studio is waiting to capture prompt vectors</p>
                              <p className="text-[11px] text-slate-400 max-w-sm mt-0.5 mx-auto">
                                Select evaluate options on the left and click "Generate AI Insights" to trigger standard Gemini reports.
                              </p>
                            </div>
                          </div>
                        )}

                        {aiLoading && (
                          <div className="h-full flex flex-col items-center justify-center pt-8 text-center text-indigo-500 space-y-2">
                            <RefreshCw size={24} className="animate-spin text-indigo-500" />
                            <div>
                              <p className="text-xs font-bold text-indigo-950">Drafting narrative feedback...</p>
                              <p className="text-[10px] text-slate-400">Analyzing term metrics & score distributions safely</p>
                            </div>
                          </div>
                        )}

                        {!aiLoading && aiResult && (
                          <div className="text-xs text-slate-800 font-sans leading-relaxed whitespace-pre-line border border-slate-50 bg-slate-50/50 p-4 rounded-lg select-text font-medium">
                            {aiResult}
                          </div>
                        )}
                      </div>

                      {/* Display warning or action if exists */}
                      {aiResult && !aiLoading && (
                        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[10px] text-slate-400 font-serif">
                          <div>
                            {aiNotice ? (
                              <p className="text-amber-700 font-sans font-semibold flex items-center gap-1">
                                💡 {aiNotice}
                              </p>
                            ) : (
                              <p className="text-indigo-600 font-sans font-semibold flex items-center gap-1">
                                ✓ Live Gemini Academic Report complete.
                              </p>
                            )}
                          </div>

                          {aiMode === 'student' && aiSelectedStudentId && (
                            <button
                              type="button"
                              onClick={handleApplyAiComment}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-extrabold rounded-lg text-xs shadow-sm transition-all flex items-center gap-1 cursor-pointer self-end"
                            >
                              <CheckCircle size={12} />
                              Apply to Student Comment Column
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Excel Spreadsheet container */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-100 text-[11px] font-bold tracking-wider text-slate-600 uppercase border-b border-slate-200">
                      <th className="p-3.5 min-w-[200px]">Pupil Full Name</th>
                      <th className="p-3.5 text-center w-[160px]">
                        Weekly Quiz / Tests (20%)
                      </th>
                      <th className="p-3.5 text-center w-[160px]">
                        Mid-Term Assessment (30%)
                      </th>
                      <th className="p-3.5 text-center w-[160px]">
                        End-Of-Term Exam (50%)
                      </th>
                      {autoGradeEnabled && (
                        <th className="p-3.5 text-center w-[130px] text-amber-800 bg-amber-50/50 border-x border-amber-200">
                          Overall Grade
                        </th>
                      )}
                      <th className="p-3.5 text-center min-w-[150px]">Comment Helper Tools</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {activeStudents.map((student) => {
                      const testScore = getScore(student.id, 'TEST');
                      const midScore = getScore(student.id, 'MID-TERM');
                      const endScore = getScore(student.id, 'END-OF-TERM');

                      return (
                        <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                          {/* Pupil Avatar & Name */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              {student.avatar ? (
                                <img 
                                  src={student.avatar} 
                                  alt={student.name} 
                                  referrerPolicy="no-referrer"
                                  className="h-8 w-8 rounded-full object-cover border border-slate-200 shrink-0" 
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                                  {student.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="font-bold text-slate-900 leading-tight">{student.name}</h4>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedTimelineStudent(student);
                                      onLogPayload('SYSTEM', 'GET', `/portal/teacher/student/${student.id}/timeline`, '', `<!-- Student Timeline Open -->`);
                                    }}
                                    className="p-1 px-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 hover:text-[#312e81] hover:bg-indigo-100 rounded-md transition-all cursor-pointer flex items-center gap-0.5 shadow-3xs"
                                    title="View Student Growth Timeline Chart"
                                  >
                                    <TrendingUp size={11} className="shrink-0" />
                                    <span className="text-[9px] font-bold">Growth</span>
                                  </button>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">PIN: {student.pin}</span>
                              </div>
                            </div>
                          </td>

                          {/* TEST SCORE GRID CELL */}
                          <td className="p-3.5 text-center">
                            <div className="relative inline-block w-full max-w-[120px]">
                              <input
                                type="text"
                                maxLength={3}
                                value={testScore}
                                disabled={isSheetLocked}
                                onChange={(e) => handleScoreChange(student.id, 'TEST', e.target.value)}
                                className={`w-full text-center py-2 px-3 rounded-lg border font-mono font-bold transition-all ${
                                  isSheetLocked 
                                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                                    : validationErrors[`${student.id}-TEST`] 
                                      ? 'border-red-500 bg-red-50 text-red-900 focus:ring-red-400' 
                                      : 'border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                                }`}
                                placeholder="0"
                              />
                              {savingStatus[`${student.id}-TEST`] === 'saving' && (
                                <span className="absolute right-2.5 top-2.5">
                                  <RefreshCw size={11} className="animate-spin text-indigo-500" />
                                </span>
                              )}
                              {savingStatus[`${student.id}-TEST`] === 'saved' && (
                                <span className="absolute right-2.5 top-2.5" title="HTMX Auto Saved!">
                                  <CheckCircle size={12} className="text-emerald-500" />
                                </span>
                              )}
                              {validationErrors[`${student.id}-TEST`] && (
                                <span className="absolute right-2.5 top-2.5 text-rose-500" title={validationErrors[`${student.id}-TEST`]}>
                                  <AlertTriangle size={12} />
                                </span>
                              )}
                              {autoGradeEnabled && testScore !== '' && !validationErrors[`${student.id}-TEST`] && (
                                <span 
                                  className={`absolute -top-2 -right-2 px-1.5 py-0.5 text-[8px] font-extrabold tracking-tight uppercase rounded border shadow-xs select-none ${getLetterGrade(testScore).color}`}
                                  title={`Auto Assigned Grade: ${getLetterGrade(testScore).grade_name}`}
                                >
                                  {getLetterGrade(testScore).grade}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* MID TERM SCORE CELL */}
                          <td className="p-3.5 text-center">
                            <div className="relative inline-block w-full max-w-[120px]">
                              <input
                                type="text"
                                maxLength={3}
                                value={midScore}
                                disabled={isSheetLocked}
                                onChange={(e) => handleScoreChange(student.id, 'MID-TERM', e.target.value)}
                                className={`w-full text-center py-2 px-3 rounded-lg border font-mono font-bold transition-all ${
                                  isSheetLocked 
                                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                                    : validationErrors[`${student.id}-MID-TERM`] 
                                      ? 'border-red-500 bg-red-50 text-red-900 focus:ring-red-400' 
                                      : 'border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                                }`}
                                placeholder="0"
                              />
                              {savingStatus[`${student.id}-MID-TERM`] === 'saving' && (
                                <span className="absolute right-2.5 top-2.5">
                                  <RefreshCw size={11} className="animate-spin text-indigo-500" />
                                </span>
                              )}
                              {savingStatus[`${student.id}-MID-TERM`] === 'saved' && (
                                <span className="absolute right-2.5 top-2.5" title="HTMX Auto Saved!">
                                  <CheckCircle size={12} className="text-emerald-500" />
                                </span>
                              )}
                              {validationErrors[`${student.id}-MID-TERM`] && (
                                <span className="absolute right-2.5 top-2.5 text-rose-500" title={validationErrors[`${student.id}-MID-TERM`]}>
                                  <AlertTriangle size={12} />
                                </span>
                              )}
                              {autoGradeEnabled && midScore !== '' && !validationErrors[`${student.id}-MID-TERM`] && (
                                <span 
                                  className={`absolute -top-2 -right-2 px-1.5 py-0.5 text-[8px] font-extrabold tracking-tight uppercase rounded border shadow-xs select-none ${getLetterGrade(midScore).color}`}
                                  title={`Auto Assigned Grade: ${getLetterGrade(midScore).grade_name}`}
                                >
                                  {getLetterGrade(midScore).grade}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* END TERM SCORE CELL */}
                          <td className="p-3.5 text-center">
                            <div className="relative inline-block w-full max-w-[120px]">
                              <input
                                type="text"
                                maxLength={3}
                                value={endScore}
                                disabled={isSheetLocked}
                                onChange={(e) => handleScoreChange(student.id, 'END-OF-TERM', e.target.value)}
                                className={`w-full text-center py-2 px-3 rounded-lg border font-mono font-bold transition-all ${
                                  isSheetLocked 
                                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                                    : validationErrors[`${student.id}-END-OF-TERM`] 
                                      ? 'border-red-500 bg-red-50 text-red-900 focus:ring-red-400' 
                                      : 'border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                                }`}
                                placeholder="0"
                              />
                              {savingStatus[`${student.id}-END-OF-TERM`] === 'saving' && (
                                <span className="absolute right-2.5 top-2.5">
                                  <RefreshCw size={11} className="animate-spin text-indigo-500" />
                                </span>
                              )}
                              {savingStatus[`${student.id}-END-OF-TERM`] === 'saved' && (
                                <span className="absolute right-2.5 top-2.5" title="HTMX Auto Saved!">
                                  <CheckCircle size={12} className="text-emerald-500" />
                                </span>
                              )}
                              {validationErrors[`${student.id}-END-OF-TERM`] && (
                                <span className="absolute right-2.5 top-2.5 text-rose-500" title={validationErrors[`${student.id}-END-OF-TERM`]}>
                                  <AlertTriangle size={12} />
                                </span>
                              )}
                              {autoGradeEnabled && endScore !== '' && !validationErrors[`${student.id}-END-OF-TERM`] && (
                                <span 
                                  className={`absolute -top-2 -right-2 px-1.5 py-0.5 text-[8px] font-extrabold tracking-tight uppercase rounded border shadow-xs select-none ${getLetterGrade(endScore).color}`}
                                  title={`Auto Assigned Grade: ${getLetterGrade(endScore).grade_name}`}
                                >
                                  {getLetterGrade(endScore).grade}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* OVERALL GRADE (A-F) COLUMN */}
                          {autoGradeEnabled && (() => {
                            const qVal = parseFloat(testScore) || 0;
                            const mVal = parseFloat(midScore) || 0;
                            const eVal = parseFloat(endScore) || 0;
                            const hasAny = testScore !== '' || midScore !== '' || endScore !== '';
                            const finalWeighted = hasAny ? Math.round((qVal * 0.20) + (mVal * 0.30) + (eVal * 0.50)) : 0;
                            const weightedObj = getLetterGrade(hasAny ? finalWeighted : '');

                            return (
                              <td className="p-3.5 text-center border-x border-slate-100 bg-amber-50/15 font-sans">
                                {hasAny ? (
                                  <div className="inline-flex flex-col items-center justify-center">
                                    <span 
                                      className={`px-3 py-1 text-xs font-black rounded-lg border shadow-xs select-none ${weightedObj.color}`}
                                      title={weightedObj.grade_name}
                                    >
                                      {weightedObj.grade}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-mono mt-1 font-semibold">({finalWeighted}%)</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-300 text-[10px] font-mono">-</span>
                                )}
                              </td>
                            );
                          })()}

                          {/* DYNAMIC COMMENT HELPER CELL */}
                          <td className="p-3.5">
                            <div className="space-y-1.5 min-w-[210px]">
                              {customComments[student.id] ? (
                                <div className="bg-indigo-50/50 p-2 rounded border border-indigo-100 text-[10px] text-slate-700 italic relative group">
                                  "{customComments[student.id]}"
                                  <button 
                                    onClick={() => setCustomComments(p => {
                                      const c = { ...p };
                                      delete c[student.id];
                                      return c;
                                    })}
                                    className="absolute -top-1.5 -right-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 h-4 w-4 rounded-full flex items-center justify-center font-bold font-sans text-[8px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    title="Reset Comment"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1.5">
                                  <button
                                    onClick={() => handleGenerateAiComment(student)}
                                    disabled={aiDraftingId === student.id}
                                    className="px-2 py-1 bg-gradient-to-r from-indigo-50 to-indigo-100/60 hover:from-indigo-100 hover:to-indigo-150 disabled:opacity-50 disabled:cursor-not-allowed text-indigo-900 border border-indigo-200 rounded font-bold text-[10px] transition-all flex items-center gap-1 cursor-pointer justify-center shadow-3xs"
                                    title="Generate subject-specific student comment using Gemini AI"
                                  >
                                    {aiDraftingId === student.id ? (
                                      <>
                                        <RefreshCw size={8} className="animate-spin text-indigo-700 shrink-0" />
                                        <span>Drafting AI Feedback...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles size={8} className="text-indigo-600 animate-pulse shrink-0" />
                                        <span>Draft Gemini Comment</span>
                                      </>
                                    )}
                                  </button>
                                  
                                  <div className="flex flex-wrap gap-1">
                                    <button
                                      onClick={() => handleCommentGenerate(student, 'excellent')}
                                      className="px-2 py-1 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 rounded font-semibold text-[10px] transition-all flex items-center gap-0.5 cursor-pointer"
                                    >
                                      <Sparkles size={8} className="shrink-0" /> Praise
                                    </button>
                                    <button
                                      onClick={() => handleCommentGenerate(student, 'improving')}
                                      className="px-2 py-1 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 rounded font-semibold text-[10px] transition-all flex items-center gap-0.5 cursor-pointer"
                                    >
                                      Steady
                                    </button>
                                    <button
                                      onClick={() => handleCommentGenerate(student, 'warning')}
                                      className="px-2 py-1 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-800 rounded font-semibold text-[10px] transition-all flex items-center gap-0.5 cursor-pointer"
                                    >
                                      Remedial
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Warning/Informing block in Grid Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <CheckCircle size={14} className="text-emerald-500" />
                  Grid is active. Navigation tabs and cellular edits trigger simulated HTMX headers.
                </span>
                
                <span className="text-[10px] font-mono text-slate-400 bg-slate-200/50 px-2 py-1 rounded">
                  hx-trigger="keyup changed delay:500ms"
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md p-12 text-center text-slate-500 flex flex-col items-center justify-center border border-slate-100">
              <BookOpen size={36} className="text-slate-300 mb-3" />
              <p className="font-bold text-slate-700">No active classes assigned to your log</p>
              <p className="text-xs text-slate-400 mt-1">Please log in with another profile or contact the administrator.</p>
            </div>
          )}
        </div>
      </div>

      {selectedTimelineStudent && (
        <StudentGrowthModal
          student={selectedTimelineStudent}
          assessments={assessments}
          defaultSubject={selectedSheet ? selectedSheet.subject : 'Mathematics'}
          onClose={() => setSelectedTimelineStudent(null)}
        />
      )}
    </div>
  );
}
