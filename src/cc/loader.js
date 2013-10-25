define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");

  if (typeof Window !== "undefined") {
    var scripts = document.getElementsByTagName("script");
    if (scripts && scripts.length) {
      var m;
      for (var i = 0; i < scripts.length; i++) {
        if (!cc.coffeeColliderPath) {
          m = /^(.*\/)coffee-collider(?:-min)?\.js(\#.*)?$/.exec(scripts[i].src);
          if (m) {
            cc.rootPath = m[1];
            cc.coffeeColliderPath = m[0];
            cc.coffeeColliderHash = m[2];
            break;
          }
        }
      }
    }
    if (cc.coffeeColliderHash === "#iframe") {
      cc.opmode  = "iframe";
      cc.context = "client";
      require("./client/installer").install();
    } else {
      cc.opmode  = "worker";
      cc.context = "exports";
      require("./exports/installer").install();
    }
  } else if (typeof WorkerGlobalScope !== "undefined") {
    if (location.hash === "#iframe") {
      cc.opmode  = "iframe";
      cc.context = "server";
      require("./server/installer").install();
    } else {
      cc.opmode  = "worker";
      cc.context = "client/server";
      require("./client/installer").install();
      require("./server/installer").install();
      cc.client.sendToServer = cc.server.recvFromClient.bind(cc.server);
      cc.server.sendToClient = cc.client.recvFromServer.bind(cc.client);
    }
    cc.server.connect();
  } else if (typeof global.GLOBAL !== "undefined") {
    cc.opmode  = "socket";
    cc.context = "server";
  }
  
  module.exports = {
  };

});
