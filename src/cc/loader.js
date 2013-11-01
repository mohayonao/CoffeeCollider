define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");

  if (typeof document !== "undefined") {
    var scripts = document.getElementsByTagName("script");
    if (scripts && scripts.length) {
      for (var i = 0; i < scripts.length; i++) {
        var m = /^(.*\/)coffee-collider(?:-min)?\.js(\#.*)?$/.exec(scripts[i].src);
        if (m) {
          cc.rootPath = m[1];
          cc.coffeeColliderPath = m[0];
          cc.coffeeColliderHash = m[2];
          break;
        }
      }
    }
    if (cc.coffeeColliderHash === "#iframe") {
      cc.opmode  = "iframe";
      cc.context = "client";
      require("./client/client").use();
      cc.client = cc.createSynthClient();
    } else if (cc.coffeeColliderHash === "#socket") {
      cc.opmode  = "socket";
      cc.context = "client";
      require("./client/client").use();
      cc.client = cc.createSynthClient();
    } else {
      cc.opmode  = "exports";
      cc.context = "exports";
      require("./exports/coffeecollider").use();
      global.CoffeeCollider = function(opts) {
        return cc.createCoffeeCollider(opts);
      };
    }
  } else if (typeof WorkerLocation !== "undefined") {
    if (location.hash === "#iframe") {
      cc.opmode  = "iframe";
      cc.context = "server";
      require("./server/server").use();
      cc.server = cc.createSynthServer();
      cc.server.connect();
    } else {
      cc.opmode  = "worker";
      cc.context = "client/server";
      require("./client/client").use();
      require("./server/server").use();
      cc.client = cc.createSynthClient();
      cc.server = cc.createSynthServer();
      cc.client.sendToServer = cc.server.recvFromClient.bind(cc.server);
      cc.server.sendToClient = cc.client.recvFromServer.bind(cc.client);
      cc.server.connect();
    }
  } else if (typeof global.GLOBAL !== "undefined") {
    module.exports = {
      CoffeeCollider: function() {
        cc.opmode  = "nodejs";
        cc.context = "exports/client/server";
        require("./exports/coffeecollider").use();
        require("./client/client").use();
        require("./server/server").use();
        cc.exports = cc.createCoffeeCollider({nodejs:true});
        cc.client  = cc.createSynthClient();
        cc.server  = cc.createSynthServer();
        cc.exports.impl.sendToClient = cc.client.recvFromIF.bind(cc.client);
        cc.client.sendToServer  = cc.server.recvFromClient.bind(cc.server);
        cc.server.sendToClient  = cc.client.recvFromServer.bind(cc.client);
        cc.client.sendToIF      = cc.exports.impl.recvFromClient.bind(cc.exports.impl);
        cc.server.connect();
        return cc.exports;
      },
      SocketSynthServer: function(opts) {
        cc.opmode  = "socket";
        cc.context = "server";
        require("./server/server").use();
        cc.server = cc.createSynthServer();
        return cc.server.exports.createServer(opts);
      }
    };
  }

});
