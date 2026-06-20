import { NextRequest, NextResponse } from 'next/server';
import { DailyLessonLog, BehaviorLog } from '../../../types';

let lessonLogs: DailyLessonLog[] = [];
let behaviorLogs: BehaviorLog[] = [];

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, teacherId, subjectAssignmentId, date, topicCovered, remarks, studentId, logType, description } = body;

  if (action === 'log_lesson') {
    const log: DailyLessonLog = {
      id: `ll-${Date.now()}`,
      teacherId: teacherId || '',
      subjectAssignmentId: subjectAssignmentId || '',
      date: date || new Date().toISOString().split('T')[0],
      topicCovered: topicCovered || '',
      remarks: remarks || '',
      createdAt: new Date().toISOString(),
    };

    lessonLogs.push(log);

    return NextResponse.json({
      success: true,
      log,
      message: 'Lesson log saved',
      html: `<div class="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
        <p class="text-xs text-emerald-800">Lesson for ${log.date} recorded: ${log.topicCovered?.substring(0, 50)}...</p>
      </div>`,
    });
  }

  if (action === 'log_behavior') {
    if (!['MERIT', 'DEMERIT'].includes(logType)) {
      return NextResponse.json({ success: false, error: 'logType must be MERIT or DEMERIT' }, { status: 400 });
    }

    const log: BehaviorLog = {
      id: `bl-${Date.now()}`,
      studentId: studentId || '',
      teacherId: teacherId || '',
      logType: logType as 'MERIT' | 'DEMERIT',
      description: description || '',
      createdAt: new Date().toISOString(),
    };

    behaviorLogs.push(log);

    return NextResponse.json({
      success: true,
      log,
      message: `${logType} recorded`,
      html: `<div class="p-3 ${logType === 'MERIT' ? 'bg-emerald-50' : 'bg-rose-50'} border border-${logType === 'MERIT' ? 'emerald' : 'rose'}-200 rounded-lg">
        <p class="text-xs">${logType}: ${log.description?.substring(0, 60)}...</p>
      </div>`,
    });
  }

  return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
}

export async function GET() {
  return NextResponse.json({ lessonLogs, behaviorLogs });
}