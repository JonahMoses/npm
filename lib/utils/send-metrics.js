'use strict'
exports.launch = launchSendMetrics
var fs = require('graceful-fs')
var child_process = require('child_process')

if (require.main === module) main()

function launchSendMetrics () {
  var path = require('path')
  var npm = require('../npm.js')
  try {
    if (!npm.config.get('send-metrics')) return
    var cliMetrics = path.join(npm.config.get('cache'), 'anonymous-cli-stats.json')
    var targetRegistry = npm.config.get('metrics-registry')
    fs.statSync(cliMetrics)
    return runInBackground(__filename, [cliMetrics, targetRegistry])
  } catch (ex) {
    // if the stats file doesn't exist, don't run
  }
}

function runInBackground (js, args, opts) {
  if (!args) args = []
  args.unshift(js)
  if (!opts) opts = {}
  opts.stdio = 'ignore'
  opts.detached = true
  var child = child_process.spawn(process.execPath, args, opts)
  child.unref()
  return child
}

function main () {
  var fs = require('fs')
  var path = require('path')
  var npm = require('../npm.js')
  var metricsFile = process.argv[2]
  var metricsRegistry = process.argv[3]

  var cliMetrics = JSON.parse(fs.readFileSync(metricsFile))
  npm.load({}, function (err) {
    if (err) return
    npm.registry.config.retry.retries = 0
    npm.registry.sendAnonymousCLIMetrics(metricsRegistry, cliMetrics, function (err) {
      if (err) {
        fs.writeFileSync(path.join(path.dirname(metricsFile), 'last-send-stats-error.txt'), err.stack)
      } else {
        fs.unlinkSync(metricsFile)
      }
    })
  })
}
