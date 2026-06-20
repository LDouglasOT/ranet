import React, { useState } from 'react';
import { Calendar, Trash2, Clock, CalendarDays, Filter, Plus, BellRing, Sparkles } from 'lucide-react';
import { CalendarEvent, CalendarEventType, ClassStream } from '../types';

interface SchoolCalendarProps {
  events: CalendarEvent[];
  isAdmin?: boolean;
  onRemoveEvent?: (id: string) => void;
  // Included to support adding directly from inline widget if we want
}

export default function SchoolCalendar({
  events,
  isAdmin = false,
  onRemoveEvent
}: SchoolCalendarProps) {
  const [filterType, setFilterType] = useState<'ALL' | CalendarEventType>('ALL');
  
  // Pivot date is June 10, 2026 based on workspace metadata
  const CURRENT_DATE_STR = '2026-06-10';
  const currentDate = new Date(CURRENT_DATE_STR);

  // Helper to compute status and remaining days
  const getEventStatus = (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    
    // Clear times for exact day comparisons
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);
    currentDate.setHours(12,0,0,0);

    if (currentDate >= start && currentDate <= end) {
      return { label: 'Ongoing Now', style: 'bg-emerald-50 text-emerald-800 border-emerald-250 font-black animate-pulse' };
    } else if (currentDate < start) {
      const diffTime = Math.abs(start.getTime() - currentDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { 
        label: diffDays === 1 ? 'Starts tomorrow' : `Starts in ${diffDays} days`, 
        style: 'bg-indigo-50 text-indigo-800 border-indigo-250 font-bold' 
      };
    } else {
      return { label: 'Completed', style: 'bg-slate-100 text-slate-505 border-slate-200 text-[10px]' };
    }
  };

  // Helper to format date range beautifully
  const formatEventDate = (startStr: string, endStr: string) => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    const start = new Date(startStr);
    const end = new Date(endStr);
    
    if (startStr === endStr) {
      return start.toLocaleDateString('en-US', options);
    }
    
    // If of the same month, simplify look
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.getDate()}, ${end.getFullYear()}`;
    }
    
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', options)}`;
  };

  // Filter events list
  const filteredEvents = events
    .filter(ev => filterType === 'ALL' || ev.type === filterType)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  // Count active stats
  const activeExamsCount = events.filter(e => e.type === 'EXAMS').length;
  const activeHolidaysCount = events.filter(e => e.type === 'PUBLIC_HOLIDAY').length;

  return (
    <div className="space-y-4 font-sans text-xs">
      
      {/* Calendar Metric Ribbon bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-emerald-50/50 border border-emerald-150 p-2.5 rounded-xl flex items-center gap-2">
          <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
            <CalendarDays size={13} />
          </span>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider leading-none">Terminal Term</span>
            <span className="text-slate-800 font-extrabold leading-none">Term 3, 2026</span>
          </div>
        </div>

        <div className="bg-rose-50/50 border border-rose-150 p-2.5 rounded-xl flex items-center gap-2">
          <span className="p-1.5 bg-rose-100 text-rose-800 rounded-lg">
            <BellRing size={13} className="animate-pulse" />
          </span>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider leading-none">Public Breaks</span>
            <span className="text-slate-800 font-extrabold leading-none">{activeHolidaysCount} Listed Holidays</span>
          </div>
        </div>

        <div className="bg-red-50/40 border border-red-150 p-2.5 rounded-xl flex items-center gap-2">
          <span className="p-1.5 bg-red-100 text-red-800 rounded-lg">
            <Clock size={13} />
          </span>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider leading-none">Assessment Blocks</span>
            <span className="text-slate-800 font-extrabold leading-none">{activeExamsCount} Exam Periods</span>
          </div>
        </div>

        <div className="bg-indigo-50/50 border border-indigo-150 p-2.5 rounded-xl flex items-center gap-2">
          <span className="p-1.5 bg-indigo-100 text-indigo-800 rounded-lg">
            <Sparkles size={13} />
          </span>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider leading-none">Active Register</span>
            <span className="text-slate-800 font-extrabold leading-none">{events.length} Core Milestones</span>
          </div>
        </div>
      </div>

      {/* Selector Tabs for Calendars */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg border">
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
              filterType === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All Dates
          </button>
          <button
            type="button"
            onClick={() => setFilterType('TERM_DATES')}
            className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
              filterType === 'TERM_DATES'
                ? 'bg-emerald-550 border border-emerald-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-emerald-700'
            }`}
          >
            Terms
          </button>
          <button
            type="button"
            onClick={() => setFilterType('PUBLIC_HOLIDAY')}
            className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
              filterType === 'PUBLIC_HOLIDAY'
                ? 'bg-rose-550 border border-rose-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-rose-700'
            }`}
          >
            Holidays
          </button>
          <button
            type="button"
            onClick={() => setFilterType('EXAMS')}
            className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
              filterType === 'EXAMS'
                ? 'bg-red-550 border border-red-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-red-700'
            }`}
          >
            Exams
          </button>
          <button
            type="button"
            onClick={() => setFilterType('EVENT')}
            className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
              filterType === 'EVENT'
                ? 'bg-purple-600 border border-purple-700 text-white shadow-xs'
                : 'text-slate-500 hover:text-purple-700'
            }`}
          >
            Events
          </button>
        </div>

        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
          <Clock size={11} />
          Current Academic Target: <strong className="text-slate-700">June 10, 2026</strong>
        </span>
      </div>

      {/* Timeline Output Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEvents.length === 0 ? (
          <div className="md:col-span-2 py-8 text-center bg-slate-50 border border-slate-150 rounded-xl">
            <Calendar size={22} className="text-slate-300 mx-auto mb-2 animate-bounce" />
            <p className="font-bold text-slate-700">No scheduled academic events matching filter</p>
            <p className="text-[10px] text-slate-450 mt-0.5">Please check again later or select another filter view tab.</p>
          </div>
        ) : (
          filteredEvents.map(event => {
            const dateStatus = getEventStatus(event.startDate, event.endDate);
            let badgeStyle = '';
            let indicatorColor = '';
            
            switch (event.type) {
              case 'TERM_DATES':
                badgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                indicatorColor = 'bg-emerald-500';
                break;
              case 'PUBLIC_HOLIDAY':
                badgeStyle = 'bg-rose-100 text-rose-800 border-rose-200';
                indicatorColor = 'bg-rose-500';
                break;
              case 'EXAMS':
                badgeStyle = 'bg-red-100 text-red-800 border-red-200';
                indicatorColor = 'bg-red-500';
                break;
              case 'EVENT':
                badgeStyle = 'bg-purple-100 text-purple-800 border-purple-200';
                indicatorColor = 'bg-purple-500';
                break;
            }

            return (
              <div 
                key={event.id}
                className="bg-white border hover:border-slate-350 hover:shadow-md hover:-translate-y-0.5 transition-all p-4 rounded-xl flex flex-col justify-between space-y-3 relative overflow-hidden"
              >
                {/* Left accent bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${indicatorColor}`} />

                <div className="space-y-1.5 pl-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 text-[8.5px] font-black uppercase rounded border tracking-wider leading-none ${badgeStyle}`}>
                        {event.type.replace('_', ' ')}
                      </span>
                      {event.classStream && event.classStream !== 'ALL' && (
                        <span className="bg-slate-100 text-slate-600 text-[8px] font-bold border rounded px-1 tracking-tight">
                          Only: {event.classStream}
                        </span>
                      )}
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[9px] border ${dateStatus.style}`}>
                      {dateStatus.label}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 tracking-tight leading-snug">
                    {event.title}
                  </h4>

                  {event.description && (
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                      {event.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 pl-1.5">
                  <span className="text-[10px] text-indigo-950 font-bold flex items-center gap-1">
                    <CalendarDays size={12} className="text-indigo-650" />
                    {formatEventDate(event.startDate, event.endDate)}
                  </span>

                  {isAdmin && onRemoveEvent && (
                    <button
                      type="button"
                      onClick={() => onRemoveEvent(event.id)}
                      className="text-slate-450 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded transition-colors cursor-pointer"
                      title="De-register calendar event record"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
