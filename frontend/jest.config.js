module.exports = {
  preset: '@react-native/jest-preset',
  // The app pulls in web-only export modules (file-saver, html2canvas, exceljs,
  // docx, jszip) via OfferEditor/BelegungEditor. Their implementations either
  // reference browser globals or ship untransformed ESM, which breaks unrelated
  // smoke tests. Stub them so the render smoke test can run.
  moduleNameMapper: {
    '^file-saver$': '<rootDir>/__mocks__/file-saver.js',
    '^html2canvas$': '<rootDir>/__mocks__/html2canvas.js',
    '^exceljs$': '<rootDir>/__mocks__/exceljs.js',
    '^docx$': '<rootDir>/__mocks__/docx.js',
    '^jszip$': '<rootDir>/__mocks__/jszip.js',
    '^react-markdown$': '<rootDir>/__mocks__/react-markdown.js',
    '^remark-gfm$': '<rootDir>/__mocks__/noop.js',
    '^rehype-highlight$': '<rootDir>/__mocks__/noop.js',
    '^rehype-sanitize$': '<rootDir>/__mocks__/rehype-sanitize.js',
  },
};
