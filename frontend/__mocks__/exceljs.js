class Workbook {
  constructor() {
    this.xlsx = { writeBuffer: () => Promise.resolve(new ArrayBuffer(0)) };
  }
  addWorksheet() {
    return {
      columns: [],
      getColumn: () => ({ width: 0, alignment: {}, font: {} }),
      getRow: () => ({
        getCell: () => ({ value: '', font: {}, alignment: {}, border: {}, fill: {} }),
        height: 0,
        alignment: {},
        font: {},
        border: {},
        fill: {},
      }),
      getCell: () => ({ value: '', font: {}, alignment: {}, border: {}, fill: {} }),
      mergeCells: () => {},
      addRow: () => ({
        getCell: () => ({ value: '', font: {}, alignment: {}, border: {}, fill: {} }),
        height: 0,
        alignment: {},
        font: {},
        border: {},
        fill: {},
      }),
      pageSetup: {},
      views: [],
    };
  }
}

module.exports = { Workbook };
module.exports.default = { Workbook };
