module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/airbnb',
    'plugin:prettier/recommended', // Ensure Prettier rules are enforced
    'prettier', // Extends Prettier to disable ESLint formatting rules that conflict with Prettier
  ],
  parserOptions: {
    parser: '@babel/eslint-parser',
    requireConfigFile: false, // This tells ESLint to not require a Babel config file
  },
  plugins: ['prettier'],
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'prettier/prettier': 'error', // Integrate Prettier errors with ESLint
    'no-tabs': 'error',
    'no-mixed-spaces-and-tabs': 'error',
  },
}
