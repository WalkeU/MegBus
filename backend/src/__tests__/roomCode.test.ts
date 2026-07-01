import { generateRoomCode, ROOM_CODE_LENGTH } from '../rooms/roomCode';

describe('generateRoomCode', () => {
  it(`${ROOM_CODE_LENGTH} karakter hosszú kódot ad`, () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(ROOM_CODE_LENGTH);
  });

  it('nem tartalmaz félreérthető karaktereket (0, O, 1, I)', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      expect(code).not.toMatch(/[01OI]/);
    }
  });

  it('csak nagybetűket és számjegyeket tartalmaz', () => {
    const code = generateRoomCode();
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });
});
