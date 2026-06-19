export type FormationType = 'line' | 'wedge' | 'testudo' | 'loose' | 'square' | 'skirmish';
export type UnitOrder = 'advance' | 'hold' | 'charge' | 'retreat' | 'skirmish';
export type RegimentState = 'advancing' | 'fighting' | 'routing' | 'holding' | 'dead';

export interface Vec2 { x: number; y: number; }

export interface Trooper {
  id: number;
  formOffX: number; // formation offset from regiment center
  formOffY: number;
  x: number;        // actual world position
  y: number;
  hp: number;
  maxHp: number;
  state: 'march' | 'fight' | 'rout' | 'dead';
  animTimer: number;
  deathTimer: number; // counts down after dying
}

export interface Regiment {
  id: string;
  name: string;
  unitType: string; // from existing UnitType
  side: 'player' | 'enemy';
  x: number;   // center position
  y: number;
  facing: number; // radians
  formation: FormationType;
  order: UnitOrder;
  state: RegimentState;
  totalHp: number;
  maxTotalHp: number;
  atk: number;
  def: number;
  speed: number;
  attackRange: number;
  isRanged: boolean;
  morale: number;      // 0-100
  color: string;
  isSelected: boolean;
  targetId: string | null;
  moveTarget: Vec2 | null;
  attackCooldown: number;
  troopers: Trooper[];
  aliveTroopers: number;
  maxTroopers: number; // 120
}

export interface VisArrow {
  id: number;
  sx: number; sy: number;
  ex: number; ey: number;
  progress: number; // 0→1
  side: 'player' | 'enemy';
  active: boolean;
}

export interface VisDust {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  kind: 'dust' | 'blood' | 'spark';
  size: number;
}

export interface BattleSim {
  regiments: Regiment[];
  arrows: VisArrow[];
  dusts: VisDust[];
  frame: number;
  selectedId: string | null;
  commandMode: 'none' | 'move' | 'attack';
  wave: number;
  battleOver: boolean;
  winner: 'player' | 'enemy' | null;
  goldReward: number;
}
