define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var extend = require("../common/extend");
  var emitter = require("../common/emitter");
  
  var WorldManager = (function() {
    function WorldManager() {
      this.map  = {};
      this.list = [];
      this.server = null;
      this.process = process0;
    }
    
    WorldManager.prototype.append = function(userId) {
      if (!this.map[userId]) {
        var world = cc.createWorld(userId);
        this.map[userId] = world;
        this.list.push(world);
        if (this.list.length === 1) {
          this.process = process1;
        } else {
          this.process = processN;
        }
      }
      return this.map[userId];
    };
    WorldManager.prototype.remove = function(userId) {
      var world = this.map[userId];
      if (world) {
        this.list.splice(this.list.indexOf(world), 1);
        delete this.map[userId];
        if (this.list.length === 1) {
          this.process = process1;
        } else if (this.list.length === 0) {
          this.process = process0;
        }
      }
    };
    WorldManager.prototype.run = function(flag, userId) {
      var world = this.map[userId];
      if (world) {
        world.run(flag);
      }
    };
    WorldManager.prototype.reset = function(userId) {
      var world = this.map[userId];
      if (world) {
        world.reset();
      }
    };
    WorldManager.prototype.isRunning = function() {
      return this.list.some(function(world) {
        return world.isRunning();
      });
    };
    WorldManager.prototype.pushToTimeline = function(timeline, userId) {
      var world = this.map[userId];
      if (world) {
        world.pushToTimeline(timeline);
      }
    };
    WorldManager.prototype.doBinayCommand = function(binary, userId) {
      var world = this.map[userId];
      if (world) {
        world.doBinayCommand(binary);
      }
    };
    
    var process0 = function() {
      cc.server.busOut.set(cc.server.busClear);
    };
    var process1 = function(bufLength) {
      this.list[0].process(bufLength);
      cc.server.busOut.set(this.list[0].bus);
    };
    var processN = function(bufLength) {
      var list = this.list;
      var busOut    = cc.server.busOut;
      var busOutLen = cc.server.busOutLen;
      var world;
      busOut.set(cc.server.busClear);
      for (var i = 0, imax = list.length; i < imax; ++i) {
        world = list[i];
        world.process(bufLength);
        var inBus = world.bus;
        var inAmp = world.busAmp;
        for (var j = busOutLen; j--; ) {
          busOut[j] += inBus[j] * inAmp;
        }
      }
    };
    
    return WorldManager;
  })();

  var SocketSynthServer = (function() {
    var WebSocketServer;
    if (global.require) {
      WebSocketServer = global.require("ws").Server;
    }
    function SocketSynthServer() {
      cc.NodeJSSynthServer.call(this);
      this.sampleRate = C.SOCKET_SAMPLERATE;
      this.channels   = C.SOCKET_CHANNELS;
      this.strmLength = C.SOCKET_STRM_LENGTH;
      this.bufLength  = C.SOCKET_BUF_LENGTH;
      this.world   = new WorldManager();
      this.list = [];
      this.map  = {};
      this.exports = null; // bind after
    }
    extend(SocketSynthServer, cc.NodeJSSynthServer);
    
    SocketSynthServer.prototype._init = function(opts) {
      var that = this;
      var _userId = 0;
      var exports = this.exports;
      if (typeof opts.speaker !== "undefined") {
        if (opts.speaker) {
          this.api = cc.createAudioAPI(this);
        }
        delete opts.speaker;
      }
      this.socket = new WebSocketServer(opts);
      this.socket.on("connection", function(ws) {
        var userId = _userId++;
        that.list.push(ws);
        that.map[userId] = ws;
        that.world.append(userId);
        ws.on("message", function(msg) {
          // receive a message from the lang
          if (typeof msg !== "string") {
            msg = new Uint8Array(msg);
          } else {
            msg = JSON.parse(msg);
          }
          that.recvFromLang(msg, userId);
        });
        ws.on("close", function() {
          if (that.map[userId]) {
            that.pause([], userId);
            that.world.remove(userId);
            that.list.splice(that.list.indexOf(ws), 1);
            delete that.map[userId];
          }
          exports.emit("close", userId);
        });
        ws.on("error", function(e) {
          exports.emit("error", userId, e);
        });
        that.sendToLang([
          "/connected", that.sampleRate, that.channels
        ], userId);
        exports.emit("open", userId);
      });
      this.init();
    };
    SocketSynthServer.prototype.connect = function() {
    };
    SocketSynthServer.prototype.sendToLang = function(msg, userId) {
      if (msg instanceof Float32Array) {
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
    SocketSynthServer.prototype.process = function() {
      if (this.sysSyncCount < this.syncCount - C.STRM_FORWARD_PROCESSING) {
        return;
      }
      var strm = this.strm;
      var world = this.world;
      var strmLength = this.strmLength;
      var bufLength  = this.bufLength;
      var busOutL = this.busOutL;
      var busOutR = this.busOutR;
      var offsetL = 0;
      var offsetR = strmLength;
      for (var i = 0, imax = strmLength / bufLength; i < imax; ++i) {
        world.process(bufLength);
        strm.set(busOutL, offsetL);
        strm.set(busOutR, offsetR);
        offsetL += bufLength;
        offsetR += bufLength;
      }
      this.sendToLang(strm);
      this.sendToLang(["/process"]);
      this.syncCount += 1;
      
      if (this.api) {
        this.strmList[this.strmListWriteIndex] = new Float32Array(strm);
        this.strmListWriteIndex = (this.strmListWriteIndex + 1) & C.STRM_LIST_MASK;
      }
    };
    
    return SocketSynthServer;
  })();

  var SocketSynthServerExports = (function() {
    var singleton = null;
    function SocketSynthServerExports(server, opts) {
      if (singleton) {
        return singleton;
      }
      emitter.mixin(this);
      this.server = server;
      this.server.exports = this;
      this.server._init(opts||{});
      singleton = this;
    }
    SocketSynthServerExports.prototype.send = function(msg, userId) {
      this.server.sendToLang([
        "/socket/sendToClient", msg
      ], userId);
      return this;
    };
    return SocketSynthServerExports;
  })();
  
  cc.createSocketSynthServer = function() {
    var server = new SocketSynthServer();
    server.exports = {
      createServer: function(opts) {
        return new SocketSynthServerExports(server, opts);
      }
    };
    cc.opmode = "socket";
    return server;
  };
  
  module.exports = {
    WorldManager: WorldManager
  };

});
  
