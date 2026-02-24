/** @type {import('prettier').Config} */
export const basePrettierConfig = {
  // Basic Formatting
  printWidth: 100, // Maximum line length before wrapping
  tabWidth: 2, // Number of spaces per indentation level
  useTabs: false, // Use spaces instead of tabs for indentation
  semi: false, // Omit semicolons at the end of statements (only add when necessary to avoid ASI errors)
  singleQuote: true, // Use single quotes instead of double quotes in JS/TS
  jsxSingleQuote: true, // Use single quotes instead of double quotes in JSX attributes
  quoteProps: 'as-needed', // Only add quotes around object properties when required (e.g., "foo-bar": 1)

  // Brackets and Commas
  trailingComma: 'none', // No trailing commas in arrays, objects, function params (ES5 compatible)
  bracketSpacing: true, // Add spaces inside object brackets: { foo: bar } vs {foo: bar}
  bracketSameLine: true, // Put closing > of multiline JSX elements on the same line as last prop
  arrowParens: 'avoid', // Omit parentheses when arrow function has single parameter: x => x vs (x) => x

  // HTML/JSX Attributes
  proseWrap: 'preserve', // Preserve original line wrapping in markdown files (don't reformat paragraphs)
  htmlWhitespaceSensitivity: 'css', // Respect CSS display property for whitespace sensitivity in HTML
  singleAttributePerLine: false, // Allow multiple attributes on the same line in JSX/HTML elements

  // Line Endings
  endOfLine: 'auto', // Maintain existing line endings (LF for Unix, CRLF for Windows)

  importOrder: [
    '^fake-indexeddb/auto$', // Ensure IndexedDB polyfill stays before other imports
    '^virtual:uno\\.css$', // virtual:uno.css always first
    '^(?:\\.{1,2}/)+uno\\.css$', // relative uno.css imports always first
    '^.*setup-buffer$', // Buffer setup (any path ending with setup-buffer)
    '^react-native-url-polyfill/auto$', // React Native polyfills
    '^react-native-get-random-values$', // React Native random values
    '^\\.{1,2}/shim$', // Local shim imports
    '^react$', // React imports first
    '^react-dom$', // ReactDOM imports second
    '^react-(.*)$', // Other react-* packages
    '^@react-(.*)$', // @react-* scoped packages
    '<THIRD_PARTY_MODULES>', // All other third-party packages from node_modules
    '^@/(.*)$', // Internal aliases starting with @ (if configured)
    '^[./]', // Relative imports
    '^~/(.*)$', // Imports starting with ~/
    '^\\.\\.(?!/?$)', // Parent directory imports (../)
    '^\\.\\./?$', // Parent directory index imports (..)
    '^\\.(?!/?$)', // Current directory imports (./)
    '^\\./?$', // Current directory index imports (.)
    '^@style/style\\.css$' // @style/style.css always last
  ],
  importOrderSeparation: false, // No blank lines between import groups
  importOrderCaseInsensitive: true, // Sort imports case-insensitively (a-z same as A-Z)
  importOrderParserPlugins: ['typescript', 'jsx', 'decorators-legacy'], // Parser plugins for import sorting

  // Advanced Options
  embeddedLanguageFormatting: 'auto', // Format embedded code in template literals (e.g., styled-components CSS)
  requirePragma: false, // Format all files (don't require special comment like /** @format */)
  insertPragma: false, // Don't insert @format pragma comment at file top

  // File-specific Overrides
  overrides: [
    {
      files: '*.json',
      options: {
        tabWidth: 2,
        useTabs: false,
        singleQuote: false // JSON requires double quotes
      }
    },
    {
      files: '*.md',
      options: {
        proseWrap: 'always', // Wrap markdown prose at printWidth (better for version control)
        printWidth: 100 // Narrower width for better readability in markdown
      }
    }
  ]
}

export default basePrettierConfig
