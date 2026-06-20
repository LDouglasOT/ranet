import { Student, SubjectAssignment, Assessment, User, Notification, CalendarEvent, AttendanceRecord, AttendanceStatus, ClassStream, SchoolNotice, BehaviorLog, SickbayLog, AssetTracker } from './types';

// Pre-loaded Teachers / Admins for login simulation
export const MOCK_USERS: User[] = [
  { id: 't1', username: 'mulema', role: 'TEACHER', name: 'Mr. Christopher Mulema' },
  { id: 't2', username: 'nabeta', role: 'TEACHER', name: 'Mrs. Justine Nabeta' },
  { id: 't3', username: 'ssemwo', role: 'TEACHER', name: 'Mr. Arthur Ssemwogerere' },
  { id: 'a1', username: 'admin', role: 'ADMIN', name: 'Sister Mary Patricia (Headmistress / DOS)' }
];

export const MOCK_STUDENTS: Student[] = [
  {
    id: 's1',
    name: 'Douglas Kirabo',
    gender: 'Male',
    parentName: 'Mrs. Sarah Luzinda',
    parentPhone: '0772123456',
    pin: '2026',
    classStream: 'P.5 Blue',
    avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 's2',
    name: 'Chloe Namazzi',
    gender: 'Female',
    parentName: 'Mrs. Sarah Luzinda',
    parentPhone: '0772123456',
    pin: '2026',
    classStream: 'P.5 Blue',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 's3',
    name: 'Emma Kato',
    gender: 'Male',
    parentName: 'Mr. Arthur Kato',
    parentPhone: '0782987654',
    pin: '5678',
    classStream: 'P.5 Blue',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 's4',
    name: 'Ethan Wasswa',
    gender: 'Male',
    parentName: 'Mr. Arthur Kato',
    parentPhone: '0782987654',
    pin: '5678',
    classStream: 'P.5 Blue',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 's5',
    name: 'Sarah Atwine',
    gender: 'Female',
    parentName: 'Dr. Julius Atwine',
    parentPhone: '0701456789',
    pin: '9012',
    classStream: 'P.5 Gold',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 's6',
    name: 'Joshua Mukisa',
    gender: 'Male',
    parentName: 'Mrs. Harriet Mukisa',
    parentPhone: '0753224466',
    pin: '4321',
    classStream: 'P.5 Gold',
    avatar: 'https://images.unsplash.com/photo-1520341280432-4749d4d7bcf9?auto=format&fit=crop&w=150&q=80'
  }
];

export const INITIAL_ASSIGNMENTS: SubjectAssignment[] = [
  { id: 'as1', teacherId: 't1', teacherName: 'Mr. Christopher Mulema', classStream: 'P.5 Blue', subject: 'Mathematics' },
  { id: 'as2', teacherId: 't1', teacherName: 'Mr. Christopher Mulema', classStream: 'P.5 Gold', subject: 'Mathematics' },
  { id: 'as3', teacherId: 't2', teacherName: 'Mrs. Justine Nabeta', classStream: 'P.5 Blue', subject: 'English' },
  { id: 'as4', teacherId: 't2', teacherName: 'Mrs. Justine Nabeta', classStream: 'P.5 Blue', subject: 'Social Studies' },
  { id: 'as5', teacherId: 't3', teacherName: 'Mr. Arthur Ssemwogerere', classStream: 'P.5 Blue', subject: 'Science' },
  { id: 'as6', teacherId: 't3', teacherName: 'Mr. Arthur Ssemwogerere', classStream: 'P.5 Gold', subject: 'Social Studies' }
];

