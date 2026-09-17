export type JobId = 'none' | 'warehouse_loader' | 'cafe_helper' | 'street_cleaner';

export interface JobDef {
  id: JobId;
  name: string;
  nameRu: string;
  description: string;
  salary: number; // per shift
  energyCost: number;
  hungerCost: number;
  thirstCost: number;
  requiredSkills?: Record<string, number>;
  location: { x: number; z: number };
}

export const JOBS: Record<JobId, JobDef> = {
  none: {
    id: 'none',
    name: 'Unemployed',
    nameRu: 'Безработный',
    description: 'Нет работы',
    salary: 0,
    energyCost: 0,
    hungerCost: 0,
    thirstCost: 0,
    location: { x: 0, z: 0 },
  },
  warehouse_loader: {
    id: 'warehouse_loader',
    name: 'Warehouse Loader',
    nameRu: 'Грузчик на складе',
    description: 'Перенос коробок со склада',
    salary: 25,
    energyCost: 25,
    hungerCost: 15,
    thirstCost: 15,
    location: { x: -80, z: 40 },
  },
  cafe_helper: {
    id: 'cafe_helper',
    name: 'Cafe Helper',
    nameRu: 'Помощник в кафе',
    description: 'Помощь на кухне кафе',
    salary: 20,
    energyCost: 20,
    hungerCost: 10,
    thirstCost: 10,
    location: { x: 60, z: -20 },
  },
  street_cleaner: {
    id: 'street_cleaner',
    name: 'Street Cleaner',
    nameRu: 'Уборщик улиц',
    description: 'Уборка мусора в районе',
    salary: 15,
    energyCost: 15,
    hungerCost: 10,
    thirstCost: 12,
    location: { x: 10, z: 60 },
  },
};

export interface JobProgress {
  currentJob: JobId;
  shiftProgress: number; // 0-100
  boxesCarried: number;
  boxesTotal: number;
  isWorking: boolean;
}
