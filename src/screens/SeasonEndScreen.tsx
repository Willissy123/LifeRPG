import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { getDriver } from '../data/drivers2025';
import { getTeam } from '../data/teams2025';
import { USER_DRIVER_ID } from '../data/drivers2025';

export default function SeasonEndScreen() {
  const navigate = useNavigate();
  const { currentSeason, allSeasons, achievements, personalBests, playerName, transferOffer, startNewSeason, acceptTransferOffer } = useGameStore();
  const { driverStandings, constructorStandings, weekends, year } = currentSeason;
  const [showTransfer, setShowTransfer] = useState(!!transferOffer);

  const userStanding = driverStandings.find((d) => d.driverId === USER_DRIVER_ID);
  const isChampion = userStanding?.position === 1;
  const userTeam = getTeam(getDriver(USER_DRIVER_ID)?.teamId ?? '');
  const teamColor = userTeam?.color ?? '#E0C040';

  const newlyUnlocked = achievements.filter((a) => {
    const seasonStart = `${year}-01-01`;
    return a.unlockedAt && a.unlockedAt >= seasonStart;
  });

  function handleStartNewSeason() {
    startNewSeason();
    navigate('/home');
  }

  if (showTransfer && transferOffer) {
    const offerTeam = getTeam(transferOffer.teamId);
    return (
      <div style={{ padding: 24, background: '#0a0a0f', minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 52 }}>📋</div>
          <div style={{ color: '#E0C040', fontWeight: 'bold', fontSize: 22, marginTop: 8 }}>Transfer Offer!</div>
          <div style={{ color: '#888', fontSize: 14, marginTop: 4 }}>A top team wants you</div>
        </div>

        <div style={{ background: '#111120', borderRadius: 16, padding: 24, borderLeft: `4px solid ${offerTeam?.color ?? '#E0C040'}` }}>
          <div style={{ color: '#888', fontSize: 11, letterSpacing: 1, marginBottom: 4 }}>OFFER FROM</div>
          <div style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold' }}>{transferOffer.teamName}</div>
          <div style={{ color: '#888', fontSize: 13, marginTop: 8 }}>
            Joining gives your car a <span style={{ color: '#39B54A', fontWeight: 'bold' }}>+{transferOffer.carRatingBonus} rating boost</span>, access to a Championship-calibre machine.
          </div>
          <div style={{ color: '#555', fontSize: 12, marginTop: 8 }}>
            Note: You'll lose your current car development investment but carry over your skills.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={() => { acceptTransferOffer(); setShowTransfer(false); }}
            style={{
              background: offerTeam?.color ?? '#E0C040', borderRadius: 12, padding: 18,
              border: 'none', color: '#000', fontWeight: 'bold', fontSize: 15, cursor: 'pointer',
            }}
          >
            Accept & Join {transferOffer.teamName.split(' ')[0]}
          </button>
          <button
            onClick={() => setShowTransfer(false)}
            style={{
              background: 'none', borderRadius: 12, padding: 16,
              border: '1px solid #333', color: '#888', fontSize: 14, cursor: 'pointer',
            }}
          >
            Stay at current team
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, paddingBottom: 60, background: '#0a0a0f', minHeight: '100%' }}>
      {/* Season header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 48 }}>{isChampion ? '👑' : '🏁'}</div>
        <div style={{ color: '#FFF', fontSize: 26, fontWeight: 'bold', marginTop: 8 }}>
          {year} Season Complete
        </div>
        {isChampion && (
          <div style={{ color: '#E0C040', fontSize: 15, fontWeight: 'bold', marginTop: 4 }}>
            WORLD CHAMPION — {playerName}
          </div>
        )}
      </div>

      {/* Driver championship result */}
      <div style={{ background: '#111120', borderRadius: 16, padding: 18, marginBottom: 16, borderLeft: `4px solid ${teamColor}` }}>
        <div style={{ color: '#888', fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>DRIVERS' CHAMPIONSHIP</div>
        {driverStandings.slice(0, 5).map((ds, i) => {
          const d = getDriver(ds.driverId);
          const t = d ? getTeam(d.teamId) : null;
          return (
            <div key={ds.driverId} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
              background: d?.isUser ? '#1a1a08' : 'transparent', borderRadius: d?.isUser ? 8 : 0, marginInline: d?.isUser ? -4 : 0, paddingInline: d?.isUser ? 4 : 0,
            }}>
              <span style={{ color: i === 0 ? '#E0C040' : '#888', width: 28, fontWeight: 'bold', fontSize: 14 }}>{i + 1}</span>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: t?.color ?? '#888' }} />
              <span style={{ flex: 1, color: d?.isUser ? '#E0C040' : '#FFF', fontWeight: d?.isUser ? 'bold' : 'normal', fontSize: 14 }}>
                {d?.shortName ?? ds.driverId}{d?.isUser ? ' ★' : ''}
              </span>
              <span style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>{ds.points}</span>
            </div>
          );
        })}
      </div>

      {/* Personal awards */}
      <div style={{ background: '#111120', borderRadius: 16, padding: 18, marginBottom: 16 }}>
        <div style={{ color: '#888', fontSize: 11, letterSpacing: 2, marginBottom: 12 }}>YOUR SEASON AWARDS</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {[
            { label: 'Wins', value: userStanding?.wins ?? 0, icon: '🏆', color: '#E0C040' },
            { label: 'Podiums', value: userStanding?.podiums ?? 0, icon: '🥂', color: '#FF8800' },
            { label: 'Points', value: userStanding?.points ?? 0, icon: '📊', color: '#39B54A' },
            { label: 'Fastest Laps', value: userStanding?.fastestLaps ?? 0, icon: '💜', color: '#CC00FF' },
            { label: 'Poles', value: personalBests.totalPoles, icon: '⚡', color: '#0090FF' },
            { label: 'Best Result', value: userStanding?.bestResult !== 99 ? `P${userStanding?.bestResult}` : '—', icon: '🏁', color: '#FFF' },
            { label: 'Pts Streak', value: personalBests.longestPointsStreak, icon: '🔥', color: '#FF4444' },
            { label: 'Championship', value: `P${userStanding?.position ?? '?'}`, icon: '🎖', color: teamColor },
          ].map((stat) => (
            <div key={stat.label} style={{ background: '#1a1a2a', borderRadius: 10, padding: '10px 14px', minWidth: 80, textAlign: 'center' }}>
              <div style={{ fontSize: 18 }}>{stat.icon}</div>
              <div style={{ color: stat.color, fontWeight: 'bold', fontSize: 16, marginTop: 4 }}>{stat.value}</div>
              <div style={{ color: '#666', fontSize: 10, marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements unlocked this season */}
      {newlyUnlocked.length > 0 && (
        <div style={{ background: '#111120', borderRadius: 16, padding: 18, marginBottom: 16 }}>
          <div style={{ color: '#E0C040', fontSize: 11, letterSpacing: 2, marginBottom: 12 }}>🏅 ACHIEVEMENTS UNLOCKED</div>
          {newlyUnlocked.map((a) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 24 }}>{a.icon}</span>
              <div>
                <div style={{ color: '#E0C040', fontWeight: 'bold', fontSize: 14 }}>{a.name}</div>
                <div style={{ color: '#888', fontSize: 12 }}>{a.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Constructor standings */}
      <div style={{ background: '#111120', borderRadius: 16, padding: 18, marginBottom: 24 }}>
        <div style={{ color: '#888', fontSize: 11, letterSpacing: 2, marginBottom: 12 }}>CONSTRUCTORS' CHAMPIONSHIP</div>
        {constructorStandings.slice(0, 5).map((cs, i) => {
          const t = getTeam(cs.teamId);
          return (
            <div key={cs.teamId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
              <span style={{ color: '#888', width: 24, fontSize: 13 }}>{i + 1}</span>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: t?.color ?? '#888' }} />
              <span style={{ flex: 1, color: '#CCC', fontSize: 13 }}>{t?.shortName ?? cs.teamId}</span>
              <span style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13 }}>{cs.points}</span>
            </div>
          );
        })}
      </div>

      {/* Start new season button */}
      <button
        onClick={() => transferOffer ? setShowTransfer(true) : handleStartNewSeason()}
        style={{
          background: '#E0C040', borderRadius: 12, padding: 20, width: '100%',
          border: 'none', color: '#000', fontWeight: 'bold', fontSize: 16, cursor: 'pointer',
        }}
      >
        {transferOffer ? 'View Transfer Offer →' : 'Start Season 2 →'}
      </button>
    </div>
  );
}
