/**
 * A piramis fordítása két okból szünetelhet szobánként:
 *  - valaki épp eldönti, lerakja-e az egyező lapját ("deciding"),
 *  - valaki egy már lerakott lap miatt kiosztott ivást még nem nyugtázott ("drinking").
 * Amíg bármelyik halmaz nem üres az adott szobában, a fordítás nem folytatódhat.
 * Ez az osztály tisztán az állapotot kezeli, hálózati/időzítő függőség nélkül —
 * ez teszi valódi szerver indítása nélkül, determinisztikusan tesztelhetővé.
 */
export class PyramidPauseTracker {
  private readonly deciding = new Map<string, Set<string>>();
  private readonly drinking = new Map<string, Set<string>>();

  markDeciding(roomCode: string, playerId: string): void {
    this.addTo(this.deciding, roomCode, playerId);
  }

  releaseDeciding(roomCode: string, playerId: string): void {
    this.removeFrom(this.deciding, roomCode, playerId);
  }

  markDrinkersPending(roomCode: string, playerIds: readonly string[]): void {
    playerIds.forEach((playerId) => this.addTo(this.drinking, roomCode, playerId));
  }

  releaseDrinker(roomCode: string, playerId: string): void {
    this.removeFrom(this.drinking, roomCode, playerId);
  }

  /** Egy játékos minden pending állapotát törli (pl. lecsatlakozáskor). */
  releasePlayer(roomCode: string, playerId: string): void {
    this.removeFrom(this.deciding, roomCode, playerId);
    this.removeFrom(this.drinking, roomCode, playerId);
  }

  clearRoom(roomCode: string): void {
    this.deciding.delete(roomCode);
    this.drinking.delete(roomCode);
  }

  isPaused(roomCode: string): boolean {
    return (this.deciding.get(roomCode)?.size ?? 0) > 0 || (this.drinking.get(roomCode)?.size ?? 0) > 0;
  }

  private addTo(target: Map<string, Set<string>>, roomCode: string, playerId: string): void {
    let set = target.get(roomCode);
    if (!set) {
      set = new Set();
      target.set(roomCode, set);
    }
    set.add(playerId);
  }

  private removeFrom(target: Map<string, Set<string>>, roomCode: string, playerId: string): void {
    const set = target.get(roomCode);
    if (!set) return;
    set.delete(playerId);
    if (set.size === 0) target.delete(roomCode);
  }
}
