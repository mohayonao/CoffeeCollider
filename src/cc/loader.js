define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");

  if (typeof document !== "undefined") {
    var scripts = document.getElementsByTagName("script");
    if (scripts && scripts.length) {
      for (var i = 0; i < scripts.length; i++) {
        var m = /^(.*\/)coffee-collider(?:-dev)?\.js(\#.*)?$/.exec(scripts[i].src);
        if (m) {
          cc.rootPath = m[1];
          cc.coffeeColliderPath = m[0];
          cc.coffeeColliderHash = m[2];
          break;
        }
      }
    }
    cc.opmode  = "client";
    cc.context = "client";
    require("./client/client");
    global.CoffeeCollider = function(opts) {
      return cc.createSynthClient(opts);
    };
    global.CoffeeCollider.version = cc.version;
  } else if (typeof WorkerLocation !== "undefined") {
    if (location.hash === "#socket") {
      cc.opmode  = "socket";
      cc.context = "lang";
      require("./lang/lang");
      cc.lang = cc.createSynthLang();
    } else {
      cc.opmode  = "worker";
      cc.context = "lang/server";
      require("./lang/lang");
      require("./server/server");
      cc.lang = cc.createSynthLang();
      cc.server = cc.createSynthServer();
      cc.lang.sendToServer = cc.server.recvFromLang.bind(cc.server);
      cc.server.sendToLang = cc.lang.recvFromServer.bind(cc.lang);
      cc.server.connect();
    }
  } else if (typeof global.GLOBAL !== "undefined") {
    cc.global.CoffeeCollider = function() {
      cc.opmode  = "nodejs";
      cc.context = "client/lang/server";
      require("./client/client");
      require("./lang/lang");
      require("./server/server");
      cc.client = cc.createSynthClient({nodejs:true});
      cc.lang   = cc.createSynthLang();
      cc.server = cc.createSynthServer();
      cc.client.impl.sendToLang = cc.lang.recvFromClient.bind(cc.lang);
      cc.lang.sendToServer = cc.server.recvFromLang.bind(cc.server);
      cc.server.sendToLang = cc.lang.recvFromServer.bind(cc.lang);
      cc.lang.sendToClient = cc.client.impl.recvFromLang.bind(cc.client.impl);
      cc.server.connect();
      return cc.client;
    };
    cc.global.SocketSynthServer = function(opts) {
      cc.opmode  = "socket";
      cc.context = "server";
      require("./server/server");
      cc.server = cc.createSynthServer();
      return cc.server.exports.createServer(opts);
    };
    cc.global.version = cc.version;
    module.exports = cc.global;
  }

});
