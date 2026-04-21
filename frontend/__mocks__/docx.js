const stub = function () {};
module.exports = new Proxy(
  {
    Packer: { toBlob: () => Promise.resolve(new Blob()) },
  },
  {
    get: (target, name) => target[name] ?? stub,
  },
);
