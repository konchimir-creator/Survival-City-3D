export type ItemCategory = 'food' | 'drink' | 'medicine' | 'clothing' | 'tools' | 'misc';

export interface InventoryItem {
  id: string; // unique instance id
  defId: string; // definition id like 'bread'
  name: string;
  nameRu: string;
  category: ItemCategory;
  quantity: number;
  weight: number;
  stackable: boolean;
  hunger?: number;
  thirst?: number;
  health?: number;
  energy?: number;
  description?: string;
}

export interface Equipment {
  head: string | null;
  top: string | null;
  bottom: string | null;
  shoes: string | null;
  backpack: string | null;
}

export const DEFAULT_EQUIPMENT: Equipment = {
  head: null,
  top: 'worn_hoodie',
  bottom: 'jeans',
  shoes: 'sneakers',
  backpack: 'old_backpack',
};

export const BACKPACK_CAPACITY: Record<string, number> = {
  old_backpack: 15,
  none: 5,
  medium_backpack: 25,
  large_backpack: 40,
};

export function getMaxWeight(equipment: Equipment): number {
  const bp = equipment.backpack || 'none';
  return BACKPACK_CAPACITY[bp] ?? 10;
}
