// ============================================================
// SHARED TYPES FOR LIFE RPG
// ============================================================

// ---- Character ----

export type StatKey =
  | 'strength'
  | 'endurance'
  | 'intelligence'
  | 'willpower'
  | 'charisma'
  | 'leadership';

export interface CharacterStats {
  strength: number;
  endurance: number;
  intelligence: number;
  willpower: number;
  charisma: number;
  leadership: number;
}

export interface Character {
  name: string;
  level: number;
  xp: number;
  xpToNext: number;
  gold: number;
  stats: CharacterStats;
}

// ---- Tasks ----

export type TaskCategory =
  | 'Exercise'
  | 'Sleep'
  | 'Nutrition'
  | 'Study/Work'
  | 'Mindfulness'
  | 'Social';

export type TaskDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Epic';

export interface TaskTemplate {
  id: string;
  name: string;
  category: TaskCategory;
  difficulty: TaskDifficulty;
}

export interface CompletedTask {
  id: string;
  templateId: string;
  name: string;
  category: TaskCategory;
  difficulty: TaskDifficulty;
  completedAt: number; // timestamp
  goldEarned: number;
  xpEarned: number;
  statGained: Partial<CharacterStats>;
}

// ---- Army / Units ----

export type UnitType =
  | 'Hastati'
  | 'Legionary'
  | 'Archer'
  | 'Equites'
  | 'Ballista'
  | 'Praetorian';

export interface UnitDefinition {
  type: UnitType;
  label: string;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  cost: number;
  isRanged: boolean;
  speed: number; // pixels per frame in battle
  range: number; // attack range in battle px
  color: string; // for canvas rendering
  description: string;
}

export interface ArmyUnit {
  id: string;
  type: UnitType;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  isRanged: boolean;
  speed: number;
  range: number;
  color: string;
}

// ---- Campaign Map ----

export type FactionId = 'player' | 'gauls' | 'carthage' | 'macedon' | 'neutral';

export interface Region {
  id: string;
  name: string;
  x: number; // SVG x position
  y: number; // SVG y position
  owner: FactionId;
  goldPerTurn: number;
  hasPlayerArmy: boolean;
  connections: string[]; // region ids
}

export interface Faction {
  id: FactionId;
  name: string;
  color: string;
  army: ArmyUnit[];
  regions: string[];
}

// ---- Battle ----

export interface BattleUnit {
  id: string;
  type: UnitType;
  side: 'player' | 'enemy';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  isRanged: boolean;
  speed: number;
  range: number;
  color: string;
  attackCooldown: number; // frames until next attack
  isAlive: boolean;
  targetId: string | null;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  dx: number;
  dy: number;
  damage: number;
  targetId: string;
  side: 'player' | 'enemy';
}

export interface BattleState {
  isActive: boolean;
  playerUnits: BattleUnit[];
  enemyUnits: BattleUnit[];
  projectiles: Projectile[];
  turn: number;
  result: 'ongoing' | 'victory' | 'defeat' | null;
  attackingRegionId: string | null;
  defendingRegionId: string | null;
  goldReward: number;
}

// ---- Game Screen ----

export type Screen =
  | 'dashboard'
  | 'tasks'
  | 'army'
  | 'campaign'
  | 'battle'
  | 'character';

// ---- Root Game State ----

export interface GameState {
  initialized: boolean;
  screen: Screen;
  turn: number;
  character: Character;
  taskTemplates: TaskTemplate[];
  completedTasksToday: CompletedTask[];
  lastResetDate: string; // YYYY-MM-DD
  playerArmy: ArmyUnit[];
  regions: Region[];
  factions: Record<FactionId, Faction>;
  battle: BattleState;
  selectedRegionId: string | null;
  log: string[]; // game event log
}
