module.exports = {
  watchman: false,
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/tests/domain/**/*.test.ts',
        '<rootDir>/tests/data/**/*.test.ts',
        '<rootDir>/tests/*.test.ts',
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            tsconfig: {
              jsx: 'react-jsx',
            },
          },
        ],
      },
    },
    {
      displayName: 'presentation',
      preset: 'jest-expo',
      testMatch: [
        '<rootDir>/tests/presentation/**/*.test.tsx',
        '<rootDir>/tests/presentation/**/*.test.ts',
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
  ],
};