const buildHistoricalAssessments = (): Assessment[] => {
  const list: Assessment[] = [];
  const subjects: ('Mathematics' | 'English' | 'Science' | 'Social Studies')[] = ['Mathematics', 'English', 'Science', 'Social Studies'];
  const terms: ('Term 1' | 'Term 2' | 'Term 3')[] = ['Term 1', 'Term 2', 'Term 3'];
  const students = ['s1', 's2', 's3', 's4', 's5', 's6'];

  const studentProfiles: Record<string, { math: number, eng: number, sci: number, sst: number }> = {
    's1': { math: 85, eng: 72, sci: 88, sst: 78 },
    's2': { math: 65, eng: 89, sci: 70, sst: 92 },
    's3': { math: 48, eng: 55, sci: 58, sst: 50 },
    's4': { math: 75, eng: 78, sci: 82, sst: 80 },
    's5': { math: 95, eng: 92, sci: 94, sst: 88 },
    's6': { math: 62, eng: 68, sci: 66, sst: 70 }
  };

  students.forEach(studentId => {
    const perf = studentProfiles[studentId];
    terms.forEach(term => {
      subjects.forEach(subj => {
        const base = subj === 'Mathematics' ? perf.math : subj === 'English' ? perf.eng : subj === 'Science' ? perf.sci : perf.sst;
        
        const varianceSeed = (studentId === 's1' ? 2 : studentId === 's2' ? 5 : 8) + (subj.length) + (term === 'Term 1' ? 3 : term === 'Term 2' ? -2 : 1);
        const termAdjust = (term === 'Term 1' ? -4 : term === 'Term 2' ? 2 : 5);
        
        const testScore = Math.min(100, Math.max(30, base + varianceSeed + termAdjust - 10));
        const midScore = Math.min(100, Math.max(30, base + varianceSeed + termAdjust - 2));
        const endScore = Math.min(100, Math.max(30, base + varianceSeed + termAdjust + 5));

        list.push({
          id: `ast-${studentId}-${term}-${subj}-TEST`,
          studentId,
          subject: subj,
          type: 'TEST',
          term,
          score: Math.round(testScore),
          date: '2026-03-12',
          locked: term === 'Term 1' || term === 'Term 2',
          enteredByTeacherId: subj === 'Mathematics' ? 't1' : subj === 'Science' ? 't3' : 't2'
        });

        list.push({
          id: `ast-${studentId}-${term}-${subj}-MID`,
          studentId,
          subject: subj,
          type: 'MID-TERM',
          term,
          score: Math.round(midScore),
          date: '2026-04-20',
          locked: term === 'Term 1' || term === 'Term 2',
          enteredByTeacherId: subj === 'Mathematics' ? 't1' : subj === 'Science' ? 't3' : 't2'
        });

        list.push({
          id: `ast-${studentId}-${term}-${subj}-END`,
          studentId,
          subject: subj,
          type: 'END-OF-TERM',
          term,
          score: Math.round(endScore),
          date: '2026-05-30',
          locked: term === 'Term 1' || term === 'Term 2',
          enteredByTeacherId: subj === 'Mathematics' ? 't1' : subj === 'Science' ? 't3' : 't2'
        });
      });
    });
  });

  return list;
};

export const INITIAL_ASSESSMENTS: Assessment[] = buildHistoricalAssessments();

export const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    title: 'Urgent: Visitation Day Postponed',
    content: 'Dear Parents/Guardians, please be notified that the Term 3 general school visitation day has been rescheduled due to national UNEB training activities on campus.',
    date: '2026-06-08',
    sender: 'Sister Mary Patricia (Headmistress)',
    targetStream: 'ALL',
    priority: 'URGENT',
    readBy: []
  },
  {
    id: 'n2',
    title: 'Extra Remedial Maths Program',
    content: 'We are commencing intensive early morning remedial mathematical exercises for all pupils in the P.5 Blue class stream.',
    date: '2026-06-09',
    sender: 'Mr. Christopher Mulema',
    targetStream: 'P.5 Blue',
    priority: 'INFO',
    readBy: []
  }
];

export const INITIAL_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: 'cal-1',
    title: 'Primary Term 3 2026 Academic Term',
    type: 'TERM_DATES',
    startDate: '2026-06-01',
    endDate: '2026-08-28',
    description: 'General teaching term dates for Kampala primary classes, running over a duration of 13 weeks.',
    classStream: 'ALL'
  }
];

