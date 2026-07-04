import { useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { CardView } from '../components/CardView';
import { PyramidCountdownRing } from '../components/PyramidCountdownRing';
import { Surface } from '../components/Surface';
import { colors, spacing, typography } from '../theme/theme';
import { cardKey, type Card } from '../types/game';
import { useGameStore } from '../store/gameStore';

// Alulról felfelé fordul: a legalsó sor (5 lap) 1 korty, a csúcs (1 lap) 5 korty —
// pontosan a MegBus/Views/PyramidView.swift `pyramidRowSizes`/`revealIndexRange` mása.
const PYRAMID_ROW_SIZES = [5, 4, 3, 2, 1];
const ROW_VALUES_TOP_TO_BOTTOM = [5, 4, 3, 2, 1];
const PLACEHOLDER_CARD: Card = { suit: 'spades', rank: 2 };

function revealIndexRange(rowValue: number): [number, number] {
  let start = 0;
  for (let i = 0; i < rowValue - 1; i++) start += PYRAMID_ROW_SIZES[i];
  return [start, start + PYRAMID_ROW_SIZES[rowValue - 1]];
}

export function PyramidScreen() {
  const pyramidFlips = useGameStore((s) => s.pyramidFlips);
  const pendingPyramidDrinkUnits = useGameStore((s) => s.pendingPyramidDrinkUnits);
  const myHand = useGameStore((s) => s.myHand);
  const roomState = useGameStore((s) => s.roomState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const isBusy = useGameStore((s) => s.isBusy);
  const beginPyramidMatch = useGameStore((s) => s.beginPyramidMatch);
  const cancelPyramidMatch = useGameStore((s) => s.cancelPyramidMatch);
  const playPyramidMatch = useGameStore((s) => s.playPyramidMatch);
  const acknowledgePyramidDrink = useGameStore((s) => s.acknowledgePyramidDrink);

  const [cardToPlay, setCardToPlay] = useState<Card | null>(null);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [shakingKey, setShakingKey] = useState<string | null>(null);
  const shakeX = useRef(new Animated.Value(0)).current;

  const currentRowValue = pyramidFlips.length > 0 ? pyramidFlips[pyramidFlips.length - 1].rowValue : 1;
  const totalAssigned = Object.values(amounts).reduce((a, b) => a + b, 0);
  const remaining = currentRowValue - totalAssigned;
  const isPyramidFinished = pyramidFlips.length >= 15;
  // A szerver ugyanezen két állapot mentén szünetelteti az automata fordítást
  // (lásd pyramidPauseState.ts) — ez csak közelítő vizuális jelzés ugyanahhoz.
  const isCountdownPaused = pendingPyramidDrinkUnits != null || cardToPlay != null;

  const otherPlayers = (roomState?.players ?? []).filter((p) => p.id !== myPlayerId);

  const setAmount = (playerId: string, newValue: number) => {
    const othersTotal = totalAssigned - (amounts[playerId] ?? 0);
    const clamped = Math.max(0, Math.min(newValue, currentRowValue - othersTotal));
    setAmounts((prev) => {
      const next = { ...prev };
      if (clamped === 0) delete next[playerId];
      else next[playerId] = clamped;
      return next;
    });
  };

  const matchesTopFlip = (card: Card) => {
    if (pyramidFlips.length === 0) return false;
    return pyramidFlips[pyramidFlips.length - 1].card.rank === card.rank;
  };

  const triggerShake = (key: string) => {
    setShakingKey(key);
    shakeX.setValue(0);
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 1, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -1, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 1, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -1, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start(() => setShakingKey(null));
  };

  const handleTap = (card: Card) => {
    if (cardToPlay) return;
    if (!matchesTopFlip(card)) {
      triggerShake(cardKey(card));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setCardToPlay(card);
    void beginPyramidMatch();
  };

  const handleCancel = () => {
    void cancelPyramidMatch();
    setCardToPlay(null);
    setAmounts({});
  };

  const handlePlace = () => {
    if (!cardToPlay) return;
    void playPyramidMatch(cardToPlay, amounts);
    setCardToPlay(null);
    setAmounts({});
  };

  const translateX = shakeX.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Piramis</Text>
      <Text style={styles.helper}>
        Figyeld a lapjaidat — ha egyezik valamelyik a felfordult lappal, koppints rá alul.
      </Text>

      {!isPyramidFinished ? (
        <View style={styles.countdownRow}>
          <PyramidCountdownRing flipCount={pyramidFlips.length} paused={isCountdownPaused} />
        </View>
      ) : null}

      {pendingPyramidDrinkUnits != null ? (
        <Surface style={styles.panel}>
          <Text style={styles.penaltyText}>Igyál {pendingPyramidDrinkUnits} kortyot!</Text>
          <Text style={styles.helperSmall}>
            A piramis addig nem folytatódik, amíg meg nem itta.
          </Text>
          <Button title="Megittam" onPress={() => void acknowledgePyramidDrink()} disabled={isBusy} />
        </Surface>
      ) : null}

      <View style={styles.flexSpacer} />

      <View style={styles.pyramid}>
        {ROW_VALUES_TOP_TO_BOTTOM.map((rowValue) => {
          const [start, end] = revealIndexRange(rowValue);
          const indices = Array.from({ length: end - start }, (_, i) => start + i);
          return (
            <View key={rowValue} style={styles.pyramidRow}>
              {indices.map((revealIndex) => {
                const flip = pyramidFlips.find((f) => f.revealIndex === revealIndex);
                return flip ? (
                  <CardView key={revealIndex} card={flip.card} scale={0.7} />
                ) : (
                  <CardView key={revealIndex} card={PLACEHOLDER_CARD} faceDown scale={0.7} />
                );
              })}
            </View>
          );
        })}
      </View>

      <View style={styles.flexSpacer} />

      {cardToPlay ? (
        <Surface style={styles.panel}>
          <Text style={styles.distributeLabel}>Kinek hány kortyot osztasz?</Text>
          <Text style={[styles.distributedCount, remaining === 0 && styles.distributedDone]}>
            Kiosztva: {totalAssigned} / {currentRowValue} korty
          </Text>
          {otherPlayers.map((player) => {
            const amount = amounts[player.id] ?? 0;
            return (
              <View key={player.id} style={styles.stepperRow}>
                <Text style={styles.stepperName}>{player.name}</Text>
                <View style={styles.flexSpacer} />
                <Pressable
                  onPress={() => setAmount(player.id, amount - 1)}
                  disabled={amount <= 0}
                  style={styles.stepperButton}
                >
                  <Text style={[styles.stepperGlyph, amount <= 0 && styles.stepperDisabled]}>−</Text>
                </Pressable>
                <Text style={styles.stepperCount}>{amount}</Text>
                <Pressable
                  onPress={() => setAmount(player.id, amount + 1)}
                  disabled={remaining <= 0}
                  style={styles.stepperButton}
                >
                  <Text style={[styles.stepperGlyph, remaining <= 0 && styles.stepperDisabled]}>+</Text>
                </Pressable>
              </View>
            );
          })}
          <View style={styles.buttonRow}>
            <View style={styles.buttonHalf}>
              <Button title="Mégsem" onPress={handleCancel} prominent={false} />
            </View>
            <View style={styles.buttonHalf}>
              <Button title="Lerakás" onPress={handlePlace} disabled={remaining !== 0} />
            </View>
          </View>
        </Surface>
      ) : null}

      <View style={styles.handSection}>
        <Text style={styles.handLabel}>A lapjaid — koppints, ha lerakod</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.handRow}
        >
          {myHand.map((card) => {
            const key = cardKey(card);
            const isShaking = shakingKey === key;
            return (
              <Pressable key={key} onPress={() => handleTap(card)} disabled={cardToPlay != null}>
                <Animated.View style={isShaking ? { transform: [{ translateX }] } : undefined}>
                  <CardView card={card} />
                </Animated.View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
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
  countdownRow: {
    alignItems: 'center',
  },
  title: {
    fontSize: typography.screenTitle.fontSize,
    fontWeight: typography.screenTitle.fontWeight,
    color: colors.textPrimary,
  },
  helper: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  helperSmall: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
  },
  panel: {
    gap: 10,
  },
  penaltyText: {
    color: colors.danger,
    fontSize: 20,
    fontWeight: '700',
  },
  pyramid: {
    gap: 8,
    alignItems: 'center',
  },
  pyramidRow: {
    flexDirection: 'row',
    gap: 6,
  },
  distributeLabel: {
    color: colors.textSecondary,
    fontSize: typography.subheadline.fontSize,
  },
  distributedCount: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
  },
  distributedDone: {
    color: colors.success,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  stepperName: {
    color: colors.textPrimary,
    fontSize: 15,
  },
  stepperButton: {
    padding: 4,
  },
  stepperGlyph: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '700',
  },
  stepperDisabled: {
    color: colors.textSecondary,
  },
  stepperCount: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonHalf: {
    flex: 1,
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
