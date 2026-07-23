export interface ScheduleInfo {
  isRabuActive: boolean;
  isJumatActive: boolean;
  isAhadActive: boolean;
  isRabuFinished: boolean;
  isJumatFinished: boolean;
  isAhadFinished: boolean;
  isTodayFinished: boolean;
  isAllFinished: boolean;
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

  // Days since Wednesday (Wed = 0, Thu = 1, Fri = 2, Sat = 3, Sun = 4, Mon = 5, Tue = 6)
  const dWed = (day + 4) % 7;
  const currentMin = dWed * 1440 + hour * 60 + minute;

  // Session time windows in minutes from Wednesday 00:00:
  // Rabu (Wed): start 480 (08:00), end 720 (12:00)
  // Jumat (Fri): start 3360 (08:00), end 3600 (12:00)
  // Ahad (Sun): start 6240 (08:00), end 6480 (12:00)
  // Next Wednesday 08:00: 10560 minutes

  const isRabuActive = currentMin >= 480 && currentMin < 720;
  const isJumatActive = currentMin >= 3360 && currentMin < 3600;
  const isAhadActive = currentMin >= 6240 && currentMin < 6480;

  const isOngoing = isRabuActive || isJumatActive || isAhadActive;

  const isRabuFinished = currentMin >= 720;
  const isJumatFinished = currentMin >= 3600;
  const isAhadFinished = currentMin >= 6480;

  const isAllFinished = isAhadFinished;

  const isTodayFinished = (day === 3 && isRabuFinished) || (day === 5 && isJumatFinished) || (day === 0 && isAhadFinished);

  const sessions = [
    { dayIndex: 3, name: 'Sesi Rabu (GOR SMAN 4 Parepare)', location: 'GOR SMAN 4 Parepare', dayName: 'Rabu', startMin: 480, endMin: 720 },
    { dayIndex: 5, name: 'Sesi Jumat (GOR SMAN 4 Parepare)', location: 'GOR SMAN 4 Parepare', dayName: 'Jumat', startMin: 3360, endMin: 3600 },
    { dayIndex: 0, name: 'Sesi Ahad (GOR A4 Soreang)', location: 'GOR A4 Soreang', dayName: 'Ahad', startMin: 6240, endMin: 6480 },
  ];

  let nextTargetMs = Infinity;
  let nextSession = sessions[0];

  if (isOngoing) {
    const endTodayWita = new Date(witaMs);
    endTodayWita.setUTCHours(12, 0, 0, 0);
    nextTargetMs = endTodayWita.getTime();
    if (isRabuActive) nextSession = sessions[0];
    else if (isJumatActive) nextSession = sessions[1];
    else nextSession = sessions[2];
  } else {
    let targetMin = -1;
    let targetSessionObj = sessions[0];

    if (currentMin < 480) {
      targetMin = 480;
      targetSessionObj = sessions[0];
    } else if (currentMin >= 720 && currentMin < 3360) {
      targetMin = 3360;
      targetSessionObj = sessions[1];
    } else if (currentMin >= 3600 && currentMin < 6240) {
      targetMin = 6240;
      targetSessionObj = sessions[2];
    } else {
      targetMin = 10560;
      targetSessionObj = sessions[0];
    }

    const wedDate = new Date(witaMs);
    let diffToWed = day - 3;
    if (diffToWed < 0) diffToWed += 7;
    wedDate.setUTCDate(wedDate.getUTCDate() - diffToWed);
    wedDate.setUTCHours(0, 0, 0, 0);

    const targetDateMs = wedDate.getTime() + targetMin * 60 * 1000;
    nextTargetMs = targetDateMs;
    nextSession = targetSessionObj;
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
    isAllFinished,
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

