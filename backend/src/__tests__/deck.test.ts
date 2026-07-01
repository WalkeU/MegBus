import { createShuffledDeck, Deck, EmptyDeckError, shuffle } from '../game/deck';
import { cardKey, MAX_RANK, MIN_RANK } from '../game/types';

describe('createShuffledDeck', () => {
  it('52 egyedi lapot ad vissza', () => {
    const deck = createShuffledDeck();
    expect(deck).toHaveLength(52);
    const uniqueKeys = new Set(deck.map(cardKey));
    expect(uniqueKeys.size).toBe(52);
  });

  it('minden rangot (2-Ász) és mind a négy színt tartalmazza', () => {
    const deck = createShuffledDeck();
    const ranks = new Set(deck.map((c) => c.rank));
    for (let r = MIN_RANK; r <= MAX_RANK; r++) {
      expect(ranks.has(r as never)).toBe(true);
    }
    const suits = new Set(deck.map((c) => c.suit));
    expect(suits.size).toBe(4);
  });
});

describe('shuffle', () => {
  it('nem mutálja az eredeti tömböt, és permutációt ad vissza', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input, () => 0.999);
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect(result).toHaveLength(input.length);
    expect([...result].sort()).toEqual([...input].sort());
  });
});

describe('Deck', () => {
  it('draw() 52-szer hívható, utána EmptyDeckError-t dob', () => {
    const deck = new Deck();
    for (let i = 0; i < 52; i++) {
      expect(deck.remaining).toBe(52 - i);
      deck.draw();
    }
    expect(deck.remaining).toBe(0);
    expect(() => deck.draw()).toThrow(EmptyDeckError);
  });

  it('drawExcludingRanks() soha nem ad vissza tiltott rangú lapot', () => {
    const deck = new Deck();
    const excluded = new Set([5, 9, 14] as const);
    for (let i = 0; i < 20; i++) {
      const c = deck.drawExcludingRanks(excluded);
      expect(excluded.has(c.rank as never)).toBe(false);
    }
  });

  it('drawExcludingRanks() EmptyDeckError-t dob, ha minden rang tiltott', () => {
    const deck = new Deck();
    const allRanks = new Set<number>();
    for (let r = MIN_RANK; r <= MAX_RANK; r++) allRanks.add(r);
    expect(() => deck.drawExcludingRanks(allRanks as never)).toThrow(EmptyDeckError);
  });
});
