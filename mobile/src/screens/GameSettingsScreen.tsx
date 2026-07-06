import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Surface } from '../components/Surface';
import { colors, radii, spacing, typography } from '../theme/theme';
import { roundTypeShortLabels } from '../utils/roundTypeDisplay';
import { useGameStore, selectGameSettings } from '../store/gameStore';
import {
  GameSettingsError,
  MAX_PYRAMID_FLIP_INTERVAL_MS,
  MAX_ROUNDS,
  MIN_PYRAMID_FLIP_INTERVAL_MS,
  ROUND_TYPES,
  validateGameSettings,
  type GameSettings,
  type RoundDefinition,
  type RoundType,
} from '../types/game';

const PYRAMID_SPEED_STEP_MS = 500;

interface GameSettingsScreenProps {
  visible: boolean;
  onClose: () => void;
}

const ROW_LABELS = ['Alsó sor (5 lap)', '2. sor (4 lap)', '3. sor (3 lap)', '4. sor (2 lap)', 'Csúcs (1 lap)'];

export function GameSettingsScreen({ visible, onClose }: GameSettingsScreenProps) {
  const savedSettings = useGameStore(selectGameSettings);
  const setGameSettings = useGameStore((s) => s.setGameSettings);
  const isBusy = useGameStore((s) => s.isBusy);

  const [rounds, setRounds] = useState<RoundDefinition[]>(() => savedSettings.rounds.map((r) => ({ ...r })));
  const [pyramidRowPenalties, setPyramidRowPenalties] = useState<
    [number, number, number, number, number]
  >(() => [...savedSettings.pyramidRowPenalties] as [number, number, number, number, number]);
  const [pyramidFlipIntervalMs, setPyramidFlipIntervalMs] = useState(savedSettings.pyramidFlipIntervalMs);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetFromSaved = () => {
    setRounds(savedSettings.rounds.map((r) => ({ ...r })));
    setPyramidRowPenalties([...savedSettings.pyramidRowPenalties] as [number, number, number, number, number]);
    setPyramidFlipIntervalMs(savedSettings.pyramidFlipIntervalMs);
    setPickerOpen(false);
    setError(null);
  };

  const handleClose = () => {
    resetFromSaved();
    onClose();
  };

  const moveRound = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rounds.length) return;
    const next = [...rounds];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved as RoundDefinition);
    setRounds(next);
  };

  const removeRound = (index: number) => {
    if (rounds.length <= 1) return;
    setRounds(rounds.filter((_, i) => i !== index));
  };

  const changePenalty = (index: number, delta: number) => {
    setRounds((prev) =>
      prev.map((r, i) => (i === index ? { ...r, penaltyUnits: Math.max(1, r.penaltyUnits + delta) } : r)),
    );
  };

  const addRound = (type: RoundType) => {
    if (rounds.length >= MAX_ROUNDS) return;
    setRounds([...rounds, { type, penaltyUnits: 1 }]);
    setPickerOpen(false);
  };

  const changePyramidPenalty = (index: number, delta: number) => {
    setPyramidRowPenalties((prev) => {
      const next = [...prev] as [number, number, number, number, number];
      next[index] = Math.max(1, next[index] + delta);
      return next;
    });
  };

  const changePyramidSpeed = (delta: number) => {
    setPyramidFlipIntervalMs((prev) =>
      Math.min(MAX_PYRAMID_FLIP_INTERVAL_MS, Math.max(MIN_PYRAMID_FLIP_INTERVAL_MS, prev + delta)),
    );
  };

  const handleSave = () => {
    const settings: GameSettings = { rounds, pyramidRowPenalties, pyramidFlipIntervalMs };
    try {
      validateGameSettings(settings);
    } catch (e) {
      setError(e instanceof GameSettingsError ? e.message : 'Érvénytelen beállítás.');
      return;
    }
    setError(null);
    void setGameSettings(settings);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Játékbeállítások</Text>
          <Text style={styles.helper}>
            Állítsd össze, milyen körök legyenek, milyen sorrendben, és mennyi büntetéssel —
            a buszozás ugyanezt a sorrendet fogja követni.
          </Text>

          <View style={styles.roundList}>
            {rounds.map((round, index) => (
              <Surface key={`${round.type}-${index}`} style={styles.roundRow}>
                <View style={styles.roundRowTop}>
                  <Text style={styles.roundIndex}>{index + 1}.</Text>
                  <Text style={styles.roundLabel} numberOfLines={1}>
                    {roundTypeShortLabels[round.type]}
                  </Text>
                  <Pressable
                    onPress={() => moveRound(index, -1)}
                    disabled={index === 0}
                    style={styles.iconButton}
                  >
                    <Text style={[styles.iconGlyph, index === 0 && styles.iconGlyphDisabled]}>↑</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => moveRound(index, 1)}
                    disabled={index === rounds.length - 1}
                    style={styles.iconButton}
                  >
                    <Text style={[styles.iconGlyph, index === rounds.length - 1 && styles.iconGlyphDisabled]}>
                      ↓
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => removeRound(index)}
                    disabled={rounds.length <= 1}
                    style={styles.iconButton}
                  >
                    <Text
                      style={[
                        styles.iconGlyph,
                        styles.deleteGlyph,
                        rounds.length <= 1 && styles.iconGlyphDisabled,
                      ]}
                    >
                      ✕
                    </Text>
                  </Pressable>
                </View>
                <View style={styles.stepperRow}>
                  <Text style={[styles.stepperLabel, styles.stepperLabelFlex]} numberOfLines={1}>
                    Büntetés
                  </Text>
                  <Pressable onPress={() => changePenalty(index, -1)} style={styles.stepperButton}>
                    <Text style={styles.stepperGlyph}>−</Text>
                  </Pressable>
                  <Text style={styles.stepperCount}>{round.penaltyUnits}</Text>
                  <Pressable onPress={() => changePenalty(index, 1)} style={styles.stepperButton}>
                    <Text style={styles.stepperGlyph}>+</Text>
                  </Pressable>
                </View>
              </Surface>
            ))}
          </View>

          {pickerOpen ? (
            <Surface style={styles.pickerPanel}>
              <Text style={styles.stepperLabel}>Milyen típusú kört adjak hozzá?</Text>
              <View style={styles.pickerGrid}>
                {ROUND_TYPES.map((type) => (
                  <Pressable key={type} onPress={() => addRound(type)} style={styles.pickerChip}>
                    <Text style={styles.pickerChipLabel}>{roundTypeShortLabels[type]}</Text>
                  </Pressable>
                ))}
              </View>
            </Surface>
          ) : (
            <Button
              title="Kör hozzáadása"
              onPress={() => setPickerOpen(true)}
              prominent={false}
              disabled={rounds.length >= MAX_ROUNDS}
            />
          )}

          <Text style={styles.sectionTitle}>Piramis büntetései soronként</Text>
          <View style={styles.roundList}>
            {ROW_LABELS.map((label, index) => (
              <Surface key={label} style={styles.stepperRow}>
                <Text style={[styles.stepperLabel, styles.stepperLabelFlex]} numberOfLines={1}>
                  {label}
                </Text>
                <Pressable onPress={() => changePyramidPenalty(index, -1)} style={styles.stepperButton}>
                  <Text style={styles.stepperGlyph}>−</Text>
                </Pressable>
                <Text style={styles.stepperCount}>{pyramidRowPenalties[index]}</Text>
                <Pressable onPress={() => changePyramidPenalty(index, 1)} style={styles.stepperButton}>
                  <Text style={styles.stepperGlyph}>+</Text>
                </Pressable>
              </Surface>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Piramis fordítási sebessége</Text>
          <Surface style={styles.stepperRow}>
            <Text style={[styles.stepperLabel, styles.stepperLabelFlex]} numberOfLines={1}>
              Másodpercenként
            </Text>
            <Pressable
              onPress={() => changePyramidSpeed(-PYRAMID_SPEED_STEP_MS)}
              disabled={pyramidFlipIntervalMs <= MIN_PYRAMID_FLIP_INTERVAL_MS}
              style={styles.stepperButton}
            >
              <Text
                style={[
                  styles.stepperGlyph,
                  pyramidFlipIntervalMs <= MIN_PYRAMID_FLIP_INTERVAL_MS && styles.iconGlyphDisabled,
                ]}
              >
                −
              </Text>
            </Pressable>
            <Text style={styles.stepperCount}>{(pyramidFlipIntervalMs / 1000).toFixed(1)} mp</Text>
            <Pressable
              onPress={() => changePyramidSpeed(PYRAMID_SPEED_STEP_MS)}
              disabled={pyramidFlipIntervalMs >= MAX_PYRAMID_FLIP_INTERVAL_MS}
              style={styles.stepperButton}
            >
              <Text
                style={[
                  styles.stepperGlyph,
                  pyramidFlipIntervalMs >= MAX_PYRAMID_FLIP_INTERVAL_MS && styles.iconGlyphDisabled,
                ]}
              >
                +
              </Text>
            </Pressable>
          </Surface>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerButton}>
            <Button title="Mégsem" onPress={handleClose} prominent={false} />
          </View>
          <View style={styles.footerButton}>
            <Button title="Mentés" onPress={handleSave} disabled={isBusy} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    gap: spacing,
  },
  title: {
    fontSize: typography.screenTitle.fontSize,
    fontWeight: typography.screenTitle.fontWeight,
    color: colors.textPrimary,
  },
  helper: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: typography.headline.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 8,
  },
  roundList: {
    gap: 10,
  },
  roundRow: {
    gap: 10,
  },
  roundRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roundIndex: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  roundLabel: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  iconButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  iconGlyph: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '700',
  },
  deleteGlyph: {
    color: colors.danger,
  },
  iconGlyphDisabled: {
    color: colors.textSecondary,
    opacity: 0.4,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  stepperLabelFlex: {
    flex: 1,
  },
  stepperButton: {
    padding: 4,
  },
  stepperGlyph: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '700',
  },
  stepperCount: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  pickerPanel: {
    gap: 10,
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.control,
    backgroundColor: colors.surfaceElevated,
  },
  pickerChipLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  error: {
    color: colors.danger,
    fontSize: typography.footnote.fontSize,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    paddingTop: 12,
  },
  footerButton: {
    flex: 1,
  },
});
