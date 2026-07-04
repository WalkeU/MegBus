import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 44;
const STROKE_WIDTH = 4;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface PyramidCountdownRingProps {
  /** A jelenlegi flip-ek száma — minden növekedésre újraindul a kör. */
  flipCount: number;
  /** Amíg igaz (nyugtázásra vár valami), a kör megáll az aktuális állásban. */
  paused: boolean;
  intervalMs?: number;
}

// Vizuális becslés a szerver 5mp-es automata piramis-fordítási ütemére — a szerver
// az egyetlen tényleges időzítő, ez csak közelítő visszajelzés a felhasználónak.
export function PyramidCountdownRing({
  flipCount,
  paused,
  intervalMs = 5000,
}: PyramidCountdownRingProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (paused) return;
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: intervalMs,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [flipCount, paused, intervalMs, progress]);

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SIZE}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={colors.surfaceElevated}
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={colors.accent}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${SIZE / 2}, ${SIZE / 2}`}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
