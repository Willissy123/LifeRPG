import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { getCircuit } from '../data/circuits';
import { getDriver } from '../data/drivers2025';
import { getTeam } from '../data/teams2025';
import { USER_DRIVER_ID } from '../data/drivers2025';
import CALENDAR_2025 from '../data/calendar2025';

function useCountUp(target: number, durationMs = 1000): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      setVal(Math.round(target * t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return val;
}

function LifeScoreSparkline({ scores, color }: { scores: number[]; color: string }) {
  if (scores.length < 2) return null;
  const w = 100, h = 28;
  const max = Math.max(...scores, 1);
  const min = Math.min(...scores, 0);
  const range = max - min || 1;
  const pts = scores.map((s, i) => {
    const x = (i / (scores.length - 1)) * w;
    const y = h - ((s - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function HomeScreen() {
  const navigate = useNavigate();
  const { currentSeason, playerName, playerNumber, personalBests, achievements, rivalInfo, engineer, recentLifeScores, tpMessage, dismissTpMessage } = useGameStore();
  const { driverStandings, weekends, carDevelopment, currentRaceIndex } = currentSeason;

  const userStanding = driverStandings.find((s) => s.driverId === USER_DRIVER_ID);
  const userDriver = getDriver(USER_DRIVER_ID);
  const userTeam = getTeam(userDriver?.teamId ?? '');
  const teamColor = userTeam?.color ?? '#E0C040';
  const animatedPoints = useCountUp(userStanding?.points ?? 0);

  const nextRace = weekends[currentRaceIndex];
  const nextCircuit = nextRace ? getCircuit(nextRace.circuitId) : null;
  const nextCal = nextRace ? CALENDAR_2025[currentRaceIndex] : null;
  const completedRaces = weekends.filter((w) => w.completed).length;
  const racesRemaining = 24 - completedRaces;
  const recentResults = weekends.filter((w) => w.completed && w.raceResult).slice(-5).reverse();
  const allComplete = completedRaces >= 24;

  // Battle tracker: driver ahead and behind in standings
  const userPos = userStanding?.position ?? 20;
  const driverAhead = userPos > 1 ? driverStandings[userPos - 2] : null;
  const driverBehind = userPos < driverStandings.length ? driverStandings[userPos] : null;

  // Rival info
  const rivalDriver = rivalInfo ? getDriver(rivalInfo.driverId) : null;
  const rivalStanding = rivalInfo ? driverStandings.find((d) => d.driverId === rivalInfo.driverId) : null;

  // Newly unlocked achievements (last 3 unlocked)
  const recentAchievements = achievements.filter((a) => a.unlockedAt).slice(-2);

  return (
    <div style={{ padding: 16, paddingBottom: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Team Principal message modal */}
      {tpMessage && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{
            background: '#111120', borderRadius: 16, padding: 24, width: '100%', maxWidth: 360,
            borderLeft: `4px solid ${tpMessage.type === 'positive' ? '#39B54A' : tpMessage.type === 'warning' ? '#FF4444' : '#E0C040'}`,
            animation: 'fadeSlideIn 0.3s ease-out',
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>👔</div>
            <div style={{ color: '#888', fontSize: 10, letterSpacing: 2, fontWeight: 'bold', marginBottom: 8 }}>TEAM PRINCIPAL</div>
            <div style={{ color: '#FFF', fontSize: 15, lineHeight: 1.5, marginBottom: 20 }}>"{tpMessage.message}"</div>
            <button onClick={dismissTpMessage} style={{
              width: '100%', background: '#E0C040', borderRadius: 10, padding: '14px 0',
              border: 'none', color: '#000', fontWeight: 'bold', fontSize: 14, cursor: 'pointer',
            }}>Understood</button>
          </div>
        </div>
      )}


      {/* Driver card */}
      <div style={{ background: '#111120', borderRadius: 16, padding: 18, borderLeft: `4px solid ${teamColor}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ color: '#333', fontSize: 36, fontWeight: 'bold' }}>#{playerNumber}</div>
            <div style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold' }}>{playerName}</div>
            <div style={{ color: teamColor, fontSize: 13, marginTop: 2 }}>{userTeam?.shortName ?? 'Apex Racing'}</div>
            <div style={{ color: '#555', fontSize: 11, marginTop: 2 }}>
              Engineer: {engineer.name}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <StatBox label="Position" value={`P${userStanding?.position ?? '—'}`} />
            <StatBox label="Points" value={String(animatedPoints)} />
            <StatBox label="Wins" value={String(userStanding?.wins ?? 0)} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <span style={{ color: '#888', fontSize: 11, width: 80 }}>Car: {Math.round(carDevelopment.effectiveCarRating)}/100</span>
          <div style={{ flex: 1, height: 4, background: '#222', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: 4, width: `${carDevelopment.effectiveCarRating}%`, background: teamColor, borderRadius: 2 }} />
          </div>
          <span style={{ color: '#E0C040', fontSize: 11, width: 50, textAlign: 'right' }}>
            ${(carDevelopment.totalBudgetEarned - carDevelopment.budgetSpent).toFixed(1)}M
          </span>
        </div>

        {/* Streak indicators */}
        {(personalBests.currentPointsStreak >= 3 || personalBests.currentWinStreak >= 2 || personalBests.trainingStreak >= 2) && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {personalBests.currentPointsStreak >= 3 && (
              <div style={{ background: '#1a0a00', borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 14 }}>🔥</span>
                <span style={{ color: '#FF8800', fontSize: 12, fontWeight: 'bold' }}>
                  {personalBests.currentPointsStreak} race points streak
                </span>
              </div>
            )}
            {personalBests.currentWinStreak >= 2 && (
              <div style={{ background: '#1a1a00', borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 14 }}>🏆</span>
                <span style={{ color: '#E0C040', fontSize: 12, fontWeight: 'bold' }}>
                  {personalBests.currentWinStreak} win streak
                </span>
              </div>
            )}
            {personalBests.trainingStreak >= 2 && (
              <div style={{ background: '#0a1a0a', borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 14 }}>🏋️</span>
                <span style={{ color: '#39B54A', fontSize: 12, fontWeight: 'bold' }}>
                  {personalBests.trainingStreak} streak
                </span>
              </div>
            )}
          </div>
        )}

        {/* Life-score sparkline */}
        {recentLifeScores.length >= 2 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
            <span style={{ color: '#666', fontSize: 10, letterSpacing: 1 }}>FORM</span>
            <LifeScoreSparkline scores={recentLifeScores} color={teamColor} />
            <span style={{ color: '#888', fontSize: 11 }}>last {recentLifeScores.length} sessions</span>
          </div>
        )}
      </div>

      {/* Season progress */}
      <div style={{ background: '#111120', borderRadius: 12, padding: 14 }}>
        <div style={{ color: '#888', fontSize: 10, letterSpacing: 2, fontWeight: 'bold', marginBottom: 8 }}>
          SEASON {currentSeason.year}
        </div>
        <div style={{ color: '#FFF', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{completedRaces} / 24 races</div>
        <div style={{ height: 4, background: '#222', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ height: 4, width: `${(completedRaces / 24) * 100}%`, background: '#E0C040', borderRadius: 2 }} />
        </div>
        {allComplete && (
          <button
            onClick={() => navigate('/season-end')}
            style={{
              width: '100%', background: '#E0C040', borderRadius: 8, padding: '10px 0',
              border: 'none', color: '#000', fontWeight: 'bold', fontSize: 13, cursor: 'pointer',
            }}
          >
            View Season Awards →
          </button>
        )}
      </div>

      {/* Championship battle tracker */}
      {(driverAhead || driverBehind) && (
        <div style={{ background: '#111120', borderRadius: 12, padding: 14 }}>
          <div style={{ color: '#888', fontSize: 10, letterSpacing: 2, fontWeight: 'bold', marginBottom: 10 }}>
            CHAMPIONSHIP BATTLE
          </div>
          {driverAhead && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ background: '#1a1a2a', borderRadius: 6, padding: '4px 8px', width: 28, textAlign: 'center' }}>
                <span style={{ color: '#888', fontSize: 12, fontWeight: 'bold' }}>▲</span>
              </div>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: getTeam(getDriver(driverAhead.driverId)?.teamId ?? '')?.color ?? '#888' }} />
              <span style={{ flex: 1, color: '#AAA', fontSize: 13 }}>
                P{driverAhead.position} {getDriver(driverAhead.driverId)?.shortName}
              </span>
              <span style={{ color: '#FF4444', fontWeight: 'bold', fontSize: 13 }}>
                -{driverAhead.points - (userStanding?.points ?? 0)}pts
              </span>
            </div>
          )}
          {/* User row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#1a1a08', borderRadius: 6, padding: '6px 8px', marginBottom: 8 }}>
            <div style={{ background: teamColor, borderRadius: 6, padding: '4px 8px', width: 28, textAlign: 'center' }}>
              <span style={{ color: '#000', fontSize: 12, fontWeight: 'bold' }}>P{userPos}</span>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: teamColor }} />
            <span style={{ flex: 1, color: '#E0C040', fontWeight: 'bold', fontSize: 13 }}>{playerName} ★</span>
            <span style={{ color: '#E0C040', fontWeight: 'bold', fontSize: 13 }}>{userStanding?.points ?? 0}pts</span>
          </div>
          {driverBehind && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: '#1a1a2a', borderRadius: 6, padding: '4px 8px', width: 28, textAlign: 'center' }}>
                <span style={{ color: '#888', fontSize: 12, fontWeight: 'bold' }}>▼</span>
              </div>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: getTeam(getDriver(driverBehind.driverId)?.teamId ?? '')?.color ?? '#888' }} />
              <span style={{ flex: 1, color: '#AAA', fontSize: 13 }}>
                P{driverBehind.position} {getDriver(driverBehind.driverId)?.shortName}
              </span>
              <span style={{ color: '#39B54A', fontWeight: 'bold', fontSize: 13 }}>
                +{(userStanding?.points ?? 0) - driverBehind.points}pts
              </span>
            </div>
          )}
        </div>
      )}

      {/* Rival tracker */}
      {rivalDriver && rivalStanding && (
        <div style={{ background: '#111120', borderRadius: 12, padding: 14, borderLeft: '3px solid #FF4444' }}>
          <div style={{ color: '#FF4444', fontSize: 10, letterSpacing: 2, fontWeight: 'bold', marginBottom: 6 }}>RIVAL</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>⚔️</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>{rivalDriver.name}</div>
              <div style={{ color: '#888', fontSize: 12 }}>P{rivalStanding.position} · {rivalStanding.points}pts</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: rivalInfo!.gapToRival >= 0 ? '#39B54A' : '#FF4444', fontWeight: 'bold', fontSize: 16 }}>
                {rivalInfo!.gapToRival >= 0 ? `+${rivalInfo!.gapToRival}` : rivalInfo!.gapToRival}
              </div>
              <div style={{ color: '#555', fontSize: 10 }}>pts gap</div>
            </div>
          </div>
          {/* Head-to-head record */}
          {(rivalInfo!.h2hWins + rivalInfo!.h2hLosses + rivalInfo!.h2hDraws) > 0 && (
            <div style={{ color: '#888', fontSize: 12, marginTop: 10 }}>
              <span style={{ color: '#39B54A', fontWeight: 'bold' }}>{rivalInfo!.h2hWins}W</span>{' '}
              <span style={{ color: '#FF4444', fontWeight: 'bold' }}>{rivalInfo!.h2hLosses}L</span>{' '}
              <span style={{ color: '#888', fontWeight: 'bold' }}>{rivalInfo!.h2hDraws}D</span>{' '}
              vs {rivalDriver.shortName}
            </div>
          )}
          {/* Rival reaction quote */}
          {rivalInfo!.lastReaction && (
            <div style={{ color: '#CCC', fontSize: 12, fontStyle: 'italic', marginTop: 8, paddingTop: 8, borderTop: '1px solid #2a1414' }}>
              {rivalInfo!.lastReaction}
            </div>
          )}
        </div>
      )}

      {/* Next race */}
      {!allComplete && nextCircuit && nextCal && (
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
          {nextCal.hasSprint && (
            <div style={{ color: '#FF8800', fontSize: 11, fontWeight: 'bold', marginTop: 4 }}>⚡ Sprint Weekend</div>
          )}
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <span style={{ color: '#666', fontSize: 11 }}>{nextCircuit.laps} laps · {nextCircuit.lengthKm}km</span>
            <span style={{ color: '#666', fontSize: 11 }}>Rain: {Math.round(nextCircuit.weatherRainChance * 100)}%</span>
          </div>
          <div style={{ color: '#0090FF', fontSize: 11, fontWeight: 600, marginTop: 6 }}>
            ⏱ Round {currentRaceIndex + 1} of 24 · {racesRemaining} race{racesRemaining === 1 ? '' : 's'} remaining this season
          </div>
          {nextRace?.userGridPosition && (
            <div style={{ color: '#39B54A', fontSize: 12, fontWeight: 600, marginTop: 8 }}>
              Qualified P{nextRace.userGridPosition} ✓
            </div>
          )}
          <div style={{ background: '#E0C040', borderRadius: 8, padding: 12, textAlign: 'center', marginTop: 12 }}>
            <span style={{ color: '#000', fontWeight: 'bold', fontSize: 14 }}>Open Race Weekend →</span>
          </div>
        </button>
      )}

      {/* Personal bests */}
      {(personalBests.totalWins > 0 || personalBests.bestFinish < 99) && (
        <div style={{ background: '#111120', borderRadius: 12, padding: 14 }}>
          <div style={{ color: '#888', fontSize: 10, letterSpacing: 2, fontWeight: 'bold', marginBottom: 10 }}>CAREER BESTS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {personalBests.bestFinish < 99 && (
              <MiniStat label="Best Finish" value={`P${personalBests.bestFinish}`} color="#E0C040" />
            )}
            {personalBests.bestGridPosition < 99 && (
              <MiniStat label="Best Grid" value={`P${personalBests.bestGridPosition}`} color="#0090FF" />
            )}
            <MiniStat label="Wins" value={String(personalBests.totalWins)} color="#FF8800" />
            <MiniStat label="Podiums" value={String(personalBests.totalPodiums)} color="#39B54A" />
            {personalBests.totalFastestLaps > 0 && (
              <MiniStat label="Fastest Laps" value={String(personalBests.totalFastestLaps)} color="#CC00FF" />
            )}
            {personalBests.longestPointsStreak > 0 && (
              <MiniStat label="Pts Streak" value={String(personalBests.longestPointsStreak)} color="#FF4444" />
            )}
          </div>
        </div>
      )}

      {/* Championship standings - top 5 */}
      <div style={{ background: '#111120', borderRadius: 12, padding: 14 }}>
        <div style={{ color: '#888', fontSize: 10, letterSpacing: 2, fontWeight: 'bold', marginBottom: 8 }}>
          CHAMPIONSHIP — TOP 5
        </div>
        {driverStandings.slice(0, 5).map((ds, i) => {
          const d = getDriver(ds.driverId);
          const t = d ? getTeam(d.teamId) : null;
          const isUser = d?.isUser;
          return (
            <div key={ds.driverId} style={{
              display: 'flex', alignItems: 'center', padding: '8px',
              gap: 10, background: isUser ? '#1a1a08' : 'transparent',
              borderRadius: isUser ? 6 : 0, marginInline: isUser ? -8 : 0,
            }}>
              <span style={{ color: isUser ? '#E0C040' : '#888', width: 24, fontSize: 14, fontWeight: 'bold' }}>{i + 1}</span>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: t?.color ?? '#888', flexShrink: 0 }} />
              <span style={{ flex: 1, color: isUser ? '#E0C040' : '#FFF', fontSize: 13, fontWeight: 600 }}>
                {d?.shortName ?? '?'}{isUser ? ' ★' : ''}
              </span>
              <span style={{ color: isUser ? '#E0C040' : '#FFF', fontSize: 13, fontWeight: 'bold', fontVariant: 'tabular-nums' }}>
                {ds.points}pts
              </span>
            </div>
          );
        })}
      </div>

      {/* Recent achievements */}
      {recentAchievements.length > 0 && (
        <div style={{ background: '#111120', borderRadius: 12, padding: 14 }}>
          <div style={{ color: '#E0C040', fontSize: 10, letterSpacing: 2, fontWeight: 'bold', marginBottom: 8 }}>RECENT ACHIEVEMENTS</div>
          {recentAchievements.map((a) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
              <span style={{ fontSize: 20 }}>{a.icon}</span>
              <div>
                <div style={{ color: '#E0C040', fontWeight: 'bold', fontSize: 13 }}>{a.name}</div>
                <div style={{ color: '#666', fontSize: 11 }}>{a.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent results */}
      {recentResults.length > 0 && (
        <div style={{ background: '#111120', borderRadius: 12, padding: 14 }}>
          <div style={{ color: '#888', fontSize: 10, letterSpacing: 2, fontWeight: 'bold', marginBottom: 8 }}>RECENT RESULTS</div>
          {recentResults.map((w) => {
            const c = getCircuit(w.circuitId);
            const ur = w.raceResult?.find((r) => getDriver(r.driverId)?.isUser);
            const sr = w.sprintRaceResult?.find((r) => getDriver(r.driverId)?.isUser);
            return (
              <div key={w.circuitId} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', gap: 10 }}>
                <span style={{ fontSize: 20, width: 28 }}>{c?.flag}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ color: '#CCC', fontSize: 13 }}>{c?.location}</span>
                  {sr && (
                    <div style={{ color: '#FF8800', fontSize: 10 }}>Sprint: P{sr.position} +{sr.points}pts</div>
                  )}
                </div>
                <span style={{ color: ur?.dnfLap ? '#FF4444' : '#E0C040', fontWeight: 'bold', fontSize: 14, width: 40, textAlign: 'center' }}>
                  {ur?.dnfLap ? 'DNF' : `P${ur?.position ?? '?'}`}
                </span>
                <span style={{ color: '#888', fontSize: 12, width: 44, textAlign: 'right' }}>+{ur?.points ?? 0}pts</span>
              </div>
            );
          })}
        </div>
      )}

      {/* View Career */}
      <button
        onClick={() => navigate('/history')}
        style={{
          background: '#111120', borderRadius: 12, padding: 16, border: '1px solid #1a1a2a',
          color: '#E0C040', fontWeight: 'bold', fontSize: 14, cursor: 'pointer', width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        📈 View Career History →
      </button>
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

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#1a1a2a', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
      <div style={{ color, fontWeight: 'bold', fontSize: 15 }}>{value}</div>
      <div style={{ color: '#666', fontSize: 10, marginTop: 2 }}>{label}</div>
    </div>
  );
}
