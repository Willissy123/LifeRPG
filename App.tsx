import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator } from 'react-native';

import { RootStackParamList, MainTabParamList } from './src/types';
import { useGameStore } from './src/store/gameStore';

import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import StandingsScreen from './src/screens/StandingsScreen';
import GarageScreen from './src/screens/GarageScreen';
import RaceWeekendScreen from './src/screens/RaceWeekendScreen';
import PracticeScreen from './src/screens/PracticeScreen';
import QualifyingScreen from './src/screens/QualifyingScreen';
import RaceScreen from './src/screens/RaceScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const F1_DARK = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: '#E0C040',
    background: '#0a0a0f',
    card: '#111120',
    text: '#FFFFFF',
    border: '#222',
    notification: '#E0C040',
  },
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '🏠',
    Calendar: '📅',
    Standings: '🏆',
    Garage: '🔧',
  };
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>
      {icons[name] ?? '?'}
    </Text>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarStyle: { backgroundColor: '#0d0d18', borderTopColor: '#1a1a2a' },
        tabBarActiveTintColor: '#E0C040',
        tabBarInactiveTintColor: '#444',
        tabBarLabelStyle: { fontSize: 10, fontWeight: 'bold' },
        headerStyle: { backgroundColor: '#0d0d18' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Season' }} />
      <Tab.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Calendar' }} />
      <Tab.Screen name="Standings" component={StandingsScreen} options={{ title: 'Standings' }} />
      <Tab.Screen name="Garage" component={GarageScreen} options={{ title: 'Garage' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const { initialized, loadGame } = useGameStore();
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    loadGame().finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0f', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 48 }}>🏎</Text>
        <ActivityIndicator color="#E0C040" style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={F1_DARK}>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#0d0d18' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: '#0a0a0f' },
        }}
      >
        {!initialized ? (
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Main"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="RaceWeekend"
              component={RaceWeekendScreen}
              options={{ title: 'Race Weekend' }}
            />
            <Stack.Screen
              name="Practice"
              component={PracticeScreen}
              options={({ route }) => ({ title: route.params.session })}
            />
            <Stack.Screen
              name="Qualifying"
              component={QualifyingScreen}
              options={{ title: 'Qualifying' }}
            />
            <Stack.Screen
              name="Race"
              component={RaceScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Garage"
              component={GarageScreen}
              options={{ title: 'Garage & Development' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
