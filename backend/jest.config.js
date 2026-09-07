// Sprint 3.9 — Testing Foundation. NestJS's conventional Jest setup
// (ts-jest), consistent with what `nest new` scaffolds — chosen over
// Vitest (used on the frontend) because it's the NestJS ecosystem
// default and integrates directly with @nestjs/testing's TestingModule.
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  transform: { "^.+\\.(t|j)s$": "ts-jest" },
  collectCoverageFrom: ["**/*.(t|j)s"],
  coveragePathIgnorePatterns: ["\\.module\\.ts$", "\\.entity\\.ts$", "main\\.ts$"],
  coverageDirectory: "../coverage",
  testEnvironment: "node",
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
};
