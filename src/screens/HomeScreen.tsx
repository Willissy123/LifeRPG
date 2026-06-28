import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { getCircuit } from '../data/circuits';
import { getDriver } from '../data/drivers2025';
import { getTeam } from '../data/teams2025';
import { USER_DRIVER_ID } from '../data/drivers2025';
import CALENDAR_2025 from '../data/calendar2025';

function useCountUp(target: number, durationMs = 1400): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(target * ease));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return val;
}

function LifeSparkline({ scores, color }: { scores: number[]; color: string }) {
  if (scores.length < 2) return null;
  const w = 80, h = 24;
  const max = Math.max(...scores, 1), min = Math.min(...scores, 0);
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
  const {
    currentSeason, playerName, playerNumber, personalBests,
    achievements, rivalInfo, engineer, recentLifeScores,
    tpMessage, dismissTpMessage,
  } = useGameStore();
  const { driverStandings, weekends, carDevelopment, currentRaceIndex } = currentSeason;

  const userStanding = driverStandings.find((s) => s.driverId === USER_DRIVER_ID);
  const userDriver = getDriver(USER_DRIVER_ID);
  const userTeam = getTeam(userDriver?.teamId ?? '');
  const teamColor = userTeam?.color ?? '#E0C040';

  const animatedPoints = useCountUp(userStanding?.points ?? 0);
  const animatedWins = useCountUp(userStanding?.wins ?? 0, 800);

  const nextRace = weekends[currentRaceIndex];
  const nextCircuit = nextRace ? getCircuit(nextRace.circuitId) : null;
  const nextCal = nextRace ? CALENDAR_2025[currentRaceIndex] : null;
  const completedRaces = weekends.filter((w) => w.completed).length;
  const racesRemaining = 24 - completedRaces;
  const recentResults = weekends.filter((w) => w.completed && w.raceResult).slice(-6).reverse();
  const allComplete = completedRaces >= 24;

  const userPos = userStanding?.position ?? 20;
  const leaderPts = driverStandings[0]?.points ?? 1;

  const rivalDriver = rivalInfo ? getDriver(rivalInfo.driverId) : null;
  const rivalStanding = rivalInfo ? driverStandings.find((d) => d.driverId === rivalInfo.driverId) : null;

  const recentAchievements = achievements.filter((a) => a.unlockedAt).slice(-2);

  const hasStreak = personalBests.currentPointsStreak >= 3
    || personalBests.currentWinStreak >= 2
    || personalBests.trainingStreak >= 3;

  const posLabel = userPos === 1 ? '👑 P1' : `P${userPos}`;

  return (
    <div style={{ paddingBottom: 48, background: '#0a0a0f', minHeight: '100%' }}>

      {/* ── TP MESSAGE MODAL ── */}
      {tpMessage && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{
            background: '#111120', borderRadius: 20, padding: 28, width: '100%', maxWidth: 360,
            borderLeft: `4px solid ${tpMessage.type === 'positive' ? '#39B54A' : tpMessage.type === 'warning' ? '#FF4444' : '#E0C040'}`,
            animation: 'fadeSlideIn 0.35s ease-out',
          }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>👔</div>
            <div style={{ color: '#888', fontSize: 10, letterSpacing: 2, fontWeight: 'bold', marginBottom: 8 }}>TEAM PRINCIPAL</div>
            <div style={{ color: '#FFF', fontSize: 16, lineHeight: 1.6, marginBottom: 24 }}>"{tpMessage.message}"</div>
            <button onClick={dismissTpMessage} style={{
              width: '100%', background: '#E0C040', borderRadius: 12, padding: '16px 0',
              border: 'none', color: '#000', fontWeight: 'bold', fontSize: 15, cursor: 'pointer',
            }}>Understood</button>
          </div>
        </div>
      )}

      {/* ── HERO BANNER ── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: `linear-gradient(160deg, ${teamColor}28 0%, #0a0a0f 70%)`,
        padding: '28px 20px 24px',
        borderBottom: `1px solid ${teamColor}22`,
        animation: 'heroIn 0.5s ease-out both',
      }}>
        {/* Watermark number */}
        <div style={{
          position: 'absolute', right: -10, top: -10,
          fontSize: 160, fontWeight: 900, color: teamColor,
          opacity: 0.06, lineHeight: 1, userSelect: 'none', letterSpacing: -8,
        }}>
          {playerNumber}
        </div>

        {/* Top row: engineer + season label */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ color: '#555', fontSize: 11, letterSpacing: 1 }}>
            ENG: <span style={{ color: '#888' }}>{engineer.name}</span>
          </div>
          <div style={{ color: '#555', fontSize: 11, letterSpacing: 1 }}>
            SEASON {currentSeason.year}
          </div>
        </div>

        {/* Championship position — the hero number */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          {/* Expanding ring behind P1 */}
          {userPos === 1 && (
            <>
              <div style={{
                position: 'absolute', inset: -8, borderRadius: 16,
                border: `2px solid ${teamColor}`,
                animation: 'expandRing 1.8s ease-out infinite',
              }} />
              <div style={{
                position: 'absolute', inset: -8, borderRadius: 16,
                border: `2px solid ${teamColor}`,
                animation: 'expandRing 1.8s ease-out infinite',
                animationDelay: '0.6s',
              }} />
            </>
          )}
          <div style={{
            fontSize: 80, fontWeight: 900, lineHeight: 1,
            color: userPos === 1 ? '#E0C040' : '#FFF',
            textShadow: userPos === 1 ? `0 0 40px ${teamColor}88, 0 0 80px ${teamColor}44` : 'none',
            letterSpacing: -2,
            animation: 'bounceIn 0.6s ease-out both',
            animationDelay: '0.15s',
          }}>
            {posLabel}
          </div>
        </div>

        {/* Name + team */}
        <div style={{ marginTop: 8 }}>
          <div style={{ color: '#FFF', fontSize: 22, fontWeight: 700, letterSpacing: 0.5 }}>{playerName}</div>
          <div style={{ color: teamColor, fontSize: 13, marginTop: 2, fontWeight: 600 }}>{userTeam?.shortName ?? 'Apex Racing'}</div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <StatPill label="PTS" value={String(animatedPoints)} color="#E0C040" glow />
          <StatPill label="WINS" value={String(animatedWins)} color={teamColor} />
          <StatPill label="PODIUMS" value={String(userStanding?.podiums ?? 0)} color="#FF8800" />
          <StatPill label="POLES" value={String(personalBests.totalPoles)} color="#0090FF" />
        </div>

        {/* Car rating + budget */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ color: '#555', fontSize: 11 }}>CAR {Math.round(carDevelopment.effectiveCarRating)}/100</span>
            <span style={{ color: '#39B54A', fontSize: 11, fontWeight: 600 }}>
              💰 ${(carDevelopment.totalBudgetEarned - carDevelopment.budgetSpent).toFixed(1)}M
            </span>
          </div>
          <div style={{ height: 3, background: '#1a1a2a', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: `${carDevelopment.effectiveCarRating}%`,
              background: `linear-gradient(90deg, ${teamColor}88, ${teamColor})`,
              transition: 'width 1s ease-out',
            }} />
          </div>
        </div>

        {/* Life form sparkline */}
        {recentLifeScores.length >= 2 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <span style={{ color: '#444', fontSize: 10, letterSpacing: 1 }}>FORM</span>
            <LifeSparkline scores={recentLifeScores} color={teamColor} />
            <span style={{ color: '#444', fontSize: 10 }}>last {recentLifeScores.length}</span>
          </div>
        )}
      </div>

      {/* ── ON FIRE STREAKS ── */}
      {hasStreak && (
        <div style={{ padding: '14px 20px', background: '#0f0900', borderBottom: '1px solid #2a1500' }}>
          <div style={{ color: '#FF8800', fontSize: 10, letterSpacing: 2, fontWeight: 'bold', marginBottom: 10 }}>
            🔥 ON A STREAK
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {personalBests.currentPointsStreak >= 3 && (
              <StreakChip icon="🔥" label={`${personalBests.currentPointsStreak} races in points`} color="#FF8800" />
            )}
            {personalBests.currentWinStreak >= 2 && (
              <StreakChip icon="🏆" label={`${personalBests.currentWinStreak} wins in a row`} color="#E0C040" />
            )}
            {personalBests.trainingStreak >= 3 && (
              <StreakChip icon="🏋️" label={`${personalBests.trainingStreak} training sessions`} color="#39B54A" />
            )}
          </div>
        </div>
      )}

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}
        // stagger children via inline style on each child below
      >

        {/* ── NEXT RACE CTA ── */}
        {!allComplete && nextCircuit && nextCal && (
          <button
            onClick={() => navigate(`/race-weekend/${currentRaceIndex}`)}
            style={{
              width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left',
              background: '#111120', borderRadius: 18,
              animation: 'fadeSlideUp 0.4s ease-out both', animationDelay: '0.05s',
              overflow: 'hidden', padding: 0,
              boxShadow: `0 0 0 1px ${teamColor}22`,
            }}
          >
            {/* Top strip */}
            <div style={{
              background: `linear-gradient(135deg, ${teamColor}22 0%, #0a0a0f 100%)`,
              padding: '16px 18px 12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ color: '#888', fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>
                    NEXT · ROUND {nextCal.round}/24
                  </div>
                  <div style={{ color: '#FFF', fontSize: 20, fontWeight: 800 }}>{nextCircuit.name}</div>
                  <div style={{ color: '#666', fontSize: 12, marginTop: 3 }}>
                    {nextCircuit.laps} laps · {nextCircuit.lengthKm}km
                    {nextCircuit.weatherRainChance > 0.3 && (
                      <span style={{ color: '#0090FF', marginLeft: 8 }}>
                        🌧 {Math.round(nextCircuit.weatherRainChance * 100)}% rain
                      </span>
                    )}
                  </div>
                  {nextCal.hasSprint && (
                    <div style={{ color: '#FF8800', fontSize: 11, fontWeight: 'bold', marginTop: 4 }}>⚡ Sprint Weekend</div>
                  )}
                </div>
                <div style={{ fontSize: 52, lineHeight: 1 }}>{nextCircuit.flag}</div>
              </div>

              {/* Session progress */}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                {(['FP1', 'Q', 'RACE'] as const).map((s) => {
                  const done = s === 'FP1'
                    ? !!nextRace.practiceResults?.fp1
                    : s === 'Q'
                    ? !!nextRace.qualifyingResult
                    : !!nextRace.raceResult;
                  return (
                    <div key={s} style={{
                      background: done ? '#39B54A22' : '#1a1a2a',
                      borderRadius: 6, padding: '4px 10px',
                      border: `1px solid ${done ? '#39B54A' : '#2a2a3a'}`,
                    }}>
                      <span style={{ color: done ? '#39B54A' : '#555', fontSize: 11, fontWeight: 'bold' }}>
                        {done ? '✓ ' : ''}{s}
                      </span>
                    </div>
                  );
                })}
                <div style={{ flex: 1 }} />
                <div style={{ color: '#555', fontSize: 11, alignSelf: 'center' }}>
                  {racesRemaining} left
                </div>
              </div>
            </div>

            {/* CTA button */}
            <div style={{
              background: '#E0C040', padding: '14px 18px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ color: '#000', fontWeight: 800, fontSize: 15 }}>
                {nextRace.qualifyingResult ? 'Continue Weekend' : 'Open Race Weekend'}
              </span>
              <span style={{ color: '#000', fontSize: 20 }}>→</span>
            </div>
          </button>
        )}

        {allComplete && (
          <button onClick={() => navigate('/season-end')} style={{
            background: 'linear-gradient(135deg, #1a1a08, #2a2a00)',
            borderRadius: 16, padding: 20, border: '2px solid #E0C040',
            color: '#E0C040', fontWeight: 'bold', fontSize: 16, cursor: 'pointer',
            width: '100%', textAlign: 'center',
          }}>
            🏆 Season Complete — View Awards →
          </button>
        )}

        {/* ── RECENT RESULTS (horizontal scroll) ── */}
        {recentResults.length > 0 && (
          <div style={{ animation: 'fadeSlideUp 0.4s ease-out both', animationDelay: '0.12s' }}>
            <div style={{ color: '#555', fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>RECENT RESULTS</div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
              {recentResults.map((w) => {
                const c = getCircuit(w.circuitId);
                const ur = w.raceResult?.find((r) => getDriver(r.driverId)?.isUser);
                const isDnf = !!ur?.dnfLap;
                const pos = ur?.position ?? 0;
                const posColor = isDnf ? '#FF4444' : pos === 1 ? '#E0C040' : pos <= 3 ? '#C0C0C0' : '#FFF';
                const bgColor = isDnf ? '#1a0808' : pos === 1 ? '#1a1a08' : pos <= 3 ? '#111118' : '#111120';
                return (
                  <div key={w.circuitId} style={{
                    background: bgColor, borderRadius: 12, padding: '12px 14px',
                    minWidth: 84, flexShrink: 0, textAlign: 'center',
                    border: pos === 1 ? '1px solid #E0C04044' : '1px solid #1a1a2a',
                  }}>
                    <div style={{ fontSize: 26, lineHeight: 1 }}>{c?.flag ?? '🏁'}</div>
                    <div style={{
                      color: posColor, fontWeight: 900, fontSize: 22, marginTop: 6, lineHeight: 1,
                      textShadow: pos === 1 ? '0 0 12px #E0C04088' : 'none',
                    }}>
                      {isDnf ? 'DNF' : `P${pos}`}
                    </div>
                    <div style={{ color: '#555', fontSize: 10, marginTop: 4 }}>
                      +{ur?.points ?? 0}pts
                    </div>
                    {ur?.fastestLap && (
                      <div style={{ color: '#CC00FF', fontSize: 9, marginTop: 2 }}>💜 FL</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── RIVAL ── */}
        {rivalDriver && rivalStanding && (
          <div style={{
            background: 'linear-gradient(135deg, #1a0808 0%, #111120 100%)',
            animation: 'fadeSlideUp 0.4s ease-out both', animationDelay: '0.18s',
            borderRadius: 16, padding: 16,
            border: '1px solid #FF444422',
            boxShadow: '0 0 20px #FF444411',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
              <span style={{ color: '#FF4444', fontSize: 10, letterSpacing: 2, fontWeight: 'bold' }}>⚔️ RIVAL</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `linear-gradient(135deg, ${getTeam(rivalDriver.teamId)?.color ?? '#888'}44, #1a1a2a)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `2px solid ${getTeam(rivalDriver.teamId)?.color ?? '#888'}44`,
                fontSize: 20, flexShrink: 0,
              }}>🏎</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#FFF', fontWeight: 700, fontSize: 16 }}>{rivalDriver.shortName}</div>
                <div style={{ color: '#888', fontSize: 12, marginTop: 1 }}>
                  P{rivalStanding.position} · {rivalStanding.points}pts
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  color: rivalInfo!.gapToRival >= 0 ? '#39B54A' : '#FF4444',
                  fontWeight: 900, fontSize: 24,
                  textShadow: rivalInfo!.gapToRival >= 0 ? '0 0 12px #39B54A88' : '0 0 12px #FF444488',
                }}>
                  {rivalInfo!.gapToRival >= 0 ? `+${rivalInfo!.gapToRival}` : rivalInfo!.gapToRival}
                </div>
                <div style={{ color: '#555', fontSize: 10 }}>pts gap</div>
              </div>
            </div>
            {(rivalInfo!.h2hWins + rivalInfo!.h2hLosses + rivalInfo!.h2hDraws) > 0 && (
              <div style={{
                display: 'flex', gap: 6, marginTop: 12,
                background: '#0a0a14', borderRadius: 8, padding: '8px 12px',
              }}>
                <span style={{ color: '#39B54A', fontWeight: 'bold', fontSize: 13 }}>{rivalInfo!.h2hWins}W</span>
                <span style={{ color: '#555' }}>·</span>
                <span style={{ color: '#FF4444', fontWeight: 'bold', fontSize: 13 }}>{rivalInfo!.h2hLosses}L</span>
                <span style={{ color: '#555' }}>·</span>
                <span style={{ color: '#888', fontWeight: 'bold', fontSize: 13 }}>{rivalInfo!.h2hDraws}D</span>
                <span style={{ color: '#555', fontSize: 12, marginLeft: 4 }}>vs {rivalDriver.shortName}</span>
              </div>
            )}
            {rivalInfo!.lastReaction && (
              <div style={{
                color: '#AAA', fontSize: 13, fontStyle: 'italic',
                marginTop: 10, paddingTop: 10, borderTop: '1px solid #2a1414',
                lineHeight: 1.5,
              }}>
                {rivalInfo!.lastReaction}
              </div>
            )}
          </div>
        )}

        {/* ── CHAMPIONSHIP TABLE ── */}
        <div style={{ background: '#111120', borderRadius: 16, padding: 16, animation: 'fadeSlideUp 0.4s ease-out both', animationDelay: '0.24s' }}>
          <div style={{ color: '#555', fontSize: 10, letterSpacing: 2, marginBottom: 12 }}>
            CHAMPIONSHIP · TOP 8
          </div>
          {driverStandings.slice(0, 8).map((ds, i) => {
            const d = getDriver(ds.driverId);
            const t = d ? getTeam(d.teamId) : null;
            const isUser = d?.isUser;
            const barWidth = leaderPts > 0 ? (ds.points / leaderPts) * 100 : 0;
            return (
              <div key={ds.driverId} style={{
                padding: '8px 0',
                background: isUser ? '#1a1a08' : 'transparent',
                borderRadius: isUser ? 8 : 0,
                marginInline: isUser ? -8 : 0,
                paddingInline: isUser ? 8 : 0,
                marginBottom: 2,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{
                    color: i === 0 ? '#E0C040' : isUser ? '#E0C040' : '#555',
                    width: 20, fontSize: 12, fontWeight: 'bold',
                  }}>{i + 1}</span>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: t?.color ?? '#888', flexShrink: 0 }} />
                  <span style={{ flex: 1, color: isUser ? '#E0C040' : '#CCC', fontSize: 13, fontWeight: isUser ? 700 : 400 }}>
                    {d?.shortName ?? '?'}{isUser ? ' ★' : ''}
                  </span>
                  <span style={{ color: isUser ? '#E0C040' : '#888', fontSize: 12, fontWeight: 'bold', fontVariant: 'tabular-nums' }}>
                    {ds.points}
                  </span>
                </div>
                <div style={{ marginLeft: 28, height: 2, background: '#1a1a2a', borderRadius: 1, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 1,
                    width: `${barWidth}%`,
                    background: isUser ? '#E0C040' : (t?.color ?? '#555'),
                    opacity: isUser ? 1 : 0.5,
                    transition: 'width 1s ease-out',
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── RECENT ACHIEVEMENTS ── */}
        {recentAchievements.length > 0 && (
          <div style={{ background: '#111120', borderRadius: 16, padding: 16, animation: 'fadeSlideUp 0.4s ease-out both', animationDelay: '0.30s' }}>
            <div style={{ color: '#555', fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>
              🏅 ACHIEVEMENTS
            </div>
            {recentAchievements.map((a) => (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 0', borderBottom: '1px solid #1a1a2a',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: '#1a1a08', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid #E0C04033', fontSize: 20,
                }}>
                  {a.icon}
                </div>
                <div>
                  <div style={{ color: '#E0C040', fontWeight: 700, fontSize: 13 }}>{a.name}</div>
                  <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>{a.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── CAREER BESTS ── */}
        {(personalBests.totalWins > 0 || personalBests.bestFinish < 99) && (
          <div style={{ background: '#111120', borderRadius: 16, padding: 16, animation: 'fadeSlideUp 0.4s ease-out both', animationDelay: '0.36s' }}>
            <div style={{ color: '#555', fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>CAREER BESTS</div>
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
                <MiniStat label="Best Streak" value={String(personalBests.longestPointsStreak)} color="#FF4444" />
              )}
            </div>
          </div>
        )}

        {/* ── VIEW CAREER ── */}
        <button
          onClick={() => navigate('/history')}
          style={{
            background: '#111120', borderRadius: 12, padding: '14px 18px',
            border: '1px solid #1a1a2a', color: '#E0C040', fontWeight: 'bold',
            fontSize: 14, cursor: 'pointer', width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            animation: 'fadeSlideUp 0.4s ease-out both', animationDelay: '0.42s',
          }}
        >
          <span>📈 Career History</span>
          <span style={{ color: '#444' }}>→</span>
        </button>

      </div>
    </div>
  );
}

function StatPill({ label, value, color, glow }: { label: string; value: string; color: string; glow?: boolean }) {
  return (
    <div style={{
      background: '#1a1a2a', borderRadius: 10, padding: '10px 14px', textAlign: 'center', flex: 1,
      border: glow ? `1px solid ${color}44` : '1px solid transparent',
      boxShadow: glow ? `0 0 16px ${color}22` : 'none',
    }}>
      <div style={{
        color, fontWeight: 900, fontSize: 22,
        textShadow: glow ? `0 0 12px ${color}88` : 'none',
      }}>{value}</div>
      <div style={{ color: '#555', fontSize: 9, letterSpacing: 1, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function StreakChip({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: `${color}18`, borderRadius: 20, padding: '6px 12px',
      border: `1px solid ${color}44`,
      animation: 'pulse 2s ease-in-out infinite',
    }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ color, fontSize: 12, fontWeight: 'bold' }}>{label}</span>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#1a1a2a', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
      <div style={{ color, fontWeight: 'bold', fontSize: 16 }}>{value}</div>
      <div style={{ color: '#555', fontSize: 10, marginTop: 2 }}>{label}</div>
    </div>
  );
}
