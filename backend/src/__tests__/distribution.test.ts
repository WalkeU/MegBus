import { distributeToPlayers, distributeUnits, InvalidDistributionError } from '../game/distribution';

describe('distributeUnits', () => {
  it('egyenletesen oszt el, ha pontosan osztható', () => {
    expect(distributeUnits(4, 2)).toEqual([2, 2]);
  });

  it('a maradékot az elsők kapják', () => {
    expect(distributeUnits(5, 2)).toEqual([3, 2]);
    expect(distributeUnits(7, 3)).toEqual([3, 2, 2]);
  });

  it('egy címzett az összeset kapja', () => {
    expect(distributeUnits(3, 1)).toEqual([3]);
  });

  it('hibát dob, ha több címzett van, mint egység', () => {
    expect(() => distributeUnits(2, 3)).toThrow(InvalidDistributionError);
  });

  it('hibát dob, ha nincs címzett', () => {
    expect(() => distributeUnits(2, 0)).toThrow(InvalidDistributionError);
  });
});

describe('distributeToPlayers', () => {
  it('játékos azonosítókhoz rendeli a korty-mennyiséget', () => {
    expect(distributeToPlayers(5, ['a', 'b'])).toEqual({ a: 3, b: 2 });
  });

  it('ismétlődő címzett összeadja a mennyiséget', () => {
    expect(distributeToPlayers(4, ['a', 'a'])).toEqual({ a: 4 });
  });
});
