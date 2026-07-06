import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { CardView } from '../components/CardView';
import { GuessButtons } from '../components/GuessButtons';
import { Surface } from '../components/Surface';
import { colors, spacing, typography } from '../theme/theme';
import { roundTypeTitles } from '../utils/roundTypeDisplay';
import {
  useGameStore,
  selectActivePlayerName,
  selectCurrentRoundType,
  selectIsMyTurn,
  selectPenaltyLabel,
} from '../store/gameStore';
import type { RoundGuess } from '../types/game';

const DUMMY_FACE_DOWN_CARD = { suit: 'spades', rank: 2 } as const;

export function RoundScreen() {
  const roundType = useGameStore(selectCurrentRoundType);
  const isMyTurn = useGameStore(selectIsMyTurn);
  const activePlayerName = useGameStore(selectActivePlayerName);
  const lastDrawnCard = useGameStore((s) => s.lastDrawnCard);
  const lastGuessCorrect = useGameStore((s) => s.lastGuessCorrect);
  const pendingPenaltyUnits = useGameStore((s) => s.pendingPenaltyUnits);
  const penaltyLabel = useGameStore(selectPenaltyLabel);
  const myHand = useGameStore((s) => s.myHand);
  const isBusy = useGameStore((s) => s.isBusy);
  const submitGuess = useGameStore((s) => s.submitGuess);
  const acknowledgePenalty = useGameStore((s) => s.acknowledgePenalty);

  if (!roundType) return null;

  const guess = (value: RoundGuess) => {
    if (isBusy) return;
    void submitGuess(value);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{roundTypeTitles[roundType]}</Text>

      <Text style={isMyTurn ? styles.turnActive : styles.turnOther}>
        {isMyTurn ? 'Te jössz' : `${activePlayerName ?? '…'} tippel…`}
      </Text>

      <View style={styles.flexSpacer} />

      <View style={styles.cardArea}>
        {lastDrawnCard ? (
          <>
            <CardView card={lastDrawnCard} />
            <Text style={lastGuessCorrect ? styles.correct : styles.incorrect}>
              {lastGuessCorrect ? 'Helyes tipp' : 'Hibás tipp'}
            </Text>
          </>
        ) : (
          <CardView card={DUMMY_FACE_DOWN_CARD} faceDown />
        )}
      </View>

      <View style={styles.flexSpacer} />

      {pendingPenaltyUnits != null ? (
        <Surface style={styles.panel}>
          <Text style={styles.penaltyText}>
            {penaltyLabel}: {pendingPenaltyUnits}
          </Text>
          <Button title="Megvolt" onPress={() => void acknowledgePenalty()} disabled={isBusy} />
        </Surface>
      ) : isMyTurn ? (
        <GuessButtons type={roundType} onGuess={guess} disabled={isBusy} />
      ) : null}

      <View style={styles.handSection}>
        <Text style={styles.handLabel}>A lapjaid</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.handRow}>
          {myHand.map((card, index) => (
            <CardView key={`${card.suit}-${card.rank}-${index}`} card={card} />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 24,
    gap: spacing,
  },
  flexSpacer: { flex: 1 },
  title: {
    fontSize: typography.screenTitle.fontSize,
    fontWeight: typography.screenTitle.fontWeight,
    color: colors.textPrimary,
  },
  turnActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  turnOther: {
    color: colors.textSecondary,
  },
  cardArea: {
    alignItems: 'center',
    gap: 12,
  },
  correct: {
    color: colors.success,
    fontWeight: '700',
    fontSize: 17,
  },
  incorrect: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 17,
  },
  panel: {
    gap: 12,
    alignItems: 'center',
  },
  penaltyText: {
    color: colors.danger,
    fontSize: 20,
    fontWeight: '700',
  },
  handSection: {
    gap: 8,
  },
  handLabel: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
  },
  handRow: {
    gap: 8,
  },
});
