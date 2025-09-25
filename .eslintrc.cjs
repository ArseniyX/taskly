// @ts-nocheck
/** @type {import('@types/eslint').Linter.BaseConfig} */
module.exports = {
  root: true,
  extends: [
    "@remix-run/eslint-config",
    "@remix-run/eslint-config/node",
    "prettier",
  ],
  globals: {
    shopify: "readonly",
  },
  rules: {
    "no-useless-constructor": "off",
  },
  overrides: [
    {
      files: ["**/__tests__/**/*", "**/*.{test,spec}.*"],
      env: {
        node: true,
      },
      globals: {
        vi: "readonly",
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
      },
    },
  ],
};
