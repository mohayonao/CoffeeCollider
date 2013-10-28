define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var extend = require("../common/extend");
  var pack  = require("../common/pack").pack;
  var Timer = require("../common/timer").Timer;
  var Emitter = require("../common/emitter").Emitter;
  var InstanceManager = require("./instance").InstanceManager;
  var commands = {};
  
  var SynthServer = (function() {
    function SynthServer() {
      this.sampleRate = 0;
      this.channels   = 0;
      this.strmLength = 0;
      this.bufLength  = 0;
      this.instanceManager = new InstanceManager();
      this.strm = null;
      this.timer = new Timer();
      this.processed = 0;
      this.processStart    = 0;
      this.processInterval = 0;
      this.initialized = false;
    }
    
    SynthServer.prototype.sendToClient = function() {
      throw "should be overridden";
    };
    SynthServer.prototype.recvFromClient = function(msg, userId) {
      userId = userId|0;
      if (msg instanceof Uint8Array) {
        this.instanceManager.doBinayCommand(userId, msg);
      } else {
        var func = commands[msg[0]];
        if (func) {
          func.call(this, msg, userId);
        } else {
          throw new Error("Unknown command: " + msg[0]);
        }
      }
    };
    SynthServer.prototype.connect = function() {
      throw "should be overridden";
    };
    SynthServer.prototype.init = function(msg) {
      if (!this.initialized) {
        this.initialized = true;
        if (msg) {
          this.sampleRate = msg[1]|0;
          this.channels   = msg[2]|0;
        }
        this.strm  = new Int16Array(this.strmLength * this.channels);
        this.rates = {};
        this.rates[C.AUDIO  ] = new Rate(this.sampleRate, this.bufLength);
        this.rates[C.CONTROL] = new Rate(this.sampleRate / this.bufLength, 1);
        this.instanceManager.init(this);
        this.instanceManager.append(0);
      }
    };
    SynthServer.prototype.play = function(msg, userId) {
      userId = userId|0;
      this.instanceManager.play(userId);
      if (!this.timer.isRunning()) {
        this.processStart = Date.now();
        this.processDone  = 0;
        this.processInterval = (this.strmLength / this.sampleRate) * 1000;
        this.timer.start(this.process.bind(this), 10);
      }
    };
    SynthServer.prototype.pause = function(msg, userId) {
      userId = userId|0;
      this.instanceManager.pause(userId);
      if (this.timer.isRunning()) {
        if (!this.instanceManager.isRunning()) {
          this.timer.stop();
        }
      }
    };
    SynthServer.prototype.reset = function(msg, userId) {
      userId = userId|0;
      this.instanceManager.reset(userId);
    };
    SynthServer.prototype.getRate = function(rate) {
      return this.rates[rate] || this.rates[C.CONTROL];
    };
    SynthServer.prototype.process = function() {
      throw "should be overridden";
    };
    SynthServer.prototype.pushToTimeline = function(msg, userId) {
      userId = userId|0;
      var timeline = msg[1];
      this.instanceManager.pushToTimeline(userId, timeline);
    };
    
    return SynthServer;
  })();
  
  
  var WorkerSynthServer = (function() {
    function WorkerSynthServer() {
      SynthServer.call(this);
      this.sampleRate = C.WORKER_SAMPLERATE;
      this.channels   = C.WORKER_CHANNELS;
      this.strmLength = C.WORKER_STRM_LENGTH;
      this.bufLength  = C.WORKER_BUF_LENGTH;
      this.offset = 0;
    }
    extend(WorkerSynthServer, SynthServer);
    
    WorkerSynthServer.prototype.sendToClient = function(msg) {
      postMessage(msg);
    };
    WorkerSynthServer.prototype.connect = function() {
      this.sendToClient([
        "/connected", this.sampleRate, this.channels
      ]);
    };
    WorkerSynthServer.prototype.process = function() {
      if (this.processDone - 25 > Date.now() - this.processStart) {
        return;
      }
      var strm = this.strm;
      var instanceManager = this.instanceManager;
      var strmLength = this.strmLength;
      var bufLength  = this.bufLength;
      var busOutL = instanceManager.busOutL;
      var busOutR = instanceManager.busOutR;
      var client = cc.client;
      var offset = 0;
      for (var i = 0, imax = strmLength / bufLength; i < imax; ++i) {
        client.process();
        instanceManager.process(bufLength);
        var j = bufLength, k = strmLength + bufLength;
        while (k--, j--) {
          strm[j + offset] = Math.max(-32768, Math.min(busOutL[j] * 32768, 32767));
          strm[k + offset] = Math.max(-32768, Math.min(busOutR[j] * 32768, 32767));
        }
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
      this.sampleRate = C.IFRAME_SAMPLERATE;
      this.channels   = C.IFRAME_CHANNELS;
      this.strmLength = C.IFRAME_STRM_LENGTH;
      this.bufLength  = C.IFRAME_BUF_LENGTH;
    }
    extend(IFrameSynthServer, WorkerSynthServer);
    
    IFrameSynthServer.prototype.sendToClient = function(msg) {
      postMessage(msg);
    };
    IFrameSynthServer.prototype.connect = function() {
      this.sendToClient([
        "/connected", this.sampleRate, this.channels
      ]);
    };
    IFrameSynthServer.prototype.process = function() {
      if (this.processDone - 25 > Date.now() - this.processStart) {
        return;
      }
      var strm = this.strm;
      var instanceManager = this.instanceManager;
      var strmLength = this.strmLength;
      var bufLength  = this.bufLength;
      var busOutL = instanceManager.busOutL;
      var busOutR = instanceManager.busOutR;
      var offset = 0;
      for (var i = 0, imax = strmLength / bufLength; i < imax; ++i) {
        instanceManager.process(bufLength);
        var j = bufLength, k = strmLength + bufLength;
        while (k--, j--) {
          strm[j + offset] = Math.max(-32768, Math.min(busOutL[j] * 32768, 32767));
          strm[k + offset] = Math.max(-32768, Math.min(busOutR[j] * 32768, 32767));
        }
        offset += bufLength;
      }
      this.sendToClient(strm);
      this.sendToClient(["/process"]);
      this.processDone += this.processInterval;
    };
    
    return IFrameSynthServer;
  })();


  var SocketSynthServer = (function() {
    var WebSocketServer;
    if (global.require) {
      WebSocketServer = global.require("ws").Server;
    }
    var AudioAPI = require("../common/audioapi").AudioAPI;
    function SocketSynthServer() {
      SynthServer.call(this);
      this.sampleRate = C.SOCKET_SAMPLERATE;
      this.channels   = C.SOCKET_CHANNELS;
      this.strmLength = C.SOCKET_STRM_LENGTH;
      this.bufLength  = C.SOCKET_BUF_LENGTH;
      this.list = [];
      this.map  = {};
      this.exports = null; // bind after
    }
    extend(SocketSynthServer, SynthServer);
    
    SocketSynthServer.prototype._init = function(opts) {
      var that = this;
      var _userId = 0;
      var exports = this.exports;
      if (typeof opts.speaker !== "undefined") {
        if (opts.speaker) {
          this.api = new AudioAPI(this);
        }
        delete opts.speaker;
      }
      this.socket = new WebSocketServer(opts);
      this.socket.on("connection", function(ws) {
        var userId = _userId++;
        that.list.push(ws);
        that.map[userId] = ws;
        that.instanceManager.append(userId);
        ws.on("message", function(msg) {
          // receive a message from the client
          if (typeof msg !== "string") {
            msg = new Uint8Array(msg);
          } else {
            msg = JSON.parse(msg);
          }
          that.recvFromClient(msg, userId);
        });
        ws.on("close", function() {
          if (that.map[userId]) {
            that.pause([], userId);
            that.instanceManager.remove(userId);
            that.list.splice(that.list.indexOf(ws), 1);
            delete that.map[userId];
          }
          exports.emit("close", userId);
        });
        ws.on("error", function(e) {
          exports.emit("error", userId, e);
        });
        that.sendToClient([
          "/connected", that.sampleRate, that.channels
        ], userId);
        exports.emit("open", userId);
      });
      this.init();
    };
    SocketSynthServer.prototype.connect = function() {
    };
    SocketSynthServer.prototype.sendToClient = function(msg, userId) {
      if (msg instanceof Int16Array) {
        this.list.forEach(function(ws) {
          if (ws.readyState === 1) {
            ws.send(msg.buffer, {binary:true, mask:false});
          }
        });
      } else {
        msg = JSON.stringify(msg);
        if (userId === undefined) {
          this.list.forEach(function(ws) {
            if (ws.readyState === 1) {
              ws.send(msg);
            }
          });
        } else {
          var ws = this.map[userId];
          if (ws && ws.readyState === 1) {
            ws.send(msg);
          }
        }
      }
    };
    SocketSynthServer.prototype.play = function(msg, userId) {
      userId = userId|0;
      this.instanceManager.play(userId);
      if (this.api) {
        this._strm = new Int16Array(this.strmLength * this.channels);
        this.strmList = new Array(8);
        this.strmListReadIndex  = 0;
        this.strmListWriteIndex = 0;
        if (!this.api.isPlaying) {
          this.api.play();
        }
      }
      if (!this.timer.isRunning()) {
        this.processStart = Date.now();
        this.processDone  = 0;
        this.processInterval = (this.strmLength / this.sampleRate) * 1000;
        this.timer.start(this.process.bind(this), 10);
      }
    };
    SocketSynthServer.prototype.pause = function(msg, userId) {
      userId = userId|0;
      this.instanceManager.pause(userId);
      if (this.api) {
        if (this.api.isPlaying) {
          if (!this.instanceManager.isRunning()) {
            this.api.pause();
          }
        }
      }
      if (this.timer.isRunning()) {
        if (!this.instanceManager.isRunning()) {
          this.timer.stop();
        }
      }
    };
    SocketSynthServer.prototype.process = function() {
      if (this.processDone - 25 > Date.now() - this.processStart) {
        return;
      }
      var strm = this.strm;
      var instanceManager = this.instanceManager;
      var strmLength = this.strmLength;
      var bufLength  = this.bufLength;
      var busOutL = instanceManager.busOutL;
      var busOutR = instanceManager.busOutR;
      var offset = 0;
      for (var i = 0, imax = strmLength / bufLength; i < imax; ++i) {
        instanceManager.process(bufLength);
        var j = bufLength, k = strmLength + bufLength;
        while (k--, j--) {
          strm[j + offset] = Math.max(-32768, Math.min(busOutL[j] * 32768, 32767));
          strm[k + offset] = Math.max(-32768, Math.min(busOutR[j] * 32768, 32767));
        }
        offset += bufLength;
      }
      this.sendToClient(strm);
      this.sendToClient(["/process"]);
      this.processDone += this.processInterval;

      if (this.api) {
        this.strmList[this.strmListWriteIndex] = new Int16Array(strm);
        this.strmListWriteIndex = (this.strmListWriteIndex + 1) & 7;
      }
    };
    SocketSynthServer.prototype._process = function() {
      var strm = this.strmList[this.strmListReadIndex];
      if (strm) {
        this.strmListReadIndex = (this.strmListReadIndex + 1) & 7;
        this._strm.set(strm);
      }
    };
    
    return SocketSynthServer;
  })();

  var SocketSynthServerExports = (function() {
    var instance = null;
    function SocketSynthServerExports(server, opts) {
      if (instance) {
        console.warn("CoffeeColliderSocketServer has been created already.");
        return instance;
      }
      Emitter.bind(this);
      this.server = server;
      this.server.exports = this;
      this.server._init(opts||{});
      instance = this;
    }
    SocketSynthServerExports.prototype.send = function(msg, userId) {
      this.server.sendToClient([
        "/socket/sendToIF", msg
      ], userId);
      return this;
    };
    return SocketSynthServerExports;
  })();
  
  commands["/init"] = function(msg, userId) {
    this.init(msg, userId);
  };
  commands["/play"] = function(msg, userId) {
    this.play(msg, userId);
  };
  commands["/pause"] = function(msg, userId) {
    this.pause(msg, userId);
  };
  commands["/reset"] = function(msg, userId) {
    this.reset(msg, userId);
  };
  commands["/processed"] = function(msg, userId) {
    this.pushToTimeline(msg, userId);
  };
  commands["/socket/sendToServer"] = function(msg, userId) {
    // receive a message from the client-interface via the client
    if (this.exports) {
      msg = msg[1];
      msg.userId = userId;
      this.exports.emit("message", msg);
    }
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
      server.exports = {
        createServer: function(opts) {
          return new SocketSynthServerExports(server, opts);
        }
      };
      break;
    case "iframe":
      server = new IFrameSynthServer();
      global.onmessage = function(e) {
        server.recvFromClient(e.data, 0);
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
