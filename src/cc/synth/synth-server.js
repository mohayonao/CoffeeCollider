define(function(require, exports, module) {
  "use strict";

  var commands = {};
  
  var SynthServer = (function() {
    function SynthServer() {
      this.sysSyncCount   = 0;
      this.sysCurrentTime = 0;
      this.syncItems = new Float32Array(6);
      this.onaudioprocess = this.onaudioprocess.bind(this);
      this.timerId = 0;
    }
    SynthServer.prototype.sendToLang = function(msg) {
      postMessage(msg);
    };
    SynthServer.prototype.recv = function(msg) {
      if (!msg) {
        return;
      }
      var func = commands[msg[0]];
      if (func) {
        func.call(this, msg);
      }
    };
    SynthServer.prototype.onaudioprocess = function() {
      if (this.syncCount - this.sysSyncCount >= 4) {
        return;
      }
      var strm = this.strm;
      for (var i = 0; i < strm.length; i++) {
        strm[i] = Math.random() * 0.5;
      }
      this.syncCount += 1;
      this.sendToLang(strm);
    };
    return SynthServer;
  })();

  commands["/init"] = function(msg) {
    this.sampleRate = msg[1];
    this.channels   = msg[2];
    this.strmLength = msg[3];
    this.bufLength  = msg[4];
    this.syncCount  = msg[5];
    this.strm = new Float32Array(this.strmLength * this.channels);
  };
  commands["/play"] = function() {
    if (this.timerId === 0) {
      this.timerId = setInterval(this.onaudioprocess, 10);
    }
  };
  commands["/pause"] = function() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = 0;
    }
  };
  
  var server = new SynthServer();
  addEventListener("message", function(e) {
    var msg = e.data;
    if (msg instanceof Float32Array) {
      server.sysSyncCount   = msg[0]|0;
      server.sysCurrentTime = msg[1]|0;
      server.syncItems.set(msg);
    } else {
      server.recv(msg);
    }
  });

  global.console = (function() {
    var console = {};
    ["log", "debug", "info", "error"].forEach(function(method) {
      console[method] = function() {
        server.sendToLang(["/console/" + method, Array.prototype.slice.call(arguments)]);
      };
    });
    return console;
  })();
  
  module.exports = {
    SynthServer: SynthServer
  };

});
