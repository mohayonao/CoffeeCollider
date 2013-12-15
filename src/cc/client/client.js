define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var emitter  = require("../common/emitter");
  var unpack   = require("../common/pack").unpack;
  var commands = {};
  var slice    = [].slice;
  
  var SynthClient = (function() {
    function SynthClient(opts) {
      opts = opts || {};
      
      this.version = cc.version;
      if (opts.socket) {
        this.impl = cc.createSynthClientSocketImpl(this, opts);
      } else if (opts.nodejs) {
        this.impl = cc.createSynthClientNodeJSImpl(this, opts);
      } else {
        this.impl = cc.createSynthClientWorkerImpl(this, opts);
      }
      this.sampleRate = this.impl.sampleRate;
      this.channels   = this.impl.channels;
    }
    
    SynthClient.prototype.play = function() {
      this.impl.play.apply(this.impl, arguments);
      return this;
    };
    SynthClient.prototype.pause = function() {
      this.impl.pause.apply(this.impl, arguments);
      return this;
    };
    SynthClient.prototype.reset = function() {
      this.impl.reset.apply(this.impl, arguments);
      return this;
    };
    SynthClient.prototype.execute = function() {
      this.impl.execute.apply(this.impl, arguments);
      return this;
    };
    SynthClient.prototype.compile = function() {
      return this.impl.compile.apply(this.impl, arguments);
    };
    SynthClient.prototype.getStream = function() {
      return this.impl.getStream.apply(this.impl, arguments);
    };
    SynthClient.prototype.getWebAudioComponents = function() {
      return this.impl.getWebAudioComponents.apply(this.impl, arguments);
    };

    SynthClient.prototype.getListeners = function() {
      return this.impl.getListeners.apply(this.impl, arguments);
    };
    SynthClient.prototype.hasListeners = function() {
      return this.impl.hasListeners.apply(this.impl, arguments);
    };
    SynthClient.prototype.on = function() {
      this.impl.on.apply(this.impl, arguments);
      return this;
    };
    SynthClient.prototype.once = function() {
      this.impl.once.apply(this.impl, arguments);
      return this;
    };
    SynthClient.prototype.off = function() {
      this.impl.off.apply(this.impl, arguments);
      return this;
    };
    
    return SynthClient;
  })();

  var SynthClientImpl = (function() {
    function SynthClientImpl(exports, opts) {
      emitter.mixin(this);
      
      this.compiler = cc.createCompiler("coffee");
      
      this.isPlaying = false;
      this.execId = 0;
      this.execCallbacks = {};

      this.sampleRate = 44100;
      this.channels   = 2;
      this.api = cc.createAudioAPI(this, opts);
      this.sampleRate = this.api.sampleRate;
      this.channels   = this.api.channels;
      if (this.api.strmLength) {
        this.strmLength = this.api.strmLength;
      }
      this.strm  = new Int16Array(this.strmLength * this.channels);
      this.clear = new Int16Array(this.strmLength * this.channels);
      this.strmList = new Array(C.STRM_LIST_LENGTH);
      this.strmListReadIndex  = 0;
      this.strmListWriteIndex = 0;
      this.syncCount = 0;
      this.speaker = opts.speaker !== false;
      this.api.init();
      
      var syncItems = new Uint8Array(C.SYNC_ITEM_LEN);
      if (typeof window !== "undefined" && opts.mouse !== false) {
        var f32_syncItems = new Float32Array(syncItems.buffer);
        window.addEventListener("mousemove", function(e) {
          f32_syncItems[C.POS_X] = e.pageX / window.innerWidth;
          f32_syncItems[C.POS_Y] = e.pageY / window.innerHeight;
        }, true);
        window.addEventListener("mousedown", function() {
          f32_syncItems[C.BUTTON] = 1;
        }, true);
        window.addEventListener("mouseup", function() {
          f32_syncItems[C.BUTTON] = 0;
        }, true);
      }
      this.syncItems = syncItems;
      this.syncItemsUInt32 = new Uint32Array(syncItems.buffer);
      this.pendingExecution = [];
    }
    
    SynthClientImpl.prototype.play = function() {
      if (!this.isPlaying) {
        this.isPlaying = true;
        this.sendToLang(["/play"]);
        if (this.api) {
          this.api.play();
        }
      }
    };
    SynthClientImpl.prototype._played = function(syncCount) {
      var strm = this.strm, i;
      for (i = strm.length; i--; ) {
        strm[i] = 0;
      }
      this.strmList.splice(0);
      this.strmListReadIndex  = 0;
      this.strmListWriteIndex = 0;
      this.syncCount = syncCount;
      this.emit("play");
    };
    SynthClientImpl.prototype.pause = function() {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.sendToLang(["/pause"]);
      }
    };
    SynthClientImpl.prototype._paused = function() {
      if (this.api) {
        this.api.pause();
      }
      this.emit("pause");
    };
    SynthClientImpl.prototype.reset = function() {
      this.execId = 0;
      this.execCallbacks = {};
      var strm = this.strm, i;
      for (i = strm.length; i--; ) {
        strm[i] = 0;
      }
      this.strmList.splice(0);
      this.strmListReadIndex  = 0;
      this.strmListWriteIndex = 0;
      this.sendToLang(["/reset"]);
      this.emit("reset");
    };
    SynthClientImpl.prototype.execute = function(code) {
      var opts;
      var args = arguments;
      
      if (typeof code !== "string") {
        throw new Error("cc.execute requires a code, but got: " + (typeof code));
      }
      if (this.pendingExecution) {
        this.pendingExecution.push(slice.apply(args));
        return;
      }
      
      var i = 1, append, callback;
      if (typeof args[i] === "boolean") {
        append = args[i++];
      } else {
        append = false;
      }
      if (typeof args[i] === "function") {
        callback = args[i++];
      } else {
        callback = null;
      }
      if (typeof args[i] === "object") {
        opts = args[i++];
      } else {
        opts = {};
      }
      
      if (!opts.lang || opts.lang !== "js") {
        code = this.compiler.compile(code.trim());
      }
      if (callback) {
        this.execCallbacks[this.execId] = callback;
      }
      this.sendToLang([
        "/execute", this.execId, code, append, !!callback
      ]);
      this.execId += 1;
    };
    SynthClientImpl.prototype.compile = function(code) {
      if (typeof code !== "string") {
        throw new Error("cc.execute requires a code, but got: " + (typeof code));
      }
      return this.compiler.compile(code.trim());
    };
    SynthClientImpl.prototype.getStream = function() {
      var f32 = new Float32Array(this.strm);
      for (var i = f32.length; i--; ) {
        f32[i] *= 0.000030517578125;
      }
      var strmLength = this.strmLength;
      return {
        getChannelData: function(channel) {
          if (channel === 0) {
            return new Float32Array(f32.buffer, 0, strmLength);
          } else if (channel === 1) {
            return new Float32Array(f32.buffer, strmLength * 4);
          }
          throw new Error("bad channel");
        }
      };
    };
    SynthClientImpl.prototype.getWebAudioComponents = function() {
      if (this.api && this.api.type === "Web Audio API") {
        return [ this.api.context, this.api.jsNode ];
      }
      return [];
    };
    SynthClientImpl.prototype.process = function() {
      var strm;
      if (this.strmListWriteIndex <= this.strmListReadIndex) {
        return;
      }
      strm = this.strmList[this.strmListReadIndex & C.STRM_LIST_MASK];
      this.strmListReadIndex += 1;
      this.strm.set(strm);
      this.syncItemsUInt32[C.SYNC_COUNT] = ++this.syncCount;
      this.sendToLang(this.syncItems);
    };
    SynthClientImpl.prototype.sendToLang = function(msg) {
      if (this.lang) {
        this.lang.postMessage(msg);
      }
    };
    SynthClientImpl.prototype.recvFromLang = function(msg) {
      if (msg instanceof Int16Array) {
        this.strmList[this.strmListWriteIndex & C.STRM_LIST_MASK] = msg;
        this.strmListWriteIndex += 1;
      } else {
        var func = commands[msg[0]];
        if (func) {
          func.call(this, msg);
        } else {
          throw new Error("Unknown command: " + msg[0]);
        }
      }
    };
    SynthClientImpl.prototype.readAudioFile = function(path, callback) {
      var api = this.api;
      if (api) {
        if (!api.decodeAudioFile) {
          callback("Audio decoding not supported", null);
          return;
        }
        var xhr = cc.createXMLHttpRequest();
        xhr.open("GET", path);
        xhr.responseType = "arraybuffer";
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            if (xhr.status === 200 && xhr.response) {
              api.decodeAudioFile(xhr.response, function(err, buffer) {
                callback(err, buffer);
              });
            } else {
              callback("error", null);
            }
          }
        };
        xhr.send();
      }
    };
    
    return SynthClientImpl;
  })();
  
  commands["/connected"] = function(msg) {
    var globalIds = msg[3];
    if (globalIds) {
      globalIds.forEach(function(key) {
        cc.global[key] = true;
      });
    }
    this.sendToLang([
      "/init", this.sampleRate, this.channels, this.strmLength
    ]);
    this.emit("connected");
    
    var i, imax;
    if (this.pendingExecution) {
      var execute = this.execute;
      var args    = this.pendingExecution;
      this.pendingExecution = null;
      for (i = 0, imax = args.length; i < imax; ++i) {
        execute.apply(this, args[i]);
      }
    }
  };
  commands["/played"] = function(msg) {
    var syncCount = msg[1];
    this._played(syncCount);
  };
  commands["/paused"] = function(msg) {
    var syncCount = msg[1];
    this._paused(syncCount);
  };
  commands["/executed"] = function(msg) {
    var execId = msg[1];
    var result = msg[2];
    var callback = this.execCallbacks[execId];
    if (callback) {
      callback(unpack(result));
      delete this.execCallbacks[execId];
    }
  };
  commands["/buffer/request"] = function(msg) {
    var that = this;
    var requestId = msg[2];
    this.readAudioFile(msg[1], function(err, buffer) {
      if (!err) {
        that.sendToLang(["/buffer/response", buffer, requestId]);
      }
    });
  };
  commands["/socket/sendToClient"] = function(msg) {
    this.emit("message", msg[1]);
  };
  commands["/console/log"] = function(msg) {
    console.log.apply(console, unpack(msg[1]));
  };
  
  cc.SynthClientImpl = SynthClientImpl;
  cc.createSynthClient = function(opts) {
    return new SynthClient(opts);
  };
  cc.createSynthClientImpl = function(exports, opts) {
    return new SynthClientImpl(exports, opts);
  };
  
  // TODO: moved
  require("../common/browser");
  require("../common/audioapi");
  require("./compiler");
  require("./client-worker");
  require("./client-nodejs");
  require("./client-socket");
  
  module.exports = {
    SynthClient    : SynthClient,
    SynthClientImpl: SynthClientImpl
  };

});
