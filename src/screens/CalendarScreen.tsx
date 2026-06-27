import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { getCircuit } from '../data/circuits';
import { getDriver } from '../data/drivers2025';
import CALENDAR_2025 from '../data/calendar2025';

export default function CalendarScreen() {
  const navigate = useNavigate();
  const { currentSeason } = useGameStore();
  const { weekends, currentRaceIndex } = currentSeason;

  return (
    <div style={{ padding: 16, paddingBottom: 40 }}>
      <h2 style={{ color: '#FFF', fontWeight: 'bold', fontSize: 18, letterSpacing: 1, marginBottom: 4 }}>
        2025 SEASON CALENDAR
      </h2>
      <p style={{ color: '#888', fontSize: 12, marginBottom: 20 }}>24 Grand Prix · Tap to open race weekend</p>

      {CALENDAR_2025.map((race) => {
        const circuit = getCircuit(race.circuitId);
        const weekend = weekends[race.raceIndex];
        if (!circuit || !weekend) return null;

        const isNext = race.raceIndex === currentRaceIndex;
        const isComplete = weekend.completed;
        const userResult = weekend.raceResult?.find((r) => getDriver(r.driverId)?.isUser);
        const qualiPos = weekend.userGridPosition;

        return (
          <button
            key={race.circuitId}
            onClick={() => navigate(`/race-weekend/${race.raceIndex}`)}
            style={{
              display: 'flex', alignItems: 'center', width: '100%',
              background: '#111120', borderRadius: 12, padding: 14, marginBottom: 8,
              gap: 12, border: isNext ? '1.5px solid #E0C040' : '1.5px solid transparent',
              opacity: isComplete ? 0.7 : 1, cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: 14, background: '#222',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ color: isComplete ? '#E0C040' : '#888', fontWeight: 'bold', fontSize: 12 }}>
                {isComplete ? '✓' : race.round}
              </span>
            </div>

            <span style={{ fontSize: 24 }}>{circuit.flag}</span>

            <div style={{ flex: 1 }}>
              <div style={{ color: isNext ? '#E0C040' : '#FFF', fontWeight: 600, fontSize: 14 }}>
                {circuit.location}{isNext ? ' ←' : ''}{race.hasSprint ? ' 🏃' : ''}
              </div>
              <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>{race.date}</div>
            </div>

            {isComplete && userResult ? (
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: userResult.dnfLap ? '#FF4444' : '#E0C040', fontWeight: 'bold', fontSize: 15 }}>
                  {userResult.dnfLap ? 'DNF' : `P${userResult.position}`}
                </div>
                <div style={{ color: '#888', fontSize: 10 }}>+{userResult.points}pts</div>
              </div>
            ) : qualiPos ? (
              <div style={{ color: '#39B54A', fontSize: 13, fontWeight: 600 }}>Q: P{qualiPos}</div>
            ) : (
              <span style={{ color: '#444', fontSize: 22 }}>›</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
