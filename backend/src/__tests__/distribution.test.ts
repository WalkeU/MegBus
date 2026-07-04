import { InvalidDistributionError, validateDistribution } from '../game/distribution';

describe('validateDistribution', () => {
  it('elfogadja, ha az összeg pontosan a korty-egységet adja ki', () => {
    expect(() => validateDistribution(3, { A: 2, B: 1 })).not.toThrow();
    expect(() => validateDistribution(3, { A: 3 })).not.toThrow();
    expect(() => validateDistribution(3, { A: 1, B: 1, C: 1 })).not.toThrow();
  });

  it('hibát dob, ha nincs egy címzett sem', () => {
    expect(() => validateDistribution(3, {})).toThrow(InvalidDistributionError);
  });

  it('hibát dob, ha az összeg nem egyezik a korty-egységgel', () => {
    expect(() => validateDistribution(3, { A: 2 })).toThrow(InvalidDistributionError);
    expect(() => validateDistribution(3, { A: 2, B: 2 })).toThrow(InvalidDistributionError);
  });

  it('hibát dob, ha valamelyik érték nem pozitív egész', () => {
    expect(() => validateDistribution(3, { A: 0, B: 3 })).toThrow(InvalidDistributionError);
    expect(() => validateDistribution(3, { A: -1, B: 4 })).toThrow(InvalidDistributionError);
    expect(() => validateDistribution(3, { A: 1.5, B: 1.5 })).toThrow(InvalidDistributionError);
  });
});
