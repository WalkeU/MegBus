/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: ['src/game/**/*.ts', 'src/rooms/**/*.ts'],
  // A Socket.IO/Engine.IO belső időzítői néha a szerver lezárása után is életben tartják
  // a Jest workert; ez nem hibát jelez, csak lassítja a kilépést.
  forceExit: true,
};
