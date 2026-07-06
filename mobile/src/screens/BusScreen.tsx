import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CardView } from '../components/CardView';
import { GuessButtons } from '../components/GuessButtons';
import { colors, spacing, typography } from '../theme/theme';
import { roundTypeTitles } from '../utils/roundTypeDisplay';
import { useGameStore, selectCurrentBusQuestion, selectIsBusRider } from '../store/gameStore';
import type { BusGuess } from '../types/game';

const DUMMY_FACE_DOWN_CARD = { suit: 'spades', rank: 2 } as const;

export function BusScreen() {
  const roomState = useGameStore((s) => s.roomState);
  const busRiderId = useGameStore((s) => s.busRiderId);
  const busAttemptCards = useGameStore((s) => s.busAttemptCards);
  const busLastResult = useGameStore((s) => s.busLastResult);
  const busDeckRemaining = useGameStore((s) => s.busDeckRemaining);
  const isBusRider = useGameStore(selectIsBusRider);
  const currentQuestion = useGameStore(selectCurrentBusQuestion);
  const isBusy = useGameStore((s) => s.isBusy);
  const answerBus = useGameStore((s) => s.answerBus);

  const riderName = roomState?.players.find((p) => p.id === busRiderId)?.name ?? '…';

  const guess = (value: BusGuess) => {
    if (isBusy) return;
    void answerBus(value);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Buszozás</Text>

      <View style={styles.riderBlock}>
        <Text style={styles.riderLabel}>A buszon ül:</Text>
        <Text style={styles.riderName}>{riderName}</Text>
      </View>

      <View style={styles.flexSpacer} />

      {isBusRider ? (
        <View style={styles.riderInfo}>
          {busDeckRemaining != null ? (
            <Text style={styles.helper}>Hátralévő lapok a pakliban: {busDeckRemaining}</Text>
          ) : null}
          {busAttemptCards.length > 0 ? (
            <View style={styles.attemptBlock}>
              <Text style={styles.helper}>Eddig ebben a próbálkozásban</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cardRow}
              >
                {busAttemptCards.map((card, index) => (
                  <CardView key={`${card.suit}-${card.rank}-${index}`} card={card} />
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
      ) : null}

      {busLastResult ? (
        <View style={styles.resultBlock}>
          {/* Helyes válasznál a lap már látszik az "eddig ebben a próbálkozásban"
              sorban feljebb — itt újra kirajzolni duplikáció lenne. */}
          {!busLastResult.correct ? <CardView card={busLastResult.card} /> : null}
          <Text style={busLastResult.correct ? styles.correct : styles.incorrect}>
            {busLastResult.correct ? 'Helyes — következő kérdés' : 'Hibás — elölről kezdi'}
          </Text>
        </View>
      ) : (
        <CardView card={DUMMY_FACE_DOWN_CARD} faceDown />
      )}

      <View style={styles.flexSpacer} />

      {isBusRider ? (
        <View style={styles.questionBlock}>
          <Text style={styles.questionTitle}>{roundTypeTitles[currentQuestion]}</Text>
          <GuessButtons type={currentQuestion} onGuess={guess} disabled={isBusy} />
        </View>
      ) : (
        <Text style={styles.spectator}>
          Figyeld, ahogy {riderName} végigmegy a kérdéseken.
        </Text>
      )}
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
  title: {
    fontSize: typography.screenTitle.fontSize,
    fontWeight: typography.screenTitle.fontWeight,
    color: colors.textPrimary,
  },
  riderBlock: {
    alignItems: 'center',
    gap: 4,
    paddingTop: 12,
  },
  riderLabel: {
    fontSize: typography.subheadline.fontSize,
    color: colors.textSecondary,
  },
  riderName: {
    fontSize: typography.riderName.fontSize,
    fontWeight: typography.riderName.fontWeight,
    color: colors.accent,
  },
  riderInfo: {
    gap: 12,
    alignItems: 'center',
  },
  helper: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
  },
  attemptBlock: {
    gap: 8,
    alignItems: 'center',
  },
  cardRow: {
    gap: 8,
  },
  resultBlock: {
    alignItems: 'center',
    gap: 8,
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
  questionBlock: {
    gap: 12,
  },
  questionTitle: {
    fontSize: typography.screenTitle.fontSize,
    fontWeight: typography.screenTitle.fontWeight,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  spectator: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
