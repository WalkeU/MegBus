import { Card, Rank } from '../game/types';
import { CardSource, EmptyDeckError } from '../game/deck';

/** Determinisztikus, előre megadott lapsorrendet kiszolgáló CardSource teszteléshez. */
export class FixedCardSource implements CardSource {
  private cards: Card[];

  constructor(cards: readonly Card[]) {
    this.cards = [...cards];
  }

  get remaining(): number {
    return this.cards.length;
  }

  draw(): Card {
    const card = this.cards.shift();
    if (!card) throw new EmptyDeckError();
    return card;
  }

  drawExcludingRanks(excludedRanks: ReadonlySet<Rank>): Card {
    const index = this.cards.findIndex((card) => !excludedRanks.has(card.rank));
    if (index === -1) throw new EmptyDeckError();
    const [card] = this.cards.splice(index, 1);
    return card as Card;
  }
}

export function card(rank: Rank, suit: Card['suit'] = 'spades'): Card {
  return { suit, rank };
}
