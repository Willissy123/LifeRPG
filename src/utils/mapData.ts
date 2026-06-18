import type { Region, Faction, FactionId, ArmyUnit, UnitType } from '../types';
import { UNIT_DEFINITIONS } from './unitDefinitions';

let unitIdCounter = 1000;
function makeUnitId() {
  return `unit_${unitIdCounter++}`;
}

function makeUnit(type: UnitType): ArmyUnit {
  const def = UNIT_DEFINITIONS[type];
  return {
    id: makeUnitId(),
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
}

export function buildInitialRegions(): Region[] {
  return [
    // Player start
    { id: 'rome', name: 'Rome', x: 320, y: 280, owner: 'player', goldPerTurn: 30, hasPlayerArmy: true, connections: ['latium', 'etruria', 'campania'] },
    { id: 'latium', name: 'Latium', x: 280, y: 340, owner: 'player', goldPerTurn: 15, hasPlayerArmy: false, connections: ['rome', 'campania', 'samnium'] },
    // Neutral
    { id: 'etruria', name: 'Etruria', x: 250, y: 210, owner: 'neutral', goldPerTurn: 20, hasPlayerArmy: false, connections: ['rome', 'liguria', 'umbria'] },
    { id: 'campania', name: 'Campania', x: 360, y: 360, owner: 'neutral', goldPerTurn: 25, hasPlayerArmy: false, connections: ['rome', 'latium', 'samnium', 'bruttium'] },
    { id: 'umbria', name: 'Umbria', x: 310, y: 170, owner: 'neutral', goldPerTurn: 12, hasPlayerArmy: false, connections: ['etruria', 'rome', 'liguria'] },
    // Gauls (north)
    { id: 'liguria', name: 'Liguria', x: 200, y: 130, owner: 'gauls', goldPerTurn: 18, hasPlayerArmy: false, connections: ['etruria', 'umbria', 'gaul_cisalpina'] },
    { id: 'gaul_cisalpina', name: 'Cisalpine Gaul', x: 180, y: 60, owner: 'gauls', goldPerTurn: 22, hasPlayerArmy: false, connections: ['liguria', 'gaul_transalpina'] },
    { id: 'gaul_transalpina', name: 'Transalpine Gaul', x: 100, y: 40, owner: 'gauls', goldPerTurn: 20, hasPlayerArmy: false, connections: ['gaul_cisalpina'] },
    // Carthage (south/west)
    { id: 'sicilia', name: 'Sicilia', x: 350, y: 460, owner: 'carthage', goldPerTurn: 28, hasPlayerArmy: false, connections: ['bruttium', 'africa'] },
    { id: 'bruttium', name: 'Bruttium', x: 390, y: 420, owner: 'neutral', goldPerTurn: 14, hasPlayerArmy: false, connections: ['campania', 'samnium', 'sicilia'] },
    { id: 'africa', name: 'Africa', x: 310, y: 540, owner: 'carthage', goldPerTurn: 35, hasPlayerArmy: false, connections: ['sicilia'] },
    // Macedon (east)
    { id: 'samnium', name: 'Samnium', x: 440, y: 340, owner: 'macedon', goldPerTurn: 20, hasPlayerArmy: false, connections: ['rome', 'latium', 'campania', 'bruttium', 'illyricum'] },
    { id: 'illyricum', name: 'Illyricum', x: 530, y: 260, owner: 'macedon', goldPerTurn: 18, hasPlayerArmy: false, connections: ['samnium', 'macedon_heartland'] },
    { id: 'macedon_heartland', name: 'Macedonia', x: 580, y: 180, owner: 'macedon', goldPerTurn: 30, hasPlayerArmy: false, connections: ['illyricum'] },
  ];
}

export function buildInitialFactions(): Record<FactionId, Faction> {
  return {
    player: {
      id: 'player',
      name: 'Roman Republic',
      color: '#c9a84c',
      army: [],
      regions: ['rome', 'latium'],
    },
    gauls: {
      id: 'gauls',
      name: 'Gallic Tribes',
      color: '#22c55e',
      army: [makeUnit('Hastati'), makeUnit('Archer'), makeUnit('Hastati')],
      regions: ['liguria', 'gaul_cisalpina', 'gaul_transalpina'],
    },
    carthage: {
      id: 'carthage',
      name: 'Carthaginian Empire',
      color: '#a855f7',
      army: [makeUnit('Legionary'), makeUnit('Archer'), makeUnit('Equites')],
      regions: ['sicilia', 'africa'],
    },
    macedon: {
      id: 'macedon',
      name: 'Macedonian Kingdom',
      color: '#3b82f6',
      army: [makeUnit('Legionary'), makeUnit('Ballista'), makeUnit('Legionary')],
      regions: ['samnium', 'illyricum', 'macedon_heartland'],
    },
    neutral: {
      id: 'neutral',
      name: 'Independent',
      color: '#6b7280',
      army: [],
      regions: ['etruria', 'campania', 'umbria', 'bruttium'],
    },
  };
}

export const FACTION_COLORS: Record<FactionId, string> = {
  player: '#c9a84c',
  gauls: '#22c55e',
  carthage: '#a855f7',
  macedon: '#3b82f6',
  neutral: '#6b7280',
};
