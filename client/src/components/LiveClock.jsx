import React, { useEffect, useState } from 'react';
import { Clock, CalendarDays } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

export function LiveClock() {
  const [time, setTime] = useState(new Date());
  const { lang } = useLanguage();

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Time: 2-digit 24-hr or 12-hr with seconds (e.g. 16:25:01)
  const timeStr = time.toLocaleTimeString('en-GB', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Days and Months translations
  const daysBM = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
  const daysEN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthsBM = [
    'Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun',
    'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'
  ];
  const monthsEN = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const dayName = (lang === 'en' ? daysEN : daysBM)[time.getDay()];
  const monthName = (lang === 'en' ? monthsEN : monthsBM)[time.getMonth()];
  const dateNum = time.getDate();
  const yearNum = time.getFullYear();

  const dateStr = `${dayName}, ${dateNum} ${monthName} ${yearNum}`;

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 dark:bg-slate-900/80 dark:border-slate-800 px-2 sm:px-3 py-1 sm:py-1.5 text-xs shadow-2xs">
      {/* Live status dot */}
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
      </span>

      {/* Date */}
      <div className="hidden md:flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
        <CalendarDays size={13} className="text-red-600 dark:text-red-400 shrink-0" />
        <span>{dateStr}</span>
      </div>

      <div className="hidden md:block h-3.5 w-px bg-slate-200 dark:bg-slate-700" />

      {/* Time */}
      <div className="flex items-center gap-1 font-mono font-bold text-slate-900 dark:text-slate-100 text-[11px] sm:text-xs">
        <Clock size={13} className="text-red-600 dark:text-red-400 shrink-0" />
        <span className="tracking-wider">{timeStr}</span>
      </div>
    </div>
  );
}
