export type WeatherType = 'clear' | 'cloudy' | 'rain';

export interface TimeState {
  minuteOfDay: number; // 0-1439
  day: number;
  timeScale: number; // game minutes per real second
  isPaused: boolean;
}

export interface WeatherState {
  type: WeatherType;
  intensity: number; // 0-1
  transition: number;
}

export const DEFAULT_TIME: TimeState = {
  minuteOfDay: 8 * 60, // 8:00 AM start
  day: 1,
  timeScale: 0.5, // 0.5 game minutes per real second = 1 game hour per 2 real minutes
  isPaused: false,
};

export const DEFAULT_WEATHER: WeatherState = {
  type: 'clear',
  intensity: 0,
  transition: 0,
};

export function formatTime(minuteOfDay: number): string {
  const h = Math.floor(minuteOfDay / 60) % 24;
  const m = Math.floor(minuteOfDay % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function getTimeOfDay(minuteOfDay: number): 'dawn' | 'morning' | 'day' | 'evening' | 'night' {
  const h = minuteOfDay / 60;
  if (h >= 5 && h < 7) return 'dawn';
  if (h >= 7 && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'day';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}
