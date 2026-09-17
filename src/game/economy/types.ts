export interface EconomyState {
  cash: number;
  bankBalance: number;
  debt: number;
}

export const DEFAULT_ECONOMY: EconomyState = {
  cash: 0,
  bankBalance: 0,
  debt: 0,
};

export interface ShopItemDef {
  id: string;
  name: string;
  nameRu: string;
  price: number;
  category: 'food' | 'drink' | 'medicine' | 'misc';
  hunger?: number;
  thirst?: number;
  health?: number;
  energy?: number;
  description: string;
  weight: number;
}

export const SHOP_ITEMS: ShopItemDef[] = [
  {
    id: 'bread',
    name: 'Bread',
    nameRu: 'Хлеб',
    price: 3,
    category: 'food',
    hunger: 25,
    description: 'Черствый но съедобный хлеб',
    weight: 0.5,
  },
  {
    id: 'water',
    name: 'Water Bottle',
    nameRu: 'Вода 0.5л',
    price: 2,
    category: 'drink',
    thirst: 35,
    description: 'Обычная питьевая вода',
    weight: 0.5,
  },
  {
    id: 'canned_food',
    name: 'Canned Beans',
    nameRu: 'Консервы',
    price: 5,
    category: 'food',
    hunger: 40,
    health: 2,
    description: 'Банка фасоли',
    weight: 0.4,
  },
  {
    id: 'sandwich',
    name: 'Sandwich',
    nameRu: 'Сэндвич',
    price: 7,
    category: 'food',
    hunger: 35,
    thirst: -5,
    energy: 5,
    description: 'Сэндвич из кафе',
    weight: 0.3,
  },
  {
    id: 'energy_drink',
    name: 'Energy Drink',
    nameRu: 'Энергетик',
    price: 4,
    category: 'drink',
    thirst: 20,
    energy: 25,
    stress: 5,
    description: 'Дешевый энергетик',
    weight: 0.3,
  } as any,
  {
    id: 'apple',
    name: 'Apple',
    nameRu: 'Яблоко',
    price: 2,
    category: 'food',
    hunger: 15,
    thirst: 5,
    health: 3,
    description: 'Свежее яблоко',
    weight: 0.2,
  },
];
