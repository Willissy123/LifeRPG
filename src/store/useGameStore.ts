import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  GameState,
  Screen,
  Character,
  CharacterStats,
  TaskTemplate,
  CompletedTask,
  ArmyUnit,
  UnitType,
  FactionId,
  BattleState,
  Region,
} from '../types';
import { computeTaskRewards, xpToNextLevel, todayDateString } from '../utils/taskRewards';
import { buildInitialRegions, buildInitialFactions } from '../utils/mapData';
import { UNIT_DEFINITIONS } from '../utils/unitDefinitions';
import { buildBattleUnits } from '../utils/battleEngine';

// ---- Default task templates ----
const DEFAULT_TASK_TEMPLATES: TaskTemplate[] = [
  // Exercise
  { id: 'ex1', name: '30-min Workout', category: 'Exercise', difficulty: 'Medium' },
  { id: 'ex2', name: '10-min Walk', category: 'Exercise', difficulty: 'Easy' },
  { id: 'ex3', name: '1-hour Gym Session', category: 'Exercise', difficulty: 'Hard' },
  { id: 'ex4', name: 'Marathon / Race', category: 'Exercise', difficulty: 'Epic' },
  // Sleep
  { id: 'sl1', name: '7+ Hours Sleep', category: 'Sleep', difficulty: 'Medium' },
  { id: 'sl2', name: '8+ Hours Sleep', category: 'Sleep', difficulty: 'Hard' },
  // Nutrition
  { id: 'nu1', name: 'Healthy Meal', category: 'Nutrition', difficulty: 'Easy' },
  { id: 'nu2', name: 'No Junk Food Day', category: 'Nutrition', difficulty: 'Hard' },
  { id: 'nu3', name: 'Meal Prep', category: 'Nutrition', difficulty: 'Medium' },
  // Study/Work
  { id: 'sw1', name: '1-hour Deep Work', category: 'Study/Work', difficulty: 'Medium' },
  { id: 'sw2', name: 'Read 30 Pages', category: 'Study/Work', difficulty: 'Easy' },
  { id: 'sw3', name: 'Complete Major Project', category: 'Study/Work', difficulty: 'Epic' },
  { id: 'sw4', name: 'Learn New Skill', category: 'Study/Work', difficulty: 'Hard' },
  // Mindfulness
  { id: 'mi1', name: '10-min Meditation', category: 'Mindfulness', difficulty: 'Easy' },
  { id: 'mi2', name: 'Journaling', category: 'Mindfulness', difficulty: 'Easy' },
  { id: 'mi3', name: 'Digital Detox Day', category: 'Mindfulness', difficulty: 'Hard' },
  // Social
  { id: 'so1', name: 'Call a Friend', category: 'Social', difficulty: 'Easy' },
  { id: 'so2', name: 'Social Gathering', category: 'Social', difficulty: 'Medium' },
  { id: 'so3', name: 'Help Someone', category: 'Social', difficulty: 'Medium' },
];

// ---- Initial character ----
function defaultCharacter(): Character {
  return {
    name: 'Imperator',
    level: 1,
    xp: 0,
    xpToNext: xpToNextLevel(1),
    gold: 200,
    stats: {
      strength: 5,
      endurance: 5,
      intelligence: 5,
      willpower: 5,
      charisma: 5,
      leadership: 5,
    },
  };
}

// ---- Army size cap ----
export function armySizeCap(leadership: number): number {
  return 2 + Math.floor(leadership / 5);
}

// ---- Build initial game state ----
function buildInitialState(): Omit<GameState, 'initialized'> {
  return {
    screen: 'dashboard',
    turn: 1,
    character: defaultCharacter(),
    taskTemplates: DEFAULT_TASK_TEMPLATES,
    completedTasksToday: [],
    lastResetDate: todayDateString(),
    playerArmy: [],
    regions: buildInitialRegions(),
    factions: buildInitialFactions(),
    battle: {
      isActive: false,
      playerUnits: [],
      enemyUnits: [],
      projectiles: [],
      turn: 0,
      result: null,
      attackingRegionId: null,
      defendingRegionId: null,
      goldReward: 0,
    },
    selectedRegionId: null,
    log: ['The Roman Republic rises! Build your army and conquer the known world.'],
  };
}

// ---- Apply stat gains to character ----
function applyStats(
  char: Character,
  statGained: Partial<CharacterStats>,
  xpGained: number,
  goldGained: number
): Character {
  const newStats = { ...char.stats };
  for (const key of Object.keys(statGained) as (keyof CharacterStats)[]) {
    const val = statGained[key];
    if (val !== undefined) {
      newStats[key] = Math.min(100, newStats[key] + val);
    }
  }

  let newXp = char.xp + xpGained;
  let newLevel = char.level;
  let newXpToNext = char.xpToNext;

  // Level up loop
  while (newXp >= newXpToNext && newLevel < 50) {
    newXp -= newXpToNext;
    newLevel++;
    newXpToNext = xpToNextLevel(newLevel);
  }

  return {
    ...char,
    level: newLevel,
    xp: newXp,
    xpToNext: newXpToNext,
    gold: char.gold + goldGained,
    stats: newStats,
  };
}

