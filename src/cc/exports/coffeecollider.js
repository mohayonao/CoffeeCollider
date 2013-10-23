define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var SoundSystem = require("../common/soundsystem").SoundSystem;
  var Compiler = require("./compiler").Compiler;
  var unpack   = require("../common/pack").unpack;
  var commands = {};
  var slice    = [].slice;
  
  var instance = null;
  
  var CoffeeCollider = (function() {
    function CoffeeCollider() {
      if (instance) {
        return instance;
      }
      instance = this;
      this.version    = cc.version;
      this.impl       = new CoffeeColliderImpl();
      this.sampleRate = this.impl.sampleRate;
      this.channels   = this.impl.channels;
      this.compiler   = this.impl.compiler;
    }
    CoffeeCollider.prototype.play = function() {
      this.impl.play();
      return this;
    };
    CoffeeCollider.prototype.reset = function() {
      this.impl.reset();
      return this;
    };
    CoffeeCollider.prototype.pause = function() {
      this.impl.pause();
      return this;
    };
    CoffeeCollider.prototype.execute = function() {
      this.impl.execute.apply(this.impl, arguments);
      return this;
    };
    CoffeeCollider.prototype.getStream = function() {
      return this.impl.strm;
    };
    CoffeeCollider.prototype.importScripts = function() {
      this.impl.importScripts(slice.call(arguments));
      return this;
    };
    return CoffeeCollider;
  })();

  var CoffeeColliderImpl = (function() {
    function CoffeeColliderImpl() {
      var that = this;
      this.worker = new Worker(cc.coffeeColliderPath);
      this.worker.addEventListener("message", function(e) {
        that.recvFromClient(e.data);
      });
      this.compiler = new Compiler();
      
      this.isConnected = false;
      this.isPlaying   = false;
      this.execId = 0;
      this.execCallbacks = {};

      this.sys = new SoundSystem(this);
      this.sampleRate = this.sys.sampleRate;
      this.channels   = this.sys.channels;
      this.strmLength = this.sys.strmLength;
      this.bufLength  = this.sys.bufLength;
      this.strm = new Float32Array(this.strmLength * this.channels);
      this.strmList = new Array(8);
      this.strmListReadIndex  = 0;
      this.strmListWriteIndex = 0;
      
      var syncItems = this.syncItems = new Float32Array(C.SYNC_ITEM_LEN);
      window.addEventListener("mousemove", function(e) {
        syncItems[C.POS_X] = e.pageX / window.innerWidth;
        syncItems[C.POS_Y] = e.pageY / window.innerHeight;
      }, false);
      window.addEventListener("mousedown", function() {
        syncItems[C.BUTTON] = 1;
      }, false);
      window.addEventListener("mouseup", function() {
        syncItems[C.BUTTON] = 0;
      }, false);
    }
    CoffeeColliderImpl.prototype.play = function() {
      if (!this.isPlaying) {
        this.isPlaying = true;
        var strm = this.strm;
        for (var i = 0, imax = strm.length; i < imax; ++i) {
          strm[i] = 0;
        }
        this.strmList.splice(0);
        this.strmListReadIndex  = 0;
        this.strmListWriteIndex = 0;
        this.sys.play();
        this.sendToClient(["/play"]);
      }
    };
    CoffeeColliderImpl.prototype.reset = function() {
      this.execId = 0;
      this.execCallbacks = {};
      var strm = this.strm;
      for (var i = 0, imax = strm.length; i < imax; ++i) {
        strm[i] = 0;
      }
      this.strmList.splice(0);
      this.strmListReadIndex  = 0;
      this.strmListWriteIndex = 0;
      this.sendToClient(["/reset"]);
    };
    CoffeeColliderImpl.prototype.pause = function() {
      if (this.isPlaying) {
        this.sendToClient(["/pause"]);
        this.sys.pause();
        this.isPlaying = false;
      }
    };
    CoffeeColliderImpl.prototype.process = function() {
      var strm = this.strmList[this.strmListReadIndex];
      if (strm) {
        this.strmListReadIndex = (this.strmListReadIndex + 1) & 7;
        this.strm.set(strm);
      }
      this.sendToClient(this.syncItems);
    };
    CoffeeColliderImpl.prototype.execute = function(code) {
      var append, callback;
      var i = 1;
      if (typeof arguments[i] === "boolean") {
        append = arguments[i++];
      } else {
        append = false;
      }
      if (typeof arguments[i] === "function") {
        callback = arguments[i++];
      }
      if (typeof code === "string") {
        code = this.compiler.compile(code.trim());
        this.sendToClient([
          "/execute", this.execId, code, append, this.compiler.data, !!callback
        ]);
        if (callback) {
          this.execCallbacks[this.execId] = callback;
        }
        this.execId += 1;
      }
    };
    CoffeeColliderImpl.prototype.importScripts = function(list) {
      this.sendToClient(["/importScripts", list]);
    };
    CoffeeColliderImpl.prototype.sendToClient = function(msg) {
      this.worker.postMessage(msg);
    };
    CoffeeColliderImpl.prototype.recvFromClient = function(msg) {
      if (msg instanceof Float32Array) {
        this.strmList[this.strmListWriteIndex] = msg;
        this.strmListWriteIndex = (this.strmListWriteIndex + 1) & 7;
        return;
      }
      if (msg) {
        var func = commands[msg[0]];
        if (func) {
          func.call(this, msg);
        }
      }
    };
    CoffeeColliderImpl.prototype.readAudioFile = function(path, callback) {
      var api = this.sys.api;
      if (!api.decodeAudioFile) {
        callback(null);
        return;
      }
      var decode = function(buffer) {
        api.decodeAudioFile(buffer, function(buffer) {
          callback(buffer);
        });
      };
      var xhr = new XMLHttpRequest();
      xhr.open("GET", path);
      xhr.responseType = "arraybuffer";
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status === 200 && xhr.response) {
            if (callback) {
              decode(xhr.response);
            }
          } else {
            callback(null);
          }
        }
      };
      xhr.send();
    };
    return CoffeeColliderImpl;
  })();
  
  commands["/connect"] = function() {
    this.isConnected = true;
    // if the server in the local
    this.sendToClient([
      "/init", this.sampleRate, this.channels, this.strmLength, this.bufLength
    ]);
    // else if using websocket-server
    // TODO:
  };
  commands["/execute"] = function(msg) {
    var execId = msg[1];
    var result = msg[2];
    var callback = this.execCallbacks[execId];
    if (callback) {
      if (result !== undefined) {
        result = unpack(result);
      }
      callback(result);
      delete this.execCallbacks[execId];
    }
  };
  commands["/buffer/request"] = function(msg) {
    var that = this;
    var requestId = msg[2];
    this.readAudioFile(msg[1], function(buffer) {
      that.sendToClient(["/buffer/response", buffer, requestId]);
    });
  };
  commands["/console/log"] = function(msg) {
    console.log.apply(console, unpack(msg[1]));
  };
  commands["/console/debug"] = function(msg) {
    console.debug.apply(console, unpack(msg[1]));
  };
  commands["/console/info"] = function(msg) {
    console.info.apply(console, unpack(msg[1]));
  };
  commands["/console/warn"] = function(msg) {
    console.warn.apply(console, unpack(msg[1]));
  };
  commands["/console/error"] = function(msg) {
    console.error.apply(console, unpack(msg[1]));
  };
  
  module.exports = {
    CoffeeCollider: CoffeeCollider
  };

});
