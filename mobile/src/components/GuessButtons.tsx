import { StyleSheet, View } from 'react-native';
import { Button } from './Button';
import { rankLabel, suitDisplayNames, suitSymbols } from '../utils/cardLabels';
import { SUITS, type Rank, type RoundGuess, type RoundType } from '../types/game';

const EXACT_RANKS: readonly Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

interface GuessButtonsProps {
  type: RoundType;
  onGuess: (guess: RoundGuess) => void;
  disabled: boolean;
}

/** Kör-típustól függő tippgomb-készlet — a Round és a Bus képernyő is ezt használja,
 * hogy a testre szabott kör-lista bármelyik típusnál ugyanúgy nézzen ki. */
export function GuessButtons({ type, onGuess, disabled }: GuessButtonsProps) {
  if (type === 'redBlack') {
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
  if (type === 'biggerSmaller') {
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
  if (type === 'betweenOutside') {
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
  if (type === 'seenBefore') {
    return (
      <View style={styles.buttonRow}>
        <View style={styles.buttonHalf}>
          <Button title="Nem" onPress={() => onGuess('no')} disabled={disabled} />
        </View>
        <View style={styles.buttonHalf}>
          <Button title="Igen" onPress={() => onGuess('yes')} disabled={disabled} />
        </View>
      </View>
    );
  }
  if (type === 'exactRank') {
    return (
      <View style={styles.rankGrid}>
        {EXACT_RANKS.map((rank) => (
          <View key={rank} style={styles.rankCell}>
            <Button title={rankLabel(rank)} onPress={() => onGuess(rank)} prominent={false} disabled={disabled} />
          </View>
        ))}
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
  rankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rankCell: {
    width: '22%',
  },
});
