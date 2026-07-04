import { StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../theme/theme';
import { isRedSuit, rankLabel, suitSymbols } from '../utils/cardLabels';
import type { Card } from '../types/game';

const BASE_WIDTH = 64;
const BASE_HEIGHT = 92;

interface CardViewProps {
  card: Card;
  faceDown?: boolean;
  scale?: number;
}

export function CardView({ card, faceDown = false, scale = 1 }: CardViewProps) {
  const width = BASE_WIDTH * scale;
  const height = BASE_HEIGHT * scale;

  if (faceDown) {
    return (
      <View
        style={[
          styles.base,
          styles.faceDown,
          { width, height, borderRadius: radii.card * scale },
        ]}
      >
        <Text style={[styles.questionMark, { fontSize: 17 * scale }]}>?</Text>
      </View>
    );
  }

  const textColor = isRedSuit(card.suit) ? colors.cardRed : '#000000';

  return (
    <View
      style={[
        styles.base,
        styles.faceUp,
        { width, height, borderRadius: radii.card * scale },
      ]}
    >
      <Text style={[styles.rank, { color: textColor, fontSize: 17 * scale }]}>
        {rankLabel(card.rank)}
      </Text>
      <Text style={[styles.suit, { color: textColor, fontSize: 20 * scale }]}>
        {suitSymbols[card.suit]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  faceUp: {
    backgroundColor: '#FFFFFF',
    gap: 2,
  },
  faceDown: {
    backgroundColor: colors.surfaceElevated,
  },
  rank: {
    fontWeight: '600',
  },
  suit: {
    fontWeight: '500',
  },
  questionMark: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
