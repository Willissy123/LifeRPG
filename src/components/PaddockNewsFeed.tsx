import React, { useState } from 'react';
import { getCircuit } from '../data/circuits';

interface Props {
  circuitId: string;
  raceIndex: number;
  userPoints: number;
  rivalName: string | null;
  weather: number; // rain chance 0..1
  playerName: string;
}

interface Headline {
  icon: string;
  text: string;
  category: string;
  time: string;
}

function buildHeadlines(p: Props): Headline[] {
  const circuit = getCircuit(p.circuitId);
  const name = circuit?.name ?? 'the circuit';
  const heads: Headline[] = [];

  if (p.weather >= 0.4) {
    heads.push({ icon: '🌧', category: 'Weather', text: `Weather Alert: Heavy rain forecast for ${name} on race day.`, time: '2h ago' });
  } else if (p.weather >= 0.2) {
    heads.push({ icon: '⛅', category: 'Weather', text: `Mixed conditions expected at ${name} — teams hedge their tyre bets.`, time: '3h ago' });
  } else {
    heads.push({ icon: '☀️', category: 'Weather', text: `Dry, hot conditions predicted for ${name}. Tyre deg will be key.`, time: '3h ago' });
  }

  if (p.userPoints > 0 && p.raceIndex >= 2) {
    heads.push({ icon: '📈', category: 'Form', text: `${p.playerName} making waves — championship contenders take notice.`, time: '5h ago' });
  }

  if (p.rivalName) {
    heads.push({ icon: '⚔️', category: 'Rivalry', text: `${p.rivalName} vows to fight back after recent struggles.`, time: '6h ago' });
  }

  if (p.raceIndex % 3 === 0) {
    heads.push({ icon: '🔧', category: 'Technical', text: `McLaren bring a major upgrade package to ${name}.`, time: '8h ago' });
  }
  if (p.raceIndex % 5 === 1) {
    heads.push({ icon: '📋', category: 'Technical', text: `FIA issue new technical directive on floor flexibility.`, time: '10h ago' });
  }
  if (p.raceIndex % 4 === 2) {
    heads.push({ icon: '🗣', category: 'Paddock', text: `Team orders rumours swirl ahead of ${name} as the title fight tightens.`, time: '12h ago' });
  }
  if (p.raceIndex % 7 === 3) {
    heads.push({ icon: '🏎', category: 'Driver', text: `Veterans tip ${name} to suit the bold — overtaking expected to be plentiful.`, time: '1d ago' });
  }

  // Ensure at least 3, cap at 4
  if (heads.length < 3) {
    heads.push({ icon: '📰', category: 'Paddock', text: `All eyes on ${name} as the grid prepares for round ${p.raceIndex + 1}.`, time: '1d ago' });
  }
  return heads.slice(0, 4);
}

export const PaddockNewsFeed: React.FC<Props> = (props) => {
  const [open, setOpen] = useState(false);
  const headlines = buildHeadlines(props);

  return (
    <div style={{ background: '#111120', borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer', padding: 14,
        }}
      >
        <span style={{ color: '#0090FF', fontSize: 10, letterSpacing: 2, fontWeight: 'bold' }}>
          📰 PADDOCK NEWS ({headlines.length})
        </span>
        <span style={{ color: '#888', fontSize: 16 }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {headlines.map((h, i) => (
            <div key={i} style={{
              background: '#1a1a2a', borderRadius: 8, padding: 10,
              display: 'flex', gap: 10, alignItems: 'flex-start',
              animation: 'fadeSlideIn 0.3s ease-out',
            }}>
              <span style={{ fontSize: 18 }}>{h.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#CCC', fontSize: 12, lineHeight: 1.4 }}>{h.text}</div>
                <div style={{ color: '#555', fontSize: 9, marginTop: 4, letterSpacing: 1 }}>
                  {h.category.toUpperCase()} · {h.time}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
