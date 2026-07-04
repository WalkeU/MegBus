import { PyramidPauseTracker } from '../socket/pyramidPauseState';

describe('PyramidPauseTracker', () => {
  it('üres állapotban nincs szünet', () => {
    const tracker = new PyramidPauseTracker();
    expect(tracker.isPaused('ROOM1')).toBe(false);
  });

  it('markDeciding szünetelteti, releaseDeciding feloldja', () => {
    const tracker = new PyramidPauseTracker();
    tracker.markDeciding('ROOM1', 'A');
    expect(tracker.isPaused('ROOM1')).toBe(true);

    tracker.releaseDeciding('ROOM1', 'A');
    expect(tracker.isPaused('ROOM1')).toBe(false);
  });

  it('több egyidejűleg döntő játékos esetén csak az utolsó feloldás után szűnik a szünet', () => {
    const tracker = new PyramidPauseTracker();
    tracker.markDeciding('ROOM1', 'A');
    tracker.markDeciding('ROOM1', 'B');
    expect(tracker.isPaused('ROOM1')).toBe(true);

    tracker.releaseDeciding('ROOM1', 'A');
    expect(tracker.isPaused('ROOM1')).toBe(true); // B még dönt

    tracker.releaseDeciding('ROOM1', 'B');
    expect(tracker.isPaused('ROOM1')).toBe(false);
  });

  it('markDrinkersPending: minden címzettnek nyugtáznia kell, mielőtt feloldódik a szünet', () => {
    const tracker = new PyramidPauseTracker();
    tracker.markDrinkersPending('ROOM1', ['A', 'B']);
    expect(tracker.isPaused('ROOM1')).toBe(true);

    tracker.releaseDrinker('ROOM1', 'A');
    expect(tracker.isPaused('ROOM1')).toBe(true); // B még nem nyugtázott

    tracker.releaseDrinker('ROOM1', 'B');
    expect(tracker.isPaused('ROOM1')).toBe(false);
  });

  it('a döntés és az ivás-nyugtázás egymástól függetlenül is szünetelteti a piramist', () => {
    const tracker = new PyramidPauseTracker();
    tracker.markDeciding('ROOM1', 'A');
    tracker.markDrinkersPending('ROOM1', ['B']);
    expect(tracker.isPaused('ROOM1')).toBe(true);

    tracker.releaseDeciding('ROOM1', 'A');
    expect(tracker.isPaused('ROOM1')).toBe(true); // B ivása még nyugtázatlan

    tracker.releaseDrinker('ROOM1', 'B');
    expect(tracker.isPaused('ROOM1')).toBe(false);
  });

  it('releasePlayer mindkét halmazból eltávolítja a játékost (pl. lecsatlakozáskor)', () => {
    const tracker = new PyramidPauseTracker();
    tracker.markDeciding('ROOM1', 'A');
    tracker.markDrinkersPending('ROOM1', ['A']);
    expect(tracker.isPaused('ROOM1')).toBe(true);

    tracker.releasePlayer('ROOM1', 'A');
    expect(tracker.isPaused('ROOM1')).toBe(false);
  });

  it('clearRoom teljesen töröl egy szobát', () => {
    const tracker = new PyramidPauseTracker();
    tracker.markDeciding('ROOM1', 'A');
    tracker.markDrinkersPending('ROOM1', ['B', 'C']);

    tracker.clearRoom('ROOM1');
    expect(tracker.isPaused('ROOM1')).toBe(false);
  });

  it('szobák egymástól függetlenek', () => {
    const tracker = new PyramidPauseTracker();
    tracker.markDeciding('ROOM1', 'A');
    expect(tracker.isPaused('ROOM1')).toBe(true);
    expect(tracker.isPaused('ROOM2')).toBe(false);
  });

  it('felesleges release nem dob hibát és nem hagy nyomot', () => {
    const tracker = new PyramidPauseTracker();
    expect(() => tracker.releaseDeciding('ROOM1', 'nemletezo')).not.toThrow();
    expect(() => tracker.releaseDrinker('ROOM1', 'nemletezo')).not.toThrow();
    expect(tracker.isPaused('ROOM1')).toBe(false);
  });
});
