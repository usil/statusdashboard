var logger = require('util');
var client;
var mysettings;

exports.create = async function(api, settings) {
  mysettings = settings;
  if (settings.plugins && settings.plugins.history && settings.plugins.history.enable) {
    var redis = require("redis");
    console.log('Creating the plugin: ' + __filename);
    client = redis.createClient(settings.plugins.history.port, settings.plugins.history.host, settings.plugins.history.options);
    await client.connect();
    client.on('error', function(err) {
      logger.log("Redis plugin: " + err);
    });

    // new route should be: /api/[pluginName]/whatever
    api.emit("routeContribution", { path: /^\/api\/history\/service\/([a-z\-]+)$/, binding: module.exports.serviceHistory });
    api.emit("routeContribution", { path: /^\/api\/history\/all\/([a-z\-]+)$/, binding: module.exports.serviceAllHistory });
    api.emit("routeContribution", { path: /^\/api\/history\/all$/, binding: module.exports.allHistory });

    // serve static file: /api/[pluginName]/public
    api.emit("staticContribution", 'history');

    var storeStatus = function (service) {
      client.set(settings.plugins.history.namespace + ":" + service.name, JSON.stringify({time: new Date().valueOf(), status: service.status, message: service.message, code:service.statusCode}));
    }

    api.on('up', function(service) {
      storeStatus(service);
    });

    api.on('down', function(service) {
      storeStatus(service);
    });

    api.on('unknown', function(service) {
      storeStatus(service);
    });

    api.on('critical', function(service) {
      storeStatus(service);
    });

    api.on('refresh', function(status) {
    });

  }
};

module.exports.serviceHistory = function(req, res, value) {
  client.lrange(mysettings.plugins.history.namespace + ":" + value, 0, 100, function(err, data) {
    if (!err) {
      res.send(JSON.stringify(data), 200);
    } else {
      res.send(err, 500);
    }
  });
};

module.exports.serviceAllHistory = function(req, res, value) {
  console.log("rrr");
  client.lrange(mysettings.plugins.history.namespace + ":" + value, 0, -1, function(err, data) {
    if (!err) {
      res.send(JSON.stringify(data), 200);
    } else {
      res.send(err, 500);
    }
  });
};

module.exports.allHistory = function(req, res) {
  var history = [];

  for (var i = 0; i < mysettings.services.length; i++) {
    history.push(["lrange", mysettings.plugins.history.namespace + ":" + mysettings.services[i].name, 0, -1]);
  }

  client.multi(history).exec(function (err, replies) {
    if (!err) {
      var data = {};
      replies.forEach(function (reply, index) {
        data[mysettings.services[index].name] = JSON.parse("[" + reply.toString() + "]");
      });
      res.send(JSON.stringify(data), 200);
    } else {
      res.send(err, 500);
    }
  });
};
