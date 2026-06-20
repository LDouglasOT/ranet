import React, { useState, useMemo } from 'react';
import { UserCheck, CheckCircle2, AlertCircle, Clock, Calendar, Check, Info, Sparkles, Award } from 'lucide-react';
import { Student, AttendanceRecord, AttendanceStatus, ClassStream } from '../types';

interface AttendanceManagerProps {
  students: Student[];
  assignedStreams: ClassStream[];
  attendance: AttendanceRecord[];
  onSaveAttendance: (records: AttendanceRecord[]) => void;
  teacherId: string;
  onLogPayload: (type: 'HTMX' | 'SSR' | 'SYSTEM', method: 'GET' | 'POST' | 'PUT', url: string, payload: string, response: string) => void;
}

export default function AttendanceManager({
  students,
  assignedStreams,
  attendance,
  onSaveAttendance,
  teacherId,
  onLogPayload
}: AttendanceManagerProps) {
  const [selectedStream, setSelectedStream] = useState<ClassStream | ''>(assignedStreams[0] || '');
  const [activeDate, setActiveDate] = useState('2026-06-10'); // Pivot local date
  const [markedRecords, setMarkedRecords] = useState<Record<string, AttendanceStatus>>({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Active pupils in stream
  const activeStudents = useMemo(() => {
    if (!selectedStream) return [];
    return students.filter(s => s.classStream === selectedStream);
  }, [students, selectedStream]);

  // Load existing records for active stream and date combination
  const existingRecordsForDate = useMemo(() => {
    if (!selectedStream) return [];
    return attendance.filter(r => r.date === activeDate && r.classStream === selectedStream);
  }, [attendance, activeDate, selectedStream]);

  // Synchronize marked records when stream or date changes
  React.useEffect(() => {
    const initialMap: Record<string, AttendanceStatus> = {};
    activeStudents.forEach(student => {
      const match = existingRecordsForDate.find(r => r.studentId === student.id);
      initialMap[student.id] = match ? match.status : 'PRESENT'; // default to present for quick marking
    });
    setMarkedRecords(initialMap);
  }, [activeDate, selectedStream, activeStudents, existingRecordsForDate]);

  // Quick Action: Mark All Present
  const handleMarkAllPresent = () => {
    const updatedMap: Record<string, AttendanceStatus> = {};
    activeStudents.forEach(s => {
      updatedMap[s.id] = 'PRESENT';
    });
    setMarkedRecords(updatedMap);
  };

  // Quick Action: Mark All Absent
  const handleMarkAllAbsent = () => {
    const updatedMap: Record<string, AttendanceStatus> = {};
    activeStudents.forEach(s => {
      updatedMap[s.id] = 'ABSENT';
    });
    setMarkedRecords(updatedMap);
  };

  // Submit registers
  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStream) return;

    const payloadRecords: AttendanceRecord[] = activeStudents.map(student => {
      const status = markedRecords[student.id] || 'PRESENT';
      return {
        id: `att-${student.id}-${activeDate}`,
        studentId: student.id,
        date: activeDate,
        status,
        classStream: selectedStream,
        markedByTeacherId: teacherId
      };
    });

    onSaveAttendance(payloadRecords);
    
    const countPresent = payloadRecords.filter(r => r.status === 'PRESENT').length;
    const countLate = payloadRecords.filter(r => r.status === 'LATE').length;
    const countAbsent = payloadRecords.filter(r => r.status === 'ABSENT').length;

    setSaveSuccessMsg(`Attendance register submitted. Present: ${countPresent} | Late: ${countLate} | Absent: ${countAbsent}`);

    // Log feedback for administrative diagnostic log
    const paramPayload = `date=${activeDate}&stream=${encodeURIComponent(selectedStream)}&present=${countPresent}&late=${countLate}&absent=${countAbsent}`;
    const htmxResponse = `<div class="p-3 bg-teal-950 text-teal-300 font-mono text-[10px] rounded space-y-1">
  <span class="text-white font-extrabold text-xs block">📝 LIVE REGISTRY SYNC</span>
  <p>POST /portal/teacher/attendance/submit &bull; HTTP/1.1 200 OK</p>
  <p class="text-teal-400 font-semibold">✓ Attendance synced. Parents notified real-time.</p>
</div>`;
    onLogPayload('HTMX', 'POST', '/portal/teacher/attendance/submit', paramPayload, htmxResponse);

    setTimeout(() => {
      setSaveSuccessMsg(null);
    }, 4500);
  };

  // Preceding 28 days for the Heat Map calendar
  const heatmapDays = useMemo(() => {
    const list: string[] = [];
    const pivot = new Date('2026-06-10');
    // Align with previous 4 completed school weeks leading to June 10, 2026
    for (let i = 27; i >= 0; i--) {
      const d = new Date(pivot);
      d.setDate(pivot.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      list.push(`${yyyy}-${mm}-${dd}`);
    }
    return list;
  }, []);

  // Compute metrics per date
  const computeHeatmapStats = (dateStr: string) => {
    if (!selectedStream) return null;
    const records = attendance.filter(r => r.date === dateStr && r.classStream === selectedStream);
    if (records.length === 0) return null;

    const present = records.filter(r => r.status === 'PRESENT').length;
    const late = records.filter(r => r.status === 'LATE').length;
    const absent = records.filter(r => r.status === 'ABSENT').length;
    const total = records.length;

    const presentRate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { present, late, absent, total, presentRate };
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      
      {/* Upper Selector Belt */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Class Stream</label>
            <select
              value={selectedStream}
              onChange={(e) => setSelectedStream(e.target.value as ClassStream)}
              className="bg-white border border-slate-250 p-2 rounded-lg font-bold text-slate-800 outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer text-xs"
            >
              {assignedStreams.map(cs => (
                <option key={cs} value={cs}>{cs}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Academic date</label>
            <input
              type="date"
              value={activeDate}
              onChange={(e) => setActiveDate(e.target.value)}
              className="bg-white border border-slate-250 p-1.5 rounded-lg font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-teal-500 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-450 font-semibold font-mono">HEAT MAP PERSISTENCE: UNIFIED</span>
          <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse"></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Attendance Register Roll Column (Takes 2 blocks) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-100 shadow space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <UserCheck size={16} className="text-teal-600" />
                Dailies Roster Register
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                Mark check-rolls for {selectedStream || 'selected class stream'}. Current system date is selected.
              </p>
            </div>

            {selectedStream && activeStudents.length > 0 && (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-850 font-bold rounded-lg text-[9px] cursor-pointer"
                >
                  ✓ Mark All Present
                </button>
                <button
                  type="button"
                  onClick={handleMarkAllAbsent}
                  className="px-2 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-850 font-bold rounded-lg text-[9px] cursor-pointer"
                >
                  ✗ Mark All Absent
                </button>
              </div>
            )}
          </div>

          {saveSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-800 font-semibold text-xs rounded-xl flex items-center gap-1.5 animate-fade-in shadow-xs">
              <CheckCircle2 size={13} className="text-emerald-555" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {!selectedStream ? (
            <div className="text-center py-10 bg-slate-50 border rounded-xl">
              <p className="text-slate-450 font-bold">Please select an assigned class stream first.</p>
            </div>
          ) : activeStudents.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 border rounded-xl">
              <p className="text-slate-450 font-bold text-xs">No registered students found in stream: {selectedStream}</p>
            </div>
          ) : (
            <form onSubmit={handleSaveAll} className="space-y-4">
              <div className="divide-y divide-slate-100 bg-white border border-slate-150 rounded-xl overflow-hidden shadow-xs">
                {activeStudents.map(student => {
                  const currentStatus = markedRecords[student.id] || 'PRESENT';
                  return (
                    <div 
                      key={student.id} 
                      className={`p-3 flex items-center justify-between flex-wrap gap-4 transition-colors ${
                        currentStatus === 'PRESENT' ? 'hover:bg-emerald-50/10' :
                        currentStatus === 'LATE' ? 'bg-amber-50/10' : 'bg-rose-50/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={student.avatar || "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=150&q=80"}
                          alt={student.name}
                          className="h-8 w-8 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <p className="font-extrabold text-slate-800 text-[11px]">{student.name}</p>
                          <p className="text-[9px] text-slate-400 font-medium">Pin: {student.pin} &bull; Parent Phone: {student.parentPhone}</p>
                        </div>
                      </div>

                      {/* Segmented Controls for Status */}
                      <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/60 font-semibold text-[10px]">
                        <button
                          type="button"
                          onClick={() => setMarkedRecords(prev => ({ ...prev, [student.id]: 'PRESENT' }))}
                          className={`px-3 py-1 text-[10.5px] font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                            currentStatus === 'PRESENT'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <Check size={11} />
                          <span>Present</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setMarkedRecords(prev => ({ ...prev, [student.id]: 'LATE' }))}
                          className={`px-3 py-1 text-[10.5px] font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                            currentStatus === 'LATE'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <Clock size={11} />
                          <span>Late</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setMarkedRecords(prev => ({ ...prev, [student.id]: 'ABSENT' }))}
                          className={`px-3 py-1 text-[10.5px] font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                            currentStatus === 'ABSENT'
                              ? 'bg-rose-550 border-rose-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <AlertCircle size={11} />
                          <span>Absent</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-teal-650 to-emerald-650 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer flex items-center gap-1"
                >
                  <UserCheck size={13} />
                  <span>Submit Daily Attendance Register</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Heat Map sidebar column */}
        <div className="space-y-4 lg:col-span-1">
          
          {/* Calendar Heatmap Block */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Calendar size={15} className="text-teal-600 animate-pulse" />
                Attendance Heat Map
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                Live color diagnostics for the preceding 28 days of school attendance.
              </p>
            </div>

            {selectedStream ? (
              <div className="space-y-4">
                
                {/* Visual Heat map Grid layout */}
                <div className="grid grid-cols-7 gap-1.5 p-1 bg-slate-50 border rounded-lg max-w-[280px] mx-auto text-center font-bold">
                  
                  {/* Day week headers */}
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((wd, i) => (
                    <span key={i} className="text-[9px] text-slate-400 py-1">{wd}</span>
                  ))}

                  {/* Daily Blocks */}
                  {heatmapDays.map((dateStr, i) => {
                    const stats = computeHeatmapStats(dateStr);
                    const dayOfWeek = new Date(dateStr).getDay(); // Sunday=0, Sat=6
                    const isAcademicDay = dayOfWeek !== 0 && dayOfWeek !== 6;

                    // Markers styles
                    let colorStyle = 'bg-slate-100 text-slate-300';
                    let titleText = `Date: ${dateStr}\nStatus: Weekend / Off`;

                    if (isAcademicDay) {
                      if (stats === null) {
                        colorStyle = 'bg-slate-200 border-slate-300 hover:scale-105';
                        titleText = `Date: ${dateStr}\nNo register marked today`;
                      } else {
                        const rate = stats.presentRate;
                        titleText = `Date: ${dateStr}\nPresent: ${stats.presentRate}%\n(Present: ${stats.present}, Late: ${stats.late}, Absent: ${stats.absent})`;
                        
                        if (rate === 100) {
                          colorStyle = 'bg-emerald-600 border-emerald-750 text-white cursor-help hover:scale-110 shadow-xs';
                        } else if (rate >= 80) {
                          colorStyle = 'bg-emerald-450 border-emerald-500 text-white cursor-help hover:scale-110 shadow-xs';
                        } else if (rate >= 60) {
                          colorStyle = 'bg-amber-400 border-amber-500 text-white cursor-help hover:scale-110 shadow-xs';
                        } else {
                          colorStyle = 'bg-rose-500 border-rose-600 text-white cursor-help hover:scale-110 shadow-xs';
                        }
                      }
                    }

                    // Special highlight if matches chosen date
                    const isChosenDate = dateStr === activeDate;
                    const blockBorder = isChosenDate 
                      ? 'ring-2 ring-indigo-550 ring-offset-1 border-indigo-600 scale-105 font-black' 
                      : 'border-transparent';

                    return (
                      <button
                        type="button"
                        key={i}
                        title={titleText}
                        onClick={() => setActiveDate(dateStr)}
                        className={`aspect-square w-full rounded border flex items-center justify-center p-0.5 text-[8.5px] transition-all font-mono ${colorStyle} ${blockBorder}`}
                      >
                        {new Date(dateStr).getDate()}
                      </button>
                    );
                  })}
                </div>

                {/* Heat Map Legend */}
                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Heat Map Intensity Keys</span>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="h-3.5 w-3.5 bg-emerald-600 border border-emerald-700 rounded-sm block shrink-0" />
                      100% Full
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="h-3.5 w-3.5 bg-emerald-450 border border-emerald-500 rounded-sm block shrink-0" />
                      80% - 99%
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="h-3.5 w-3.5 bg-amber-400 border border-amber-500 rounded-sm block shrink-0" />
                      60% - 79%
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="h-3.5 w-3.5 bg-rose-500 border border-rose-600 rounded-sm block shrink-0" />
                      &lt; 60%
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="h-3.5 w-3.5 bg-slate-200 border border-slate-300 rounded-sm block shrink-0" />
                      Pending
                    </span>
                  </div>
                </div>

              </div>
            ) : (
              <p className="text-center py-4 text-slate-400">Select class stream to view heat map calendar diagnostics.</p>
            )}
          </div>

          {/* Quick Informational Guide */}
          <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 space-y-1.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block flex items-center gap-1">
              <Info size={11} className="text-teal-605" />
              Primary register rules
            </span>
            <p className="text-[10px] text-slate-600 leading-snug font-medium">
              Daily diagnostic registers help compile final term progression analytics. Guard connections (Parent portal accounts) receive instant smartphone system notifications as soon as rolls are submitted.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
