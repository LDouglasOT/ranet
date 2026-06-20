'use client';

import { AssetTracker } from '@/types';

interface HomeworkAssetTabProps {
  pendingAssignments: Array<{
    id: string;
    subject: string;
    dueDate: string;
    title: string;
    description: string;
  }>;
  assets: AssetTracker[];
}

export default function HomeworkAssetTab({ pendingAssignments, assets }: HomeworkAssetTabProps) {
  const issuedAssets = assets.filter((a) => !a.isReturned);

  return (
    <div id="homework-assets-tab" className="space-y-6">
      <div className="border-b pb-3 mb-2">
        <h3 className="text-base font-extrabold text-slate-900">Homework & Assets</h3>
        <p className="text-xs text-slate-400">Pending assignments and currently issued school properties.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.82 5.435 9.49 5 8 5a4 4 0 00-4 4v8a4 4 0 004 4h8a4 4 0 004-4v-8a4 4 0 00-4-4h-2.536l-2.536-2.536A4 4 0 0012 2.753z" />
            </svg>
            Pending Assignments
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
                    <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      Due: {new Date(a.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
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
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4V11L4 7z" />
            </svg>
            Issued Assets
          </h4>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {issuedAssets.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <p className="text-xs">No assets currently issued.</p>
              </div>
            ) : (
              issuedAssets.map((ast) => (
                <div key={ast.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="font-bold text-slate-800 text-sm">{ast.assetName}</h5>
                    <span className="text-[9px] font-mono text-slate-500 bg-slate-200 px-2 py-0.5 rounded">#{ast.serialNumber}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Issued: {new Date(ast.issuedDate).toLocaleDateString()}</p>
                  <span className="inline-block text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full mt-1">Still Issued</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}