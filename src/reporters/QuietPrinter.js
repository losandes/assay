'use strict'

module.exports = Printer

function Printer (styles) {
  var printerOutput = []
  var print = function (line) {
    printerOutput.push(line)
    /* suppressed */
  }

  print.start = print
  print.startTest = print
  print.success = print
  print.skipped = print
  print.failed = print
  print.broken = print
  print.info = print
  print.totals = print
  print.end = print

  return Object.freeze({
    name: 'QUIET',
    print: print,
    newLine: styles.newLine(),
    getOutput: () => { return printerOutput.join('\n') }
  })
}
