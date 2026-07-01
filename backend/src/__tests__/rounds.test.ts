import {
  EqualRankError,
  evaluateBetweenOutside,
  evaluateBiggerSmaller,
  evaluateRedBlack,
  evaluateSuitGuess,
} from '../game/rounds';
import { card } from './testUtils';

describe('evaluateRedBlack', () => {
  it('piros szín (kőr, káró) piros tippre helyes', () => {
    expect(evaluateRedBlack(card(10, 'hearts'), 'red')).toBe(true);
    expect(evaluateRedBlack(card(10, 'diamonds'), 'red')).toBe(true);
  });

  it('fekete szín (treff, pikk) fekete tippre helyes', () => {
    expect(evaluateRedBlack(card(10, 'clubs'), 'black')).toBe(true);
    expect(evaluateRedBlack(card(10, 'spades'), 'black')).toBe(true);
  });

  it('eltérő tipp helytelen', () => {
    expect(evaluateRedBlack(card(10, 'hearts'), 'black')).toBe(false);
  });
});

describe('evaluateBiggerSmaller', () => {
  it('helyesen ismeri fel a nagyobb tippet', () => {
    expect(evaluateBiggerSmaller(card(5), card(9), 'bigger')).toBe(true);
    expect(evaluateBiggerSmaller(card(5), card(9), 'smaller')).toBe(false);
  });

  it('helyesen ismeri fel a kisebb tippet', () => {
    expect(evaluateBiggerSmaller(card(9), card(5), 'smaller')).toBe(true);
    expect(evaluateBiggerSmaller(card(9), card(5), 'bigger')).toBe(false);
  });

  it('ász (14) a legnagyobb, kettes (2) a legkisebb', () => {
    expect(evaluateBiggerSmaller(card(13), card(14), 'bigger')).toBe(true);
    expect(evaluateBiggerSmaller(card(3), card(2), 'smaller')).toBe(true);
  });

  it('egyenlő rangnál EqualRankError-t dob', () => {
    expect(() => evaluateBiggerSmaller(card(7), card(7), 'bigger')).toThrow(EqualRankError);
  });
});

describe('evaluateBetweenOutside', () => {
  it('az 5 és J (6-10 közte) példa szerint működik', () => {
    // 5 = rank 5, J = rank 11
    expect(evaluateBetweenOutside(card(5), card(11), card(8), 'between')).toBe(true);
    expect(evaluateBetweenOutside(card(5), card(11), card(3), 'outside')).toBe(true);
    expect(evaluateBetweenOutside(card(5), card(11), card(13), 'outside')).toBe(true);
  });

  it('határértékek (5 vagy 11) kívülnek számítanak', () => {
    expect(evaluateBetweenOutside(card(5), card(11), card(5), 'between')).toBe(false);
    expect(evaluateBetweenOutside(card(5), card(11), card(11), 'between')).toBe(false);
  });

  it('a sorrend nem számít (első/második felcserélve ugyanazt adja)', () => {
    expect(evaluateBetweenOutside(card(11), card(5), card(8), 'between')).toBe(true);
  });

  it('egyenlő első két lapnál EqualRankError-t dob', () => {
    expect(() => evaluateBetweenOutside(card(8), card(8), card(5), 'outside')).toThrow(EqualRankError);
  });
});

describe('evaluateSuitGuess', () => {
  it('egyező szín helyes, eltérő helytelen', () => {
    expect(evaluateSuitGuess(card(7, 'clubs'), 'clubs')).toBe(true);
    expect(evaluateSuitGuess(card(7, 'clubs'), 'spades')).toBe(false);
  });
});
