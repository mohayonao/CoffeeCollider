define(function(require, exports, module) {
  "use strict";

  var cc = require("cc/cc");
  var Compiler = require("./compiler").Compiler;

  var commands = {};
  
  var LangServer = (function() {
    function LangServer() {
      var that = this;
      this.worker = new Worker(cc.coffeeColliderPath);
      this.worker.addEventListener("message", function(e) {
        var msg = e.data;
        if (msg instanceof Float32Array) {
          that.sendToCC(msg);
        } else {
          that.recv(msg);
        }
      });
    }
    LangServer.prototype.sendToCC = function(msg) {
      window.parent.postMessage(msg, "*");
    };
    LangServer.prototype.sendToSynth = function(msg) {
      this.worker.postMessage(msg);
    };
    LangServer.prototype.recv = function(msg) {
      if (!msg) {
        return;
      }
      var func = commands[msg[0]];
      if (func) {
        func.call(this, msg);
      }
    };
    return LangServer;
  })();

  commands["/init"] = function(msg) {
    this.sendToSynth(msg);
  };
  commands["/play"] = function(msg) {
    this.sendToSynth(msg);
  };
  commands["/pause"] = function(msg) {
    this.sendToSynth(msg);
  };
  commands["/console/log"] = function(msg) {
    console.log.apply(console, msg[1]);
  };
  commands["/console/debug"] = function(msg) {
    console.debug.apply(console, msg[1]);
  };
  commands["/console/info"] = function(msg) {
    console.info.apply(console, msg[1]);
  };
  commands["/console/error"] = function(msg) {
    console.error.apply(console, msg[1]);
  };
  commands["/exec"] = function(msg) {
    var execId = msg[1];
    var code   = new Compiler().compile(msg[2].trim());
    var result = eval.call(global, code);
    this.sendToCC(["/exec", execId, JSON.stringify(result)]);
  };

  var install = function() {
    var server = new LangServer();
    window.addEventListener("message", function(e) {
      var msg = e.data;
      if (msg instanceof Float32Array) {
        server.sendToSynth(msg);
      } else {
        server.recv(msg);
      }
    });
    server.sendToCC(["/connect"]);
  };

  module.exports = {
    LangServer: LangServer,
    install: install
  };

});
