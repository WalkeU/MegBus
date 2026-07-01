import { Card, MAX_RANK, MIN_RANK, Rank, SUITS } from './types';

export type RandomSource = () => number;

export function createShuffledDeck(random: RandomSource = Math.random): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = MIN_RANK; rank <= MAX_RANK; rank++) {
      deck.push({ suit, rank: rank as Rank });
    }
  }
  return shuffle(deck, random);
}

export function shuffle<T>(items: readonly T[], random: RandomSource = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = result[i] as T;
    const b = result[j] as T;
    result[i] = b;
    result[j] = a;
  }
  return result;
}

export class EmptyDeckError extends Error {
  constructor() {
    super('A pakli kifogyott a megkötéseknek megfelelő lapokból.');
    this.name = 'EmptyDeckError';
  }
}

/**
 * A játéklogika (piramis, körök, buszozás) ezen az interfészen keresztül húz
 * lapot, nem a konkrét Deck osztályon — így tesztben egy determinisztikus,
 * előre megadott lapsorrendet visszaadó implementációval is meghajtható.
 */
export interface CardSource {
  draw(): Card;
  drawExcludingRanks(excludedRanks: ReadonlySet<Rank>): Card;
}

/**
 * Egy pakli mutálható lapsora: draw() levesz egy lapot a tetejéről,
 * drawExcludingRanks() pedig olyan lapot ad, aminek értéke nincs a tiltólistán
 * (ez biztosítja, hogy a 2-3. körben sose jöjjön ki egyenlő érték).
 */
export class Deck implements CardSource {
  private cards: Card[];

  constructor(random: RandomSource = Math.random) {
    this.cards = createShuffledDeck(random);
  }

  get remaining(): number {
    return this.cards.length;
  }

  draw(): Card {
    const card = this.cards.pop();
    if (!card) {
      throw new EmptyDeckError();
    }
    return card;
  }

  drawExcludingRanks(excludedRanks: ReadonlySet<Rank>): Card {
    const index = this.cards.findIndex((card) => !excludedRanks.has(card.rank));
    if (index === -1) {
      throw new EmptyDeckError();
    }
    const [card] = this.cards.splice(index, 1);
    return card as Card;
  }
}
