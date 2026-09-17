export const SAVE_VERSION = 2;
export const SAVE_KEY = 'survival_city_3d_save_v2';

export interface SaveData {
  version: number;
  timestamp: number;
  player: {
    position: [number, number, number];
    rotation: number;
    stats: any;
    skills: any;
    attributes: any;
  };
  economy: any;
  inventory: any;
  equipment: any;
  time: any;
  weather: any;
  job: {
    currentJob: string;
  };
  settings: {
    graphics: 'low' | 'medium' | 'high';
    mouseSensitivity: number;
    volume: number;
  };
}
