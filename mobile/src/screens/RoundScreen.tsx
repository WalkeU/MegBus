import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { CardView } from '../components/CardView';
import { Surface } from '../components/Surface';
import { colors, spacing, typography } from '../theme/theme';
import { roundTitleForPhase } from '../utils/busQuestions';
import { suitDisplayNames, suitSymbols } from '../utils/cardLabels';
import { useGameStore, selectActivePlayerName, selectIsMyTurn } from '../store/gameStore';
import { SUITS, type GamePhase, type RoundGuess } from '../types/game';

const DUMMY_FACE_DOWN_CARD = { suit: 'spades', rank: 2 } as const;

export function RoundScreen() {
  const phase = useGameStore((s) => (s.roomState?.phase ?? 'round1') as GamePhase) as
    | 'round1'
    | 'round2'
    | 'round3'
    | 'round4';
  const isMyTurn = useGameStore(selectIsMyTurn);
  const activePlayerName = useGameStore(selectActivePlayerName);
  const lastDrawnCard = useGameStore((s) => s.lastDrawnCard);
  const lastGuessCorrect = useGameStore((s) => s.lastGuessCorrect);
  const pendingPenaltyUnits = useGameStore((s) => s.pendingPenaltyUnits);
  const myHand = useGameStore((s) => s.myHand);
  const isBusy = useGameStore((s) => s.isBusy);
  const submitGuess = useGameStore((s) => s.submitGuess);
  const acknowledgePenalty = useGameStore((s) => s.acknowledgePenalty);

  const guess = (value: RoundGuess) => {
    if (isBusy) return;
    void submitGuess(value);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{roundTitleForPhase(phase)}</Text>

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
          <Text style={styles.penaltyText}>Igyál {pendingPenaltyUnits} kortyot!</Text>
          <Button title="Megittam" onPress={() => void acknowledgePenalty()} disabled={isBusy} />
        </Surface>
      ) : isMyTurn ? (
        <GuessButtons phase={phase} onGuess={guess} disabled={isBusy} />
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

function GuessButtons({
  phase,
  onGuess,
  disabled,
}: {
  phase: 'round1' | 'round2' | 'round3' | 'round4';
  onGuess: (guess: RoundGuess) => void;
  disabled: boolean;
}) {
  if (phase === 'round1') {
    return (
      <View style={styles.buttonRow}>
        <View style={styles.buttonHalf}>
          <Button title="Piros" onPress={() => onGuess('red')} disabled={disabled} />
        </View>
        <View style={styles.buttonHalf}>
          <Button title="Fekete" onPress={() => onGuess('black')} disabled={disabled} />
        </View>
      </View>
    );
  }
  if (phase === 'round2') {
    return (
      <View style={styles.buttonRow}>
        <View style={styles.buttonHalf}>
          <Button title="Kisebb" onPress={() => onGuess('smaller')} disabled={disabled} />
        </View>
        <View style={styles.buttonHalf}>
          <Button title="Nagyobb" onPress={() => onGuess('bigger')} disabled={disabled} />
        </View>
      </View>
    );
  }
  if (phase === 'round3') {
    return (
      <View style={styles.buttonRow}>
        <View style={styles.buttonHalf}>
          <Button title="Kívül" onPress={() => onGuess('outside')} disabled={disabled} />
        </View>
        <View style={styles.buttonHalf}>
          <Button title="Közte" onPress={() => onGuess('between')} disabled={disabled} />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.suitColumn}>
      {SUITS.map((suit) => (
        <Button
          key={suit}
          title={`${suitSymbols[suit]} ${suitDisplayNames[suit]}`}
          onPress={() => onGuess(suit)}
          prominent={false}
          disabled={disabled}
        />
      ))}
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
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonHalf: {
    flex: 1,
  },
  suitColumn: {
    gap: 10,
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
