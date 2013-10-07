define(function(require, exports, module) {
  "use strict";

  var Compiler = require("cc/lang/compiler").Compiler;

  var Server = (function() {
    function Server() {
      this.commands = {};
    }
    Server.prototype.send = function(msg) {
      window.parent.postMessage(msg, "*");
    };
    Server.prototype.recv = function(msg) {
      if (!msg) {
        return;
      }
      var func = this.commands[msg[0]];
      if (func) {
        func.call(this, msg);
      } else if (typeof msg === "string") {
        var code = new Compiler().compile(msg);
        var result = eval.call(global, code);
        console.log(result);
      }
    };
    return Server;
  })();

  var server = new Server();
  window.addEventListener("message", function(e) {
    server.recv(e.data);
  });
  server.send("/connect");

  module.exports = {
    Server: Server
  };

});
