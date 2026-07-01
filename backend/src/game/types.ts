export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
export type Suit = (typeof SUITS)[number];

export type SuitColor = 'red' | 'black';

const RED_SUITS: ReadonlySet<Suit> = new Set(['hearts', 'diamonds']);

export function suitColor(suit: Suit): SuitColor {
  return RED_SUITS.has(suit) ? 'red' : 'black';
}

/** 2 a legkisebb, 14 (ász) a legnagyobb. */
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export const MIN_RANK: Rank = 2;
export const MAX_RANK: Rank = 14;

export interface Card {
  readonly suit: Suit;
  readonly rank: Rank;
}

export function cardsEqual(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

export function cardKey(card: Card): string {
  return `${card.suit}-${card.rank}`;
}

export function isSuit(value: unknown): value is Suit {
  return typeof value === 'string' && (SUITS as readonly string[]).includes(value);
}

export function isRank(value: unknown): value is Rank {
  return typeof value === 'number' && Number.isInteger(value) && value >= MIN_RANK && value <= MAX_RANK;
}

export function rankLabel(rank: Rank): string {
  switch (rank) {
    case 11:
      return 'J';
    case 12:
      return 'Q';
    case 13:
      return 'K';
    case 14:
      return 'A';
    default:
      return String(rank);
  }
}
