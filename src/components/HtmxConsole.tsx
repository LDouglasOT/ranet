import React, { useEffect, useRef } from 'react';
import { Terminal, RefreshCw, Layers, ShieldCheck, HelpCircle } from 'lucide-react';
import { HtmxLog } from '../types';

interface HtmxConsoleProps {
  logs: HtmxLog[];
  onClear: () => void;
}

export default function HtmxConsole({ logs, onClear }: HtmxConsoleProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom on new logs
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div id="htmx-network-console" className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden shadow-2xl font-mono text-xs">
      {/* Header */}
      <div className="bg-[#1e293b] px-4 py-2.5 flex items-center justify-between border-b border-[#334155]">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-emerald-400 animate-pulse" />
          <span className="text-[#94a3b8] font-bold tracking-wider uppercase text-[10px]">
            Django + HTMX Server Engine Emulator
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            WSGI Server Online
          </span>
          <button 
            onClick={onClear}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-700"
            title="Clear Console Logs"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Terminal View */}
      <div 
        ref={containerRef}
        className="p-4 h-48 overflow-y-auto space-y-2.5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent select-text bg-[#030712] text-slate-300"
      >
        {logs.length === 0 ? (
          <div className="text-slate-500 flex flex-col items-center justify-center h-full gap-1 py-4">
            <Layers size={20} className="stroke-1 text-slate-600 animate-pulse" />
            <p>Django WSGI thread ready. Interact with the UI to trigger SSR & HTMX cycles.</p>
            <p className="text-[10px] text-slate-600">Marks keyup auto-save, child transfers, and locks instantly pipe here.</p>
          </div>
        ) : (
          logs.map((log) => {
            const isHtmx = log.type === 'HTMX';
            const isSsr = log.type === 'SSR';
            const typeColor = isHtmx 
              ? 'text-sky-400 bg-sky-950/45 border-sky-800/40' 
              : isSsr 
                ? 'text-amber-400 bg-amber-950/45 border-amber-800/40'
                : 'text-emerald-400 bg-emerald-950/45 border-emerald-800/40';

            return (
              <div key={log.id} className="border-l-2 border-emerald-500 pl-3 py-1 bg-slate-900/25 rounded-r">
                {/* Meta details */}
                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                  <span className="text-slate-500">{log.timestamp}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider ${typeColor} border`}>
                    {log.type}
                  </span>
                  <span className="text-emerald-500 font-bold">{log.method}</span>
                  <span className="text-slate-400 select-all font-semibold">{log.url}</span>
                  <span className={`ml-auto font-mono ${log.status === 200 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    HTTP {log.status}
                  </span>
                </div>

                {/* Payload if present */}
                {log.payload && (
                  <div className="mt-1 text-[10px] bg-slate-950 p-2 rounded text-slate-400 text-[11px] overflow-x-auto whitespace-pre">
                    <span className="text-sky-400 font-semibold text-[9px] block uppercase opacity-75">Request Context / Payload:</span>
                    {log.payload}
                  </div>
                )}

                {/* Django templates / HTMX response snippet */}
                <div className="mt-1 bg-black/40 p-2 rounded border border-slate-800/60 overflow-x-auto">
                  <span className="text-amber-400 font-semibold text-[9px] block uppercase opacity-75">
                    {isHtmx ? 'HTMX Partial Render Response' : isSsr ? 'Django SSR Fully Formatted HTML Template' : 'System Systemic Broadcast'}:
                  </span>
                  <pre className="text-emerald-400 font-mono text-[11px] mt-0.5 scrollbar-none whitespace-pre-wrap">
                    {log.response}
                  </pre>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Info footer */}
      <div className="bg-[#0f172a] border-t border-[#1e293b] px-4 py-2 flex items-center gap-2 text-slate-500 text-[10px]">
        <ShieldCheck size={11} className="text-sky-400" />
        <span>HTMX Target triggers <code className="text-slate-400">hx-target</code>, swap behaviors inherit <code className="text-slate-400">hx-swap="innerHTML"</code> seamlessly.</span>
        <span className="ml-auto text-emerald-500/60 font-bold">★ SSR MONOLITHIC SIMULATION</span>
      </div>
    </div>
  );
}
