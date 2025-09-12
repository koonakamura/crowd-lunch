module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
  overrides: [
    {
      files: ["web/src/pages/Admin**/*", "web/src/components/admin/**/*"],
      rules: {
        "no-restricted-syntax": [
          "error",
          {
            selector: "CallExpression[callee.property.name='toLocaleString'][arguments.length=0]",
            message: "Adminの日時表示は formatJst()/JstTime を使ってください。価格表示の場合は引数付きtoLocaleString()を使用。"
          },
          {
            selector: "CallExpression[callee.property.name='toISOString']",
            message: "Adminの日時表示は formatJst()/JstTime を使ってください。"
          }
        ]
      }
    }
  ]
}
