import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, type GestureResponderEvent } from 'react-native';
import { colors, radii, typography } from '../theme/theme';

interface ButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  prominent?: boolean;
  disabled?: boolean;
  destructive?: boolean;
}

export function Button({ title, onPress, prominent = true, disabled, destructive }: ButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const animateTo = (toValue: number) => {
    Animated.parallel([
      Animated.timing(scale, { toValue, duration: 120, useNativeDriver: true }),
      Animated.timing(opacity, {
        toValue: toValue === 1 ? 1 : 0.7,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const backgroundColor = disabled
    ? colors.surfaceElevated
    : prominent
      ? colors.accent
      : colors.surfaceElevated;
  const textColor = disabled
    ? colors.textSecondary
    : destructive
      ? colors.danger
      : prominent
        ? '#000000'
        : colors.textPrimary;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={() => !disabled && animateTo(0.98)}
      onPressOut={() => !disabled && animateTo(1)}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.base,
          { backgroundColor, transform: [{ scale }], opacity },
        ]}
      >
        <Text style={[styles.label, { color: textColor }]}>{title}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: typography.headline.fontSize,
    fontWeight: typography.headline.fontWeight,
  },
});
