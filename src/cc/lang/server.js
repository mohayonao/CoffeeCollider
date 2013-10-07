define(function(require, exports, module) {
  "use strict";

  var Compiler = require("./compiler").Compiler;

  var commands = {};
  
  var Server = (function() {
    function Server() {
    }
    Server.prototype.send = function(msg) {
      window.parent.postMessage(msg, "*");
    };
    Server.prototype.recv = function(msg) {
      if (!msg) {
        return;
      }
      var func = commands[msg[0]];
      if (func) {
        func.call(this, msg);
      }
    };
    return Server;
  })();

  commands["/exec"] = function(msg) {
    var execId = msg[1];
    var code   = new Compiler().compile(msg[2].trim());
    var result = eval.call(global, code);
    this.send(["/exec", execId, JSON.stringify(result)]);
  };

  var server = new Server();
  window.addEventListener("message", function(e) {
    server.recv(e.data);
  });
  server.send("/connect");

  module.exports = {
    Server: Server
  };

});
