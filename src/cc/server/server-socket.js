define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var extend = require("../common/extend");
  var emitter = require("../common/emitter");
  
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
        that.instanceManager.append(userId);
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
            that.instanceManager.remove(userId);
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
    SocketSynthServer.prototype.process = function() {
      if (this.sysSyncCount < this.syncCount - C.STRM_FORWARD_PROCESSING) {
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
      this.sendToLang(strm);
      this.sendToLang(["/process"]);
      this.syncCount += 1;
      
      if (this.api) {
        this.strmList[this.strmListWriteIndex] = new Int16Array(strm);
        this.strmListWriteIndex = (this.strmListWriteIndex + 1) & C.STRM_LIST_MASK;
      }
    };
    
    return SocketSynthServer;
  })();

  var SocketSynthServerExports = (function() {
    var instance = null;
    function SocketSynthServerExports(server, opts) {
      if (instance) {
        return instance;
      }
      emitter.mixin(this);
      this.server = server;
      this.server.exports = this;
      this.server._init(opts||{});
      instance = this;
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
  
  module.exports = {};

});
  
