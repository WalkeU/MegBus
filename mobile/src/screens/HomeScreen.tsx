import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '../components/Button';
import { colors, radii, spacing, typography } from '../theme/theme';
import { useGameStore } from '../store/gameStore';

type Mode = 'create' | 'join';

export function HomeScreen() {
  const [mode, setMode] = useState<Mode>('create');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const createRoom = useGameStore((s) => s.createRoom);
  const joinRoom = useGameStore((s) => s.joinRoom);
  const isBusy = useGameStore((s) => s.isBusy);
  const errorMessage = useGameStore((s) => s.errorMessage);

  const trimmedName = playerName.trim();
  const canSubmit = trimmedName.length > 0 && !isBusy && (mode === 'create' || roomCode.trim().length > 0);

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (mode === 'create') {
      void createRoom(trimmedName);
    } else {
      void joinRoom(roomCode.trim().toUpperCase(), trimmedName);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <View style={styles.spacer} />
        <View style={styles.titleBlock}>
          <Text style={styles.title}>MegBus</Text>
          <Text style={styles.subtitle}>
            Buszozás — valós időben, közös eszköz nélkül
          </Text>
        </View>

        <View style={styles.segmented}>
          <SegmentButton
            label="Szoba létrehozása"
            active={mode === 'create'}
            onPress={() => setMode('create')}
          />
          <SegmentButton
            label="Csatlakozás"
            active={mode === 'join'}
            onPress={() => setMode('join')}
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="A neved"
          placeholderTextColor={colors.textSecondary}
          value={playerName}
          onChangeText={setPlayerName}
          autoCorrect={false}
        />

        {mode === 'join' ? (
          <TextInput
            style={styles.input}
            placeholder="Szobakód (pl. AB12CD)"
            placeholderTextColor={colors.textSecondary}
            value={roomCode}
            onChangeText={setRoomCode}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        ) : null}

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <Button
          title={mode === 'create' ? 'Szoba létrehozása' : 'Csatlakozás'}
          onPress={handleSubmit}
          disabled={!canSubmit}
        />

        <View style={styles.spacer} />
        <View style={styles.spacer} />
      </View>
    </KeyboardAvoidingView>
  );
}

function SegmentButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.segment, active && styles.segmentActive]}
      onPress={onPress}
    >
      <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    padding: 24,
    gap: spacing,
  },
  spacer: { flex: 1 },
  titleBlock: {
    alignItems: 'center',
    gap: 4,
    paddingBottom: 16,
  },
  title: {
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.subheadline.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.control,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.control - 4,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.surfaceElevated,
  },
  segmentLabel: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  segmentLabelActive: {
    color: colors.textPrimary,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.control,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: 16,
  },
  error: {
    color: colors.danger,
    fontSize: typography.footnote.fontSize,
  },
});
