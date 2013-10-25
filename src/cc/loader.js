define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");

  if (typeof document !== "undefined") {
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
    if (cc.coffeeColliderHash !== "#iframe") {
      cc.context = "window";
      require("./exports/installer").install();
    } else {
      cc.context = "iframe";
      require("./client/installer").install();
    }
  } else if (typeof WorkerLocation !== "undefined") {
    cc.context = "worker";
    if (location.hash === "#iframe") {
      require("./server/installer").install();
    } else {
      require("./client/installer").install();
      require("./server/installer").install();
      cc.client.sendToServer = cc.server.recvFromClient.bind(cc.server);
      cc.server.sendToClient = cc.client.recvFromServer.bind(cc.client);
    }
    cc.server.connect();
  }
  
  module.exports = {
  };

});
