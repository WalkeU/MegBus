import { Card } from './types';
import { CardSource } from './deck';

export const PYRAMID_ROW_SIZES = [5, 4, 3, 2, 1] as const;
export const PYRAMID_SIZE = PYRAMID_ROW_SIZES.reduce((sum, n) => sum + n, 0);

export interface PyramidSlot {
  /** 0-tól induló, alulról felfelé haladó felfordítási sorrend. */
  readonly revealIndex: number;
  /** A sor korty-értéke: alsó sor = 1, ..., csúcs = 5. */
  readonly rowValue: 1 | 2 | 3 | 4 | 5;
  readonly card: Card;
}

/** Lehúz 15 lapot a paklitól, és sorba rendezi őket alulról felfelé (1-5 értékű sorok). */
export function buildPyramid(deck: CardSource): PyramidSlot[] {
  const slots: PyramidSlot[] = [];
  let revealIndex = 0;
  PYRAMID_ROW_SIZES.forEach((rowSize, rowOffset) => {
    const rowValue = (rowOffset + 1) as PyramidSlot['rowValue'];
    for (let i = 0; i < rowSize; i++) {
      slots.push({ revealIndex, rowValue, card: deck.draw() });
      revealIndex++;
    }
  });
  return slots;
}

/** A játékos kezében lévő lapok közül azok, amik értéke megegyezik a felfordult lappal. */
export function findMatchingCards(flippedCard: Card, hand: readonly Card[]): Card[] {
  return hand.filter((card) => card.rank === flippedCard.rank);
}
