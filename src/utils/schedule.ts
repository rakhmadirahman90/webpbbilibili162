export interface ScheduleInfo {
  isRabuActive: boolean;
  isJumatActive: boolean;
  isAhadActive: boolean;
  isRabuFinished: boolean;
  isJumatFinished: boolean;
  isAhadFinished: boolean;
  isTodayFinished: boolean;
  isOngoing: boolean;
  activeSessionName: string;
  nextSessionName: string;
  nextSessionLocation: string;
  nextSessionDay: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function computeScheduleInfo(): ScheduleInfo {
  const now = new Date();
  
  // WITA is UTC+8. Calculate current WITA timestamp in absolute milliseconds
  const witaMs = now.getTime() + 8 * 3600 * 1000;
  const witaDate = new Date(witaMs);

  const day = witaDate.getUTCDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
  const hour = witaDate.getUTCHours();
  const minute = witaDate.getUTCMinutes();

  // Active session check (08:00 - 12:00 WITA)
  const isTimeInSession = (hour > 8 || (hour === 8 && minute >= 0)) && hour < 12;
  const isTimeAfterSession = hour >= 12;

  const isRabuActive = day === 3 && isTimeInSession;
  const isJumatActive = day === 5 && isTimeInSession;
  const isAhadActive = day === 0 && isTimeInSession;

  const isRabuFinished = day === 3 && isTimeAfterSession;
  const isJumatFinished = day === 5 && isTimeAfterSession;
  const isAhadFinished = day === 0 && isTimeAfterSession;

  const isTodayFinished = isRabuFinished || isJumatFinished || isAhadFinished;

  const isOngoing = isRabuActive || isJumatActive || isAhadActive;

  const sessions = [
    { day: 0, name: 'Sesi Ahad (GOR A4 Soreang)', location: 'GOR A4 Soreang', dayName: 'Ahad' },
    { day: 3, name: 'Sesi Rabu (GOR SMAN 4 Parepare)', location: 'GOR SMAN 4 Parepare', dayName: 'Rabu' },
    { day: 5, name: 'Sesi Jumat (GOR SMAN 4 Parepare)', location: 'GOR SMAN 4 Parepare', dayName: 'Jumat' },
  ];

  let nextTargetMs = Infinity;
  let nextSession = sessions[0];

  if (isOngoing) {
    // When a session is ongoing, countdown to the END of today's session (12:00 WITA)
    const endTodayWita = new Date(witaMs);
    endTodayWita.setUTCHours(12, 0, 0, 0);
    nextTargetMs = endTodayWita.getTime();
    if (isRabuActive) nextSession = sessions[1];
    else if (isJumatActive) nextSession = sessions[2];
    else nextSession = sessions[0];
  } else {
    // Find the next upcoming 08:00 WITA session
    for (const s of sessions) {
      let daysAhead = s.day - day;
      if (daysAhead < 0) {
        daysAhead += 7;
      } else if (daysAhead === 0) {
        // If today is the session day:
        // - Before 08:00 WITA: the session is later today (daysAhead = 0)
        // - After 12:00 WITA: today's session ended, next one is next week (daysAhead = 7)
        if (hour >= 12) {
          daysAhead = 7;
        }
      }
      
      const targetDate = new Date(witaMs);
      targetDate.setUTCDate(witaDate.getUTCDate() + daysAhead);
      targetDate.setUTCHours(8, 0, 0, 0);

      const diff = targetDate.getTime() - witaMs;
      if (diff > 0 && diff < nextTargetMs) {
        nextTargetMs = targetDate.getTime();
        nextSession = s;
      }
    }
  }

  const diffMs = Math.max(0, nextTargetMs - witaMs);
  const diffSec = Math.floor(diffMs / 1000);

  const days = Math.floor(diffSec / (3600 * 24));
  const hours = Math.floor((diffSec % (3600 * 24)) / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  let activeSessionName = '';
  if (isRabuActive) activeSessionName = 'Sesi Rabu di GOR SMAN 4 Parepare';
  else if (isJumatActive) activeSessionName = 'Sesi Jumat di GOR SMAN 4 Parepare';
  else if (isAhadActive) activeSessionName = 'Sesi Ahad di GOR A4 Soreang';

  return {
    isRabuActive,
    isJumatActive,
    isAhadActive,
    isRabuFinished,
    isJumatFinished,
    isAhadFinished,
    isTodayFinished,
    isOngoing,
    activeSessionName,
    nextSessionName: nextSession.name,
    nextSessionLocation: nextSession.location,
    nextSessionDay: nextSession.dayName,
    days,
    hours,
    minutes,
    seconds
  };
}

