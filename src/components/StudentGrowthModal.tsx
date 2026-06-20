import React, { useState, useMemo } from 'react';
import { 
  X, TrendingUp, TrendingDown, Award, Calendar, BookOpen, 
  Percent, Target, ChevronRight, HelpCircle, Activity 
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ReferenceLine 
} from 'recharts';
import { Student, Assessment, Subject, Term, AssessmentType } from '../types';

interface StudentGrowthModalProps {
  student: Student;
  assessments: Assessment[];
  defaultSubject: Subject;
  onClose: () => void;
}

export default function StudentGrowthModal({
  student,
  assessments,
  defaultSubject,
  onClose
}: StudentGrowthModalProps) {
  const [selectedSubject, setSelectedSubject] = useState<Subject>(defaultSubject);

  // Available subjects at the school
  const subjects: Subject[] = ['Mathematics', 'English', 'Science', 'Social Studies'];

  // Helper to convert numeric score to letter grades matched with UNEB standards
  const getLetterGradeAndColor = (score: number) => {
    if (score >= 90) return { grade: 'D1', name: 'Distinction 1', color: 'bg-emerald-600 text-white border-emerald-700' };
    if (score >= 80) return { grade: 'D2', name: 'Distinction 2', color: 'bg-emerald-500 text-white border-emerald-600' };
    if (score >= 75) return { grade: 'C3', name: 'Credit 3', color: 'bg-indigo-650 text-white border-indigo-755' };
    if (score >= 70) return { grade: 'C4', name: 'Credit 4', color: 'bg-indigo-500 text-white border-indigo-600' };
    if (score >= 65) return { grade: 'C5', name: 'Credit 5', color: 'bg-blue-500 text-white border-blue-600' };
    if (score >= 60) return { grade: 'C6', name: 'Credit 6', color: 'bg-sky-500 text-white border-sky-600' };
    if (score >= 50) return { grade: 'P7', name: 'Pass 7', color: 'bg-amber-500 text-white border-amber-600' };
    if (score >= 40) return { grade: 'P8', name: 'Pass 8', color: 'bg-orange-500 text-white border-orange-600' };
    return { grade: 'F9', name: 'Fail 9', color: 'bg-rose-550 text-white border-rose-650' };
  };

  // Chronological sorting of academic checkpoints
  const chronology: { term: Term; type: AssessmentType; label: string; shortLabel: string }[] = [
    { term: 'Term 1', type: 'TEST', label: 'Term 1 Weekly Test', shortLabel: 'T1 Test' },
    { term: 'Term 1', type: 'MID-TERM', label: 'Term 1 Mid-Term', shortLabel: 'T1 Mid' },
    { term: 'Term 1', type: 'END-OF-TERM', label: 'Term 1 End-of-Term', shortLabel: 'T1 End' },
    { term: 'Term 2', type: 'TEST', label: 'Term 2 Weekly Test', shortLabel: 'T2 Test' },
    { term: 'Term 2', type: 'MID-TERM', label: 'Term 2 Mid-Term', shortLabel: 'T2 Mid' },
    { term: 'Term 2', type: 'END-OF-TERM', label: 'Term 2 End-of-Term', shortLabel: 'T2 End' },
    { term: 'Term 3', type: 'TEST', label: 'Term 3 Weekly Test', shortLabel: 'T3 Test' },
    { term: 'Term 3', type: 'MID-TERM', label: 'Term 3 Mid-Term', shortLabel: 'T3 Mid' },
    { term: 'Term 3', type: 'END-OF-TERM', label: 'Term 3 End-of-Term', shortLabel: 'T3 End' }
  ];

  // Map scores into a structured array for rendering and charting
  const timelineData = useMemo(() => {
    return chronology.map(point => {
      const match = assessments.find(
        a => a.studentId === student.id &&
             a.subject === selectedSubject &&
             a.term === point.term &&
             a.type === point.type
      );
      return {
        key: `${point.term}|${point.type}`,
        term: point.term,
        type: point.type,
        displayName: point.label,
        shortName: point.shortLabel,
        score: match ? match.score : null,
        isEmpty: !match
      };
    });
  }, [student.id, selectedSubject, assessments]);

  // Compute key analytics
  const scoreStats = useMemo(() => {
    const validScores = timelineData.filter(d => d.score !== null).map(d => d.score as number);
    if (validScores.length === 0) {
      return {
        firstScore: 0,
        latestScore: 0,
        growth: 0,
        highest: 0,
        lowest: 0,
        average: 0
      };
    }

    const firstScore = validScores[0];
    const latestScore = validScores[validScores.length - 1];
    const growth = latestScore - firstScore;
    const highest = Math.max(...validScores);
    const lowest = Math.min(...validScores);
    const average = Math.round(validScores.reduce((sum, s) => sum + s, 0) / validScores.length);

    return {
      firstScore,
      latestScore,
      growth,
      highest,
      lowest,
      average
    };
  }, [timelineData]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
      <div 
        id="student-growth-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-4xl w-full max-h-[92vh] overflow-y-auto flex flex-col text-xs text-slate-700"
      >
        
        {/* Header Block & Student Details */}
        <div className="p-5 border-b border-slate-150 bg-gradient-to-r from-indigo-50/50 via-white to-teal-50/30 flex items-start justify-between">
          <div className="flex items-center gap-4">
            {student.avatar ? (
              <img 
                src={student.avatar} 
                alt={student.name}
                referrerPolicy="no-referrer"
                className="h-14 w-14 rounded-full object-cover border-2 border-indigo-100 shadow-sm"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center text-indigo-700 font-extrabold text-lg shadow-sm">
                {student.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base md:text-lg font-black text-slate-900 leading-none">{student.name}</h3>
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500 uppercase tracking-wider">{student.gender}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-slate-600">PIN: {student.pin}</span> &bull; 
                <span>Class Stream: <span className="font-extrabold text-indigo-700">{student.classStream}</span></span> &bull;
                <span>Parent: {student.parentName} ({student.parentPhone})</span>
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-1 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-800 transition-colors font-semibold flex items-center gap-1 cursor-pointer"
            title="Close modal"
          >
            <X size={14} />
            <span>Close</span>
          </button>
        </div>

        {/* Dynamic Controls Grid */}
        <div className="p-5 bg-slate-50 border-b border-slate-150 flex flex-col sm:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Subject Analysis Timeline</span>
            <div className="flex flex-wrap gap-1">
              {subjects.map(subj => (
                <button
                  key={subj}
                  type="button"
                  onClick={() => setSelectedSubject(subj)}
                  className={`px-3 py-1.5 font-bold rounded-lg border transition-all cursor-pointer text-[11px] ${
                    selectedSubject === subj 
                      ? 'bg-indigo-600 border-indigo-650 text-white shadow-xs' 
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-350'
                  }`}
                >
                  {subj}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-450 font-mono font-bold bg-white px-3 py-1.5 rounded-lg border border-slate-150 self-start sm:self-auto">
            <Activity size={12} className="text-teal-650 animate-pulse" />
            <span>METRIC: MULTI-TERM TRACKING</span>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4 bg-white">
          <div className="border border-slate-150 p-3.5 rounded-xl bg-slate-50/30 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg shrink-0">
              <Percent size={14} className="font-bold" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Starting Assessment</span>
              <p className="font-black text-slate-850 text-sm mt-0.5">{scoreStats.firstScore}%</p>
            </div>
          </div>

          <div className="border border-slate-150 p-3.5 rounded-xl bg-slate-50/30 flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg shrink-0">
              <Award size={14} />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Latest Scoring</span>
              <p className="font-black text-slate-850 text-sm mt-0.5">{scoreStats.latestScore}%</p>
            </div>
          </div>

          <div className={`border p-3.5 rounded-xl flex items-center gap-3 shrink-0 ${
            scoreStats.growth > 0 
              ? 'bg-emerald-50/20 border-emerald-150 text-emerald-850' 
              : scoreStats.growth < 0
                ? 'bg-rose-50/20 border-rose-150 text-rose-850'
                : 'bg-slate-50 border-slate-150 text-slate-800'
          }`}>
            <div className={`p-2 rounded-lg ${
              scoreStats.growth > 0 ? 'bg-emerald-100 text-emerald-800' :
              scoreStats.growth < 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {scoreStats.growth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Academic Growth</span>
              <p className="font-black text-sm mt-0.5">
                {scoreStats.growth > 0 ? `+${scoreStats.growth}%` : `${scoreStats.growth}%`}
              </p>
            </div>
          </div>

          <div className="border border-slate-150 p-3.5 rounded-xl bg-slate-50/30 flex items-center gap-3">
            <div className="p-2 bg-teal-50 text-teal-700 rounded-lg shrink-0">
              <Target size={14} />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Historical Average</span>
              <p className="font-black text-slate-850 text-sm mt-0.5">{scoreStats.average}%</p>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-150 bg-slate-50/20">
          
          {/* Recharts Line Chart (2 Columns) */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-150 p-4 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-[12px] text-slate-850 uppercase tracking-widest flex items-center gap-1">
                  <TrendingUp size={13} className="text-indigo-600" />
                  Performance Progression Curve
                </h4>
                <p className="text-[10px] text-slate-400">Score pattern through Term 1, Term 2 & Term 3 assessment checkpoints.</p>
              </div>

              <div className="flex items-center gap-2 text-[9px] text-slate-450 font-semibold">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-indigo-600 block shadow-xs" />
                  Score Curve
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-0.5 w-3 border-t border-dashed border-red-400 block" />
                  Academic Target (70%)
                </span>
              </div>
            </div>

            <div className="h-[260px] md:h-[280px] w-full text-[10px] font-mono">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={timelineData}
                  margin={{ top: 15, right: 15, left: -25, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="shortName" 
                    stroke="#94a3b8" 
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tick={{ fontSize: 9, fontWeight: 600 }}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tickCount={6}
                    stroke="#94a3b8" 
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tick={{ fontSize: 9, fontWeight: 600 }}
                  />
                  <Tooltip 
                    cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        if (data.score === null) {
                          return (
                            <div className="bg-slate-900 text-white p-2.5 rounded-lg border border-slate-700 shadow-xl space-y-1 text-[10px]">
                              <p className="font-bold">{data.displayName}</p>
                              <p className="text-slate-300">Grade: Pending Entry</p>
                            </div>
                          );
                        }
                        const letterObj = getLetterGradeAndColor(data.score);
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-lg border border-slate-750 shadow-xl space-y-1 text-[10px]">
                            <p className="font-semibold text-slate-350">{data.displayName}</p>
                            <p className="font-extrabold text-base text-white">{data.score}%</p>
                            <p className="text-indigo-400 font-bold uppercase tracking-wider">{letterObj.grade} ({letterObj.name})</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  
                  {/* Performance reference line for pass scores */}
                  <ReferenceLine y={70} stroke="#f87171" strokeDasharray="4 4" strokeWidth={1} label={{ value: 'Credit Limit', fill: '#f87171', position: 'insideRight', fontSize: 8, fontWeight: 700 }} />
                  
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#4f46e5" 
                    strokeWidth={3}
                    dot={{ fill: '#4f46e5', stroke: '#fff', strokeWidth: 1.5, r: 4 }}
                    activeDot={{ r: 6, fill: '#14b8a6', stroke: '#fff', strokeWidth: 2 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sequential Scores Table Column (1 Column) */}
          <div className="bg-white rounded-2xl border border-slate-150 overflow-hidden shadow-xs flex flex-col">
            <div className="bg-slate-50 p-3.5 border-b border-slate-150">
              <h4 className="font-extrabold text-[12px] text-slate-850 uppercase tracking-widest flex items-center gap-1">
                <BookOpen size={13} className="text-indigo-650" />
                Score Records Log
              </h4>
            </div>

            <div className="divide-y divide-slate-100 overflow-y-auto max-h-[300px] flex-1">
              {timelineData.map((data, idx) => {
                const isEven = idx % 2 === 0;
                return (
                  <div 
                    key={data.key} 
                    className={`p-3 flex items-center justify-between text-[11px] hover:bg-slate-50 transition-colors ${
                      isEven ? 'bg-slate-50/20' : 'bg-white'
                    }`}
                  >
                    <div>
                      <span className="font-black text-slate-800 block">{data.type}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{data.term}</span>
                    </div>

                    {data.score !== null ? (
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 font-mono text-[12px]">{data.score}%</span>
                        <span className={`px-1.5 py-0.5 text-[8.5px] font-black uppercase rounded border shadow-2xs ${getLetterGradeAndColor(data.score).color}`}>
                          {getLetterGradeAndColor(data.score).grade}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-350 italic text-[10px] font-medium">Pending Entry</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer Area with Tips */}
        <div className="p-4 bg-slate-50 border-t border-slate-150 block text-center">
          <p className="text-[10.5px] text-slate-500 font-medium leading-relaxed">
            🌿 <span className="font-bold">Did you know?</span> Tracking progression helps verify pupil readiness for the Uganda UNEB PLE examination blocks. Fluctuations under 10% represent normal cognitive growth.
          </p>
        </div>

      </div>
    </div>
  );
}
