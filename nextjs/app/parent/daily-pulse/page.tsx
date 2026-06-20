'use client';

import { SchoolNotice, BehaviorLog, SickbayLog } from '@/types';

interface DailyPulseTabProps {
  notices: SchoolNotice[];
  behaviorLogs: BehaviorLog[];
  sickbayLogs: SickbayLog[];
}

export default function DailyPulseTab({ notices, behaviorLogs, sickbayLogs }: DailyPulseTabProps) {
  return (
    <div id="daily-pulse-tab" className="space-y-6">
      <div className="border-b pb-3 mb-2">
        <h3 className="text-base font-extrabold text-slate-900">Daily Pulse Feed</h3>
        <p className="text-xs text-slate-400">Real-time updates on school notices, behavior logs, and health status.</p>
      </div>

      <div className="space-y-5 max-h-[500px] overflow-y-auto">
        <div>
          <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19a5 5 0 01-10 0V5.882a5 5 0 0110 0z" />
            </svg>
            School Notices
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notices.length === 0 ? (
              <p className="text-xs text-slate-400">No recent notices.</p>
            ) : (
              notices.map((n) => (
                <div key={n.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="font-bold text-slate-800 text-sm">{n.title}</h5>
                    <span className="text-[9px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                      {new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{n.content}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-4 border-t">
          <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Behavior Timeline
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
                  <span className="text-[9px] text-slate-500">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-4 border-t">
          <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            Health Status Alerts
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
  );
}