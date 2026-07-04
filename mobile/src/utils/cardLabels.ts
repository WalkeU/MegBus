import type { Rank, Suit } from '../types/game';

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

export const suitSymbols: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

export const suitDisplayNames: Record<Suit, string> = {
  hearts: 'Kőr',
  diamonds: 'Káró',
  clubs: 'Treff',
  spades: 'Pikk',
};

export function isRedSuit(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}
