import { Config } from 'jest';

const config: Config = {
  displayName: 'Unit Tests',
  testMatch: ['**/*.spec.ts'],
  rootDir: '.',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/../../../src/$1',
    '^@/(.*)$': '<rootDir>/../../../src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],
  collectCoverageFrom: [
    '../../../src/**/*.ts',
    '!../../../src/**/*.spec.ts',
    '!../../../src/**/*.dto.ts',
    '!../../../src/main.ts',
  ],
  coverageDirectory: '<rootDir>/../../coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
};

export default config;
