import { buildPyramid, findMatchingCards, PYRAMID_SIZE } from '../game/pyramid';
import { Deck } from '../game/deck';
import { card } from './testUtils';

describe('buildPyramid', () => {
  it('15 lapot húz, és 5-4-3-2-1 elrendezésben 1-5 sorértékeket rendel hozzájuk', () => {
    const deck = new Deck();
    const slots = buildPyramid(deck);

    expect(slots).toHaveLength(PYRAMID_SIZE);
    expect(deck.remaining).toBe(52 - PYRAMID_SIZE);

    const rowCounts = new Map<number, number>();
    slots.forEach((slot) => {
      rowCounts.set(slot.rowValue, (rowCounts.get(slot.rowValue) ?? 0) + 1);
    });
    expect(rowCounts.get(1)).toBe(5);
    expect(rowCounts.get(2)).toBe(4);
    expect(rowCounts.get(3)).toBe(3);
    expect(rowCounts.get(4)).toBe(2);
    expect(rowCounts.get(5)).toBe(1);
  });

  it('a revealIndex 0-tól 14-ig sorban növekszik', () => {
    const slots = buildPyramid(new Deck());
    slots.forEach((slot, i) => expect(slot.revealIndex).toBe(i));
  });
});

describe('findMatchingCards', () => {
  it('csak az egyező rangú lapokat adja vissza, a szín nem számít', () => {
    const hand = [card(7, 'hearts'), card(9, 'clubs'), card(7, 'spades')];
    const matches = findMatchingCards(card(7, 'diamonds'), hand);
    expect(matches).toHaveLength(2);
    expect(matches.every((c) => c.rank === 7)).toBe(true);
  });

  it('üres tömböt ad vissza, ha nincs egyezés', () => {
    const hand = [card(7, 'hearts')];
    expect(findMatchingCards(card(9, 'diamonds'), hand)).toEqual([]);
  });
});
