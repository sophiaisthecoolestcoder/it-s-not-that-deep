import { colors } from './colors';

export const CHAT_THEME = {
  userBubbleBg: colors.brand50,
  userBubbleBorder: colors.brand200,
  userText: colors.dark700,
  userLabel: colors.brand500,
  assistantBubbleBg: colors.white,
  assistantBubbleBorder: colors.dark200,
  assistantText: colors.textPrimary,
  assistantLabel: colors.dark400,
  actionIcon: colors.dark300,
  actionIconActive: colors.brand500,
  actionButtonBg: 'transparent',
  actionButtonBgActive: colors.brand100,
  actionButtonBorder: 'transparent',
  actionButtonBorderActive: colors.brand200,
  captureHeaderBg: colors.brand50,
  captureHeaderBorder: colors.brand200,
  captureHeaderLabel: colors.dark400,
  captureHeaderTitle: colors.brand700,
  codeBg: '#f7f2ec',
  codeBorder: colors.brand200,
  codeLabel: colors.dark400,
  codeButtonBorder: colors.dark300,
  codeButtonText: colors.dark600,
  refCardBg: '#fcf9f5',
  refCardBorder: colors.brand200,
  refType: colors.dark400,
  refTitle: colors.dark700,
  refSubtitle: colors.dark400,
  refButtonBorder: colors.dark300,
  refButtonText: colors.dark500,
  headerButtonBorder: colors.dark300,
  headerButtonText: colors.dark600,
  headerButtonBg: colors.white,
  inputBorder: colors.dark200,
  inputBg: colors.white,
  userActionBg: 'rgba(194, 169, 140, 0.10)',
  assistantActionBg: 'rgba(255, 255, 255, 0.70)',
  actionRowGap: 8,
  actionIconSize: 13,
  actionButtonSize: 20,
  actionButtonRadius: 10,
  messageRadius: 2,
  messagePaddingH: 14,
  messagePaddingV: 10,
} as const;

export const CHAT_HIGHLIGHT_CSS = `
.hljs { background: ${CHAT_THEME.codeBg}; color: ${colors.dark600}; padding: 0; }
.hljs-keyword, .hljs-selector-tag { color: ${colors.brand600}; font-weight: 600; }
.hljs-string, .hljs-attr { color: ${colors.brand700}; }
.hljs-number, .hljs-literal { color: ${colors.brand500}; }
.hljs-comment { color: ${colors.dark300}; font-style: italic; }
.hljs-title, .hljs-section { color: ${colors.brand800}; font-weight: 600; }
.hljs-variable, .hljs-template-variable { color: ${colors.brand600}; }
.hljs-built_in { color: ${colors.brand700}; }
.hljs-type { color: ${colors.brand500}; }
`;

export const CHAT_MARKDOWN_CSS = `
.md-body { font-family: "Noto Sans", Arial, sans-serif; font-size: 14px; line-height: 1.65; color: ${colors.textPrimary}; }
.md-body p { margin: 0 0 10px; }
.md-body p:last-child { margin-bottom: 0; }
.md-body h1, .md-body h2, .md-body h3, .md-body h4 {
  font-family: "Noto Serif", Georgia, serif;
  color: ${colors.brand700};
  margin: 14px 0 6px;
  font-weight: 500;
  line-height: 1.3;
}
.md-body h1 { font-size: 20px; }
.md-body h2 { font-size: 17px; }
.md-body h3 { font-size: 15px; }
.md-body h4 { font-size: 14px; }
.md-body ul, .md-body ol { margin: 0 0 10px 0; padding-left: 22px; }
.md-body li { margin-bottom: 3px; }
.md-body li > p { margin: 0; }
.md-body strong { font-weight: 600; color: ${colors.textPrimary}; }
.md-body em { font-style: italic; }
.md-body del { text-decoration: line-through; color: ${colors.dark400}; }
.md-body blockquote {
  margin: 8px 0;
  padding: 8px 14px;
  border-left: 3px solid ${colors.brand400};
  background: ${colors.brand50};
  color: ${colors.dark500};
  font-style: italic;
}
.md-body blockquote p { margin: 0; }
.md-body code {
  font-family: "JetBrains Mono", monospace;
  font-size: 12px;
  background: ${CHAT_THEME.codeBg};
  border: 1px solid ${CHAT_THEME.codeBorder};
  padding: 1px 5px;
  border-radius: 2px;
  color: ${colors.brand700};
}
.md-body pre {
  background: ${CHAT_THEME.codeBg};
  border: 1px solid ${CHAT_THEME.codeBorder};
  padding: 12px 14px;
  margin: 8px 0;
  overflow-x: auto;
  border-radius: 2px;
}
.md-body pre code {
  background: none;
  border: none;
  padding: 0;
  font-size: 12.5px;
  color: inherit;
}
.md-body table {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
  font-size: 13px;
}
.md-body th {
  background: ${colors.brand100};
  border: 1px solid ${CHAT_THEME.codeBorder};
  padding: 6px 10px;
  text-align: left;
  font-weight: 600;
  color: ${colors.brand700};
}
.md-body td {
  border: 1px solid ${CHAT_THEME.codeBorder};
  padding: 5px 10px;
}
.md-body tr:nth-child(even) td { background: ${colors.brand50}; }
.md-body a { color: ${colors.brand600}; text-decoration: underline; }
.md-body hr { border: none; border-top: 1px solid ${CHAT_THEME.codeBorder}; margin: 12px 0; }
.md-body input[type="checkbox"] { margin-right: 6px; }
`;