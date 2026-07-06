import { Card, Rank, Suit, SuitColor } from './types';
import { CardSource } from './deck';
import {
  BetweenOutsideGuess,
  BiggerSmallerGuess,
  YesNoGuess,
  evaluateBetweenOutside,
  evaluateBiggerSmaller,
  evaluateExactRank,
  evaluateRedBlack,
  evaluateSeenBefore,
  evaluateSuitGuess,
} from './rounds';
import { RoundType, minPriorCardsForRoundType } from './roundTypes';

export type RoundGuess = SuitColor | BiggerSmallerGuess | BetweenOutsideGuess | Suit | YesNoGuess | Rank;

/**
 * Megosztott lap-húzási és kiértékelési logika a fő körökhöz ÉS a buszozáshoz —
 * mindkettő ugyanazt a kör-típus-listát futtatja végig, csak más kontextusban.
 * `priorCards`: az adott kör-sorozatban eddig lehúzott lapok, a legutóbbi a végén.
 */
export function drawCardForType(deck: CardSource, type: RoundType, priorCards: readonly Card[]): Card {
  const minPrior = minPriorCardsForRoundType(type);
  if (minPrior === 0) {
    return deck.draw();
  }
  const excludedRanks = new Set(priorCards.slice(-minPrior).map((card) => card.rank));
  return deck.drawExcludingRanks(excludedRanks);
}

export function evaluateForType(
  type: RoundType,
  priorCards: readonly Card[],
  card: Card,
  guess: RoundGuess,
): boolean {
  switch (type) {
    case 'redBlack':
      return evaluateRedBlack(card, guess as SuitColor);
    case 'biggerSmaller':
      return evaluateBiggerSmaller(priorCards[priorCards.length - 1] as Card, card, guess as BiggerSmallerGuess);
    case 'betweenOutside':
      return evaluateBetweenOutside(
        priorCards[priorCards.length - 2] as Card,
        priorCards[priorCards.length - 1] as Card,
        card,
        guess as BetweenOutsideGuess,
      );
    case 'suit':
      return evaluateSuitGuess(card, guess as Suit);
    case 'seenBefore':
      return evaluateSeenBefore(priorCards, card, guess as YesNoGuess);
    case 'exactRank':
      return evaluateExactRank(card, guess as Rank);
  }
}
