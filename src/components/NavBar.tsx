import { useGameStore } from '../store/useGameStore';
import type { Screen } from '../types';

const NAV_ITEMS: { screen: Screen; label: string; icon: string }[] = [
  { screen: 'dashboard', label: 'Dashboard', icon: '🏛️' },
  { screen: 'tasks', label: 'Daily Tasks', icon: '📋' },
  { screen: 'character', label: 'Character', icon: '⚔️' },
  { screen: 'army', label: 'Army', icon: '🛡️' },
  { screen: 'campaign', label: 'Campaign', icon: '🗺️' },
];

export default function NavBar() {
  const { screen, setScreen, character, newGame } = useGameStore();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2"
      style={{ background: 'linear-gradient(to bottom, #2c1810, #1a0f0a)', borderBottom: '2px solid #c9a84c' }}>
      {/* Logo */}
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
          ⚔ LIFE RPG
        </span>
        <span className="text-xs" style={{ color: '#8a7050' }}>Roman Campaign</span>
      </div>

      {/* Nav links */}
      <div className="flex items-center gap-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.screen}
            onClick={() => setScreen(item.screen)}
            className="px-3 py-1.5 rounded text-sm font-medium transition-all duration-150"
            style={{
              background: screen === item.screen ? '#c9a84c22' : 'transparent',
              color: screen === item.screen ? '#c9a84c' : '#b8a080',
              border: screen === item.screen ? '1px solid #c9a84c55' : '1px solid transparent',
              fontFamily: 'Georgia, serif',
            }}
          >
            <span className="mr-1">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      {/* Character summary + new game */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-xs" style={{ color: '#c9a84c' }}>
            Lv.{character.level} {character.name}
          </div>
          <div className="text-xs" style={{ color: '#d4a843' }}>
            💰 {character.gold}g
          </div>
        </div>
        <button
          onClick={() => {
            if (confirm('Start a new campaign? All progress will be lost.')) {
              newGame();
            }
          }}
          className="px-2 py-1 rounded text-xs"
          style={{ background: '#8b1a1a', color: '#f5e6c8', border: '1px solid #c9a84c55' }}
        >
          New Game
        </button>
      </div>
    </nav>
  );
}
