import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Compass, AlertCircle, Loader2, Calendar } from 'lucide-react';

interface PrayerTimings {
  Imsak: string;
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

interface HijriDate {
  day: string;
  month: { en: string; ar: string };
  year: string;
}

interface CityOption {
  name: string;
  apiName: string;
}

const INDONESIAN_CITIES: CityOption[] = [
  { name: 'Parepare', apiName: 'Parepare' },
  { name: 'Makassar', apiName: 'Makassar' },
  { name: 'Jakarta', apiName: 'Jakarta' },
  { name: 'Surabaya', apiName: 'Surabaya' },
  { name: 'Bandung', apiName: 'Bandung' },
  { name: 'Medan', apiName: 'Medan' },
  { name: 'Semarang', apiName: 'Semarang' },
  { name: 'Yogyakarta', apiName: 'Yogyakarta' },
  { name: 'Palembang', apiName: 'Palembang' },
  { name: 'Denpasar', apiName: 'Denpasar' },
  { name: 'Samarinda', apiName: 'Samarinda' },
  { name: 'Banjarmasin', apiName: 'Banjarmasin' },
  { name: 'Bogor', apiName: 'Bogor' },
];

const FALLBACK_TIMINGS: Record<string, PrayerTimings> = {
  Default: {
    Imsak: '04:37',
    Fajr: '04:47',
    Sunrise: '06:05',
    Dhuhr: '12:12',
    Asr: '15:35',
    Maghrib: '18:13',
    Isha: '19:25',
  }
};

export default function PrayerTimes() {
  const [selectedCity, setSelectedCity] = useState<CityOption>(INDONESIAN_CITIES[0]);
  const [detectedCoords, setDetectedCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [detectedCityName, setDetectedCityName] = useState<string>('');
  const [timings, setTimings] = useState<PrayerTimings | null>(null);
  const [hijri, setHijri] = useState<HijriDate | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string; minutesLeft: number } | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Function to detect location via GPS or fallback IP
  const detectLocation = () => {
    setLoading(true);
    setError(null);

    // Helper to fetch IP-based location
    const fetchIpLocation = async () => {
      try {
        const res = await fetch('https://freeipapi.com/api/json');
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
            const lat = data.latitude;
            const lon = data.longitude;
            setDetectedCoords({ lat, lon });
            const cityName = data.cityName || 'Lokasi Saya';
            setDetectedCityName(cityName);
            setSelectedCity({ name: `📍 ${cityName}`, apiName: 'detected' });
            return;
          }
        }
      } catch (e) {
        console.warn('IP lookup failed or blocked:', e);
      }
      
      // Fallback silently and safely to Parepare
      setSelectedCity(INDONESIAN_CITIES[0]);
      setDetectedCoords(null);
      setError('Akses lokasi ditolak. Menggunakan Parepare.');
      setLoading(false);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setDetectedCoords({ lat, lon });
          setDetectedCityName('Lokasi GPS');
          setSelectedCity({ name: '📍 Lokasi GPS', apiName: 'detected' });
          setLoading(false);
        },
        (geoError) => {
          console.warn('Geolocation permission or lookup failed:', geoError);
          // Try IP-based location as fallback
          fetchIpLocation();
        },
        { timeout: 6000, enableHighAccuracy: false }
      );
    } else {
      fetchIpLocation();
    }
  };

  // Trigger location detection on mount
  useEffect(() => {
    detectLocation();
  }, []);

  // Real-time ticking for time comparison
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Prayer Times
  useEffect(() => {
    let active = true;
    const fetchPrayerTimes = async () => {
      setLoading(true);
      setError(null);
      try {
        let url = '';
        if (selectedCity.apiName === 'detected' && detectedCoords) {
          url = `https://api.aladhan.com/v1/timings?latitude=${detectedCoords.lat}&longitude=${detectedCoords.lon}&method=2`;
        } else {
          url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(selectedCity.apiName)}&country=Indonesia&method=2`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Gagal mengambil data jadwal sholat');
        const resData = await response.json();
        
        if (active && resData?.data) {
          const apiTimings = resData.data.timings;
          setTimings({
            Imsak: apiTimings.Imsak,
            Fajr: apiTimings.Fajr,
            Sunrise: apiTimings.Sunrise,
            Dhuhr: apiTimings.Dhuhr,
            Asr: apiTimings.Asr,
            Maghrib: apiTimings.Maghrib,
            Isha: apiTimings.Isha,
          });
          setHijri(resData.data.date.hijri);
        }
      } catch (err: any) {
        console.error(err);
        if (active) {
          setError('Koneksi lambat. Menggunakan estimasi Parepare.');
          setTimings(FALLBACK_TIMINGS.Default);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchPrayerTimes();
    return () => {
      active = false;
    };
  }, [selectedCity, detectedCoords]);

  // Synchronize timings with localStorage and dispatch custom event for App.tsx
  useEffect(() => {
    if (timings) {
      try {
        localStorage.setItem('cached_prayer_timings', JSON.stringify(timings));
        localStorage.setItem('cached_prayer_city', JSON.stringify(selectedCity));
      } catch (e) {
        console.warn('Failed to save prayer times to localStorage', e);
      }
      
      window.dispatchEvent(new CustomEvent('prayer-times-loaded', {
        detail: {
          timings,
          cityName: selectedCity.name
        }
      }));
    }
  }, [timings, selectedCity]);

  // Determine Upcoming/Next Prayer
  useEffect(() => {
    if (!timings) return;

    const findNextPrayer = () => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTotalMinutes = currentHours * 60 + currentMinutes;

      const prayerOrder = [
        { name: 'Imsak', time: timings.Imsak },
        { name: 'Subuh', time: timings.Fajr },
        { name: 'Dzuhur', time: timings.Dhuhr },
        { name: 'Ashar', time: timings.Asr },
        { name: 'Maghrib', time: timings.Maghrib },
        { name: 'Isya', time: timings.Isha },
      ];

      let selected = null;
      let minDiff = Infinity;

      for (const prayer of prayerOrder) {
        const [pStrHours, pStrMinutes] = prayer.time.split(':');
        const pHours = parseInt(pStrHours, 10);
        const pMinutes = parseInt(pStrMinutes, 10);
        const prayerTotalMinutes = pHours * 60 + pMinutes;

        let diff = prayerTotalMinutes - currentTotalMinutes;
        // If the prayer has passed today, it will be tomorrow
        if (diff < 0) {
          diff += 24 * 60; // Add one full day
        }

        if (diff < minDiff) {
          minDiff = diff;
          selected = { name: prayer.name, time: prayer.time, minutesLeft: diff };
        }
      }

      setNextPrayer(selected);
    };

    findNextPrayer();
    const interval = setInterval(findNextPrayer, 30000); // update every 30s
    return () => clearInterval(interval);
  }, [timings, currentTime]);

  const getPrayerIndoName = (key: string) => {
    switch (key) {
      case 'Imsak': return 'Imsak';
      case 'Fajr': return 'Subuh';
      case 'Sunrise': return 'Terbit';
      case 'Dhuhr': return 'Dzuhur';
      case 'Asr': return 'Ashar';
      case 'Maghrib': return 'Maghrib';
      case 'Isha': return 'Isya';
      default: return key;
    }
  };

  const getHijriMonthIndo = (monthEn: string) => {
    const months: Record<string, string> = {
      'Muharram': 'Muharram',
      'Safar': 'Safar',
      "Rabi' al-awwal": 'Rabiul Awal',
      "Rabi' ath-thani": 'Rabiul Akhir',
      'Jumada al-ula': 'Jumadil Ula',
      'Jumada al-akhirah': 'Jumadil Akhir',
      'Rajab': 'Rajab',
      "Sha'ban": "Sya'ban",
      'Ramadan': 'Ramadhan',
      'Shawwal': 'Syawal',
      "Dhu al-qi'dah": 'Dzulqaidah',
      'Dhu al-hijjah': 'Dzulhijjah'
    };
    return months[monthEn] || monthEn;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden h-full flex flex-col justify-between">
      {/* Decorative Gradient Glows */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Compass className="text-emerald-400 animate-spin-slow shrink-0" size={20} />
            <div>
              <h3 className="text-base font-black uppercase tracking-wider italic leading-none">
                Jadwal <span className="text-emerald-400">Sholat</span>
              </h3>
              <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase mt-1">
                Klub PB US 162
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 bg-[#151d30] border border-white/10 px-2.5 py-1 rounded-xl text-[10px] font-semibold text-slate-300">
            <MapPin size={11} className="text-emerald-400 shrink-0" />
            <select
              value={selectedCity.apiName === 'detected' ? 'detected' : selectedCity.name}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'detected') {
                  // Keep detected
                } else if (val === 'auto-detect') {
                  detectLocation();
                } else {
                  const found = INDONESIAN_CITIES.find(c => c.name === val);
                  if (found) {
                    setSelectedCity(found);
                    setDetectedCoords(null);
                  }
                }
              }}
              className="bg-transparent border-none outline-none font-bold text-[10px] cursor-pointer text-slate-100 uppercase tracking-wider"
            >
              {detectedCoords && (
                <option value="detected" className="bg-slate-900 text-emerald-400 font-bold">
                  {selectedCity.name}
                </option>
              )}
              <option value="auto-detect" className="bg-slate-900 text-emerald-300 font-bold">
                🔄 DETEKSI OTOMATIS
              </option>
              {INDONESIAN_CITIES.map((city) => (
                <option key={city.name} value={city.name} className="bg-slate-900 text-slate-100">
                  {city.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Hijri Calendar Display */}
        {hijri && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-slate-800/40 rounded-xl border border-white/5">
            <Calendar size={13} className="text-slate-400" />
            <span className="text-[10.5px] font-black tracking-widest text-emerald-300 uppercase italic">
              {hijri.day} {getHijriMonthIndo(hijri.month.en)} {hijri.year} H
            </span>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <Loader2 className="animate-spin text-emerald-400" size={24} />
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Menyelaraskan waktu...</p>
          </div>
        )}

        {/* Prayer Times Grid */}
        {!loading && timings && (
          <div className="space-y-2">
            {(Object.keys(timings) as Array<keyof PrayerTimings>).map((key) => {
              const nameIndo = getPrayerIndoName(key);
              const timeValue = timings[key];
              const isNext = nextPrayer && nextPrayer.name === nameIndo;

              return (
                <div
                  key={key}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all border ${
                    isNext
                      ? 'bg-gradient-to-r from-emerald-950/40 to-slate-900 border-emerald-500/30 shadow-lg shadow-emerald-950/30'
                      : 'bg-slate-800/20 border-white/5 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isNext && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    )}
                    <span className={`text-[11px] font-black uppercase tracking-widest ${
                      isNext ? 'text-emerald-400 italic' : 'text-slate-300'
                    }`}>
                      {nameIndo}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-xs font-extrabold ${
                      isNext ? 'text-emerald-400 scale-105' : 'text-slate-200'
                    }`}>
                      {timeValue}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Dynamic Countdown of Upcoming Prayer */}
        {!loading && nextPrayer && (
          <div className="mt-4 p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="text-emerald-400 animate-pulse" size={14} />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Menuju</span>
                <span className="text-[11px] font-black uppercase italic tracking-wider text-emerald-400 mt-1 leading-none">
                  {nextPrayer.name}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono font-black text-slate-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                {nextPrayer.minutesLeft >= 60 
                  ? `${Math.floor(nextPrayer.minutesLeft / 60)}j ${nextPrayer.minutesLeft % 60}m`
                  : `${nextPrayer.minutesLeft} Menit`
                }
              </span>
            </div>
          </div>
        )}

        {/* Connection Notice / Error message */}
        {error && (
          <div className="mt-3 flex items-center gap-1.5 justify-center text-[9px] text-amber-400 font-bold uppercase tracking-wider">
            <AlertCircle size={10} />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 text-center">
        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
          Sumber: Kemenag RI / Aladhan API
        </p>
      </div>
    </div>
  );
}
