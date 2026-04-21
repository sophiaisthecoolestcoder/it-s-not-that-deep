class JSZip {
  file() { return this; }
  folder() { return this; }
  generateAsync() { return Promise.resolve(new Blob()); }
}
module.exports = JSZip;
module.exports.default = JSZip;
