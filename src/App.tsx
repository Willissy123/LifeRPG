import { useEffect } from 'react';
import { useGameStore } from './store/useGameStore';
import NavBar from './components/NavBar';
import Dashboard from './components/Dashboard';
import TaskPanel from './components/TaskPanel';
import CharacterSheet from './components/CharacterSheet';
import ArmyPanel from './components/ArmyPanel';
import CampaignMap from './components/CampaignMap';
import BattleScreen from './components/BattleScreen';

export default function App() {
  const { screen, checkDailyReset } = useGameStore();

  useEffect(() => {
    checkDailyReset();
    // Check for daily reset every minute
    const interval = setInterval(checkDailyReset, 60_000);
    return () => clearInterval(interval);
  }, [checkDailyReset]);

  return (
    <div style={{ minHeight: '100vh', background: '#1a0f0a', color: '#f5e6c8' }}>
      {screen !== 'battle' && <NavBar />}
      <main style={{ paddingTop: screen === 'battle' ? 0 : '56px' }}>
        {screen === 'dashboard' && <Dashboard />}
        {screen === 'tasks' && <TaskPanel />}
        {screen === 'character' && <CharacterSheet />}
        {screen === 'army' && <ArmyPanel />}
        {screen === 'campaign' && <CampaignMap />}
        {screen === 'battle' && <BattleScreen />}
      </main>
    </div>
  );
}
