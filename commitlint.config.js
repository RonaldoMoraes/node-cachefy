module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Enforce conventional commit types
    'type-enum': [
      2,
      'always',
      [
        'feat',     // A new feature
        'fix',      // A bug fix
        'docs',     // Documentation only changes
        'style',    // Changes that do not affect the meaning of the code
        'refactor', // A code change that neither fixes a bug nor adds a feature
        'perf',     // A code change that improves performance
        'test',     // Adding missing tests or correcting existing tests
        'build',    // Changes that affect the build system or external dependencies
        'ci',       // Changes to our CI configuration files and scripts
        'chore',    // Other changes that don't modify src or test files
        'revert',   // Reverts a previous commit
      ],
    ],
    // Ensure type is lowercase
    'type-case': [2, 'always', 'lower-case'],
    // Ensure type is not empty
    'type-empty': [2, 'never'],
    // Ensure subject is not empty
    'subject-empty': [2, 'never'],
    // Ensure subject doesn't end with period
    'subject-full-stop': [2, 'never', '.'],
    // Ensure subject is lowercase (start)
    'subject-case': [2, 'always', 'lower-case'],
    // Ensure header is not too long
    'header-max-length': [2, 'always', 100],
    // Ensure body has leading blank line
    'body-leading-blank': [2, 'always'],
    // Ensure footer has leading blank line
    'footer-leading-blank': [2, 'always'],
  },
};