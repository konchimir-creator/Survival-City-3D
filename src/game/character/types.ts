export interface CharacterStats {
  health: number; // 0-100
  hunger: number; // 0-100 (100 = full, 0 = starving)
  thirst: number; // 0-100
  energy: number; // 0-100
  hygiene: number; // 0-100
  mood: number; // 0-100
  stress: number; // 0-100 (0 = calm, 100 = stressed)
}

export interface CharacterSkills {
  strength: number;
  endurance: number;
  charisma: number;
  intelligence: number;
  cooking: number;
  driving: number;
  repair: number;
}

export interface CharacterAttributes {
  level: number;
  experience: number;
  skillPoints: number;
}

export const DEFAULT_STATS: CharacterStats = {
  health: 85,
  hunger: 60,
  thirst: 55,
  energy: 75,
  hygiene: 60,
  mood: 50,
  stress: 30,
};

export const DEFAULT_SKILLS: CharacterSkills = {
  strength: 5,
  endurance: 5,
  charisma: 5,
  intelligence: 5,
  cooking: 1,
  driving: 1,
  repair: 1,
};

export const DEFAULT_ATTRIBUTES: CharacterAttributes = {
  level: 1,
  experience: 0,
  skillPoints: 0,
};
