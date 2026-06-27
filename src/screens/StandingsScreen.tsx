import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getDriver } from '../data/drivers2025';
import { getTeam } from '../data/teams2025';
import { USER_DRIVER_ID } from '../data/drivers2025';

type Tab = 'drivers' | 'constructors';

export default function StandingsScreen() {
  const [tab, setTab] = useState<Tab>('drivers');
  const { currentSeason } = useGameStore();
  const { driverStandings, constructorStandings } = currentSeason;
  const completedRaces = currentSeason.weekends.filter((w) => w.completed).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', background: '#111120', flexShrink: 0 }}>
        {(['drivers', 'constructors'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: 14, background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: tab === t ? '2px solid #E0C040' : '2px solid transparent',
              color: tab === t ? '#FFF' : '#666', fontWeight: 'bold', fontSize: 12, letterSpacing: 1,
            }}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{ color: '#555', fontSize: 11, textAlign: 'center', padding: '8px 0', flexShrink: 0 }}>
        After {completedRaces} / 24 races
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 40px' }}>
        {tab === 'drivers' ? (
          (() => {
            const leaderPts = driverStandings[0]?.points ?? 1;
            return driverStandings.map((ds) => {
            const driver = getDriver(ds.driverId);
            const team = driver ? getTeam(driver.teamId) : null;
            const isUser = driver?.isUser;
            const delta = ds.previousPosition != null ? ds.previousPosition - ds.position : 0;
            const barWidth = leaderPts > 0 ? (ds.points / leaderPts) * 80 : 0;
            return (
              <div key={ds.driverId} style={{
                display: 'flex', alignItems: 'center',
                padding: '12px 8px', borderBottom: '1px solid #111', gap: 10,
                background: isUser ? '#1a1a08' : 'transparent',
                borderRadius: isUser ? 8 : 0,
              }}>
                <span style={{ color: isUser ? '#E0C040' : '#888', fontWeight: 'bold', fontSize: 15, width: 24 }}>
                  {ds.position}
                </span>
                <span style={{ width: 22, fontSize: 10, fontWeight: 'bold', textAlign: 'center', color: delta > 0 ? '#39B54A' : delta < 0 ? '#FF4444' : '#444' }}>
                  {delta > 0 ? `↑${delta}` : delta < 0 ? `↓${Math.abs(delta)}` : '–'}
                </span>
                <div style={{ width: 3, height: 30, borderRadius: 1.5, background: team?.color ?? '#888', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: isUser ? '#E0C040' : '#FFF', fontWeight: 600, fontSize: 14 }}>
                    {driver?.shortName ?? '?'}{isUser ? ' ★' : ''}
                  </div>
                  <div style={{ color: team?.color ?? '#888', fontSize: 11, marginTop: 2 }}>{team?.shortName}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: isUser ? '#E0C040' : '#FFF', fontWeight: 'bold', fontSize: 14, fontVariant: 'tabular-nums' }}>
                    {ds.points} pts
                  </div>
                  <div style={{ height: 3, width: 80, background: '#1a1a2a', borderRadius: 2, marginTop: 3, marginLeft: 'auto', overflow: 'hidden' }}>
                    <div style={{ height: 3, width: `${barWidth}px`, background: team?.color ?? '#888', borderRadius: 2 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 3, justifyContent: 'flex-end' }}>
                    {ds.wins > 0 && <span style={{ background: '#E0C040', borderRadius: 4, padding: '1px 5px', color: '#000', fontSize: 9, fontWeight: 'bold' }}>{ds.wins}W</span>}
                    {ds.podiums > 0 && <span style={{ background: '#1a1a2a', borderRadius: 4, padding: '1px 5px', color: '#888', fontSize: 9 }}>{ds.podiums}P</span>}
                  </div>
                </div>
              </div>
            );
          });
          })()
        ) : (
          constructorStandings.map((cs) => {
            const team = getTeam(cs.teamId);
            const isUser = cs.teamId === 'apex_racing';
            return (
              <div key={cs.teamId} style={{
                display: 'flex', alignItems: 'center',
                padding: '12px 8px', borderBottom: '1px solid #111', gap: 10,
                background: isUser ? '#1a1a08' : 'transparent',
                borderRadius: isUser ? 8 : 0,
              }}>
                <span style={{ color: isUser ? '#E0C040' : '#888', fontWeight: 'bold', fontSize: 15, width: 28 }}>
                  {cs.position}
                </span>
                <div style={{ width: 3, height: 30, borderRadius: 1.5, background: team?.color ?? '#888', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: isUser ? '#E0C040' : '#FFF', fontWeight: 600, fontSize: 14 }}>
                    {team?.shortName ?? '?'}{isUser ? ' ★' : ''}
                  </div>
                  <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>{team?.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: isUser ? '#E0C040' : '#FFF', fontWeight: 'bold', fontSize: 14, fontVariant: 'tabular-nums' }}>
                    {cs.points} pts
                  </div>
                  {cs.wins > 0 && <span style={{ color: '#888', fontSize: 10 }}>{cs.wins} wins</span>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
