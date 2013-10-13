define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var Group = require("./ctrl/node").Group;
  
  var commands = {};
  var twopi = 2 * Math.PI;
  
  var SynthServer = (function() {
    function SynthServer() {
      this.klassName = "SynthServer";
      this.sysSyncCount   = 0;
      this.sysCurrentTime = 0;
      this.syncItems = new Float32Array(6);
      this.timerId = 0;
    }
    SynthServer.prototype.send = function(msg) {
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
    SynthServer.prototype.getRate = function(rate) {
      return this.rates[rate] || this.rates[C.CONTROL];
    };
    SynthServer.prototype.onaudioprocess = function() {
      if (this.syncCount - this.sysSyncCount >= 4) {
        return;
      }
      var strm = this.strm;
      var strmLength = this.strmLength;
      var root = this.rootNode;
      var bufLength = this.bufLength;
      var offset = 0;
      var busBuffer = this.busBuffer;
      var busClear  = this.busClear;
      var busOutL = this.busOutL;
      var busOutR = this.busOutR;
      var n = strmLength / bufLength;
      while (n--) {
        busBuffer.set(busClear);
        root.process(bufLength);
        strm.set(busOutL, offset);
        strm.set(busOutR, offset + strmLength);
        offset += bufLength;
      }
      this.send(strm);
      this.syncCount += 1;
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
    this.rates = {};
    this.rates[C.AUDIO  ] = new Rate(this.sampleRate, this.bufLength);
    this.rates[C.CONTROL] = new Rate(this.sampleRate / this.bufLength, 1);
    this.rootNode = new Group();
    var busLength  = this.bufLength * C.AUDIO_BUS_LEN + C.CONTROL_BUS_LEN;
    var busBuffer  = new Float32Array(busLength);
    var bufLength  = this.bufLength;
    var bufLength4 = this.bufLength << 2;
    this.busBuffer = busBuffer;
    this.busClear  = new Float32Array(busLength);
    this.busOutL   = new Float32Array(busBuffer.buffer, 0         , bufLength);
    this.busOutR   = new Float32Array(busBuffer.buffer, bufLength4, bufLength);
  };
  commands["/play"] = function(msg) {
    if (this.timerId === 0) {
      var onaudioprocess = this.onaudioprocess.bind(this);
      this.timerId = setInterval(onaudioprocess, 10);
      this.syncCount = msg[1];
    }
  };
  commands["/pause"] = function() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = 0;
    }
  };
  commands["/reset"] = function() {
  };
  commands["/exec"] = function(msg) {
    var execId = msg[1];
    var code   = msg[2];
    var result  = pack(eval.call(global, code));
    this.send(["/exec", execId, result]);
  };
  commands["/loadScript"] = function(msg) {
    importScripts(msg[1]);
  };

  var Rate = (function() {
    function Rate(sampleRate, bufLength) {
      this.klassName = "Rate";
      this.sampleRate = sampleRate;
      this.sampleDur  = 1 / sampleRate;
      this.radiansPerSample = twopi / sampleRate;
      this.bufLength   = bufLength;
      this.bufDuration = bufLength / sampleRate;
      this.bufRate = 1 / this.bufDuration;
      this.slopeFactor = 1 / bufLength;
      this.filterLoops  = (bufLength / 3)|0;
      this.filterRemain = (bufLength % 3)|0;
      if (this.filterLoops === 0) {
        this.filterSlope = 0;
      } else {
        this.filterSlope = 1 / this.filterLoops;
      }
    }
    return Rate;
  })();

  var pack = (function() {
    var _ = function(data, stack) {
      if (!data) {
        return data;
      }
      if (stack.indexOf(data) !== -1) {
        return { klassName:"Circular" };
      }
      if (typeof data === "function") {
        return "[Function]";
      }
      var result;
      if (typeof data === "object") {
        if (data.buffer instanceof ArrayBuffer) {
          return data;
        }
        stack.push(data);
        if (Array.isArray(data)) {
          result = data.map(function(data) {
            return _(data, stack);
          });
        } else {
          result = {};
          Object.keys(data).forEach(function(key) {
            result[key] = _(data[key], stack);
          });
        }
        stack.pop();
      } else {
        result = data;
      }
      return result;
    };
    return function(data) {
      return _(data, []);
    };
  })();
  
  var install = function() {
    var server = cc.server = new SynthServer();
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
    server.send(["/connect"]);
    if (typeof global.console === "undefined") {
      global.console = (function() {
        var console = {};
        ["log", "debug", "info", "warn", "error"].forEach(function(method) {
          console[method] = function() {
            server.send(["/console/" + method, Array.prototype.slice.call(arguments)]);
          };
        });
        return console;
      })();
    }
  };
  
  module.exports = {
    SynthServer: SynthServer,
    Rate: Rate,
    install: install
  };

});