export function buildHistoricalAttendance(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const studentIds = ['s1', 's2', 's3', 's4', 's5'];
  const streams: Record<string, ClassStream> = {
    s1: 'P.5 Blue',
    s2: 'P.5 Blue',
    s3: 'P.5 Blue',
    s4: 'P.5 Blue',
    s5: 'P.5 Gold'
  };

  const schoolDays = [
    '2026-05-18', '2026-05-19', '2026-05-20', '2026-05-21', '2026-05-22',
    '2026-05-25', '2026-05-26', '2026-05-27', '2026-05-28', '2026-05-29',
    '2026-06-01', '2026-06-02', 
    '2026-06-04', '2026-06-05',
    '2026-06-08', '2026-06-10'
  ];

  let recordCounter = 1;
  schoolDays.forEach(date => {
    studentIds.forEach(studentId => {
      let status: AttendanceStatus = 'PRESENT';
      const rand = Math.random();
      if (studentId === 's3' && rand > 0.8) {
        status = 'LATE';
      } else if (studentId === 's5' && rand > 0.9) {
        status = 'ABSENT';
      } else if (studentId === 's1' && rand > 0.95) {
        status = 'LATE';
      } else if (studentId === 's4' && rand > 0.85) {
        status = rand > 0.95 ? 'ABSENT' : 'LATE';
      }

      records.push({
        id: `att-${recordCounter++}`,
        studentId,
        date,
        status,
        classStream: streams[studentId],
        markedByTeacherId: streams[studentId] === 'P.5 Blue' ? 't1' : 't2'
      });
    });
  });

  return records;
}

export const INITIAL_NOTICES: SchoolNotice[] = [
  {
    id: 'nt1',
    title: 'Fire Drill Practice Tomorrow',
    content: 'Mandatory fire drill scheduled for 2:30 PM. All pupils must assemble at the main field.',
    targetAudience: 'ALL',
    createdAt: '2026-06-11T10:30:00Z'
  },
  {
    id: 'nt2',
    title: 'Math Workshop - P.5 Blue',
    content: 'Special mathematics enrichment workshop for P.5 Blue stream today after lunch.',
    targetAudience: 'CLASS',
    targetClassStream: 'P.5 Blue',
    createdAt: '2026-06-10T08:15:00Z'
  }
];

export const INITIAL_BEHAVIOR_LOGS: BehaviorLog[] = [
  {
    id: 'bl1',
    studentId: 's1',
    recordedById: 't1',
    logType: 'MERIT',
    description: 'Outstanding class participation and helped peers with algebra concepts',
    createdAt: '2026-06-11T09:15:00Z'
  },
  {
    id: 'bl2',
    studentId: 's3',
    recordedById: 't2',
    logType: 'DEMERIT',
    description: 'Disruptive behavior during English reading session',
    createdAt: '2026-06-10T14:30:00Z'
  }
];

export const INITIAL_SICKBAY_LOGS: SickbayLog[] = [
  {
    id: 'sb1',
    studentId: 's2',
    recordedById: 't3',
    symptoms: 'Mild fever and headache',
    treatmentGiven: 'Paracetamol administered, rest in sickbay',
    checkedInAt: '2026-06-11T08:45:00Z',
    notifiedParent: true
  }
];

export const INITIAL_ASSETS: AssetTracker[] = [
  {
    id: 'ast1',
    studentId: 's1',
    assetName: 'Mathematics Textbook',
    serialNumber: 'MTK-2026-001',
    issuedDate: '2026-02-01',
    isReturned: false
  },
  {
    id: 'ast2',
    studentId: 's5',
    assetName: 'Science Lab Notebook',
    serialNumber: 'LAB-2026-045',
    issuedDate: '2026-03-15',
    returnedDate: '2026-05-20',
    isReturned: true
  }
];