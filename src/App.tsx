import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { useGameStore } from './store/gameStore';

import OnboardingScreen from './screens/OnboardingScreen';
import HomeScreen from './screens/HomeScreen';
import CalendarScreen from './screens/CalendarScreen';
import StandingsScreen from './screens/StandingsScreen';
import GarageScreen from './screens/GarageScreen';
import RaceWeekendScreen from './screens/RaceWeekendScreen';
import PracticeScreen from './screens/PracticeScreen';
import QualifyingScreen from './screens/QualifyingScreen';
import RaceScreen from './screens/RaceScreen';
import SprintScreen from './screens/SprintScreen';
import SeasonEndScreen from './screens/SeasonEndScreen';
import RaceHistoryScreen from './screens/RaceHistoryScreen';

const TAB_ROUTES = [
  { path: '/home', label: 'Season', icon: '🏠' },
  { path: '/calendar', label: 'Calendar', icon: '📅' },
  { path: '/standings', label: 'Standings', icon: '🏆' },
  { path: '/garage', label: 'Garage', icon: '🔧' },
];

function TabBar() {
  const location = useLocation();
  const isTabScreen = TAB_ROUTES.some((t) => location.pathname === t.path);
  if (!isTabScreen) return null;

  return (
    <nav className="tab-bar">
      {TAB_ROUTES.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function AppInner() {
  const { initialized } = useGameStore();

  if (!initialized) {
    return (
      <div className="app-shell">
        <div className="screen">
          <Routes>
            <Route path="*" element={<OnboardingScreen />} />
          </Routes>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="screen">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomeScreen />} />
          <Route path="/calendar" element={<CalendarScreen />} />
          <Route path="/standings" element={<StandingsScreen />} />
          <Route path="/garage" element={<GarageScreen />} />
          <Route path="/race-weekend/:raceIndex" element={<RaceWeekendScreen />} />
          <Route path="/practice/:raceIndex/:session" element={<PracticeScreen />} />
          <Route path="/qualifying/:raceIndex" element={<QualifyingScreen />} />
          <Route path="/race/:raceIndex" element={<RaceScreen />} />
          <Route path="/sprint/:raceIndex" element={<SprintScreen />} />
          <Route path="/sprint-qualifying/:raceIndex" element={<QualifyingScreen sprint />} />
          <Route path="/season-end" element={<SeasonEndScreen />} />
          <Route path="/history" element={<RaceHistoryScreen />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </div>
      <TabBar />
    </div>
  );
}

export default function App() {
  const { loadGame } = useGameStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGame().finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100vh', background: '#0a0a0f', gap: 16,
      }}>
        <span style={{ fontSize: 48 }}>🏎</span>
        <div style={{
          width: 32, height: 32, border: '3px solid #333',
          borderTopColor: '#E0C040', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
