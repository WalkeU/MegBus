import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography } from './src/theme/theme';
import { checkServerHealth } from './src/services/health';
import { useGameStore } from './src/store/gameStore';
import { HomeScreen } from './src/screens/HomeScreen';
import { LobbyScreen } from './src/screens/LobbyScreen';
import { RoundScreen } from './src/screens/RoundScreen';
import { PyramidScreen } from './src/screens/PyramidScreen';
import { BusScreen } from './src/screens/BusScreen';
import { GameOverScreen } from './src/screens/GameOverScreen';
import { MaintenanceScreen } from './src/screens/MaintenanceScreen';
import type { Screen } from './src/store/gameStore';

// Amíg nem tudjuk, elérhető-e a szerver, ne mutassuk a Home képernyőt — helyette
// egy semleges "ellenőrzés" felület, majd a healthcheck eredménye dönti el, hogy
// a normál appot vagy a karbantartás-képernyőt látja a felhasználó.
const RETRY_INTERVAL_MS = 10000;

function ScreenSwitch({ screen }: { screen: Screen }) {
  switch (screen) {
    case 'home':
      return <HomeScreen />;
    case 'lobby':
      return <LobbyScreen />;
    case 'round':
      return <RoundScreen />;
    case 'pyramid':
      return <PyramidScreen />;
    case 'bus':
      return <BusScreen />;
    case 'gameOver':
      return <GameOverScreen />;
  }
}

function CheckingScreen() {
  return (
    <View style={styles.checking}>
      <Text style={styles.checkingTitle}>MegBus</Text>
    </View>
  );
}

export default function App() {
  const [serverStatus, setServerStatus] = useState<'checking' | 'ready' | 'unreachable'>(
    'checking',
  );
  const screen = useGameStore((s) => s.screen);
  const errorMessage = useGameStore((s) => s.errorMessage);
  const clearError = useGameStore((s) => s.clearError);
  const opacity = useRef(new Animated.Value(1)).current;

  const runHealthCheck = useCallback(async () => {
    const healthy = await checkServerHealth();
    setServerStatus(healthy ? 'ready' : 'unreachable');
  }, []);

  useEffect(() => {
    void runHealthCheck();
  }, [runHealthCheck]);

  // Amíg nem elérhető, a háttérben magától is újrapróbálja — ha időközben
  // visszaáll a szerver, a felhasználónak nem kell manuálisan újraindítania az appot.
  useEffect(() => {
    if (serverStatus !== 'unreachable') return;
    const timer = setInterval(() => {
      void runHealthCheck();
    }, RETRY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [serverStatus, runHealthCheck]);

  const handleManualRetry = useCallback(() => {
    setServerStatus('checking');
    void runHealthCheck();
  }, [runHealthCheck]);

  useEffect(() => {
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [screen, serverStatus, opacity]);

  useEffect(() => {
    if (!errorMessage) return;
    Alert.alert('Hiba', errorMessage, [{ text: 'OK', onPress: clearError }]);
  }, [errorMessage, clearError]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'right', 'bottom', 'left']}>
        <StatusBar style="light" />
        <Animated.View style={[styles.flex, { opacity }]}> 
          {serverStatus === 'checking' ? (
            <CheckingScreen />
          ) : serverStatus === 'unreachable' ? (
            <MaintenanceScreen onRetry={handleManualRetry} />
          ) : (
            <ScreenSwitch screen={screen} />
          )}
        </Animated.View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  checking: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkingTitle: {
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
    color: colors.textPrimary,
  },
});
