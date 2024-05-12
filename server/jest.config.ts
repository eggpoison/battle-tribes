import type { Config } from "jest";

const config: Config = {
   preset: "ts-jest",
   testEnvironment: "node",
   verbose: true,
   setupFilesAfterEnv: ["<rootDir>/src/setup-jest.ts"]
};

export default config;