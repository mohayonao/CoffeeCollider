define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var extend = require("../common/extend");
  var pack = require("../common/pack").pack;
  var Timer    = require("../common/timer").Timer;
  var Userspace = require("./userspace").Userspace;
  var commands  = {};
  
  var SynthServer = (function() {
    function SynthServer() {
      this.sampleRate = 44100;
      this.channels   = 2;
      this.strmLength = 1024;
      this.bufLength  = 64;
      this.userspace = new Userspace();
      this.timer = new Timer();
      this.processed = 0;
      this.processStart    = 0;
      this.processInterval = 0;
    }
    
    SynthServer.prototype.sendToClient = function() {
      // should be overridden
    };
    SynthServer.prototype.recvFromClient = function(msg) {
      if (msg instanceof Float32Array) {
        this.userspace.setSyncItems(msg[0], msg);
        return;
      }
      if (msg) {
        var func = commands[msg[0]];
        if (func) {
          func.call(this, msg);
        }
      }
    };
    SynthServer.prototype.connect = function() {
      // should be overridden
    };
    SynthServer.prototype.init = function(msg) {
      this.sampleRate = msg[1]|0;
      this.channels   = msg[2]|0;
      this.strmLength = msg[3]|0;
      this.bufLength  = msg[4]|0;
      this.strm  = new Float32Array(this.strmLength * this.channels);
      this.rates = {};
      this.rates[C.AUDIO  ] = new Rate(this.sampleRate, this.bufLength);
      this.rates[C.CONTROL] = new Rate(this.sampleRate / this.bufLength, 1);
      var busLength  = this.bufLength * C.AUDIO_BUS_LEN + C.CONTROL_BUS_LEN;
      var busBuffer  = new Float32Array(busLength);
      var bufLength  = this.bufLength;
      var bufLength4 = this.bufLength << 2;
      this.busBuffer = busBuffer;
      this.busClear  = new Float32Array(busLength);
      this.busOutL   = new Float32Array(busBuffer.buffer, 0         , bufLength);
      this.busOutR   = new Float32Array(busBuffer.buffer, bufLength4, bufLength);
    };
    SynthServer.prototype.play = function(msg) {
      if (!this.timer.isRunning) {
        var userId = msg[1]|0;
        this.userspace.play(userId);
        this.processStart = Date.now();
        this.processDone  = 0;
        this.processInterval = (this.strmLength / this.sampleRate) * 1000;
        this.timer.start(this.process.bind(this), 10);
      }
    };
    SynthServer.prototype.pause = function(msg) {
      if (this.timer.isRunning) {
        var userId = msg[1]|0;
        this.userspace.pause(userId);
        this.timer.stop();
      }
    };
    SynthServer.prototype.reset = function(msg) {
      var userId = msg[1]|0;
      this.userspace.reset(userId);
    };
    SynthServer.prototype.getRate = function(rate) {
      return this.rates[rate] || this.rates[C.CONTROL];
    };
    SynthServer.prototype.process = function() {
      // should be overridden
    };
    SynthServer.prototype.command = function(msg) {
      var userId   = msg[1]|0;
      var timeline = msg[2];
      this.userspace.setTimeline(userId, timeline);
    };
    
    return SynthServer;
  })();
  
  
  var WorkerSynthServer = (function() {
    function WorkerSynthServer() {
      SynthServer.call(this);
      this.offset = 0;
    }
    extend(WorkerSynthServer, SynthServer);
    
    WorkerSynthServer.prototype.sendToClient = function(msg) {
      postMessage(msg);
    };
    WorkerSynthServer.prototype.connect = function() {
      this.userspace.append(0);
      this.sendToClient([
        "/connect", this.sampleRate, this.channels, this.strmLength, this.bufLength
      ]);
    };
    WorkerSynthServer.prototype.process = function() {
      if (this.processDone - 25 > Date.now() - this.processStart) {
        return;
      }
      var strm = this.strm;
      var busBuffer  = this.busBuffer;
      var busClear   = this.busClear;
      var userspace  = this.userspace;
      var strmLength = this.strmLength;
      var bufLength  = this.bufLength;
      var busOutL = this.busOutL;
      var busOutR = this.busOutR;
      var client = cc.client;
      var offset = 0;
      for (var i = 0, imax = strmLength / bufLength; i < imax; ++i) {
        client.process();
        busBuffer.set(busClear);
        userspace.process(bufLength, 0);
        strm.set(busOutL, offset);
        strm.set(busOutR, offset + strmLength);
        offset += bufLength;
      }
      this.sendToClient(strm);
      this.processDone += this.processInterval;
    };
    
    return WorkerSynthServer;
  })();
  
  
  var IFrameSynthServer = (function() {
    function IFrameSynthServer() {
      WorkerSynthServer.call(this);
      this.strmLength = 2048;
      this.bufLength  = 128;
    }
    extend(IFrameSynthServer, WorkerSynthServer);
    
    IFrameSynthServer.prototype.process = function() {
      if (this.processDone - 25 > Date.now() - this.processStart) {
        return;
      }
      var strm = this.strm;
      var busBuffer  = this.busBuffer;
      var busClear   = this.busClear;
      var userspace  = this.userspace;
      var strmLength = this.strmLength;
      var bufLength  = this.bufLength;
      var busOutL = this.busOutL;
      var busOutR = this.busOutR;
      var offset = 0;
      for (var i = 0, imax = strmLength / bufLength; i < imax; ++i) {
        busBuffer.set(busClear);
        userspace.process(bufLength, i);
        strm.set(busOutL, offset);
        strm.set(busOutR, offset + strmLength);
        offset += bufLength;
      }
      this.sendToClient(strm);
      this.sendToClient(["/process"]);
      this.processDone += this.processInterval;
    };
    
    return IFrameSynthServer;
  })();


  var SocketSynthServer = (function() {
    function SocketSynthServer() {
      SynthServer.call(this);
    }
    extend(SocketSynthServer, SynthServer);
    
    return SocketSynthServer;
  })();
  
  commands["/init"] = function(msg) {
    this.init(msg);
  };
  commands["/play"] = function(msg) {
    this.play(msg);
  };
  commands["/pause"] = function(msg) {
    this.pause(msg);
  };
  commands["/reset"] = function(msg) {
    this.reset(msg);
  };
  commands["/command"] = function(msg) {
    this.command(msg);
  };
  
  var Rate = (function() {
    var twopi = 2 * Math.PI;
    function Rate(sampleRate, bufLength) {
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
  
  var install = function() {
    var server;
    switch (cc.opmode) {
    case "socket":
      server = new SocketSynthServer();
      break;
    case "iframe":
      server = new IFrameSynthServer();
      global.onmessage = function(e) {
        server.recvFromClient(e.data);
      };
      break;
    default: // "worker"
      server = new WorkerSynthServer();
    }
    cc.server = server;
    
    if (typeof global.console === "undefined") {
      global.console = (function() {
        var console = {};
        ["log", "debug", "info", "warn", "error"].forEach(function(method) {
          console[method] = function() {
            var args = Array.prototype.slice.call(arguments).map(function(x) {
              return pack(x);
            });
            server.sendToClient(["/console/" + method, args]);
          };
        });
        return console;
      })();
    }
  };
  
  module.exports = {
    install: install
  };

});
