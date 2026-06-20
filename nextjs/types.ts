export type Role = 'ADMIN' | 'TEACHER' | 'PARENT';

export interface User {
  id: string;
  username?: string;
  role: Role;
  name: string;
  phoneNumber?: string;
  studentPin?: string;
}

export type ClassStream = 'P.5 Blue' | 'P.5 Gold' | 'P.6 Green' | 'P.6 Red' | 'P.7 Eagle' | 'P.7 Lion';
export type Subject = 'Mathematics' | 'English' | 'Science' | 'Social Studies';
export type AssessmentType = 'TEST' | 'MID-TERM' | 'END-OF-TERM';
export type Term = 'Term 1' | 'Term 2' | 'Term 3';

export interface SubjectAssignment {
  id: string;
  teacherId: string;
  teacherName: string;
  classStream: ClassStream;
  subject: Subject;
}

export interface Student {
  id: string;
  name: string;
  gender: 'Male' | 'Female';
  parentName: string;
  parentPhone: string;
  pin: string;
  classStream: ClassStream;
  avatar?: string;
}

export interface Assessment {
  id: string;
  studentId: string;
  subject: Subject;
  type: AssessmentType;
  term: Term;
  score: number;
  date: string;
  locked: boolean;
  enteredByTeacherId: string;
}

export interface HtmxLog {
  id: string;
  timestamp: string;
  type: 'HTMX' | 'SSR' | 'SYSTEM';
  method: 'GET' | 'POST' | 'PUT';
  url: string;
  payload?: string;
  status: number;
  response: string;
}

export type NotificationPriority = 'URGENT' | 'NORMAL' | 'SUCCESS' | 'INFO';

export interface Notification {
  id: string;
  title: string;
  content: string;
  date: string;
  sender: string;
  targetStream: 'ALL' | ClassStream | 'CUSTOM';
  targetPhone?: string;
  targetSelectedStudents?: string[];
  targetSelectedParents?: string[];
  targetSelectedPhones?: string[];
  priority: NotificationPriority;
  readBy: string[];
}

export type CalendarEventType = 'TERM_DATES' | 'PUBLIC_HOLIDAY' | 'EXAMS' | 'EVENT';

export interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  startDate: string;
  endDate: string;
  description?: string;
  classStream?: 'ALL' | ClassStream;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  classStream: ClassStream;
  markedByTeacherId: string;
}

export type TargetAudience = 'ALL' | 'TEACHERS' | 'CLASS';
export type LogType = 'MERIT' | 'DEMERIT';

export interface DailyLessonLog {
  id: string;
  teacherId: string;
  subjectAssignmentId: string;
  date: string;
  topicCovered: string;
  remarks?: string;
  createdAt?: string;
}

export interface SchoolNotice {
  id: string;
  title: string;
  content: string;
  targetAudience: TargetAudience;
  targetClassStream?: ClassStream;
  createdAt: string;
}

export interface BehaviorLog {
  id: string;
  studentId: string;
  studentName?: string;
  recordedById: string;
  recordedByName?: string;
  logType: LogType;
  description: string;
  createdAt: string;
}

export interface SickbayLog {
  id: string;
  studentId: string;
  studentName?: string;
  recordedById: string;
  recordedByName?: string;
  symptoms: string;
  treatmentGiven: string;
  checkedInAt: string;
  notifiedParent: boolean;
  createdAt?: string;
}

export interface AssetTracker {
  id: string;
  studentId: string;
  studentName?: string;
  assetName: string;
  serialNumber: string;
  issuedDate: string;
  returnedDate?: string;
  isReturned: boolean;
}