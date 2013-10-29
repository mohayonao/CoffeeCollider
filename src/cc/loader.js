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
      require("./client/installer").install();
      cc.client = cc.createSynthClient();
    } else if (cc.coffeeColliderHash === "#socket") {
      cc.opmode  = "socket";
      cc.context = "client";
      require("./client/installer").install();
      cc.client = cc.createSynthClient();
    } else {
      cc.opmode  = "exports";
      cc.context = "exports";
      require("./exports/installer").install();
      
    }
  } else if (typeof WorkerLocation !== "undefined") {
    if (location.hash === "#iframe") {
      cc.opmode  = "iframe";
      cc.context = "server";
      require("./server/installer").install();
      cc.server = cc.createSynthServer();
      cc.server.connect();
    } else {
      cc.opmode  = "worker";
      cc.context = "client/server";
      require("./client/installer").install();
      require("./server/installer").install();
      cc.client = cc.createSynthClient();
      cc.server = cc.createSynthServer();
      cc.client.sendToServer = cc.server.recvFromClient.bind(cc.server);
      cc.server.sendToClient = cc.client.recvFromServer.bind(cc.client);
      cc.server.connect();
    }
  } else if (typeof global.GLOBAL !== "undefined") {
    cc.opmode  = "socket";
    cc.context = "server";
    require("./server/installer").install();
    cc.server = cc.createSynthServer();
    module.exports.createServer = cc.server.exports.createServer;
  }

});
