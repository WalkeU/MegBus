import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../theme/theme';

interface SurfaceProps {
  style?: StyleProp<ViewStyle>;
}

export function Surface({ children, style }: PropsWithChildren<SurfaceProps>) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  surface: {
    padding: spacing,
    backgroundColor: colors.surface,
    borderRadius: radii.control,
  },
});
