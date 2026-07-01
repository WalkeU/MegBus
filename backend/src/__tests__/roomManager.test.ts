import { RoomManager, RoomManagerError } from '../rooms/roomManager';
import { MAX_PLAYERS } from '../game/gameEngine';

describe('RoomManager', () => {
  it('szoba létrehozásakor a host az első, "nem ready" játékos', () => {
    const manager = new RoomManager();
    const room = manager.createRoom({ id: 'host-1', name: 'Walke' });
    expect(room.code).toHaveLength(6);
    expect(room.players).toHaveLength(1);
    expect(room.players[0]).toMatchObject({ id: 'host-1', name: 'Walke', ready: false });
    expect(room.phase).toBe('lobby');
  });

  it('másik játékos csatlakozhat érvényes kóddal', () => {
    const manager = new RoomManager();
    const room = manager.createRoom({ id: 'host-1', name: 'Walke' });
    manager.joinRoom(room.code, { id: 'p2', name: 'Anna' });
    expect(manager.getRoom(room.code).players).toHaveLength(2);
  });

  it('érvénytelen kóddal nem lehet csatlakozni', () => {
    const manager = new RoomManager();
    expect(() => manager.joinRoom('ZZZZZZ', { id: 'p2', name: 'Anna' })).toThrow(RoomManagerError);
  });

  it('ugyanaz a játékos kétszer nem csatlakozhat', () => {
    const manager = new RoomManager();
    const room = manager.createRoom({ id: 'host-1', name: 'Walke' });
    expect(() => manager.joinRoom(room.code, { id: 'host-1', name: 'Walke' })).toThrow(RoomManagerError);
  });

  it(`legfeljebb ${MAX_PLAYERS} játékos fér a szobába`, () => {
    const manager = new RoomManager();
    const room = manager.createRoom({ id: 'p0', name: 'P0' });
    for (let i = 1; i < MAX_PLAYERS; i++) {
      manager.joinRoom(room.code, { id: `p${i}`, name: `P${i}` });
    }
    expect(() => manager.joinRoom(room.code, { id: 'overflow', name: 'X' })).toThrow(RoomManagerError);
  });

  it('a játék csak akkor indul, ha legalább 2 játékos van és mindenki ready', () => {
    const manager = new RoomManager();
    const room = manager.createRoom({ id: 'host-1', name: 'Walke' });
    expect(manager.tryStartGame(room.code)).toBeNull();

    manager.setReady(room.code, 'host-1', true);
    expect(manager.tryStartGame(room.code)).toBeNull(); // még csak 1 fő

    manager.joinRoom(room.code, { id: 'p2', name: 'Anna' });
    expect(manager.tryStartGame(room.code)).toBeNull(); // p2 még nem ready

    manager.setReady(room.code, 'p2', true);
    const engine = manager.tryStartGame(room.code);
    expect(engine).not.toBeNull();
    expect(engine?.phase).toBe('round1');
    expect(manager.getRoom(room.code).phase).toBe('in-game');
  });

  it('csatlakozás után induló játéknál nem lehet újra csatlakozni', () => {
    const manager = new RoomManager();
    const room = manager.createRoom({ id: 'host-1', name: 'Walke' });
    manager.joinRoom(room.code, { id: 'p2', name: 'Anna' });
    manager.setReady(room.code, 'host-1', true);
    manager.setReady(room.code, 'p2', true);
    manager.tryStartGame(room.code);

    expect(() => manager.joinRoom(room.code, { id: 'p3', name: 'Late' })).toThrow(RoomManagerError);
  });

  it('requestNewRound / resetForNewRound visszaállítja a lobby állapotot', () => {
    const manager = new RoomManager();
    const room = manager.createRoom({ id: 'host-1', name: 'Walke' });
    manager.joinRoom(room.code, { id: 'p2', name: 'Anna' });
    manager.setReady(room.code, 'host-1', true);
    manager.setReady(room.code, 'p2', true);
    manager.tryStartGame(room.code);

    const resetRoom = manager.resetForNewRound(room.code);
    expect(resetRoom.phase).toBe('lobby');
    expect(resetRoom.engine).toBeNull();
    expect(resetRoom.players.every((p) => p.ready === false)).toBe(true);
  });

  it('leaveRoom eltávolítja a játékost, és üres szobánál törli azt', () => {
    const manager = new RoomManager();
    const room = manager.createRoom({ id: 'host-1', name: 'Walke' });
    manager.leaveRoom(room.code, 'host-1');
    expect(() => manager.getRoom(room.code)).toThrow(RoomManagerError);
  });
});
