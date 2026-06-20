import { NextRequest, NextResponse } from 'next/server';

let lessonLogs: any[] = [];
let behaviorLogs: any[] = [];

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, teacherId, subjectAssignmentId, date, topicCovered, remarks, studentId, logType, description } = body;

  if (action === 'log_lesson') {
    const log = {
      id: `ll-${Date.now()}`,
      teacherId,
      subjectAssignmentId,
      date,
      topicCovered,
      remarks,
      createdAt: new Date().toISOString(),
    };

    lessonLogs.push(log);

    return NextResponse.json({
      success: true,
      log,
      message: 'Lesson log saved',
      html: `<div class="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
        <p class="text-xs text-emerald-800">Lesson for ${date} recorded: ${topicCovered?.substring(0, 50)}...</p>
      </div>`,
    });
  }

  if (action === 'log_behavior') {
    if (!['MERIT', 'DEMERIT'].includes(logType)) {
      return NextResponse.json({ error: 'logType must be MERIT or DEMERIT' }, { status: 400 });
    }

    const log = {
      id: `bl-${Date.now()}`,
      studentId,
      teacherId,
      logType,
      description,
      createdAt: new Date().toISOString(),
    };

    behaviorLogs.push(log);

    return NextResponse.json({
      success: true,
      log,
      message: `${logType} recorded`,
      html: `<div class="p-3 ${logType === 'MERIT' ? 'bg-emerald-50' : 'bg-rose-50'} border border-${logType === 'MERIT' ? 'emerald' : 'rose'}-200 rounded-lg">
        <p class="text-xs">${logType}: ${description?.substring(0, 60)}...</p>
      </div>`,
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function GET() {
  return NextResponse.json({ lessonLogs, behaviorLogs });
}