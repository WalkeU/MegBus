import { Card, Suit, SuitColor, suitColor } from './types';

export type BiggerSmallerGuess = 'bigger' | 'smaller';
export type BetweenOutsideGuess = 'between' | 'outside';

export class EqualRankError extends Error {
  constructor() {
    super('Egyenlő értékű lapokra nem értelmezhető a nagyobb/kisebb vagy közte/kívül tipp.');
    this.name = 'EqualRankError';
  }
}

/** 1. kör — Piros vagy fekete? */
export function evaluateRedBlack(card: Card, guess: SuitColor): boolean {
  return suitColor(card.suit) === guess;
}

/** 2. kör — Nagyobb vagy kisebb? (previous != current rank-ot a hívó garantálja) */
export function evaluateBiggerSmaller(
  previous: Card,
  current: Card,
  guess: BiggerSmallerGuess,
): boolean {
  if (current.rank === previous.rank) {
    throw new EqualRankError();
  }
  const actual: BiggerSmallerGuess = current.rank > previous.rank ? 'bigger' : 'smaller';
  return actual === guess;
}

/** 3. kör — Közte vagy kívül? (first != second rank-ot a hívó garantálja) */
export function evaluateBetweenOutside(
  first: Card,
  second: Card,
  third: Card,
  guess: BetweenOutsideGuess,
): boolean {
  if (first.rank === second.rank) {
    throw new EqualRankError();
  }
  const low = Math.min(first.rank, second.rank);
  const high = Math.max(first.rank, second.rank);
  const isBetween = third.rank > low && third.rank < high;
  const actual: BetweenOutsideGuess = isBetween ? 'between' : 'outside';
  return actual === guess;
}

/** 4. kör — Milyen szín? */
export function evaluateSuitGuess(card: Card, guess: Suit): boolean {
  return card.suit === guess;
}
