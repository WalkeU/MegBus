import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../components/Button';
import { PlayerBadge } from '../components/PlayerBadge';
import { Surface } from '../components/Surface';
import { colors, radii, spacing, typography } from '../theme/theme';
import { useGameStore, selectIsHost, selectPenaltyLabel } from '../store/gameStore';
import { GameSettingsScreen } from './GameSettingsScreen';

export function LobbyScreen() {
  const roomState = useGameStore((s) => s.roomState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const setReady = useGameStore((s) => s.setReady);
  const setPenaltyLabel = useGameStore((s) => s.setPenaltyLabel);
  const leaveRoom = useGameStore((s) => s.leaveRoom);
  const isBusy = useGameStore((s) => s.isBusy);
  const isHost = useGameStore(selectIsHost);
  const penaltyLabel = useGameStore(selectPenaltyLabel);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const myself = roomState?.players.find((p) => p.id === myPlayerId);
  const isReady = myself?.ready ?? false;

  const [labelDraft, setLabelDraft] = useState(penaltyLabel);
  const trimmedDraft = labelDraft.trim();
  const canSaveLabel = isHost && trimmedDraft.length > 0 && trimmedDraft !== penaltyLabel && !isBusy;

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.label}>Szoba</Text>
        <Text style={styles.roomCode}>{roomState?.code ?? '------'}</Text>
      </View>
      <Text style={styles.helper}>
        Oszd meg a kódot a többiekkel. A játék akkor indul, ha mindenki ready.
      </Text>

      <ScrollView contentContainerStyle={styles.playerList}>
        {roomState?.players.map((player) => (
          <PlayerBadge key={player.id} player={player} />
        ))}
      </ScrollView>

      <Surface style={styles.penaltyPanel}>
        <Text style={styles.helper}>Büntetés neve</Text>
        {isHost ? (
          <>
            <TextInput
              style={styles.input}
              value={labelDraft}
              onChangeText={setLabelDraft}
              placeholder={penaltyLabel}
              placeholderTextColor={colors.textSecondary}
              maxLength={40}
              autoCorrect={false}
            />
            <Button
              title="Mentés"
              onPress={() => void setPenaltyLabel(trimmedDraft)}
              prominent={false}
              disabled={!canSaveLabel}
            />
          </>
        ) : (
          <Text style={styles.penaltyValue}>{penaltyLabel}</Text>
        )}
      </Surface>

      {isHost ? (
        <Button title="Játékbeállítások" onPress={() => setSettingsOpen(true)} prominent={false} />
      ) : null}

      <View style={styles.flexSpacer} />

      <Button
        title={isReady ? 'Mégsem vagyok kész' : 'Ready'}
        onPress={() => void setReady(!isReady)}
        prominent={!isReady}
        disabled={isBusy}
      />
      <Button
        title="Kilépés"
        onPress={() => void leaveRoom()}
        prominent={false}
        destructive
        disabled={isBusy}
      />

      <GameSettingsScreen visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: spacing,
  },
  flexSpacer: { flex: 1 },
  label: {
    fontSize: typography.subheadline.fontSize,
    color: colors.textSecondary,
  },
  roomCode: {
    fontSize: typography.roomCode.fontSize,
    fontWeight: typography.roomCode.fontWeight,
    color: colors.accent,
    letterSpacing: 2,
  },
  helper: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
  },
  penaltyPanel: {
    gap: 10,
  },
  penaltyValue: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.control,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 16,
  },
  playerList: {
    gap: 10,
  },
});