// ---- Modify army unit stats based on character ----
function applyCharacterToUnit(unit: ArmyUnit, stats: CharacterStats): ArmyUnit {
  const def = UNIT_DEFINITIONS[unit.type];
  const atkBonus = Math.floor(stats.strength / 10);
  const hpBonus = Math.floor(stats.endurance / 5);
  return {
    ...unit,
    atk: def.baseAtk + atkBonus,
    def: def.baseDef,
    maxHp: def.baseHp + hpBonus,
    hp: Math.min(unit.hp + hpBonus, def.baseHp + hpBonus),
  };
}

// ---- Enemy AI: take simple actions ----
function enemyAI(
  regions: Region[],
  factions: GameState['factions'],
  log: string[]
): { regions: Region[]; factions: GameState['factions']; log: string[] } {
  const newRegions = regions.map((r) => ({ ...r }));
  const newFactions = { ...factions };
  const newLog = [...log];

  const enemyFactionIds: FactionId[] = ['gauls', 'carthage', 'macedon'];

  for (const fid of enemyFactionIds) {
    const faction = { ...newFactions[fid], army: [...newFactions[fid].army] };
    if (faction.army.length === 0) continue;

    // Find player regions adjacent to enemy regions
    const enemyRegionIds = faction.regions;
    for (const eRegionId of enemyRegionIds) {
      const eRegion = newRegions.find((r) => r.id === eRegionId);
      if (!eRegion) continue;

      // 30% chance to attack an adjacent player region
      if (Math.random() < 0.3) {
        const adjacentPlayerRegion = eRegion.connections
          .map((cid) => newRegions.find((r) => r.id === cid))
          .find((r) => r && r.owner === 'player');

        if (adjacentPlayerRegion) {
          // Simple attack: enemy wins if they have more units
          // For now, enemy just moves in — they always "win" undefended regions
          const defended = adjacentPlayerRegion.hasPlayerArmy;
          if (!defended) {
            const regionIdx = newRegions.findIndex((r) => r.id === adjacentPlayerRegion.id);
            if (regionIdx >= 0) {
              newRegions[regionIdx].owner = fid;
              faction.regions = [...faction.regions, adjacentPlayerRegion.id];
              const playerFaction = { ...newFactions.player };
              playerFaction.regions = playerFaction.regions.filter(
                (rid) => rid !== adjacentPlayerRegion.id
              );
              newFactions.player = playerFaction;
              newLog.push(
                `⚔️ ${faction.name} captured ${adjacentPlayerRegion.name}!`
              );
            }
          }
          break;
        }
      }
    }

    newFactions[fid] = faction;
  }

  return { regions: newRegions, factions: newFactions, log: newLog };
}

// ---- Store interface ----
interface GameStore extends GameState {
  // Navigation
  setScreen: (screen: Screen) => void;

  // Game lifecycle
  newGame: () => void;
  autoFillSampleTasks: () => void;

  // Tasks
  completeTask: (templateId: string) => void;
  checkDailyReset: () => void;

  // Army
  recruitUnit: (type: UnitType) => void;
  dismissUnit: (unitId: string) => void;

  // Campaign
  selectRegion: (regionId: string | null) => void;
  moveArmyTo: (regionId: string) => void;
  attackRegion: (regionId: string) => void;
  endTurn: () => void;

  // Battle
  updateBattleState: (battle: BattleState) => void;
  resolveBattle: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      initialized: true,
      ...buildInitialState(),

      setScreen: (screen) => set({ screen }),

      newGame: () => {
        set({ initialized: true, ...buildInitialState() });
      },

      autoFillSampleTasks: () => {
        const { taskTemplates, character, completedTasksToday } = get();
        const sampleIds = ['ex1', 'sl1', 'nu1', 'sw1', 'mi1', 'so1'];
        const toAdd = taskTemplates.filter(
          (t) =>
            sampleIds.includes(t.id) &&
            !completedTasksToday.some((c) => c.templateId === t.id)
        );

        let newChar = { ...character };
        const newTasks: CompletedTask[] = [];

        for (const template of toAdd) {
          const rewards = computeTaskRewards(template);
          const completed: CompletedTask = {
            id: `done_${Date.now()}_${template.id}`,
            templateId: template.id,
            name: template.name,
            category: template.category,
            difficulty: template.difficulty,
            completedAt: Date.now(),
            ...rewards,
          };
          newTasks.push(completed);
          newChar = applyStats(
            newChar,
            rewards.statGained,
            rewards.xpEarned,
            rewards.goldEarned
          );
        }

        set({
          character: newChar,
          completedTasksToday: [...completedTasksToday, ...newTasks],
          log: [
            ...get().log,
            `Completed ${newTasks.length} sample tasks! Earned gold and XP.`,
          ].slice(-50),
        });
      },

