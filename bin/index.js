var server = require('../server'),
    util = require('util');

// Settings
var settings = require('../settings').create();

settings.port = process.env.PORT || settings.port;

process.on('exit', function () {
  util.log('Bye bye Statusdashboard.');
});

process.on('uncaughtException', function(err) {
  util.log(err.stack.replace(/^    /gm, '                  '));
});

var dashboard = new server.dashboard(settings);
