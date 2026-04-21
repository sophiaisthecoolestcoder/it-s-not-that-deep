const React = require('react');
function ReactMarkdown(props) {
  return React.createElement('div', null, props && props.children);
}
module.exports = ReactMarkdown;
module.exports.default = ReactMarkdown;
