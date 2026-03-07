// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import jsdoc from 'eslint-plugin-jsdoc'

export default withNuxt(
  {
    plugins: { jsdoc },
    files: ['**/*.ts', '**/*.vue'],
    ignores: ['test/**/*.spec.ts'],
    rules: {
      'jsdoc/require-jsdoc': ['warn', {
        require: {
          FunctionDeclaration: true,
          FunctionExpression: true,
          ArrowFunctionExpression: true,
        },
      }],
      'jsdoc/require-param': 'warn',
      'jsdoc/require-param-type': 'off',
    },
  },
)
