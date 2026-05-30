/** @type {import('eslint').Linter.Config} */
const config = {
  extends: ['next'],
  rules: {
    'react/no-unescaped-entities': 'warn',
  },
};

module.exports = config;
