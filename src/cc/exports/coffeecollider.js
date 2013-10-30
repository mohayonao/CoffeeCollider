define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var extend = require("../common/extend");
  var emitter  = require("../common/emitter");
  var unpack   = require("../common/pack").unpack;
  var commands = {};
  var slice    = [].slice;
  
  var CoffeeCollider = (function() {
    function CoffeeCollider(opts) {
      emitter.mixin(this);
      opts = opts || {};
      this.version = cc.version;
      if (opts.socket) {
        var impl  = cc.createCoffeeColliderSocketImpl(this, opts);
        this.impl = impl;
        this.socket = {
          open: function() {
            impl.sendToClient([ "/socket/open" ]);
          },
          close: function() {
            impl.sendToClient([ "/socket/close" ]);
          },
          send: function(msg) {
            impl.sendToClient([ "/socket/sendToServer", msg ]);
          }
        };
        cc.opmode = "socket";
      } else if (opts.iframe) {
        this.impl = cc.createCoffeeColliderIFrameImpl(this, opts);
        cc.opmode = "iframe";
      } else {
        this.impl = cc.createCoffeeColliderWorkerImpl(this, opts);
        cc.opmode = "worker";
      }
      this.sampleRate = this.impl.sampleRate;
      this.channels   = this.impl.channels;
    }
    
    CoffeeCollider.prototype.play = function() {
      this.impl.play();
      return this;
    };
    CoffeeCollider.prototype.pause = function() {
      this.impl.pause();
      return this;
    };
    CoffeeCollider.prototype.reset = function() {
      this.impl.reset();
      return this;
    };
    CoffeeCollider.prototype.execute = function() {
      this.impl.execute.apply(this.impl, arguments);
      return this;
    };
    CoffeeCollider.prototype.getStream = function() {
      return this.impl.getStream();
    };
    CoffeeCollider.prototype.importScripts = function() {
      this.impl.importScripts(slice.call(arguments));
      return this;
    };
    CoffeeCollider.prototype.getWebAudioComponents = function() {
      return this.impl.getWebAudioComponents();
    };
    
    return CoffeeCollider;
  })();

  var CoffeeColliderImpl = (function() {
    function CoffeeColliderImpl(exports, opts) {
      var that = this;
      this.exports  = exports;
      this.compiler = cc.createCompiler("coffee");
      
      this.isPlaying = false;
      this.execId = 0;
      this.execCallbacks = {};

      this.sampleRate = 44100;
      this.channels   = 2;
      this.api = cc.createAudioAPI(this, opts);
      this.sampleRate = this.api.sampleRate;
      this.channels   = this.api.channels;
      this.strm  = new Int16Array(this.strmLength * this.channels);
      this.clear = new Int16Array(this.strmLength * this.channels);
      this.strmList = new Array(8);
      this.strmListReadIndex  = 0;
      this.strmListWriteIndex = 0;
      this.speaker = opts.speaker !== false;
      this.api.init();

      var syncItems = new Uint8Array(C.SYNC_ITEM_LEN);
      if (typeof window !== "undefined" && opts.mouse !== false) {
        var f32_syncItems = new Float32Array(syncItems.buffer);
        window.addEventListener("mousemove", function(e) {
          f32_syncItems[C.POS_X] = e.pageX / window.innerWidth;
          f32_syncItems[C.POS_Y] = e.pageY / window.innerHeight;
          that.syncItemsChanged = true;
        }, false);
        window.addEventListener("mousedown", function() {
          syncItems[C.BUTTON] = 1;
          that.syncItemsChanged = true;
        }, false);
        window.addEventListener("mouseup", function() {
          syncItems[C.BUTTON] = 0;
          that.syncItemsChanged = true;
        }, false);
      }
      this.syncItems = syncItems;
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
        this.api.play();
        this.sendToClient(["/play"]);
        this.exports.emit("play");
      }
    };
    CoffeeColliderImpl.prototype.pause = function() {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.api.pause();
        this.sendToClient(["/pause"]);
        this.exports.emit("pause");
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
      this.exports.emit("reset");
    };
    CoffeeColliderImpl.prototype.process = function() {
      var strm = this.strmList[this.strmListReadIndex];
      if (strm) {
        this.strmListReadIndex = (this.strmListReadIndex + 1) & 7;
        this.strm.set(strm);
      }
      if (this.syncItemsChanged) {
        this.sendToClient(this.syncItems);
        this.syncItemsChanged = false;
      }
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
    CoffeeColliderImpl.prototype.getStream = function() {
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
        }
      };
    };
    CoffeeColliderImpl.prototype.importScripts = function(list) {
      this.sendToClient(["/importScripts", list]);
    };
    CoffeeColliderImpl.prototype.sendToClient = function(msg) {
      if (this.client) {
        this.client.postMessage(msg);
      }
    };
    CoffeeColliderImpl.prototype.recvFromClient = function(msg) {
      if (msg instanceof Int16Array) {
        this.strmList[this.strmListWriteIndex] = msg;
        this.strmListWriteIndex = (this.strmListWriteIndex + 1) & 7;
      } else {
        var func = commands[msg[0]];
        if (func) {
          func.call(this, msg);
        } else {
          throw new Error("Unknown command: " + msg[0]);
        }
      }
    };
    CoffeeColliderImpl.prototype.readAudioFile = function(path, callback) {
      var api = this.api;
      if (typeof path !== "string") {
        throw new TypeError("readAudioFile: first argument must be a String.");
      }
      if (typeof callback !== "function") {
        throw new TypeError("readAudioFile: second argument must be a Function.");
      }
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
    };
    CoffeeColliderImpl.prototype.getWebAudioComponents = function() {
      if (this.api.type === "Web Audio API") {
        return [ this.api.context, this.api.jsNode ];
      }
      return [];
    };
    
    return CoffeeColliderImpl;
  })();
  
  
  var CoffeeColliderWorkerImpl = (function() {
    function CoffeeColliderWorkerImpl(exports, opts) {
      this.strmLength = C.WORKER_STRM_LENGTH;
      this.bufLength  = C.WORKER_BUF_LENGTH;
      CoffeeColliderImpl.call(this, exports, opts);
      var that = this;
      this.client = cc.createWebWorker(cc.coffeeColliderPath);
      this.client.onmessage = function(e) {
        that.recvFromClient(e.data);
      };
    }
    extend(CoffeeColliderWorkerImpl, CoffeeColliderImpl);
    
    return CoffeeColliderWorkerImpl;
  })();
  
  
  var CoffeeColliderIFrameImpl = (function() {
    function CoffeeColliderIFrameImpl(exports, opts) {
      this.strmLength = C.IFRAME_STRM_LENGTH;
      this.bufLength  = C.IFRAME_BUF_LENGTH;
      CoffeeColliderImpl.call(this, exports, opts);
      var that = this;
      var iframe = this.iframe = cc.createHTMLIFrameElement();
      // TODO: want to remove 'allow-same-origin'
      iframe.sandbox = "allow-scripts allow-same-origin";
      iframe.srcdoc = "<script src='" + cc.coffeeColliderPath + "#iframe'></script>";
      var channel = cc.createMessageChannel();
      iframe.onload = function() {
        iframe.contentWindow.postMessage(null, [channel.port2], "*");
      };
      channel.port1.onmessage = function(e) {
        that.recvFromClient(e.data);
      };
      this.client = channel.port1;
    }
    extend(CoffeeColliderIFrameImpl, CoffeeColliderImpl);
    
    return CoffeeColliderIFrameImpl;
  })();


  var CoffeeColliderSocketImpl = (function() {
    function CoffeeColliderSocketImpl(exports, opts) {
      this.strmLength = C.SOCKET_STRM_LENGTH;
      this.bufLength  = C.SOCKET_BUF_LENGTH;
      CoffeeColliderImpl.call(this, exports, opts);
      var that = this;
      var iframe = this.iframe = cc.createHTMLIFrameElement();
      iframe.sandbox = "allow-scripts";
      iframe.srcdoc = "<script src='" + cc.coffeeColliderPath + "#socket'></script>";
      var channel = cc.createMessageChannel();
      iframe.onload = function() {
        iframe.contentWindow.postMessage(opts.socket, [channel.port2], "*");
      };
      channel.port1.onmessage = function(e) {
        that.recvFromClient(e.data);
      };
      this.client = channel.port1;
    }
    extend(CoffeeColliderSocketImpl, CoffeeColliderImpl);
    
    return CoffeeColliderSocketImpl;
  })();
  
  commands["/connected"] = function() {
    this.sendToClient([
      "/init", this.sampleRate, this.channels
    ]);
    this.exports.emit("connected");
  };
  commands["/executed"] = function(msg) {
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
    this.readAudioFile(msg[1], function(err, buffer) {
      if (!err) {
        that.sendToClient(["/buffer/response", buffer, requestId]);
      }
    });
  };
  commands["/socket/sendToIF"] = function(msg) {
    this.exports.emit("message", msg[1]);
  };
  require("../common/console").bindConsoleApply(commands);
  
  var use = function() {
    require("../common/browser").use();
    require("../common/audioapi").use();
    require("./compiler/compiler").use();
    
    cc.createCoffeeCollider = function(opts) {
      return new CoffeeCollider(opts);
    };
    cc.createCoffeeColliderImpl = function(exports, opts) {
      return new CoffeeColliderImpl(exports, opts);
    };
    cc.createCoffeeColliderWorkerImpl = function(exports, opts) {
      return new CoffeeColliderWorkerImpl(exports, opts);
    };
    cc.createCoffeeColliderIFrameImpl = function(exports, opts) {
      return new CoffeeColliderIFrameImpl(exports, opts);
    };
    cc.createCoffeeColliderSocketImpl = function(exports, opts) {
      return new CoffeeColliderSocketImpl(exports, opts);
    };
  };
  
  module.exports = {
    CoffeeCollider: CoffeeCollider,
    use:use
  };

});
