const path = require('path');
const {pathsToModuleNameMapper} = require('ts-jest');
const {compilerOptions} = require('../typescript/tsconfig.json');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: path.resolve(__dirname, '../../'),
  collectCoverage: false,
  collectCoverageFrom: ['**/src/**/*.ts', '!**/src/index.ts', '!**/src/sandbox/**'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  coverageReporters: ['json', 'text', 'text-summary'],
  collectCoverageFrom: ['src/**/*.ts', '!*.mock.ts']
};
