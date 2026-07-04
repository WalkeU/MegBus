import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/theme';
import type { RoomPlayer } from '../types/game';

interface PlayerBadgeProps {
  player: RoomPlayer;
  isActive?: boolean;
}

export function PlayerBadge({ player, isActive = false }: PlayerBadgeProps) {
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isActive ? 'rgba(102,191,255,0.18)' : colors.surfaceElevated,
          borderWidth: isActive ? 1.5 : 0,
          borderColor: colors.accent,
        },
      ]}
    >
      <View
        style={[
          styles.dot,
          { backgroundColor: player.connected ? colors.success : colors.danger },
        ]}
      />
      <Text
        style={[
          styles.name,
          { fontWeight: isActive ? '700' : '400' },
        ]}
      >
        {player.name}
      </Text>
      <View style={styles.spacer} />
      {player.ready ? <Text style={styles.check}>✓</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  name: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  spacer: {
    flex: 1,
  },
  check: {
    color: colors.success,
    fontSize: 16,
    fontWeight: '700',
  },
});
