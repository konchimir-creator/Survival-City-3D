export interface BuildingDef {
  id: string;
  name: string;
  nameRu: string;
  type: 'shop' | 'shelter' | 'warehouse' | 'cafe' | 'police' | 'medical' | 'autoservice' | 'residential' | 'abandoned' | 'internet_cafe';
  position: [number, number, number]; // x, y, z
  size: [number, number, number]; // w, h, d
  rotation?: number;
  interactable: boolean;
  interior?: boolean;
}

export const DISTRICT_SIZE = 300; // 300x300 meters

export const BUILDINGS: BuildingDef[] = [
  {
    id: 'shop_1',
    name: 'Corner Shop',
    nameRu: 'Магазин на углу',
    type: 'shop',
    position: [40, 0, -35],
    size: [18, 8, 14],
    rotation: 0,
    interactable: true,
    interior: true,
  },
  {
    id: 'shelter_1',
    name: 'Shelter',
    nameRu: 'Ночлежка',
    type: 'shelter',
    position: [-50, 0, 80],
    size: [22, 10, 18],
    interactable: true,
  },
  {
    id: 'warehouse_1',
    name: 'Warehouse',
    nameRu: 'Склад',
    type: 'warehouse',
    position: [-95, 0, 35],
    size: [30, 12, 25],
    interactable: true,
  },
  {
    id: 'cafe_1',
    name: 'Cafe',
    nameRu: 'Кафе',
    type: 'cafe',
    position: [78, 0, -15],
    size: [16, 7, 12],
    interactable: true,
  },
  {
    id: 'police_1',
    name: 'Police Station',
    nameRu: 'Полицейский участок',
    type: 'police',
    position: [90, 0, 80],
    size: [24, 10, 20],
    interactable: true,
  },
  {
    id: 'medical_1',
    name: 'Medical Point',
    nameRu: 'Медпункт',
    type: 'medical',
    position: [-20, 0, -75],
    size: [18, 8, 16],
    interactable: true,
  },
  {
    id: 'autoservice_1',
    name: 'Auto Service',
    nameRu: 'Автосервис',
    type: 'autoservice',
    position: [-90, 0, -70],
    size: [26, 8, 22],
    interactable: false,
  },
  {
    id: 'residential_1',
    name: 'Apartment Block A',
    nameRu: 'Жилой дом A',
    type: 'residential',
    position: [30, 0, 85],
    size: [40, 22, 18],
    interactable: false,
  },
  {
    id: 'residential_2',
    name: 'Apartment Block B',
    nameRu: 'Жилой дом B',
    type: 'residential',
    position: [-30, 0, -20],
    size: [20, 18, 16],
    interactable: false,
  },
  {
    id: 'residential_3',
    name: 'Apartment Block C',
    nameRu: 'Жилой дом C',
    type: 'residential',
    position: [20, 0, 30],
    size: [18, 20, 18],
    interactable: false,
  },
  {
    id: 'abandoned_1',
    name: 'Abandoned Building',
    nameRu: 'Заброшка',
    type: 'abandoned',
    position: [-110, 0, -20],
    size: [16, 12, 14],
    interactable: true,
  },
  {
    id: 'internet_cafe_1',
    name: 'Internet Cafe',
    nameRu: 'Интернет-кафе',
    type: 'internet_cafe',
    position: [30, 0, -70],
    size: [14, 6, 12],
    interactable: true,
  },
];

export interface InteractionPoint {
  id: string;
  type: 'shop_enter' | 'talk' | 'work' | 'sleep' | 'search' | 'atm';
  position: [number, number, number];
  buildingId?: string;
  label: string;
  labelRu: string;
  range: number;
}
