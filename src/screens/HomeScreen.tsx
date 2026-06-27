import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { getCircuit } from '../data/circuits';
import { getDriver } from '../data/drivers2025';
import { getTeam } from '../data/teams2025';
import { USER_DRIVER_ID } from '../data/drivers2025';
import CALENDAR_2025 from '../data/calendar2025';

export default function HomeScreen() {
  const navigate = useNavigate();
  const { currentSeason, playerName, playerNumber } = useGameStore();
  const { driverStandings, weekends, carDevelopment, currentRaceIndex } = currentSeason;

  const userStanding = driverStandings.find((s) => s.driverId === USER_DRIVER_ID);
  const userDriver = getDriver(USER_DRIVER_ID);
  const userTeam = getTeam(userDriver?.teamId ?? '');
  const teamColor = userTeam?.color ?? '#E0C040';

  const nextRace = weekends[currentRaceIndex];
  const nextCircuit = nextRace ? getCircuit(nextRace.circuitId) : null;
  const nextCal = nextRace ? CALENDAR_2025[currentRaceIndex] : null;
  const completedRaces = weekends.filter((w) => w.completed).length;
  const recentResults = weekends.filter((w) => w.completed && w.raceResult).slice(-5).reverse();
  const topDrivers = [...driverStandings].slice(0, 5);

  return (
    <div style={{ padding: 16, paddingBottom: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Driver card */}
      <div style={{ background: '#111120', borderRadius: 16, padding: 18, borderLeft: `4px solid ${teamColor}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ color: '#444', fontSize: 36, fontWeight: 'bold' }}>#{playerNumber}</div>
            <div style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold' }}>{playerName}</div>
            <div style={{ color: teamColor, fontSize: 13, marginTop: 2 }}>{userTeam?.shortName ?? 'Apex Racing'}</div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <StatBox label="Position" value={`P${userStanding?.position ?? '—'}`} />
            <StatBox label="Points" value={String(userStanding?.points ?? 0)} />
            <StatBox label="Wins" value={String(userStanding?.wins ?? 0)} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <span style={{ color: '#888', fontSize: 11, width: 80 }}>Car: {Math.round(carDevelopment.effectiveCarRating)}/100</span>
          <div style={{ flex: 1, height: 4, background: '#222', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: 4, width: `${carDevelopment.effectiveCarRating}%`, background: teamColor, borderRadius: 2 }} />
          </div>
          <span style={{ color: '#E0C040', fontSize: 11, width: 50, textAlign: 'right' }}>
            ${carDevelopment.totalBudgetEarned - carDevelopment.budgetSpent}M
          </span>
        </div>
      </div>

      {/* Season progress */}
      <div style={{ background: '#111120', borderRadius: 12, padding: 14 }}>
        <div style={{ color: '#888', fontSize: 10, letterSpacing: 2, fontWeight: 'bold', marginBottom: 8 }}>
          SEASON {currentSeason.year}
        </div>
        <div style={{ color: '#FFF', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{completedRaces} / 24 races</div>
        <div style={{ height: 4, background: '#222', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: 4, width: `${(completedRaces / 24) * 100}%`, background: '#E0C040', borderRadius: 2 }} />
        </div>
      </div>

      {/* Next race */}
      {nextCircuit && nextCal && (
        <button
          onClick={() => navigate(`/race-weekend/${currentRaceIndex}`)}
          style={{ background: '#111120', borderRadius: 16, padding: 18, border: 'none', textAlign: 'left', cursor: 'pointer', width: '100%' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: '#888', fontSize: 10, letterSpacing: 2, fontWeight: 'bold' }}>NEXT RACE</span>
            <span style={{ fontSize: 28 }}>{nextCircuit.flag}</span>
          </div>
          <div style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>{nextCircuit.name}</div>
          <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>{nextCal.date} · Round {nextCal.round}</div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <span style={{ color: '#666', fontSize: 11 }}>{nextCircuit.laps} laps · {nextCircuit.lengthKm}km</span>
            <span style={{ color: '#666', fontSize: 11 }}>Rain: {Math.round(nextCircuit.weatherRainChance * 100)}%</span>
          </div>
          {nextRace.userGridPosition && (
            <div style={{ color: '#39B54A', fontSize: 12, fontWeight: 600, marginTop: 8 }}>
              Qualified P{nextRace.userGridPosition} ✓
            </div>
          )}
          <div style={{ background: '#E0C040', borderRadius: 8, padding: 12, textAlign: 'center', marginTop: 12 }}>
            <span style={{ color: '#000', fontWeight: 'bold', fontSize: 14 }}>Open Race Weekend →</span>
          </div>
        </button>
      )}

      {/* Championship top 5 */}
      <div style={{ background: '#111120', borderRadius: 12, padding: 14 }}>
        <div style={{ color: '#888', fontSize: 10, letterSpacing: 2, fontWeight: 'bold', marginBottom: 8 }}>
          CHAMPIONSHIP — TOP 5
        </div>
        {topDrivers.map((ds, i) => {
          const d = getDriver(ds.driverId);
          const t = d ? getTeam(d.teamId) : null;
          const isUser = d?.isUser;
          return (
            <div key={ds.driverId} style={{
              display: 'flex', alignItems: 'center',
              padding: '8px', gap: 10,
              background: isUser ? '#1a1a08' : 'transparent',
              borderRadius: isUser ? 6 : 0, marginInline: isUser ? -8 : 0,
            }}>
              <span style={{ color: isUser ? '#E0C040' : '#888', width: 24, fontSize: 14, fontWeight: 'bold' }}>{i + 1}</span>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: t?.color ?? '#888', flexShrink: 0 }} />
              <span style={{ flex: 1, color: isUser ? '#E0C040' : '#FFF', fontSize: 13, fontWeight: 600 }}>
                {d?.shortName ?? '?'}{isUser ? ' ★' : ''}
              </span>
              <span style={{ color: isUser ? '#E0C040' : '#FFF', fontSize: 13, fontWeight: 'bold', fontVariant: 'tabular-nums' }}>
                {ds.points} pts
              </span>
            </div>
          );
        })}
      </div>

      {/* Recent results */}
      {recentResults.length > 0 && (
        <div style={{ background: '#111120', borderRadius: 12, padding: 14 }}>
          <div style={{ color: '#888', fontSize: 10, letterSpacing: 2, fontWeight: 'bold', marginBottom: 8 }}>RECENT RESULTS</div>
          {recentResults.map((w) => {
            const c = getCircuit(w.circuitId);
            const ur = w.raceResult?.find((r) => getDriver(r.driverId)?.isUser);
            return (
              <div key={w.circuitId} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', gap: 10 }}>
                <span style={{ fontSize: 20, width: 28 }}>{c?.flag}</span>
                <span style={{ flex: 1, color: '#CCC', fontSize: 13 }}>{c?.location}</span>
                <span style={{ color: ur?.dnfLap ? '#FF4444' : '#E0C040', fontWeight: 'bold', fontSize: 14, width: 40, textAlign: 'center' }}>
                  {ur?.dnfLap ? 'DNF' : `P${ur?.position ?? '?'}`}
                </span>
                <span style={{ color: '#888', fontSize: 12, width: 44, textAlign: 'right' }}>+{ur?.points ?? 0} pts</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color: '#FFF', fontWeight: 'bold', fontSize: 18 }}>{value}</div>
      <div style={{ color: '#666', fontSize: 10, marginTop: 2 }}>{label}</div>
    </div>
  );
}
