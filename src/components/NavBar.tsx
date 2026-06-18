import { useGameStore } from '../store/useGameStore';
import type { Screen } from '../types';

const NAV_ITEMS: { screen: Screen; label: string; icon: string }[] = [
  { screen: 'dashboard', label: 'Home', icon: '🏛️' },
  { screen: 'tasks', label: 'Tasks', icon: '📋' },
  { screen: 'character', label: 'Hero', icon: '⚔️' },
  { screen: 'army', label: 'Army', icon: '🛡️' },
  { screen: 'campaign', label: 'Map', icon: '🗺️' },
];

export default function NavBar() {
  const { screen, setScreen, character, newGame } = useGameStore();

  return (
    <>
      {/* Top bar — logo + gold only */}
      <nav
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 16px',
          background: 'linear-gradient(to bottom, #2c1810, #1a0f0a)',
          borderBottom: '2px solid #c9a84c',
          height: '48px',
        }}
      >
        <span style={{ color: '#c9a84c', fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 'bold' }}>
          ⚔ LIFE RPG
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#f0d080', fontSize: '13px', fontWeight: 'bold' }}>
            💰 {character.gold}g
          </span>
          <span style={{ color: '#c9a84c', fontSize: '12px' }}>
            Lv.{character.level}
          </span>
          <button
            onClick={() => {
              if (confirm('Start a new campaign? All progress will be lost.')) {
                newGame();
              }
            }}
            style={{
              padding: '4px 8px', borderRadius: '4px', fontSize: '11px',
              background: '#8b1a1a', color: '#f5e6c8', border: '1px solid #c9a84c55',
            }}
          >
            New
          </button>
        </div>
      </nav>

      {/* Bottom tab bar */}
      <nav
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          display: 'flex',
          background: 'linear-gradient(to top, #2c1810, #1a0f0a)',
          borderTop: '2px solid #c9a84c',
          height: '60px',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active = screen === item.screen;
          return (
            <button
              key={item.screen}
              onClick={() => setScreen(item.screen)}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '2px',
                background: active ? '#c9a84c18' : 'transparent',
                border: 'none',
                borderTop: active ? '2px solid #c9a84c' : '2px solid transparent',
                color: active ? '#c9a84c' : '#6b5030',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '20px', lineHeight: 1 }}>{item.icon}</span>
              <span style={{ fontSize: '10px', fontFamily: 'Georgia, serif' }}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
