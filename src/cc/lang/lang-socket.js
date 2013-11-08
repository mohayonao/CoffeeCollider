define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var extend = require("../common/extend");
  var onmessage = require("./utils").lang_onmessage;
  
  var SocketSynthLang = (function() {
    require("../common/browser");
    
    function SocketSynthLang() {
      cc.opmode = "nodejs";
      
      cc.SynthLang.call(this);
      
      this.sampleRate = C.SOCKET_SAMPLERATE;
      this.channels   = C.SOCKET_CHANNELS;
      this.strmLength = C.SOCKET_STRM_LENGTH;
      this.bufLength  = C.SOCKET_BUF_LENGTH;
      this.socketPath = null;
    }
    extend(SocketSynthLang, cc.SynthLang);
    
    SocketSynthLang.prototype.process = function() {
      this.taskManager.process();
      var timelineResult = this.timelineResult.splice(0);
      this.sendToServer(["/processed", timelineResult]);
    };
    
    SocketSynthLang.prototype.openSocket = function() {
      var that = this;
      var socket   = this.socket = cc.createWebSocket(this.socketPath);
      var pendings = [];
      socket.binaryType = "arraybuffer";
      socket.onopen = function() {
        pendings.forEach(function(msg) {
          socket.send(msg);
        });
        pendings = [];
      };
      socket.onmessage = function(e) {
        // receive a message from the socket-server
        var msg = e.data;
        if (typeof msg !== "string") {
          that.sendToClient(new Int16Array(msg));
          return;
        }
        that.recvFromServer(JSON.parse(msg));
      };
      socket.onclose = function() {
      };
      socket.onerror = function() {
      };
      this.sendToServer = function(msg) {
        if (msg instanceof Uint8Array) {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(msg.buffer);
          }
        } else {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(msg));
          } else {
            pendings.push(JSON.stringify(msg));
          }
        }
      };
    };
    SocketSynthLang.prototype.closeSocket = function() {
      this.socket.close();
      this.socket = null;
    };
    
    SocketSynthLang.prototype.process = function() {
      var taskManager = this.taskManager;
      var n = this.strmLength / this.bufLength;
      var timelineResult = [];
      while (n--) {
        taskManager.process();
        timelineResult = timelineResult.concat(
          this.timelineResult.splice(0), C.DO_NOTHING
        );
      }
      this.sendToServer(["/processed", timelineResult]);
    };

    SocketSynthLang.prototype.extendCommands = function(commands) {
      commands["/socket/open"] = function() {
        this.openSocket();
      };
      commands["/socket/close"] = function() {
        this.closeSocket();
      };
      commands["/socket/sendToServer"] = function(msg) {
        // receive a message from the lang-interface
        this.sendToServer(msg);
      };
      commands["/socket/sendToClient"] = function(msg) {
        // receive a message from the lang-interface
        this.sendToClient(msg);
      };
    };
    
    return SocketSynthLang;
  })();
  
  module.exports = {
    use: function() {
      cc.createSocketSynthLang = function() {
        var lang = new SocketSynthLang();
        if (typeof window !== "undefined") {
          window.onmessage = function(e) {
            e.ports[0].onmessage = onmessage;
            lang.sendToClient = function(msg) {
              e.ports[0].postMessage(msg);
            };
            lang.socketPath = e.data;
            window.onmessage = null;
          };
        }
        cc.opmode = "socket";
        return lang;
      };
    }
  };

  module.exports.use();

});
