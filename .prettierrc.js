module.exports = {
  printWidth: 88,
  trailingComma: 'all',
  tabWidth: 2,
  semi: false,
  singleQuote: true,
  arrowParens: 'avoid',
  overrides: [
      {
          files: '*.{json,yml}',
          options: {
              tabWidth: 2,
          },
      },
  ],
};
