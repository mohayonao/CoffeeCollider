define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var extend = require("../common/extend");
  var Compiler = require("./compiler/coffee").Compiler;
  var Emitter  = require("../common/emitter").Emitter;
  var AudioAPI = require("../common/audioapi").AudioAPI;
  var unpack   = require("../common/pack").unpack;
  var commands = {};
  var slice    = [].slice;
  
  var CoffeeCollider = (function() {
    function CoffeeCollider(opts) {
      Emitter.bind(this);
      opts = opts || {};
      this.version = cc.version;
      if (opts.socket) {
        var impl  = new CoffeeColliderSocketImpl(this, opts);
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
        this.impl = new CoffeeColliderIFrameImpl(this, opts);
        cc.opmode = "iframe";
      } else {
        this.impl = new CoffeeColliderWorkerImpl(this, opts);
        cc.opmode = "worker";
      }
      this.sampleRate = this.impl.sampleRate;
      this.channels   = this.impl.channels;
      this.compiler   = this.impl.compiler;
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
      return this.impl.strm;
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
      this.compiler = new Compiler();
      
      this.isPlaying = false;
      this.execId = 0;
      this.execCallbacks = {};

      this.sampleRate = 44100;
      this.channels   = 2;
      this.api = new AudioAPI(this, opts);
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
      if (opts.mouse !== false) {
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
      var api = this.api;
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
      this.client = new Worker(cc.coffeeColliderPath);
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
      var iframe = document.createElement("iframe");
      iframe.style.width  = 0;
      iframe.style.height = 0;
      iframe.style.border = 0;
      document.body.appendChild(iframe);

      this.iframe = iframe;
      // TODO: want to remove 'allow-same-origin'
      iframe.sandbox = "allow-scripts allow-same-origin";
      iframe.srcdoc = "<script src='" + cc.coffeeColliderPath + "#iframe'></script>";
      var channel = new MessageChannel();
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
      var iframe = document.createElement("iframe");
      iframe.style.width  = 0;
      iframe.style.height = 0;
      iframe.style.border = 0;
      document.body.appendChild(iframe);

      this.iframe = iframe;
      iframe.sandbox = "allow-scripts";
      iframe.srcdoc = "<script src='" + cc.coffeeColliderPath + "#socket'></script>";
      var channel = new MessageChannel();
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
    this.readAudioFile(msg[1], function(buffer) {
      that.sendToClient(["/buffer/response", buffer, requestId]);
    });
  };
  commands["/socket/sendToIF"] = function(msg) {
    this.exports.emit("message", msg[1]);
  };
  require("../common/console").receive(commands);
  
  module.exports = {
    CoffeeCollider: CoffeeCollider
  };

});