      completeTask: (templateId) => {
        const { taskTemplates, character, completedTasksToday } = get();
        const template = taskTemplates.find((t) => t.id === templateId);
        if (!template) return;
        if (completedTasksToday.some((c) => c.templateId === templateId)) return;

        const rewards = computeTaskRewards(template);
        const completed: CompletedTask = {
          id: `done_${Date.now()}_${templateId}`,
          templateId,
          name: template.name,
          category: template.category,
          difficulty: template.difficulty,
          completedAt: Date.now(),
          ...rewards,
        };

        const newChar = applyStats(
          character,
          rewards.statGained,
          rewards.xpEarned,
          rewards.goldEarned
        );

        set({
          character: newChar,
          completedTasksToday: [...completedTasksToday, completed],
          log: [
            ...get().log,
            `Completed "${template.name}" — +${rewards.goldEarned}g, +${rewards.xpEarned}xp`,
          ].slice(-50),
        });
      },

      checkDailyReset: () => {
        const { lastResetDate } = get();
        const today = todayDateString();
        if (lastResetDate !== today) {
          set({ completedTasksToday: [], lastResetDate: today });
        }
      },

      recruitUnit: (type) => {
        const { character, playerArmy } = get();
        const def = UNIT_DEFINITIONS[type];
        const cap = armySizeCap(character.stats.leadership);

        if (character.gold < def.cost) return;
        if (playerArmy.length >= cap) return;

        const baseUnit: ArmyUnit = {
          id: `unit_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          type,
          hp: def.baseHp,
          maxHp: def.baseHp,
          atk: def.baseAtk,
          def: def.baseDef,
          isRanged: def.isRanged,
          speed: def.speed,
          range: def.range,
          color: def.color,
        };

        const enhancedUnit = applyCharacterToUnit(baseUnit, character.stats);

        set({
          character: { ...character, gold: character.gold - def.cost },
          playerArmy: [...playerArmy, enhancedUnit],
          log: [...get().log, `Recruited ${def.label} for ${def.cost}g`].slice(-50),
        });
      },

      dismissUnit: (unitId) => {
        const { playerArmy } = get();
        set({
          playerArmy: playerArmy.filter((u) => u.id !== unitId),
          log: [...get().log, 'Unit dismissed.'].slice(-50),
        });
      },

      selectRegion: (regionId) => set({ selectedRegionId: regionId }),

      moveArmyTo: (regionId) => {
        const { regions, selectedRegionId, playerArmy } = get();
        if (!selectedRegionId || playerArmy.length === 0) return;

        const fromRegion = regions.find((r) => r.id === selectedRegionId);
        const toRegion = regions.find((r) => r.id === regionId);
        if (!fromRegion || !toRegion) return;
        if (!fromRegion.connections.includes(regionId)) return;
        if (toRegion.owner !== 'player') return;
        if (!fromRegion.hasPlayerArmy) return;

        const newRegions = regions.map((r) => {
          if (r.id === selectedRegionId) return { ...r, hasPlayerArmy: false };
          if (r.id === regionId) return { ...r, hasPlayerArmy: true };
          return r;
        });

        set({
          regions: newRegions,
          selectedRegionId: regionId,
          log: [...get().log, `Army moved to ${toRegion.name}`].slice(-50),
        });
      },

      attackRegion: (regionId) => {
        const { regions, selectedRegionId, playerArmy, factions, character } = get();
        if (!selectedRegionId || playerArmy.length === 0) return;

        const fromRegion = regions.find((r) => r.id === selectedRegionId);
        const toRegion = regions.find((r) => r.id === regionId);
        if (!fromRegion || !toRegion) return;
        if (!fromRegion.connections.includes(regionId)) return;
        if (toRegion.owner === 'player') return;
        if (!fromRegion.hasPlayerArmy) return;

        const defendingFactionId = toRegion.owner;
        const defendingFaction = factions[defendingFactionId];
        const enemyArmy =
          defendingFaction.army.length > 0
            ? defendingFaction.army
            : [
                // Neutral region with small militia
                {
                  id: 'militia_1',
                  type: 'Hastati' as const,
                  hp: 40,
                  maxHp: 40,
                  atk: 10,
                  def: 6,
                  isRanged: false,
                  speed: 0.6,
                  range: 36,
                  color: '#6b7280',
                },
              ];

        const goldReward = toRegion.goldPerTurn * 3 + 50;

        const playerBattleUnits = buildBattleUnits(playerArmy, 'player', playerArmy.length);
        const enemyBattleUnits = buildBattleUnits(enemyArmy, 'enemy', enemyArmy.length);

        const battle: BattleState = {
          isActive: true,
          playerUnits: playerBattleUnits,
          enemyUnits: enemyBattleUnits,
          projectiles: [],
          turn: 0,
          result: null,
          attackingRegionId: selectedRegionId,
          defendingRegionId: regionId,
          goldReward,
        };

        set({
          battle,
          screen: 'battle',
          log: [
            ...get().log,
            `⚔️ Attacking ${toRegion.name}! Battle begins!`,
          ].slice(-50),
        });
      },

      endTurn: () => {
        const { regions, factions, character, log, turn } = get();

        // Collect gold from owned regions
        const playerRegions = regions.filter((r) => r.owner === 'player');
        const goldFromTerritories = playerRegions.reduce(
          (sum, r) => sum + r.goldPerTurn,
          0
        );

        const newChar = {
          ...character,
          gold: character.gold + goldFromTerritories,
        };

        // Enemy AI actions
        const { regions: newRegions, factions: newFactions, log: newLog } = enemyAI(
          regions,
          factions,
          log
        );

        set({
          turn: turn + 1,
          character: newChar,
          regions: newRegions,
          factions: newFactions,
          log: [
            ...newLog,
            `Turn ${turn + 1}: Collected ${goldFromTerritories}g from territories.`,
          ].slice(-50),
        });
      },

      updateBattleState: (battle) => set({ battle }),

      resolveBattle: () => {
        const { battle, regions, factions, character, playerArmy } = get();
        if (!battle.result) return;

        const defendingRegionId = battle.defendingRegionId;
        const attackingRegionId = battle.attackingRegionId;

        let newRegions = [...regions];
        let newFactions = { ...factions };
        let newChar = { ...character };
        let newPlayerArmy = [...playerArmy];
        const newLog = [...get().log];

        if (battle.result === 'victory') {
          // Grant gold reward
          newChar = { ...newChar, gold: newChar.gold + battle.goldReward };

          // Transfer region ownership
          let defRegion: Region | undefined;
          if (defendingRegionId) {
            defRegion = newRegions.find((r) => r.id === defendingRegionId);
            if (defRegion) {
              const prevOwner = defRegion.owner;
              newRegions = newRegions.map((r) =>
                r.id === defendingRegionId ? { ...r, owner: 'player' } : r
              );

              // Remove from previous owner
              if (prevOwner !== 'neutral' && prevOwner !== 'player') {
                const prevFaction = { ...newFactions[prevOwner] };
                prevFaction.regions = prevFaction.regions.filter(
                  (rid) => rid !== defendingRegionId
                );
                // Reduce enemy army
                prevFaction.army = prevFaction.army.slice(
                  0,
                  Math.max(0, prevFaction.army.length - 1)
                );
                newFactions[prevOwner] = prevFaction;
              }

              // Add to player faction
              const playerFaction = { ...newFactions.player };
              playerFaction.regions = [...playerFaction.regions, defendingRegionId];
              newFactions.player = playerFaction;

              // Move player army into conquered region
              newRegions = newRegions.map((r) => {
                if (r.id === attackingRegionId) return { ...r, hasPlayerArmy: false };
                if (r.id === defendingRegionId) return { ...r, hasPlayerArmy: true };
                return r;
              });
            }
          }

          // Remove dead player units from army
          const survivingPlayerIds = new Set(
            battle.playerUnits.filter((u) => u.isAlive).map((u) => u.id)
          );
          newPlayerArmy = newPlayerArmy.filter((u) => survivingPlayerIds.has(u.id));

          newLog.push(
            `🏆 Victory at ${defRegion?.name ?? 'the battle'}! +${battle.goldReward}g. ${playerArmy.length - newPlayerArmy.length} units lost.`
          );
        } else {
          // Defeat: lose all units
          newPlayerArmy = [];

          // Army retreats back
          newRegions = newRegions.map((r) => {
            if (r.id === attackingRegionId) return { ...r, hasPlayerArmy: false };
            return r;
          });

          newLog.push(
            `💀 Defeated! Your army has been destroyed. Recruit more troops to continue.`
          );
        }

        set({
          character: newChar,
          playerArmy: newPlayerArmy,
          regions: newRegions,
          factions: newFactions,
          log: newLog.slice(-50),
          battle: {
            ...battle,
            isActive: false,
          },
          screen: 'campaign',
          selectedRegionId: battle.result === 'victory' ? (battle.defendingRegionId ?? null) : (battle.attackingRegionId ?? null),
        });
      },
    }),
    {
      name: 'life-rpg-state',
    }
  )
);
