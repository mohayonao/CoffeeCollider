(function(global) {
"use strict";
var _define = function(module, /*deps,*/ payload) {
  if (!_define.modules) {
    _define.modules  = {};
    _define.payloads = {};
  }
  _define.payloads[module] = payload;
  _define.modules[module]  = null;
};
var _require = function(parentId, moduleName) {
  moduleName = normalizeModule(parentId, moduleName);
  var module = _define.modules[moduleName];
  if (!module) {
    module = _define.payloads[moduleName];
    var exports = {};
    var mod = { id:moduleName, exports:exports };
    var req = function(module) {
      return _require(moduleName, module);
    };
    var ret = null;
    if (module) {
      module(req, exports, mod);
      exports = ret || mod.exports;
    } else {
      exports = -1;
    }
    _define.modules[moduleName] = exports;
    delete _define.payloads[moduleName];
  }
  module = _define.modules[moduleName] = exports || module;
  return module;
};
var normalizeModule = function(parentId, moduleName) {
  if (moduleName.charAt(0) === ".") {
    var base = parentId.split("/").slice(0, -1).join("/");
    moduleName = base + "/" + moduleName;
    var previous;
    while (moduleName.indexOf(".") !== -1 && previous !== moduleName) {
      previous   = moduleName;
      moduleName = moduleName.replace(/\/\.\//, "/").replace(/[^\/]+\/\.\.\//, "");
    }
  }
  return moduleName;
};
if (typeof require === "function") {
  global.require = require;
}
var define = _define;
define('cc/loader', function(require, exports, module) {

  var cc = require("./cc");

  if (typeof document !== "undefined") {
    var scripts = document.getElementsByTagName("script");
    if (scripts && scripts.length) {
      for (var i = 0; i < scripts.length; i++) {
        var m = /^(.*\/)coffee-collider(?:-dev)?\.js(\#.*)?$/.exec(scripts[i].src);
        if (m) {
          cc.rootPath = m[1];
          cc.coffeeColliderPath = m[0];
          cc.coffeeColliderHash = m[2];
          break;
        }
      }
    }
    cc.opmode  = "client";
    cc.context = "client";
    require("./client/client");
    global.CoffeeCollider = function(opts) {
      return cc.createSynthClient(opts);
    };
    global.CoffeeCollider.version = cc.version;
  } else if (typeof WorkerLocation !== "undefined") {
    if (location.hash === "#socket") {
      cc.opmode  = "socket";
      cc.context = "lang";
      require("./lang/lang");
      cc.lang = cc.createSynthLang();
    } else {
      cc.opmode  = "worker";
      cc.context = "lang/server";
      require("./lang/lang");
      require("./server/server");
      cc.lang = cc.createSynthLang();
      cc.server = cc.createSynthServer();
      cc.lang.sendToServer = cc.server.recvFromLang.bind(cc.server);
      cc.server.sendToLang = cc.lang.recvFromServer.bind(cc.lang);
      cc.server.connect();
    }
  } else if (typeof global.GLOBAL !== "undefined") {
    cc.global.CoffeeCollider = function() {
      cc.opmode  = "nodejs";
      cc.context = "client/lang/server";
      require("./client/client");
      require("./lang/lang");
      require("./server/server");
      cc.client = cc.createSynthClient({nodejs:true});
      cc.lang   = cc.createSynthLang();
      cc.server = cc.createSynthServer();
      cc.client.impl.sendToLang = cc.lang.recvFromClient.bind(cc.lang);
      cc.lang.sendToServer = cc.server.recvFromLang.bind(cc.server);
      cc.server.sendToLang = cc.lang.recvFromServer.bind(cc.lang);
      cc.lang.sendToClient = cc.client.impl.recvFromLang.bind(cc.client.impl);
      cc.server.connect();
      return cc.client;
    };
    cc.global.SocketSynthServer = function(opts) {
      cc.opmode  = "socket";
      cc.context = "server";
      require("./server/server");
      cc.server = cc.createSynthServer();
      return cc.server.exports.createServer(opts);
    };
    cc.global.version = cc.version;
    module.exports = cc.global;
  }

});
define('cc/cc', function(require, exports, module) {
  
  module.exports = {
    version: "0.2.0",
    global : {},
    Object : function() {},
    ugen   : {specs:{}},
    unit   : {specs:{}},
    deprecate: {}
  };

});
define('cc/client/client', function(require, exports, module) {

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

    SynthClient.prototype.send = function() {
      this.impl.send.apply(this.impl, arguments);
      return this;
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
      this.strmList = new Array(8);
      this.strmListReadIndex  = 0;
      this.strmListWriteIndex = 0;
      this.syncCount = 0;
      this.speaker = opts.speaker !== false;
      this.api.init();
      
      var syncItems = new Uint8Array(20);
      if (typeof window !== "undefined" && opts.mouse !== false) {
        var f32_syncItems = new Float32Array(syncItems.buffer);
        window.addEventListener("mousemove", function(e) {
          f32_syncItems[2] = e.pageX / window.innerWidth;
          f32_syncItems[3] = e.pageY / window.innerHeight;
        }, true);
        window.addEventListener("mousedown", function() {
          f32_syncItems[4] = 1;
        }, true);
        window.addEventListener("mouseup", function() {
          f32_syncItems[4] = 0;
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
    SynthClientImpl.prototype.send = function() {
      this.sendToLang([
        "/send", slice.call(arguments)
      ]);
    };
    SynthClientImpl.prototype.process = function() {
      var strm;
      if (this.strmListReadIndex < this.strmListWriteIndex) {
        strm = this.strmList[this.strmListReadIndex & 7];
        this.strmListReadIndex += 1;
        this.strm.set(strm);
      }
      this.syncItemsUInt32[1] = ++this.syncCount;
      this.sendToLang(this.syncItems);
    };
    SynthClientImpl.prototype.sendToLang = function(msg) {
      if (this.lang) {
        this.lang.postMessage(msg);
      }
    };
    SynthClientImpl.prototype.recvFromLang = function(msg) {
      if (msg instanceof Int16Array) {
        this.strmList[this.strmListWriteIndex & 7] = msg;
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
  commands["/send"] = function(msg) {
    var args = msg[1];
    this.emit.apply(this, args);
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
define('cc/common/emitter', function(require, exports, module) {

  var Emitter = (function() {
    function Emitter(context) {
      this.__context   = context || this;
      this.__callbacks = {};
    }
    Emitter.prototype.getListeners = function(event) {
      return this.__callbacks[event] || (this.__callbacks[event] = []);
    };
    Emitter.prototype.hasListeners = function(event) {
      return this.getListeners(event).length > 0;
    };
    Emitter.prototype.on = function(event, callback) {
      var __callbacks = this.getListeners(event);
      if (__callbacks.indexOf(callback) === -1) {
        __callbacks.push(callback);
      }
      return this;
    };
    Emitter.prototype.once = function(event, callback) {
      var that = this;
      function wrapper() {
        that.off(event, wrapper);
        callback.apply(that.__context, arguments);
      }
      wrapper.callback = callback;
      this.on(event, wrapper);
      return this;
    };
    Emitter.prototype.off = function(event, callback) {
      if (arguments.length === 0) {
        this.__callbacks = {};
        return this;
      }
      var __callbacks = this.getListeners(event);
      if (arguments.length === 1) {
        __callbacks.splice(0);
        return this;
      }
      var index = __callbacks.indexOf(callback);
      if (index === -1) {
        for (var i = 0, imax = __callbacks.length; i < imax; ++i) {
          if (__callbacks[i].callback === callback) {
            index = i;
            break;
          }
        }
      }
      if (index !== -1) {
        __callbacks.splice(index, 1);
      }
      return this;
    };
    Emitter.prototype.emit = function(event) {
      var args = Array.prototype.slice.call(arguments, 1);
      var __callbacks = this.getListeners(event).slice(0);
      for (var i = 0, imax = __callbacks.length; i < imax; ++i) {
        __callbacks[i].apply(this.__context, args);
      }
      return this;
    };
    return Emitter;
  })();
  
  var mixin = function(obj) {
    ["getListeners", "hasListeners", "on", "once", "off", "emit"].forEach(function(method) {
      if (!obj[method]) {
        obj[method] = Emitter.prototype[method];
      }
    });
    Emitter.call(obj);
    return obj;
  };
  
  module.exports = {
    Emitter: Emitter,
    mixin: mixin
  };

});
define('cc/common/pack', function(require, exports, module) {
  
  var pack = (function() {
    var _pack = function(data, stack) {
      if (!data) {
        return data;
      }
      if (stack.indexOf(data) !== -1) {
        return { klassName:"Circular" };
      }
      var result;
      if (typeof data === "object") {
        if (data.buffer instanceof ArrayBuffer) {
          return data;
        }
        stack.push(data);
        if (Array.isArray(data)) {
          result = data.filter(function(data) {
            return typeof data !== "function";
          }).map(function(data) {
            return _pack(data, stack);
          });
        } else {
          result = {};
          Object.keys(data).forEach(function(key) {
            if (key.charAt(0) !== "_" && typeof data[key] !== "function") {
              result[key] = _pack(data[key], stack);
            }
          });
        }
        stack.pop();
      } else {
        result = data;
      }
      return result;
    };
    return function(data) {
      return _pack(data, []);
    };
  })();

  var unpack = (function() {
    var _unpack = function(data) {
      if (!data) {
        return data;
      }
      if (typeof data === "string") {
        return data;
      }
      var result;
      if (typeof data === "object") {
        if (data.buffer instanceof ArrayBuffer) {
          return data;
        }
        if (Array.isArray(data)) {
          result = data.map(function(data) {
            return _unpack(data);
          });
        } else {
          if (data.klassName && /^[_a-z$][_a-z0-9$]*$/i.test(data.klassName)) {
            result = eval.call(null, "new (function " + data.klassName + "(){})");
            delete data.klassName;
          } else {
            result = {};
          }
          Object.keys(data).forEach(function(key) {
            result[key] = _unpack(data[key]);
          });
        }
      } else {
        result = data;
      }
      return result;
    };
    return function(data) {
      return _unpack(data);
    };
  })();
  
  module.exports = {
    pack  : pack,
    unpack: unpack
  };

});
define('cc/common/browser', function(require, exports, module) {

  var cc = require("../cc");
  
  cc.createWebWorker = function(path) {
    return new Worker(path);
  };
  cc.createWebSocket = function(path) {
    return new WebSocket(path);
  };
  cc.createXMLHttpRequest = function() {
    return new XMLHttpRequest();
  };
  
  module.exports = {};

});
define('cc/common/audioapi', function(require, exports, module) {
  
  var cc = require("../cc");
  
  require("./audioapi-webaudio");
  require("./audioapi-audiodata");
  require("./audioapi-flashfallback");
  require("./audioapi-nodeaudio");

  cc.createAudioAPI = function(sys, opts) {
    return cc.createWebAudioAPI(sys, opts) ||
      cc.createAudioDataAPI(sys, opts) ||
      cc.createFlashAudioAPI(sys, opts) ||
      cc.createNodeAudioAPI(sys, opts);
  };
  
  module.exports = {};

});
define('cc/common/audioapi-webaudio', function(require, exports, module) {

  var cc = require("../cc");
  
  var AudioAPI;
  
  if (typeof document !== "undefined") {
    var AudioContext = global.AudioContext || global.webkitAudioContext;
    if (AudioContext) {
      AudioAPI = (function() {
        function WebAudioAPI(sys, opts) {
          this.sys = sys;
          this.context = opts.AudioContext || new AudioContext();
          this.sampleRate = this.context.sampleRate;
          this.channels   = 2;
          this.type = "Web Audio API";
          this.delegate = !!opts.AudioContext;
        }
        WebAudioAPI.prototype.init = function() {
          var sys = this.sys;
          var onaudioprocess;
          var strm = sys.strm;
          var strmLength = sys.strmLength;
          if (this.sys.speaker) {
            if (this.sys.sampleRate === this.sampleRate) {
              onaudioprocess = function(e) {
                var outs = e.outputBuffer;
                var outL = outs.getChannelData(0);
                var outR = outs.getChannelData(1);
                var i = strmLength, j = strmLength << 1;
                sys.process();
                while (j--, i--) {
                  outL[i] = strm[i] * 0.000030517578125;
                  outR[i] = strm[j] * 0.000030517578125;
                }
              };
            }
          } else {
            onaudioprocess = function() {
              sys.process();
            };
          }
          this.bufSrc = this.context.createBufferSource();
          if (this.context.createScriptProcessor) {
            this.jsNode = this.context.createScriptProcessor(strmLength, 2, this.channels);
          } else {
            this.jsNode = this.context.createJavaScriptNode(strmLength, 2, this.channels);
          }
          this.jsNode.onaudioprocess = onaudioprocess;
        };
        WebAudioAPI.prototype.play = function() {
          if (!this.bufSrc) {
            return; // TODO: throw an error
          }
          if (this.bufSrc.noteOn) {
            this.bufSrc.noteOn(0);
            this.bufSrc.connect(this.jsNode);
          }
          if (!this.delegate) {
            this.jsNode.connect(this.context.destination);
          }
        };
        WebAudioAPI.prototype.pause = function() {
          if (!this.bufSrc) {
            return; // TODO: throw an error
          }
          this.bufSrc.disconnect();
          if (!this.delegate) {
            this.jsNode.disconnect();
          }
        };
        WebAudioAPI.prototype.decodeAudioFile = function(buffer, callback) {
          buffer = this.context.createBuffer(buffer, false);
          var bufLength   = buffer.length;
          var numChannels = buffer.numberOfChannels;
          var numSamples  = bufLength * numChannels;
          var samples = new Float32Array(numSamples);
          var i, j, k = 0;
          var channelData = new Array(numChannels);
          for (j = 0; j < numChannels; ++j) {
            channelData[j] = buffer.getChannelData(j);
          }
          for (i = 0; i < bufLength; ++i) {
            for (j = 0; j < numChannels; ++j) {
              samples[k++] = channelData[j][i];
            }
          }
          callback(null, {
            sampleRate : buffer.sampleRate,
            numChannels: buffer.numberOfChannels,
            numFrames  : buffer.length,
            samples    : samples
          });
        };
        return WebAudioAPI;
      })();
    }
  }

  cc.createWebAudioAPI = function(sys, opts) {
    if (AudioAPI) {
      return new AudioAPI(sys, opts);
    }
  };
  
  module.exports = {};
  
});
define('cc/common/audioapi-audiodata', function(require, exports, module) {

  var cc = require("../cc");
  
  var AudioAPI;
  
  if (typeof document !== "undefined") {
    if (typeof Audio === "function" && typeof new Audio().mozSetup === "function") {
      AudioAPI = (function() {
        /*global URL:true */
        var timer = (function() {
          var source = "var t=0;onmessage=function(e){if(t)t=clearInterval(t),0;if(typeof e.data=='number'&&e.data>0)t=setInterval(function(){postMessage(0);},e.data);};";
          var blob = new Blob([source], {type:"text/javascript"});
          var path = URL.createObjectURL(blob);
          return new Worker(path);
        })();
        /*global URL:false */
        function AudioDataAPI(sys) {
          this.sys = sys;
          this.sampleRate = 44100;
          this.channels   = 2;
          this.type = "Audio Data API";
        }
        AudioDataAPI.prototype.init = function() {
          this.audio = new Audio();
          this.interleaved = new Float32Array(this.sys.strmLength * this.sys.channels);
        };
        AudioDataAPI.prototype.play = function() {
          if (!this.audio) {
            return; // TODO: throw an error
          }
          var sys = this.sys;
          var audio = this.audio;
          var interleaved = this.interleaved;
          var msec = (sys.strmLength / sys.sampleRate) * 1000;
          var written = 0;
          var start = Date.now();
          var inL = new Int16Array(sys.strm.buffer, 0, sys.strmLength);
          var inR = new Int16Array(sys.strm.buffer, sys.strmLength * 2);

          var onaudioprocess = function() {
            if (written - 20 > Date.now() - start) {
              return;
            }
            var i = interleaved.length;
            var j = inL.length;
            sys.process();
            while (j--) {
              interleaved[--i] = inR[j] * 0.000030517578125;
              interleaved[--i] = inL[j] * 0.000030517578125;
            }
            audio.mozWriteAudio(interleaved);
            written += msec;
          };

          audio.mozSetup(sys.channels, sys.sampleRate);
          timer.onmessage = onaudioprocess;
          timer.postMessage(msec * 0.8);
        };
        AudioDataAPI.prototype.pause = function() {
          if (!this.audio) {
            return; // TODO: throw an error
          }
          timer.postMessage(0);
        };
        return AudioDataAPI;
      })();
    }
  }
  
  cc.createAudioDataAPI = function(sys, opts) {
    if (AudioAPI) {
      return new AudioAPI(sys, opts);
    }
  };
  
  module.exports = {};

});
define('cc/common/audioapi-flashfallback', function(require, exports, module) {

  var cc = require("../cc");
  
  var AudioAPI;

  if (typeof document !== "undefined") {
    AudioAPI = (function() {
      function FallbackAudioAPI(sys) {
        this.sys = sys;
        this.sampleRate = 44100;
        this.channels   = 2;
        this.strmLength = Math.max(2048, sys.strmLength);
        this.type = "Fallback";
      }
      FallbackAudioAPI.prototype.init = function() {
      };
      FallbackAudioAPI.prototype.play = function() {
        if (fallback.play) {
          this.play = fallback.play;
          this.play();
        }
      };
      FallbackAudioAPI.prototype.pause = function() {
        if (fallback.pause) {
          this.pause = fallback.pause;
          this.pause();
        }
      };
      
      var fallback = {};
      window.addEventListener("load", function() {
        var swfSrc  = cc.rootPath + "coffee-collider-fallback.swf";
        var swfName = swfSrc + "?" + Date.now();
        var swfId   = "coffee-collider-fallback";
        var div = document.createElement("div");
        div.style.display = "inline";
        div.width  = 1;
        div.height = 1;
        /*jshint quotmark:single */
        div.innerHTML = '<object id="'+swfId+'" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" width="1" height="1"><param name="movie" value="'+swfName+'"/><param name="bgcolor" value="#FFFFFF"/><param name="quality" value="high"/><param name="allowScriptAccess" value="always"/></object>';
        /*jshint quotmark:double */
        document.body.appendChild(div);
        
        window.coffeecollider_flashfallback_init = function() {
          var swf = document.getElementById(swfId);
          var timerId = 0;
          fallback.play = function() {
            if (timerId === 0) {
              var sys = this.sys;
              var msec = (sys.strmLength / sys.sampleRate) * 1000;
              var written = 0;
              var start = Date.now();
              var out   = new Array(sys.strmLength * sys.channels);
              var len   = out.length;
              
              var onaudioprocess = function() {
                if (written > Date.now() - start) {
                  return;
                }
                sys.process();
                var _in = sys.strm;
                for (var i = 0; i < len; ++i) {
                  out[i] = String.fromCharCode( ((_in[i] + 32768)>>1) + 16384 );
                }
                swf.writeAudio(out.join(""));
                written += msec;
              };

              timerId = setInterval(onaudioprocess, msec * 0.8);
              swf.play();
            }
          };
          fallback.pause = function() {
            if (timerId !== 0) {
              swf.pause();
              clearInterval(timerId);
              timerId = 0;
            }
          };
        };
      });
      return FallbackAudioAPI;
    })();
  }
  
  cc.createFlashAudioAPI = function(sys, opts) {
    if (AudioAPI) {
      return new AudioAPI(sys, opts);
    }
  };
  
  module.exports = {};
  
});
define('cc/common/audioapi-nodeaudio', function(require, exports, module) {

  var cc = require("../cc");
  
  var AudioAPI;
  
  if (typeof global.GLOBAL !== "undefined") {
    AudioAPI = (function() {
      var Readable = global.require("stream").Readable;
      var Speaker  = global.require("speaker");
      if (!Readable) {
        Readable = global.require("readable-stream/readable");
      }
      function NodeAudioAPI(sys) {
        this.sys = sys;
        this.sampleRate = 44100;
        this.channels   = 2;
        this.node = null;
        this.isPlaying = false;
      }
      NodeAudioAPI.prototype.init = function() {
      };
      NodeAudioAPI.prototype.play = function() {
        var sys = this.sys;
        this.isPlaying = true;
        this.node = new Readable();
        this.node._read = function(n) {
          var strm = sys._strm;
          var strmLength = sys.strmLength;
          var buf  = new Buffer(n);
          var x, i, j, k = 0;
          n = (n >> 2) / sys.strmLength;
          x = strm;
          while (n--) {
            sys._process();
            for (i = 0, j = strmLength; i < strmLength; ++i, ++j) {
              buf.writeInt16LE(strm[i], k);
              k += 2;
              buf.writeInt16LE(strm[j], k);
              k += 2;
            }
          }
          this.push(buf);
        };
        this.node.pipe(new Speaker({sampleRate:this.sampleRate}));
      };
      NodeAudioAPI.prototype.pause = function() {
        if (this.node) {
          process.nextTick(this.node.emit.bind(this.node, "end"));
        }
        this.node = null;
        this.isPlaying = false;
      };
      return NodeAudioAPI;
    })();
  }
  
  cc.createNodeAudioAPI = function(sys, opts) {
    if (AudioAPI) {
      return new AudioAPI(sys, opts);
    }
  };
  
  module.exports = {};

});
define('cc/client/compiler', function(require, exports, module) {

  var CoffeeScript = global.CoffeeScript || global.require("coffee-script");
  
  var cc = require("../cc");
  var numericstring = require("../common/numericstring");
  var push = [].push;
  
  var TAG   = 0;
  var VALUE = 1;
  var _     = {}; // empty location

  // utility functions
  var isDot = function(token) {
    return !!token && (token[TAG] === "." || token[TAG] === "@");
  };
  var isColon = function(token) {
    return !!token && token[TAG] === ":";
  };
  var indexOfParamEnd = function(tokens, index) {
    var bracket = 0, i, imax = tokens.length;
    for (i = index; i < imax; ++i) {
      switch (tokens[i][TAG]) {
      case "PARAM_START":
        bracket += 1;
        break;
      case "PARAM_END":
        bracket -= 1;
        if (bracket === 0) {
          return i;
        }
      }
    }
    return -1;
  };
  var indexOfFunctionStart = function(tokens, index) {
    var i, imax = tokens.length;
    for (i = index; i < imax; ++i) {
      switch (tokens[i][TAG]) {
      case "PARAM_START": case "->": case "=>":
        return i;
      case "TERMINATOR":
      case "[": case "{": case "(":
      case "CALL_START": case "INDEX_START":
        return -1;
      }
    }
    return -1;
  };
  var formatArgument = function(op) {
    return op.tokens.slice(op.begin, op.end+1).map(function(token, index) {
      if (token[TAG] === "STRING" && token[VALUE].charAt(0) === "'") {
        return "\"" + token[VALUE].substr(1, token[VALUE].length - 2) + "\"";
      } else if (token[TAG] === "IDENTIFIER" && op.tokens[op.begin+index+1][TAG] === ":") {
        return "\"" + token[VALUE] + "\"";
      }
      return token[VALUE];
    }).join("");
  };
  
  var detectPlusMinusOperator = function(tokens) {
    var i, prevTag = "", tag, imax = tokens.length;
    for (i = 0; i < imax; ++i) {
      tag = tokens[i][TAG];
      if (tag === "+" || tag === "-") {
        switch (prevTag) {
        case "IDENTIFIER": case "NUMBER": case "STRING": case "BOOL":
        case "REGEX": case "NULL": case "UNDEFINED": case "]": case "}": case ")":
        case "CALL_END": case "INDEX_END":
          tokens[i][TAG] = "MATH";
          break;
        default:
          tokens[i][TAG] = "UNARY";
        }
      }
      prevTag = tag;
    }
    tokens.cc_plusminus = true;
    return tokens;
  };
  
  var revertPlusMinusOperator = function(tokens) {
    var i, val, imax = tokens.length;
    for (i = 0; i < imax; ++i) {
      val = tokens[i][VALUE];
      if (val === "+" || val === "-") {
        tokens[i][TAG] = val;
      }
    }
    return tokens;
  };
  
  var getPrevOperand = function(tokens, index) {
    var bracket = 0;
    var indent  = 0;
    var end = index;
    var prev;
    while (1 < index) {
      switch (tokens[index][TAG]) {
      case "(": case "[": case "{":
      case "PARAM_START": case "CALL_START": case "INDEX_START":
        bracket -= 1;
        break;
      case "}": case "]": case ")":
      case "PARAM_END": case "CALL_END": case "INDEX_END":
        bracket += 1;
        break;
      case "OUTDENT":
        indent += 1;
        break;
      case "INDENT":
        indent -= 1;
        break;
      }
      switch (tokens[index - 1][TAG]) {
      case "PARAM_END": case "CALL_END": case "INDEX_END":
      case ".": case "@":
        index -= 1;
        continue;
      }
      switch (tokens[index][TAG]) {
      case "(": case "[": case "{": case "PARAM_START":
      case "IDENTIFIER": case "NUMBER": case "BOOL": case "STRING": case "REGEX":
      case "UNDEFINED": case "NULL": case "@": case "THIS": case "SUPER":
      case "->": case "=>":
        if (bracket === 0 && indent === 0) {
          while ((prev = tokens[index-1]) && prev[TAG] === "UNARY") {
            index -= 1;
          }
          return {tokens:tokens, begin:index, end:end};
        }
        break;
      }
      index -= 1;
    }
    return {tokens:tokens, begin:0, end:end};
  };
  
  var getNextOperand = function(tokens, index) {
    var bracket = 0;
    var indent  = 0;
    var begin = index;
    var imax = tokens.length - 2;
    var tag;

    if (tokens[index] && tokens[index][TAG] === "@") {
      if (tokens[index+1][TAG] !== "IDENTIFIER") {
        return {tokens:tokens, begin:index, end:index};
      }
    }
    
    while (index < imax) {
      tag = tokens[index][TAG];
      
      switch (tag) {
      case "(": case "[": case "{":
      case "PARAM_START":
        bracket += 1;
        break;
      case "}": case "]": case ")":
      case "PARAM_END": case "CALL_END": case "INDEX_END":
        bracket -= 1;
        break;
      case "INDENT":
        indent += 1;
        break;
      case "OUTDENT":
        indent -= 1;
        break;
      }
      
      switch (tokens[index + 1][TAG]) {
      case "CALL_START": case "INDEX_START":
        bracket += 1;
        index += 1;
        continue;
      case ".": case "@": case "ELSE":
        index += 1;
        continue;
      }
      
      switch (tag) {
      case "}": case "]": case ")": case "CALL_END": case "INDEX_END":
      case "IDENTIFIER": case "NUMBER": case "BOOL": case "STRING": case "REGEX":
      case "UNDEFINED": case "NULL": case "OUTDENT":
        if (bracket === 0 && indent === 0) {
          return {tokens:tokens, begin:begin, end:index};
        }
        break;
      }
      index += 1;
    }
    return {tokens:tokens, begin:begin, end:Math.max(0,tokens.length - 2)};
  };
  
  var func = {};
  var detectFunctionParameters = function(tokens) {
    var stack = [
      { declared:[], args:[], local:[], outer:[] }
    ];
    var scope;
    var indent = 0;
    var args = [];
    var vars = [];
    var op, token;
    var i, imax = tokens.length - 1;
    
    stack.setVariables = func.setVariables(stack);
    
    for (i = 0; i < imax; ++i) {
      token = tokens[i];
      stack.peek = stack[stack.length - 1];
      switch (token[TAG]) {
      case "PARAM_START":
        args = func.getInfoOfArguments(tokens, i);
        i    = args.end + 1;
        vars = args.vars;
        args = args.args;
        /* falls through */
      case "->": case "=>":
        scope = {
          declared: stack.peek.declared.concat(stack.peek.local).concat(stack.peek.args),
          args:vars.splice(0), local:[], outer:[], indent:indent
        };
        tokens[i].cc_funcParams = {
          args:args.splice(0), local:scope.local, outer:scope.outer
        };
        token.cc_funcRef = tokens[i];
        stack.push(scope);
        break;
      case "FOR":
        do {
          op = getNextOperand(tokens, i+1);
          func.getVariables(op).forEach(stack.setVariables);
          i = op.end + 1;
        } while (i < imax && tokens[i][TAG] === ",");
        break;
      case "INDENT":
        indent += 1;
        break;
      case "OUTDENT":
        indent -= 1;
        if (stack.peek.indent === indent) {
          stack.pop();
        }
        break;
      case "[":
        op = getNextOperand(tokens, i);
        func.getVariables(op).forEach(stack.setVariables);
        break;
      case "IDENTIFIER":
        if (tokens[i+1][TAG] === "CALL_START" || /^[A-Z]/.test(token[VALUE])) {
          break;
        }
        op = getNextOperand(tokens, i);
        if ((op.begin === op.end && tokens[op.end+1][TAG] !== ":") || tokens[op.begin+1][TAG] === ".") {
          func.getVariables(op).forEach(stack.setVariables);
        }
      }
    }
    tokens.cc_funcParams = {
      local: stack[0].local
    };
    return tokens;
  };

  func.setVariables = function(stack) {
    var ignored = [
      "cc", "global", "console", "setInterval", "setTimeout", "clearInterval", "clearTimeout"
    ];
    return function(name) {
      var i;
      if (ignored.indexOf(name) !== -1) {
        return;
      }
      if (stack.peek.declared.indexOf(name) === -1) {  // not declared yet
        if (stack.peek.args.indexOf(name) === -1) {    // not function parameters
          if (stack.peek.local.indexOf(name) === -1) { //   when a local variable (set)
            stack.peek.local.push(name);
          }
        }
        return;
      }
      
      // when not a local variable
      if (stack.peek.outer.indexOf(name) !== -1) {
        return;
      }
      
      // outer variable
      stack.peek.outer.push(name);
      for (i = stack.length - 2; i >= 0; i--) {
        if (stack[i].local.indexOf(name) !== -1) {
          return;
        }
        if (stack[i].outer.indexOf(name) === -1) {
          stack[i].outer.push(name);
        }
      }
    };
  };
  
  func.getInfoOfArguments = function(tokens, index) {
    var begin = index;
    var end   = indexOfParamEnd(tokens, index);
    var vars = [], args = [];
    var i, op;
    for (i = begin + 1; i < end; ++i) {
      op = getNextOperand(tokens, i);
      args.push(formatArgument(op));
      vars = func.getVariables(op, vars);
      i += op.end - op.begin + 1;
      if (tokens[i][TAG] === "=") {
        op = getNextOperand(tokens, i+1);
        args.push(formatArgument(op));
        i += op.end - op.begin + 1;
      } else {
        args.push(null);
      }
      if (tokens[i][TAG] !== ",") {
        i += 1;
      }
    }
    return {vars:vars, args:args, end:end};
  };
  func.getVariables = function(op, list) {
    var tokens = op.tokens, i, imax, _op;
    list = list || [];
    if (tokens[op.begin][TAG] === "[" && tokens[op.end][TAG] === "]") {
      imax = op.end;
      for (i = op.begin + 1; i < imax; ++i) {
        _op = getNextOperand(tokens, i);
        list = func.getVariables(_op, list);
        i += _op.end - _op.begin + 1;
        if (tokens[i][TAG] !== ",") {
          i += 1;
        }
      }
    } else {
      if (!isDot(tokens[op.begin-1])) {
        if (/^[a-z][a-zA-Z0-9_$]*$/.test(tokens[op.begin][VALUE])) {
          list.push(tokens[op.begin][VALUE]);
        }
      }
    }
    return list;
  };
  
  var replaceNumericString = function(tokens) {
    var token, str, val, i, imax = tokens.length;
    for (i = 0; i < imax; ++i) {
      token = tokens[i];
      if (token[TAG] === "STRING" && token[VALUE].charAt(0) === "\"") {
        str = token[VALUE].substr(1, token[VALUE].length - 2);
        val = numericstring.timevalue(str);
        if (typeof val !== "number") {
          val = numericstring.notevalue(str);
        }
        if (typeof val === "number") {
          token[TAG] = "NUMBER";
          token[VALUE] = val.toString();
        }
      }
    }
    return tokens;
  };
  
  var replaceStrictlyPrecedence = function(tokens) {
    var i, token, prev, next;
    for (i = tokens.length - 1; i > 0; i--) {
      token = tokens[i];
      if (token[TAG] === "MATH" && (token[VALUE] !== "+" && token[VALUE] !== "-")) {
        prev = getPrevOperand(tokens, i);
        next = getNextOperand(tokens, i);
        tokens.splice(next.end + 1, 0, [")", ")" , _]);
        tokens.splice(prev.begin  , 0, ["(", "(" , _]);
      }
    }
    return tokens;
  };
  
  var replaceUnaryOperator = function(tokens) {
    var i, token, selector, next;
    for (i = tokens.length - 1; i >= 0; i--) {
      token = tokens[i];
      if (token[TAG] !== "UNARY") {
        continue;
      }
      switch (token[VALUE]) {
      case "+":
        selector = "__plus__";
        break;
      case "-":
        selector = "__minus__";
        break;
      default:
        continue;
      }
      next = getNextOperand(tokens, i);
      tokens.splice(
        next.end + 1, 0,
        ["."         , "."     , _],
        ["IDENTIFIER", selector, _],
        ["CALL_START", "("     , _],
        ["CALL_END"  , ")"     , _]
      );
      tokens.splice(i, 1); // remove an origin operator
    }
    return tokens;
  };
  
  var replaceTextBinaryAdverb = function(code) {
    return code.replace(/([+\-*\/%])(W|S|C|F|T|X|WRAP|SHORT|CLIP|FOLD|TABLE|FLAT)\1/g, function(_, selector, adverb) {
      return selector + " \"#!" + adverb.charAt(0) + "\" " + selector;
    });
  };
  
  var replaceBinaryOperatorAdverbs = function(tokens) {
    var i, t0, t1, t2;
    for (i = tokens.length - 1; i >= 0; i--) {
      t0 = tokens[i];
      if (t0[TAG] !== "MATH") {
        continue;
      }
      t1 = tokens[i + 1];
      t2 = tokens[i + 2];
      if (t0[VALUE] === t2[VALUE] && /^"#![WSCFTX]"$/.test(t1[VALUE])) {
        t0.adverb = t1[VALUE].charAt(3);
        tokens.splice(i + 1, 2);
      }
    }
    return tokens;
  };
  
  var replaceBinaryOperator = function(tokens) {
    var i, token, selector, adverb, next;
    for (i = tokens.length - 1; i >= 0; i--) {
      token = tokens[i];
      if (token[TAG] !== "MATH") {
        continue;
      }
      switch (token[VALUE]) {
      case "+":
        selector = "__add__";
        break;
      case "-":
        selector = "__sub__";
        break;
      case "*":
        selector = "__mul__";
        break;
      case "/":
        selector = "__div__";
        break;
      case "%":
        selector = "__mod__";
        break;
      default:
        throw new Error("Unknown MATH:" + token[VALUE]);
      }
      adverb = token.adverb;
      next   = getNextOperand(tokens, i);
      tokens.splice(
        i, 1,
        ["."         , "."     , _],
        ["IDENTIFIER", selector, _],
        ["CALL_START", "("     , _]
      );
      if (adverb) {
        adverb = {
          W: "WRAP",
          S: "SHORT",
          C: "CLIP",
          F: "FOLD",
          T: "TABLE",
          X: "FLAT"
        }[adverb];
        tokens.splice(
          next.end + 3, 0,
          [","         , ","   , _],
          ["IDENTIFIER", adverb, _],
          ["CALL_END"  , ")"   , _]
        );
      } else {
        tokens.splice(
          next.end + 3, 0,
          ["CALL_END", ")", _]
        );
      }
    }
    return tokens;
  };
  
  var replaceCompoundAssign = function(tokens) {
    var i, j, token, selector, prev, next, subtokens;
    for (i = tokens.length - 1; i >= 0; i--) {
      token = tokens[i];
      if (token[TAG] !== "COMPOUND_ASSIGN") {
        continue;
      }
      switch (token[VALUE]) {
      case "+=":
        selector = "__add__";
        break;
      case "-=":
        selector = "__sub__";
        break;
      case "*=":
        selector = "__mul__";
        break;
      case "/=":
        selector = "__div__";
        break;
      case "%=":
        selector = "__mod__";
        break;
      default:
        throw new Error("Unknown COMPOUND_ASSIGN:" + token[VALUE]);
      }
      prev = getPrevOperand(tokens, i);
      next = getNextOperand(tokens, i);

      tokens.splice(
        i, 1,
        ["="         , "="     , _],
        ["."         , "."     , _],
        ["IDENTIFIER", selector, _],
        ["CALL_START", "("     , _]
      );
      tokens.splice(
        next.end + 4, 0,
        ["CALL_END", ")", _]
      );
      subtokens = [ i + 1, 0 ];
      for (j = prev.begin; j < i; ++j) {
        subtokens.push(tokens[j]);
      }
      tokens.splice.apply(tokens, subtokens);
    }
    return tokens;
  };
  
  var synthdef = {}; // utility functions
  
  var replaceSynthDefinition = function(tokens) {
    var i, index, args;
    
    for (i = tokens.length - 1; i >= 0; i--) {
      if (tokens[i][VALUE] !== "SynthDef") {
        continue;
      }
      if (isDot(tokens[i-1])) {
        continue;
      }
      index = i;
      while (index < tokens.length) {
        if (tokens[index][TAG] === "CALL_START") {
          break;
        }
        index += 1;
      }
      index = indexOfFunctionStart(tokens, index+1);
      if (index === -1) {
        continue;
      }
      args = tokens[index].cc_funcRef.cc_funcParams.args;
      if (args.length) {
        synthdef.replaceDefaultArguments(tokens, index, args);
      }
      index = getNextOperand(tokens, index).end + 1;
      synthdef.insertSynthDefArgumentsToAfterFunction(tokens, index, args);
    }
    return tokens;
  };
  synthdef.replaceDefaultArguments = function(tokens, index, args) {
    var i, removelen, spliceargs, imax = args.length;
    removelen  = indexOfParamEnd(tokens, index) - index + 1;
    spliceargs = [ index, removelen ];
    
    spliceargs.push(["PARAM_START", "(", _]);
    for (i = 0; i < imax; i += 2) {
      if (i) {
        spliceargs.push([",", ",", _]);
      }
      spliceargs.push(["IDENTIFIER", args[i], _]);
    }
    spliceargs.push(["PARAM_END"  , ")", _]);
    
    tokens.splice.apply(tokens, spliceargs);
  };
  synthdef.insertSynthDefArgumentsToAfterFunction = function(tokens, index, args) {
    var i, spliceargs, imax = args.length;
    spliceargs = [ index, 0 ];
    spliceargs.push([",", ",", _],
                    ["[", "[", _]);
    for (i = 0; i < imax; ++i) {
      if (i) {
        spliceargs.push([",", ",", _]);
      }
      spliceargs.push(["STRING", "'" + (args[i]||0) + "'", _]);
    }
    spliceargs.push(["]", "]", _]);
    
    tokens.splice.apply(tokens, spliceargs);
  };
  
  var segmented = {}; // utility functions
  
  var replaceSyncBlock = function(tokens) {
    var i, token, index, isSyncBlock;
    for (i = tokens.length - 1; i >= 0; i--) {
      token = tokens[i];
      if (token[TAG] !== "IDENTIFIER") {
        continue;
      }
      if (tokens[i+1][TAG] !== "CALL_START") {
        continue;
      }
      switch (token[VALUE]) {
      case "Task":
        isSyncBlock = false;
        break;
      case "syncblock":
        isSyncBlock = true;
        break;
      default:
        continue;
      }
      index = indexOfFunctionStart(tokens, i + 2);
      if (index === -1) {
        continue;
      }
      segmented.makeSyncBlock(getNextOperand(tokens, index), isSyncBlock);
    }
    return tokens;
  };
  
  segmented.makeSyncBlock = function(op, syncblock) {
    var tokens = op.tokens;
    var body   = tokens.splice(op.begin, op.end-op.begin+1);
    var after  = tokens.splice(op.begin);
    var localVars, outerVars, args;
    
    var ref = body[0].cc_funcRef;
    localVars = ref.cc_funcParams.local;
    outerVars = ref.cc_funcParams.outer;
    args = ref.cc_funcParams.args.filter(function(name, i) {
      return !(i & 1);
    }).map(function(x) {
      var tokens = CoffeeScript.tokens(x);
      tokens.pop(); // remove TERMINATOR
      return tokens;
    });

    if (args.length) {
      // remove default args
      body.splice(0, indexOfParamEnd(body, 0) + 1);
    }
    body.splice(0, 2); // remove ->, INDENT
    body.pop();        // remove OUTDENT
    
    var replaced = segmented.createSyncBlock(body, args, localVars, syncblock);
    
    for (var i = replaced.length; i--; ) {
      replaced[i].cc_segmented = true;
    }
    push.apply(tokens, replaced);
    push.apply(tokens, after);
    
    return op;
  };
  
  segmented.createSyncBlock = function(body, args, localVars, syncblock) {
    var tokens = [];
    if (!syncblock) {
      tokens.push(["IDENTIFIER", "syncblock", _],
                  ["CALL_START", "("        , _]);
    }
    tokens.push(["->"        , "->"       , _],
                ["INDENT"    , 2          , _]);
    {
      segmented.insertLocalVariables(tokens, localVars);
      tokens.push(["["      , "[" , _],
                  ["INDENT" , 2   , _]);
      var numOfSegments = 0;
      while (body.length) {
        if (numOfSegments++) {
          tokens.push(["TERMINATOR", "\n", _]);
        }
        segmented.beginOfSegment(tokens, args);
        segmented.insertSegment(tokens, body);
        segmented.endOfSegment(tokens, args);
      }
      tokens.push(["OUTDENT", 2  , _],
                  ["]"      , "]", _]);
    }
    tokens.push(["OUTDENT" , 2  , _]);
    if (!syncblock) {
      tokens.push(["CALL_END", ")", _]);
    }
    return tokens;
  };
  segmented.insertLocalVariables = function(tokens, localVars) {
    if (localVars && localVars.length) {
      for (var i = 0, imax = localVars.length; i < imax; i++) {
        tokens.push(["IDENTIFIER", localVars[i], _],
                    ["="         , "="         , _]);
      }
      tokens.push(["UNDEFINED" , "undefined", _],
                  ["TERMINATOR", "\n", _]);
    }
  };
  segmented.beginOfSegment = function(tokens, args) {
    if (args && args.length) {
      tokens.push(["PARAM_START", "(", _]);
      for (var i = 0, imax = args.length; i < imax; ++i) {
        if (i) {
          tokens.push([",", ",", _]);
        }
        push.apply(tokens, args[i]);
      }
      tokens.push(["PARAM_END"  , ")", _]);
    }
    tokens.push(["->"    , "->", _],
                ["INDENT", 2   , _]);
  };
  segmented.splitIdentifiers = [ "Task", "syncblock", "wait" ];
  segmented.insertSegment = function(tokens, body) {
    while (body.length) {
      var line = segmented.fetchLine(body);
      push.apply(tokens, line);
      for (var i = 0, imax = line.length; i < imax; ++i) {
        var t = line[i];
        if (t[TAG] === "IDENTIFIER" && segmented.splitIdentifiers.indexOf(t[VALUE]) !== -1) {
          return;
        }
      }
    }
  };
  segmented.endOfSegment = function(tokens) {
    tokens.push(["OUTDENT", 2, _]);
  };
  segmented.fetchLine = function(tokens) {
    var depth = 0;
    for (var i = 0, imax = tokens.length; i < imax; ++i) {
      switch (tokens[i][TAG]) {
      case "(": case "{": case "[":
      case "CALL_START": case "PARAM_START": case "INDEX_START":
        depth += 1;
        break;
      case "]": case "}": case ")":
      case "CALL_END": case "PARAM_END": case "INDEX_END":
        depth -= 1;
        break;
      case "TERMINATOR":
        if (depth === 0) {
          return tokens.splice(0, i + 1);
        }
        break;
      case "INDENT":
        depth += 1;
        break;
      case "OUTDENT":
        if (depth === 0) {
          return tokens.splice(0, i);
        }
        depth -= 1;
        break;
      }
    }
    return tokens.splice(0);
  };
  
  var replaceGlobalVariables = function(tokens) {
    var i, token;
    for (i = tokens.length - 1; i >= 0; i--) {
      token = tokens[i];
      if (token[TAG] !== "IDENTIFIER") {
        continue;
      }
      if (!/^\$[a-z][a-zA-Z0-9_]*$/.test(token[VALUE])) {
        continue;
      }
      if (isColon(tokens[i+1])) {
        continue; // { NotGlobal:"dict key is not global" }
      }
      if (isDot(tokens[i-1])) {
        continue; // this.is.NotGlobal, @isNotGlobal
      }
      tokens.splice(
        i, 1,
        ["IDENTIFIER", "global", _],
        ["."         , "."     , _],
        ["IDENTIFIER", token[VALUE].substr(1), _]
      );
    }
    return tokens;
  };
  
  var replaceCCVariables = function(tokens) {
    var i, token;
    for (i = tokens.length - 1; i >= 0; i--) {
      token = tokens[i];
      if (token[TAG] !== "IDENTIFIER") {
        continue;
      }
      if (!cc.global.hasOwnProperty(token[VALUE])) {
        continue;
      }
      if (isColon(tokens[i+1])) {
        continue;
      }
      if (isDot(tokens[i-1])) {
        continue;
      }
      tokens.splice(
        i, 0,
        ["IDENTIFIER", "cc", _],
        ["."         , "." , _]
      );
    }
    return tokens;
  };
  
  var wrapWholeCode = function(tokens) {
    tokens.unshift(["("          , "("       , _],
                   ["PARAM_START", "("       , _],
                   ["IDENTIFIER" , "global"  , _],
                   [","         , ","        , _],
                   ["IDENTIFIER", "cc"       , _],
                   ["PARAM_END"  , ")"       , _],
                   ["->"         , "->"      , _],
                   ["INDENT"     , 2         , _]);
    tokens.push(["OUTDENT"   , 2            , _],
                [")"         , ")"          , _],
                ["."         , "."          , _],
                ["IDENTIFIER", "call"       , _],
                ["CALL_START", "("          , _],
                ["IDENTIFIER", "cc"         , _],
                ["."         , "."          , _],
                ["IDENTIFIER", "__context__", _],
                [","         , ","          , _],
                ["THIS"      , "this"       , _],
                ["."         , "."          , _],
                ["IDENTIFIER", "self"       , _],
                ["LOGIC"     , "||"         , _],
                ["IDENTIFIER", "global"     , _],
                [","         , ","          , _],
                ["IDENTIFIER", "cc"         , _],
                ["CALL_END"  , ")"          , _]);
    return tokens;
  };

  var getConditionedTokens = function(code) {
    var tokens;
    code = replaceTextBinaryAdverb(code);
    tokens = CoffeeScript.tokens(code);
    if (tokens.length) {
      tokens = replaceNumericString(tokens);
      tokens = detectFunctionParameters(tokens);
      tokens = detectPlusMinusOperator(tokens);
      tokens = replaceBinaryOperatorAdverbs(tokens);
    }
    return tokens;
  };
  
  var CoffeeCompiler = (function() {
    function CoffeeCompiler() {
    }
    CoffeeCompiler.prototype.tokens = function(code) {
      var tokens = getConditionedTokens(code);
      if (tokens.length) {
        tokens = replaceGlobalVariables(tokens);
        tokens = replaceStrictlyPrecedence(tokens);
        tokens = replaceUnaryOperator(tokens);
        tokens = replaceBinaryOperator(tokens);
        tokens = replaceCompoundAssign(tokens);
        tokens = replaceSynthDefinition(tokens);
        tokens = replaceSyncBlock(tokens);
        tokens = replaceCCVariables(tokens);
        tokens = wrapWholeCode(tokens);
      }
      return tokens;
    };
    CoffeeCompiler.prototype.compile = function(code) {
      return CoffeeScript.nodes(this.tokens(code)).compile({bare:true}).trim();
    };
    return CoffeeCompiler;
  })();
  
  cc.createCompiler = function() {
    return new CoffeeCompiler();
  };
  
  module.exports = {
    CoffeeCompiler: CoffeeCompiler,
    
    // private methods
    indexOfParamEnd     : indexOfParamEnd,
    indexOfFunctionStart: indexOfFunctionStart,
    formatArgument      : formatArgument,
    getPrevOperand          : getPrevOperand,
    getNextOperand          : getNextOperand,
    detectPlusMinusOperator : detectPlusMinusOperator,
    revertPlusMinusOperator : revertPlusMinusOperator,
    detectFunctionParameters: detectFunctionParameters,
    
    replaceTextBinaryAdverb     : replaceTextBinaryAdverb,
    replaceBinaryOperatorAdverbs: replaceBinaryOperatorAdverbs,
    replaceNumericString     : replaceNumericString,
    replaceStrictlyPrecedence: replaceStrictlyPrecedence,
    replaceUnaryOperator     : replaceUnaryOperator,
    replaceBinaryOperator    : replaceBinaryOperator,
    replaceCompoundAssign    : replaceCompoundAssign,
    replaceSynthDefinition   : replaceSynthDefinition,
    replaceSyncBlock         : replaceSyncBlock,
    replaceGlobalVariables   : replaceGlobalVariables,
    replaceCCVariables       : replaceCCVariables,
    wrapWholeCode            : wrapWholeCode
  };

});
define('cc/common/numericstring', function(require, exports, module) {

  var cc = require("../cc");
  
  var timevalue = function(str) {
    var result = null;
    var freq;
    if (str.charAt(0) === "~") {
      freq = true;
      str  = str.substr(1);
    }
    do {
      result = hz(str);
      if (result !== null) {
        break;
      }
      result = time(str);
      if (result !== null) {
        break;
      }
      result = hhmmss(str);
      if (result !== null) {
        break;
      }
      result = samples(str);
      if (result !== null) {
        break;
      }
      result = note(str);
      if (result !== null) {
        break;
      }
      result = beat(str);
      if (result !== null) {
        break;
      }
      result = ticks(str);
    } while (false);
    
    if (result !== null) {
      if (!freq) {
        return result;
      }
      if (result !== 0) {
        return 1 / result;
      }
    }
    return str;
  };
  
  var hz = function(str) {
    var m = /^(\d+(?:\.\d+)?)hz$/i.exec(str);
    if (m) {
      return +m[1] === 0 ? 0 : 1 / +m[1];
    }
    return null;
  };
  var time = function(str) {
    var m = /^(\d+(?:\.\d+)?)(min|sec|m)s?$/i.exec(str);
    if (m) {
      switch (m[2]) {
      case "min": return +(m[1]||0) * 60;
      case "sec": return +(m[1]||0);
      case "m"  : return +(m[1]||0) / 1000;
      }
    }
    return null;
  };

  var hhmmss = function(str) {
    var m = /^(?:([1-9][0-9]*):)?([0-5]?[0-9]):([0-5][0-9])(?:\.(\d{1,3}))?$/.exec(str);
    if (m) {
      var x = 0;
      x += (m[1]|0) * 3600;
      x += (m[2]|0) * 60;
      x += (m[3]|0);
      x += (((m[4]||"")+"00").substr(0, 3)|0) / 1000;
      return x;
    }
    return null;
  };

  var samples = function(str) {
    var m = /^(\d+)samples(?:\/(\d+)hz)?$/i.exec(str);
    if (m) {
      return m[1] / ((m[2]|0) || cc.sampleRate);
    }
    return null;
  };

  var calcNote = function(bpm, len, dot) {
    var x = (60 / bpm) * (4 / len);
    x *= [1, 1.5, 1.75, 1.875][dot] || 1;
    return x;
  };
  var note = function(str) {
    var m = /^bpm([1-9]\d+(?:\.\d+)?)\s*l([1-9]\d*)(\.*)$/i.exec(str);
    if (m) {
      return calcNote(+m[1], +m[2], m[3].length);
    }
    return null;
  };

  var calcBeat = function(bpm, measure, beat, ticks) {
    var x = (measure * 4 + beat) * 480 + ticks;
    return (60 / bpm) * (x / 480);
  };
  var beat = function(str) {
    var m = /^bpm([1-9]\d+(?:\.\d+)?)\s*(\d+)\.(\d+).(\d{1,3})$/i.exec(str);
    if (m) {
      return calcBeat(+m[1], +m[2], +m[3], +m[4]);
    }
    return null;
  };

  var calcTicks = function(bpm, ticks) {
    return 60 / bpm * ticks / 480;
  };
  var ticks = function(str) {
    var m = /^bpm([1-9]\d+(?:\.\d+)?)\s*(\d+)ticks$/i.exec(str);
    if (m) {
      return calcTicks(+m[1], +m[2]);
    }
    return null;
  };
  
  var notevalue = function(str) {
    var m = /^([CDEFGAB])([-+#b])?(\d)$/.exec(str);
    if (m) {
      var midi = {C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]] + (m[3] * 12) + 12;
      var acc = m[2];
      if (acc === "-" || acc === "b") {
        midi--;
      } else if (acc === "+" || acc === "#") {
        midi++;
      }
      return midi;
    }
    return str;
  };
  
  module.exports = {
    hz     : hz,
    time   : time,
    hhmmss : hhmmss,
    samples: samples,
    note   : note,
    beat   : beat,
    ticks  : ticks,
    calcNote : calcNote,
    calcBeat : calcBeat,
    calcTicks: calcTicks,
    timevalue: timevalue,
    notevalue: notevalue
  };

});
define('cc/client/client-worker', function(require, exports, module) {

  var cc = require("../cc");
  var extend = require("../common/extend");

  var SynthClientWorkerImpl = (function() {
    function SynthClientWorkerImpl(exports, opts) {
      cc.opmode = "worker";
      this.strmLength = 1024;
      this.bufLength  = 64;
      
      cc.SynthClientImpl.call(this, exports, opts);
      
      var that = this;
      this.lang = cc.createWebWorker(cc.coffeeColliderPath);
      this.lang.onmessage = function(e) {
        that.recvFromLang(e.data);
      };
    }
    extend(SynthClientWorkerImpl, cc.SynthClientImpl);
    
    return SynthClientWorkerImpl;
  })();
  
  cc.createSynthClientWorkerImpl = function(exports, opts) {
    return new SynthClientWorkerImpl(exports, opts);
  };
  
  module.exports = {};

});
define('cc/common/extend', function(require, exports, module) {
  
  var extend = function(child, parent) {
    for (var key in parent) {
      if (parent.hasOwnProperty(key)) {
        child[key] = parent[key];
      }
    }
    /*jshint validthis:true */
    function ctor() {
      this.constructor = child;
    }
    /*jshint validthis:false */
    ctor.prototype = parent.prototype;
    /*jshint newcap:false */
    child.prototype = new ctor();
    /*jshint newcap:true */
    return child;
  };
  
  module.exports = extend;

});
define('cc/client/client-nodejs', function(require, exports, module) {

  var cc = require("../cc");
  var extend = require("../common/extend");
  
  var SynthClientNodeJSImpl = (function() {
    function SynthClientNodeJSImpl(exports, opts) {
      cc.opmode = "nodejs";
      this.strmLength = 4096;
      this.bufLength  = 64;
      
      cc.SynthClientImpl.call(this, exports, opts);
      
      this.api = null;
    }
    extend(SynthClientNodeJSImpl, cc.SynthClientImpl);
    
    return SynthClientNodeJSImpl;
  })();
  
  cc.createSynthClientNodeJSImpl = function(exports, opts) {
    return new SynthClientNodeJSImpl(exports, opts);
  };
  
  module.exports = {};

});
define('cc/client/client-socket', function(require, exports, module) {

  var cc = require("../cc");
  var extend = require("../common/extend");

  var SynthClientSocketImpl = (function() {
    function SynthClientSocketImpl(exports, opts) {
      cc.opmode = "socket";
      this.strmLength = 4096;
      this.bufLength  = 64;
      
      cc.SynthClientImpl.call(this, exports, opts);
      
      var that = this;
      this.lang = cc.createWebWorker(cc.coffeeColliderPath + "#socket");
      this.lang.onmessage = function(e) {
        that.recvFromLang(e.data);
      };
      
      exports.socket = {
        open: function() {
          that.sendToLang([ "/socket/open", opts.socket ]);
        },
        close: function() {
          that.sendToLang([ "/socket/close" ]);
        },
        send: function(msg) {
          that.sendToLang([ "/socket/sendToServer", msg ]);
        }
      };
    }
    extend(SynthClientSocketImpl, cc.SynthClientImpl);
    
    return SynthClientSocketImpl;
  })();
  
  cc.createSynthClientSocketImpl = function(exports, opts) {
    return new SynthClientSocketImpl(exports, opts);
  };
  
  module.exports = {};
  
});
define('cc/lang/lang', function(require, exports, module) {
  
  var cc = require("./cc");
  var pack   = require("../common/pack").pack;
  var random = require("../common/random");
  var commands = {};
  
  var SynthLang = (function() {
    function SynthLang() {
      this.klassName = "SynthLang";
      this.sampleRate = 0;
      this.channels   = 0;
      this.strmLength = 0;
      this.bufLength  = 0;
      this.rootNode    = cc.createLangRootNode();
      this.taskManager = cc.createTaskManager();
      this.timelineResult  = [];
      this.bufferRequestId = 0;
      this.bufferRequestCallback = {};
      this.phase = 0;
      this.random = new random.Random();
      this.currentTime = 0;
      
      this.extendCommands(commands);
    }
    
    SynthLang.prototype.sendToClient = function() {
      throw "SynthLang#sendToClient: should be overridden[" + cc.opmode + "]";
    };
    SynthLang.prototype.recvFromClient = function(msg) {
      if (msg) {
        var func = commands[msg[0]];
        if (func) {
          func.call(this, msg);
        }
      }
    };
    SynthLang.prototype.sendToServer = function() {
      throw "SynthLang#sendToServer: should be overridden[" + cc.opmode + "]";
    };
    SynthLang.prototype.recvFromServer = function(msg) {
      if (msg instanceof Int16Array) {
        this.sendToClient(msg);
      } else {
        var func = commands[msg[0]];
        if (func) {
          func.call(this, msg);
        } else {
          throw new Error("Unknown command: " + msg[0]);
        }
      }
    };
    SynthLang.prototype.pushToTimeline = function(cmd) {
      this.timelineResult.push(cmd);
    };
    SynthLang.prototype.play = function(msg) {
      this.currentTimeIncr = (this.bufLength / this.sampleRate) * 1000;
      this.taskManager.start(this.currentTimeIncr);
      this.sendToServer(msg);
    };
    SynthLang.prototype.pause = function(msg) {
      this.sendToServer(msg);
    };
    SynthLang.prototype.reset = function(msg) {
      this.currentTime = 0;
      cc.resetBuffer();
      cc.resetNode();
      cc.resetBuiltin();
      this.taskManager.reset();
      this.sendToServer(msg);
    };
    SynthLang.prototype.requestBuffer = function(path, callback) {
      if (!(typeof path === "string" && typeof callback === "function")) {
        return;
      }
      var requestId = this.bufferRequestId++;
      this.bufferRequestCallback[requestId] = callback;
      this.sendToClient(["/buffer/request", path, requestId]);
    };
    SynthLang.prototype.process = function() {
      throw "SynthLang#process: should be overridden";
    };
    SynthLang.prototype.extendCommands = function() {
    };
    
    return SynthLang;
  })();
  
  
  commands["/connected"] = function(msg) {
    if (cc.opmode !== "nodejs") {
      msg.push(Object.keys(cc.global));
    }
    this.sendToClient(msg);
  };
  commands["/init"] = function(msg) {
    this.sampleRate = msg[1]|0;
    this.channels   = msg[2]|0;
    this.sendToServer(msg);
  };
  commands["/play"] = function(msg) {
    this.play(msg);
  };
  commands["/played"] = function(msg) {
    this.sendToClient(msg);
  };
  commands["/pause"] = function(msg) {
    this.pause(msg);
  };
  commands["/paused"] = function(msg) {
    this.sendToClient(msg);
  };
  commands["/reset"] = function(msg) {
    this.reset(msg);
  };
  commands["/process"] = function() {
    this.process();
  };
  commands["/execute"] = function(msg) {
    var execId   = msg[1];
    var code     = msg[2];
    var append   = msg[3];
    var callback = msg[4];
    if (!append) {
      this.reset(["/reset"]);
    }
    if (cc.global !== global) {
      global.cc = cc.global;
    }
    global.cc.__context__ = {
      version: cc.version
    };
    var result = eval.call(global, code);
    if (callback) {
      this.sendToClient(["/executed", execId, pack(result)]);
    }
  };
  commands["/buffer/response"] = function(msg) {
    var buffer = msg[1];
    var requestId = msg[2];
    var callback = this.bufferRequestCallback[requestId];
    if (callback) {
      callback(buffer);
      delete this.bufferRequestCallback[requestId];
    }
  };
  commands["/send"] = function(msg) {
    var args = msg[1];
    cc.global.Message.emit.apply(cc.global.Message, args);
  };
  
  cc.SynthLang = SynthLang;
  
  cc.createSynthLang = function() {
    switch (cc.opmode) {
    case "worker":
      return cc.createWorkerSynthLang();
    case "nodejs":
      return cc.createNodeJSSynthLang();
    case "socket":
      return cc.createSocketSynthLang();
    }
    throw new Error("A SynthLang is not defined for: " + cc.opmode);
  };
  
  // TODO: moved
  require("./array");
  require("./boolean");
  require("./buffer");
  require("./builtin");
  require("./bus");
  require("./date");
  require("./env");
  require("./function");
  require("./message");
  require("./mix");
  require("./node");
  require("./number");
  require("./object");
  require("./pattern");
  require("./scale");
  require("./string");
  require("./syncblock");
  require("./synthdef");
  require("./task");
  require("./ugen");
  require("./basic_ugen");
  require("../plugins/installer");
  
  require("./lang-worker");
  require("./lang-nodejs");
  require("./lang-socket");

  Object.keys(cc.ugen.specs).forEach(function(name) {
    cc.ugen.register(name, cc.ugen.specs[name]);
  });
  
  cc.global.System = {};
  cc.global.System.currentTime = function() {
    return cc.lang.currentTime;
  };
  
  module.exports = {};

});
define('cc/lang/cc', function(require, exports, module) {
  
  module.exports = require("../cc");

});
define('cc/common/random', function(require, exports, module) {
  
  var Random = (function() {
    function Random(seed) {
      if (typeof seed !== "number") {
        seed = Date.now();
      }
      seed = new Uint32Array([seed]);
      seed[0] += ~(seed[0] <<  15);
      seed[0] ^=   seed[0] >>> 10;
      seed[0] +=   seed[0] <<  3;
      seed[0] ^=   seed[0] >>> 6;
      seed[0] += ~(seed[0] <<  11);
      seed[0] ^=   seed[0] >>> 16;
      
      this.s1 = new Uint32Array([1243598713 ^ seed[0]]);
      this.s2 = new Uint32Array([3093459404 ^ seed[0]]);
      this.s3 = new Uint32Array([1821928721 ^ seed[0]]);
      
      if (this.s1[0] <  2) {
        this.s1[0] = 1243598713;
      }
      if (this.s2[0] <  8) {
        this.s2[0] = 3093459404;
      }
      if (this.s3[0] < 16) {
        this.s3[0] = 1821928721;
      }
    }
    
    Random.prototype.trand = function() {
      this.s1[0] = ((this.s1[0] & 4294967294) << 12) ^ (((this.s1[0] << 13) ^  this.s1[0]) >>> 19);
      this.s2[0] = ((this.s2[0] & 4294967288) <<  4) ^ (((this.s2[0] <<  2) ^  this.s2[0]) >>> 25);
      this.s3[0] = ((this.s3[0] & 4294967280) << 17) ^ (((this.s3[0] <<  3) ^  this.s3[0]) >>> 11);
      return this.s1[0] ^ this.s2[0] ^ this.s3[0];
    };
    
    var _i = new Uint32Array(1);
    var _f = new Float32Array(_i.buffer);
    
    Random.prototype.next = function() {
      _i[0] = 0x3F800000 | (this.trand() >>> 9);
      return _f[0] - 1;
    };
    
    return Random;
  })();
  
  module.exports = {
    Random: Random
  };

});
define('cc/lang/array', function(require, exports, module) {
  
  var cc = require("./cc");
  var fn = require("./fn");
  var ops   = require("../common/ops");
  var utils = require("./utils");
  var slice = [].slice;
  
  // common methods
  fn.defineProperty(Array.prototype, "copy", function() {
    return this.slice();
  });

  fn.defineProperty(Array.prototype, "clone", fn(function(deep) {
    if (deep) {
      return this.map(function(x) { return x && x.clone ? x.clone(true) : x; });
    }
    return this.slice();
  }).defaults(ops.COMMONS.clone).build());
  
  fn.defineProperty(Array.prototype, "dup", fn(function(n, deep) {
    var a = new Array(n|0);
    for (var i = 0, imax = a.length; i < imax; ++i) {
      a[i] = this.clone(deep);
    }
    return a;
  }).defaults(ops.COMMONS.dup).build());
  
  fn.defineProperty(Array.prototype, "do", function(func) {
    var list = this;
    if (cc.instanceOfSyncBlock(func)) {
      if (cc.currentSyncBlockHandler) {
        cc.currentSyncBlockHandler.__sync__(func, cc.createTaskArgumentsArray(list));
      } else {
        list.forEach(function(x, i) {
          func.clone().perform([x, i]);
        });
      }
    } else {
      list.forEach(func);
    }
    return this;
  });
  
  fn.defineProperty(Array.prototype, "wait", function(logic) {
    var list = this;
    if (cc.currentTask) {
      cc.currentTask.__wait__(cc.createTaskWaitTokenArray(list, logic));
    }
    return this;
  });
  
  fn.defineProperty(Array.prototype, "asUGenInput", function() {
    return this.map(utils.asUGenInput);
  });

  fn.defineProperty(Array.prototype, "asString", function() {
    return "[ " + this.map(utils.asString).join(", ") + " ]";
  });
  
  // unary operator methods
  ["__plus__","__minus__"].concat(Object.keys(ops.UNARY_OPS)).forEach(function(selector) {
    fn.defineProperty(Array.prototype, selector, function() {
      return this.map(function(x) {
        return x[selector]();
      });
    });
  });
  
  // binary operator methods
  var foldAt = function(list, index) {
    var len = list.length;
    index = index % (len * 2 - 2);
    if (index >= len) {
      index = 2 * (len - 1) - index;
    }
    return list[index];
  };
  var calc_with_adverb = function(selector, a, b, adverb) {
    var sort = a.length - b.length;
    switch (adverb) {
    case 1:
      if (sort > 0) {
        a.splice(b.length);
      } else if (sort < 0) {
        b.splice(a.length);
      }
      break;
    case 2:
      if (sort > 0) {
        return a.map(function(a, i) {
          return a[selector](foldAt(b, i));
        });
      } else if (sort < 0) {
        return b.map(function(b, i) {
          return foldAt(a, i)[selector](b);
        });
      }
      break;
    case 3:
    case 4:
      var table = a.map(function(a) {
        return b.map(function(b) {
          return a[selector](b);
        });
      });
      return (adverb === 4) ? utils.flatten(table) : table;
    }
    if (a.length === b.length) {
      return a.map(function(a, index) {
        return a[selector](b[index]);
      });
    } else if (a.length > b.length) {
      return a.map(function(a, index) {
        return a[selector](b[index % b.length]);
      });
    } else {
      return b.map(function(b, index) {
        return a[index % a.length][selector](b);
      });
    }
  };
  
  cc.global.SHORT = 1;
  cc.global.FOLD  = 2;
  cc.global.TABLE = 3;
  cc.global.FLAT  = 4;
  
  ["__add__","__sub__","__mul__","__div__","__mod__"].concat(Object.keys(ops.BINARY_OPS)).forEach(function(selector) {
    var ugenSelector;
    if (ops.ALIASES.hasOwnProperty(selector)) {
      ugenSelector = ops.ALIASES[selector];
    } else {
      ugenSelector = selector;
    }
    fn.defineProperty(Array.prototype, selector, function(b, adverb) {
      if (Array.isArray(b)) {
        return calc_with_adverb(selector, this, b, adverb);
      } else if (cc.instanceOfUGen(b)) {
        return this.map(function(a) {
          return cc.createBinaryOpUGen(ugenSelector, a, b);
        });
      }
      return this.map(function(a) {
        return a[selector](b);
      });
    });
  });
  
  // arity operators
  Object.keys(ops.ARITY_OPS).forEach(function(selector) {
    fn.defineProperty(Array.prototype, selector, fn(function() {
      var args = slice.call(arguments);
      return this.map(function(_in) {
        if (_in[selector]) {
          return _in[selector].apply(_in, args);
        }
        return _in;
      });
    }).defaults(ops.ARITY_OPS[selector]).multiCall().build());
  });

  // chord
  var midichord = fn(function(name, inversion) {
    return this.map(function(x) {
      if (typeof x === "number") {
        return x.midichord(name, inversion);
      }
      return x;
    });
  }).defaults("name=\"\",inversion=0").multiCall().build();
  
  fn.defineProperty(Array.prototype, "midichord", midichord);
  fn.defineProperty(Array.prototype, "chord"    , midichord); // deprecate

  var cpschord = fn(function(name, inversion) {
    return this.map(function(x) {
      if (typeof x === "number") {
        return x.cpschord(name, inversion);
      }
      return x;
    });
  }).defaults("name=\"\",inversion=0").multiCall().build();
  
  fn.defineProperty(Array.prototype, "cpschord", cpschord);
  fn.defineProperty(Array.prototype, "chordcps", cpschord); // deprecate

  var ratiochord = fn(function(name, inversion) {
    return this.map(function(x) {
      if (typeof x === "number") {
        return x.ratiochord(name, inversion);
      }
      return x;
    });
  }).defaults("name=\"\",inversion=0").multiCall().build();
  
  fn.defineProperty(Array.prototype, "ratiochord", ratiochord);
  fn.defineProperty(Array.prototype, "chordratio", ratiochord); // deprecate
  
  // Array methods
  // utils
  var cc_func = function(func) {
    if (typeof func === "function") {
      return func;
    }
    return function() {
      return func;
    };
  };
  var drand = function() {
    return cc.lang.random.next();
  };
  var irand = function(n) {
    return ((cc.lang.random.next() * n)|0);
  };
  
  // class methods
  fn.defineProperty(Array, "series", fn(function(size, start, step) {
    size |= 0;
    var a = new Array(size);
    var value = start;
    for (var i = 0, imax = a.length; i < imax; i++) {
      a[i] = value;
      value += step;
    }
    return a;
  }).defaults("size=0,start=0,step=1").build());
  
  fn.defineProperty(Array, "geom", fn(function(size, start, grow) {
    size |= 0;
    var a = new Array(size);
    var value = start;
    for (var i = 0, imax = a.length; i < imax; i++) {
      a[i] = value;
      value *= grow;
    }
    return a;
  }).defaults("size=0,start=1,grow=2").build());
  
  fn.defineProperty(Array, "fill", fn(function(size, func) {
    size |= 0;
    var a = new Array(size);
    func  = cc_func(func);
    for (var i = 0, imax = a.length; i < imax; ++i) {
      a[i] = func(i);
    }
    return a;
  }).defaults("size=0,func=0").build());
  
  fn.defineProperty(Array, "fill2D", fn(function(rows, cols, func) {
    rows |= 0;
    cols |= 0;
    func = cc_func(func);
    var a, a2, row, col;
    a = new Array(rows);
    for (row = 0; row < rows; ++row) {
      a2 = a[row] = new Array(cols);
      for (col = 0; col < cols; ++col) {
        a2[col] = func(row, col);
      }
    }
    return a;
  }).defaults("rows=0,cols=0,func=0").build());
  
  fn.defineProperty(Array, "fillND", (function() {
    var fillND = function(dimensions, func, args) {
      var n, a, argIndex, i;
      n = dimensions[0];
      a = [];
      argIndex = args.length;
      args = args.concat(0);
      if (dimensions.length <= 1) {
        for (i = 0; i < n; ++i) {
          args[argIndex] = i;
          a.push(func.apply(null, args));
        }
      } else {
        dimensions = dimensions.slice(1);
        for (i = 0; i < n; ++i) {
          args[argIndex] = i;
          a.push(fillND(dimensions, func, args));
        }
      }
      return a;
    };
    return fn(function(dimensions, func) {
      return fillND(dimensions, cc_func(func), []);
    }).defaults("dimensions=[],func=0").build();
  })());
  
  fn.defineProperty(Array, "fib", fn(function(size, x, y) {
    var a = new Array(size|0);
    for (var t, i = 0, imax = a.length; i < imax; i++) {
      a[i] = y;
      t = y;
      y = x + y;
      x = t;
    }
    return a;
  }).defaults("size=0,a=0,b=1").build());
  
  fn.defineProperty(Array, "rand", fn(function(size, minVal, maxVal) {
    var a = new Array(size|0);
    for (var i = 0, imax = a.length; i < imax; i++) {
      a[i] = minVal.rrand(maxVal);
    }
    return a;
  }).defaults("size=0,minVal=0,maxVal=1").build());
  
  fn.defineProperty(Array, "rand2", fn(function(size, val) {
    var a = new Array(size|0);
    for (var i = 0, imax = a.length; i < imax; i++) {
      a[i] = val.rand2();
    }
    return a;
  }).defaults("size=0,val=1").build());
  
  fn.defineProperty(Array, "linrand", fn(function(size, minVal, maxVal) {
    var a = new Array(size|0);
    for (var i = 0, imax = a.length; i < imax; i++) {
      a[i] = minVal.linrand(maxVal);
    }
    return a;
  }).defaults("size=0,minVal=0,maxVal=1").build());
  
  fn.defineProperty(Array, "exprand", fn(function(size, minVal, maxVal) {
    var a = new Array(size|0);
    for (var i = 0, imax = a.length; i < imax; i++) {
      a[i] = minVal.exprand(maxVal);
    }
    return a;
  }).defaults("size=0,minVal=0.001,maxVal=1").build());
  
  fn.defineProperty(Array, "interpolation", fn(function(size, start, end) {
    if (size === 1) {
      return [start];
    }
    var a = new Array(size|0);
    var step = (end - start) / (size - 1);
    for (var i = 0, imax = a.length; i < imax; i++) {
      a[i] = start + (i * step);
    }
    return a;
  }).defaults("size=0,start=0,end=1").build());
  
  
  // instance methods
  var ifold = function(index, len) {
    var len2 = len * 2 - 2;
    index = (index|0) % len2;
    if (index < 0) {
      index += len2;
    }
    if (len <= index) {
      index = len2 - index;
    }
    return index;
  };
  
  fn.defineProperty(Array.prototype, "size", function() {
    return this.length;
  });
  
  var minItem = function(func) {
    var i, imax, val, minVal, minItem;
    if (func) {
      func = cc_func(func);
      minItem = this[0];
      minVal  = func(this[0], 0);
      for (i = 1, imax = this.length; i < imax; ++i) {
        val = func(this[i], i);
        if (val < minVal) {
          minItem = this[i];
          minVal = val;
        }
      }
    } else {
      minItem = this[0];
      for (i = 1, imax = this.length; i < imax; ++i) {
        if (this[i] < minItem) {
          minItem = this[i];
        }
      }
    }
    return minItem;
  };
  
  fn.defineProperty(Array.prototype, "minItem" , minItem);
  fn.defineProperty(Array.prototype, "minValue", minItem);
  
  var maxItem = function(func) {
    var i, imax, val, maxVal, maxItem;
    if (func) {
      func = cc_func(func);
      maxItem = this[0];
      maxVal  = func(this[0], 0);
      for (i = 1, imax = this.length; i < imax; ++i) {
        val = func(this[i], i);
        if (maxVal < val) {
          maxItem = this[i];
          maxVal = val;
        }
      }
    } else {
      maxItem = this[0];
      for (i = 1, imax = this.length; i < imax; ++i) {
        if (maxItem < this[i]) {
          maxItem = this[i];
        }
      }
    }
    return maxItem;
  };
  
  fn.defineProperty(Array.prototype, "maxItem" , maxItem);
  fn.defineProperty(Array.prototype, "maxValue", maxItem);
  
  fn.defineProperty(Array.prototype, "at", fn(function(index) {
    return this[index|0];
  }).multiCall().build());

  fn.defineProperty(Array.prototype, "clipAt", fn(function(index) {
    return this[Math.max(0, Math.min(index, this.length-1))|0];
  }).multiCall().build());

  fn.defineProperty(Array.prototype, "wrapAt", fn(function(index) {
    index = (index|0) % this.length;
    if (index < 0) {
      index += this.length;
    }
    return this[index];
  }).multiCall().build());

  fn.defineProperty(Array.prototype, "foldAt", fn(function(index) {
    return this[ifold(index, this.length)];
  }).multiCall().build());

  fn.defineProperty(Array.prototype, "blendAt", fn(function(index, method) {
    switch (method) {
    case "clipAt": case "wrapAt": case "foldAt":
      break;
    default:
      method = "clipAt";
    }
    var i  = index|0;
    var x0 = this[method](i  );
    var x1 = this[method](i+1);
    return x0 + Math.abs(index - i) * (x1 - x0);
  }).multiCall().build());
  
  fn.defineProperty(Array.prototype, "put", function(index, item) {
    if (Array.isArray(index)) {
      index.forEach(function(index) {
        this.put(index, item);
      }, this);
    } else {
      index |= 0;
      if (0 <= index && index < this.length) {
        this[index] = item;
      }
    }
    return this;
  });
  
  fn.defineProperty(Array.prototype, "clipPut", function(index, item) {
    if (Array.isArray(index)) {
      index.forEach(function(index) {
        this.clipPut(index, item);
      }, this);
    } else {
      this[Math.max(0, Math.min(index, this.length-1))|0] = item;
    }
    return this;
  });

  fn.defineProperty(Array.prototype, "wrapPut", function(index, item) {
    if (Array.isArray(index)) {
      index.forEach(function(index) {
        this.wrapPut(index, item);
      }, this);
    } else {
      index = (index|0) % this.length;
      if (index < 0) {
        index += this.length;
      }
      this[index] = item;
    }
    return this;
  });
  
  fn.defineProperty(Array.prototype, "foldPut", function(index, item) {
    if (Array.isArray(index)) {
      index.forEach(function(index) {
        this.foldPut(index, item);
      }, this);
    } else {
      this[ifold(index, this.length)] = item;
    }
    return this;
  });

  fn.defineProperty(Array.prototype, "insert", function(index, item) {
    this.splice(Math.max(0, index), 0, item);
    return this;
  });
  
  fn.defineProperty(Array.prototype, "swap", function(i, j) {
    i |= 0;
    j |= 0;
    if (0 <= i && i < this.length && 0 <= j && j < this.length) {
      var t = this[i];
      this[i] = this[j];
      this[j] = t;
    }
    return this;
  });

  fn.defineProperty(Array.prototype, "clipSwap", function(i, j) {
    i = Math.max(0, Math.min(i, this.length-1))|0;
    j = Math.max(0, Math.min(j, this.length-1))|0;
    return this.swap(i, j);
  });
  
  fn.defineProperty(Array.prototype, "wrapSwap", function(i, j) {
    i = (i|0) % this.length;
    if (i < 0) {
      i += this.length;
    }
    j = (j|0) % this.length;
    if (j < 0) {
      j += this.length;
    }
    return this.swap(i, j);
  });
  
  fn.defineProperty(Array.prototype, "foldSwap", function(i, j) {
    i = ifold(i, this.length);
    j = ifold(j, this.length);
    return this.swap(i, j);
  });

  fn.defineProperty(Array.prototype, "sum", function() {
    var value = 0;
    for (var i = 0, imax = this.length; i < imax; ++i) {
      value += this[i];
    }
    return value;
  });
  
  fn.defineProperty(Array.prototype, "normalize", fn(function(min, max) {
    var minItem = this.minItem();
    var maxItem = this.maxItem();
    return this.map(function(item) {
      return item.linlin(minItem, maxItem, min, max);
    });
  }).defaults("min=0,max=1").build());

  fn.defineProperty(Array.prototype, "normalizeSum", function() {
    var sum = this.sum();
    return this.map(function(item) {
      return item / sum;
    });
  });
  
  fn.defineProperty(Array.prototype, "mirror", function() {
    var size = this.length * 2 - 1;
    if (size < 2) {
      return this.slice(0);
    }
    var i, j, imax, a = new Array(size);
    for (i = 0, imax = this.length; i < imax; ++i) {
      a[i] = this[i];
    }
    for (j = imax - 2, imax = size; i < imax; ++i, --j) {
      a[i] = this[j];
    }
    return a;
  });

  fn.defineProperty(Array.prototype, "mirror1", function() {
    var size = this.length * 2 - 2;
    if (size < 2) {
      return this.slice(0);
    }
    var i, j, imax, a = new Array(size);
    for (i = 0, imax = this.length; i < imax; ++i) {
      a[i] = this[i];
    }
    for (j = imax - 2, imax = size; i < imax; ++i, --j) {
      a[i] = this[j];
    }
    return a;
  });

  fn.defineProperty(Array.prototype, "mirror2", function() {
    var size = this.length * 2;
    if (size < 2) {
      return this.slice(0);
    }
    var i, j, imax, a = new Array(size);
    for (i = 0, imax = this.length; i < imax; ++i) {
      a[i] = this[i];
    }
    for (j = imax - 1, imax = size; i < imax; ++i, --j) {
      a[i] = this[j];
    }
    return a;
  });

  fn.defineProperty(Array.prototype, "stutter", fn(function(n) {
    n = Math.max(0, n|0);
    var a = new Array(this.length * n);
    for (var i = 0, j = 0, imax = this.length; i < imax; ++i) {
      for (var k = 0; k < n; ++k, ++j) {
        a[j] = this[i];
      }
    }
    return a;
  }).defaults("n=2").build());

  fn.defineProperty(Array.prototype, "rotate", fn(function(n) {
    n |= 0;
    var a = new Array(this.length);
    var size = a.length;
    n %= size;
    if (n < 0) {
      n += size;
    }
    for (var i = 0, j = n; i < size; ++i) {
      a[j] = this[i];
      if (++j >= size) {
        j = 0;
      }
    }
    return a;
  }).defaults("n=1").build());

  fn.defineProperty(Array.prototype, "sputter", fn(function(probability, maxlen) {
    var a = [], i = 0, j = 0, size = this.length;
    while (i < size && j < maxlen) {
      a[j++] = this[i];
      if (drand() < probability) {
        i += 1;
      }
    }
    return a;
  }).defaults("probability=0.25,maxlen=100").build());
  
  fn.defineProperty(Array.prototype, "clipExtend", function(size) {
    size = Math.max(0, size|0);
    if (this.length < size) {
      var a = new Array(size);
      for (var i = 0, imax = this.length; i< imax; ++i) {
        a[i] = this[i];
      }
      for (var b = a[i-1]; i < size; ++i) {
        a[i] = b;
      }
      return a;
    } else {
      return this.slice(0, size);
    }
  });

  fn.defineProperty(Array.prototype, "wrapExtend", function(size) {
    size = Math.max(0, size|0);
    if (this.length < size) {
      var a = new Array(size);
      for (var i = 0; i < size; ++i) {
        a[i] = this[i % this.length];
      }
      return a;
    } else {
      return this.slice(0, size);
    }
  });

  fn.defineProperty(Array.prototype, "foldExtend", function(size) {
    size = Math.max(0, size|0);
    if (this.length < size) {
      var a = new Array(size);
      for (var i = 0; i < size; ++i) {
        a[i] = this[ifold(i, this.length)];
      }
      return a;
    } else {
      return this.slice(0, size);
    }
  });

  fn.defineProperty(Array.prototype, "resamp0", function(newSize) {
    var factor = (this.length - 1) / (newSize - 1);
    var a = new Array(newSize);
    for (var i = 0; i < newSize; ++i) {
      a[i] = this[Math.round(i * factor)];
    }
    return a;
  });

  fn.defineProperty(Array.prototype, "resamp1", function(newSize) {
    var factor = (this.length - 1) / (newSize - 1);
    var a = new Array(newSize);
    for (var i = 0; i < newSize; ++i) {
      a[i] = this.blendAt(i * factor);
    }
    return a;
  });
  
  fn.defineProperty(Array.prototype, "scramble", function() {
    var a = this.slice();
    var i, j, k, m, temp;
    k = a.length;
    for (i = 0, m = k; i < k - 1; ++i, --m) {
      j = i + irand(m);
      temp = a[i];
      a[i] = a[j];
      a[j] = temp;
    }
    return a;
  });
  
  fn.defineProperty(Array.prototype, "choose", function() {
    return this[irand(this.length)];
  });
  
  module.exports = {};

});
define('cc/lang/fn', function(require, exports, module) {

  var cc = require("./cc");
  var utils = require("./utils");
  var ops   = require("../common/ops");
  var slice = [].slice;
  
  var fn = (function() {
    function Fn(func) {
      this.func  = func;
      this.def   = null;
      this.multi = 0;
    }
    Fn.prototype.defaults = function(def) {
      this.def = def;
      return this;
    };
    Fn.prototype.multiCall = function(num) {
      this.multi = num === undefined ? Infinity : num;
      return this;
    };
    Fn.prototype.build = function() {
      var func = this.func;
      var keys = [];
      var vals = [];
      if (this.def) {
        this.def.split(",").forEach(function(items) {
          items = items.trim().split("=");
          keys.push( items[0].trim());
          if (items.length === 2) {
            if (items[1] === "Infinity") {
              vals.push(Infinity);
            } else {
              vals.push(JSON.parse(items[1]));
            }
          } else {
            vals.push(undefined);
          }
        });
      }
      var ret = func;
      var multi = this.multi;
      if (multi === Infinity) {
        if (this.def) {
          ret = function() {
            var args = slice.call(arguments);
            args = resolve_args(keys, vals, slice.call(arguments));
            if (containsArray(args)) {
              return utils.flop(args).map(function(items) {
                return ret.apply(this, items);
              }, this);
            }
            return func.apply(this, args);
          };
        } else {
          ret = function() {
            var args = slice.call(arguments);
            if (containsArray(args)) {
              return utils.flop(args).map(function(items) {
                return ret.apply(this, items);
              }, this);
            }
            return func.apply(this, args);
          };
        }
      } else if (multi > 0) {
        if (this.def) {
          ret = function() {
            var args = slice.call(arguments);
            args = resolve_args(keys, vals, slice.call(arguments));
            var args0 = slice.call(args, 0, multi);
            if (containsArray(args0)) {
              var args1 = slice.call(args, multi);
              return utils.flop(args0).map(function(items) {
                return ret.apply(this, items.concat(args1));
              }, this);
            }
            return func.apply(this, args);
          };
        } else {
          ret = function() {
            var args0 = slice.call(arguments, 0, multi);
            
            if (containsArray(args0)) {
              var args1 = slice.call(arguments, multi);
              return utils.flop(args0).map(function(items) {
                return ret.apply(this, items.concat(args1));
              }, this);
            }
            return func.apply(this, arguments);
          };
        }
      } else if (multi < 0) {
        if (this.def) {
          ret = function() {
            var args = slice.call(arguments);
            args = resolve_args(keys, vals, slice.call(arguments));
            var args1 = slice.call(args, multi);
            if (containsArray(args1)) {
              var args0 = slice.call(args, 0, multi);
              return utils.flop(args1).map(function(items) {
                return ret.apply(this, args0.concat(items));
              }, this);
            }
            return func.apply(this, args);
          };
        } else {
          ret = function() {
            var args1 = slice.call(arguments, multi);
            if (containsArray(args1)) {
              var args0 = slice.call(arguments, 0, multi);
              return utils.flop(args1).map(function(items) {
                return ret.apply(this, args0.concat(items));
              }, this);
            }
            return func.apply(this, arguments);
          };
        }
      } else if (this.def) {
        ret = function() {
          return func.apply(this, resolve_args(keys, vals, slice.call(arguments)));
        };
      }
      return ret;
    };
    var containsArray = function(list) {
      for (var i = 0, imax = list.length; i < imax; ++i) {
        if (Array.isArray(list[i])) {
          return true;
        }
      }
      return false;
    };
    var resolve_args = function(keys, vals, given) {
      var dict;
      var args = vals.slice();
      if (utils.isDict(given[given.length - 1])) {
        dict = given.pop();
        Object.keys(dict).forEach(function(key) {
          var index = keys.indexOf(key);
          if (index !== -1) {
            args[index] = dict[key];
          }
        });
      }
      for (var i = 0, imax = Math.min(given.length, args.length); i < imax; ++i) {
        args[i] = given[i];
      }
      if (dict && keys.length <= args.length) {
        if (utils.isDict(vals[vals.length - 1])) {
          args.splice(args.length-1, 1, dict);
        }
      }
      return args;
    };
    return function(func) {
      return new Fn(func);
    };
  })();

  fn.defineProperty = function(object, selector, func) {
    Object.defineProperty(object, selector, {
      configurable: true,
      enumerable  : false,
      writable    : true,
      value       : func
    });
  };
  
  fn.defineBinaryProperty = function(object, selector, func) {
    var ugenSelector;
    if (ops.ALIASES.hasOwnProperty(selector)) {
      ugenSelector = ops.ALIASES[selector];
    } else {
      ugenSelector = selector;
    }
    Object.defineProperty(object, selector, {
      configurable: true,
      enumerable  : false,
      writable    : true,
      value       : function(b) {
        if (Array.isArray(b)) {
          return b.map(function(b) {
            return this[selector](b);
          }, this);
        } else if (cc.instanceOfUGen(b)) {
          return cc.createBinaryOpUGen(ugenSelector, this, b);
        }
        return func.call(this, b);
      }
    });
  };

  fn.defineArityProperty = function(object, selector, func) {
    Object.defineProperty(object, selector, {
      configurable: true,
      enumerable  : false,
      writable    : true,
      value       : function() {
        var args = slice.call(arguments);
        if (args.some(cc.instanceOfUGen)) {
          return func.apply(cc.global.DC(0, this), args);
        }
        return func.apply(this, args);
      }
    });
  };
  
  module.exports = fn;

});
define('cc/lang/utils', function(require, exports, module) {

  var cc = require("./cc");

  var isDict = function(obj) {
    return !!(obj && obj.constructor === Object);
  };
  
  var asRate = function(obj) {
    if (Array.isArray(obj)) {
      return obj.reduce(function(rate, obj) {
        return Math.max(rate, asRate(obj));
      }, 0);
    }
    if (obj) {
      switch (obj.rate) {
      case 0: case 1: case 2: case 3:
        return obj.rate;
      }
    }
    return 0;
  };

  var asRateString = function(obj) {
    switch (obj) {
    case 0:  return "scalar";
    case 1: return "control";
    case 2:   return "audio";
    case 3:  return "demand";
    }
    return "unknown";
  };
  
  var asNumber = function(obj) {
    obj = +obj;
    if (isNaN(obj)) {
      obj = 0;
    }
    return obj;
  };
  
  var asString = function(obj) {
    if (obj === "null") {
      return "null";
    } else if (obj === undefined) {
      return "undefined";
    } else if (obj.asString) {
      return obj.asString();
    }
    return obj.toString();
  };
  
  var asArray = function(obj) {
    if (obj === null || obj === undefined) {
      obj = [];
    } else if (!Array.isArray(obj)) {
      obj = [ obj ];
    }
    return obj;
  };
  
  var asUGenInput = function(obj) {
    if (obj === null || obj === undefined) {
      return 0;
    } else if (typeof obj.asUGenInput === "function") {
      return obj.asUGenInput();
    } else if (cc.instanceOfUGen(obj)) {
      return obj;
    } else if (Array.isArray(obj)) {
      return obj.map(asUGenInput);
    }
    obj = +obj;
    if (isNaN(obj)) {
      obj = 0;
    }
    return obj;
  };
  
  var flop = function(list) {
    var maxSize = list.reduce(function(len, sublist) {
      return Math.max(len, Array.isArray(sublist) ? sublist.length : 1);
    }, 0);
    var result = new Array(maxSize);
    var length = list.length;
    if (length) {
      for (var i = 0; i < maxSize; ++i) {
        var sublist = result[i] = new Array(length);
        for (var j = 0; j < length; ++j) {
          sublist[j] = Array.isArray(list[j]) ? list[j][i % list[j].length] : list[j];
        }
      }
    }
    return result;
  };
  
  var flatten = (function() {
    var _flatten = function(list, result) {
      for (var i = 0, imax = list.length; i < imax; ++i) {
        if (Array.isArray(list[i])) {
          result = _flatten(list[i], result);
        } else {
          result.push(list[i]);
        }
      }
      return result;
    };
    return function(list) {
      return _flatten(list, []);
    };
  })();

  var clump = function(list, groupSize) {
    var result  = [];
    var sublist = [];
    for (var i = 0, imax = list.length; i < imax; ++i) {
      sublist.push(list[i]);
      if (sublist.length >= groupSize) {
        result.push(sublist);
        sublist = [];
      }
    }
    if (sublist.length) {
      result.push(sublist);
    }
    return result;
  };

  var lace = function(list, length) {
    var a = new Array(length);
    var v, wrap = list.length;
    for (var i = 0; i < length; ++i) {
      v = list[i % wrap];
      a[i] = v[ ((i/wrap)|0) % v.length ] || 0;
    }
    return a;
  };
  
  var wrapExtend = function(list, size) {
    if (size < list.length) {
      return list.slice(0, size);
    }
    var a = new Array(size);
    for (var i = 0; i < size; ++i) {
      a[i] = list[i % list.length];
    }
    return a;
  };
  
  var lang_onmessage = function(e) {
    var msg = e.data;
    if (msg instanceof Uint8Array) {
      cc.lang.sendToServer(msg);
    } else {
      cc.lang.recvFromClient(msg);
    }
  };
  
  module.exports = {
    isDict : isDict,
    asRate      : asRate,
    asRateString: asRateString,
    asNumber    : asNumber,
    asString    : asString,
    asArray     : asArray,
    asUGenInput : asUGenInput,
    flop   : flop,
    flatten: flatten,
    clump  : clump,
    lace   : lace,
    wrapExtend: wrapExtend,
    
    lang_onmessage: lang_onmessage
  };

});
define('cc/common/ops', function(require, exports, module) {
  
  var UNARY_OPS = {};
  var UNARY_OPS_MAP = [];
  "neg not isNil notNil bitNot abs asFloat asInt ceil floor frac sign squared cubed sqrt exp reciprocal midicps cpsmidi midiratio ratiomidi dbamp ampdb octcps cpsoct log log2 log10 sin cos tan asin acos atan sinh cosh tanh rand rand2 linrand bilinrand sum3rand distort softclip coin digitvalue silence thru rectWindow hanWindow welWindow triWindow ramp scurve numunaryselectors num tilde pi to_i half twice".split(" ").forEach(function(selector, i) {
    UNARY_OPS[selector] = i;
    UNARY_OPS_MAP[i] = selector;
  });
  
  var BINARY_OPS = {};
  var BINARY_OPS_MAP = [];
  "+ - * / / % eq ne lt gt le ge min max bitAnd bitOr bitXor lcm gcd round roundUp trunc atan2 hypot hypotApx pow leftShift rightShift unsignedRightShift fill ring1 ring2 ring3 ring4 difsqr sumsqr sqrsum sqrdif absdif thresh amclip scaleneg clip2 excess fold2 wrap2 firstarg randrange exprandrange numbinaryselectors roundDown".split(" ").forEach(function(selector, i) {
    BINARY_OPS[selector] = i;
    BINARY_OPS_MAP[i] = selector;
  });
  
  var ARITY_OPS = {
    madd      : "mul=1,add=0",
    range     : "lo=0,hi=1",
    exprange  : "lo=0.01,hi=1",
    curverange: "lo=0.01,hi=1,curve=-4",
    unipolar  : "mul=1",
    bipolar   : "mul=1",
    clip      : "lo=1,hi=1",
    fold      : "lo=1,hi=1",
    wrap      : "lo=1,hi=1",
    blend     : "that=0,blendFrac=0.5",
    lag       : "t1=0.1,t2",
    lag2      : "t1=0.1,t2",
    lag3      : "t1=0.1,t2",
    lagud     : "lagTimeU=0.1,lagTimeD=0.1",
    lag2ud    : "lagTimeU=0.1,lagTimeD=0.1",
    lag3ud    : "lagTimeU=0.1,lagTimeD=0.1",
    varlag    : "time=0.1,curvature=0,warp=5,start=0",
    slew      : "up=1,down=1",
    linlin    : "inMin=0,inMax=1,outMin=1,outMax=2,clip=\"minmax\"",
    linexp    : "inMin=0,inMax=1,outMin=1,outMax=2,clip=\"minmax\"",
    explin    : "inMin=0,inMax=1,outMin=1,outMax=2,clip=\"minmax\"",
    expexp    : "inMin=0,inMax=1,outMin=1,outMax=2,clip=\"minmax\"",
    lincurve  : "inMin=0,inMax=1,outMin=0,outMax=1,curve=-4,clip=\"minmax\"",
    curvelin  : "inMin=0,inMax=1,outMin=0,outMax=1,curve=-4,clip=\"minmax\"",
    bilin     : "inCenter=0.5,inMin=0,inMax=1,outCenter=0.5,outMin=0,outMax=1,clip=\"minmax\"",
    rrand     : "num=1",
    exprand   : "num=1"
  };

  var COMMONS = {
    copy: "",
    clone: "deep=false",
    dup : "n=2,deep=false",
    "do": "",
    wait: "",
    asUGenInput: ""
  };
  
  var ALIASES = {
    __plus__ : "num",
    __minus__: "neg",
    __add__  : "+",
    __sub__  : "-",
    __mul__  : "*",
    __div__  : "/",
    __mod__  : "%"
  };
  
  module.exports = {
    UNARY_OPS     : UNARY_OPS,
    UNARY_OPS_MAP : UNARY_OPS_MAP,
    BINARY_OPS    : BINARY_OPS,
    BINARY_OPS_MAP: BINARY_OPS_MAP,
    ARITY_OPS     : ARITY_OPS,
    ALIASES       : ALIASES,
    COMMONS       : COMMONS
  };

});
define('cc/lang/boolean', function(require, exports, module) {

  var cc = require("./cc");
  var fn = require("./fn");
  var ops   = require("../common/ops");
  var slice = [].slice;
  
  // common methods
  fn.defineProperty(Boolean.prototype, "copy", function() {
    return this;
  });
  
  fn.defineProperty(Boolean.prototype, "clone", fn(function() {
    return this;
  }).defaults(ops.COMMONS.clone).build());
  
  fn.defineProperty(Boolean.prototype, "dup", fn(function(n) {
    var a = new Array(n|0);
    for (var i = 0, imax = a.length; i < imax; ++i) {
      a[i] = this;
    }
    return a;
  }).defaults(ops.COMMONS.dup).build());
  
  fn.defineProperty(Boolean.prototype, "do", function(func) {
    var flag = this;
    if (flag) {
      if (cc.instanceOfSyncBlock(func)) {
        if (cc.currentSyncBlockHandler) {
          cc.currentSyncBlockHandler.__sync__(func, cc.createTaskArgumentsBoolean(true));
        } else {
          func.clone().perform(flag);
        }
      } else {
        func(flag);
      }
    }
    return this;
  });
  
  fn.defineProperty(Boolean.prototype, "wait", function() {
    var flag = this;
    if (flag && cc.currentTask) {
      cc.currentTask.__wait__(cc.createTaskWaitTokenBoolean(flag));
    }
    return this;
  });
  
  fn.defineProperty(Boolean.prototype, "asUGenInput", function() {
    return this ? 1 : 0;
  });

  fn.defineProperty(Boolean.prototype, "asString", function() {
    return this ? "true" : "false";
  });
  
  // unary operator methods
  ["__plus__","__minus__"].concat(Object.keys(ops.UNARY_OPS)).forEach(function(selector) {
    fn.defineProperty(Boolean.prototype, selector, function() {
      return (this ? 1 : 0)[selector]();
    });
  });

  // binary operator methods
  ["__add__","__sub__","__mul__","__div__","__mod__"].concat(Object.keys(ops.BINARY_OPS)).forEach(function(selector) {
    fn.defineProperty(Boolean.prototype, selector, function(b) {
      return (this ? 1 : 0)[selector](b);
    });
  });
  
  // arity operators
  Object.keys(ops.ARITY_OPS).forEach(function(selector) {
    fn.defineProperty(Boolean.prototype, selector, fn(function() {
      var args = slice.call(arguments);
      return (0)[selector].apply(this ? 1 : 0, args);
    }).defaults(ops.ARITY_OPS[selector]).multiCall().build());
  });
  
  module.exports = {};

});
define('cc/lang/buffer', function(require, exports, module) {

  var cc = require("./cc");
  var fn = require("./fn");
  var utils  = require("./utils");
  var extend = require("../common/extend");
  var slice = [].slice;
  
  var BufferSource = (function() {
    var bufSrcId = 0;
    var cache = {};
    function BufferSource(source, id) {
      this.bufSrcId = bufSrcId++;
      
      // binary data format
      //  0 command
      //  1
      //  2 bufSrcId
      //  3
      //  4 (not use)
      //  5
      //  6 channels
      //  7
      //  8 sampleRate
      //  9
      // 10
      // 11
      // 12 numFrames
      // 13
      // 14
      // 15
      // 16.. samples
      
      var uint8 = new Uint8Array(16 + source.samples.length * 4);
      var int16 = new Uint16Array(uint8.buffer);
      var int32 = new Uint32Array(uint8.buffer);
      var f32   = new Float32Array(uint8.buffer);
      int16[0] = 1;
      int16[1] = this.bufSrcId;
      int16[3] = source.numChannels;
      int32[2] = source.sampleRate;
      int32[3] = source.numFrames;
      f32.set(source.samples, 4);
      cc.lang.sendToServer(uint8);
      
      if (id) {
        cache[id] = this;
      }
    }
    BufferSource.prototype.bind = function(buffer, startFrame, numFrames) {
      cc.lang.pushToTimeline([
        "/b_bind", buffer.bufnum, this.bufSrcId, startFrame, numFrames
      ]);
    };
    BufferSource.get = function(id) {
      return cache[id];
    };
    BufferSource.reset = function() {
      cache = {};
    };
    return BufferSource;
  })();
  
  var Buffer = (function() {
    var bufnum = 0;
    function Buffer(frames, channels) {
      this.klassName = "Buffer";
      
      this.bufnum     = bufnum++;
      this.frames     = frames  |0;
      this.channels   = channels|0;
      this.sampleRate = cc.lang.sampleRate;
      this.path       = null;
      
      cc.lang.pushToTimeline([
        "/b_new", this.bufnum, this.frames, this.channels
      ]);
    }
    extend(Buffer, cc.Object);
    
    Buffer.prototype.free = function() {
      cc.lang.pushToTimeline([
        "/b_free", this.bufnum
      ]);
      return this;
    };
    
    Buffer.prototype.zero = function() {
      cc.lang.pushToTimeline([
        "/b_zero", this.bufnum
      ]);
      return this;
    };
    
    Buffer.prototype.set = function() {
      var args = slice.call(arguments);
      if (args.length) {
        cc.lang.pushToTimeline([
          "/b_set", this.bufnum, args
        ]);
      }
      return this;
    };
    Buffer.prototype.setn = Buffer.prototype.set;

    var calcFlag = function(normalize, asWavetable, clearFirst) {
      return (normalize ? 1 : 0) + (asWavetable ? 2 : 0) + (clearFirst ? 4 : 0);
    };
    
    Buffer.prototype.sine1 = fn(function(amps, normalize, asWavetable, clearFirst) {
      amps = utils.asArray(amps);
      var flags = calcFlag(normalize, asWavetable, clearFirst);
      cc.lang.pushToTimeline(
        ["/b_gen", this.bufnum, "sine1", flags].concat(amps)
      );
      return this;
    }).defaults("amps=[],normalize=true,asWavetable=true,clearFirst=true").build();

    Buffer.prototype.sine2 = fn(function(freqs, amps, normalize, asWavetable, clearFirst) {
      freqs = utils.asArray(freqs);
      amps  = utils.asArray(amps);
      var flags = calcFlag(normalize, asWavetable, clearFirst);
      var len = Math.max(freqs.length, amps.length) * 2;
      cc.lang.pushToTimeline(
        ["/b_gen", this.bufnum, "sine2", flags].concat(utils.lace([freqs, amps], len))
      );
      return this;
    }).defaults("freqs=[],amps=[],normalize=true,asWavetable=true,clearFirst=true").build();

    Buffer.prototype.sine3 = fn(function(freqs, amps, phases, normalize, asWavetable, clearFirst) {
      freqs  = utils.asArray(freqs);
      amps   = utils.asArray(amps);
      phases = utils.asArray(phases);
      var flags = calcFlag(normalize, asWavetable, clearFirst);
      var len = Math.max(freqs.length, amps.length, phases.length) * 3;
      cc.lang.pushToTimeline(
        ["/b_gen", this.bufnum, "sine3", flags].concat(utils.lace([freqs, amps, phases], len))
      );
      return this;
    }).defaults("freqs=[],amps=[],phases=[],normalize=true,asWavetable=true,clearFirst=true").build();

    Buffer.prototype.cheby = fn(function(amplitudes, normalize, asWavetable, clearFirst) {
      amplitudes = utils.asArray(amplitudes);
      var flags = calcFlag(normalize, asWavetable, clearFirst);
      cc.lang.pushToTimeline(
        ["/b_gen", this.bufnum, "cheby", flags].concat(amplitudes)
      );
      return this;
    }).defaults("amplitudes=[],normalize=true,asWavetable=true,clearFirst=true").build();
    
    Buffer.prototype.asUGenInput = function() {
      return this.bufnum;
    };
    
    Buffer.prototype.asString = function() {
      return "Buffer(" + this.bufnum + ", " + this.frames + ", " + this.channels + ", " + this.sampleRate + ", " + this.path + ")";
    };
    
    return Buffer;
  })();
  
  cc.global.Buffer = fn(function(numFrames, numChannels, source) {
    if (Array.isArray(numFrames)) {
      numFrames = new Float32Array(numFrames);
    }
    if (numFrames instanceof Float32Array) {
      source = {
        sampleRate : cc.lang.sampleRate,
        numChannels: 1,
        numFrames  : numFrames.length,
        samples    : numFrames
      };
      numFrames   = source.numFrames;
      numChannels = source.numChannels;
    }
    var buffer = new Buffer(numFrames, numChannels);
    if (source) {
      new BufferSource(source).bind(buffer, 0, -1);
    }
    return buffer;
  }).defaults("numFrames=0,numChannels=1,source").build();
  
  cc.global.Buffer["new"] = cc.global.Buffer;
  
  cc.global.Buffer.read = fn(function(path, startFrame, numFrames) {
    if (typeof path !== "string") {
      throw new TypeError("Buffer.Read: path should be a string.");
    }
    var bufSrc = BufferSource.get(path);
    var buffer = new Buffer();
    if (bufSrc) {
      bufSrc.bind(buffer, startFrame, numFrames);
    } else {
      cc.lang.requestBuffer(path, function(result) {
        if (result) {
          buffer.sampleRate = result.sampleRate;
          buffer.path       = path;
          new BufferSource(result, path).bind(buffer, startFrame, numFrames);
        }
      });
    }
    return buffer;
  }).defaults("path,startFrame=0,numFrames=-1").build();
  
  cc.instanceOfBuffer = function(obj) {
    return obj instanceof Buffer;
  };
  
  cc.resetBuffer = function() {
    BufferSource.reset();
  };
  
  module.exports = {
    BufferSource: BufferSource,
    Buffer      : Buffer
  };

});
define('cc/lang/builtin', function(require, exports, module) {

  var cc = require("./cc");
  var pack  = require("../common/pack").pack;
  var slice = [].slice;

  cc.global.console = {};
  
  cc.global.console.log = function() {
    if (cc.lang) {
      cc.lang.sendToClient(["/console/log", slice.call(arguments).map(pack)]);
    }
  };
  
  
  var timerIdCache = [];
  cc.global.setInterval = function(func, delay) {
    var id = setInterval(func, delay);
    timerIdCache.push(id);
    return id;
  };

  cc.global.setTimeout = function(func, delay) {
    var id = setTimeout(func, delay);
    timerIdCache.push(id);
    return id;
  };

  cc.global.clearInterval = function(id) {
    clearInterval(id);
    var index = timerIdCache.indexOf(id);
    if (index !== -1) {
      timerIdCache.splice(index, 1);
    }
  };

  cc.global.clearTimeout = function(id) {
    clearTimeout(id);
    var index = timerIdCache.indexOf(id);
    if (index !== -1) {
      timerIdCache.splice(index, 1);
    }
  };

  cc.resetBuiltin = function() {
    timerIdCache.splice(0).forEach(function(timerId) {
      clearInterval(timerId);
      clearTimeout(timerId);
    });
  };
  
  module.exports = {};

});
define('cc/lang/bus', function(require, exports, module) {

  var cc = require("./cc");
  var fn = require("./fn");
  var extend = require("../common/extend");
  var utils  = require("./utils");
  
  var bus_allocator = {
    audio:2, control:0
  };
  
  var Bus = (function() {
    function Bus(rate, index, numChannels) {
      this.rate  = rate;
      this.index = index;
      this.numChannels = numChannels;
    }
    extend(Bus, cc.Object);
    
    Bus.prototype.asUGenInput = function() {
      return this.index;
    };

    Bus.prototype.asString = function() {
      return "Bus(" + utils.asRateString(this.rate) + ", " + this.index + ", " + this.numChannels + ")";
    };
    
    return Bus;
  })();

  cc.global.Bus = function() {
    return cc.global.Bus.control(1);
  };
  
  cc.global.Bus["new"] = cc.global.Bus;
  
  cc.global.Bus.control = fn(function(numChannels) {
    var index = bus_allocator.control;
    if (typeof numChannels === "number") {
      if (128 < bus_allocator.control + numChannels) {
        throw new Error("Bus: failed to get a control bus allocated.");
      }
      bus_allocator.control += numChannels;
    } else {
      numChannels = 0;
    }
    return new Bus(1, index, numChannels);
  }).defaults("numChannels=1").build();
  
  cc.global.Bus.audio = fn(function(numChannels) {
    var index = bus_allocator.audio;
    if (typeof numChannels === "number") {
      if (16 < bus_allocator.audio + numChannels) {
        throw new Error("Bus: failed to get an audio bus allocated.");
      }
      bus_allocator.audio += numChannels;
    } else {
      numChannels = 0;
    }
    return new Bus(2, index, numChannels);
  }).defaults("numChannels=1").build();

  cc.instanceOfBus = function(obj) {
    return obj instanceof Bus;
  };
  
  cc.resetBus = function() {
    bus_allocator.audio   = 2;
    bus_allocator.control = 0;
  };
  
  module.exports = {
    Bus: Bus
  };

});
define('cc/lang/date', function(require, exports, module) {

  var cc = require("./cc");
  var fn = require("./fn");
  var ops   = require("../common/ops");
  var slice = [].slice;
  
  // common methods
  fn.defineProperty(Date.prototype, "copy", function() {
    return new Date(+this);
  });
  
  fn.defineProperty(Date.prototype, "clone", fn(function() {
    return new Date(+this);
  }).defaults(ops.COMMONS.clone).build());
  
  fn.defineProperty(Date.prototype, "dup", fn(function(n) {
    var a = new Array(n|0);
    for (var i = 0, imax = a.length; i < imax; ++i) {
      a[i] = this;
    }
    return a;
  }).defaults(ops.COMMONS.dup).build());
  
  fn.defineProperty(Date.prototype, "do", function(func) {
    var flag = Date.now() > (+this);
    if (flag) {
      if (cc.instanceOfSyncBlock(func)) {
        if (cc.currentSyncBlockHandler) {
          cc.currentSyncBlockHandler.__sync__(func, cc.createTaskArgumentsBoolean(true));
        } else {
          func.clone().perform(flag);
        }
      } else {
        func(flag);
      }
    }
    return this;
  });
  
  fn.defineProperty(Date.prototype, "wait", function() {
    var flag = Date.now() > (+this);
    if (flag && cc.currentTask) {
      cc.currentTask.__wait__(cc.createTaskWaitTokenDate(this));
    }
    return this;
  });
  
  fn.defineProperty(Date.prototype, "asUGenInput", function() {
    throw new Error("Date can't cast to a UGen.");
  });
  
  fn.defineProperty(Date.prototype, "asString", function() {
    return this.toString();
  });
  
  // unary operator methods
  ["__plus__","__minus__"].concat(Object.keys(ops.UNARY_OPS)).forEach(function(selector) {
    fn.defineProperty(Date.prototype, selector, function() {
      return (+this)[selector]();
    });
  });

  // binary operator methods
  ["__add__","__sub__","__mul__","__div__","__mod__"].concat(Object.keys(ops.BINARY_OPS)).forEach(function(selector) {
    fn.defineProperty(Date.prototype, selector, function(b) {
      return (+this)[selector](b);
    });
  });
  
  // arity operators
  Object.keys(ops.ARITY_OPS).forEach(function(selector) {
    fn.defineProperty(Date.prototype, selector, fn(function() {
      var args = slice.call(arguments);
      return (0)[selector].apply(+this, args);
    }).defaults(ops.ARITY_OPS[selector]).multiCall().build());
  });
  
  module.exports = {};

});
define('cc/lang/env', function(require, exports, module) {

  var cc = require("./cc");
  var extend = require("../common/extend");
  var fn = require("./fn");
  var utils = require("./utils");
  
  // utility functions
  var shapeNames = {
    step: 0,
    lin : 1, linear     : 1,
    exp : 2, exponential: 2,
    sin : 3, sine       : 3,
    wel : 4, welch      : 4,
    sqr : 6, squared    : 6,
    cub : 7, cubed      : 7
  };

  var shapeNumber = function(shapeName) {
    if (typeof shapeName === "number") {
      return 5;
    }
    return shapeNames[shapeName] || 0;
  };
  
  var curveValue = function(curve) {
    if (typeof curve === "number") {
      return curve;
    }
    return 0;
  };
  
  var Env = (function() {
    function Env(levels, times, curve, releaseNode, loopNode, offset) {
      this._levels = levels;
      this._times  = utils.wrapExtend(times, levels.length - 1);
      this._curve  = curve || "lin";
      this._releaseNode = releaseNode;
      this._loopNode    = loopNode;
      this._offset      = offset;
      this._array       = null;
    }
    extend(Env, cc.Object);
    
    Env.prototype.ar = fn(function(doneAction, gate, timeScale, mul, add) {
      return cc.global.EnvGen(2, this, gate, mul, add, timeScale, doneAction);
    }).defaults("doneAction=0,gate=1,timeScale=1,mul=1,add=0").multiCall().build();
    
    Env.prototype.kr = fn(function(doneAction, gate, timeScale, mul, add) {
      return cc.global.EnvGen(1, this, gate, mul, add, timeScale, doneAction);
    }).defaults("doneAction=0,gate=1,timeScale=1,mul=1,add=0").multiCall().build();
    
    Env.prototype.asMultichannelArray = function() {
      if (!this._array) {
        this._array = this.asArray();
      }
      return this._array;
    };
    
    Env.prototype.asArray = function() {
      var contents;
      var levelArray  = this._levels;
      var timeArray   = this._times;
      var curvesArray = this._curve;
      var size = this._times.length;
      if (!Array.isArray(curvesArray)) {
        curvesArray = [ curvesArray ];
      }
      var releaseNode = typeof this._releaseNode === "number" ? this._releaseNode : -99;
      var loopNode    = typeof this._loopNode    === "number" ? this._loopNode    : -99;
      
      var wrapAt;
      contents = [
        levelArray[0], size, releaseNode, loopNode
      ];
      for (var i = 0; i < size; ++i) {
        wrapAt = i % curvesArray.length;
        contents.push(
          levelArray[i+1], timeArray[i], shapeNumber(curvesArray[wrapAt]), curveValue (curvesArray[wrapAt])
        );
      }
      return utils.flop(contents);
    };
    
    return Env;
  })();
  
  cc.global.Env = fn(function(levels, times, curve, releaseNode, loopNode, offset) {
    if (!Array.isArray(levels)) {
      levels = [ 0, 1, 0 ];
    }
    if (!Array.isArray(times)) {
      times = [ 1, 1 ];
    }
    return new Env(levels, times, curve, releaseNode, loopNode, offset);
  }).defaults("levels=0,times=0,curve=\"lin\",releaseNode,loopNode,offset=0").build();
  
  cc.global.Env["new"] = cc.global.Env;
  
  cc.global.Env.triangle = fn(function(dur, level) {
    dur = dur.__mul__(0.5);
    return new Env(
      [0, level, 0],
      [dur, dur]
    );
  }).defaults("dur=1,level=1").build();
  
  cc.global.Env.sine = fn(function(dur, level) {
    dur = dur.__mul__(0.5);
    return new Env(
      [0, level, 0],
      [dur, dur],
      "sine"
    );
  }).defaults("dur=1,level=1").build();

  cc.global.Env.perc = fn(function(attackTime, releaseTime, level, curve) {
    return new Env(
      [0, level, 0],
      [attackTime, releaseTime],
      curve
    );
  }).defaults("attackTime=0.01,releaseTime=1,level=1,curve=-4").build();

  cc.global.Env.linen = fn(function(attackTime, sustainTime, releaseTime, level, curve) {
    return new Env(
      [0, level, level, 0],
      [attackTime, sustainTime, releaseTime],
      curve
    );
  }).defaults("attackTime=0.01,sustainTime=1,releaseTime=1,level=1,curve=\"lin\"").build();

  cc.global.Env.xyc = function() {
    throw "not implemented";
  };
  
  cc.global.Env.pairs = function() {
    throw "not implemented";
  };

  cc.global.Env.cutoff = fn(function(releaseTime, level, curve) {
    var curveNo = shapeNumber(curve);
    var releaseLevel = curveNo === 2 ? 1e-05 : 0;
    return new Env(
      [level, releaseLevel],
      [releaseTime],
      curve,
      0
    );
  }).defaults("releaseTime=0.1,level=1,curve=\"lin\"").build();

  cc.global.Env.dadsr = fn(function(delayTime, attackTime, decayTime, sustainLevel, releaseTime, peakLevel, curve, bias) {
    return new Env(
      [0, 0, peakLevel, peakLevel.__mul__(sustainLevel), 0].__add__(bias),
      [delayTime, attackTime, decayTime, releaseTime],
      curve,
      3
    );
  }).defaults("delayTime=0.1,attackTime=0.01,decayTime=0.3,sustainLevel=0.5,releaseTime=1,peakLevel=1,curve=-4,bias=0").build();

  cc.global.Env.adsr = fn(function(attackTime, decayTime, sustainLevel, releaseTime, peakLevel, curve, bias) {
    return new Env(
      [0, peakLevel, peakLevel.__mul__(sustainLevel), 0].__add__(bias),
      [attackTime, decayTime, releaseTime],
      curve,
      2
    );
  }).defaults("attackTime=0.01,decayTime=0.3,sustainLevel=0.5,releaseTime=1,peakLevel=1,curve=-4,bias=0").build();

  cc.global.Env.asr = fn(function(attackTime, sustainLevel, releaseTime, curve) {
    return new Env(
      [0, sustainLevel, 0],
      [attackTime, releaseTime],
      curve,
      1
    );
  }).defaults("attackTime=0.01,sustainLevel=1,releaseTime=1,curve=-4").build();

  cc.global.Env.circle = function() {
    throw "not implemented";
  };
  
  module.exports = {};

});
define('cc/lang/function', function(require, exports, module) {

  var cc = require("./cc");
  var fn = require("./fn");
  var ops = require("../common/ops");
  var utils = require("./utils");
  var slice = [].slice;

  var asNumber = function(val) {
    val = val();
    if (typeof val !== "number" || isNaN(val)) {
      return 0;
    }
    return val;
  };
  
  // common methods
  fn.defineProperty(Function.prototype, "copy", function() {
    return this;
  });
  
  fn.defineProperty(Function.prototype, "clone", fn(function() {
    return this;
  }).defaults(ops.COMMONS.clone).build());
  
  fn.defineProperty(Function.prototype, "dup", fn(function(n) {
    n |= 0;
    var a = new Array(n);
    for (var i = 0; i < n; ++i) {
      a[i] = this(i);
    }
    return a;
  }).defaults(ops.COMMONS.dup).build());
  
  fn.defineProperty(Function.prototype, "do", function() {
    throw "not implemented";
  });
  
  fn.defineProperty(Function.prototype, "wait", function() {
    if (cc.currentTask) {
      cc.currentTask.__wait__(cc.createTaskWaitTokenFunction(this));
    }
    return this;
  });
  
  fn.defineProperty(Function.prototype, "asUGenInput", function() {
    return utils.asUGenInput(this());
  });
  
  fn.defineProperty(Function.prototype, "asString", function() {
    return "Function";
  });
  
  // unary operator methods
  ["__plus__","__minus__"].concat(Object.keys(ops.UNARY_OPS)).forEach(function(selector) {
    fn.defineProperty(Function.prototype, selector, function() {
      return asNumber(this)[selector]();
    });
    if (/^[a-z]/.test(selector) && !cc.global.hasOwnProperty(selector)) {
      cc.global[selector] = function(a) {
        if (typeof a[selector] === "function") {
          return a[selector]();
        }
        return a;
      };
    }
  });
  
  // binary operator methods
  ["__sub__","__div__","__mod__"].concat(Object.keys(ops.BINARY_OPS)).forEach(function(selector) {
    fn.defineProperty(Function.prototype, selector, function(b) {
      return asNumber(this)[selector](b);
    });
    if (/^[a-z]/.test(selector) && !cc.global.hasOwnProperty(selector)) {
      cc.global[selector] = function(a, b) {
        if (typeof a[selector] === "function") {
          return a[selector](b);
        }
        return a;
      };
    }
  });
  fn.defineProperty(Function.prototype, "__add__", function(b) {
    return this.toString() + b;
  });
  fn.defineProperty(Function.prototype, "__mul__", function(b) {
    if (typeof b === "function") {
      var f = this, g = b;
      return function() {
        return f.call(null, g.apply(null, arguments));
      };
    }
    return 0;
  });
  
  // arity operators
  Object.keys(ops.ARITY_OPS).forEach(function(selector) {
    fn.defineProperty(Function.prototype, selector, fn(function() {
      var args = slice.call(arguments);
      return (0)[selector].apply(asNumber(this), args);
    }).defaults(ops.ARITY_OPS[selector]).multiCall().build());
    if (/^[a-z]/.test(selector) && !cc.global.hasOwnProperty(selector)) {
      cc.global[selector] = function(a) {
        if (typeof a[selector] === "function") {
          return a[selector].apply(a, slice.call(arguments, 1));
        }
        return a;
      };
    }
  });
  
  // others
  fn.defineProperty(Function.prototype, "play", function() {
    var func = this;
    return cc.global.SynthDef(
      function() {
        cc.global.Out(2, 0, func());
      }, []
    ).play();
  });
  
  module.exports = {};

});
define('cc/lang/message', function(require, exports, module) {

  var cc = require("./cc");
  var emitter = require("../common/emitter");
  var slice   = [].slice;
  
  cc.global.Message = {
    klassName: "Message"
  };
  
  emitter.mixin(cc.global.Message);
  
  cc.global.Message.send = function() {
    cc.lang.sendToClient([
      "/send", slice.call(arguments)
    ]);
    return cc.global.Message;
  };
  
  module.exports = {};

});
define('cc/lang/mix', function(require, exports, module) {

  var cc = require("./cc");
  var utils = require("./utils");
  var asRate = utils.asRate;
  
  var mix = function(array) {
    if (!Array.isArray(array)) {
      array = [array];
    }
    var reduceArray = utils.clump(array, 4);
    var a = reduceArray.map(function(a) {
      switch (a.length) {
      case 4:
        return cc.createSum4(a[0], a[1], a[2], a[3]);
      case 3:
        return cc.createSum3(a[0], a[1], a[2]);
      case 2:
        return cc.createBinaryOpUGen("+", a[0], a[1]);
      case 1:
        return a[0];
      }
    });
    switch (a.length) {
    case 4:
      return cc.createSum4(a[0], a[1], a[2], a[3]);
    case 3:
      return cc.createSum3(a[0], a[1], a[2]);
    case 2:
      return cc.createBinaryOpUGen("+", a[0], a[1]);
    case 1:
      return a[0];
    default:
      return mix(a);
    }
  };
  
  cc.global.Mix = function(array) {
    return mix(array) || [];
  };
  cc.global.Mix["new"] = cc.global.Mix;
  
  cc.global.Mix.fill = function(n, func) {
    n = n|0;
    var array = new Array(n);
    for (var i = 0; i < n; ++i) {
      array[i] = func(i);
    }
    return mix(array);
  };
  cc.global.Mix.ar = function(array) {
    if (Array.isArray(array)) {
      var result = cc.global.Mix(array);
      switch (asRate(result)) {
      case 2:
        return result;
      case 1:
        return result.map(function(x) {
          return cc.global.K2A.ar(x);
        });
      case 0:
        return result.map(function(x) {
          return cc.global.DC.ar(x);
        });
      }
    }
    throw "Mix.ar: bad arguments";
  };
  cc.global.Mix.kr = function(array) {
    if (Array.isArray(array)) {
      var result = cc.global.Mix(array);
      var rate = asRate(result);
      if (rate === 2) {
        result = result.map(function(x) {
          if (x.rate === 2) {
            return cc.global.A2K.kr(x);
          }
          return x;
        });
        rate = asRate(result);
      }
      switch (rate) {
      case 1:
        return result;
      case 0:
        return result.map(function(x) {
          return cc.global.DC.ar(x);
        });
      }
    }
    throw "Mix.kr: bad arguments";
  };

  cc.global.Mix.arFill = function(n, func) {
    n = Math.max(0, n)|0;
    var a = new Array(n);
    for (var i = 0; i < n; ++i) {
      a[i] = func(i);
    }
    return cc.global.Mix.ar(a);
  };

  cc.global.Mix.krFill = function(n, func) {
    n = Math.max(0, n)|0;
    var a = new Array(n);
    for (var i = 0; i < n; ++i) {
      a[i] = func(i);
    }
    return cc.global.Mix.kr(a);
  };
  
  module.exports = {};

});
define('cc/lang/node', function(require, exports, module) {

  var cc = require("./cc");
  var utils  = require("./utils");
  var extend = require("../common/extend");
  
  var nodes = {};
  
  var Node = (function() {
    var nodeId = 0;
    function Node() {
      this.klassName = "Node";
      this.nodeId    = nodeId++;
      this._blocking  = true;
      nodes[this.nodeId] = this;
    }
    extend(Node, cc.Object);
    
    Node.prototype.play = function() {
      cc.lang.pushToTimeline([
        "/n_run", this.nodeId, true
      ]);
      return this;
    };
    
    Node.prototype.pause = function() {
      cc.lang.pushToTimeline([
        "/n_run", this.nodeId, false
      ]);
      return this;
    };
    
    Node.prototype.stop = function() {
      cc.lang.pushToTimeline([
        "/n_free", this.nodeId
      ]);
      this._blocking = false;
      return this;
    };

    Node.prototype.set = function(args) {
      var controls = args2controls(args, this.params);
      if (controls.length) {
        cc.lang.pushToTimeline([
          "/n_set", this.nodeId, controls
        ]);
      }
      return this;
    };
    
    Node.prototype.release = function(releaseTime) {
      releaseTime = -1 - utils.asNumber(releaseTime);
      var controls = args2controls({ gate:releaseTime }, this.params);
      if (controls.length) {
        cc.lang.pushToTimeline([
          "/n_set", this.nodeId, controls
        ]);
      }
      return this;
    };
    
    Node.prototype.performWait = function() {
      return this._blocking;
    };

    Node.prototype.asString = function() {
      return this.klassName + "(" + this.nodeId + ")";
    };
    
    return Node;
  })();
  
  var Group = (function() {
    function Group(target, addAction) {
      Node.call(this);
      this.klassName = "Group";
      if (target instanceof Node) {
        cc.lang.pushToTimeline([
          "/g_new", this.nodeId, addAction, target.nodeId
        ]);
      }
    }
    extend(Group, Node);
    
    return Group;
  })();
  
  var Synth = (function() {
    function Synth(target, addAction, def, args) {
      Node.call(this);
      this.klassName = "Synth";
      if (target instanceof Node && cc.instanceOfSynthDef(def)) {
        this.params  = def.specs.params;
        var nodeId   = this.nodeId;
        var controls = args2controls(args, this.params);
        cc.lang.pushToTimeline([
          "/s_new", nodeId, addAction, target.nodeId, def._defId, controls
        ]);
      }
    }
    extend(Synth, Node);
    
    return Synth;
  })();
  
  
  var args2controls = function(args, params) {
    var controls = [];
    if (utils.isDict(args) && params) {
      Object.keys(args).forEach(function(key) {
        var value  = args[key];
        var index  = params.names.indexOf(key);
        if (index === -1) {
          return;
        }
        var length = params.length[index];
        index = params.indices[index];
        if (Array.isArray(value)) {
          value.forEach(function(value, i) {
            if (i < length) {
              if (typeof value === "number" && !isNaN(value)) {
                controls.push(index + i, value);
              }
            }
          });
        } else if (typeof value === "number" && !isNaN(value)) {
          controls.push(index, value);
        }
      });
    }
    return controls;
  };
  
  var sortArgs = function(list) {
    var node, def, args;
    if (cc.instanceOfSynthDef(list[0])) {
      node = cc.lang.rootNode;
      def  = list[0];
      args = list[1] || {};
    } else if (cc.instanceOfSynthDef(list[1])) {
      node = list[0];
      def  = list[1];
      args = list[2] || {};
    } else {
      node = cc.lang.rootNode;
      def  = null;
      args = {};
    }
    return [node, def, args];
  };
  
  cc.global.Group = function() {
    var target, addAction = 0;
    var i = 0;
    if (cc.instanceOfNode(arguments[i])) {
      target = arguments[i++];
    } else {
      target = cc.lang.rootNode;
    }
    if (typeof arguments[i] === "string") {
      addAction = {
        addToHead:0, addToTail:1, addBefore:2, addAfter:3, replace:4
      }[arguments[i++]] || 0;
    } else if (typeof arguments[i] === "number") {
      if (0 <= arguments[i] && arguments[i] <= 4) {
        addAction = arguments[i++];
      }
    }
    return new Group(target, addAction);
  };
  cc.global.Group["new"] = cc.global.Group;
  cc.global.Group.after = function(node) {
    return new Group(node || cc.lang.rootNode, 3);
  };
  cc.global.Group.before = function(node) {
    return new Group(node || cc.lang.rootNode, 2);
  };
  cc.global.Group.head = function(node) {
    return new Group(node || cc.lang.rootNode, 0);
  };
  cc.global.Group.tail = function(node) {
    return new Group(node || cc.lang.rootNode, 1);
  };
  cc.global.Group.replace = function(node) {
    return new Group(node, 4);
  };
  
  cc.global.Synth = function(def) {
    var args, target, addAction = 0;
    var i = 1;
    if (utils.isDict(arguments[i])) {
      args = arguments[i++];
    } else {
      args = {};
    }
    if (cc.instanceOfNode(arguments[i])) {
      target = arguments[i++];
    } else {
      target = cc.lang.rootNode;
    }
    if (typeof arguments[i] === "string") {
      addAction = {
        addToHead:0, addToTail:1, addBefore:2, addAfter:3, replace:4
      }[arguments[i++]] || 0;
    } else if (typeof arguments[i] === "number") {
      if (0 <= arguments[i] && arguments[i] <= 4) {
        addAction = arguments[i++];
      }
    }
    return new Synth(target, addAction, def, args);
  };
  cc.global.Synth["new"] = cc.global.Synth;
  cc.global.Synth.after = function() {
    var list = sortArgs(arguments);
    return new Synth(list[0], 3, list[1], list[2]);
  };
  cc.global.Synth.before = function() {
    var list = sortArgs(arguments);
    return new Synth(list[0], 2, list[1], list[2]);
  };
  cc.global.Synth.head = function() {
    var list = sortArgs(arguments);
    return new Synth(list[0], 0, list[1], list[2]);
  };
  cc.global.Synth.tail = function() {
    var list = sortArgs(arguments);
    return new Synth(list[0], 1, list[1], list[2]);
  };
  cc.global.Synth.replace = function(node, def, args) {
    return new Synth(node, 4, def, args);
  };
  
  cc.createLangRootNode = function() {
    return new Group();
  };
  cc.instanceOfNode = function(obj) {
    return obj instanceof Node;
  };
  cc.instanceOfGroup = function(obj) {
    return obj instanceof Group;
  };
  cc.instanceOfSynth = function(obj) {
    return obj instanceof Synth;
  };
  cc.getNode   = function(nodeId) {
    return nodes[nodeId];
  };
  cc.resetNode = function() {
    nodes = {};
  };
  
  module.exports = {
    Node : Node,
    Group: Group,
    Synth: Synth,
    args2controls: args2controls
  };

});
define('cc/lang/number', function(require, exports, module) {

  var cc = require("./cc");
  var fn = require("./fn");
  var ops = require("../common/ops");
  
  var drand = function() {
    return cc.lang.random.next();
  };

  // common methods
  fn.defineProperty(Number.prototype, "copy", function() {
    return this;
  });
  
  fn.defineProperty(Number.prototype, "clone", fn(function() {
    return this;
  }).defaults(ops.COMMONS.clone).build());
  
  fn.defineProperty(Number.prototype, "dup", fn(function(n) {
    var a = new Array(n|0);
    for (var i = 0, imax = a.length; i < imax; ++i) {
      a[i] = this;
    }
    return a;
  }).defaults(ops.COMMONS.dup).build());
  
  fn.defineProperty(Number.prototype, "do", function(func) {
    var i, n = this;
    if (cc.instanceOfSyncBlock(func)) {
      if (cc.currentSyncBlockHandler) {
        if (n > 0) {
          cc.currentSyncBlockHandler.__sync__(func, cc.createTaskArgumentsNumber(0, n - 1, 1));
        }
      } else {
        for (i = 0; i < n; ++i) {
          func.clone().perform(i);
        }
      }
    } else {
      for (i = 0; i < n; ++i) {
        func(i);
      }
    }
    return this;
  });
  
  fn.defineProperty(Number.prototype, "wait", function() {
    var n = this;
    if (n >= 0 && cc.currentTask) {
      cc.currentTask.__wait__(n);
    }
    return this;
  });
  
  fn.defineProperty(Number.prototype, "asUGenInput", function() {
    return this;
  });

  fn.defineProperty(Number.prototype, "asString", function() {
    return this.toString();
  });
  
  // unary operator methods
  fn.defineProperty(Number.prototype, "__plus__", function() {
    return +this;
  });
  fn.defineProperty(Number.prototype, "__minus__", function() {
    return -this;
  });
  fn.defineProperty(Number.prototype, "neg", function() {
    return -this;
  });
  fn.defineProperty(Number.prototype, "not", function() {
    return this === 0 ? 1 : 0;
  });
  fn.defineProperty(Number.prototype, "isNil", function() {
    return 0;
  });
  fn.defineProperty(Number.prototype, "notNil", function() {
    return 1;
  });
  fn.defineProperty(Number.prototype, "bitNot", function() {
    return ~this;
  });
  fn.defineProperty(Number.prototype, "abs", function() {
    return Math.abs(this);
  });
  fn.defineProperty(Number.prototype, "asFloat", function() {
    return +this;
  });
  fn.defineProperty(Number.prototype, "asInt", function() {
    return this|0;
  });
  fn.defineProperty(Number.prototype, "ceil", function() {
    return Math.ceil(this);
  });
  fn.defineProperty(Number.prototype, "floor", function() {
    return Math.floor(this);
  });
  fn.defineProperty(Number.prototype, "frac", function() {
    if (this < 0) {
      return 1 + (this - (this|0));
    }
    return this - (this|0);
  });
  fn.defineProperty(Number.prototype, "sign", function() {
    if (this === 0) {
      return 0;
    } else if (this > 0) {
      return 1;
    }
    return -1;
  });
  fn.defineProperty(Number.prototype, "squared", function() {
    return this * this;
  });
  fn.defineProperty(Number.prototype, "cubed", function() {
    return this * this * this;
  });
  fn.defineProperty(Number.prototype, "sqrt", function() {
    return Math.sqrt(Math.abs(this));
  });
  fn.defineProperty(Number.prototype, "exp", function() {
    return Math.exp(this);
  });
  fn.defineProperty(Number.prototype, "reciprocal", function() {
    return 1 / this;
  });
  fn.defineProperty(Number.prototype, "midicps", function() {
    return 440 * Math.pow(2, (this - 69) * 1/12);
  });
  fn.defineProperty(Number.prototype, "cpsmidi", function() {
    return Math.log(Math.abs(this) * 1/440) * Math.LOG2E * 12 + 69;
  });
  fn.defineProperty(Number.prototype, "midiratio", function() {
    return Math.pow(2, this * 1/12);
  });
  fn.defineProperty(Number.prototype, "ratiomidi", function() {
    return Math.log(Math.abs(this)) * Math.LOG2E * 12;
  });
  fn.defineProperty(Number.prototype, "dbamp", function() {
    return Math.pow(10, this * 0.05);
  });
  fn.defineProperty(Number.prototype, "ampdb", function() {
    return Math.log(Math.abs(this)) * Math.LOG10E * 20;
  });
  fn.defineProperty(Number.prototype, "octcps", function() {
    return 440 * Math.pow(2, this - 4.75);
  });
  fn.defineProperty(Number.prototype, "cpsoct", function() {
    return Math.log(Math.abs(this) * 1/440) * Math.LOG2E + 4.75;
  });
  fn.defineProperty(Number.prototype, "log", function() {
    return Math.log(Math.abs(this));
  });
  fn.defineProperty(Number.prototype, "log2", function() {
    return Math.log(Math.abs(this)) * Math.LOG2E;
  });
  fn.defineProperty(Number.prototype, "log10", function() {
    return Math.log(Math.abs(this)) * Math.LOG10E;
  });
  fn.defineProperty(Number.prototype, "sin", function() {
    return Math.sin(this);
  });
  fn.defineProperty(Number.prototype, "cos", function() {
    return Math.cos(this);
  });
  fn.defineProperty(Number.prototype, "tan", function() {
    return Math.tan(this);
  });
  fn.defineProperty(Number.prototype, "asin", function() {
    return Math.asin(Math.max(-1, Math.min(this, 1)));
  });
  fn.defineProperty(Number.prototype, "acos", function() {
    return Math.acos(Math.max(-1, Math.min(this, 1)));
  });
  fn.defineProperty(Number.prototype, "atan", function() {
    return Math.atan(this);
  });
  fn.defineProperty(Number.prototype, "sinh", function() {
    return (Math.pow(Math.E, this) - Math.pow(Math.E, -this)) * 0.5;
  });
  fn.defineProperty(Number.prototype, "cosh", function() {
    return (Math.pow(Math.E, this) + Math.pow(Math.E, -this)) * 0.5;
  });
  fn.defineProperty(Number.prototype, "tanh", function() {
    return this.sinh() / this.cosh();
  });
  fn.defineProperty(Number.prototype, "rand", function() {
    return drand() * this;
  });
  fn.defineProperty(Number.prototype, "rand2", function() {
    return (drand() *  2 - 1) * this;
  });
  fn.defineProperty(Number.prototype, "linrand", function() {
    return Math.min(drand(), drand()) * this;
  });
  fn.defineProperty(Number.prototype, "bilinrand", function() {
    return (drand() - drand()) * this;
  });
  fn.defineProperty(Number.prototype, "sum3rand", function() {
    return (drand() + drand() + drand() - 1.5) * 0.666666667 * this;
  });
  fn.defineProperty(Number.prototype, "distort", function() {
    return this / (1 + Math.abs(this));
  });
  fn.defineProperty(Number.prototype, "softclip", function() {
    var absa = Math.abs(this);
    return absa <= 0.5 ? this : (absa - 0.25) / this;
  });
  fn.defineProperty(Number.prototype, "coin", function() {
    return drand() < this;
  });
  fn.defineProperty(Number.prototype, "digitvalue", function() {
    return 0; // TODO: implements
  });
  fn.defineProperty(Number.prototype, "silence", function() {
    return 0; // TODO: implements
  });
  fn.defineProperty(Number.prototype, "thru", function() {
    return 0; // TODO: implements
  });
  fn.defineProperty(Number.prototype, "rectWindow", function() {
    return 0; // TODO: implements
  });
  fn.defineProperty(Number.prototype, "hanWindow", function() {
    return 0; // TODO: implements
  });
  fn.defineProperty(Number.prototype, "welWindow", function() {
    return 0; // TODO: implements
  });
  fn.defineProperty(Number.prototype, "triWindow", function() {
    return 0; // TODO: implements
  });
  fn.defineProperty(Number.prototype, "ramp", function() {
    return 0; // TODO: implements
  });
  fn.defineProperty(Number.prototype, "scurve", function() {
    return 0; // TODO: implements
  });
  fn.defineProperty(Number.prototype, "numunaryselectors", function() {
    return 0; // TODO: implements
  });
  fn.defineProperty(Number.prototype, "num", function() {
    return +this;
  });
  fn.defineProperty(Number.prototype, "tilde", function() {
    return ~this;
  });
  fn.defineProperty(Number.prototype, "pi", function() {
    return this * Math.PI;
  });
  fn.defineProperty(Number.prototype, "to_i", function() {
    return this|0;
  });
  fn.defineProperty(Number.prototype, "half", function() {
    return this * 0.5;
  });
  fn.defineProperty(Number.prototype, "twice", function() {
    return this * 2;
  });
  
  // binary operator methods
  fn.defineBinaryProperty(Number.prototype, "__add__", function(b) {
    return this + b;
  });
  fn.defineBinaryProperty(Number.prototype, "__sub__", function(b) {
    return this - b;
  });
  fn.defineBinaryProperty(Number.prototype, "__mul__", function(b) {
    return this * b;
  });
  fn.defineBinaryProperty(Number.prototype, "__div__", function(b) {
    if (this === 0 && b === 0) {
      return 0; // avoid NaN
    }
    return this / b;
  });
  fn.defineBinaryProperty(Number.prototype, "__mod__", function(b) {
    if (b === 0) {
      return 0; // avoid NaN
    }
    return this % b;
  });
  fn.defineBinaryProperty(Number.prototype, "eq", function(b) {
    return this === b ? 1 : 0;
  });
  fn.defineBinaryProperty(Number.prototype, "ne", function(b) {
    return this !== b ? 1 : 0;
  });
  fn.defineBinaryProperty(Number.prototype, "lt", function(b) {
    return this < b ? 1 : 0;
  });
  fn.defineBinaryProperty(Number.prototype, "gt", function(b) {
    return this > b ? 1 : 0;
  });
  fn.defineBinaryProperty(Number.prototype, "le", function(b) {
    return this <= b ? 1 : 0;
  });
  fn.defineBinaryProperty(Number.prototype, "ge", function(b) {
    return this >= b ? 1 : 0;
  });
  fn.defineBinaryProperty(Number.prototype, "bitAnd", function(b) {
    return this & b;
  });
  fn.defineBinaryProperty(Number.prototype, "bitOr", function(b) {
    return this | b;
  });
  fn.defineBinaryProperty(Number.prototype, "bitXor", function(b) {
    return this ^ b;
  });
  fn.defineBinaryProperty(Number.prototype, "min", function(b) {
    return Math.min(this, b);
  });
  fn.defineBinaryProperty(Number.prototype, "max", function(b) {
    return Math.max(this, b);
  });
  
  var gcd = function(a, b, t) {
    a = a|0; b = b|0;
    while (b !== 0) {
      t = a % b; a = b; b = t;
    }
    return Math.abs(a);
  };
  fn.defineBinaryProperty(Number.prototype, "lcm", function(b) {
    if (this === 0 && b === 0) {
      return 0; // avoid NaN
    }
    return Math.abs(this * b) / gcd(this, b);
  });
  fn.defineBinaryProperty(Number.prototype, "gcd", function(b) {
    return gcd(this, b);
  });
  fn.defineBinaryProperty(Number.prototype, "round", function(b) {
    if (b === 0) {
      return this; // avoid NaN
    }
    return Math.round(this / b) * b;
  });
  fn.defineBinaryProperty(Number.prototype, "roundUp", function(b) {
    if (b === 0) {
      return this; // avoid NaN
    }
    return Math.ceil(this / b) * b;
  });
  fn.defineBinaryProperty(Number.prototype, "roundDown", function(b) {
    if (b === 0) {
      return this; // avoid NaN
    }
    return Math.floor(this / b) * b;
  });
  fn.defineBinaryProperty(Number.prototype, "trunc", function(b) {
    if (b === 0) {
      return this; // avoid NaN
    }
    return Math.floor(this / b) * b;
  });
  fn.defineBinaryProperty(Number.prototype, "atan2", function(b) {
    return Math.atan2(this, b);
  });
  fn.defineBinaryProperty(Number.prototype, "hypot", function(b) {
    return Math.sqrt((this * this) + (b * b));
  });
  fn.defineBinaryProperty(Number.prototype, "hypotApx", function(b) {
    var x = Math.abs(this), y = Math.abs(b);
    var minxy = Math.min(x, y);
    return x + y - (Math.sqrt(2) - 1) * minxy;
  });
  fn.defineBinaryProperty(Number.prototype, "pow", function(b) {
    return Math.pow(Math.abs(this), b);
  });
  fn.defineBinaryProperty(Number.prototype, "leftShift", function(b) {
    if (b < 0) {
      return (this|0) >> (-b|0);
    }
    return (this|0) << (b|0);
  });
  fn.defineBinaryProperty(Number.prototype, "rightShift", function(b) {
    if (b < 0) {
      return (this|0) << (-b|0);
    }
    return (this|0) >> (b|0);
  });
  fn.defineBinaryProperty(Number.prototype, "unsignedRightShift", function(b) {
    if (b < 0) {
      return (this|0) << (-b|0);
    }
    return (this|0) >> (b|0);
  });
  fn.defineBinaryProperty(Number.prototype, "fill", function() {
    return 0; // TODO: implements
  });
  fn.defineBinaryProperty(Number.prototype, "ring1", function(b) {
    return this * b + this;
  });
  fn.defineBinaryProperty(Number.prototype, "ring2", function(b) {
    return this * b + this + b;
  });
  fn.defineBinaryProperty(Number.prototype, "ring3", function(b) {
    return this * this * b;
  });
  fn.defineBinaryProperty(Number.prototype, "ring4", function(b) {
    return this * this * b - this * b * b;
  });
  fn.defineBinaryProperty(Number.prototype, "difsqr", function(b) {
    return this * this - b * b;
  });
  fn.defineBinaryProperty(Number.prototype, "sumsqr", function(b) {
    return this * this + b * b;
  });
  fn.defineBinaryProperty(Number.prototype, "sqrsum", function(b) {
    return (this + b) * (this + b);
  });
  fn.defineBinaryProperty(Number.prototype, "sqrdif", function(b) {
    return (this - b) * (this - b);
  });
  fn.defineBinaryProperty(Number.prototype, "absdif", function(b) {
    return Math.abs(this - b);
  });
  fn.defineBinaryProperty(Number.prototype, "thresh", function(b) {
    return this < b ? 0 : this;
  });
  fn.defineBinaryProperty(Number.prototype, "amclip", function(b) {
    return this * 0.5 * (b + Math.abs(b));
  });
  fn.defineBinaryProperty(Number.prototype, "scaleneg", function(b) {
    b = 0.5 * b + 0.5;
    return (Math.abs(this) - this) * b + this;
  });
  fn.defineBinaryProperty(Number.prototype, "clip2", function(b) {
    return Math.max(-b, Math.min(this, b));
  });
  fn.defineBinaryProperty(Number.prototype, "excess", function(b) {
    return this - Math.max(-b, Math.min(this, b));
  });
  fn.defineBinaryProperty(Number.prototype, "fold2", function(b) {
    var _in = this, x, c, range, range2;
    x = _in + b;
    if (_in >= b) {
      _in = b + b - _in;
      if (_in >= -b) {
        return _in;
      }
    } else if (_in < -b) {
      _in = -b - b - _in;
      if (_in < b) {
        return _in;
      }
    } else {
      return _in;
    }
    if (b === -b) {
      return -b;
    }
    range  = b + b;
    range2 = range + range;
    c = x - range2 * Math.floor(x / range2);
    if (c >= range) {
      c = range2 - c;
    }
    return c - b;
  });
  fn.defineBinaryProperty(Number.prototype, "wrap2", function(b) {
    var _in = this, range;
    if (_in >= b) {
      range = b + b;
      _in -= range;
      if (_in < b) {
        return _in;
      }
    } else if (_in < -b) {
      range = b + b;
      _in += range;
      if (_in >= -b) {
        return _in;
      }
    } else {
      return _in;
    }
    if (b === -b) {
      return -b;
    }
    return _in - range * Math.floor((_in + b) / range);
  });
  fn.defineBinaryProperty(Number.prototype, "firstarg", function() {
    return 0; // TODO: implements
  });
  fn.defineBinaryProperty(Number.prototype, "randrange", function() {
    return 0; // TODO: implements
  });
  fn.defineBinaryProperty(Number.prototype, "exprandrange", function() {
    return 0; // TODO: implements
  });
  fn.defineBinaryProperty(Number.prototype, "numbinaryselectors", function() {
    return 0; // TODO: implements
  });
  
  // arity operator methods
  fn.defineProperty(Number.prototype, "madd", fn(function(mul, add) {
    return cc.createMulAdd(this, mul, add);
  }).defaults(ops.ARITY_OPS.madd).build());
  
  fn.defineArityProperty(Number.prototype, "range", fn(function(lo, hi) {
    return this.linlin(0, 1, lo, hi);
  }).defaults(ops.ARITY_OPS.range).build());
  
  fn.defineArityProperty(Number.prototype, "exprange", fn(function(lo, hi) {
    return this.linexp(0, 1, lo, hi);
  }).defaults(ops.ARITY_OPS.exprange).build());
  
  fn.defineArityProperty(Number.prototype, "curverange", fn(function(lo, hi, curve) {
    return this.lincurve(0, 1, lo, hi, curve);
  }).defaults(ops.ARITY_OPS.curverange).build());
  
  fn.defineArityProperty(Number.prototype, "unipolar", fn(function(mul) {
    return this.__mul__(mul);
  }).defaults(ops.ARITY_OPS.unipolar).build());
  
  fn.defineArityProperty(Number.prototype, "bipolar", fn(function(mul) {
    return (this * 2 - 1).__mul__(mul);
  }).defaults(ops.ARITY_OPS.bipolar).build());
  
  fn.defineArityProperty(Number.prototype, "clip", fn(function(lo, hi) {
    return Math.max(lo, Math.min(this, hi));
  }).defaults(ops.ARITY_OPS.clip).multiCall().build());
  
  fn.defineArityProperty(Number.prototype, "fold", fn(function(lo, hi) {
    var val = this, x, range1, range2;
    if (hi === lo) {
      return lo;
    }
    if (val >= hi) {
      val = (hi * 2) - val;
      if (val >= lo) {
        return val;
      }
    } else if (val < lo) {
      val = (lo * 2) - val;
      if (val < hi) {
        return val;
      }
    } else {
      return val;
    }
    range1 = hi - lo;
    range2 = range1 * 2;
    x = val - lo;
    x -= range2 * Math.floor(x / range2);
    if (x >= range1) {
      return range2 - x + lo;
    }
    return x + lo;
  }).defaults(ops.ARITY_OPS.fold).multiCall().build());
  
  fn.defineArityProperty(Number.prototype, "wrap", fn(function(lo, hi) {
    var val = this;
    if (hi === lo) {
      return lo;
    }
    var range = (hi - lo);
    if (val >= hi) {
      val -= range;
      if (val < hi) {
        return val;
      }
    } else if (val < lo) {
      val += range;
      if (val >= lo) {
        return val;
      }
    } else {
      return val;
    }
    return val - range * Math.floor((val - lo) / range);
  }).defaults(ops.ARITY_OPS.wrap).multiCall().build());
  
  fn.defineArityProperty(Number.prototype, "blend", fn(function(that, blendFrac) {
    return this + blendFrac * (that - this);
  }).defaults(ops.ARITY_OPS.wrap).multiCall().build());
  
  fn.defineProperty(Number.prototype, "lag", function() {
    return this;
  });
  
  fn.defineProperty(Number.prototype, "lag2", function() {
    return this;
  });
  
  fn.defineProperty(Number.prototype, "lag3", function() {
    return this;
  });
  
  fn.defineProperty(Number.prototype, "lagud", function() {
    return this;
  });
  
  fn.defineProperty(Number.prototype, "lag2ud", function() {
    return this;
  });
  
  fn.defineProperty(Number.prototype, "lag3ud", function() {
    return this;
  });
  
  fn.defineProperty(Number.prototype, "varlag", function() {
    return this;
  });
  
  fn.defineProperty(Number.prototype, "slew", function() {
    return this;
  });
  
  fn.defineArityProperty(Number.prototype, "linlin", fn(function(inMin, inMax, outMin, outMax, clip) {
    switch (clip) {
    case "min":
      if (this <= inMin) { return outMin; }
      break;
    case "max":
      if (this >= inMax) { return outMax; }
      break;
    case "minmax":
      /* falls through */
    default:
      if (this <= inMin) { return outMin; }
      if (this >= inMax) { return outMax; }
      break;
    }
    // (this-inMin)/(inMax-inMin) * (outMax-outMin) + outMin;
    return (this.__sub__(inMin)).__div__(inMax.__sub__(inMin)).__mul__(outMax.__sub__(outMin)).__add__(outMin);
  }).defaults(ops.ARITY_OPS.linlin).multiCall().build());
  
  fn.defineArityProperty(Number.prototype, "linexp", fn(function(inMin, inMax, outMin, outMax, clip) {
    switch (clip) {
    case "min":
      if (this <= inMin) { return outMin; }
      break;
    case "max":
      if (this >= inMax) { return outMax; }
      break;
    case "minmax":
      /* falls through */
    default:
      if (this <= inMin) { return outMin; }
      if (this >= inMax) { return outMax; }
      break;
    }
    // Math.pow(outMax/outMin, (this-inMin)/(inMax-inMin)) * outMin;
    return outMax.__div__(outMin).pow((this.__sub__(inMin)).__div__(inMax.__sub__(inMin))).__mul__(outMin);
  }).defaults(ops.ARITY_OPS.linexp).multiCall().build());

  fn.defineArityProperty(Number.prototype, "explin", fn(function(inMin, inMax, outMin, outMax, clip) {
    switch (clip) {
    case "min":
      if (this <= inMin) { return outMin; }
      break;
    case "max":
      if (this >= inMax) { return outMax; }
      break;
    case "minmax":
      /* falls through */
    default:
      if (this <= inMin) { return outMin; }
      if (this >= inMax) { return outMax; }
      break;
    }
    // (((Math.log(this/inMin)) / (Math.log(inMax/inMin))) * (outMax-outMin)) + outMin;
    return (this.__div__(inMin).log().__div__(inMax.__div__(inMin).log()).__mul__(outMax.__sub__(outMin))).__add__(outMin);
  }).defaults(ops.ARITY_OPS.explin).multiCall().build());

  fn.defineArityProperty(Number.prototype, "expexp", fn(function(inMin, inMax, outMin, outMax, clip) {
    switch (clip) {
    case "min":
      if (this <= inMin) { return outMin; }
      break;
    case "max":
      if (this >= inMax) { return outMax; }
      break;
    case "minmax":
      /* falls through */
    default:
      if (this <= inMin) { return outMin; }
      if (this >= inMax) { return outMax; }
      break;
    }
    // Math.pow(outMax/outMin, Math.log(this/inMin) / Math.log(inMax/inMin)) * outMin;
    return outMax.__div__(outMin).pow(this.__div__(inMin).log().__div__(inMax.__div__(inMin).log())).__mul__(outMin);
  }).defaults(ops.ARITY_OPS.expexp).multiCall().build());
  
  fn.defineArityProperty(Number.prototype, "lincurve", fn(function(inMin, inMax, outMin, outMax, curve, clip) {
    switch (clip) {
    case "min":
      if (this <= inMin) { return outMin; }
      break;
    case "max":
      if (this >= inMax) { return outMax; }
      break;
    case "minmax":
      /* falls through */
    default:
      if (this <= inMin) { return outMin; }
      if (this >= inMax) { return outMax; }
      break;
    }
    if (Math.abs(curve) < 0.001) {
      return this.linlin(inMin, inMax, outMin, outMax, clip);
    }
    var grow = curve.exp();
    var a = outMax.__sub__(outMin).__div__((1).__sub__(grow));
    var b = outMin.__add__(a);
    var scaled = (this.__sub__(inMin)).__div__(inMax.__sub__(inMin));
    return b.__sub__(a.__mul__(grow.pow(scaled)));
  }).defaults(ops.ARITY_OPS.lincurve).multiCall().build());
  
  fn.defineArityProperty(Number.prototype, "curvelin", fn(function(inMin, inMax, outMin, outMax, curve, clip) {
    switch (clip) {
    case "min":
      if (this <= inMin) { return outMin; }
      break;
    case "max":
      if (this >= inMax) { return outMax; }
      break;
    case "minmax":
      /* falls through */
    default:
      if (this <= inMin) { return outMin; }
      if (this >= inMax) { return outMax; }
      break;
    }
    if (Math.abs(curve) < 0.001) {
      return this.linlin(inMin, inMax, outMin, outMax, clip);
    }
    var grow = curve.exp();
    var a = outMax.__sub__(outMin).__div__((1).__sub__(grow));
    var b = outMin.__add__(a);
    var scaled = (this.__sub__(inMin)).__div__(inMax.__sub__(inMin));
    return ((b.__sub__(scaled)).__div__(a)).log().__div__(curve);
  }).defaults(ops.ARITY_OPS.curvelin).multiCall().build());
  
  fn.defineArityProperty(Number.prototype, "bilin", fn(function(inCenter, inMin, inMax, outCenter, outMin, outMax, clip) {
    switch (clip) {
    case "min":
      if (this <= inMin) { return outMin; }
      break;
    case "max":
      if (this >= inMax) { return outMax; }
      break;
    case "minmax":
      /* falls through */
    default:
      if (this <= inMin) { return outMin; }
      if (this >= inMax) { return outMax; }
      break;
    }
    if (this >= inCenter) {
      return this.linlin(inCenter, inMax, outCenter, outMax);
    } else {
      return this.linlin(inMin, inCenter, outMin, outCenter);
    }
  }).defaults(ops.ARITY_OPS.bilin).multiCall().build());
  
  fn.defineArityProperty(Number.prototype, "rrand", fn(function(num) {
    var a = this, b = num;
    return a + drand() * (b - a);
  }).defaults(ops.ARITY_OPS.rrand).multiCall().build());
  
  fn.defineArityProperty(Number.prototype, "exprand", fn(function(num) {
    var a = this, b = num;
    if (a === 0) {
      return 0;
    }
    return a * Math.exp(Math.log(b / a) * drand());
  }).defaults(ops.ARITY_OPS.exprand).multiCall().build());

  // chord
  var chord_tensions = {
    ""      : [4, 7],
    "major" : [4, 7],
    "minor" : [3, 7],
    "major7": [4, 7, 11],
    "dom7"  : [4, 7, 10],
    "minor7": [3, 7, 10],
    "aug"   : [4, 8],
    "dim"   : [3, 6],
    "dim7"  : [3, 6, 9],
    "1"     : [],
    "5"     : [7],
    "+5"    : [4, 8],
    "m+5"   : [3, 8],
    "sus2"  : [2, 7],
    "sus4"  : [5, 7],
    "6"     : [4, 7, 9],
    "m6"    : [3, 7, 9],
    "7sus2" : [2, 7, 10],
    "7sus4" : [5, 7, 10],
    "7-5"   : [4, 6, 10],
    "m7-5"  : [3, 6, 10],
    "7+5"   : [4, 8, 10],
    "m7+5"  : [3, 8, 10],
    "9"     : [4, 7, 10, 14],
    "m9"    : [3, 7, 10, 14],
    "m7+9"  : [3, 7, 10, 14],
    "maj9"  : [4, 7, 11, 14],
    "9sus4" : [5, 7, 10, 14],
    "6*9"   : [4, 7, 9, 14],
    "m6*9"  : [3, 9, 7, 14],
    "7-9"   : [4, 7, 10, 13],
    "m7-9"  : [3, 7, 10, 13],
    "7-10"  : [4, 7, 10, 15],
    "9+5"   : [10, 13],
    "m9+5"  : [10, 14],
    "7+5-9" : [4, 8, 10, 13],
    "m7+5-9": [3, 8, 10, 13],
    "11"    : [4, 7, 10, 14, 17],
    "m11"   : [3, 7, 10, 14, 17],
    "maj11" : [4, 7, 11, 14, 17],
    "11+"   : [4, 7, 10, 14, 18],
    "m11+"  : [3, 7, 10, 14, 18],
    "13"    : [4, 7, 10, 14, 17, 21],
    "m13"   : [3, 7, 10, 14, 17, 21]
  };
  chord_tensions.M           = chord_tensions.major;
  chord_tensions.m           = chord_tensions.minor;
  chord_tensions["7"]        = chord_tensions.dom7;
  chord_tensions.M7          = chord_tensions.major7;
  chord_tensions.m7          = chord_tensions.minor7;
  chord_tensions.augmented   = chord_tensions.aug;
  chord_tensions.a           = chord_tensions.aug;
  chord_tensions.diminished  = chord_tensions.dim;
  chord_tensions.i           = chord_tensions.dim;
  chord_tensions.diminished7 = chord_tensions.dim7;
  chord_tensions.i7          = chord_tensions.dim7;
  
  var chord = function(num, name, inversion, length) {
    var i, imax;
    var tensions = chord_tensions[name] || [];
    var list = [ num ];
    for (i = 0, imax = tensions.length; i < imax; ++i) {
      list.push(num + tensions[i]);
    }
    if (inversion >= 0) {
      inversion = Math.max(0, Math.min(+inversion, list.length - 1));
      while (inversion--) {
        list.push( list.shift() + 12 );
      }
    } else {
      inversion = Math.max(0, Math.min(-inversion, list.length - 1));
      while (inversion--) {
        list.unshift( list.pop() - 12 );
      }
    }
    if (length >= 0) {
      if (length < list.length) {
        list = list.slice(0, length);
      } else {
        length -= list.length;
        for (i = 0, imax = length; i < imax; ++i) {
          list.push( list[i] + 12 );
        }
      }
    }
    return list;
  };

  fn.defineProperty(Number.prototype, "midichord", fn(function(name, inversion, length) {
    return chord(this, name, inversion, length);
  }).defaults("name=\"\",inversion=0,length=-1").multiCall().build());
  
  fn.defineProperty(Number.prototype, "chord", fn(function(name, inversion, length) {
    if (!cc.deprecate.chord) {
      cc.deprecate.chord = true;
      cc.global.console.log("Number#chord is now called `Number#midichord`");
    }
    return chord(this, name, inversion, length);
  }).defaults("name=\"\",inversion=0,length=-1").multiCall().build());
  
  fn.defineProperty(Number.prototype, "cpschord", fn(function(name, inversion, length) {
    var num = this;
    return chord(0, name, inversion, length).map(function(midi) {
      return num * Math.pow(2, midi * 1/12);
    });
  }).defaults("name=\"\",inversion=0,length=-1").multiCall().build());
  
  fn.defineProperty(Number.prototype, "chordcps", fn(function(name, inversion, length) {
    var num = this;
    if (!cc.deprecate.chordcps) {
      cc.deprecate.chordcps = true;
      cc.global.console.log("Number#chordcps is now called `Number#cpschord`");
    }
    return chord(0, name, inversion, length).map(function(midi) {
      return num * Math.pow(2, midi * 1/12);
    });
  }).defaults("name=\"\",inversion=0,length=-1").multiCall().build());
  
  fn.defineProperty(Number.prototype, "ratiochord", fn(function(name, inversion, length) {
    var num = Math.pow(2, this * 1/12);
    return chord(0, name, inversion, length).map(function(midi) {
      return num * Math.pow(2, midi * 1/12);
    });
  }).defaults("name=\"\",inversion=0,length=-1").multiCall().build());
  
  fn.defineProperty(Number.prototype, "chordratio", fn(function(name, inversion, length) {
    var num = Math.pow(2, this * 1/12);
    if (!cc.deprecate.chordratio) {
      cc.deprecate.chordratio = true;
      cc.global.console.log("Number#chordratio is now called `Number#ratiochord`");
    }
    return chord(0, name, inversion, length).map(function(midi) {
      return num * Math.pow(2, midi * 1/12);
    });
  }).defaults("name=\"\",inversion=0,length=-1").multiCall().build());
  
  (function() {
    var keys = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
    Object.keys(keys).forEach(function(key) {
      var note = keys[key];
      for (var i = 0; i <= 9; ++i) {
        cc.global[key + i] = note + (i * 12);
      }
    });
  })();
  
  module.exports = {};

});
define('cc/lang/object', function(require, exports, module) {

  var cc = require("./cc");
  var fn = require("./fn");
  var ops = require("../common/ops");
  
  fn.defineProperty(cc.Object.prototype, "clone", fn(function() {
    return this;
  }).defaults(ops.COMMONS.clone).build());
  
  fn.defineProperty(cc.Object.prototype, "dup", fn(function(n, deep) {
    var a = new Array(n|0);
    for (var i = 0, imax = a.length; i < imax; ++i) {
      a[i] = this.clone(deep);
    }
    return a;
  }).defaults(ops.COMMONS.dup).build());

  fn.defineProperty(cc.Object.prototype, "asUGenInput", function() {
    throw new Error(this.klassName + " can't cast to a UGen.");
  });
  
  fn.defineProperty(cc.Object.prototype, "asString", function() {
    return this.klassName;
  });
  
  module.exports = {};

});
define('cc/lang/pattern', function(require, exports, module) {

  var cc = require("./cc");
  var fn = require("./fn");
  var extend  = require("../common/extend");
  var ops = require("../common/ops");
  var utils = require("./utils");
  
  var isNotNull = function(obj) {
    return obj !== null && obj !== undefined;
  };
  var valueOf = function(item) {
    if (item instanceof Pattern) {
      return item.next();
    }
    return item;
  };

  var asPattern = function(item) {
    if (item instanceof Pattern) {
      return item;
    }
    return new Pseq(utils.asArray(item), 1, 0);
  };
  
  var Pattern = (function() {
    function Pattern() {
      this.klassName = "Pattern";
      this._finished = false;
    }
    extend(Pattern, cc.Object);

    Pattern.prototype.clone = function() {
      return this;
    };
    Pattern.prototype.next = function() {
      return null;
    };
    Pattern.prototype.nextN = function(n, inVal) {
      var a = new Array(n);
      for (var i = 0; i < n; ++i) {
        a[i] = this.next(inVal);
      }
      return a;
    };
    Pattern.prototype.reset = function() {
      return this;
    };
    Pattern.prototype.performWait = function() {
      return !this._finished;
    };
    Pattern.prototype.concat = function(item) {
      return new Pseq([this, item.clone()], 1);
    };

    Pattern.prototype["do"] = function(func) {
      var i = 0, val = true;
      if (cc.instanceOfSyncBlock(func)) {
        if (cc.currentSyncBlockHandler) {
          cc.currentSyncBlockHandler.__sync__(func, cc.createTaskArgumentsPattern(this));
        } else {
          while (val) {
            val = this.next();
            if (isNotNull(val)) {
              func.clone().perform([val, i++]);
            }
          }
        }
      } else {
        while (val) {
          val = this.next();
          if (isNotNull(val)) {
            func.clone().perform([val, i++]);
          }
        }
      }
      return this;
    };
    
    // unary operators
    ["__plus__","__minus__"].concat(Object.keys(ops.UNARY_OPS)).forEach(function(selector) {
      if (/^[a-z_][a-zA-Z0-9_]*$/.test(selector)) {
        Pattern.prototype[selector] = function() {
          return new Puop(this, selector);
        };
      }
    });

    // binary operators
    ["__add__","__sub__","__mul__","__div__","__mod__"].concat(Object.keys(ops.BINARY_OPS)).forEach(function(selector) {
      if (/^[a-z_][a-zA-Z0-9_]*$/.test(selector)) {
        Pattern.prototype[selector] = function(b) {
          return new Pbop(this, selector, b);
        };
      }
    });
    
    return Pattern;
  })();

  var Puop = (function() {
    function Puop(pattern, selector) {
      if (!Number.prototype.hasOwnProperty(selector)) {
        throw new TypeError("Puop: operator '" + selector + "' not supported");
      }
      Pattern.call(this);
      this.klassName = "Puop";
      this._pattern   = pattern;
      this._selector  = selector;
    }
    extend(Puop, Pattern);
    
    Puop.prototype.clone = function() {
      return new Puop(this._pattern.clone(), this._selector);
    };
    
    Puop.prototype.next = function() {
      if (!this._finished) {
        var val = this._pattern.next();
        if (isNotNull(val)) {
          return val[this._selector].call(val);
        }
        this._finished = true;
      }
      return null;
    };
    
    return Puop;
  })();
  
  var Pbop = (function() {
    function Pbop(pattern, selector, b) {
      if (!Number.prototype.hasOwnProperty(selector)) {
        throw new TypeError("Pbop: operator '" + selector + "' not supported");
      }
      Pattern.call(this);
      this.klassName = "Pbop";
      this._pattern   = pattern;
      this._selector  = selector;
      this._b = b;
    }
    extend(Pbop, Pattern);
    
    Pbop.prototype.clone = function() {
      return new Pbop(this._pattern.clone(), this._selector);
    };
    
    Pbop.prototype.next = function() {
      if (!this._finished) {
        var val = this._pattern.next();
        if (isNotNull(val)) {
          return val[this._selector].call(val, this._b);
        }
        this._finished = true;
      }
      return null;
    };
    
    return Pbop;
  })();
  
  var Pgeom = (function() {
    function Pgeom(start, grow, length) {
      Pattern.call(this);
      this.klassName = "Pgeom";
      this._start = utils.asNumber(start);
      this._grow  = utils.asNumber(grow);
      this._length = utils.asNumber(length);
      this._pos    = 0;
      this._value  = this._start;
    }
    extend(Pgeom, Pattern);

    Pgeom.prototype.clone = function() {
      return new Pgeom(this._start, this._grow, this._length);
    };
    
    Pgeom.prototype.next = function() {
      if (this._pos < this._length) {
        var value = this._value;
        this._value *= this._grow;
        this._pos += 1;
        return value;
      } else {
        this._pos = Infinity;
        this._finished = true;
      }
      return null;
    };

    Pgeom.prototype.reset = function() {
      this._pos = 0;
      this._value = this._start;
      this._finished = false;
      return this;
    };
    
    return Pgeom;
  })();
  
  var Pseries = (function() {
    function Pseries(start, step, length) {
      Pattern.call(this);
      this.klassName = "Pseries";
      this._start = utils.asNumber(start);
      this._step  = utils.asNumber(step);
      this._length = utils.asNumber(length);
      this._pos    = 0;
      this._value  = this._start;
    }
    extend(Pseries, Pattern);

    Pseries.prototype.clone = function() {
      return new Pseries(this._start, this._start, this._length);
    };
    
    Pseries.prototype.next = function() {
      if (this._pos < this._length) {
        var value = this._value;
        this._value += this._step;
        this._pos += 1;
        return value;
      } else {
        this._pos = Infinity;
        this._finished = true;
      }
      return null;
    };

    Pseries.prototype.reset = function() {
      this._pos = 0;
      this._value = this._start;
      this._finished = false;
      return this;
    };
    
    return Pseries;
  })();

  var Pwhite = (function() {
    function Pwhite(lo, hi, length) {
      Pattern.call(this);
      this.klassName = "Pwhite";
      this._lo = utils.asNumber(lo);
      this._hi = utils.asNumber(hi);
      this._length = utils.asNumber(length);
      this._pos    = 0;
    }
    extend(Pwhite, Pattern);

    Pwhite.prototype.clone = function() {
      return new Pwhite(this._lo, this._hi, this._length);
    };
    
    Pwhite.prototype.next = function() {
      if (this._pos < this._length) {
        this._pos += 1;
        return Math.random() * (this._hi - this._lo) + this._lo;
      } else {
        this._pos = Infinity;
        this._finished = true;
      }
      return null;
    };
    
    return Pwhite;
  })();
  
  var ListPattern = (function() {
    function ListPattern(list, repeats, offset) {
      Pattern.call(this);
      this.klassName = "ListPattern";
      this.list    = utils.asArray(list);
      this.repeats = utils.asNumber(repeats);
      this.offset  = utils.asNumber(offset);
      this._pos = 0;
      this._posMax = this.repeats;
      this._list   = this.list;
    }
    extend(ListPattern, Pattern);
    
    ListPattern.prototype.clone = function() {
      return new this.constructor(this.list, this.repeats, this.offset);
    };
    
    ListPattern.prototype.next = function() {
      if (this._pos < this._posMax) {
        var index = this._calcIndex();
        var item  = this._list[index];
        var val   = valueOf(item);
        if (isNotNull(val)) {
          if (!(item instanceof Pattern)) {
            this._pos += 1;
          }
          return val;
        }
        if (item instanceof Pattern) {
          item.reset();
        }
        this._pos += 1;
        return this.next();
      } else {
        this._pos = Infinity;
        this._finished = true;
      }
      return null;
    };
    
    ListPattern.prototype.reset = function() {
      this._pos = 0;
      this._finished = false;
      var list = this.list;
      for (var i = 0, imax = list.length; i < imax; ++i) {
        if (list[i] instanceof Pattern) {
          list[i].reset();
        }
      }
      return this;
    };
    
    return ListPattern;
  })();
  
  var Pser = (function() {
    function Pser(list, repeats, offset) {
      ListPattern.call(this, list, repeats, offset);
      this.klassName = "Pser";
    }
    extend(Pser, ListPattern);
    
    Pser.prototype._calcIndex = function() {
      return (this._pos + this.offset) % this.list.length;
    };
    
    return Pser;
  })();
  
  var Pseq = (function() {
    function Pseq(list, repeats, offset) {
      Pser.call(this, list, repeats, offset);
      this.klassName = "Pseq";
      this._posMax = this.repeats * this.list.length;
    }
    extend(Pseq, Pser);
    
    return Pseq;
  })();
  
  var Pshuf = (function() {
    function Pshuf(list, repeats) {
      Pseq.call(this, list, repeats, 0);
      this.klassName = "Pshuf";
      this._list = this.list.slice().sort(shuffle);
    }
    extend(Pshuf, Pseq);
    
    var shuffle = function() { return Math.random() - 0.5; };
    
    return Pshuf;
  })();

  var Prand = (function() {
    function Prand(list, repeats) {
      ListPattern.call(this, list, repeats, 0);
      this.klassName = "Prand";
    }
    extend(Prand, ListPattern);
    
    Prand.prototype._calcIndex = function() {
      return (this.list.length * Math.random())|0;
    };
    
    return Prand;
  })();

  var Pn = (function() {
    function Pn(pattern, repeats) {
      Pattern.call(this);
      this._pattern = asPattern(pattern);
      this._repeats = utils.asNumber(repeats);
      this._i = 0;
    }
    extend(Pn, Pattern);
    
    Pn.prototype.clone = function() {
      return new Pn(this._pattern.clone(), this._repeats);
    };
    
    Pn.prototype.next = function() {
      if (!this._finished) {
        var val = this._pattern.next();
        if (isNotNull(val)) {
          return val;
        }
        this._i += 1;
        if (this._i !== this._repeats) {
          this._pattern.reset();
          return this.next();
        }
        this._finished = true;
      }
      return null;
    };
    
    Pn.prototype.reset = function() {
      this._finished = false;
      this._i = 0;
      this._pattern.reset();
      return this;
    };
    
    return Pn;
  })();
  
  var Pfin = (function() {
    function Pfin(count, pattern) {
      Pattern.call(this);
      this.klassName = "Pfin";
      this._count = utils.asNumber(count);
      this._pattern = asPattern(pattern);
      this._pos = 0;
    }
    extend(Pfin, Pattern);

    Pfin.prototype.clone = function() {
      return new Pfin(this._count, this._pattern.clone());
    };

    Pfin.prototype.next = function() {
      if (this._pos < this._count) {
        var val = this._pattern.next();
        if (isNotNull(val)) {
          this._pos += 1;
          return val;
        } else {
          this._pos = Infinity;
          this._finished = true;
        }
      }
      return null;
    };

    Pfin.prototype.reset = function() {
      this._finished = false;
      this._pos = 0;
      this._pattern.reset();
      return this;
    };
    
    return Pfin;
  })();
  
  var Pstutter = (function() {
    function Pstutter(n, pattern) {
      Pattern.call(this);
      this.klassName = "Pstutter";
      this._n = utils.asNumber(n);
      this._pattern = asPattern(pattern);
      this._i = n;
      this._val = null;
      if (this._n === 0) {
        this._finished = true;
      }
    }
    extend(Pstutter, Pattern);

    Pstutter.prototype.clone = function() {
      return new Pstutter(this._n, this._p.clone());
    };

    Pstutter.prototype.next = function() {
      if (!this._finished) {
        if (this._i >= this._n) {
          var val = this._pattern.next();
          if (isNotNull(val)) {
            this._val = val;
            this._i = 1;
            return val;
          } else {
            this._finished = true;
          }
        } else {
          this._i += 1;
          return this._val;
        }
      }
      return null;
    };
    
    Pstutter.prototype.reset = function() {
      this._i = this._n;
      this._pattern.reset();
      if (this._n !== 0) {
        this._finished = false;
      }
      return this;
    };
    
    return Pstutter;
  })();
  
  cc.global.Pgeom = fn(function(start, grow, length) {
    return new Pgeom(start, grow, length);
  }).defaults("start=0,grow=1,length=Infinity").build();
  cc.global.Pgeom["new"] = cc.global.Pgeom;
  
  cc.global.Pseries = fn(function(start, step, length) {
    return new Pseries(start, step, length);
  }).defaults("start=0,step=1,length=Infinity").build();
  cc.global.Pseries["new"] = cc.global.Pseries;
  
  cc.global.Pwhite = fn(function(lo, hi, length) {
    return new Pwhite(lo, hi, length);
  }).defaults("lo=0,hi=1,length=Infinity").build();
  cc.global.Pwhite["new"] = cc.global.Pwhite;
  
  cc.global.Pser = fn(function(list, repeats, offset) {
    return new Pser(list, repeats, offset);
  }).defaults("list=[],repeats=1,offset=0").build();
  cc.global.Pser["new"] = cc.global.Pser;
  
  cc.global.Pseq = fn(function(list, repeats, offset) {
    return new Pseq(list, repeats, offset);
  }).defaults("list,repeats=1,offset=0").build();
  cc.global.Pseq["new"] = cc.global.Pseq;
  
  cc.global.Pshuf = fn(function(list, repeats) {
    return new Pshuf(list, repeats);
  }).defaults("list=[],repeats=1").build();
  cc.global.Pshuf["new"] = cc.global.Pshuf;
  
  cc.global.Prand = fn(function(list, repeats) {
    return new Prand(list, repeats);
  }).defaults("list=[],repeats=1").build();
  cc.global.Prand["new"] = cc.global.Prand;
  
  cc.global.Pn = fn(function(pattern, repeats) {
    return new Pn(pattern, repeats);
  }).defaults("pattern=[],repeats=Infinity").build();
  cc.global.Pn["new"] = cc.global.Pn;
  
  cc.global.Pfin = fn(function(count, pattern) {
    return new Pfin(count, pattern);
  }).defaults("count=1,pattern=[]").build();
  cc.global.Pfin["new"] = cc.global.Pfin;
  
  cc.global.Pstutter = fn(function(n, pattern) {
    return new Pstutter(n, pattern);
  }).defaults("n=1,pattern=[]").build();
  cc.global.Pstutter["new"] = cc.global.Pstutter;
  
  module.exports = {
    Pattern: Pattern,
    Puop   : Puop,
    Pbop   : Pbop,
    
    Pgeom  : Pgeom,
    Pseries: Pseries,
    Pwhite : Pwhite,
    
    ListPattern: ListPattern,
    Pser : Pser,
    Pseq : Pseq,
    Pshuf: Pshuf,
    Prand: Prand,

    Pn      : Pn,
    Pfin    : Pfin,
    Pstutter: Pstutter
  };

});
define('cc/lang/scale', function(require, exports, module) {

  var cc = require("./cc");
  var fn = require("./fn");
  var extend = require("../common/extend");
  
  var ratiomidi = function(list) {
    return list.map(function(x) {
      return Math.log(x) * Math.LOG2E * 12;
    });
  };
  var range = function(to) {
    var list = new Array(to);
    for (var i = 0; i <= to; ++i) {
      list[i] = i;
    }
    return list;
  };
  
  var Tuning = (function() {
    function Tuning(tuning, octaveRatio, name) {
      this.klassName = "Tuning";
      this._tuning = tuning;
      this._octaveRatio = octaveRatio;
      this.name = name;
    }
    extend(Tuning, cc.Object);
    
    Tuning.prototype.semitones = function() {
      return this._tuning.slice();
    };
    Tuning.prototype.cents = function() {
      return this._tuning.map(function(x) {
        return x * 100;
      });
    };
    Tuning.prototype.ratios = function() {
      return this._tuning.map(function(x) {
        return Math.pow(2, x * 1/12);
      });
    };
    Tuning.prototype.at = fn(function(index) {
      return this._tuning[index];
    }).multiCall().build();
    Tuning.prototype.wrapAt = fn(function(index) {
      index = index % this._tuning.length;
      if (index < 0) {
        index = this._tuning.length + index;
      }
      return this._tuning[index];
    }).multiCall().build();
    Tuning.prototype.octaveRatio = function() {
      return this._octaveRatio;
    };
    Tuning.prototype.size = function() {
      return this._tuning.length;
    };
    Tuning.prototype.stepsPerOctave = function() {
      return Math.log(this._octaveRatio) * Math.LOG2E * 12;
    };
    Tuning.prototype.tuning = function() {
      return this._tuning;
    };
    Tuning.prototype.equals = function(that) {
      return (that instanceof Tuning) &&
        (this._octaveRatio === that._octaveRatio) &&
        this._tuning.every(function(x, i) {
          return x === that._tuning[i];
        }, this);
    };
    Tuning.prototype.copy = function() {
      return new Tuning(this._tuning.slice(0), this._octaveRatio, this.name);
    };
    
    return Tuning;
  })();
  
  var tuningInfo = {
    et12: [
      (
        [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 ]
      ), 2, "ET12"
    ],
    pythagorean: [
      ratiomidi(
        [ 1, 256/243, 9/8, 32/27, 81/64, 4/3, 729/512, 3/2, 128/81, 27/16, 16/9, 243/128 ]
      ), 2, "Pythagorean"
    ],
    just: [
      ratiomidi(
        [ 1, 16/15, 9/8, 6/5, 5/4, 4/3, 45/32, 3/2, 8/5, 5/3, 9/5, 15/8 ]
      ), 2, "Limit Just Intonation"
    ],
    sept1: [
      ratiomidi(
        [ 1, 16/15, 9/8, 6/5, 5/4, 4/3, 7/5, 3/2, 8/5, 5/3, 9/5, 15/8 ]
      ), 2, "Septimal Tritone Just Intonation"
    ],
    sept2: [
      ratiomidi(
        [ 1, 16/15, 9/8, 6/5, 5/4, 4/3, 7/5, 3/2, 8/5, 5/3, 7/4, 15/8 ]
      ), 2, "7-Limit Just Intonation"
    ],
    mean4: [
      (
        [ 0, 0.755, 1.93, 3.105, 3.86, 5.035, 5.79, 6.965, 7.72, 8.895, 10.07, 10.82 ]
      ), 2, "Meantone, 1/4 Syntonic Comma"
    ],
    mean5: [
      (
        [ 0, 0.804, 1.944, 3.084, 3.888, 5.028, 5.832, 6.972, 7.776, 8.916, 10.056, 10.86 ]
      ), 2, "Meantone, 1/5 Pythagorean Comma"
    ],
    mean6: [
      (
        [ 0, 0.86, 1.96, 3.06, 3.92, 5.02, 5.88, 6.98, 7.84, 8.94, 10.04, 10.9 ]
      ), 2, "Meantone, 1/6 Pythagorean Comma"
    ],
    kirnberger: [
      ratiomidi(
        [ 1, 256/243, Math.sqrt(5)/2, 32/27, 5/4, 4/3, 45/32, Math.pow(5, 0.25), 128/81, Math.pow(5, 0.75)/2, 16/9, 15/8 ]
      ), 2, "Kirnberger III"
    ],
    werckmeister: [
      (
        [ 0, 0.92, 1.93, 2.94, 3.915, 4.98, 5.9, 6.965, 7.93, 8.895, 9.96, 10.935 ]
      ), 2, "Werckmeister III"
    ],
    vallotti: [
      (
        [ 0, 0.94135, 1.9609, 2.98045, 3.92180, 5.01955, 5.9218, 6.98045, 7.9609, 8.94135, 10, 10.90225 ]
      ), 2, "Vallotti"
    ],
    young: [
      (
        [ 0, 0.9, 1.96, 2.94, 3.92, 4.98, 5.88, 6.98, 7.92, 8.94, 9.96, 10.9 ]
      ), 2, "Young"
    ],
    reinhard: [
      ratiomidi(
        [ 1, 14/13, 13/12, 16/13, 13/10, 18/13, 13/9, 20/13, 13/8, 22/13, 13/7, 208/105 ]
      ), 2, "Mayumi Reinhard"
    ],
    wcHarm: [
      ratiomidi(
        [ 1, 17/16, 9/8, 19/16, 5/4, 21/16, 11/8, 3/2, 13/8, 27/16, 7/4, 15/8 ]
      ), 2, "Wendy Carlos Harmonic"
    ],
    wcSJ: [
      ratiomidi(
        [ 1, 17/16, 9/8, 6/5, 5/4, 4/3, 11/8, 3/2, 13/8, 5/3, 7/4, 15/8 ]
      ), 2, "Wendy Carlos Super Just"
    ],
    lu: [
      ratiomidi(
        [ 1, 2187/2048, 9/8, 19683/16384, 81/64, 177147/131072, 729/612, 3/2, 6561/4096, 27/16, 59049/32768, 243/128 ]
      ), 2, "Chinese Shi-er-lu scale"
    ],
    et19: [
      range(18).map(function(x) {
        return x * 12 / 19;
      }), 2, "ET19"
    ],
    et22: [
      range(22).map(function(x) {
        return x * 12 / 22;
      }), 2, "ET22"
    ],
    et24: [
      range(24).map(function(x) {
        return x * 12 / 24;
      }), 2, "ET24"
    ],
    et31: [
      range(31).map(function(x) {
        return x * 12 / 31;
      }), 2, "ET31"
    ],
    et41: [
      range(41).map(function(x) {
        return x * 12 / 41;
      }), 2, "ET41"
    ],
    et53: [
      range(53).map(function(x) {
        return x * 12 / 53;
      }), 2, "ET53"
    ],
    johnston: [
      ratiomidi(
        [ 1, 25/24, 135/128, 16/15, 10/9, 9/8, 75/64, 6/5, 5/4, 81/64, 32/25, 4/3, 27/20, 45/32, 36/25, 3/2, 25/16, 8/5, 5/3, 27/16, 225/128, 16/9, 9/5, 15/8, 48/25 ]
      ), 2, "Ben Johnston"
    ],
    partch: [
      ratiomidi(
        [ 1, 81/80, 33/32, 21/20, 16/15, 12/11, 11/10, 10/9, 9/8, 8/7, 7/6, 32/27, 6/5, 11/9, 5/4, 14/11, 9/7, 21/16, 4/3, 27/20, 11/8, 7/5, 10/7, 16/11, 40/27, 3/2, 32/21, 14/9, 11/7, 8/5, 18/11, 5/3, 27/16, 12/7, 7/4, 16/9, 9/5, 20/11, 11/6, 15/8, 40/21, 64/33, 160/81 ]
      ), 2, "Harry Partch"
    ],
    catler: [
      ratiomidi(
        [ 1, 33/32, 16/15, 9/8, 8/7, 7/6, 6/5, 128/105, 16/13, 5/4, 21/16, 4/3, 11/8, 45/32, 16/11, 3/2, 8/5, 13/8, 5/3, 27/16, 7/4, 16/9, 24/13, 15/8 ]
      ), 2, "Jon Catler"
    ],
    chalmers: [
      ratiomidi(
        [ 1, 21/20, 16/15, 9/8, 7/6, 6/5, 5/4, 21/16, 4/3, 7/5, 35/24, 3/2, 63/40, 8/5, 5/3, 7/4, 9/5, 28/15, 63/32 ]
      ), 2, "John Chalmers"
    ],
    harrison: [
      ratiomidi(
        [ 1, 16/15, 10/9, 8/7, 7/6, 6/5, 5/4, 4/3, 17/12, 3/2, 8/5, 5/3, 12/7, 7/4, 9/5, 15/8 ]
      ), 2, "Lou Harrison"
    ],
    sruti: [
      ratiomidi(
        [ 1, 256/243, 16/15, 10/9, 9/8, 32/27, 6/5, 5/4, 81/64, 4/3, 27/20, 45/32, 729/512, 3/2, 128/81, 8/5, 5/3, 27/16, 16/9, 9/5, 15/8, 243/128 ]
      ), 2, "Sruti"
    ],
    parret: [
      ratiomidi(
        [1, 21/20, 35/32, 9/8, 7/6, 6/5, 5/4, 21/16, 4/3, 7/5, 35/24, 3/2, 63/40, 8/5, 5/3, 7/4, 9/5, 15/8, 63/32]
      ), 2, "Wilfrid Perret"
    ],
    michael_harrison: [
      ratiomidi(
        [1, 28/27, 135/128, 16/15, 243/224, 9/8, 8/7, 7/6, 32/27, 6/5, 135/112, 5/4, 81/64, 9/7, 21/16, 4/3, 112/81, 45/32, 64/45, 81/56, 3/2, 32/21, 14/9, 128/81, 8/5, 224/135, 5/3, 27/16, 12/7, 7/4, 16/9, 15/8, 243/128, 27/14 ]
      ), 2, "Michael Harrison 24 tone 7-limit"
    ],
    harmonic: [
      ratiomidi(
        range(24).slice(1)
      ), 2, "Harmonic Series 24"
    ],
    bp: [
      ratiomidi(range(12).map(function(x) {
        return x * 19.019550008654 / 13;
      })
      ), 3, "Bohlen-Pierce"
    ],
    wcAlpha: [
      range(14).map(function(x) {
        return x * 0.78;
      }), 1.9656411970852, "Wendy Carlos Alpha"
    ],
    wcBeta: [
      range(18).map(function(x) {
        return x * 0.638;
      }), 2.0141437696805, "Wendy Carlos Beta"
    ],
    wcGamma: [
      range(33).map(function(x) {
        return x * 0.351;
      }), 1.9923898962606, "Wendy Carlos Gamma"
    ]
  };
  
  cc.global.Tuning = fn(function(tuning, octaveRatio, name) {
    if (!Array.isArray(tuning)) {
      tuning = [0,1,2,3,4,5,6,7,8,9,10,11];
    }
    if (typeof octaveRatio !== "number") {
      octaveRatio = 2;
    }
    if (typeof name !== "string") {
      name = "Unknown Tuning";
    }
    return new Tuning(tuning, octaveRatio, name);
  }).defaults("tuning,octaveRatio,name").build();
  cc.global.Tuning["new"] = cc.global.Tuning;
  
  var tunings = {};
  Object.keys(tuningInfo).forEach(function(key) {
    var params = tuningInfo[key];
    tunings[key] = new Tuning(params[0], params[1], params[2]);
    cc.global.Tuning[key] = tunings[key];
  });
  
  cc.global.Tuning.at = function(key) {
    var t = tunings[key];
    if (t) {
      return t.copy();
    }
    return tunings.et12.copy();
  };
  
  cc.global.Tuning.choose = fn(function(size) {
    if (typeof size !== "number") {
      size = 12;
    }
    var candidates = [];
    var keys = Object.keys(tunings);
    var t;
    for (var i = 0, imax = keys.length; i < imax; ++i) {
      t = tunings[keys[i]];
      if (t._tuning.length === size) {
        candidates.push(t);
      }
    }
    t = candidates[(Math.random() * candidates.length)|0];
    if (t) {
      return t.copy();
    }
    return tunings.et12.copy();
  }).multiCall().build();
  
  cc.global.Tuning.et = function(pitchesPerOctave) {
    var list = new Array(pitchesPerOctave);
    for (var i = 0; i < pitchesPerOctave; ++i) {
      list[i] = i * (12 / pitchesPerOctave);
    }
    return new Tuning(list, 2, "ET" + pitchesPerOctave);
  };
  
  cc.global.Tuning.names = function() {
    return Object.keys(tunings).sort();
  };
  
  var Scale = (function() {
    function Scale(degrees, pitchesPerOctave, tuning, name) {
      this.klassName = "Scale";
      this._degrees = degrees;
      this._pitchesPerOctave = pitchesPerOctave;
      this.name = name;
      this.tuning(tuning);
    }
    extend(Scale, cc.Object);
    
    Scale.prototype.tuning = function(inTuning) {
      if (arguments.length === 0) {
        return this._tuning;
      }
      if (typeof inTuning === "string") {
        inTuning = tunings[inTuning];
      }
      if (!(inTuning instanceof Tuning)) {
        throw new TypeError("Scale: arguments[2] should be a tuning.");
      }
      if (this._pitchesPerOctave !== inTuning.size()) {
        throw new TypeError("Scale steps per octave " + this._pitchesPerOctave + " does not match tuning size.");
      }
      this._tuning = inTuning;
      return inTuning;
    };
    Scale.prototype.semitones = function() {
      return this._degrees.map(function(i) {
        return this._tuning.wrapAt(i);
      }, this);
    };
    Scale.prototype.cents = function() {
      return this.semitones().map(function(x) {
        return x * 100;
      });
    };
    Scale.prototype.ratios = function() {
      return this.semitones().map(function(x) {
        return Math.pow(2, x * 1/12);
      });
    };
    Scale.prototype.size = function() {
      return this._degrees.length;
    };
    Scale.prototype.pitchesPerOctave = function() {
      return this._pitchesPerOctave;
    };
    Scale.prototype.stepsPerOctave = function() {
      return Math.log(this.octaveRatio()) * Math.LOG2E * 12;
    };
    Scale.prototype.at = fn(function(index) {
      index = index % this._degrees.length;
      if (index < 0) {
        index = this._degrees.length + index;
      }
      return this._tuning.at(this._degrees[index]);
    }).multiCall().build();
    Scale.prototype.wrapAt = fn(function(index) {
      index = index % this._degrees.length;
      if (index < 0) {
        index = this._degrees.length + index;
      }
      return this._tuning.wrapAt(this._degrees[index]);
    }).multiCall().build();
    Scale.prototype.degreeToFreq = fn(function(degree, rootFreq, octave) {
      return degreeToRatio(this, degree, octave) * rootFreq;
    }).defaults("degree=0,rootFreq=0,octave=0").multiCall().build();
    Scale.prototype.degreeToRatio = fn(function(degree, octave) {
      return degreeToRatio(this, degree, octave);
    }).defaults("degree=0,octave=0").multiCall().build();
    Scale.prototype.degrees = function() {
      return this._degrees;
    };
    Scale.prototype.octaveRatio = function() {
      return this._tuning.octaveRatio();
    };
    Scale.prototype.equals = function(that) {
      return (that instanceof Scale) &&
        this._degrees.every(function(x, i) {
          return x === that._degrees[i];
        }) && this._tuning.equals(that._tuning);
    };
    Scale.prototype.copy = function() {
      return new Scale(
        this._degrees.slice(),
        this._pitchesPerOctave,
        this._tuning.copy(),
        this.name
      );
    };
    var degreeToRatio = function(that, degree, octave) {
      var ratios = that.ratios();
      var index  = degree % ratios.length;
      octave += (degree / that._degrees.length)|0;
      if (index < 0) {
        index = ratios.length + index;
        octave -= Math.ceil(index / ratios.length);
      }
      return ratios[index] * Math.pow(that.octaveRatio(), octave);
    };
    
    return Scale;
  })();
  
  var guessPPO = function(degrees) {
    var i, max = degrees[0] || 0;
    for (i = degrees.length; i--; ) {
      if (max < degrees[i]) {
        max = degrees[i];
      }
    }
    var etTypes = [53,24,19,12];
    for (i = etTypes.length; i--; ) {
      if (max < etTypes[i]) {
        return etTypes[i];
      }
    }
    return 128;
  };
  
  var scaleInfo = {
    major: [
      [ 0, 2, 4, 5, 7, 9, 11 ], 12, 0, "Major"
    ],
    minor: [
      [ 0, 2, 3, 5, 7, 8, 10 ], 12, 0, "Natural Minor"
    ],
    minorPentatonic: [
      [ 0, 3, 5, 7, 10 ], 12, 0, "Minor Pentatonic"
    ],
    majorPentatonic: [
      [ 0, 2, 4, 7, 9 ], 12, 0, "Major Pentatonic"
    ],
    ritusen: [
      [ 0, 2, 5, 7, 9 ], 12, 0, "Ritusen"
    ],
    egyptian: [
      [ 0, 2, 5, 7, 10 ], 12, 0, "Egyptian"
    ],
    kumoi: [
      [ 0, 2, 3, 7, 9 ], 12, 0, "Kumoi"
    ],
    hirajoshi: [
      [ 0, 2, 3, 7, 8 ], 12, 0, "Hirajoshi"
    ],
    iwato: [
      [ 0, 1, 5, 6, 10 ], 12, 0, "Iwato"
    ],
    ryukyu: [
      [ 0, 4, 5, 7, 11 ], 12, 0, "Ryukyu"
    ],
    chinese: [
      [ 0, 4, 6, 7, 11 ], 12, 0, "Chinese"
    ],
    indian: [
      [ 0, 4, 5, 7, 10 ], 12, 0, "Indian"
    ],
    pelog: [
      [ 0, 1, 3, 7, 8 ], 12, 0, "Pelog"
    ],
    prometheus: [
      [ 0, 2, 4, 6, 11 ], 12, 0, "Prometheus"
    ],
    scriabin: [
      [ 0, 1, 4, 7, 9 ], 12, 0, "Scriabin"
    ],
    gong: [
      [ 0, 2, 4, 7, 9 ], 12, 0, "Gong"
    ],
    shang: [
      [ 0, 2, 5, 7, 10 ], 12, 0, "Shang"
    ],
    jiao: [
      [ 0, 3, 5, 8, 10 ], 12, 0, "Jiao"
    ],
    zhi: [
      [ 0, 2, 5, 7, 9 ], 12, 0, "Zhi"
    ],
    yu: [
      [ 0, 3, 5, 7, 10 ], 12, 0, "Yu"
    ],
    whole: [
      [ 0, 2, 4, 6, 8, 10 ], 12, 0, "Whole Tone"
    ],
    augmented: [
      [ 0, 3, 4, 7, 8, 11 ], 12, 0, "Augmented"
    ],
    augmented2: [
      [ 0, 1, 4, 5, 8, 9 ], 12, 0, "Augmented 2"
    ],
    partch_o1: [
      [ 0, 8, 14, 20, 25, 34], 43, "partch", "Partch Otonality 1"
    ],
    partch_o2: [
      [ 0, 7, 13, 18, 27, 35 ], 43, "partch", "Partch Otonality 2"
    ],
    partch_o3: [
      [ 0, 6, 12, 21, 29, 36 ], 43, "partch", "Partch Otonality 3"
    ],
    partch_o4: [
      [ 0, 5, 15, 23, 30, 37 ], 43, "partch", "Partch Otonality 4"
    ],
    partch_o5: [
      [ 0, 10, 18, 25, 31, 38 ], 43, "partch", "Partch Otonality 5"
    ],
    partch_o6: [
      [ 0, 9, 16, 22, 28, 33 ], 43, "partch", "Partch Otonality 6"
    ],
    partch_u1: [
      [ 0, 9, 18, 23, 29, 35 ], 43, "partch", "Partch Utonality 1"
    ],
    partch_u2: [
      [ 0, 8, 16, 25, 30, 36 ], 43, "partch", "Partch Utonality 2"
    ],
    partch_u3: [
      [ 0, 7, 14, 22, 31, 37 ], 43, "partch", "Partch Utonality 3"
    ],
    partch_u4: [
      [ 0, 6, 13, 20, 28, 38 ], 43, "partch", "Partch Utonality 4"
    ],
    partch_u5: [
      [ 0, 5, 12, 18, 25, 33 ], 43, "partch", "Partch Utonality 5"
    ],
    partch_u6: [
      [ 0, 10, 15, 21, 27, 34 ], 43, "partch", "Partch Utonality 6"
    ],
    hexMajor7: [
      [ 0, 2, 4, 7, 9, 11 ], 12, 0, "Hex Major 7"
    ],
    hexDorian: [
      [ 0, 2, 3, 5, 7, 10 ], 12, 0, "Hex Dorian"
    ],
    hexPhrygian: [
      [ 0, 1, 3, 5, 8, 10 ], 12, 0, "Hex Phrygian"
    ],
    hexSus: [
      [ 0, 2, 5, 7, 9, 10 ], 12, 0, "Hex Sus"
    ],
    hexMajor6: [
      [ 0, 2, 4, 5, 7, 9 ], 12, 0, "Hex Major 6"
    ],
    hexAeolian: [
      [ 0, 3, 5, 7, 8, 10 ], 12, 0, "Hex Aeolian"
    ],
    ionian: [
      [ 0, 2, 4, 5, 7, 9, 11 ], 12, 0, "Ionian"
    ],
    dorian: [
      [ 0, 2, 3, 5, 7, 9, 10 ], 12, 0, "Dorian"
    ],
    phrygian: [
      [ 0, 1, 3, 5, 7, 8, 10 ], 12, 0, "Phrygian"
    ],
    lydian: [
      [ 0, 2, 4, 6, 7, 9, 11 ], 12, 0, "Lydian"
    ],
    mixolydian: [
      [ 0, 2, 4, 5, 7, 9, 10 ], 12, 0, "Mixolydian"
    ],
    aeolian: [
      [ 0, 2, 3, 5, 7, 8, 10 ], 12, 0, "Aeolian"
    ],
    locrian: [
      [ 0, 1, 3, 5, 6, 8, 10 ], 12, 0, "Locrian"
    ],
    harmonicMinor: [
      [ 0, 2, 3, 5, 7, 8, 11 ], 12, 0, "Harmonic Minor"
    ],
    harmonicMajor: [
      [ 0, 2, 4, 5, 7, 8, 11 ], 12, 0, "Harmonic Major"
    ],
    melodicMinor: [
      [ 0, 2, 3, 5, 7, 9, 11 ], 12, 0, "Melodic Minor"
    ],
    melodicMinorDesc: [
      [ 0, 2, 3, 5, 7, 8, 10 ], 12, 0, "Melodic Minor Descending"
    ],
    melodicMajor: [
      [ 0, 2, 4, 5, 7, 8, 10 ], 12, 0, "Melodic Major"
    ],
    bartok: [
      [ 0, 2, 4, 5, 7, 8, 10 ], 12, 0, "Bartok"
    ],
    hindu: [
      [ 0, 2, 4, 5, 7, 8, 10 ], 12, 0, "Hindu"
    ],
    todi: [
      [ 0, 1, 3, 6, 7, 8, 11 ], 12, 0, "Todi"
    ],
    purvi: [
      [ 0, 1, 4, 6, 7, 8, 11 ], 12, 0, "Purvi"
    ],
    marva: [
      [ 0, 1, 4, 6, 7, 9, 11 ], 12, 0, "Marva"
    ],
    bhairav: [
      [ 0, 1, 4, 5, 7, 8, 11 ], 12, 0, "Bhairav"
    ],
    ahirbhairav: [
      [ 0, 1, 4, 5, 7, 9, 10 ], 12, 0,"Ahirbhairav"
    ],
    superLocrian: [
      [ 0, 1, 3, 4, 6, 8, 10 ], 12, 0, "Super Locrian"
    ],
    romanianMinor: [
      [ 0, 2, 3, 6, 7, 9, 10 ], 12, 0, "Romanian Minor"
    ],
    hungarianMinor: [
      [ 0, 2, 3, 6, 7, 8, 11 ], 12, 0, "Hungarian Minor"
    ],
    neapolitanMinor: [
      [ 0, 1, 3, 5, 7, 8, 11 ], 12, 0, "Neapolitan Minor"
    ],
    enigmatic: [
      [ 0, 1, 4, 6, 8, 10, 11 ], 12, 0, "Enigmatic"
    ],
    spanish: [
      [ 0, 1, 4, 5, 7, 8, 10 ], 12, 0, "Spanish"
    ],
    leadingWhole: [
      [ 0, 2, 4, 6, 8, 10, 11 ], 12, 0, "Leading Whole Tone"
    ],
    lydianMinor: [
      [ 0, 2, 4, 6, 7, 8, 10 ], 12, 0, "Lydian Minor"
    ],
    neapolitanMajor: [
      [ 0, 1, 3, 5, 7, 9, 11 ], 12, 0, "Neapolitan Major"
    ],
    locrianMajor: [
      [ 0, 2, 4, 5, 6, 8, 10 ], 12, 0, "Locrian Major"
    ],
    diminished: [
      [ 0, 1, 3, 4, 6, 7, 9, 10 ], 12, 0, "Diminished"
    ],
    diminished2: [
      [ 0, 2, 3, 5, 6, 8, 9, 11 ], 12, 0, "Diminished 2"
    ],
    chromatic: [
      [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 ], 12, 0, "Chromatic"
    ],
    chromatic24: [
      range(23), 24, 0, "Chromatic 24"
    ],
    ajam: [
      [ 0, 4, 8, 10, 14, 18, 22 ], 24, 0, "Ajam"
    ],
    jiharkah: [
      [ 0, 4, 8, 10, 14, 18, 21 ], 24, 0, "Jiharkah"
    ],
    shawqAfza: [
      [ 0, 4, 8, 10, 14, 16, 22 ], 24, 0, "Shawq Afza"
    ],
    sikah: [
      [ 0, 3, 7, 11, 14, 17, 21 ], 24, 0, "Sikah"
    ],
    sikahDesc: [
      [ 0 , 3 , 7, 11, 13, 17, 21 ], 24, 0, "Sikah Descending"
    ],
    huzam: [
      [ 0, 3, 7, 9, 15, 17, 21 ], 24, 0, "Huzam"
    ],
    iraq: [
      [ 0, 3, 7, 10, 13, 17, 21 ], 24, 0, "Iraq"
    ],
    bastanikar: [
      [ 0, 3, 7, 10, 13, 15, 21 ], 24, 0, "Bastanikar"
    ],
    mustar: [
      [ 0, 5, 7, 11, 13, 17, 21 ], 24, 0, "Mustar"
    ],
    bayati: [
      [ 0, 3, 6, 10, 14, 16, 20 ], 24, 0, "Bayati"
    ],
    karjighar: [
      [ 0, 3, 6, 10, 12, 18, 20 ], 24, 0, "Karjighar"
    ],
    husseini: [
      [ 0, 3, 6, 10, 14, 17, 21 ], 24, 0, "Husseini"
    ],
    nahawand: [
      [ 0, 4, 6, 10, 14, 16, 22 ], 24, 0, "Nahawand"
    ],
    nahawandDesc: [
      [ 0, 4, 6, 10, 14, 16, 20 ], 24, 0, "Nahawand Descending"
    ],
    farahfaza: [
      [ 0, 4, 6, 10, 14, 16, 20 ], 24, 0, "Farahfaza"
    ],
    murassah: [
      [ 0, 4, 6, 10, 12, 18, 20 ], 24, 0, "Murassah"
    ],
    ushaqMashri: [
      [ 0, 4, 6, 10, 14, 17, 21 ], 24, 0, "Ushaq Mashri"
    ],
    rast: [
      [ 0, 4, 7, 10, 14, 18, 21 ], 24, 0, "Rast"
    ],
    rastDesc: [
      [ 0, 4, 7, 10, 14, 18, 20 ], 24, 0, "Rast Descending"
    ],
    suznak: [
      [ 0, 4, 7, 10, 14, 16, 22 ], 24, 0, "Suznak"
    ],
    nairuz: [
      [ 0, 4, 7, 10, 14, 17, 20 ], 24, 0, "Nairuz"
    ],
    yakah: [
      [ 0, 4, 7, 10, 14, 18, 21 ], 24, 0, "Yakah"
    ],
    yakahDesc: [
      [ 0, 4, 7, 10, 14, 18, 20 ], 24, 0, "Yakah Descending"
    ],
    mahur: [
      [ 0, 4, 7, 10, 14, 18, 22 ], 24, 0, "Mahur"
    ],
    hijaz: [
      [ 0, 2, 8, 10, 14, 17, 20 ], 24, 0, "Hijaz"
    ],
    hijazDesc: [
      [ 0, 2, 8, 10, 14, 16, 20 ], 24, 0, "Hijaz Descending"
    ],
    zanjaran: [
      [ 0, 2, 8, 10, 14, 16, 22 ], 24, 0, "Zanjaran"
    ],
    saba: [
      [ 0, 3, 6, 8, 12, 16, 20 ], 24, 0, "Saba"
    ],
    zamzam: [
      [ 0, 2, 6, 8, 14, 16, 20 ], 24, 0, "Zamzam"
    ],
    kurd: [
      [ 0, 2, 6, 10, 14, 16, 20 ], 24, 0, "Kurd"
    ],
    kijazKarKurd: [
      [ 0, 2, 8, 10, 14, 16, 22 ], 24, 0, "Kijaz Kar Kurd"
    ],
    nawaAthar: [
      [ 0, 4, 6, 12, 14, 16, 22 ], 24, 0, "Nawa Athar"
    ],
    nikriz: [
      [ 0, 4, 6, 12, 14, 18, 20 ], 24, 0, "Nikriz"
    ],
    atharKurd: [
      [ 0, 2, 6, 12, 14, 16, 22 ], 24, 0, "Athar Kurd"
    ]
  };
  
  cc.global.Scale = fn(function(degrees, pitchesPerOctave, tuning, name) {
    if (!Array.isArray(degrees)) {
      degrees = [0,2,4,5,7,9,11]; // ionian
    }
    if (typeof pitchesPerOctave !== "number") {
      pitchesPerOctave = guessPPO(degrees);
    }
    if (typeof tuning === "string") {
      tuning = tunings[tuning];
    }
    if (!(tuning instanceof Tuning)) {
      tuning = tunings.et12;
    }
    if (typeof name !== "string") {
      name = "Unknown Scale";
    }
    return new Scale(degrees, pitchesPerOctave, tuning, name);
  }).defaults("degrees,pitchesPerOctave,tuning,name").build();
  cc.global.Scale["new"] = cc.global.Scale;
  
  var scales = {};
  Object.keys(scaleInfo).forEach(function(key) {
    var params = scaleInfo[key];
    if (params[2]) {
      params[2] = tunings[params[2]].copy();
    } else {
      params[2] = cc.global.Tuning.et(params[1]);
    }
    scales[key] = new Scale(params[0], params[1], params[2], params[3]);
    cc.global.Scale[key] = scales[key];
  });
  
  cc.global.Scale.at = function(key, tuning) {
    var s = scales[key];
    if (s) {
      s = s.copy();
    } else {
      s = scales.major.copy();
    }
    if (tuning) {
      s.tuning(tuning);
    }
    return s;
  };
  
  cc.global.Scale.choose = fn(function(size, pitchesPerOctave) {
    if (typeof size !== "number") {
      size = 7;
    }
    if (typeof pitchesPerOctave !== "number") {
      pitchesPerOctave = 12;
    }
    var candidates = [];
    var keys = Object.keys(scales);
    var s;
    for (var i = 0, imax = keys.length; i < imax; ++i) {
      s = scales[keys[i]];
      if (s._degrees.length === size && s._pitchesPerOctave === pitchesPerOctave) {
        candidates.push(s);
      }
    }
    s = candidates[(Math.random() * candidates.length)|0];
    if (s) {
      return s.copy();
    }
    return scales.major.copy();
  }).multiCall().build();
  
  cc.global.Scale.names = function() {
    return Object.keys(scales).sort();
  };
  
  module.exports = {
    Scale : Scale,
    Tuning: Tuning
  };

});
define('cc/lang/string', function(require, exports, module) {

  var fn = require("./fn");
  var utils = require("./utils");
  var ops = require("../common/ops");
  var numericstring = require("../common/numericstring");
  var timevalue = numericstring.timevalue;
  var notevalue = numericstring.notevalue;
  var slice = [].slice;
  
  var asNumber = function(val) {
    val = +val;
    if (isNaN(val)) {
      return 0;
    }
    return val;
  };
  
  // common methods
  fn.defineProperty(String.prototype, "copy", function() {
    return this;
  });
  
  fn.defineProperty(String.prototype, "clone", fn(function() {
    return this;
  }).defaults(ops.COMMONS.clone).build());
  
  fn.defineProperty(String.prototype, "dup", fn(function(n) {
    var a = new Array(n|0);
    for (var i = 0, imax = a.length; i < imax; ++i) {
      a[i] = this;
    }
    return a;
  }).defaults(ops.COMMONS.dup).build());

  fn.defineProperty(String.prototype, "do", function() {
    throw "not implemented";
  });
  
  fn.defineProperty(String.prototype, "wait", function() {
    return this;
  });
  
  fn.defineProperty(String.prototype, "asUGenInput", function() {
    throw new Error("String can't cast to a UGen.");
  });
  
  fn.defineProperty(String.prototype, "asString", function() {
    return this;
  });
  
  // unary operator methods
  ["__plus__","__minus__"].concat(Object.keys(ops.UNARY_OPS)).forEach(function(selector) {
    fn.defineProperty(String.prototype, selector, function() {
      return asNumber(this)[selector]();
    });
  });

  // binary operator methods
  ["__sub__"].concat(Object.keys(ops.BINARY_OPS)).forEach(function(selector) {
    fn.defineProperty(String.prototype, selector, function(b) {
      return asNumber(this)[selector](b);
    });
  });
  fn.defineBinaryProperty(String.prototype, "__add__", function(b) {
    return this + b.toString();
  });
  
  var repeat = (function() {
    var _repeat = function(s, n) {
      if (n < 1) {
        return "";
      }
      if (n % 2) {
        return _repeat(s, n - 1) + s;
      }
      var half = _repeat(s, n >> 1);
      return half + half;
    };
    return function(s, b) {
      if (b === Infinity) {
        throw new RangeError();
      }
      return _repeat(s, b|0);
    };
  })();
  
  fn.defineBinaryProperty(String.prototype, "__mul__", function(b) {
    if (typeof b === "number") {
      return repeat(this, b);
    }
    return 0;
  });
  fn.defineBinaryProperty(String.prototype, "__div__", function(b) {
    if (typeof b === "number") {
      return utils.clump(this.split(""), Math.ceil(this.length/b)).map(function(items) {
        return items.join("");
      });
    }
    return 0;
  });
  fn.defineBinaryProperty(String.prototype, "__mod__", function(b) {
    if (typeof b === "number") {
      return utils.clump(this.split(""), Math.floor(b)).map(function(items) {
        return items.join("");
      });
    }
    return 0;
  });
  
  // arity operators
  Object.keys(ops.ARITY_OPS).forEach(function(selector) {
    fn.defineProperty(String.prototype, selector, fn(function() {
      var args = slice.call(arguments);
      return (0)[selector].apply(asNumber(this), args);
    }).defaults(ops.ARITY_OPS[selector]).multiCall().build());
  });

  fn.defineProperty(String.prototype, "time", function() {
    var val = timevalue(this);
    if (typeof val === "string") {
      return 0;
    }
    return val;
  });
  
  fn.defineProperty(String.prototype, "note", function() {
    var val = notevalue(this);
    if (typeof val === "string") {
      return 0;
    }
    return val;
  });
  
  module.exports = {};

});
define('cc/lang/syncblock', function(require, exports, module) {

  var cc = require("./cc");
  
  var syncblock = function(init) {
    var func = function() {
      syncblock_perform.apply(func, arguments);
      return func._result;
    };
    
    if (init && init.isSyncBlock) {
      func._segments = init._segments;
    } else if (typeof init === "function") {
      func._segments = init();
    } else {
      func._segments = [];
    }
    func._state = func._segments.length ? 1 : 2;
    func._pc = 0;
    func._paused = false;
    func._child  = null;
    func._result = undefined;
    
    func.isSyncBlock = true;
    func.clone = syncblock_clone;
    func.reset = syncblock_reset;
    func.perform = syncblock_perform;
    func.performWait      = syncblock_performWait;
    func.performWaitState = syncblock_performWaitState;
    
    return func;
  };
  
  var syncblock_clone = function() {
    return syncblock(this);
  };

  var syncblock_reset = function() {
    this._state = this._segments.length ? 1 : 2;
    this._pc = 0;
    this._paused = false;
    this._child  = null;
    this._result = undefined;
  };
  
  var syncblock_perform = function() {
    var segments = this._segments;
    var pc = this._pc, pcmax = segments.length;
    var result;
    
    if (this._state === 2) {
      return;
    }
    
    if (this._child) {
      this.perform.apply(this._child, arguments);
      if (this._child._state === 1) {
        return;
      }
      this._child = null;
    }
    
    cc.currentSyncBlock = this;
    this._paused = false;
    while (pc < pcmax) {
      result = segments[pc++].apply(null, arguments);
      if (this._paused) {
        break;
      }
      if (result && result.isSyncBlock) {
        this._child = result;
        break;
      }
    }
    if (pcmax <= pc && !(this._paused)) {
      this._state  = 2;
      this._result = result;
    }
    this._paused = false;
    cc.currentSyncBlock = null;
    this._pc = pc;
  };
  
  var syncblock_performWait = function() {
    return this._state === 1;
  };
  var syncblock_performWaitState = function() {
    return this._state === 1;
  };
  
  cc.global.syncblock = function(init) {
    return syncblock(init);
  };
  cc.instanceOfSyncBlock = function(obj) {
    return obj && !!obj.isSyncBlock;
  };
  cc.pauseSyncBlock = function() {
    if (cc.currentSyncBlock) {
      cc.currentSyncBlock._paused = true;
    }
  };
  
  module.exports = {};

});
define('cc/lang/synthdef', function(require, exports, module) {

  var cc = require("./cc");
  var utils  = require("./utils");
  var extend = require("../common/extend");
  var push = [].push;
  
  var defId = 0;
  
  var SynthDef = (function() {
    function SynthDef(name) {
      this.klassName = "SynthDef";
      this.name = name;
      this._sent = false;
      this._defId = defId++;
      this._children = [];
      this._args = [];
      this.specs = {};
    }
    extend(SynthDef, cc.Object);
    
    SynthDef.prototype.send = function() {
      if (!this._sent) {
        cc.lang.pushToTimeline([
          "/s_def", this._defId, this.specs
        ]);
        this._sent = true;
      }
      return this;
    };
    
    SynthDef.prototype.add = SynthDef.prototype.send;
    
    SynthDef.prototype.play = function() {
      this.send();
      
      var list = getSynthDefPlayArguments.apply(null, arguments);
      var target = list[0];
      var args   = list[1];
      var addAction = list[2];
      switch (addAction) {
      case "addToHead":
        return cc.global.Synth(this, args, target, 0);
      case "addToTail":
        return cc.global.Synth(this, args, target, 1);
      case "addBefore":
        return cc.global.Synth(this, args, target, 2);
      case "addAfter":
        return cc.global.Synth(this, args, target, 3);
      default:
        return cc.global.Synth(this, args, target, 0);
      }
    };
    
    return SynthDef;
  })();
  
  var getSynthDefPlayArguments = function() {
    var target, args, addAction;
    var i = 0;
    if (cc.instanceOfNode(arguments[i])) {
      target = arguments[i++];
    } else {
      target = cc.lang.rootNode;
    }
    if (utils.isDict(arguments[i])) {
      args = arguments[i++];
    }
    if (typeof arguments[i] === "string") {
      addAction = arguments[i];
    } else {
      addAction = "addToHead";
    }
    if (args && arguments.length === 1) {
      if (cc.instanceOfNode(args.target)) {
        target = args.target;
        delete args.target;
      }
      if (typeof args.addAction === "string") {
        addAction = args.addAction;
        delete args.addAction;
      }
    }
    return [target, args, addAction];
  };
  
  var build = function(that, func, args, rates, prependArgs, variants) {
    try {
      initBuild(that);
      buildUGenGraph(that, func, args, rates, prependArgs);
      finishBuild(that, variants);
      that.func = func;
    } finally {
      cc.setSynthDef(null);
    }
  };
  
  var initBuild = function(that) {
    var children = that._children = [];
    cc.setSynthDef(function(ugen) {
      children.push(ugen);
    });
    that._args = [];
  };
  var buildUGenGraph = function(that, func, args, rates, prependArgs) {
    var controls = args2controls(args, rates, prependArgs.length);
    push.apply(that._args, controls);
    args = prependArgs.concat(controls2args(controls));
    return func.apply(null, args);
  };
  var finishBuild = function(that) {
    cc.setSynthDef(null);
    that.specs = asJSON(that.name, that._args, that._children);
  };
  
  var asNumber = function(val) {
    if (val === "Infinity") {
      return Infinity;
    } else if (val === "-Infinity") {
      return -Infinity;
    }
    return JSON.parse(val);
  };
  
  var args2controls = function(args, rates, skipArgs) {
    if (args.length === 0) {
      return [];
    }
    var keyValues = args2keyValues(args);
    var keys = keyValues.keys.slice(skipArgs);
    var vals = keyValues.vals.slice(skipArgs).map(asNumber);
    
    checkValidArgs(vals);
    
    return keyValueRates2args(keys, vals, rates);
  };
  
  var args2keyValues = function(args) {
    var keys = [], vals = [];
    if (args && args.length) {
      for (var i = 0, imax = args.length; i < imax; i += 2) {
        keys.push(args[i+0]);
        vals.push(args[i+1]);
      }
    }
    return { keys:keys, vals:vals };
  };
  
  var checkNumber = function(val) {
    return typeof val === "number" && !isNaN(val);
  };
  
  var checkValidArgs = function(vals) {
    for (var i = 0, imax = vals.length; i < imax; ++i) {
      var val = vals[i];
      if (val === null || val === undefined) {
        continue;
      }
      if (checkNumber(val) || (Array.isArray(val) && val.every(checkNumber))) {
        continue;
      }
      throw "bad arguments:" + utils.asString(val);
    }
    return true;
  };
  
  var IR = 0, TR = 1, KR = 2, AR = 3;
  
  var keyValueRates2args = function(keys, vals, rates) {
    var args = [];
    for (var i = 0, imax = keys.length; i < imax; ++i) {
      var key   = keys[i];
      var value = vals[i];
      var rate  = rates[i];
      var keyAt01 = key.substr(0, 2);
      args[i] = { index:i, name:key, value:value, lag:0 };
      if (rate === "ir" || keyAt01 === "i_") {
        args[i].type = IR;
      } else if (rate === "tr" || key === "trig" || keyAt01 === "t_") {
        args[i].type = TR;
      } else if (rate === "ar" || keyAt01 === "a_") {
        args[i].type = AR;
      } else {
        rate = utils.asNumber(rate);
        args[i].type = KR;
        args[i].lag  = rate;
      }
    }
    return args;
  };

  var getValue = function(items) {
    return items.value;
  };
  
  var controls2args = function(controls) {
    var args = new Array(controls.length);
    var values, lags, lagFlag, controlUGens;
    var controlNames = [];
    var irControlNames = controlNames[IR] = [];
    var trControlNames = controlNames[TR] = [];
    var arControlNames = controlNames[AR] = [];
    var krControlNames = controlNames[KR] = [];
    controls.forEach(function(cn) {
      controlNames[cn.type].push(cn);
    });
    var setToArgs = function(cn, index) {
      args[cn.index] = controlUGens[index];
    };
    if (irControlNames.length) {
      values = irControlNames.map(getValue);
      controlUGens = cc.createControl(0).init(utils.flatten(values));
      controlUGens = reshape(values, utils.asArray(controlUGens));
      irControlNames.forEach(setToArgs);
    }
    if (trControlNames.length) {
      values = trControlNames.map(getValue);
      controlUGens = cc.createTrigControl().init(utils.flatten(values));
      controlUGens = reshape(values, utils.asArray(controlUGens));
      trControlNames.forEach(setToArgs);
    }
    if (arControlNames.length) {
      values = arControlNames.map(getValue);
      controlUGens = cc.createAudioControl().init(utils.flatten(values));
      controlUGens = reshape(values, utils.asArray(controlUGens));
      arControlNames.forEach(setToArgs);
    }
    if (krControlNames.length) {
      values = []; lags = []; lagFlag = false;
      krControlNames.forEach(function(cn) {
        values.push(cn.value);
        utils.asArray(cn.value).forEach(function() { lags.push(cn.lag); });
        if (cn.lag !== 0) { lagFlag = true; }
      });
      if (lagFlag) {
        controlUGens = cc.createLagControl().init(utils.flatten(values), lags);
      } else {
        controlUGens = cc.createControl(1).init(utils.flatten(values));
      }
      controlUGens = reshape(values, utils.asArray(controlUGens));
      krControlNames.forEach(setToArgs);
    }
    return args;
  };
  
  var reshape = function(shape, flatten) {
    var result = [];
    var saved = flatten.slice();
    for (var i = 0, imax = shape.length; i < imax; ++i) {
      if (Array.isArray(shape[i])) {
        result.push(saved.splice(0, shape[i].length));
      } else {
        result.push(saved.shift());
      }
    }
    return result;
  };

  var sort = function(a, b) {
    return (a.type - b.type) || (a.index - b.index);
  };

  var filterUGen = function(ugen) {
    return !(typeof ugen === "number" || cc.instanceOfOutputProxy(ugen));
  };
  
  var getRate = function(ugen) {
    return ugen.rate;
  };
  
  var asJSON = function(name, args, children) {
    var sortedArgs = args.slice().sort(sort);
    
    var param = {};
    var sortedIndex = 0;
    var values  = param.values  = [];
    var names   = param.names   = [];
    var indices = param.indices = [];
    var length  = param.length  = [];
    sortedArgs.forEach(function(cn) {
      cn.sortedIndex = sortedIndex;
      if (Array.isArray(cn.value)) {
        push.apply(values, cn.value);
        cn.length = cn.value.length;
      } else {
        values.push(cn.value);
        cn.length = 1;
      }
      sortedIndex += cn.length;
    });
    args.forEach(function(cn) {
      names  .push(cn.name);
      indices.push(cn.sortedIndex);
      length .push(cn.length);
    });
    var consts = [];
    children.forEach(function(ugen) {
      ugen.inputs.forEach(function(x) {
        if (typeof x === "number" && consts.indexOf(x) === -1) {
          consts.push(x);
        }
      });
    });
    consts.sort();

    var specialIndex = 0;
    children.forEach(function(ugen) {
      if (cc.instanceOfControlUGen(ugen)) {
        ugen.specialIndex = specialIndex;
        specialIndex += ugen.channels.length;
      }
    });
    
    var ugenList = topoSort(children).filter(filterUGen);
    
    var defList = ugenList.map(function(ugen) {
      var inputs = [];
      ugen.inputs.forEach(function(x) {
        var index = ugenList.indexOf(cc.instanceOfOutputProxy(x) ? x.inputs[0] : x);
        var subindex = (index !== -1) ? x.outputIndex : consts.indexOf(x);
        inputs.push(index, subindex);
      });
      var outputs = [];
      if (ugen.channels) {
        outputs = ugen.channels.map(getRate);
      } else if (ugen.numOfOutputs === 1) {
        outputs = [ ugen.rate ];
      }
      return [ ugen.klassName, ugen.rate, ugen.specialIndex|0, inputs, outputs ];
    });
    return { name:name, consts:consts, params:param, defList:defList, variants:{} };
  };
  
  var topoSort = (function() {
    var _topoSort = function(x, list, checked, stack) {
      if (stack.indexOf(x) !== stack.length-1) {
        throw new Error("UGen graph contains recursion.");
      }
      checked.push(x);
      var index = list.indexOf(x);
      if (index !== -1) {
        list.splice(index, 1);
      }
      list.unshift(x);
      if (x.inputs) {
        x.inputs.forEach(function(x) {
          stack.push(x);
          _topoSort(x, list, checked, stack);
          stack.pop();
        });
      }
    };
    return function(list) {
      var checked = [];
      var stack;
      list.slice().forEach(function(x) {
        if (cc.instanceOfOut(x)) {
          checked.push(x);
          stack = [x];
          x.inputs.forEach(function(x) {
            stack.push(x);
            _topoSort(x, list, checked, stack);
            stack.pop();
          });
        }
      });
      list = list.filter(function(x) {
        return checked.indexOf(x) !== -1;
      });
      return list;
    };
  })();
  
  cc.global.SynthDef = function() {
    var name, func, args, rates, prependArgs, variants;
    var i = 0;
    if (typeof arguments[i] === "string") {
      name = arguments[i++];
    } else {
      name = "synth";
    }
    if (typeof arguments[i] !== "function") {
      throw new Error("SynthDef requires build function");
    }
    func = arguments[i++];
    
    args        = utils.asArray(arguments[i++]);
    rates       = utils.asArray(arguments[i++]);
    prependArgs = utils.asArray(arguments[i++]);
    variants    = {};
    
    var instance = new SynthDef(name, func, args, rates, prependArgs, variants);
    build(instance, func, args, rates, prependArgs, variants);
    return instance;
  };
  cc.global.SynthDef["new"] = cc.global.SynthDef;
  
  cc.instanceOfSynthDef = function(obj) {
    return obj instanceof SynthDef;
  };
  
  module.exports = {
    SynthDef: SynthDef,
    
    build: build,
    
    initBuild     : initBuild,
    buildUGenGraph: buildUGenGraph,
    finishBuild   : finishBuild,
    
    args2keyValues    : args2keyValues,
    args2controls     : args2controls,
    checkValidArgs    : checkValidArgs,
    keyValueRates2args: keyValueRates2args,
    
    controls2args: controls2args,
    
    asJSON: asJSON,
    
    reshape : reshape,
    topoSort: topoSort
  };

});
define('cc/lang/task', function(require, exports, module) {

  var cc = require("./cc");
  var extend = require("../common/extend");
  
  var valueOf = function(obj) {
    if (obj === null || obj === undefined) {
      return null;
    }
    return obj.valueOf();
  };
  
  var TaskManager = (function() {
    function TaskManager() {
      this.klassName = "TaskManager";
      this.tasks = [];
      this.counterIncr = 0;
    }
    
    TaskManager.prototype.start = function(counterIncr) {
      this.counterIncr = Math.max(1, counterIncr);
    };
    
    TaskManager.prototype.stop = function() {
      this.counterIncr = 0;
    };
    
    TaskManager.prototype.reset = function() {
      this.tasks.splice(0);
    };
    
    TaskManager.prototype.append = function(task) {
      var index = this.tasks.indexOf(task);
      if (index === -1) {
        this.tasks.push(task);
      }
    };
    
    TaskManager.prototype.remove = function(task) {
      var index = this.tasks.indexOf(task);
      if (index !== -1) {
        this.tasks.splice(index, 1);
      }
    };
    
    TaskManager.prototype.process = function() {
      var counterIncr = this.counterIncr;
      if (counterIncr) {
        var tasks = this.tasks;
        for (var i = 0; i < tasks.length; ++i) {
          tasks[i].performWait(counterIncr);
        }
        this.tasks = tasks.filter(function(task) {
          return task._state === 1;
        });
      }
    };
    
    return TaskManager;
  })();
  
  var Task = (function() {
    function Task(func, iter) {
      this.klassName = "Task";
      if (cc.instanceOfSyncBlock(func)) {
        this._func = func;
        this._state = 0;
      } else {
        this._func = null;
        this._state = 2;
      }
      this._iter = iter;
      this._wait = null;
      this._args = valueOf(iter);
      this._remain = 0; // number
    }
    extend(Task, cc.Object);
    
    Task.prototype.start = function() {
      this.reset();
      if (cc.taskManager) {
        cc.taskManager.append(this);
      }
      this._state = 1;
      return this;
    };
    
    Task.prototype.resume = function() {
      if (cc.taskManager) {
        cc.taskManager.append(this);
      }
      this._state = 1;
      return this;
    };
    
    Task.prototype.pause = function() {
      if (cc.taskManager) {
        cc.taskManager.remove(this);
      }
      this._state = 0;
      return this;
    };
    
    Task.prototype.stop = function() {
      if (cc.taskManager) {
        cc.taskManager.remove(this);
      }
      this._state = 0;
      return this;
    };
    
    Task.prototype.reset = function() {
      if (this._func) {
        this._func.reset();
        this._state = 0;
      } else {
        this._state = 2;
      }
      if (this._iter) {
        this._iter.reset();
      }
      this._wait = null;
      this._args = valueOf(this._iter);
      return this;
    };
    
    Task.prototype.wait = function() {
      if (cc.currentTask && cc.currentTask !== this) {
        cc.currentTask.__wait__(this);
      }
      return this;
    };
    
    Task.prototype.__sync__ = function(func, args) {
      return this.__wait__(new Task(func, args));
    };
    
    Task.prototype.__wait__ = function(task) {
      if (this._wait) {
        throw new Error("Task#append: wait already exists???");
      }
      if (typeof task === "number") {
        task += this._remain;
      }
      this._remain = 0;
      this._wait = cc.createTaskWaitToken(task);
      if (task instanceof Task) {
        task._state = 1;
      }
      cc.pauseSyncBlock();
      return this;
    };
    
    Task.prototype.performWait = function(counterIncr) {
      var _currentSyncBlockHandler = cc.currentSyncBlockHandler;
      var _currentTask             = cc.currentTask;
      var func = this._func;
      var iter = this._iter;
      
      cc.currentSyncBlockHandler = this;
      cc.currentTask             = this;
      
      while (true) {
        if (this._wait) {
          if (this._wait.performWait(counterIncr)) {
            break;
          }
          this._remain = this._wait.remain || 0;
          this._wait = null;
        }
        counterIncr = 0;
        
        func.perform.apply(func, this._args);
        
        if (this._wait) {
          continue;
        }
        
        if (func.performWaitState()) {
          continue;
        }
        
        if (iter) {
          this._args = iter.next();
          if (iter.performWaitState()) {
            func.reset();
            continue;
          }
        }
        this._state = 2;
        break;
      }
      
      cc.currentSyncBlockHandler = _currentSyncBlockHandler;
      cc.currentTask             = _currentTask;
      
      return this._state === 1;
    };
    
    Task.prototype.performWaitState = function() {
      return this._state === 1;
    };
    
    return Task;
  })();
  
  var TaskArguments = (function() {
    function TaskArguments() {
      this.klassName = "TaskArguments";
      this._args = [ 0, 0 ];
      this._state = 1;
    }
    
    TaskArguments.prototype.next = function() {
      if (this._state === 2) {
        return null;
      }
      this._state = 2;
      return this._args;
    };
    
    TaskArguments.prototype.reset = function() {
      this._state = 1;
      return this;
    };
    
    TaskArguments.prototype.valueOf = function() {
      return this._args;
    };
    
    TaskArguments.prototype.performWait = function() {
      return this._state === 1;
    };
    
    TaskArguments.prototype.performWaitState = function() {
      return this._state === 1;
    };
    
    return TaskArguments;
  })();

  var TaskArgumentsNumber = (function() {
    function TaskArgumentsNumber(start, end, step) {
      TaskArguments.call(this);
      this.klassName = "TaskArgumentsNumber";
      this.start = start;
      this.end   = end;
      this.step  = step;
      this.index = 0;
      this.reset();
    }
    extend(TaskArgumentsNumber, TaskArguments);
    
    TaskArgumentsNumber.prototype.next = function() {
      if (this._state === 2) {
        return null;
      }
      var value = this._args[0] + this.step;
      if (this.step >= 0) {
        if (value <= this.end) {
          this._args[0] = value;
          this._args[1] = ++this.index;
        } else {
          this._state = 2;
        }
      } else {
        if (value >= this.end) {
          this._args[0] = value;
          this._args[1] = ++this.index;
        } else {
          this._state = 2;
        }
      }
      return this._state === 2 ? null : this._args;
    };
    
    TaskArguments.prototype.reset = function() {
      this.index = 0;
      this._args  = [ this.start, this.index ];
      this._state = 1;
      return this;
    };
    
    return TaskArgumentsNumber;
  })();
  
  var TaskArgumentsArray = (function() {
    function TaskArgumentsArray(list, reversed) {
      TaskArguments.call(this);
      this.klassName = "TaskArgumentsArray";
      this.list     = list;
      this.reversed = reversed;
      this.reset();
    }
    extend(TaskArgumentsArray, TaskArguments);
    
    TaskArgumentsArray.prototype.next = function() {
      if (this._state === 2) {
        return null;
      }
      if (this.reversed) {
        this.index -= 1;
        if (0 <= this.index) {
          this._args = [ this.list[this.index], this.index ];
        } else {
          this._state = 2;
        }
      } else {
        this.index += 1;
        if (this.index < this.list.length) {
          this._args = [ this.list[this.index], this.index ];
        } else {
          this._state = 2;
        }
      }
      return this._state === 2 ? null : this._args;
    };
    
    TaskArgumentsArray.prototype.reset = function() {
      this.index = this.reversed ? Math.max(0, this.list.length - 1) : 0;
      this._args = [ this.list[this.index], this.index ];
      this._state = 1;
      return this;
    };
    
    return TaskArgumentsArray;
  })();

  var TaskArgumentsFunction = (function() {
    function TaskArgumentsFunction(func) {
      TaskArguments.call(this);
      this.klassName = "TaskArgumentsFunction";
      this.func  = func;
      this.index = 0;
      this.reset();
    }
    extend(TaskArgumentsFunction, TaskArguments);
    
    TaskArgumentsFunction.prototype.next = function() {
      if (this._state === 2) {
        return null;
      }
      var value = this.func();
      if (!!value || value === 0) {
        this._args[0] = value;
        this._args[1] = ++this.index;
      } else {
        this._state = 2;
      }
      return this._state === 2 ? null : this._args;
    };
    
    TaskArgumentsFunction.prototype.reset = function() {
      this._state = 1;
      this.uninitialized = true;
      return this;
    };
    
    TaskArgumentsFunction.prototype.valueOf = function() {
      this.index = 0;
      if (this.uninitialized) {
        this.uninitialized = false;
        this._args = [ this.func(), this.index ];
      }
      return this._args;
    };
    
    return TaskArgumentsFunction;
  })();
  
  var TaskArgumentsPattern = (function() {
    function TaskArgumentsPattern(pattern) {
      TaskArguments.call(this);
      this.klassName = "TaskArgumentsPattern";
      this.pattern   = pattern;
      this.reset();
    }
    extend(TaskArgumentsPattern, TaskArguments);
    
    TaskArgumentsPattern.prototype.next = function() {
      if (this._state === 2) {
        return null;
      }
      var val = this.pattern.next();
      if (val !== null && val !== undefined) {
        this._args = [ val, this.index++ ];
      } else {
        this._state = 2;
      }
      return this._state === 2 ? null : this._args;
    };
    
    TaskArgumentsPattern.prototype.reset = function() {
      this.index = 0;
      this._args = [ this.pattern.reset().next(), this.index++ ];
      this._state = 1;
      return this;
    };
    
    return TaskArgumentsPattern;
  })();
  
  var TaskWaitToken = (function() {
    function TaskWaitToken() {
      this.klassName = "TaskWaitToken";
      this._state = 1;
    }
    
    TaskWaitToken.prototype.performWait = function() {
      return this._state === 1;
    };
    
    TaskWaitToken.prototype.performWaitState = function() {
      return this._state === 1;
    };
    
    return TaskWaitToken;
  })();

  var TaskWaitTokenNumber = (function() {
    function TaskWaitTokenNumber(token) {
      TaskWaitToken.call(this);
      this.klassName = "TaskWaitTokenNumber";
      this.token = token * 1000;
    }
    extend(TaskWaitTokenNumber, TaskWaitToken);

    TaskWaitTokenNumber.prototype.performWait = function(counterIncr) {
      if (this._state === 1) {
        this.token -= counterIncr;
        if (this.token <= 0) {
          this._state = 2;
          this.remain = this.token * 0.001;
        }
      }
      return this._state === 1;
    };
    
    return TaskWaitTokenNumber;
  })();
  
  var TaskWaitTokenLogicAND = (function() {
    function TaskWaitTokenLogicAND(token) {
      TaskWaitToken.call(this);
      this.klassName = "TaskWaitTokenLogicAND";
      this.token = token.map(cc.createTaskWaitToken);
    }
    extend(TaskWaitTokenLogicAND, TaskWaitToken);
    
    TaskWaitTokenLogicAND.prototype.performWait = function(counterIncr) {
      if (this._state === 1) {
        this.token = this.token.filter(function(token) {
          return token.performWait(counterIncr);
        });
        if (this.token.length === 0) {
          this._state = 2;
        }
      }
      return this._state === 1;
    };
    
    return TaskWaitTokenLogicAND;
  })();
  
  var TaskWaitTokenLogicOR = (function() {
    function TaskWaitTokenLogicOR(token) {
      TaskWaitToken.call(this);
      this.klassName = "TaskWaitTokenLogicOR";
      this.token = token.map(cc.createTaskWaitToken);
    }
    extend(TaskWaitTokenLogicOR, TaskWaitToken);
    
    TaskWaitTokenLogicOR.prototype.performWait = function(counterIncr) {
      if (this._state === 1) {
        var list = this.token;
        for (var i = 0, imax = list.length; i < imax; ++i) {
          if (!list[i].performWait(counterIncr)) {
            this._state = 2;
            this.token.splice(0);
            break;
          }
        }
      }
      return this._state === 1;
    };
    
    return TaskWaitTokenLogicOR;
  })();
  
  var TaskWaitTokenFunction = (function() {
    function TaskWaitTokenFunction(token) {
      TaskWaitToken.call(this);
      this.klassName = "TaskWaitTokenFunction";
      this.token = token;
    }
    extend(TaskWaitTokenFunction, TaskWaitToken);
    
    TaskWaitTokenFunction.prototype.performWait = function() {
      if (this._state === 1) {
        var finished = this.token();
        if (finished) {
          this._state = 2;
        }
      }
      return this._state === 1;
    };
    
    return TaskWaitTokenFunction;
  })();

  var TaskWaitTokenBoolean = (function() {
    function TaskWaitTokenBoolean(token) {
      TaskWaitToken.call(this);
      this.klassName = "TaskWaitTokenBoolean";
      this.token = token;
      this._state = token ? 1 : 2;
    }
    extend(TaskWaitTokenBoolean, TaskWaitToken);
    
    return TaskWaitTokenBoolean;
  })();

  var TaskWaitTokenDate = (function() {
    function TaskWaitTokenDate(token) {
      TaskWaitToken.call(this);
      this.klassName = "TaskWaitTokenDate";
      this.token = +token;
    }
    extend(TaskWaitTokenDate, TaskWaitToken);
    
    TaskWaitTokenDate.prototype.performWait = function() {
      if (this._state === 1) {
        if (Date.now() > this.token) {
          this._state = 2;
        }
      }
      return this._state === 1;
    };
    
    return TaskWaitTokenDate;
  })();
  
  cc.global.Task = function(func) {
    return new Task(func);
  };
  
  cc.createTaskManager = function() {
    cc.taskManager = new TaskManager();
    return cc.taskManager;
  };
  cc.instanceOfTaskManager = function(obj) {
    return obj instanceof TaskManager;
  };
  cc.createTask = function(func, iter) {
    return new Task(func, iter);
  };
  cc.instanceOfTask = function(obj) {
    return obj instanceof Task;
  };
  cc.instanceOfTaskArguments = function(obj) {
    return obj instanceof TaskArguments;
  };
  cc.createTaskArgumentsNumber = function(start, end, step) {
    return new TaskArgumentsNumber(start, end, step);
  };
  cc.createTaskArgumentsArray = function(list, reversed) {
    return new TaskArgumentsArray(list, !!reversed);
  };
  cc.createTaskArgumentsFunction = function(func) {
    return new TaskArgumentsFunction(func);
  };
  cc.createTaskArgumentsBoolean = function(flag) {
    return new TaskArgumentsArray([flag]);
  };
  cc.createTaskArgumentsPattern = function(p) {
    return new TaskArgumentsPattern(p);
  };
  cc.createTaskWaitToken = function(token, logic) {
    if (token && typeof token.performWait === "function") {
      return token;
    }
    switch (typeof token) {
    case "number"  : return new TaskWaitTokenNumber(token);
    case "function": return new TaskWaitTokenFunction(token);
    case "boolean" : return new TaskWaitTokenBoolean(token);
    }
    if (Array.isArray(token)) {
      return cc.createTaskWaitTokenArray(token, logic);
    }
    if (token instanceof Date) {
      return new TaskWaitTokenDate(token);
    }
    return new TaskWaitTokenBoolean(false);
  };
  cc.instanceOfTaskWaitToken = function(obj) {
    return obj instanceof TaskWaitToken;
  };
  cc.createTaskWaitTokenNumber = function(token) {
    return new TaskWaitTokenNumber(token);
  };
  cc.createTaskWaitTokenArray = function(token, logic) {
    if (logic === "or") {
      return new TaskWaitTokenLogicOR(token);
    } else {
      return new TaskWaitTokenLogicAND(token);
    }
  };
  cc.createTaskWaitTokenFunction = function(token) {
    return new TaskWaitTokenFunction(token);
  };
  cc.createTaskWaitTokenBoolean = function(token) {
    return new TaskWaitTokenBoolean(token);
  };
  cc.createTaskWaitTokenDate = function(token) {
    return new TaskWaitTokenDate(token);
  };
  
  module.exports = {
    TaskManager : TaskManager,
    Task        : Task,
    TaskArguments        : TaskArguments,
    TaskArgumentsNumber  : TaskArgumentsNumber,
    TaskArgumentsArray   : TaskArgumentsArray,
    TaskArgumentsFunction: TaskArgumentsFunction,
    TaskWaitToken        : TaskWaitToken,
    TaskWaitTokenNumber  : TaskWaitTokenNumber,
    TaskWaitTokenLogicAND: TaskWaitTokenLogicAND,
    TaskWaitTokenLogicOR : TaskWaitTokenLogicOR,
    TaskWaitTokenFunction: TaskWaitTokenFunction,
    TaskWaitTokenBoolean : TaskWaitTokenBoolean,
    TaskWaitTokenDate    : TaskWaitTokenDate
  };

});
define('cc/lang/ugen', function(require, exports, module) {
  
  var cc = require("./cc");
  var fn = require("./fn");
  var utils  = require("./utils");
  var extend = require("../common/extend");
  var ops    = require("../common/ops");
  var slice  = [].slice;
  
  var addToSynthDef = null;
  var newKlassOpts  = {}; // TODO: ...
  
  var newArgsWithIndex = function(index) {
    return function(item) {
      if (Array.isArray(item)) {
        return item[index % item.length];
      }
      return item;
    };
  };
  var rate2str = function(rate) {
    return ["scalar","control","audio","demand"][rate] || "scalar";
  };
  
  cc.ugen.checkNInputs = function(n) {
    if (this.rate === 2) {
      for (var i = 0; i < n; ++i) {
        if (this.inputs[i].rate !== 2) {
          var str = utils.asString(this.inputs[i]) + " " + rate2str(this.inputs[i].rate);
          throw new Error("input[" + i + "] is not AUDIO rate: " + str);
        }
      }
    }
  };
  cc.ugen.checkSameRateAsFirstInput = function() {
    if (this.rate !== this.inputs[0].rate) {
      var str = utils.asString(this.inputs[0]) + " " + rate2str(this.inputs[0].rate);
      throw new Error("first input is not " + rate2str(this.rate) + " rate: " + str);
    }
  };
  
  var UGen = (function() {
    function UGen(name, opts) {
      opts = opts || {};
      this.klassName = name;
      this.rate = 2;
      this.signalRange = opts.signalRange || 2;
      this.specialIndex = 0;
      this.outputIndex  = 0;
      this.numOfInputs  = 0;
      this.numOfOutputs = 1;
      this.inputs = [];
    }
    extend(UGen, cc.Object);
    
    UGen.multiNew = function() {
      return this.multiNewList(slice.call(arguments));
    };
    
    UGen.multiNewList = function(args) {
      var Klass = this;
      var size = 0, i, imax;
      args = utils.asUGenInput(args);
      for (i = 0, imax = args.length; i < imax; ++i) {
        if (Array.isArray(args[i]) && size < args[i].length) {
          size = args[i].length;
        }
      }
      if (size === 0) {
        return UGen.prototype.init.apply(new Klass(newKlassOpts.name, newKlassOpts), args);
      }
      var results = new Array(size);
      for (i = 0; i < size; ++i) {
        results[i] = this.multiNewList(args.map(newArgsWithIndex(i)));
      }
      return results;
    };
    
    UGen.prototype.init = function(rate) {
      this.rate = rate;
      if (addToSynthDef) {
        addToSynthDef(this);
      }
      this.inputs = slice.call(arguments, 1);
      this.numOfInputs = this.inputs.length;
      return this;
    };
    
    // common methods
    UGen.prototype.copy = function() {
      return this;
    };
    
    UGen.prototype.clone = fn(function() {
      return this;
    }).defaults(ops.COMMONS.clone).build();
    
    UGen.prototype.dup = fn(function(n) {
      var a = new Array(n|0);
      for (var i = 0, imax = a.length; i < imax; ++i) {
        a[i] = this;
      }
      return a;
    }).defaults(ops.COMMONS.dup).build();
    
    UGen.prototype["do"] = function() {
      return this;
    };
    
    UGen.prototype.wait = function() {
      return this;
    };
    
    UGen.prototype.asUGenInput = function() {
      return this;
    };
    
    UGen.prototype.asString = function() {
      return this.klassName;
    };
    
    // unary operator methods
    ["__plus__","__minus__"].concat(Object.keys(ops.UNARY_OPS)).forEach(function(selector) {
      var ugenSelector;
      if (ops.ALIASES.hasOwnProperty(selector)) {
        ugenSelector = ops.ALIASES[selector];
      } else {
        ugenSelector = selector;
      }
      if (/^[a-z_][a-zA-Z0-9_]*$/.test(selector)) {
        UGen.prototype[selector] = function() {
          return cc.createUnaryOpUGen(ugenSelector, this);
        };
      }
    });
    
    // binay operator methods
    ["__add__","__sub__","__mul__","__div__","__mod__"].concat(Object.keys(ops.BINARY_OPS)).forEach(function(selector) {
      var ugenSelector;
      if (ops.ALIASES.hasOwnProperty(selector)) {
        ugenSelector = ops.ALIASES[selector];
      } else {
        ugenSelector = selector;
      }
      if (/^[a-z_][a-zA-Z0-9_]*$/.test(selector)) {
        fn.defineBinaryProperty(UGen.prototype, selector, function(b) {
          return cc.createBinaryOpUGen(ugenSelector, this, b);
        });
      }
    });
    
    // arity operators methods
    UGen.prototype.madd = fn(function(mul, add) {
      return cc.createMulAdd(this, mul, add);
    }).defaults(ops.ARITY_OPS.madd).build();
    
    UGen.prototype.range = fn(function(lo, hi) {
      var mul, add;
      if (this.signalRange === 2) {
        mul = (hi.__sub__(lo)).__mul__(0.5);
        add = mul.__add__(lo);
      } else {
        mul = hi.__sub__(lo);
        add = lo;
      }
      return cc.createMulAdd(this, mul, add);
    }).defaults(ops.ARITY_OPS.range).build();
    
    UGen.prototype.exprange = fn(function(lo, hi) {
      if (this.signalRange === 2) {
        return this.linexp(-1, 1, lo, hi);
      } else {
        return this.linexp( 0, 1, lo, hi);
      }
    }).defaults(ops.ARITY_OPS.exprange).multiCall().build();

    UGen.prototype.curverange = fn(function(lo, hi, curve) {
      if (this.signalRange === 2) {
        return this.lincurve(-1, 1, lo, hi, curve);
      } else {
        return this.lincurve( 0, 1, lo, hi, curve);
      }
    }).defaults(ops.ARITY_OPS.curverange).multiCall().build();
    
    UGen.prototype.unipolar = fn(function(mul) {
      return this.range(0, mul);
    }).defaults(ops.ARITY_OPS.unipolar).multiCall().build();
    
    UGen.prototype.bipolar = fn(function(mul) {
      return this.range(mul.neg(), mul);
    }).defaults(ops.ARITY_OPS.bipolar).multiCall().build();

    UGen.prototype.clip = fn(function(lo, hi) {
      return cc.global.Clip(this.rate, this, lo, hi);
    }).defaults(ops.ARITY_OPS.clip).multiCall().build();

    UGen.prototype.fold = fn(function(lo, hi) {
      return cc.global.Fold(this.rate, this, lo, hi);
    }).defaults(ops.ARITY_OPS.fold).multiCall().build();
    
    UGen.prototype.wrap = fn(function(lo, hi) {
      return cc.global.Wrap(this.rate, this, lo, hi);
    }).defaults(ops.ARITY_OPS.wrap).multiCall().build();

    UGen.prototype.blend = fn(function(that, blendFrac) {
      var pan = blendFrac.linlin(0, 1, -1, 1);
      if (this.rate === 2) {
        return cc.global.XFade2(2, this, that, pan);
      }
      if (that.rate === 2) {
        return cc.global.XFade2(2, that, this, pan.neg());
      }
      return cc.global.LinXFade2(this.rate, this, that, pan);
    }).defaults(ops.ARITY_OPS.blend).multiCall().build();
    
    UGen.prototype.lag = fn(function(t1, t2) {
      if (typeof t2 === "undefined") {
        return cc.global.Lag(this.rate, this, t1);
      }
      return cc.global.LagUD(this.rate, this, t1, t2);
    }).defaults(ops.ARITY_OPS.lag).multiCall().build();
    
    UGen.prototype.lag2 = fn(function(t1, t2) {
      if (typeof t2 === "undefined") {
        return cc.global.Lag2(this.rate, this, t1);
      }
      return cc.global.Lag2UD(this.rate, this, t1, t2);
    }).defaults(ops.ARITY_OPS.lag2).multiCall().build();
    
    UGen.prototype.lag3 = fn(function(t1, t2) {
      if (typeof t2 === "undefined") {
        return cc.global.Lag3(this.rate, this, t1);
      }
      return cc.global.Lag3UD(this.rate, this, t1, t2);
    }).defaults(ops.ARITY_OPS.lag3).multiCall().build();
    
    UGen.prototype.lagud = fn(function(lagTimeU, lagTimeD) {
      return cc.global.LagUD(this.rate, this, lagTimeU, lagTimeD);
    }).defaults(ops.ARITY_OPS.lagud).multiCall().build();
    
    UGen.prototype.lag2ud = fn(function(lagTimeU, lagTimeD) {
      return cc.global.Lag2UD(this.rate, this, lagTimeU, lagTimeD);
    }).defaults(ops.ARITY_OPS.lag2ud).multiCall().build();
    
    UGen.prototype.lag3ud = fn(function(lagTimeU, lagTimeD) {
      return cc.global.Lag3UD(this.rate, this, lagTimeU, lagTimeD);
    }).defaults(ops.ARITY_OPS.lag3ud).multiCall().build();

    UGen.prototype.varlag = fn(function(time, curvature, warp, start) {
      return cc.global.VarLag(this.rate, this, time, curvature, warp, start);
    }).defaults(ops.ARITY_OPS.varlag).multiCall().build();
    
    UGen.prototype.slew = fn(function(up, down) {
      return cc.global.Slew(this.rate, this, up, down);
    }).defaults(ops.ARITY_OPS.slew).multiCall().build();
    
    UGen.prototype.prune = function(min, max, type) {
      switch (type) {
      case "minmax":
        return this.clip(min, max);
      case "min":
        return this.max(min);
      case "max":
        return this.min(max);
      }
      return this;
    };
    
    UGen.prototype.linlin = fn(function(inMin, inMax, outMin, outMax, clip) {
      return cc.global.LinLin(
        this.rate,
        this.prune(inMin, inMax, clip),
        inMin, inMax, outMin, outMax
      );
    }).defaults(ops.ARITY_OPS.linlin).multiCall().build();
    
    UGen.prototype.linexp = fn(function(inMin, inMax, outMin, outMax, clip) {
      return cc.global.LinExp(
        this.rate,
        this.prune(inMin, inMax, clip),
        inMin, inMax, outMin, outMax
      );
    }).defaults(ops.ARITY_OPS.linexp).multiCall().build();
    
    UGen.prototype.explin = fn(function(inMin, inMax, outMin, outMax, clip) {
      return cc.global.ExpLin(
        this.rate,
        this.prune(inMin, inMax, clip),
        inMin, inMax, outMin, outMax
      );
    }).defaults(ops.ARITY_OPS.explin).multiCall().build();
    
    UGen.prototype.expexp = fn(function(inMin, inMax, outMin, outMax, clip) {
      return cc.global.ExpExp(
        this.rate,
        this.prune(inMin, inMax, clip),
        inMin, inMax, outMin, outMax
      );
    }).defaults(ops.ARITY_OPS.expexp).multiCall().build();
    
    UGen.prototype.lincurve = fn(function(inMin, inMax, outMin, outMax, curve, clip) {
      if (typeof curve === "number" && Math.abs(curve) < 0.25) {
        return this.linlin(inMin, inMax, outMin, outMax, clip);
      }
      var grow = curve.exp();
      var a = outMax.__sub__(outMin).__div__((1).__sub__(grow));
      var b = outMin.__add__(a);
      var scaled = (this.prune(inMin, inMax, clip).__sub__(inMin)).__div__(inMax.__sub__(inMin));
      return b.__sub__(a.__mul__(grow.pow(scaled)));
    }).defaults(ops.ARITY_OPS.lincurve).multiCall().build();
    
    UGen.prototype.curvelin = fn(function(inMin, inMax, outMin, outMax, curve, clip) {
      if (typeof curve === "number" && Math.abs(curve) < 0.25) {
        return this.linlin(inMin, inMax, outMin, outMax, clip);
      }
      var grow = curve.exp();
      var a = outMax.__sub__(outMin).__div__((1).__sub__(grow));
      var b = outMin.__add__(a);
      var scaled = (this.prune(inMin, inMax, clip).__sub__(inMin)).__div__(inMax.__sub__(inMin));
      return ((b.__sub__(scaled)).__div__(a)).log().__div__(curve);
    }).defaults(ops.ARITY_OPS.curvelin).multiCall().build();

    UGen.prototype.bilin = fn(function(inCenter, inMin, inMax, outCenter, outMin, outMax, clip) {
      return cc.global.Select(this.rate, this.lt(inCenter), [
        this.linlin(inCenter, inMax, outCenter, outMax, clip),
        this.linlin(inMin, inCenter, outMin, outCenter, clip)
      ]);
    }).defaults(ops.ARITY_OPS.bilin).build();
    
    UGen.prototype.rrand = fn(function() {
      return 0;
    }).defaults(ops.ARITY_OPS.rrand).build();
    
    UGen.prototype.exprand = fn(function() {
      return 0;
    }).defaults(ops.ARITY_OPS.exprand).build();
    
    return UGen;
  })();
  
  var MultiOutUGen = (function() {
    function MultiOutUGen(name) {
      UGen.call(this, name || "MultiOutUGen");
      this.channels = null;
    }
    extend(MultiOutUGen, UGen);
    
    MultiOutUGen.prototype.initOutputs = function(numChannels, rate) {
      var channels = new Array(numChannels);
      for (var i = 0; i < numChannels; ++i) {
        channels[i] = new OutputProxy(rate, this, i);
      }
      this.channels = channels;
      this.numOfOutputs = channels.length;
      return (numChannels === 1) ? channels[0] : channels;
    };
    
    return MultiOutUGen;
  })();
  
  var OutputProxy = (function() {
    function OutputProxy(rate, source, index) {
      UGen.call(this, "OutputProxy");
      this.init(rate);
      this.inputs = [ source ];
      this.numOfOutputs = 1;
      this.outputIndex  = index;
    }
    extend(OutputProxy, UGen);
    
    OutputProxy.prototype.clone = fn(function() {
      return this;
    }).defaults(ops.COMMONS.clone).build();
    
    return OutputProxy;
  })();
  
  var Out = (function() {
    function Out() {
      cc.UGen.call(this, "Out");
    }
    extend(Out, UGen);
    
    return Out;
  })();
  
  var init_instance = function(instance, opts) {
    if (Array.isArray(instance)) {
      return instance.map(function(ugen) {
        return init_instance(ugen, opts);
      });
    } else if (instance instanceof UGen) {
      if (opts.checkInputs) {
        opts.checkInputs.call(instance);
      }
      if (opts.init) {
        return opts.init.apply(instance, instance.inputs);
      }
    }
    return instance;
  };
  
  var register = function(name, spec) {
    var Klass = spec.Klass || UGen;
    var opts  = {
      checkInputs: spec.checkInputs,
      signalRange: spec.signalRange || 2,
      init: spec.init
    };
    var ugenInterface;
    if (spec.$new) {
      ugenInterface = function() {
        return cc.global[name]["new"].apply(null, slice.call(arguments));
      };
      cc.global[name] = ugenInterface;
    } else {
      ugenInterface = function(rate) {
        if (typeof rate === "number") {
          rate = ["ir", "kr", "ar"][rate];
        }
        var func = cc.global[name][rate];
        if (func) {
          return func.apply(null, slice.call(arguments, 1));
        }
        return new UGen(name);
      };
      cc.global[name] = ugenInterface;
      cc.global[name]["new"] = ugenInterface;
    }
    
    Object.keys(spec).forEach(function(key) {
      if (key.charAt(0) === "$") {
        var defaults = spec[key].defaults;
        var ctor     = spec[key].ctor;
        ugenInterface[key.substr(1)] = fn(function() {
          var args = slice.call(arguments);
          newKlassOpts.name        = name;
          newKlassOpts.signalRange = opts.signalRange;
          var instance = ctor.apply(Klass, args);
          newKlassOpts = {};
          return init_instance(instance, opts);
        }).defaults(defaults).build();
      }
    });
  };
  
  cc.createUGen = function() {
    return new UGen();
  };
  cc.instanceOfUGen = function(obj) {
    return obj instanceof UGen;
  };
  cc.instanceOfMultiOutUGen = function(obj) {
    return obj instanceof MultiOutUGen;
  };
  
  cc.createOutputProxy = function(rate, source, index) {
    return new OutputProxy(rate, source, index);
  };
  cc.instanceOfOutputProxy = function(obj) {
    return obj instanceof OutputProxy;
  };

  cc.instanceOfOut = function(obj) {
    return obj instanceof Out;
  };
  
  cc.setSynthDef = function(func) {
    if (func && addToSynthDef !== null) {
      throw new Error("nested Synth.def");
    }
    addToSynthDef = func;
  };
  
  cc.UGen          = UGen;
  cc.MultiOutUGen  = MultiOutUGen;
  cc.Out           = Out;
  cc.ugen.register = register;
  
  module.exports = {
    UGen        : UGen,
    MultiOutUGen: MultiOutUGen,
    OutputProxy : OutputProxy
  };

});
define('cc/lang/basic_ugen', function(require, exports, module) {

  var cc = require("./cc");
  var extend = require("../common/extend");
  var ops    = require("../common/ops");
  var fn     = require("./fn");
  var utils  = require("./utils");
  var asRate = utils.asRate;
  
  var Control = (function() {
    function Control(rate, klassName) {
      cc.MultiOutUGen.call(this, klassName || "Control");
      this.rate   = rate;
      this.values = null;
    }
    extend(Control, cc.MultiOutUGen);
    
    Control.prototype.init = function(values) {
      cc.UGen.prototype.init.apply(this, [this.rate]);
      this.values = values.slice();
      return this.initOutputs(this.values.length, this.rate);
    };
    
    return Control;
  })();

  var AudioControl = (function() {
    function AudioControl() {
      Control.call(this, 2, "AudioControl");
    }
    extend(AudioControl, Control);
    
    return AudioControl;
  })();

  var TrigControl = (function() {
    function TrigControl() {
      Control.call(this, 1, "TrigControl");
    }
    extend(TrigControl, Control);
    
    return TrigControl;
  })();
  
  var LagControl = (function() {
    function LagControl() {
      Control.call(this, 1, "LagControl");
    }
    extend(LagControl, Control);
    
    LagControl.prototype.init = function(values, lags) {
      cc.UGen.prototype.init.apply(this, [this.rate].concat(lags));
      this.values = values;
      return this.initOutputs(values.length, this.rate);
    };
    
    return LagControl;
  })();
  
  var UnaryOpUGen = (function() {
    function UnaryOpUGen() {
      cc.UGen.call(this, "UnaryOpUGen");
    }
    extend(UnaryOpUGen, cc.UGen);

    UnaryOpUGen.prototype.init = function(selector, a) {
      var index = ops.UNARY_OPS[selector];
      if (typeof index === "undefined") {
        throw new Error("UnaryOpUGen: unknown operator '" + selector + "'");
      }
      a = utils.asUGenInput(a);
      cc.UGen.prototype.init.call(this, asRate(a));
      this.selector = selector;
      this.specialIndex = index;
      this.inputs = [a];
      this.numOfInputs = 1;
      return this;
    };
    
    return UnaryOpUGen;
  })();
  
  var BinaryOpUGen = (function() {
    function BinaryOpUGen() {
      cc.UGen.call(this, "BinaryOpUGen");
    }
    extend(BinaryOpUGen, cc.UGen);
    
    BinaryOpUGen.prototype.init = function(selector, a, b) {
      a = utils.asUGenInput(a);
      b = utils.asUGenInput(b);
      if (typeof a === "number" && typeof b === "number") {
        switch (selector) {
        case "+": return utils.asUGenInput(a + b);
        case "-": return utils.asUGenInput(a - b);
        case "*": return utils.asUGenInput(a * b);
        case "/": return utils.asUGenInput(a / b);
        case "%": return utils.asUGenInput(a % b);
        }
      }
      
      if (selector === "-" && typeof b === "number") {
        selector = "+";
        b = -b;
      }
      if (selector === "/" && typeof b === "number") {
        selector = "*";
        b = 1 / b; // TODO: div(0) ?
      }
      if (selector === "*") {
        if (a === 0 || b === 0) {
          return 0;
        } else if (a === 1) {
          return b;
        } else if (b === 1) {
          return a;
        }
        return optimizeMulObjects(a, b);
      }
      if (selector === "+") {
        if (a === 0) {
          return b;
        } else if (b === 0) {
          return a;
        } else if (a instanceof BinaryOpUGen) {
          if (a.selector === "*") {
            return cc.createMulAdd(a.inputs[0], a.inputs[1], b);
          }
        } else if (a instanceof MulAdd) {
          if (typeof a.inputs[2] === "number" && typeof b === "number") {
            if (a.inputs[2] + b === 0) {
              return cc.createBinaryOpUGen("*!", a.inputs[0], a.inputs[1]);
            } else {
              a.inputs[2] += b;
              return a;
            }
          }
          b = cc.createBinaryOpUGen("+", a.inputs[2], b);
          a = cc.createBinaryOpUGen("*!", a.inputs[0], a.inputs[1]);
          return cc.createBinaryOpUGen("+", a, b);
        }
        return optimizeSumObjects(a, b);
      }
      if (selector === "+!") {
        selector = "+";
      } else if (selector === "*!") {
        selector = "*";
      }
      var index = ops.BINARY_OPS[selector];
      if (typeof index === "undefined") {
        throw new Error("BinaryOpUGen: unknown operator '" + selector + "'");
      }
      cc.UGen.prototype.init.call(this, asRate([a, b]));
      this.selector = selector;
      this.specialIndex = index;
      this.inputs = [a, b];
      this.numOfInputs = 2;
      return this;
    };
    
    return BinaryOpUGen;
  })();
  
  // TODO: a graph should be optimized when SynthDef building
  var optimizeSumObjects = (function() {
    var collect = function(obj) {
      if (typeof obj === "number") {
        return obj;
      }
      var i = obj.inputs;
      if (obj instanceof BinaryOpUGen && obj.selector === "+") {
        return [ collect(i[0]), collect(i[1]) ];
      } else if (obj instanceof Sum3) {
        return [ collect(i[0]), collect(i[1]), collect(i[2]) ];
      } else if (obj instanceof Sum4) {
        return [ collect(i[0]), collect(i[1]), collect(i[2]), collect(i[3]) ];
      }
      return obj;
    };
    var work = function(a) {
      a = a.map(function(a) {
        switch (a.length) {
        case 4: return cc.createSum4(a[0], a[1], a[2], a[3]);
        case 3: return cc.createSum3(a[0], a[1], a[2]);
        case 2: return cc.createBinaryOpUGen("+!", a[0], a[1]);
        case 1: return a[0];
        }
      });
      switch (a.length) {
      case 4: return cc.createSum4(a[0], a[1], a[2], a[3]);
      case 3: return cc.createSum3(a[0], a[1], a[2]);
      case 2: return cc.createBinaryOpUGen("+!", a[0], a[1]);
      case 1: return a[0];
      default: return work(utils.clump(a, 4));
      }
    };
    return function(in1, in2) {
      var list = utils.flatten([ collect(in1), collect(in2) ]);
      var fixnum = 0;
      list = list.filter(function(ugen) {
        if (typeof ugen === "number") {
          fixnum += ugen;
          return false;
        }
        return true;
      });
      if (fixnum !== 0) {
        list.push(fixnum);
      }
      list = utils.clump(list, 4);
      if (list.length === 1 && list[0].length === 2) {
        return cc.createBinaryOpUGen("+!", list[0][0], list[0][1]);
      }
      var result = work(list);
      return result;
    };
  })();
  
  var optimizeMulObjects = (function() {
    var collect = function(obj) {
      if (typeof obj === "number") { return obj; }
      var i = obj.inputs;
      if (obj instanceof BinaryOpUGen && obj.selector === "*") {
        return [ collect(i[0]), collect(i[1]) ];
      }
      return obj;
    };
    var work = function(a) {
      a = a.map(function(a) {
        if (a.length === 2) {
          return cc.createBinaryOpUGen("*!", a[0], a[1]);
        } else {
          return a[0];
        }
      });
      switch (a.length) {
      case 2:
        return cc.createBinaryOpUGen("*!", a[0], a[1]);
      case 1:
        return a[0];
      default:
        return work(utils.clump(a, 2));
      }
    };
    return function(in1, in2) {
      var list = utils.flatten([ collect(in1), collect(in2) ]);
      var fixnum = 1;
      list = list.filter(function(ugen) {
        if (typeof ugen === "number") {
          fixnum *= ugen;
          return false;
        }
        return true;
      });
      if (fixnum !== 1) {
        list.push(fixnum);
      }
      list = utils.clump(list, 2);
      if (list.length === 1 && list[0].length === 2) {
        return cc.createBinaryOpUGen("*!", list[0][0], list[0][1]);
      }
      return work(list);
    };
  })();

  var MulAdd = (function() {
    function MulAdd() {
      cc.UGen.call(this, "MulAdd");
    }
    extend(MulAdd, cc.UGen);

    MulAdd.prototype.init = function(_in, mul, add) {
      var t, minus, nomul, noadd, rate;
      if (asRate(_in) < asRate(mul)) {
        t = _in; _in = mul; mul = t;
      }
      _in = utils.asUGenInput(_in);
      mul = utils.asUGenInput(mul);
      add = utils.asUGenInput(add);
      if (mul === 0) {
        return add;
      }
      if (typeof _in === "number" && typeof mul === "number") {
        _in *= mul;
        mul = 1;
      }
      
      minus = mul === -1;
      nomul = mul ===  1;
      noadd = add ===  0;
      
      if (nomul && noadd) {
        return _in;
      }
      if (minus && noadd) {
        return cc.createBinaryOpUGen("*", _in, -1);
      }
      if (noadd) {
        return cc.createBinaryOpUGen("*", _in, mul);
      }
      if (minus) {
        return cc.createBinaryOpUGen("-", add, _in);
      }
      if (nomul) {
        return cc.createBinaryOpUGen("+", _in, add);
      }
      rate = asRate([_in, mul, add]);
      return cc.UGen.prototype.init.apply(this, [rate, _in, mul, add]);
    };
    
    return MulAdd;
  })();
  
  var Sum3 = (function() {
    function Sum3() {
      cc.UGen.call(this, "Sum3");
    }
    extend(Sum3, cc.UGen);
    
    Sum3.prototype.init = function(in0, in1, in2) {
      if (in0 === 0) {
        return cc.createBinaryOpUGen("+", in1, in2);
      }
      if (in1 === 0) {
        return cc.createBinaryOpUGen("+", in0, in2);
      }
      if (in2 === 0) {
        return cc.createBinaryOpUGen("+", in0, in1);
      }
      var rate = asRate([in0, in1, in2]);
      var sortedArgs = [in0, in1, in2].sort(function(a, b) {
        return asRate(b) - asRate(a);
      });
      return cc.UGen.prototype.init.apply(this, [rate].concat(sortedArgs));
    };
    
    return Sum3;
  })();

  var Sum4 = (function() {
    function Sum4() {
      cc.UGen.call(this, "Sum4");
    }
    extend(Sum4, cc.UGen);
    
    Sum4.prototype.init = function(in0, in1, in2, in3) {
      if (in0 === 0) {
        return cc.createSum3(in1, in2, in3);
      }
      if (in1 === 0) {
        return cc.createSum3(in0, in2, in3);
      }
      if (in2 === 0) {
        return cc.createSum3(in0, in1, in3);
      }
      if (in3 === 0) {
        return cc.createSum3(in0, in1, in2);
      }
      var rate = asRate([in0, in1, in2, in3]);
      var sortedArgs = [in0, in1, in2, in3].sort(function(a, b) {
        return asRate(b) - asRate(a);
      });
      return cc.UGen.prototype.init.apply(this, [rate].concat(sortedArgs));
    };
    
    return Sum4;
  })();
  
  cc.ugen.specs.Out = {
    Klass: cc.Out,
    $ar: {
      defaults: "bus=0,channelsArray=0",
      ctor: function(bus, channelsArray) {
        this.multiNewList([2, bus].concat(channelsArray));
        return 0; // Out has no output
      }
    },
    $kr: {
      defaults: "bus=0,channelsArray=0",
      ctor: function(bus, channelsArray) {
        this.multiNewList([1, bus].concat(channelsArray));
        return 0; // Out has no output
      }
    }
  };
  
  cc.createControl = function(rate) {
    return new Control(rate);
  };
  cc.createAudioControl = function() {
    return new AudioControl();
  };
  cc.createTrigControl = function() {
    return new TrigControl();
  };
  cc.createLagControl = function() {
    return new LagControl();
  };
  cc.instanceOfControlUGen = function(obj) {
    return obj instanceof Control;
  };
  cc.createUnaryOpUGen = fn(function(selector, a) {
    return new UnaryOpUGen().init(selector, a);
  }).multiCall().build();
  cc.createBinaryOpUGen = fn(function(selector, a, b) {
    return new BinaryOpUGen().init(selector, a, b);
  }).multiCall().build();
  cc.createMulAdd = fn(function(_in, mul, add) {
    return new MulAdd().init(_in, mul, add);
  }).multiCall().build();
  cc.createSum3 = fn(function(in0, in1, in2) {
    return new Sum3().init(in0, in1, in2);
  }).multiCall().build();
  cc.createSum4 = fn(function(in0, in1, in2, in3) {
    return new Sum4().init(in0, in1, in2, in3);
  }).multiCall().build();
  
  module.exports = {
    Control: Control,
    UnaryOpUGen: UnaryOpUGen,
    BinaryOpUGen: BinaryOpUGen,
    MulAdd: MulAdd,
    Sum3: Sum3,
    Sum4: Sum4
  };

});
define('cc/plugins/installer', function(require, exports, module) {

  require("./bufio");
  require("./debug");
  require("./decay");
  require("./delay");
  require("./demand");
  require("./env");
  require("./filter");
  require("./info");
  require("./inout");
  require("./line");
  require("./noise");
  require("./osc");
  require("./pan");
  require("./random");
  require("./range");
  require("./reverb");
  require("./trig");
  require("./ui");
  
  module.exports = {};

});
define('cc/plugins/bufio', function(require, exports, module) {

  var cc = require("../cc");
  var utils = require("./utils");
  var cubicinterp = utils.cubicinterp;
  var slice = [].slice;

  var sc_loop = function(unit, index, hi, loop) {
    if (index >= hi) {
      if (!loop) {
        unit.done = true;
        return hi;
      }
      index -= hi;
      if (index < hi) {
        return index;
      }
    } else if (index < 0) {
      if (!loop) {
        unit.done = true;
        return 0;
      }
      index += hi;
      if (index >= 0) {
        return index;
      }
    } else {
      return index;
    }
    return index - hi * Math.floor(index/hi);
  };

  var get_indices = function(phase, hi, loop) {
    var index1 = phase|0;
    var index0 = index1 - 1;
    var index2 = index1 + 1;
    var index3 = index2 + 1;
    if (index1 === 0) {
      if (loop) {
        index0 = hi;
      } else {
        index0 = index1;
      }
    } else if (index3 > hi) {
      if (index2 > hi) {
        if (loop) {
          index2 = 0;
          index3 = 1;
        } else {
          index2 = index3 = hi;
        }
      } else {
        if (loop) {
          index3 = 0;
        } else {
          index3 = hi;
        }
      }
    }
    return [ index0, index1, index2, index3 ];
  };

  var get_buffer = function(unit, instance) {
    var buffer = instance.buffers[unit.inputs[0][0]|0];
    if (buffer) {
      var samples = buffer.samples;
      if (samples) {
        unit._frames     = buffer.frames;
        unit._channels   = buffer.channels;
        unit._sampleRate = buffer.sampleRate;
        unit._samples    = samples;
        return true;
      }
    }
    return false;
  };

  var asArray = function(obj) {
    if (Array.isArray(obj)) {
      return obj;
    }
    return [obj];
  };
  
  cc.ugen.specs.PlayBuf = {
    Klass: cc.MultiOutUGen,
    $ar: {
      defaults: "numChannels=0,bufnum=0,rate=1,trigger=1,startPos=0,loop=0,doneAction=0",
      ctor: function(numChannels, bufnum, rate, trigger, startPos, loop, doneAction) {
        if (typeof numChannels !== "number") {
          throw new TypeError("PlayBuf: numChannels should be an integer.");
        }
        return this.multiNew(2, numChannels, bufnum, rate, trigger, startPos, loop, doneAction);
      }
    },
    $kr: {
      defaults: "numChannels=0,bufnum,rate=1,trigger=1,startPos=0,loop=0,doneAction=0",
      ctor: function(numChannels, bufnum, rate, trigger, startPos, loop, doneAction) {
        if (typeof numChannels !== "number") {
          throw new TypeError("PlayBuf: numChannels should be an integer.");
        }
        return this.multiNew(1, numChannels, bufnum, rate, trigger, startPos, loop, doneAction);
      }
    },
    init: function(numChannels) {
      this.inputs = slice.call(arguments, 1);
      return this.initOutputs(numChannels, this.rate);
    }
  };

  cc.unit.specs.PlayBuf = (function() {
    var ctor = function() {
      switch (this.numOfOutputs) {
      case 1: this.process = next_1ch; break;
      case 2: this.process = next_2ch; break;
      default: this.process = next;
      }
      this._samples  = null;
      this._channels = 0;
      this._frames   = 0;
      this._phase = this.inputs[3][0];
      this._trig  = 0;
    };
    
    var next_1ch = function(inNumSamples, instance) {
      if (!get_buffer(this, instance)) {
        return;
      }
      var out   = this.outputs[0];
      var phase = this._phase;
      var rate  = this.inputs[1][0];
      var trig  = this.inputs[2][0];
      var loop  = this.inputs[4][0];
      var samples  = this._samples;
      var frames   = this._frames;
      var indices, frac, a, b, c, d;
      var hi = frames - 1;
      
      if (trig > 0 && this._trig <= 0) {
        this.done = false;
        phase = this.inputs[3][0];
      }
      this._trig = trig;
      for (var i = 0; i < inNumSamples; ++i) {
        phase = sc_loop(this, phase, hi, loop);
        indices = get_indices(phase, hi, loop);
        frac = phase - (phase|0);
        
        a = samples[indices[0]];
        b = samples[indices[1]];
        c = samples[indices[2]];
        d = samples[indices[3]];
        out[i] = cubicinterp(frac, a, b, c, d);
        
        phase += rate;
      }
      if (this.done) {
        this.doneAction(this.inputs[5][0]|0);
      }
      this._phase = phase;
    };
    
    var next_2ch = function(inNumSamples, instance) {
      if (!get_buffer(this, instance)) {
        return;
      }
      var out1  = this.outputs[0];
      var out2  = this.outputs[1];
      var phase = this._phase;
      var rate  = this.inputs[1][0];
      var trig  = this.inputs[2][0];
      var loop  = this.inputs[4][0];
      var samples  = this._samples;
      var frames   = this._frames;
      var indices, frac, a, b, c, d;
      var hi = frames - 1;
      
      if (trig > 0 && this._trig <= 0) {
        this.done = false;
        phase = this.inputs[3][0];
      }
      this._trig = trig;
      for (var i = 0; i < inNumSamples; ++i) {
        phase = sc_loop(this, phase, hi, loop);
        indices = get_indices(phase, hi, loop);
        frac = phase - (phase|0);
        
        a = samples[indices[0] * 2];
        b = samples[indices[1] * 2];
        c = samples[indices[2] * 2];
        d = samples[indices[3] * 2];
        out1[i] = cubicinterp(frac, a, b, c, d);
        
        a = samples[indices[0] * 2 + 1];
        b = samples[indices[1] * 2 + 1];
        c = samples[indices[2] * 2 + 1];
        d = samples[indices[3] * 2 + 1];
        out2[i] = cubicinterp(frac, a, b, c, d);
        
        phase += rate;
      }
      if (this.done) {
        this.doneAction(this.inputs[5][0]|0);
      }
      this._phase = phase;
    };
    
    var next = function(inNumSamples, instance) {
      if (!get_buffer(this, instance)) {
        return;
      }
      var outputs = this.outputs;
      var phase = this._phase;
      var rate  = this.inputs[1][0];
      var trig  = this.inputs[2][0];
      var loop  = this.inputs[4][0];
      var samples  = this._samples;
      var channels = this._channels;
      var frames   = this._frames;
      var indices, frac, a, b, c, d;
      
      var hi = frames - 1;
      if (trig > 0 && this._trig <= 0) {
        this.done = false;
        phase = this.inputs[3][0];
      }
      this._trig = trig;
      for (var i = 0; i < inNumSamples; ++i) {
        phase = sc_loop(this, phase, hi, loop);
        indices = get_indices(phase, hi, loop);
        frac = phase - (phase|0);
        for (var j = 0, jmax = outputs.length; j < jmax; ++j) {
          a = samples[indices[0] * channels + j];
          b = samples[indices[1] * channels + j];
          c = samples[indices[2] * channels + j];
          d = samples[indices[3] * channels + j];
          outputs[j][i] = cubicinterp(frac, a, b, c, d);
        }
        phase += rate;
      }
      if (this.done) {
        this.doneAction(this.inputs[5][0]|0);
      }
      this._phase = phase;
    };
    
    return ctor;
  })();
  
  cc.ugen.specs.BufRd = {
    Klass: cc.MultiOutUGen,
    $ar: {
      defaults: "numChannels=0,bufnum=0,phase=0,loop=1,interpolation=2",
      ctor: function(numChannels, bufnum, phase, loop, interpolation) {
        if (typeof numChannels !== "number") {
          throw new TypeError("PlayBuf: numChannels should be an integer.");
        }
        return this.multiNew(2, numChannels, bufnum, phase, loop, interpolation);
      }
    },
    $kr: {
      defaults: "numChannels=0,bufnum=0,phase=0,loop=1,interpolation=2",
      ctor: function(numChannels, bufnum, phase, loop, interpolation) {
        if (typeof numChannels !== "number") {
          throw new TypeError("PlayBuf: numChannels should be an integer.");
        }
        return this.multiNew(1, numChannels, bufnum, phase, loop, interpolation);
      }
    },
    init: function(numChannels) {
      this.inputs = slice.call(arguments, 1);
      return this.initOutputs(numChannels, this.rate);
    }
  };

  var perform_N = function(samples, indices, mul, add) {
    return samples[indices[1] * mul + add];
  };
  var perform_L = function(samples, indices, mul, add, frac) {
    var b = samples[indices[1] * mul + add];
    var c = samples[indices[2] * mul + add];
    return b + frac * (c - b);
  };
  var perform_C = function(samples, indices, mul, add, frac) {
    var a = samples[indices[0] * mul + add];
    var b = samples[indices[1] * mul + add];
    var c = samples[indices[2] * mul + add];
    var d = samples[indices[3] * mul + add];
    return cubicinterp(frac, a, b, c, d);
  };
  cc.unit.specs.BufRd = (function() {
    var ctor = function() {
      switch (this.numOfOutputs) {
      case 1:
        this.process = next_1ch;
        break;
      case 2:
        this.process = next_2ch;
        break;
      default:
        this.process = next;
      }
      switch (this.inputs[3][0]|0) {
      case 1 : this._perform = perform_N; break;
      case 4 : this._perform = perform_C; break;
      default: this._perform = perform_L; break;
      }
    };
    var next_1ch = function(inNumSamples, instance) {
      if (!get_buffer(this, instance)) {
        return;
      }
      var out = this.outputs[0];
      var phaseIn = this.inputs[1];
      var loop = this.inputs[2][0];
      var samples   = this._samples;
      var numFrames = this._numFrames;
      var perform   = this._perform;
      var phase, indices, frac;
      var hi = numFrames - 1;
      for (var i = 0; i < inNumSamples; ++i) {
        phase = sc_loop(this, phaseIn[i], hi, loop);
        indices = get_indices(phase, hi, loop);
        frac = phase - (phase|0);
        out[i] = perform(samples, indices, 1, 0, frac);
      }
    };
    var next_2ch = function(inNumSamples, instance) {
      if (!get_buffer(this, instance)) {
        return;
      }
      var out1 = this.outputs[0];
      var out2 = this.outputs[1];
      var phaseIn = this.inputs[1];
      var loop = this.inputs[2][0];
      var samples   = this._samples;
      var numFrames = this._numFrames;
      var perform   = this._perform;
      var phase, indices, frac;
      var hi = numFrames - 1;
      for (var i = 0; i < inNumSamples; ++i) {
        phase = sc_loop(this, phaseIn[i], hi, loop);
        indices = get_indices(phase, hi, loop);
        frac = phase - (phase|0);
        out1[i] = perform(samples, indices, 2, 0, frac);
        out2[i] = perform(samples, indices, 2, 1, frac);
      }
    };
    var next = function(inNumSamples, instance) {
      if (!get_buffer(this, instance)) {
        return;
      }
      var outputs = this.outputs;
      var phaseIn = this.inputs[1];
      var loop = this.inputs[2][0];
      var samples   = this._samples;
      var numFrames = this._numFrames;
      var perform   = this._perform;
      var phase, indices, frac;
      var hi = numFrames - 1;
      for (var i = 0; i < inNumSamples; ++i) {
        phase = sc_loop(this, phaseIn[i], hi, loop);
        indices = get_indices(phase, hi, loop);
        frac = phase - (phase|0);
        for (var j = 0, jmax = outputs.length; j < jmax; ++j) {
          outputs[j][i] = perform(samples, indices, jmax, j, frac);
        }
      }
    };
    return ctor;
  })();

  cc.ugen.specs.BufWr = {
    $ar: {
      defaults: "inputArray=[],bufnum=0,phase=0,loop=1",
      ctor: function(inputArray, bufnum, phase, loop) {
        return this.multiNewList([2, bufnum, phase, loop].concat(asArray(inputArray)));
      }
    },
    $kr: {
      defaults: "inputArray=[],bufnum=0,phase=0,loop=1",
      ctor: function(inputArray, bufnum, phase, loop) {
        return this.multiNewList([1, bufnum, phase, loop].concat(asArray(inputArray)));
      }
    },
    checkNInputs: function() {
      if (this.rate === 2 && this.inputs[1].rate !== 2) {
        throw new Error("phase input is not audio rate");
      }
    }
  };

  cc.unit.specs.BufWr = (function() {
    var ctor = function() {
      switch (this.numOfInputs - 3) {
      case 1:
        this.process = next_1ch;
        break;
      case 2:
        this.process = next_2ch;
        break;
      default:
        this.process = next;
        break;
      }
    };
    var next_1ch = function(inNumSamples, instance) {
      if (!get_buffer(this, instance)) {
        return;
      }
      var phaseIn = this.inputs[1];
      var in0In   = this.inputs[3];
      var loop    = this.inputs[2][0];
      var loopMax = this._frames - (loop ? 0 : 1);
      var samples = this._samples;
      var phase;
      var i;
      for (i = 0; i < inNumSamples; ++i) {
        phase = sc_loop(this, phaseIn[i], loopMax, loop);
        samples[phase|0] = in0In[i];
      }
    };
    var next_2ch = function(inNumSamples, instance) {
      if (!get_buffer(this, instance)) {
        return;
      }
      var phaseIn = this.inputs[1];
      var in0In   = this.inputs[3];
      var in1In   = this.inputs[4];
      var loop    = this.inputs[2][0];
      var loopMax = this._frames - (loop ? 0 : 1);
      var samples = this._samples;
      var phase, index;
      var i;
      for (i = 0; i < inNumSamples; ++i) {
        phase = sc_loop(this, phaseIn[i], loopMax, loop);
        index = phase << 1;
        samples[index  ] = in0In[i];
        samples[index+1] = in1In[i];
      }
    };
    var next = function(inNumSamples, instance) {
      if (!get_buffer(this, instance)) {
        return;
      }
      var phaseIn = this.inputs[1];
      var inputs  = this.inputs;
      var loop    = this.inputs[2][0];
      var loopMax = this._frames - (loop ? 0 : 1);
      var samples = this._samples;
      var channels = this._channels;
      var phase, index;
      var i, j;
      for (i = 0; i < inNumSamples; ++i) {
        phase = sc_loop(this, phaseIn[i], loopMax, loop);
        index = (phase|0) * channels;
        for (j = 0; j < channels; ++j) {
          samples[index+j] = inputs[j+3][i];
        }
      }
    };
    return ctor;
  })();

  cc.ugen.specs.RecordBuf = {
    $ar: {
      defaults: "inputArray=[],bufnum=0,offset=0,recLevel=1,preLevel=0,run=1,loop=1,trigger=1,doneAction=0",
      ctor: function(inputArray, bufnum, offset, recLevel, preLevel, run, loop, trigger, doneAction) {
        return this.multiNewList([
          2, bufnum, offset, recLevel, preLevel, run, loop, trigger, doneAction
        ].concat(asArray(inputArray)));
      }
    },
    $kr: {
      defaults: "inputArray=[],bufnum=0,offset=0,recLevel=1,preLevel=0,run=1,loop=1,trigger=1,doneAction=0",
      ctor: function(inputArray, bufnum, offset, recLevel, preLevel, run, loop, trigger, doneAction) {
        return this.multiNewList([
          1, bufnum, offset, recLevel, preLevel, run, loop, trigger, doneAction
        ].concat(asArray(inputArray)));
      }
    }
  };

  cc.unit.specs.RecordBuf = (function() {
    var ctor = function() {
      switch (this.numOfInputs - 8) {
      case 1:
        this.process = next_1ch;
        break;
      case 2:
        this.process = next_2ch;
        break;
      default:
        this.process = next;
        break;
      }
      this._writepos = this.inputs[1][0];
      this._recLevel = this.inputs[2][0];
      this._preLevel = this.inputs[3][0];
      this._prevtrig = 0;
      this._preindex = 0;
    };
    var recbuf_next = function(func) {
      return function(inNumSamples, instance) {
        if (!get_buffer(this, instance)) {
          return;
        }
        var channels = this._channels;
        var frames   = this._frames;
        var samples  = this._samples;
        var inputs   = this.inputs;
        var recLevel = this.inputs[2][0];
        var preLevel = this.inputs[3][0];
        var run      = this.inputs[4][0];
        var loop     = this.inputs[5][0]|0;
        var trig     = this.inputs[6][0];
        var writepos = this._writepos;
        var recLevel_slope = (recLevel - this._recLevel) * this.rate.slopeFactor;
        var preLevel_slope = (preLevel - this._preLevel) * this.rate.slopeFactor;
        var prevpos, posincr;
        var i;
        recLevel = this._recLevel;
        preLevel = this._preLevel;
        prevpos  = this._prevpos;
        posincr  = run > 0 ? +1 : -1;
        if (trig > 0 && this._prevtrig) {
          this.done = false;
          writepos  = (this.inputs[1][0] * channels)|0;
        }
        if (writepos < 0) {
          writepos = frames - 1;
        } else if (writepos >= frames) {
          writepos = 0;
        }
        for (i = 0; i < inNumSamples; ++i) {
          func(inputs, i, samples, writepos, prevpos, recLevel, preLevel, channels);
          prevpos   = writepos;
          writepos += posincr;
          if (writepos >= frames) {
            if (loop) {
              writepos = 0;
            } else {
              writepos = frames - 1;
              this.done = true;
            }
          } else if (0 < writepos) {
            if (loop) {
              writepos = frames - 1;
            } else {
              writepos  = 0;
              this.done = true;
            }
          }
          recLevel += recLevel_slope;
          preLevel += preLevel_slope;
        }
        if (this.done) {
          this.doneAction(this.inputs[7][0]|0);
        }
        this._prevtrig = trig;
        this._writepos = writepos;
        this._prevpos  = prevpos;
        this._recLevel = recLevel;
        this._preLevel = preLevel;
      };
    };

    var next_1ch = recbuf_next(function(inputs, index, samples, writepos, prevpos, recLevel, preLevel) {
      samples[writepos] = inputs[8][index] * recLevel + samples[prevpos] * preLevel;
    });

    var next_2ch = recbuf_next(function(inputs, index, samples, writepos, prevpos, recLevel, preLevel) {
      samples[writepos*2  ] = inputs[8][index] * recLevel + samples[prevpos*2  ] * preLevel;
      samples[writepos*2+1] = inputs[9][index] * recLevel + samples[prevpos*2+1] * preLevel;
    });

    var next = recbuf_next(function(inputs, index, samples, writepos, prevpos, recLevel, preLevel, channels) {
      var j;
      for (j = 0; j < channels; ++j) {
        samples[writepos*channels+j] = inputs[8+j][index] + recLevel * samples[prevpos*channels+j] * preLevel;
      }
    });
    return ctor;
  })();
  
  cc.ugen.specs.BufSampleRate = {
    $kr: {
      defaults: "bufnum=0",
      ctor: function(bufnum) {
        return this.multiNew(1, bufnum);
      }
    },
    $ir: {
      defaults: "bufnum=0",
      ctor: function(bufnum) {
        return this.multiNew(0, bufnum);
      }
    }
  };

  cc.unit.specs.BufSampleRate = (function() {
    var ctor = function() {
      this.process = next;
    };
    var next = function(inNumSamples, instance) {
      if (get_buffer(this, instance)) {
        this.outputs[0][0] = this._sampleRate;
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.BufRateScale = cc.ugen.specs.BufSampleRate;

  cc.unit.specs.BufRateScale = (function() {
    var ctor = function() {
      this.process = next;
      this._sampleDur = cc.server.rates[2].sampleDur;
    };
    var next = function(inNumSamples, instance) {
      if (get_buffer(this, instance)) {
        this.outputs[0][0] = this._sampleRate * this._sampleDur;
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.BufFrames = cc.ugen.specs.BufSampleRate;

  cc.unit.specs.BufFrames = (function() {
    var ctor = function() {
      this.process = next;
    };
    var next = function(inNumSamples, instance) {
      if (get_buffer(this, instance)) {
        this.outputs[0][0] = this._frames;
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.BufSamples   = cc.ugen.specs.BufSampleRate;

  cc.unit.specs.BufSamples = (function() {
    var ctor = function() {
      this.process = next;
    };
    var next = function(inNumSamples, instance) {
      if (get_buffer(this, instance)) {
        this.outputs[0][0] = this._samples.length;
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.BufDur = cc.ugen.specs.BufSampleRate;

  cc.unit.specs.BufDur = (function() {
    var ctor = function() {
      this.process = next;
      this._sampleDur = cc.server.rates[2].sampleDur;
    };
    var next = function(inNumSamples, instance) {
      if (get_buffer(this, instance)) {
        this.outputs[0][0] = this._frames * this._sampleDur;
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.BufChannels = cc.ugen.specs.BufSampleRate;
  
  cc.unit.specs.BufChannels = (function() {
    var ctor = function() {
      this.process = next;
    };
    var next = function(inNumSamples, instance) {
      if (get_buffer(this, instance)) {
        this.outputs[0][0] = this._channels;
      }
    };
    return ctor;
  })();
  
  module.exports = {};

});
define('cc/plugins/utils', function(require, exports, module) {

  var twopi     = 2 * Math.PI;
  var kSineSize = 8192;
  var kSineMask = kSineSize - 1;
  var kBadValue = new Float32Array([1e20])[0];
  var gSine          = new Float32Array(kSineSize + 1);
  var gInvSine       = new Float32Array(kSineSize + 1);
  var gSineWavetable = new Float32Array(kSineSize * 2);
  
  (function() {
    var i;
    for (i = 0; i < kSineSize; ++i) {
      var d = Math.sin(twopi * (i / kSineSize));
      gSine[i] = d;
      gInvSine[i] = 1 / d;
    }
    gSine[kSineSize] = gSine[0];
    gInvSine[0] = gInvSine[kSineSize>>1] = gInvSine[kSineSize] = kBadValue;
    var sz = kSineSize, sz2 = sz >> 1;
    for (i = 1; i <= 8; ++i) {
      gInvSine[i] = gInvSine[sz-i] = gInvSine[sz2-i] = gInvSine[sz2+i] = kBadValue;
    }
  })();
  (function() {
    (function(signal, wavetable, inSize) {
      var val1, val2;
      var i, j;
      for (i = j = 0; i < inSize - 1; ++i) {
        val1 = signal[i];
        val2 = signal[i+1];
        wavetable[j++] = 2 * val1 - val2;
        wavetable[j++] = val2 - val1;
      }
      val1 = signal[inSize - 1];
      val2 = signal[0];
      wavetable[j++] = 2 * val1 - val2;
      wavetable[j++] = val2 - val1;
    })(gSine, gSineWavetable, kSineSize);
  })();

  var zapgremlins = function(a) {
    if (a < 0) {
      if (-1e-6 < a) {
        a = 0;
      }
    } else if (a < +1e-6) {
      a = 0;
    }
    return a;
  };

  var cubicinterp = function(x, y0, y1, y2, y3) {
    var c0 = y1;
    var c1 = 0.5 * (y2 - y0);
    var c2 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
    var c3 = 0.5 * (y3 - y0) + 1.5 * (y1 - y2);
    return ((c3 * x + c2) * x + c1) * x + c0;
  };
  
  var sc_wrap = function(val, lo, hi) {
    if (hi === lo) {
      return lo;
    }
    var range = (hi - lo);
    if (val >= hi) {
      val -= range;
      if (val < hi) {
        return val;
      }
    } else if (val < lo) {
      val += range;
      if (val >= lo) {
        return val;
      }
    } else {
      return val;
    }
    return val - range * Math.floor((val - lo) / range);
  };
  
  module.exports = {
    kSineSize: kSineSize,
    kSineMask: kSineMask,
    kBadValue: kBadValue,
    gSine         : gSine,
    gInvSine      : gInvSine,
    gSineWavetable: gSineWavetable,

    zapgremlins: zapgremlins,
    cubicinterp: cubicinterp,
    sc_wrap: sc_wrap
  };

});
define('cc/plugins/debug', function(require, exports, module) {

  var cc = require("../cc");

  cc.ugen.specs.Debug = {
    $ar: {
      defaults: "in=0",
      ctor: function(_in) {
        return this.multiNew(2, _in);
      }
    },
    $kr: {
      defaults: "in=0",
      ctor: function(_in) {
        return this.multiNew(1, _in);
      }
    }
  };
  
  cc.unit.specs.Debug = (function() {
    var ctor = function() {
      this.process = next;
    };
    var next = function() {
      this.outputs[0].set(this.inputs[0]);
      cc.global.console.log(this.outputs[0][0]);
    };
    return ctor;
  })();
  
  module.exports = {};

});
define('cc/plugins/decay', function(require, exports, module) {

  var cc = require("../cc");
  var log001 = Math.log(0.001);
  
  cc.ugen.specs.Integrator = {
    $ar: {
      defaults: "in=0,coef=1,mul=1,add=0",
      ctor: function(_in, coef, mul, add) {
        return this.multiNew(2, _in, coef).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,coef=1,mul=1,add=0",
      ctor: function(_in, coef, mul, add) {
        return this.multiNew(1, _in, coef).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  
  cc.unit.specs.Integrator = (function() {
    var ctor = function() {
      this.process = next;
      this._b1 = this.inputs[1][0];
      this._y1 = 0;
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var nextB1 = this.inputs[1][0];
      var b1 = this._b1;
      var y1 = this._y1;
      var i;
      if (b1 === nextB1) {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = y1 = (inIn[i] + b1 * y1);
        }
      } else {
        var b1_slope = (nextB1 - b1) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = y1 = (inIn[i] + b1 * y1);
          b1 += b1_slope;
        }
        this._b1 = nextB1;
      }
      this._y1 = y1;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Decay = {
    $ar: {
      defaults: "in=0,decayTime=1,mul=1,add=0",
      ctor: function(_in, decayTime, mul, add) {
        return this.multiNew(2, _in, decayTime).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,decayTime=1,mul=1,add=0",
      ctor: function(_in, decayTime, mul, add) {
        return this.multiNew(1, _in, decayTime).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.Decay = (function() {
    var ctor = function() {
      this.process = next;
      this._decayTime = undefined;
      this._b1 = 0;
      this._y1 = 0;
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var decayTime = this.inputs[1][0];
      var b1 = this._b1;
      var y1 = this._y1;
      var i;
      if (decayTime === this._decayTime) {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = y1 = (inIn[i] + b1 * y1);
        }
      } else {
        var next_b1 = decayTime === 0 ? 0 : Math.exp(log001 / (decayTime * this.rate.sampleRate));
        this._decayTime = decayTime;
        var b1_slope = (next_b1 - b1) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = y1 = (inIn[i] + b1 * y1);
          b1 += b1_slope;
        }
        this._b1 = next_b1;
      }
      this._y1 = y1;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Decay2 = {
    $ar: {
      defaults: "in=0,attackTime=0.01,decayTime=1,mul=1,add=0",
      ctor: function(_in, attackTime, decayTime, mul, add) {
        return this.multiNew(2, _in, attackTime, decayTime).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,attackTime=0.01,decayTime=1,mul=1,add=0",
      ctor: function(_in, attackTime, decayTime, mul, add) {
        return this.multiNew(1, _in, attackTime, decayTime).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.Decay2 = (function() {
    var ctor = function() {
      this.process = next;
      this._attackTime = undefined;
      this._decayTime  = undefined;
      this._b1a = 0;
      this._b1b = 0;
      this._y1a = 0;
      this._y1b = 0;
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var attackTime = this.inputs[1][0];
      var decayTime  = this.inputs[2][0];
      var b1a = this._b1a;
      var b1b = this._b1b;
      var y1a = this._y1a;
      var y1b = this._y1b;
      var i;
      if (attackTime === this._attackTime && decayTime === this._decayTime) {
        for (i = 0; i < inNumSamples; ++i) {
          y1a = inIn[i] + b1a * y1a;
          y1b = inIn[i] + b1b * y1b;
          out[i] = (y1a - y1b);
        }
      } else {
        this._decayTime  = decayTime;
        this._attackTime = attackTime;
        var next_b1a = decayTime  === 0 ? 0 : Math.exp(log001 / (decayTime  * this.rate.sampleRate));
        var next_b1b = attackTime === 0 ? 0 : Math.exp(log001 / (attackTime * this.rate.sampleRate));
        var b1a_slope = (next_b1a - b1a) * this.rate.slopeFactor;
        var b1b_slope = (next_b1b - b1b) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          y1a = inIn[i] + b1a * y1a;
          y1b = inIn[i] + b1b * y1b;
          out[i] = (y1a - y1b);
          b1a += b1a_slope;
          b1b += b1b_slope;
        }
        b1a = next_b1a;
        b1b = next_b1b;
      }
      this._y1a = y1a;
      this._y1b = y1b;
      this._b1a = b1a;
      this._b1b = b1b;
    };
    return ctor;
  })();
  
  module.exports = {};

});
define('cc/plugins/delay', function(require, exports, module) {
  
  var cc = require("../cc");
  var utils = require("./utils");
  var log001 = Math.log(0.001);
  var cubicinterp = utils.cubicinterp;
  
  cc.ugen.specs.Delay1 = {
    $ar: {
      defaults: "in=0,mul=1,add=0",
      ctor: function(_in, mul, add) {
        return this.multiNew(2, _in).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,mul=1,add=0",
      ctor: function(_in, mul, add) {
        return this.multiNew(1, _in).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.Delay1 = (function() {
    var ctor = function() {
      if (this.bufLength === 1) {
        this.process = next_1;
      } else {
        this.process = next;
      }
      this._x1 = 0;
      next_1.call(this);
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var x1 = this._x1;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = x1;
        out[i+1] = inIn[i  ];
        out[i+2] = inIn[i+1];
        out[i+3] = inIn[i+2];
        out[i+4] = inIn[i+3];
        out[i+5] = inIn[i+4];
        out[i+6] = inIn[i+5];
        out[i+7] = inIn[i+6];
        x1 = inIn[i+7];
      }
      this._x1 = x1;
    };
    var next_1 = function() {
      this.outputs[0][0] = this._x1;
      this._x1 = this.inputs[0][0];
    };
    return ctor;
  })();
  
  cc.ugen.specs.Delay2 = cc.ugen.specs.Delay1;

  cc.unit.specs.Delay2 = (function() {
    var ctor = function() {
      if (this.bufLength === 1) {
        this.process = next_1;
      } else {
        this.process = next;
      }
      this._x1 = this._x2 = 0;
      next_1.call(this);
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var x1 = this._x1;
      var x2 = this._x2;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = x1;
        out[i+1] = x2;
        out[i+2] = inIn[i  ];
        out[i+3] = inIn[i+1];
        out[i+4] = inIn[i+2];
        out[i+5] = inIn[i+3];
        out[i+6] = inIn[i+4];
        out[i+7] = inIn[i+5];
        x1 = inIn[i+6];
        x2 = inIn[i+7];
      }
      this._x1 = x1;
      this._x2 = x2;
    };
    var next_1 = function() {
      this.outputs[0][0] = this._x1;
      this._x1 = this._x2;
      this._x2 = this.inputs[0][0];
    };
    return ctor;
  })();

  // util functions
  var calcDelay = function(unit, delaytime, minDelay) {
    return Math.max(minDelay, Math.min(delaytime * unit.rate.sampleRate, unit._fdelaylen));
  };
  var calcFeedback = function(delaytime, decaytime) {
    if (delaytime === 0 || decaytime === 0) {
      return 0;
    }
    if (decaytime > 0) {
      return +Math.exp(log001 * delaytime / +decaytime);
    } else {
      return -Math.exp(log001 * delaytime / -decaytime);
    }
  };
  var perform_N = function(table, mask, phase) {
    return table[phase & mask];
  };
  var perform_L = function(table, mask, phase, frac) {
    var d1 = table[(phase  )&mask];
    var d2 = table[(phase-1)&mask];
    return d1 + frac * (d2 - d1);
  };
  var perform_C = function(table, mask, phase, frac) {
    var d0 = table[(phase+1)&mask];
    var d1 = table[(phase  )&mask];
    var d2 = table[(phase-1)&mask];
    var d3 = table[(phase-2)&mask];
    return cubicinterp(frac, d0, d1, d2, d3);
  };
  
  cc.ugen.specs.DelayN = {
    $ar: {
      defaults: "in=0,maxdelaytime=0.2,delaytime=0.2,mul=1,add=0",
      ctor: function(_in, maxdelaytime, delaytime, mul, add) {
        return this.multiNew(2, _in, maxdelaytime, delaytime).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,maxdelaytime=0.2,delaytime=0.2,mul=1,add=0",
      ctor: function(_in, maxdelaytime, delaytime, mul, add) {
        return this.multiNew(1, _in, maxdelaytime, delaytime).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  cc.ugen.specs.DelayL = cc.ugen.specs.DelayN;
  cc.ugen.specs.DelayC = cc.ugen.specs.DelayN;

  // DelayN/DelayL/DelayC
  var delay_ctor = function(unit) {
    unit._maxdelaytime = unit.inputs[1][0];
    unit._delaytime    = unit.inputs[2][0];
    unit._dlybuf       = 0;

    var delaybufsize = Math.ceil(unit._maxdelaytime * unit.rate.sampleRate + 1);
    delaybufsize = delaybufsize + unit.rate.bufLength;
    delaybufsize = 1 << Math.ceil(Math.log(delaybufsize) * Math.LOG2E);
    unit._fdelaylen = unit._idelaylen = delaybufsize;

    unit._dlybuf = new Float32Array(delaybufsize);
    unit._mask   = delaybufsize - 1;
    
    unit._dsamp = calcDelay(unit, unit._delaytime, 1);
    unit._numoutput = 0;
    unit._iwrphase  = 0;
  };
  var delay_next = function(unit, inNumSamples, perform) {
    var out  = unit.outputs[0];
    var inIn = unit.inputs[0];
    var delaytime = unit.inputs[2][0];
    var dlybuf   = unit._dlybuf;
    var iwrphase = unit._iwrphase;
    var dsamp    = unit._dsamp;
    var mask     = unit._mask;
    var frac, irdphase;
    var i;
    if (delaytime === unit._delaytime) {
      frac = dsamp - (dsamp|0);
      for (i = 0; i < inNumSamples; ++i) {
        dlybuf[iwrphase & mask] = inIn[i];
        irdphase = iwrphase - (dsamp|0);
        out[i] = perform(dlybuf, mask, irdphase, frac);
        iwrphase += 1;
      }
    } else {
      var next_dsamp  = calcDelay(unit, delaytime, 1);
      var dsamp_slope = (next_dsamp - dsamp) * unit.rate.slopeFactor;
      for (i = 0; i < inNumSamples; ++i) {
        dlybuf[iwrphase & mask] = inIn[i];
        dsamp += dsamp_slope;
        frac     = dsamp - (dsamp|0);
        irdphase = iwrphase - (dsamp|0);
        out[i] = perform(dlybuf, mask, irdphase, frac);
        iwrphase += 1;
      }
      unit._dsamp     = next_dsamp;
      unit._delaytime = delaytime;
    }
    if (iwrphase > dlybuf.length) {
      iwrphase -= dlybuf.length;
    }
    unit._iwrphase = iwrphase;
  };
  
  cc.unit.specs.DelayN = (function() {
    var ctor = function() {
      delay_ctor(this);
      this.process = next;
    };
    var next = function(inNumSamples) {
      delay_next(this, inNumSamples, perform_N);
    };
    return ctor;
  })();
  
  cc.unit.specs.DelayL = (function() {
    var ctor = function() {
      delay_ctor(this);
      this.process = next;
    };
    var next = function(inNumSamples) {
      delay_next(this, inNumSamples, perform_L);
    };
    return ctor;
  })();
  
  cc.unit.specs.DelayC = (function() {
    var ctor = function() {
      delay_ctor(this);
      this.process = next;
    };
    var next = function(inNumSamples) {
      delay_next(this, inNumSamples, perform_C);
    };
    return ctor;
  })();
  
  cc.ugen.specs.CombN = {
    $ar: {
      defaults: "in=0,maxdelaytime=0.2,delaytime=0.2,decaytime=1,mul=1,add=0",
      ctor: function(_in, maxdelaytime, delaytime, decaytime, mul, add) {
        return this.multiNew(2, _in, maxdelaytime, delaytime, decaytime).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,maxdelaytime=0.2,delaytime=0.2,decaytime=1,mul=1,add=0",
      ctor: function(_in, maxdelaytime, delaytime, decaytime, mul, add) {
        return this.multiNew(1, _in, maxdelaytime, delaytime, decaytime).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  cc.ugen.specs.CombL = cc.ugen.specs.CombN;
  cc.ugen.specs.CombC = cc.ugen.specs.CombN;

  // CombN/CombL/CombC
  var comb_ctor = function(unit) {
    var delaybufsize;
    unit._maxdelaytime = unit.inputs[1][0];
    unit._delaytime    = unit.inputs[2][0];
    unit._decaytime    = unit.inputs[3][0];
    delaybufsize = Math.ceil(unit._maxdelaytime * unit.rate.sampleRate + 1);
    delaybufsize = delaybufsize + unit.rate.bufLength;
    delaybufsize = 1 << Math.ceil(Math.log(delaybufsize) * Math.LOG2E);
    unit._fdelaylen = unit._idelaylen = delaybufsize;
    unit._dlybuf    = new Float32Array(delaybufsize);
    unit._mask      = delaybufsize - 1;
    unit._dsamp     = calcDelay(unit, unit._delaytime, 1);
    unit._iwrphase  = 0;
    unit._feedbk    = calcFeedback(unit._delaytime, unit._decaytime);
  };
  var comb_next = function(unit, inNumSamples, perform) {
    var out  = unit.outputs[0];
    var inIn = unit.inputs[0];
    var delaytime = unit.inputs[2][0];
    var decaytime = unit.inputs[3][0];
    var dlybuf   = unit._dlybuf;
    var iwrphase = unit._iwrphase;
    var dsamp    = unit._dsamp;
    var feedbk   = unit._feedbk;
    var mask     = unit._mask;
    var frac     = dsamp - (dsamp|0);
    var irdphase, value;
    var next_feedbk, feedbk_slope, next_dsamp, dsamp_slope;
    var i;
    if (delaytime === unit._delaytime) {
      irdphase = iwrphase - (dsamp|0);
      if (decaytime === unit._decaytime) {
        for (i = 0; i < inNumSamples; ++i) {
          value = perform(dlybuf, mask, irdphase, frac);
          dlybuf[iwrphase & mask] = inIn[i] + feedbk * value;
          out[i] = value;
          irdphase++;
          iwrphase++;
        }
      } else {
        next_feedbk  = calcFeedback(delaytime, decaytime);
        feedbk_slope = (next_feedbk - feedbk) * unit.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          value = perform(dlybuf, mask, irdphase, frac);
          dlybuf[iwrphase & mask] = inIn[i] + feedbk * value;
          out[i] = value;
          feedbk += feedbk_slope;
          irdphase++;
          iwrphase++;
        }
        unit._feedbk = next_feedbk;
        unit._decaytime = decaytime;
      }
    } else {
      next_dsamp  = calcDelay(unit, delaytime, 1);
      dsamp_slope = (next_dsamp - dsamp) * unit.rate.slopeFactor;
      next_feedbk  = calcFeedback(delaytime, decaytime);
      feedbk_slope = (next_feedbk - feedbk) * unit.rate.slopeFactor;
      for (i = 0; i < inNumSamples; ++i) {
        irdphase = iwrphase - (dsamp|0);
        value = perform(dlybuf, mask, irdphase, frac);
        dlybuf[iwrphase & mask] = inIn[i] + feedbk * value;
        out[i] = value;
        dsamp  += dsamp_slope;
        feedbk += feedbk_slope;
        irdphase++;
        iwrphase++;
      }
      unit._feedbk = feedbk;
      unit._dsamp  = dsamp;
      unit._delaytime = delaytime;
      unit._decaytime = decaytime;
    }
    unit._iwrphase = iwrphase;
  };

  cc.unit.specs.CombN = (function() {
    var ctor = function() {
      comb_ctor(this);
      this.process = next;
    };
    var next = function(inNumSamples) {
      comb_next(this, inNumSamples, perform_N);
    };
    return ctor;
  })();
  
  cc.unit.specs.CombL = (function() {
    var ctor = function() {
      comb_ctor(this);
      this.process = next;
    };
    var next = function(inNumSamples) {
      comb_next(this, inNumSamples, perform_L);
    };
    return ctor;
  })();
  
  cc.unit.specs.CombC = (function() {
    var ctor = function() {
      comb_ctor(this);
      this.process = next;
    };
    var next = function(inNumSamples) {
      comb_next(this, inNumSamples, perform_C);
    };
    return ctor;
  })();

  cc.ugen.specs.AllpassN = {
    $ar: {
      defaults: "in=0,maxdelaytime=0.2,delaytime=0.2,decaytime=1,mul=1,add=0",
      ctor: function(_in, maxdelaytime, delaytime, decaytime, mul, add) {
        return this.multiNew(2, _in, maxdelaytime, delaytime, decaytime).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,maxdelaytime=0.2,delaytime=0.2,decaytime=1,mul=1,add=0",
      ctor: function(_in, maxdelaytime, delaytime, decaytime, mul, add) {
        return this.multiNew(1, _in, maxdelaytime, delaytime, decaytime).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  cc.ugen.specs.AllpassL = cc.ugen.specs.AllpassN;
  cc.ugen.specs.AllpassC = cc.ugen.specs.AllpassN;

  // AllpassN/AllpassL/AllpassC
  var allpass_ctor = comb_ctor;
  var allpass_next = function(unit, inNumSamples, perform) {
    var out  = unit.outputs[0];
    var inIn = unit.inputs[0];
    var delaytime = unit.inputs[2][0];
    var decaytime = unit.inputs[3][0];
    var dlybuf   = unit._dlybuf;
    var iwrphase = unit._iwrphase;
    var dsamp    = unit._dsamp;
    var feedbk   = unit._feedbk;
    var mask     = unit._mask;
    var irdphase, frac, value, dwr;
    var next_feedbk, feedbk_slope, next_dsamp, dsamp_slope;
    var i;
    if (delaytime === unit._delaytime) {
      irdphase = iwrphase - (dsamp|0);
      frac     = dsamp - (dsamp|0);
      if (decaytime === unit._decaytime) {
        for (i = 0; i < inNumSamples; ++i) {
          value = perform(dlybuf, mask, irdphase, frac);
          dwr = value * feedbk + inIn[i];
          dlybuf[iwrphase & mask] = dwr;
          out[i] = value - feedbk * dwr;
          irdphase++;
          iwrphase++;
        }
      } else {
        next_feedbk  = calcFeedback(delaytime, decaytime);
        feedbk_slope = (next_feedbk - feedbk) * unit.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          value = perform(dlybuf, mask, irdphase, frac);
          dwr = value * feedbk + inIn[i];
          dlybuf[iwrphase & mask] = dwr;
          out[i] = value - feedbk * dwr;
          feedbk += feedbk_slope;
          irdphase++;
          iwrphase++;
        }
        unit._feedbk = next_feedbk;
        unit._decaytime = decaytime;
      }
    } else {
      next_dsamp  = calcDelay(unit, delaytime, 1);
      dsamp_slope = (next_dsamp - dsamp) * unit.rate.slopeFactor;
      next_feedbk  = calcFeedback(delaytime, decaytime);
      feedbk_slope = (next_feedbk - feedbk) * unit.rate.slopeFactor;
      for (i = 0; i < inNumSamples; ++i) {
        irdphase = iwrphase - (dsamp|0);
        frac     = dsamp - (dsamp|0);
        value = perform(dlybuf, mask, irdphase, frac);
        dwr = value * feedbk + inIn[i];
        dlybuf[iwrphase & mask] = dwr;
        out[i] = value - feedbk * dwr;
        dsamp  += dsamp_slope;
        feedbk += feedbk_slope;
        irdphase++;
        iwrphase++;
      }
      unit._feedbk = feedbk;
      unit._dsamp  = dsamp;
      unit._delaytime = delaytime;
      unit._decaytime = decaytime;
    }
    unit._iwrphase = iwrphase;
  };
  
  cc.unit.specs.AllpassN = (function() {
    var ctor = function() {
      allpass_ctor(this);
      this.process = next;
    };
    var next = function(inNumSamples) {
      allpass_next(this, inNumSamples, perform_N);
    };
    return ctor;
  })();
  
  cc.unit.specs.AllpassL = (function() {
    var ctor = function() {
      allpass_ctor(this);
      this.process = next;
    };
    var next = function(inNumSamples) {
      allpass_next(this, inNumSamples, perform_L);
    };
    return ctor;
  })();
  
  cc.unit.specs.AllpassC = (function() {
    var ctor = function() {
      allpass_ctor(this);
      this.process = next;
    };
    var next = function(inNumSamples) {
      allpass_next(this, inNumSamples, perform_C);
    };
    return ctor;
  })();
  
  module.exports = {};

});
define('cc/plugins/demand', function(require, exports, module) {

  var cc = require("../cc");

  var isDemandInput = function(unit, index) {
    var fromUnit = unit.fromUnits[index];
    return fromUnit && fromUnit.calcRate === 3;
  };

  var inputDemand = function(unit, index) {
    var fromUnit = unit.fromUnits[index];
    if (fromUnit && fromUnit.calcRate === 3) {
      fromUnit.process(1);
    }
    return unit.inputs[index][0];
  };
  
  var inputDemandA = function(unit, index, offset) {
    var fromUnit = unit.fromUnits[index];
    if (fromUnit) {
      switch (fromUnit.calcRate) {
      case 2:
        return unit.inputs[index][offset-1];
      case 3:
        fromUnit.process(offset);
        /* fall through */
      default:
        return unit.inputs[index][0];
      }
    } else {
      return unit.inputs[index][0];
    }
  };
  
  var resetDemandInput = function(unit, index) {
    var fromUnit = unit.fromUnits[index];
    if (fromUnit && fromUnit.calcRate === 3) {
      fromUnit.process(0);
    }
  };
  
  cc.ugen.specs.Demand = {
    Klass: cc.MultiOutUGen,
    $ar: {
      defaults: "trig=0,reset=0,demandUGens=[]",
      ctor: function(trig, reset, demandUGens) {
        return this.multiNewList([2, trig, reset].concat(demandUGens));
      }
    },
    $kr: {
      defaults: "trig=0,reset=0,demandUGens=[]",
      ctor: function(trig, reset, demandUGens) {
        return this.multiNewList([1, trig, reset].concat(demandUGens));
      }
    },
    init: function() {
      return this.initOutputs(this.inputs.length - 2, this.rate);
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.Demand = (function() {
    var ctor = function() {
      this.process = next;
      this._prevtrig  = 0;
      this._prevreset = 0;
      this._prevout   = new Float32Array(this.numOfOutputs);
    };
    var next = function(inNumSamples) {
      var outputs = this.outputs;
      var inputs  = this.inputs;
      var trigIn  = inputs[0];
      var resetIn = inputs[1];
      var prevout = this._prevout;
      var prevtrig  = this._prevtrig;
      var prevreset = this._prevreset;
      var ztrig, zreset, x;
      var numOfInputs = this.numOfInputs;
      var j, k;
      
      for (var i = 0; i < inNumSamples; ++i) {
        ztrig  = trigIn[i];
        zreset = resetIn[i];
        if (zreset > 0 && prevreset <= 0) {
          for (j = 2; j < numOfInputs; ++j) {
            resetDemandInput(this, j);
          }
        }
        if (ztrig > 0 && prevtrig <= 0) {
          for (j = 2, k = 0; j < numOfInputs; ++j) {
            x = inputDemandA(this, j, i + 1);
            if (isNaN(x)) {
              x = prevout[k];
              this.done = true;
            } else {
              prevout[k] = x;
            }
            outputs[k][i] = x;
          }
        } else {
          for (j = 2, k = 0; j < numOfInputs; ++j) {
            outputs[k][i] = prevout[k];
          }
        }
        prevtrig  = ztrig;
        prevreset = zreset;
      }
      this._prevtrig  = prevtrig;
      this._prevreset = prevreset;
    };
    return ctor;
  })();

  cc.ugen.specs.Dgeom = {
    $new: {
      defaults: "start=1,grow=2,length=Infinity",
      ctor: function(start, grow, length) {
        return this.multiNew(3, length, start, grow);
      }
    }
  };

  cc.unit.specs.Dgeom = (function() {
    var ctor = function() {
      this.process = next;
      this._grow  = 0;
      this._value = 0;
      this.process(0);
    };

    var next = function(inNumSamples) {
      var grow, x;
      if (inNumSamples) {
        grow = inputDemandA(this, 2, inNumSamples);
        if (!isNaN(grow)) {
          this._grow = grow;
        }
        if (this._repeats < 0) {
          x = inputDemandA(this, 0, inNumSamples);
          this._repeats = Math.floor(x); // Infinity|0 -> 0
          this._value   = inputDemandA(this, 1, inNumSamples);
        }
        if (this._repeatCount >= this._repeats) {
          this.outputs[0][0] = NaN;
          return;
        }
        this.outputs[0][0] = this._value;
        this._value *= this._grow;
        this._repeatCount++;
      } else {
        this._repeats = -1;
        this._repeatCount = 0;
      }
    };
    
    return ctor;
  })();

  cc.ugen.specs.Dseries = {
    $new: {
      defaults: "start=1,step=1,length=Infinity",
      ctor: function(start, step, length) {
        return this.multiNew(3, length, start, step);
      }
    }
  };

  cc.unit.specs.Dseries = (function() {
    var ctor = function() {
      this.process = next;
      this._step  = 0;
      this._value = 0;
      this.process(0);
    };

    var next = function(inNumSamples) {
      var step, x;
      if (inNumSamples) {
        step = inputDemandA(this, 2, inNumSamples);
        if (!isNaN(step)) {
          this._step = step;
        }
        if (this._repeats < 0) {
          x = inputDemandA(this, 0, inNumSamples);
          this._repeats = Math.floor(x); // Infinity|0 -> 0
          this._value   = inputDemandA(this, 1, inNumSamples);
        }
        if (this._repeatCount >= this._repeats) {
          this.outputs[0][0] = NaN;
          return;
        }
        this.outputs[0][0] = this._value;
        this._value += this._step;
        this._repeatCount++;
      } else {
        this._repeats = -1;
        this._repeatCount = 0;
      }
    };
    
    return ctor;
  })();

  cc.ugen.specs.Dwhite = {
    $new: {
      defaults: "lo=0,hi=1,length=Infinity",
      ctor: function(lo, hi, length) {
        return this.multiNew(3, length, lo, hi);
      }
    }
  };

  cc.unit.specs.Dwhite = (function() {
    var ctor = function() {
      this.process = next;
      this._lo = 0;
      this._hi = 0;
      this.process(0);
    };

    var next = function(inNumSamples) {
      var lo, hi, x;
      if (inNumSamples) {
        if (this._repeats < 0) {
          x = inputDemandA(this, 0, inNumSamples);
          this._repeats = Math.floor(x); // Infinity|0 -> 0
        }
        if (this._repeatCount >= this._repeats) {
          this.outputs[0][0] = NaN;
          return;
        }
        this._repeatCount++;
        lo = inputDemandA(this, 1, inNumSamples);
        hi = inputDemandA(this, 2, inNumSamples);
        
        if (!isNaN(lo)) { this._lo = lo; }
        if (!isNaN(hi)) { this._hi = hi; }
        this.outputs[0][0] = Math.random() * (this._hi - this._lo) + this._lo;
      } else {
        this._repeats = -1;
        this._repeatCount = 0;
      }
    };
    
    return ctor;
  })();
  
  cc.ugen.specs.Diwhite = {
    $new: {
      defaults: "lo=0,hi=127,length=Infinity",
      ctor: function(lo, hi, length) {
        return this.multiNew(3, length, lo, hi);
      }
    }
  };
  
  cc.unit.specs.Diwhite = (function() {
    var ctor = function() {
      this.process = next;
      this._lo = 0;
      this._hi = 0;
      this.process(0);
    };

    var next = function(inNumSamples) {
      var lo, hi, x;
      if (inNumSamples) {
        if (this._repeats < 0) {
          x = inputDemandA(this, 0, inNumSamples);
          this._repeats = Math.floor(x); // Infinity|0 -> 0
        }
        if (this._repeatCount >= this._repeats) {
          this.outputs[0][0] = NaN;
          return;
        }
        this._repeatCount++;
        lo = inputDemandA(this, 1, inNumSamples);
        hi = inputDemandA(this, 2, inNumSamples);
        
        if (!isNaN(lo)) { this._lo = Math.floor(lo); }
        if (!isNaN(hi)) { this._hi = Math.floor(hi); }
        this.outputs[0][0] = Math.floor((Math.random() * (this._hi - this._lo) + this._lo));
      } else {
        this._repeats = -1;
        this._repeatCount = 0;
      }
    };
    
    return ctor;
  })();
  
  var ListDUGen = {
    $new: {
      defaults: "list=[],repeats=1",
      ctor: function(list, repeats) {
        return this.multiNewList([3, repeats].concat(list));
      }
    }
  };

  cc.ugen.specs.Dser = ListDUGen;

  cc.unit.specs.Dser = (function() {
    var ctor = function() {
      this.process = next;
      this.process(0);
    };

    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var x;
      if (inNumSamples) {
        if (this._repeats < 0) {
          x = inputDemandA(this, 0, inNumSamples);
          this._repeats = isNaN(x) ? 0 : Math.floor(x + 0.5);
        }
        while (true) {
          if (this._index >= this.numOfInputs) {
            this._index = 1;
          }
          if (this._repeatCount >= this._repeats) {
            out[0] = NaN;
            return;
          }
          if (isDemandInput(this, this._index)) {
            if (this._needToResetChild) {
              this._needToResetChild = false;
              resetDemandInput(this, this._index);
            }
            x = inputDemandA(this, this._index, inNumSamples);
            if (isNaN(x)) {
              this._index++;
              this._repeatCount++;
              this._needToResetChild = true;
            } else {
              out[0] = x;
              return;
            }
          } else {
            out[0] = this.inputs[this._index][0];
            this._index++;
            this._repeatCount++;
            this._needToResetChild = true;
            return;
          }
        }
      } else {
        this._repeats = -1;
        this._repeatCount = 0;
        this._needToResetChild = true;
        this._index = 1;
      }
    };

    return ctor;
  })();
  
  cc.ugen.specs.Dseq = ListDUGen;

  cc.unit.specs.Dseq = (function() {
    var ctor = function() {
      this.process = next;
      this.process(0);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var x, attempts;
      if (inNumSamples) {
        if (this._repeats < 0) {
          x = inputDemandA(this, 0, inNumSamples);
          this._repeats = isNaN(x) ? 0 : Math.floor(x + 0.5);
        }
        attempts = 0;
        while (true) {
          if (this._index >= this.numOfInputs) {
            this._index = 1;
            this._repeatCount++;
          }
          if (this._repeatCount >= this._repeats) {
            out[0] = NaN;
            this._index = 1;
            return;
          }
          if (isDemandInput(this, this._index)) {
            if (this._needToResetChild) {
              this._needToResetChild = false;
              resetDemandInput(this, this._index);
            }
            x = inputDemandA(this, this._index, inNumSamples);
            if (isNaN(x)) {
              this._index++;
              this._needToResetChild = true;
            } else {
              out[0] = x;
              return;
            }
          } else {
            out[0] = inputDemandA(this, this._index, inNumSamples);
            this._index++;
            this._needToResetChild = true;
            return;
          }
          if (attempts++ > this.numOfInputs) {
            return;
          }
        }
      } else {
        this._repeats = -1;
        this._repeatCount = 0;
        this._needToResetChild = true;
        this._index = 1;
      }
    };
    return ctor;
  })();

  cc.ugen.specs.Dshuf = ListDUGen;
  
  cc.unit.specs.Dshuf = (function() {
    var ctor = function() {
      this.process = next;
      var indices = new Array(this.numOfInputs - 1);
      for (var i = 0, imax = indices.length; i < imax; ++i) {
        indices[i] = i + 1;
      }
      this._indices = indices.sort(scramble);
      this.process(0);
    };
    var scramble = function() {
      return Math.random() - 0.5;
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var x, attempts;
      if (inNumSamples) {
        if (this._repeats < 0) {
          x = inputDemandA(this, 0, inNumSamples);
          this._repeats = isNaN(x) ? 0 : Math.floor(x + 0.5);
        }
        attempts = 0;
        while (true) {
          if (this._index >= this.numOfInputs - 1) {
            this._index = 0;
            this._repeatCount++;
          }
          if (this._repeatCount >= this._repeats) {
            out[0] = NaN;
            this._index = 0;
            return;
          }
          var index = this._indices[this._index];
          if (isDemandInput(this, index)) {
            if (this._needToResetChild) {
              this._needToResetChild = false;
              resetDemandInput(this, index);
            }
            x = inputDemandA(this, index, inNumSamples);
            if (isNaN(x)) {
              this._index++;
              this._needToResetChild = true;
            } else {
              out[0] = x;
              return;
            }
          } else {
            out[0] = inputDemandA(this, index, inNumSamples);
            this._index++;
            this._needToResetChild = true;
            return;
          }
          if (attempts++ > this.numOfInputs) {
            return;
          }
        }
      } else {
        this._repeats = -1;
        this._repeatCount = 0;
        this._needToResetChild = true;
        this._index = 1;
      }
    };
    return ctor;
  })();

  cc.ugen.specs.Drand = ListDUGen;
  
  cc.unit.specs.Drand = (function() {
    var ctor = function() {
      this.process = next;
      this.process(0);
    };

    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var x;
      if (inNumSamples) {
        if (this._repeats < 0) {
          x = inputDemandA(this, 0, inNumSamples);
          this._repeats = isNaN(x) ? 0 : Math.floor(x + 0.5);
        }
        while (true) {
          if (this._repeatCount >= this._repeats) {
            out[0] = NaN;
            return;
          }
          if (isDemandInput(this, this._index)) {
            if (this._needToResetChild) {
              this._needToResetChild = false;
              resetDemandInput(this, this._index);
            }
            x = inputDemandA(this, this._index, inNumSamples);
            if (isNaN(x)) {
              this._index = ((Math.random() * (this.numOfInputs-1))|0)+1;
              this._repeatCount++;
              this._needToResetChild = true;
            } else {
              out[0] = x;
              return;
            }
          } else {
            out[0] = this.inputs[this._index][0];
            this._index = ((Math.random() * (this.numOfInputs-1))|0)+1;
            this._repeatCount++;
            this._needToResetChild = true;
            return;
          }
        }
      } else {
        this._repeats = -1;
        this._repeatCount = 0;
        this._needToResetChild = true;
        this._index = 1;
      }
    };

    return ctor;
  })();
  
  cc.ugen.specs.Duty = {
    $ar: {
      defaults: "dur=1,reset=0,level=1,doneAction=0",
      ctor: function(dur, reset, level, doneAction) {
        return this.multiNew(2, dur, reset, doneAction, level);
      }
    },
    $kr: {
      defaults: "dur=1,reset=0,level=1,doneAction=0",
      ctor: function(dur, reset, level, doneAction) {
        return this.multiNew(1, dur, reset, doneAction, level);
      }
    }
  };

  var duty_dur        = 0;
  var duty_reset      = 1;
  var duty_doneAction = 2;
  var duty_level      = 3;
  
  cc.unit.specs.Duty = (function() {
    var ctor = function() {
      if (this.inRates[duty_reset] === 2) {
        this.process = next_da;
        this._prevreset = 0;
      } else {
        if (this.inRates[duty_reset] === 3) {
          this.process = next_dd;
          this._prevreset = inputDemand(this, duty_reset) * this.rate.sampleRate;
        } else {
          this.process = next_dk;
          this._prevreset = 0;
        }
      }
      this._count   = inputDemand(this, duty_dur) * this.rate.sampleRate - 1;
      this._prevout = inputDemand(this, duty_level);
      this.outputs[0][0] = this._prevout;
    };
    var next_da = function(inNumSamples) {
      var out = this.outputs[0];
      var resetIn   = this.inputs[duty_reset];
      var prevout   = this._prevout;
      var count     = this._count;
      var prevreset = this._prevreset;
      var sr = this.rate.sampleRate;
      var zreset, x;
      for (var i = 0; i < inNumSamples; ++i) {
        zreset = resetIn[i];
        if (zreset > 0 && prevreset <= 0) {
          resetDemandInput(this, duty_level);
          resetDemandInput(this, duty_dur);
          count = 0;
        }
        if (count <= 0) {
          count = inputDemandA(this, duty_dur, i+1) * sr + count;
          if (isNaN(count)) {
            this.doneAction(this.inputs[3][duty_doneAction]);
          }
          x = inputDemandA(this, duty_level, i + 1);
          if (isNaN(x)) {
            x = prevout;
            this.doneAction(this.inputs[3][duty_doneAction]);
          } else {
            prevout = x;
          }
          out[i] = x;
        } else {
          count--;
          out[i] = prevout;
        }
      }
      this._count     = count;
      this._prevreset = prevreset;
      this._prevout   = prevout;
    };
    var next_dk = function(inNumSamples) {
      var out = this.outputs[0];
      var resetIn   = this.inputs[duty_reset];
      var prevout   = this._prevout;
      var count     = this._count;
      var prevreset = this._prevreset;
      var sr = this.rate.sampleRate;
      var zreset, x;
      zreset = resetIn[0];
      for (var i = 0; i < inNumSamples; ++i) {
        if (zreset > 0 && prevreset <= 0) {
          resetDemandInput(this, duty_level);
          resetDemandInput(this, duty_dur);
          count = 0;
        }
        if (count <= 0) {
          count = inputDemandA(this, duty_dur, i+1) * sr + count;
          if (isNaN(count)) {
            this.doneAction(this.inputs[duty_doneAction][0]);
          }
          x = inputDemandA(this, duty_level, i + 1);
          if (isNaN(x)) {
            x = prevout;
            this.doneAction(this.inputs[duty_doneAction][0]);
          } else {
            prevout = x;
          }
          out[i] = x;
        } else {
          count--;
          out[i] = prevout;
        }
      }
      this._count     = count;
      this._prevreset = prevreset;
      this._prevout   = prevout;
    };
    var next_dd = function(inNumSamples) {
      var out = this.outputs[0];
      var prevout = this._prevout;
      var count   = this._count;
      var reset   = this._prevreset;
      var sr = this.rate.sampleRate;
      var x;
      
      for (var i = 0; i < inNumSamples; ++i) {
        if (reset <= 0) {
          resetDemandInput(this, duty_level);
          resetDemandInput(this, duty_dur);
          count = 0;
          reset = inputDemandA(this, duty_reset, i + 1) * sr + reset;
        } else {
          reset--;
        }
        if (count <= 0) {
          count = inputDemandA(this, duty_dur, i+1) * sr + count;
          if (isNaN(count)) {
            this.doneAction(this.inputs[duty_doneAction][0]);
          }
          x = inputDemandA(this, duty_level, i + 1);
          if (isNaN(x)) {
            x = prevout;
            this.doneAction(this.inputs[duty_doneAction][0]);
          } else {
            prevout = x;
          }
          out[i] = x;
        }
        out[i] = prevout;
        count--;
      }
      this._count     = count;
      this._prevreset = reset;
      this._prevout   = prevout;
    };
    return ctor;
  })();
                        
  
  cc.ugen.specs.TDuty = {
    $ar: {
      defaults: "dur=1,reset=0,level=1,doneAction=0,gapFirst=0",
      ctor: function(dur, reset, level, doneAction, gapFirst) {
        return this.multiNew(2, dur, reset, doneAction, level, gapFirst);
      }
    },
    $kr: {
      defaults: "dur=1,reset=0,level=1,doneAction=0,gapFirst=0",
      ctor: function(dur, reset, level, doneAction, gapFirst) {
        return this.multiNew(1, dur, reset, doneAction, level, gapFirst);
      }
    }
  };

  cc.unit.specs.TDuty = (function() {
    var ctor = function() {
      if (this.inRates[duty_reset] === 2) {
        this.process = next_da;
        this._prevreset = 0;
      } else {
        if (this.inRates[duty_reset] === 3) {
          this.process = next_dd;
          this._prevreset = inputDemand(this, duty_reset) * this.rate.sampleRate;
        } else {
          this.process = next_dk;
          this._prevreset = 0;
        }
      }
      if (this.inputs[4][0]) {
        this._count = inputDemand(this, duty_dur) * this.rate.sampleRate;
      } else {
        this._count = 0;
      }
      this.outputs[0][0] = 0;
    };
    var next_da = function(inNumSamples) {
      var out = this.outputs[0];
      var resetIn = this.inputs[duty_reset];
      var count = this._count;
      var prevreset = this._prevreset;
      var sr = this.rate.sampleRate;
      var zreset, x;
      for (var i = 0; i < inNumSamples; ++i) {
        zreset = resetIn[i];
        if (zreset > 0 && prevreset <= 0) {
          resetDemandInput(this, duty_level);
          resetDemandInput(this, duty_dur);
          count = 0;
        }
        if (count <= 0) {
          count = inputDemandA(this, duty_dur, 1 + 1) * sr + count;
          if (isNaN(count)) {
            this.doneAction(this.inputs[duty_doneAction][0]);
          }
          x = inputDemandA(this, duty_level, i + 1);
          if (isNaN(x)) {
            x = 0;
          }
          out[i] = x;
        } else {
          out[i] = 0;
        }
        count--;
        prevreset = zreset;
      }
      this._count = count;
      this._prevreset = prevreset;
    };
    var next_dk = function(inNumSamples) {
      var out = this.outputs[0];
      var resetIn = this.inputs[duty_reset];
      var count = this._count;
      var prevreset = this._prevreset;
      var sr = this.rate.sampleRate;
      var zreset, x;
      zreset = resetIn[0];
      for (var i = 0; i < inNumSamples; ++i) {
        if (zreset > 0 && prevreset <= 0) {
          resetDemandInput(this, duty_level);
          resetDemandInput(this, duty_dur);
          count = 0;
        }
        if (count <= 0) {
          count = inputDemandA(this, duty_dur, 1 + 1) * sr + count;
          if (isNaN(count)) {
            this.doneAction(this.inputs[duty_doneAction][0]);
          }
          x = inputDemandA(this, duty_level, i + 1);
          if (isNaN(x)) {
            x = 0;
          }
          out[i] = x;
        } else {
          out[i] = 0;
        }
        count--;
        prevreset = zreset;
      }
      this._count = count;
      this._prevreset = prevreset;
    };
    var next_dd = function(inNumSamples) {
      var out = this.outputs[0];
      var count = this._count;
      var reset = this._prevreset;
      var sr = this.rate.sampleRate;
      var x;
      for (var i = 0; i < inNumSamples; ++i) {
        if (reset <= 0) {
          resetDemandInput(this, duty_level);
          resetDemandInput(this, duty_dur);
          count = 0;
          reset = inputDemandA(this, duty_reset, i + 1) * sr + reset;
        } else {
          reset--;
        }
        if (count <= 0) {
          count = inputDemandA(this, duty_dur, 1 + 1) * sr + count;
          if (isNaN(count)) {
            this.doneAction(this.inputs[duty_doneAction][0]);
          }
          x = inputDemandA(this, duty_level, i + 1);
          if (isNaN(x)) {
            x = 0;
          }
          out[i] = x;
        } else {
          out[i] = 0;
        }
        count--;
      }
      this._count = count;
      this._prevreset = reset;
    };
    return ctor;
  })();
  
  module.exports = {};

});
define('cc/plugins/env', function(require, exports, module) {

  var cc = require("../cc");
  
  var kEnvGen_gate        = 0;
  var kEnvGen_levelScale  = 1;
  var kEnvGen_levelBias   = 2;
  var kEnvGen_timeScale   = 3;
  var kEnvGen_doneAction  = 4;
  var kEnvGen_initLevel   = 5;
  var kEnvGen_numStages   = 6;
  var kEnvGen_releaseNode = 7;
  var kEnvGen_loopNode    = 8;
  var kEnvGen_nodeOffset  = 9;
  var shape_Step          = 0;
  var shape_Linear        = 1;
  var shape_Exponential   = 2;
  var shape_Sine          = 3;
  var shape_Welch         = 4;
  var shape_Curve         = 5;
  var shape_Squared       = 6;
  var shape_Cubed         = 7;
  var shape_Sustain       = 9999;
  
  var convertEnv = function(env) {
    return env.asMultichannelArray();
  };
  
  cc.ugen.specs.EnvGen = {
    $ar: {
      defaults: "envelope,gate=1,levelScale=1,levelBias=0,timeScale=1,doneAction=0",
      ctor: function(envelope, gate, levelScale, levelBias, timeScale, doneAction) {
        envelope = convertEnv(envelope)[0]; // TODO: unbubble
        return this.multiNewList([2, gate, levelScale, levelBias, timeScale, doneAction].concat(envelope));
      }
    },
    $kr: {
      defaults: "envelope,gate=1,levelScale=1,levelBias=0,timeScale=1,doneAction=0",
      ctor: function(envelope, gate, levelScale, levelBias, timeScale, doneAction) {
        envelope = convertEnv(envelope)[0]; // TODO: unbubble
        return this.multiNewList([1, gate, levelScale, levelBias, timeScale, doneAction].concat(envelope));
      }
    }
  };

  cc.unit.specs.EnvGen = (function() {
    var ctor = function() {
      if (this.calcRate === 2) {
        this.process = next_ak;
      } else {
        this.process = next_k;
      }
      this._level    = this.inputs[kEnvGen_initLevel][0] * this.inputs[kEnvGen_levelScale][0] + this.inputs[kEnvGen_levelBias][0];
      this._endLevel = this._level;
      this._counter  = 0;
      this._stage    = 1000000000;
      this._prevGate = 0;
      this._released = false;
      this._releaseNode = this.inputs[kEnvGen_releaseNode][0]|0;
      this._a1 = 0;
      this._a2 = 0;
      this._b1 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._grow  = 0;
      this._shape = 0;
      next_k.call(this, 1);
    };
    var next_ak = function(inNumSamples) {
      var out = this.outputs[0];
      var gate = this.inputs[kEnvGen_gate][0];
      var counter  = this._counter;
      var level    = this._level;
      var prevGate = this._prevGate;
      var numstages, doneAction, loopNode;
      var envPtr, stageOffset, endLevel, dur, shape, curve;
      var w, a1, a2, b1, y0, y1, y2, grow;
      var i, j = 0;
      
      var checkGate = true, counterOffset = 0;
      if (prevGate <= 0 && gate > 0) {
        this._stage = -1;
        this._released = false;
        this.done = false;
        counter   = counterOffset;
        checkGate = false;
      } else if (gate <= -1 && prevGate > -1 && !this._released) {
        numstages = this.inputs[kEnvGen_numStages][0]|0;
        dur = -gate - 1;
        counter = Math.max(1, (dur * this.rate.sampleRate)|0) + counterOffset;
        this._stage = numstages;
        this._shape = shape_Linear;
        this._endLevel = this.inputs[this.numOfInputs - 4][0] * this.inputs[kEnvGen_levelScale][0] + this.inputs[kEnvGen_levelBias][0];
        this._grow     = (this._endLevel - level) / counter;
        this._released = true;
        checkGate = true;
      } else if (prevGate > 0 && gate <= 0 && this._releaseNode >= 0 && !this._released) {
        counter = counterOffset;
        this._stage = this._releaseNode - 1;
        this._released = true;
        checkGate = false;
      }
      this._prevGate = gate;
      
      var remain = inNumSamples;
      while (remain) {
        var initSegment = false;
        if (counter === 0) {
          numstages = this.inputs[kEnvGen_numStages][0]|0;
          if (this._stage + 1 >= numstages) {
            counter = Infinity;
            this._shape = 0;
            level = this._endLevel;
            this.done = true;
            doneAction = this.inputs[kEnvGen_doneAction][0]|0;
            this.doneAction(doneAction);
          } else if (this._stage + 1 === this._releaseNode && !this._released) { // sustain stage
            loopNode = this.inputs[kEnvGen_loopNode][0]|0;
            if (loopNode >= 0 && loopNode < numstages) {
              this._stage = loopNode;
              initSegment = true;
            } else {
              counter = Infinity;
              this._shape = shape_Sustain;
              level = this._endLevel;
            }
          } else {
            this._stage += 1;
            initSegment = true;
          }
        }

        if (initSegment) {
          stageOffset = (this._stage << 2) + kEnvGen_nodeOffset;
          if (stageOffset + 4 > this.numOfInputs) {
            // oops;
            return;
          }
          
          envPtr = this.inputs;
          endLevel = envPtr[0+stageOffset][0] * this.inputs[kEnvGen_levelScale][0] + this.inputs[kEnvGen_levelBias][0]; // scale levels
          dur      = envPtr[1+stageOffset][0] * this.inputs[kEnvGen_timeScale ][0];
          shape    = envPtr[2+stageOffset][0]|0;
          curve    = envPtr[3+stageOffset][0];
          this._endLevel = endLevel;
          this._shape    = shape;
          
          counter = Math.max(1, (dur * this.rate.sampleRate)|0);
          if (counter === 1) {
            this._shape = shape_Linear;
          }
          switch (this._shape) {
          case shape_Step:
            level = endLevel;
            break;
          case shape_Linear:
            this._grow = (endLevel - level) / counter;
            break;
          case shape_Exponential:
            if (Math.abs(level) < 1e-6) {
              level = 1e-6;
            }
            this._grow = Math.pow(endLevel / level, 1 / counter);
            break;
          case shape_Sine:
            w = Math.PI / counter;
            this._a2 = (endLevel + level) * 0.5;
            this._b1 = 2 * Math.cos(w);
            this._y1 = (endLevel - level) * 0.5;
            this._y2 = this._y1 * Math.sin(Math.PI * 0.5 - w);
            level = this._a2 - this._y1;
            break;
          case shape_Welch:
            w = (Math.PI * 0.5) / counter;
            this._b1 = 2 * Math.cos(w);
            if (endLevel >= level) {
              this._a2 = level;
              this._y1 = 0;
              this._y2 = -Math.sin(w) * (endLevel - level);
            } else {
              this._a2 = endLevel;
              this._y1 = level - endLevel;
              this._y2 = Math.cos(w) * (level - endLevel);
            }
            level = this._a2 + this._y1;
            break;
          case shape_Curve:
            if (Math.abs(curve) < 0.001) {
              this._shape = shape_Linear;
              this._grow = (endLevel - level) / counter;
            } else {
              a1 = (endLevel - level) / (1.0 - Math.exp(curve));
              this._a2 = level + a1;
              this._b1 = a1;
              this._grow = Math.exp(curve / counter);
            }
            break;
          case shape_Squared:
            this._y1 = Math.sqrt(level);
            this._y2 = Math.sqrt(endLevel);
            this._grow = (this._y2 - this._y1) / counter;
            break;
          case shape_Cubed:
            this._y1 = Math.pow(level   , 0.33333333);
            this._y2 = Math.pow(endLevel, 0.33333333);
            this._grow = (this._y2 - this._y1) / counter;
            break;
          }
        }
        
        var nsmps = Math.min(remain, counter);
        
        grow = this._grow;
        a2 = this._a2;
        b1 = this._b1;
        y1 = this._y1;
        y2 = this._y2;

        switch (this._shape) {
        case shape_Step:
          for (i = 0; i < nsmps; ++i) {
            out[j++] = level;
          }
          break;
        case shape_Linear:
          for (i = 0; i < nsmps; ++i) {
            out[j++] = level;
            level += grow;
          }
          break;
        case shape_Exponential:
          for (i = 0; i < nsmps; ++i) {
            out[j++] = level;
            level *= grow;
          }
          break;
        case shape_Sine:
          for (i = 0; i < nsmps; ++i) {
            out[j++] = level;
            y0 = b1 * y1 - y2;
            level = a2 - y0;
            y2 = y1;
            y1 = y0;
          }
          break;
        case shape_Welch:
          for (i = 0; i < nsmps; ++i) {
            out[j++] = level;
            y0 = b1 * y1 - y2;
            level = a2 + y0;
            y2 = y1;
            y1 = y0;
          }
          break;
        case shape_Curve:
          for (i = 0; i < nsmps; ++i) {
            out[j++] = level;
            b1 *= grow;
            level = a2 - b1;
          }
          break;
        case shape_Squared:
          for (i = 0; i < nsmps; ++i) {
            out[j++] = level;
            y1 += grow;
            level = y1 * y1;
          }
          break;
        case shape_Cubed:
          for (i = 0; i < nsmps; ++i) {
            out[j++] = level;
            y1 += grow;
            level = y1 * y1 * y1;
          }
          break;
        case shape_Sustain:
          for (i = 0; i < nsmps; ++i) {
            out[j++] = level;
          }
          break;
        }
        remain  -= nsmps;
        counter -= nsmps;
      }
      this._level   = level;
      this._counter = counter;
      this._a2 = a2;
      this._b1 = b1;
      this._y1 = y1;
      this._y2 = y2;
    };
    var next_k = function() {
      var out = this.outputs[0];
      var gate = this.inputs[kEnvGen_gate][0];
      var counter  = this._counter;
      var level    = this._level;
      var prevGate = this._prevGate;
      var numstages, doneAction, loopNode;
      var envPtr, stageOffset, endLevel, dur, shape, curve;
      var w, a1, a2, b1, y0, y1, y2, grow;
      
      var checkGate = true, counterOffset = 0;
      if (prevGate <= 0 && gate > 0) {
        this._stage = -1;
        this._released = false;
        this.done = false;
        counter   = counterOffset;
        checkGate = false;
      } else if (gate <= -1 && prevGate > -1 && !this._released) {
        numstages = this.inputs[kEnvGen_numStages][0]|0;
        dur = -gate - 1;
        counter = Math.max(1, (dur * this.rate.sampleRate)|0) + counterOffset;
        this._stage = numstages;
        this._shape = shape_Linear;
        this._endLevel = this.inputs[this.numOfInputs - 4][0] * this.inputs[kEnvGen_levelScale][0] + this.inputs[kEnvGen_levelBias][0];
        this._grow     = (this._endLevel - level) / counter;
        this._released = true;
        checkGate = true;
      } else if (prevGate > 0 && gate <= 0 && this._releaseNode >= 0 && !this._released) {
        counter = counterOffset;
        this._stage = this._releaseNode - 1;
        this._released = true;
        checkGate = false;
      }
      this._prevGate = gate;
      
      var initSegment = false;
      if (counter <= 0) {
        numstages = this.inputs[kEnvGen_numStages][0]|0;
        if (this._stage + 1 >= numstages) {
          counter = Infinity;
          this._shape = 0;
          level = this._endLevel;
          this.done = true;
          doneAction = this.inputs[kEnvGen_doneAction][0]|0;
          this.doneAction(doneAction);
        } else if (this._stage + 1 === this._releaseNode && !this._released) { // sustain stage
          loopNode = this.inputs[kEnvGen_loopNode][0]|0;
          if (loopNode >= 0 && loopNode < numstages) {
            this._stage = loopNode;
            initSegment = true;
          } else {
            counter = Infinity;
            this._shape = shape_Sustain;
            level = this._endLevel;
          }
        } else {
          this._stage += 1;
          initSegment = true;
        }
      }

      if (initSegment) {
        stageOffset = (this._stage << 2) + kEnvGen_nodeOffset;
        if (stageOffset + 4 > this.numOfInputs) {
          // oops;
          return;
        }
        
        envPtr = this.inputs;
        endLevel = envPtr[0+stageOffset][0] * this.inputs[kEnvGen_levelScale][0] + this.inputs[kEnvGen_levelBias][0]; // scale levels
        dur      = envPtr[1+stageOffset][0] * this.inputs[kEnvGen_timeScale ][0];
        shape    = envPtr[2+stageOffset][0]|0;
        curve    = envPtr[3+stageOffset][0];
        this._endLevel = endLevel;
        this._shape    = shape;
        
        counter = Math.max(1, (dur * this.rate.sampleRate)|0);
        if (counter === 1) {
          this._shape = shape_Linear;
        }
        switch (this._shape) {
        case shape_Step:
          level = endLevel;
          break;
        case shape_Linear:
          this._grow = (endLevel - level) / counter;
          break;
        case shape_Exponential:
          if (Math.abs(level) < 1e-6) {
            level = 1e-6;
          }
          this._grow = Math.pow(endLevel / level, 1 / counter);
          break;
        case shape_Sine:
          w = Math.PI / counter;
          this._a2 = (endLevel + level) * 0.5;
          this._b1 = 2 * Math.cos(w);
          this._y1 = (endLevel - level) * 0.5;
          this._y2 = this._y1 * Math.sin(Math.PI * 0.5 - w);
          level = this._a2 - this._y1;
          break;
        case shape_Welch:
          w = (Math.PI * 0.5) / counter;
          this._b1 = 2 * Math.cos(w);
          if (endLevel >= level) {
            this._a2 = level;
            this._y1 = 0;
            this._y2 = -Math.sin(w) * (endLevel - level);
          } else {
            this._a2 = endLevel;
            this._y1 = level - endLevel;
            this._y2 = Math.cos(w) * (level - endLevel);
          }
          level = this._a2 + this._y1;
          break;
        case shape_Curve:
          if (Math.abs(curve) < 0.001) {
            this._shape = shape_Linear;
            this._grow = (endLevel - level) / counter;
          } else {
            a1 = (endLevel - level) / (1.0 - Math.exp(curve));
            this._a2 = level + a1;
            this._b1 = a1;
            this._grow = Math.exp(curve / counter);
          }
          break;
        case shape_Squared:
          this._y1 = Math.sqrt(level);
          this._y2 = Math.sqrt(endLevel);
          this._grow = (this._y2 - this._y1) / counter;
          break;
        case shape_Cubed:
          this._y1 = Math.pow(level   , 0.33333333);
          this._y2 = Math.pow(endLevel, 0.33333333);
          this._grow = (this._y2 - this._y1) / counter;
          break;
        }
      }

      grow = this._grow;
      a2 = this._a2;
      b1 = this._b1;
      y1 = this._y1;
      y2 = this._y2;
      
      switch (this._shape) {
      case shape_Step:
        break;
      case shape_Linear:
        level += grow;
        break;
      case shape_Exponential:
        level *= grow;
        break;
      case shape_Sine:
        y0 = b1 * y1 - y2;
        level = a2 - y0;
        y2 = y1;
        y1 = y0;
        break;
      case shape_Welch:
        y0 = b1 * y1 - y2;
        level = a2 + y0;
        y2 = y1;
        y1 = y0;
        break;
      case shape_Curve:
        b1 *= grow;
        level = a2 - b1;
        break;
      case shape_Squared:
        y1 += grow;
        level = y1 * y1;
        break;
      case shape_Cubed:
        y1 += grow;
        level = y1 * y1 * y1;
        break;
      case shape_Sustain:
        break;
      }
      out[0] = level;
      this._level   = level;
      this._counter = counter - 1;
      this._a2 = a2;
      this._b1 = b1;
      this._y1 = y1;
      this._y2 = y2;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Linen = {
    $kr: {
      defaults: "gate=1,attackTime=0.01,susLevel=1,releaseTime=1,doneAction=0",
      ctor: function(gate, attackTime, susLevel, releaseTime, doneAction) {
        return this.multiNew(1, gate, attackTime, susLevel, releaseTime, doneAction);
      }
    }
  };

  cc.unit.specs.Linen = (function() {
    var ctor = function() {
      this.process = next;
      this._level  = 0;
      this._stage  = 4;
      this._prevGate = 0;
      this._slope    = 0;
      this._counter  = 0;
      this.process(1);
    };
    var next = function() {
      var out  = this.outputs[0];
      var gate = this.inputs[0][0];
      var attackTime, susLevel, releaseTime;
      var counter;
      
      if (this._prevGate <= 0 && gate > 0) {
        this.done = false;
        this._stage = 0;
        attackTime = this.inputs[1][0];
        susLevel   = this.inputs[2][0];
        counter = Math.max(1, (attackTime * this.rate.sampleRate)|0);
        this._slope = (susLevel - this._level) / counter;
        this._counter = counter;
      }
      switch (this._stage) {
      case 0:
      case 2:
        out[0] = this._level;
        this._level += this._slope;
        if (--this._counter === 0) {
          this._stage++;
        }
        break;
      case 1:
        out[0] = this._level;
        if (gate <= -1) {
          this._stage = 2;
          releaseTime = -gate - 1;
          counter = Math.max(1, (releaseTime * this.rate.sampleRate)|0);
          this._slope = (-this._level) / counter;
          this._counter = counter;
        } else if (gate <= 0) {
          this._stage = 2;
          releaseTime = this.inputs[3][0];
          counter = Math.max(1, (releaseTime * this.rate.sampleRate)|0);
          this._slope = (-this._level) / counter;
          this._counter = counter;
        }
        break;
      case 3:
        out[0] = 0;
        this.done = true;
        this._stage++;
        this.doneAction(this.inputs[4][0]);
        break;
      case 4:
        out[0] = 0;
        break;
      }
      this._prevGate = gate;
    };
    return ctor;
  })();

  cc.ugen.specs.Free = {
    $kr: {
      defaults: "trig=0,id=0",
      ctor: function(trig, id) {
        return this.multiNew(1, trig, id);
      }
    }
  };
  
  cc.unit.specs.Free = (function() {
    var ctor = function() {
      this.process = next;
      this._prevtrig = 0;
      this.process(1);
    };
    var next = function(inNumSamples, instance) {
      var trig = this.inputs[0][0];
      var id, node;
      if (trig > 0 && this._prevtrig <= 0) {
        id = this.inputs[1][0]|0;
        if (id) { // 0 is ignored
          node = instance.nodes[id];
          if (node) {
            node.end();
          }
        }
      }
      this._prevtrig = trig;
      this.outputs[0][0] = trig;
    };
    return ctor;
  })();

  cc.ugen.specs.FreeSelf = {
    $kr: {
      defaults: "in=0",
      ctor: function(_in) {
        return this.multiNew(1, _in);
      }
    }
  };

  cc.unit.specs.FreeSelf = (function() {
    var ctor = function() {
      this.process = next;
      this._prevtrig = 0;
      this.process(1);
    };
    var next = function() {
      var trig = this.inputs[0][0];
      if (trig > 0 && this._prevtrig <= 0) {
        this.parent.end();
      }
      this._prevtrig = trig;
      this.outputs[0][0] = trig;
    };
    return ctor;
  })();
  
  cc.ugen.specs.FreeSelfWhenDone = {
    $kr: {
      defaults: "src=0",
      ctor: function(src) {
        return this.multiNew(1, src);
      }
    }
  };

  cc.unit.specs.FreeSelfWhenDone = (function() {
    var ctor = function() {
      this.process = next;
      this._src = this.fromUnits[0];
      this.process(1);
    };
    var next = function() {
      var src = this._src;
      if (src && src.done) {
        this.parent.end();
        this.process = clear;
      }
      this.outputs[0][0] = this.inputs[0][0];
    };
    var clear = function() {
      this.outputs[0][0] = 0;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Pause = {
    $kr: {
      defaults: "gate=0,id=0",
      ctor: function(gate, id) {
        return this.multiNew(1, gate, id);
      }
    }
  };

  cc.unit.specs.Pause = (function() {
    var ctor = function() {
      this.process = next;
      this._state = 1;
      this.outputs[0][0] = this.inputs[0][0];
    };
    var next = function(inNumSamples, instance) {
      var _in = this.inputs[0][0];
      var state = (_in === 0) ? 0 : 1;
      var id, node;
      if (state !== this._state) {
        this._state = state;
        id = this.inputs[1][0]|0;
        if (id) { // 0 is ignored
          node = instance.nodes[id];
          if (node) {
            node.run(state);
          }
        }
      }
      this.outputs[0][0] = _in;
    };
    return ctor;
  })();

  cc.ugen.specs.PauseSelf = {
    $kr: {
      defaults: "in=0",
      ctor: function(_in) {
        return this.multiNew(1, _in);
      }
    }
  };

  cc.unit.specs.PauseSelf = (function() {
    var ctor = function() {
      this.process = next;
      this._prevtrig = 0;
      this.process(1);
    };
    var next = function() {
      var _in = this.inputs[0][0];
      if (_in > 0 && this._prevtrig <= 0) {
        this.parent.run(0);
      }
      this._prevtrig = _in;
      this.outputs[0][0] = _in;
    };
    return ctor;
  })();

  cc.ugen.specs.PauseSelfWhenDone = {
    $kr: {
      defaults: "src=0",
      ctor: function(src) {
        return this.multiNew(1, src);
      }
    }
  };
  
  cc.unit.specs.PauseSelfWhenDone = (function() {
    var ctor = function() {
      this.process = next;
      this._src = this.fromUnits[0];
      this.process(1);
    };
    var next = function() {
      var src = this._src;
      if (src && src.done) {
        this.parent.run(0);
        this.process = clear;
      }
      this.outputs[0][0] = this.inputs[0][0];
    };
    var clear = function() {
      this.outputs[0][0] = 0;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Done = {
    $kr: {
      defaults: "src=0",
      ctor: function(src) {
        return this.multiNew(1, src);
      }
    }
  };

  cc.unit.specs.Done = (function() {
    var ctor = function() {
      this.process = next;
      this._src = this.fromUnits[0];
      this.process(1);
    };
    var next = function() {
      var src = this._src;
      this.outputs[0][0] = src && src.done ? 1 : 0;
    };
    return ctor;
  })();

  
  
  module.exports = {};

});
define('cc/plugins/filter', function(require, exports, module) {

  var cc = require("../cc");
  var utils = require("./utils");
  var zapgremlins = utils.zapgremlins;
  var log001 = Math.log(0.001);
  var sqrt2  = Math.sqrt(2);

  var do_next_1 = function(unit, next) {
    var tmp_floops  = unit.rate.filterLoops;
    var tmp_framain = unit.rate.filterRemain;
    unit.rate.filterLoops  = 0;
    unit.rate.filterRemain = 1;
    next.call(unit, 1);
    unit.rate.filterLoops  = tmp_floops;
    unit.rate.filterRemain = tmp_framain;
  };
  
  cc.ugen.specs.Resonz = {
    $ar: {
      defaults: "in=0,freq=440,bwr=1,mul=1,add=0",
      ctor: function(_in, freq, bwr, mul, add) {
        return this.multiNew(2, _in, freq, bwr).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,freq=440,bwr=1,mul=1,add=0",
      ctor: function(_in, freq, bwr, mul, add) {
        return this.multiNew(1, _in, freq, bwr).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.Resonz = (function() {
    var ctor = function() {
      this.process = next;
      this._a0 = 0;
      this._b1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq = undefined;
      this._rq   = 0;
      do_next_1(this, next);
    };
    var next = function() {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var freq = this.inputs[1][0];
      var rq   = this.inputs[2][0];
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var b1 = this._b1;
      var b2 = this._b2;
      var rate = this.rate;
      var i, j = 0;
      if (freq !== this._freq || rq !== this._rq) {
        var ffreq = freq * rate.radiansPerSample;
        var B = ffreq * rq;
        var R = 1 - B * 0.5;
        var twoR = 2 * R;
        var R2 = R * R;
        var cost = (twoR * Math.cos(ffreq)) / (1 + R2);
        var b1_next = twoR * cost;
        var b2_next = -R2;
        var a0_next = (1 - R2) * 0.5;
        var filterSlope = rate.filterSlope;
        var a0_slope = (a0_next - a0) * filterSlope;
        var b1_slope = (b1_next - b1) * filterSlope;
        var b2_slope = (b2_next - b2) * filterSlope;
        for (i = rate.filterLoops; i--; ) {
          y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = a0 * (y0 - y2);
          y2 = inIn[j] + b1 * y0 + b2 * y1; out[j++] = a0 * (y2 - y1);
          y1 = inIn[j] + b1 * y2 + b2 * y0; out[j++] = a0 * (y1 - y0);
          a0 += a0_slope;
          b1 += b1_slope;
          b1 += b2_slope;
        }
        this._freq = freq;
        this._rq = rq;
        this._a0 = a0_next;
        this._b1 = b1_next;
        this._b2 = b2_next;
      } else {
        for (i = rate.filterLoops; i--; ) {
          y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = a0 * (y0 - y2);
          y2 = inIn[j] + b1 * y0 + b2 * y1; out[j++] = a0 * (y2 - y1);
          y1 = inIn[j] + b1 * y2 + b2 * y0; out[j++] = a0 * (y1 - y0);
        }
      }
      for (i = rate.filterRemain; i--; ) {
        y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = a0 * (y0 - y2);
        y2 = y1;
        y1 = y0;
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
    };
    return ctor;
  })();
  
  cc.ugen.specs.OnePole = {
    $ar: {
      defaults: "in=0,coef=0.5,mul=1,add=0",
      ctor: function(_in, coef, mul, add) {
        return this.multiNew(2, _in, coef).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,coef=0.5,mul=1,add=0",
      ctor: function(_in, coef, mul, add) {
        return this.multiNew(1, _in, coef).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.OnePole = (function() {
    var ctor = function() {
      this.process = next;
      this._b1 = this.inputs[1][0];
      this._y1 = 0;
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var b1   = this._b1;
      var y1   = this._y1;
      var next_b1 = Math.max(-1, Math.min(this.inputs[1][0], 1));
      var y0, i;
      if (b1 !== next_b1) {
        var b1_slope = (next_b1 - b1) * this.rate.slopeFactor;
        if (b1 > 0 && next_b1 >= 0) {
          for (i = 0; i < inNumSamples; ++i) {
            y0 = inIn[i]; out[i] = y1 = y0 + b1 * (y1 - y0);
            b1 += b1_slope;
          }
        } else if (b1 <= 0 && next_b1 <= 0) {
          for (i = 0; i < inNumSamples; ++i) {
            y0 = inIn[i]; out[i] = y1 = y0 + b1 * (y1 + y0);
            b1 += b1_slope;
          }
        } else {
          for (i = 0; i < inNumSamples; ++i) {
            y0 = inIn[i]; out[i] = y1 = (1 - Math.abs(b1)) * y0 + b1 * y1;
            b1 += b1_slope;
          }
        }
        this._b1 = next_b1;
      } else {
        if (b1 >= 0) {
          for (i = 0; i < inNumSamples; ++i) {
            y0 = inIn[i]; out[i] = y1 = y0 + b1 * (y1 - y0);
          }
        } else {
          for (i = 0; i < inNumSamples; ++i) {
            y0 = inIn[i]; out[i] = y1 = y0 + b1 * (y1 + y0);
          }
        }
      }
      this._y1 = zapgremlins(y1);
    };
    return ctor;
  })();
  
  cc.ugen.specs.OneZero = cc.ugen.specs.OnePole;

  cc.unit.specs.OneZero = (function() {
    var ctor = function() {
      this.process = next;
      this._b1 = this.inputs[1][0];
      this._x1 = this.inputs[0][0];
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var b1   = this._b1;
      var x1   = this._x1;
      var next_b1 = Math.max(-1, Math.min(this.inputs[1][0], 1));
      var x0, i;
      if (b1 !== next_b1) {
        var b1_slope = (next_b1 - b1) * this.rate.slopeFactor;
        if (b1 >= 0 && next_b1 >= 0) {
          for (i = 0; i < inNumSamples; ++i) {
            x0 = inIn[i]; out[i] = x0 + b1 * (x1 - x0);
            x1 = x0;
            b1 += b1_slope;
          }
        } else if (b1 <= 0 && next_b1 <= 0) {
          for (i = 0; i < inNumSamples; ++i) {
            x0 = inIn[i]; out[i] = x0 + b1 * (x1 + x0);
            x1 = x0;
            b1 += b1_slope;
          }
        } else {
          for (i = 0; i < inNumSamples; ++i) {
            x0 = inIn[i]; out[i] = (1 - Math.abs(b1)) * x0 + b1 * x1;
            x1 = x0;
            b1 += b1_slope;
          }
        }
        this._b1 = next_b1;
      } else {
        if (b1 >= 0) {
          for (i = 0; i < inNumSamples; ++i) {
            x0 = inIn[i]; out[i] = x0 + b1 * (x1 - x0);
            x1 = x0;
          }
        } else {
          for (i = 0; i < inNumSamples; ++i) {
            x0 = inIn[i]; out[i] = x0 + b1 * (x1 + x0);
            x1 = x0;
          }
        }
      }
      this._x1 = x1;
    };
    return ctor;
  })();
  
  cc.ugen.specs.TwoPole = {
    $ar: {
      defaults: "in=0,freq=440,radius=0.8,mul=1,add=0",
      ctor: function(_in, freq, radius, mul, add) {
        return this.multiNew(2, _in, freq, radius).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,freq=440,radius=0.8,mul=1,add=0",
      ctor: function(_in, freq, radius, mul, add) {
        return this.multiNew(1, _in, freq, radius).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.TwoPole = (function() {
    var ctor = function() {
      this.process = next;
      this._b1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq  = undefined;
      this._reson = undefined;
      do_next_1(this, next);
    };
    var next = function() {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var freq  = this.inputs[1][0];
      var reson = Math.max(0, Math.min(this.inputs[2][0], 1));
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var b1 = this._b1;
      var b2 = this._b2;
      var rate = this.rate;
      var i, j = 0;
      if (freq !== this._freq || reson !== this._reson) {
        var b1_next = 2 * reson * Math.cos(freq * rate.radiansPerSample);
        var b2_next = -(reson * reson);
        var b1_slope = (b1_next - b1) * rate.filterSlope;
        var b2_slope = (b2_next - b2) * rate.filterSlope;
        for (i = rate.filterLoops; i--; ) {
          y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = y0;
          y2 = inIn[j] + b1 * y0 + b2 * y1; out[j++] = y2;
          y1 = inIn[j] + b1 * y2 + b2 * y0; out[j++] = y1;
          b1 += b1_slope;
          b2 += b2_slope;
        }
        this._freq  = freq;
        this._reson = reson;
        this._b1 = b1_next;
        this._b2 = b2_next;
      } else {
        for (i = rate.filterLoops; i--; ) {
          y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = y0;
          y2 = inIn[j] + b1 * y0 + b2 * y1; out[j++] = y2;
          y1 = inIn[j] + b1 * y2 + b2 * y0; out[j++] = y1;
        }
      }
      for (i = rate.filterRemain; i--; ) {
        y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = y0;
        y2 = y1;
        y1 = y0;
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
    };
    return ctor;
  })();
  
  cc.ugen.specs.TwoZero = cc.ugen.specs.TwoPole;

  cc.unit.specs.TwoZero = (function() {
    var ctor = function() {
      this.process = next;
      this._b1 = 0;
      this._b2 = 0;
      this._x1 = 0;
      this._x2 = 0;
      this._freq  = undefined;
      this._reson = undefined;
      do_next_1(this, next);
    };
    var next = function() {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var freq  = this.inputs[1][0];
      var reson = Math.max(0, Math.min(this.inputs[2][0], 1));
      var x0;
      var b1 = this._b1;
      var b2 = this._b2;
      var x1 = this._x1;
      var x2 = this._x2;
      var rate = this.rate;
      var i, j = 0;
      if (freq !== this._freq || reson !== this._reson) {
        var b1_next = -2 * reson * Math.cos(freq * rate.radiansPerSample);
        var b2_next = (reson * reson);
        var b1_slope = (b1_next - b1) * rate.filterSlope;
        var b2_slope = (b2_next - b2) * rate.filterSlope;
        for (i = rate.filterLoops; i--; ) {
          x0 = inIn[j]; out[j++] = x0 + b1 * x1 + b2 * x2;
          x2 = inIn[j]; out[j++] = x2 + b1 * x0 + b2 * x1;
          x1 = inIn[j]; out[j++] = x1 + b1 * x2 + b2 * x0;
          b1 += b1_slope;
          b2 += b2_slope;
        }
        this._freq  = freq;
        this._reson = reson;
        this._b1    = b1_next;
        this._b2    = b2_next;
      } else {
        for (i = rate.filterLoops; i--; ) {
          x0 = inIn[j]; out[j++] = x0 + b1 * x1 + b2 * x2;
          x2 = inIn[j]; out[j++] = x2 + b1 * x0 + b2 * x1;
          x1 = inIn[j]; out[j++] = x1 + b1 * x2 + b2 * x0;
        }
      }
      for (i = rate.filterRemain; i--; ) {
        x0 = inIn[j]; out[j++] = x0 + b1 * x1 + b2 * x2;
        x2 = x1;
        x1 = x0;
      }
      this._x1 = x1;
      this._x2 = x2;
    };
    return ctor;
  })();
  
  cc.ugen.specs.APF = {
    $ar: {
      defaults: "in=0,freq=440,radius=0.8,mul=1,add=0",
      ctor: function(_in, freq, radius, mul, add) {
        return this.multiNew(2, _in, freq, radius).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,freq=440,radius=0.8,mul=1,add=0",
      ctor: function(_in, freq, radius, mul, add) {
        return this.multiNew(1, _in, freq, radius).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.APF = (function() {
    var ctor = function() {
      this.process = next;
      this._b1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._x1 = 0;
      this._x2 = 0;
      this._freq  = undefined;
      this._reson = undefined;
      do_next_1(this, next);
    };
    var next = function() {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var freq  = this.inputs[1][0];
      var reson = Math.max(0, Math.min(this.inputs[2][0], 1));
      var x0;
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var x1 = this._x1;
      var x2 = this._x2;
      var b1 = this._b1;
      var b2 = this._b2;
      var rate = this.rate;
      var i, j = 0;
      if (freq !== this._freq && reson !== this._reson) {
        var b1_next = 2 * reson * Math.cos(freq * rate.radiansPerSample);
        var b2_next = -(reson * reson);
        var b1_slope = (b1_next - b1) * rate.filterSlope;
        var b2_slope = (b2_next - b2) * rate.filterSlope;
        for (i = rate.filterLoops; i--; ) {
          x0 = inIn[j]; out[j++] = y0 = x0 + b1 * (y1 - x1) + b2 * (y2 - x2);
          x1 = inIn[j]; out[j++] = y2 = x2 + b1 * (y0 - x0) + b2 * (y2 - x1);
          x2 = inIn[j]; out[j++] = y1 = x1 + b1 * (y2 - x2) + b2 * (y2 - x0);
          b1 += b1_slope;
          b2 += b2_slope;
        }
        this._freq  = freq;
        this._reson = reson;
        this._b1 = b1_next;
        this._b2 = b2_next;
      } else {
        for (i = rate.filterLoops; i--; ) {
          x0 = inIn[j]; out[j++] = y0 = x0 + b1 * (y1 - x1) + b2 * (y2 - x2);
          x1 = inIn[j]; out[j++] = y2 = x2 + b1 * (y0 - x0) + b2 * (y2 - x1);
          x2 = inIn[j]; out[j++] = y1 = x1 + b1 * (y2 - x2) + b2 * (y2 - x0);
        }
      }
      for (i = rate.filterRemain; i--; ) {
        x0 = inIn[j]; out[j++] = y0 = x0 + b1 * (y1 - x1) + b2 * (y2 - x2);
        y2 = y1;
        y1 = y0;
        x2 = x1;
        x1 = x0;
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
      this._x1 = x1;
      this._x2 = x2;
    };
    return ctor;
  })();
  
  cc.ugen.specs.LPF = {
    $ar: {
      defaults: "in=0,freq=440,mul=1,add=0",
      ctor: function(_in, freq, mul, add) {
        return this.multiNew(2, _in, freq).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,freq=440,mul=1,add=0",
      ctor: function(_in, freq, mul, add) {
        return this.multiNew(1, _in, freq).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.LPF = (function() {
    var ctor = function() {
      this.process = next;
      this._a0 = 0;
      this._b1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq  = undefined;
      do_next_1(this, next);
    };
    var next = function() {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var freq = Math.max(0.001, this.inputs[1][0]);
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var b1 = this._b1;
      var b2 = this._b2;
      var rate = this.rate;
      var i, j = 0;
      if (freq !== this._freq) {
        var pfreq = freq * rate.radiansPerSample * 0.5;
        var C = 1 / Math.tan(pfreq);
        var C2 = C * C;
        var sqrt2C = C * sqrt2;
        var next_a0 = 1 / (1 + sqrt2C + C2);
        var next_b1 = -2 * (1 - C2) * next_a0;
        var next_b2 = -(1 - sqrt2C + C2) * next_a0;
        var a0_slope = (next_a0 - a0) * rate.filterSlope;
        var b1_slope = (next_b1 - b1) * rate.filterSlope;
        var b2_slope = (next_b2 - b2) * rate.filterSlope;
        for (i = rate.filterLoops; i--; ) {
          y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = a0 * (y0 + 2 * y1 + y2);
          y2 = inIn[j] + b1 * y0 + b2 * y1; out[j++] = a0 * (y2 + 2 * y0 + y1);
          y1 = inIn[j] + b1 * y2 + b2 * y0; out[j++] = a0 * (y1 + 2 * y2 + y0);
          a0 += a0_slope;
          b1 += b1_slope;
          b2 += b2_slope;
        }
        this._freq = freq;
        this._a0 = next_a0;
        this._b1 = next_b1;
        this._b2 = next_b2;
      } else {
        for (i = rate.filterLoops; i--; ) {
          y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = a0 * (y0 + 2 * y1 + y2);
          y2 = inIn[j] + b1 * y0 + b2 * y1; out[j++] = a0 * (y2 + 2 * y0 + y1);
          y1 = inIn[j] + b1 * y2 + b2 * y0; out[j++] = a0 * (y1 + 2 * y2 + y0);
        }
      }
      for (i = rate.filterRemain; i--; ) {
        y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = a0 * (y0 + 2 * y1 + y2);
        y2 = y1;
        y1 = y0;
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
    };
    return ctor;
  })();
  
  cc.ugen.specs.HPF = cc.ugen.specs.LPF;

  cc.unit.specs.HPF = (function() {
    var ctor = function() {
      this.process = next;
      this._a0 = 0;
      this._b1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq  = undefined;
      do_next_1(this, next);
    };
    var next = function() {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var freq = this.inputs[1][0];
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var b1 = this._b1;
      var b2 = this._b2;
      var rate = this.rate;
      var i, j = 0;
      if (freq !== this._freq) {
        var pfreq = freq * rate.radiansPerSample * 0.5;
        var C = Math.tan(pfreq);
        var C2 = C * C;
        var sqrt2C = C * sqrt2;
        var next_a0 = 1 / (1 + sqrt2C + C2);
        var next_b1 = 2 * (1 - C2) * next_a0;
        var next_b2 = -(1 - sqrt2C + C2) * next_a0;
        var a0_slope = (next_a0 - a0) * rate.filterSlope;
        var b1_slope = (next_b1 - b1) * rate.filterSlope;
        var b2_slope = (next_b2 - b2) * rate.filterSlope;
        for (i = rate.filterLoops; i--; ) {
          y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = a0 * (y0 - 2 * y1 + y2);
          y2 = inIn[j] + b1 * y0 + b2 * y1; out[j++] = a0 * (y2 - 2 * y0 + y1);
          y1 = inIn[j] + b1 * y2 + b2 * y0; out[j++] = a0 * (y1 - 2 * y2 + y0);
          a0 += a0_slope;
          b1 += b1_slope;
          b2 += b2_slope;
        }
        this._freq = freq;
        this._a0 = next_a0;
        this._b1 = next_b1;
        this._b2 = next_b2;
      } else {
        for (i = rate.filterLoops; i--; ) {
          y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = a0 * (y0 - 2 * y1 + y2);
          y2 = inIn[j] + b1 * y0 + b2 * y1; out[j++] = a0 * (y2 - 2 * y0 + y1);
          y1 = inIn[j] + b1 * y2 + b2 * y0; out[j++] = a0 * (y1 - 2 * y2 + y0);
        }
      }
      for (i = rate.filterRemain; i--; ) {
        y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = a0 * (y0 - 2 * y1 + y2);
        y2 = y1;
        y1 = y0;
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
    };
    return ctor;
  })();
  
  cc.ugen.specs.BPF = {
    $ar: {
      defaults: "in=0,freq=440,rq=1,mul=1,add=0",
      ctor: function(_in, freq, rq, mul, add) {
        return this.multiNew(2, _in, freq, rq).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,freq=440,rq=1,mul=1,add=0",
      ctor: function(_in, freq, rq, mul, add) {
        return this.multiNew(1, _in, freq, rq).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.BPF = (function() {
    var ctor = function() {
      this.process = next;
      this._a0 = 0;
      this._b1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq = undefined;
      this._bw   = undefined;
      do_next_1(this, next);
    };
    var next = function() {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var freq = this.inputs[1][0];
      var bw   = this.inputs[2][0];
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var b1 = this._b1;
      var b2 = this._b2;
      var rate = this.rate;
      var i, j = 0;
      if (freq !== this._freq || bw !== this._bw) {
        var pfreq = freq * rate.radiansPerSample;
        var pbw   = bw * pfreq * 0.5;
        var C = pbw ? 1 / Math.tan(pbw) : 0;
        var D = 2 * Math.cos(pfreq);
        var next_a0 = 1 / (1 + C);
        var next_b1 = C * D * next_a0;
        var next_b2 = (1 - C) * next_a0;
        var a0_slope = (next_a0 - a0) * rate.filterSlope;
        var b1_slope = (next_b1 - b1) * rate.filterSlope;
        var b2_slope = (next_b2 - b2) * rate.filterSlope;
        for (i = rate.filterLoops; i--; ) {
          y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = a0 * (y0 - y2);
          y2 = inIn[j] + b1 * y0 + b2 * y1; out[j++] = a0 * (y2 - y1);
          y1 = inIn[j] + b1 * y2 + b2 * y0; out[j++] = a0 * (y1 - y0);
          a0 += a0_slope;
          b1 += b1_slope;
          b2 += b2_slope;
        }
        this._freq = freq;
        this._bw   = bw;
        this._a0   = next_a0;
        this._b1   = next_b1;
        this._b2   = next_b2;
      } else {
        for (i = rate.filterLoops; i--; ) {
          y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = a0 * (y0 - y2);
          y2 = inIn[j] + b1 * y0 + b2 * y1; out[j++] = a0 * (y2 - y1);
          y1 = inIn[j] + b1 * y2 + b2 * y0; out[j++] = a0 * (y1 - y0);
        }
      }
      for (i = rate.filterRemain; i--; ) {
        y0 = inIn[j] + b1 * y1 + b2 * y2; out[j++] = a0 * (y0 - y2);
        y2 = y1;
        y1 = y0;
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
    };
    return ctor;
  })();
  
  cc.ugen.specs.BRF = cc.ugen.specs.BPF;

  cc.unit.specs.BRF = (function() {
    var ctor = function() {
      this.process = next;
      this._a0 = 0;
      this._a1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq = undefined;
      this._bw   = undefined;
      do_next_1(this, next);
    };
    var next = function() {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var freq = this.inputs[1][0];
      var bw   = this.inputs[2][0];
      var ay;
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var a1 = this._a1;
      var b2 = this._b2;
      var rate = this.rate;
      var i, j = 0;
      if (freq !== this._freq || bw !== this._bw) {
        var pfreq = freq * rate.radiansPerSample;
        var pbw   = bw * pfreq * 0.5;
        var C = Math.tan(pbw);
        var D = 2 * Math.cos(pfreq);
        var next_a0 = 1 / (1 + C);
        var next_a1 = -D * next_a0;
        var next_b2 = (1 - C) * next_a0;
        var a0_slope = (next_a0 - a0) * rate.filterSlope;
        var a1_slope = (next_a1 - a1) * rate.filterSlope;
        var b2_slope = (next_b2 - b2) * rate.filterSlope;
        for (i = rate.filterLoops; i--; ) {
          ay = a1 * y1; y0 = inIn[j] - ay - b2 * y2; out[j++] = a0 * (y0 + y2) + ay;
          ay = a1 * y0; y2 = inIn[j] - ay - b2 * y1; out[j++] = a0 * (y2 + y1) + ay;
          ay = a1 * y2; y1 = inIn[j] - ay - b2 * y0; out[j++] = a0 * (y1 + y0) + ay;
          a0 += a0_slope;
          a1 += a1_slope;
          b2 += b2_slope;
        }
        this._freq = freq;
        this._bw   = bw;
        this._a0   = next_a0;
        this._a1   = next_a1;
        this._b2   = next_b2;
      } else {
        for (i = rate.filterLoops; i--; ) {
          ay = a1 * y1; y0 = inIn[j] - ay - b2 * y2; out[j++] = a0 * (y0 + y2) + ay;
          ay = a1 * y0; y2 = inIn[j] - ay - b2 * y1; out[j++] = a0 * (y2 + y1) + ay;
          ay = a1 * y2; y1 = inIn[j] - ay - b2 * y0; out[j++] = a0 * (y1 + y0) + ay;
        }
      }
      for (i = rate.filterRemain; i--; ) {
        ay = a1 * y1; y0 = inIn[j] - ay - b2 * y2; out[j++] = a0 * (y0 + y2) + ay;
        y2 = y1;
        y1 = y0;
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
    };
    return ctor;
  })();
  
  cc.ugen.specs.RLPF = {
    $ar: {
      defaults: "in=0,freq=440,rq=1,mul=1,add=0",
      ctor: function(_in, freq, rq, mul, add) {
        return this.multiNew(2, _in, freq, rq).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,freq=440,rq=1,mul=1,add=0",
      ctor: function(_in, freq, rq, mul, add) {
        return this.multiNew(1, _in, freq, rq).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.RLPF = (function() {
    var ctor = function() {
      this.process = next;
      this._a0 = 0;
      this._b1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq  = undefined;
      this._reson = undefined;
      do_next_1(this, next);
    };
    var next = function() {
      var out = this.outputs[0];
      var inIn  = this.inputs[0];
      var freq  = this.inputs[1][0];
      var reson = this.inputs[2][0];
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var b1 = this._b1;
      var b2 = this._b2;
      var rate = this.rate;
      var i, j = 0;
      if (freq !== this._freq || reson !== this._reson) {
        var qres = Math.max(0.001, reson);
        var pfreq = freq * rate.radiansPerSample;
        var D = Math.tan(pfreq * qres * 0.5);
        var C = ((1.0-D)/(1.0+D));
        var cosf = Math.cos(pfreq);
        var next_b1 = (1.0 + C) * cosf;
        var next_b2 = -C;
        var next_a0 = (1.0 + C - next_b1) * 0.25;
        var a0_slope = (next_a0 - a0) * rate.filterSlope;
        var b1_slope = (next_b1 - b1) * rate.filterSlope;
        var b2_slope = (next_b2 - b2) * rate.filterSlope;
        for (i = rate.filterLoops; i--; ) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2; out[j++] = y0 + 2.0 * y1 + y2;
          y2 = a0 * inIn[j] + b1 * y0 + b2 * y1; out[j++] = y2 + 2.0 * y0 + y1;
          y1 = a0 * inIn[j] + b1 * y2 + b2 * y0; out[j++] = y1 + 2.0 * y2 + y0;
          a0 += a0_slope;
          b1 += b1_slope;
          b2 += b2_slope;
        }
        this._freq = freq;
        this._reson = reson;
        this._a0 = next_a0;
        this._b1 = next_b1;
        this._b2 = next_b2;
      } else {
        for (i = rate.filterLoops; i--; ) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2; out[j++] = y0 + 2.0 * y1 + y2;
          y2 = a0 * inIn[j] + b1 * y0 + b2 * y1; out[j++] = y2 + 2.0 * y0 + y1;
          y1 = a0 * inIn[j] + b1 * y2 + b2 * y0; out[j++] = y1 + 2.0 * y2 + y0;
        }
      }
      for (i = rate.filterRemain; i--; ) {
        y0 = a0 * inIn[j] + b1 * y1 + b2 * y2;
        out[j++] = y0 + 2.0 * y1 + y2;
        y2 = y1; y1 = y0;
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
    };
    return ctor;
  })();
  
  cc.ugen.specs.RHPF = cc.ugen.specs.RLPF;

  cc.unit.specs.RHPF = (function() {
    var ctor = function() {
      this.process = next;
      this._a0 = 0;
      this._b1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq  = undefined;
      this._reson = undefined;
      do_next_1(this, next);
    };
    var next = function() {
      var out = this.outputs[0];
      var inIn  = this.inputs[0];
      var freq  = this.inputs[1][0];
      var reson = this.inputs[2][0];
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var b1 = this._b1;
      var b2 = this._b2;
      var rate = this.rate;
      var i, j = 0;
      if (freq !== this._freq || reson !== this._reson) {
        var qres = Math.max(0.001, reson);
        var pfreq = freq * rate.radiansPerSample;
        var D = Math.tan(pfreq * qres * 0.5);
        var C = ((1.0-D)/(1.0+D));
        var cosf = Math.cos(pfreq);
        var next_b1 = (1.0 + C) * cosf;
        var next_b2 = -C;
        var next_a0 = (1.0 + C + next_b1) * 0.25;
        var a0_slope = (next_a0 - a0) * rate.filterSlope;
        var b1_slope = (next_b1 - b1) * rate.filterSlope;
        var b2_slope = (next_b2 - b2) * rate.filterSlope;
        for (i = rate.filterLoops; i--; ) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2; out[j++] = y0 - 2.0 * y1 + y2;
          y2 = a0 * inIn[j] + b1 * y0 + b2 * y1; out[j++] = y2 - 2.0 * y0 + y1;
          y1 = a0 * inIn[j] + b1 * y2 + b2 * y0; out[j++] = y1 - 2.0 * y2 + y0;
          a0 += a0_slope;
          b1 += b1_slope;
          b2 += b2_slope;
        }
        this._freq = freq;
        this._reson = reson;
        this._a0 = next_a0;
        this._b1 = next_b1;
        this._b2 = next_b2;
      } else {
        for (i = rate.filterLoops; i--; ) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2; out[j++] = y0 - 2.0 * y1 + y2;
          y2 = a0 * inIn[j] + b1 * y0 + b2 * y1; out[j++] = y2 - 2.0 * y0 + y1;
          y1 = a0 * inIn[j] + b1 * y2 + b2 * y0; out[j++] = y1 - 2.0 * y2 + y0;
        }
      }
      for (i = rate.filterRemain; i--; ) {
        y0 = a0 * inIn[j] + b1 * y1 + b2 * y2; out[j++] = y0 - 2.0 * y1 + y2;
        
        y2 = y1; y1 = y0;
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
    };
    return ctor;
  })();
  
  cc.ugen.specs.MidEQ = {
    $ar: {
      defaults: "in=0,freq=440,rq=1,db=0,mul=1,add=0",
      ctor: function(_in, freq, rq, db, mul, add) {
        return this.multiNew(2, _in, freq, rq, db).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,freq=440,rq=1,db=0,mul=1,add=0",
      ctor: function(_in, freq, rq, db, mul, add) {
        return this.multiNew(1, _in, freq, rq, db).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.MidEQ = (function() {
    var ctor = function() {
      this.process = next;
      this._a0 = 0;
      this._b1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq = undefined;
      this._bw   = undefined;
      this._db   = undefined;
      do_next_1(this, next);
    };
    var next = function() {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var freq = this.inputs[1][0];
      var bw   = this.inputs[2][0];
      var db   = this.inputs[3][0];
      var y0, zin;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var b1 = this._b1;
      var b2 = this._b2;
      var rate = this.rate;
      var i, j = 0;
      if (freq !== this._freq || bw !== this._bw || db !== this._db) {
        var amp = Math.pow(10, db * 0.05) - 1;
        var pfreq = freq * rate.radiansPerSample;
        var pbw   = bw * pfreq * 0.5;
        var C = pbw ? 1 / Math.tan(pbw) : 0;
        var D = 2 * Math.cos(pfreq);
        var next_a0 = 1 / (1 + C);
        var next_b1 = C * D * next_a0;
        var next_b2 = (1 - C) * next_a0;
        next_a0 *= amp;
        var a0_slope = (next_a0 - a0) * rate.filterSlope;
        var b1_slope = (next_b1 - b1) * rate.filterSlope;
        var b2_slope = (next_b2 - b2) * rate.filterSlope;
        for (i = rate.filterLoops; i--; ) {
          zin = inIn[j]; y0 = zin + b1 * y1 + b2 * y2; out[j++] = zin + a0 * (y0 - y2);
          zin = inIn[j]; y2 = zin + b1 * y0 + b2 * y1; out[j++] = zin + a0 * (y2 - y1);
          zin = inIn[j]; y1 = zin + b1 * y2 + b2 * y0; out[j++] = zin + a0 * (y1 - y0);
          a0 += a0_slope;
          b1 += b1_slope;
          b2 += b2_slope;
        }
        this._freq = freq;
        this._bw   = bw;
        this._db   = db;
        this._a0 = next_a0;
        this._b1 = next_b1;
        this._b2 = next_b2;
      } else {
        for (i = rate.filterLoops; i--; ) {
          zin = inIn[j]; y0 = zin + b1 * y1 + b2 * y2; out[j++] = zin + a0 * (y0 - y2);
          zin = inIn[j]; y2 = zin + b1 * y0 + b2 * y1; out[j++] = zin + a0 * (y2 - y1);
          zin = inIn[j]; y1 = zin + b1 * y2 + b2 * y0; out[j++] = zin + a0 * (y1 - y0);
        }
      }
      for (i = rate.filterRemain; i--; ) {
        zin = inIn[j];
        y0 = zin + b1 * y1 + b2 * y2;
        out[j++] = zin + a0 * (y0 - y2);
        y2 = y1;
        y1 = y0;
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
    };
    return ctor;
  })();
  
  cc.ugen.specs.LPZ1 = {
    $ar: {
      defaults: "in=0,mul=1,add=0",
      ctor: function(_in, mul, add) {
        return this.multiNew(2, _in).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,mul=1,add=0",
      ctor: function(_in, mul, add) {
        return this.multiNew(1, _in).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.LPZ1 = (function() {
    var ctor = function() {
      this.process = next;
      this._x1 = this.inputs[0][0];
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var x0, x1 = this._x1;
      var i, j = 0;
      for (i = inNumSamples >> 3; i--; ) {
        x0 = inIn[j]; out[j++] = 0.5 * (x0 + x1);
        x1 = inIn[j]; out[j++] = 0.5 * (x1 + x0);
        x0 = inIn[j]; out[j++] = 0.5 * (x0 + x1);
        x1 = inIn[j]; out[j++] = 0.5 * (x1 + x0);
        x0 = inIn[j]; out[j++] = 0.5 * (x0 + x1);
        x1 = inIn[j]; out[j++] = 0.5 * (x1 + x0);
        x0 = inIn[j]; out[j++] = 0.5 * (x0 + x1);
        x1 = inIn[j]; out[j++] = 0.5 * (x1 + x0);
      }
      for (i = inNumSamples & 3; i--; ) {
        x0 = inIn[j];
        out[j++] = 0.5 * (x0 + x1);
        x1 = x0;
      }
      this._x1 = x1;
    };
    return ctor;
  })();
  
  cc.ugen.specs.HPZ1  = cc.ugen.specs.LPZ1;

  cc.unit.specs.HPZ1 = (function() {
    var ctor = function() {
      this.process = next;
      this._x1 = this.inputs[0][0];
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var x0, x1 = this._x1;
      var i, j = 0;
      for (i = inNumSamples >> 3; i--; ) {
        x0 = inIn[j]; out[j++] = 0.5 * (x0 - x1);
        x1 = inIn[j]; out[j++] = 0.5 * (x1 - x0);
        x0 = inIn[j]; out[j++] = 0.5 * (x0 - x1);
        x1 = inIn[j]; out[j++] = 0.5 * (x1 - x0);
        x0 = inIn[j]; out[j++] = 0.5 * (x0 - x1);
        x1 = inIn[j]; out[j++] = 0.5 * (x1 - x0);
        x0 = inIn[j]; out[j++] = 0.5 * (x0 - x1);
        x1 = inIn[j]; out[j++] = 0.5 * (x1 - x0);
      }
      for (i = inNumSamples & 3; i--; ) {
        x0 = inIn[j];
        out[j++] = 0.5 * (x0 - x1);
        x1 = x0;
      }
      this._x1 = x1;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Slope = cc.ugen.specs.LPZ1;

  cc.unit.specs.Slope = (function() {
    var ctor = function() {
      this.process = next;
      this._x1 = this.inputs[0][0];
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var x0, x1 = this._x1;
      var sr = this.rate.sampleRate;
      var i, j = 0;
      for (i = inNumSamples >> 3; i--; ) {
        x0 = inIn[i]; out[j++] = sr * (x0 - x1);
        x1 = inIn[i]; out[j++] = sr * (x1 - x0);
        x0 = inIn[i]; out[j++] = sr * (x0 - x1);
        x1 = inIn[i]; out[j++] = sr * (x1 - x0);
        x0 = inIn[i]; out[j++] = sr * (x0 - x1);
        x1 = inIn[i]; out[j++] = sr * (x1 - x0);
        x0 = inIn[i]; out[j++] = sr * (x0 - x1);
        x1 = inIn[i]; out[j++] = sr * (x1 - x0);
      }
      for (i = inNumSamples & 3; i--; ) {
        x0 = inIn[j];
        out[j++] = sr * (x0 - x1);
        x1 = x0;
      }
      this._x1 = x1;
    };
    return ctor;
  })();
  
  cc.ugen.specs.LPZ2  = cc.ugen.specs.LPZ1;

  cc.unit.specs.LPZ2 = (function() {
    var ctor = function() {
      this.process = next;
      this._x1 = this._x2 = this.inputs[0][0];
      do_next_1(this, next);
    };
    var next = function() {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var x0, x1 = this._x1, x2 = this._x2;
      var rate = this.rate;
      var i, j = 0;
      for (i = rate.filterLoops; i--; ) {
        x0 = inIn[j]; out[j++] = (x0 + 2 * x1 + x2) * 0.25;
        x2 = inIn[j]; out[j++] = (x2 + 2 * x0 + x1) * 0.25;
        x1 = inIn[j]; out[j++] = (x1 + 2 * x2 + x0) * 0.25;
      }
      for (i = rate.filterRemain; i--; ) {
        x0 = inIn[j];
        out[j++] = (x0 + 2 * x1 + x2) * 0.25;
        x2 = x1;
        x1 = x0;
      }
      this._x1 = x1;
      this._x2 = x2;
    };
    return ctor;
  })();
  
  cc.ugen.specs.HPZ2  = cc.ugen.specs.LPZ1;

  cc.unit.specs.HPZ2 = (function() {
    var ctor = function() {
      this.process = next;
      this._x1 = this._x2 = this.inputs[0][0];
      do_next_1(this, next);
    };
    var next = function() {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var x0, x1 = this._x1, x2 = this._x2;
      var rate = this.rate;
      var i, j = 0;
      for (i = rate.filterLoops; i--; ) {
        x0 = inIn[j]; out[j++] = (x0 - 2 * x1 + x2) * 0.25;
        x2 = inIn[j]; out[j++] = (x2 - 2 * x0 + x1) * 0.25;
        x1 = inIn[j]; out[j++] = (x1 - 2 * x2 + x0) * 0.25;
      }
      for (i = rate.filterRemain; i--; ) {
        x0 = inIn[j];
        out[j++] = (x0 - 2 * x1 + x2) * 0.25;
        x2 = x1;
        x1 = x0;
      }
      this._x1 = x1;
      this._x2 = x2;
    };
    return ctor;
  })();
  
  cc.ugen.specs.BPZ2  = cc.ugen.specs.LPZ1;

  cc.unit.specs.BPZ2 = (function() {
    var ctor = function() {
      this.process = next;
      this._x1 = this._x2 = this.inputs[0][0];
      do_next_1(this, next);
    };
    var next = function() {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var x0, x1 = this._x1, x2 = this._x2;
      var rate = this.rate;
      var i, j = 0;
      for (i = rate.filterLoops; i--; ) {
        x0 = inIn[j]; out[j++] = (x0 - x2) * 0.5;
        x2 = inIn[j]; out[j++] = (x2 - x1) * 0.5;
        x1 = inIn[j]; out[j++] = (x1 - x0) * 0.5;
      }
      for (i = rate.filterRemain; i--; ) {
        x0 = inIn[j];
        out[j++] = (x0 - x2) * 0.25;
        x2 = x1;
        x1 = x0;
      }
      this._x1 = x1;
      this._x2 = x2;
    };
    return ctor;
  })();
  
  cc.ugen.specs.BRZ2  = cc.ugen.specs.LPZ1;

  cc.unit.specs.BRZ2 = (function() {
    var ctor = function() {
      this.process = next;
      this._x1 = this._x2 = this.inputs[0][0];
      do_next_1(this, next);
    };
    var next = function() {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var x0, x1 = this._x1, x2 = this._x2;
      var rate = this.rate;
      var i, j = 0;
      for (i = rate.filterLoops; i--; ) {
        x0 = inIn[j]; out[j++] = (x0 + x2) * 0.5;
        x2 = inIn[j]; out[j++] = (x2 + x1) * 0.5;
        x1 = inIn[j]; out[j++] = (x1 + x0) * 0.5;
      }
      for (i = rate.filterRemain; i--; ) {
        x0 = inIn[j];
        out[j++] = (x0 + x2) * 0.25;
        x2 = x1;
        x1 = x0;
      }
      this._x1 = x1;
      this._x2 = x2;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Changed = {
    $ar: {
      defaults: "in=0,threshold=0",
      ctor: function(_in, threshold) {
        return cc.global.HPZ1.ar(_in).abs().gt(threshold);
      }
    },
    $kr: {
      defaults: "in=0,threshold=0",
      ctor: function(_in, threshold) {
        return cc.global.HPZ1.kr(_in).abs().gt(threshold);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  
  cc.ugen.specs.Lag = {
    $ar: {
      defaults: "in=0,lagTime=0.1,mul=1,add=0",
      ctor: function(_in, lagTime, mul, add) {
        return this.multiNew(2, _in, lagTime).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,lagTime=0.1,mul=1,add=0",
      ctor: function(_in, lagTime, mul, add) {
        return this.multiNew(1, _in, lagTime).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.Lag = (function() {
    var ctor = function() {
      if (this.rate.bufLength === 1) {
        this.process = next_1;
      } else {
        this.process = next;
      }
      this._lag = undefined;
      this._b1 = 0;
      this._y1 = this.inputs[0][0];
      next_1.call(this, 1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var lag = this.inputs[1][0];
      var y1 = this._y1;
      var b1 = this._b1;
      var y0, i;
      if (lag === this._lag) {
        for (i = 0; i < inNumSamples; ++i) {
          y0 = inIn[i];
          out[i] = y1 = y0 + b1 * (y1 - y0);
        }
      } else {
        this._b1 = (lag === 0) ? 0 : Math.exp(log001 / (lag * this.rate.sampleRate));
        var b1_slope = (this._b1 - b1) * this.rate.slopeFactor;
        this._lag = lag;
        for (i = 0; i < inNumSamples; ++i) {
          b1 += b1_slope;
          y0 = inIn[i];
          out[i] = y1 = y0 + b1 * (y1 - y0);
        }
      }
      this._y1 = y1;
    };
    var next_1 = function() {
      var out = this.outputs[0];
      var lag = this.inputs[1][0];
      var y1 = this._y1;
      var b1 = this._b1;
      var y0;
      if (lag !== this._lag) {
        this._b1 = b1 = (lag === 0) ? 0 : Math.exp(log001 / (lag * this.rate.sampleRate));
        this._lag = lag;
      }
      y0 = this.inputs[0][0];
      out[0] = y1 = y0 + b1 * (y1 - y0);
      this._y1 = y1;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Lag2 = cc.ugen.specs.Lag;

  cc.unit.specs.Lag2 = (function() {
    var ctor = function() {
      if (this.inRates[1] !== 0) {
        this.process = next_k;
      } else {
        if (this.rate.bufLength === 1) {
          this.process = next_1_i;
        } else {
          this.process = next_i;
        }
      }
      this._lag = NaN;
      this._b1 = 0;
      this._y1a = this.inputs[0][0];
      this._y1b = this.inputs[0][0];
      next_k.call(this, 1);
    };
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var lag = this.inputs[1][0];
      var y1a = this._y1a;
      var y1b = this._y1b;
      var b1 = this._b1;
      var y0a, b1_slope, i;
      if (lag === this._lag) {
        for (i = 0; i < inNumSamples; ++i) {
          y0a = inIn[i];
          y1a = y0a + b1 * (y1a - y0a);
          y1b = y1a + b1 * (y1b - y1a);
          out[i] = y1b;
        }
      } else {
        this._b1 = (lag === 0) ? 0 : Math.exp(log001 / (lag * this.rate.sampleRate));
        b1_slope = (this._b1 - b1) * this.rate.slopeFactor;
        this._lag = lag;
        for (i = 0; i < inNumSamples; ++i) {
          b1 += b1_slope;
          y0a = inIn[i];
          y1a = y0a + b1 * (y1a - y0a);
          y1b = y1a + b1 * (y1b - y1a);
          out[i] = y1b;
        }
      }
      this._y1a = y1a;
      this._y1b = y1b;
    };
    var next_i = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var y1a = this._y1a;
      var y1b = this._y1b;
      var b1 = this._b1;
      var y0a, i;
      for (i = 0; i < inNumSamples; ++i) {
        y0a = inIn[i];
        y1a = y0a + b1 * (y1a - y0a);
        y1b = y1a + b1 * (y1b - y1a);
        out[i] = y1b;
      }
      this._y1a = y1a;
      this._y1b = y1b;
    };
    var next_1_i = function() {
      var out = this.outputs[0];
      var y1a = this._y1a;
      var y1b = this._y1b;
      var b1 = this._b1;
      var y0a = this.inputs[0][0];
      y1a = y0a + b1 * (y1a - y0a);
      y1b = y1a + b1 * (y1b - y1a);
      out[0] = y1b;
      this._y1a = y1a;
      this._y1b = y1b;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Lag3 = cc.ugen.specs.Lag;

  cc.unit.specs.Lag3 = (function() {
    var ctor = function() {
      if (this.inRates[1] !== 0) {
        this.process = next;
      } else {
        if (this.rate.bufLength === 1) {
          this.process = next_1_i;
        } else {
          this.process = next;
        }
      }
      this._lag = NaN;
      this._b1 = 0;
      this._y1a = this.inputs[0][0];
      this._y1b = this.inputs[0][0];
      this._y1c = this.inputs[0][0];
      next.call(this, 1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var lag = this.inputs[1][0];
      var y1a = this._y1a;
      var y1b = this._y1b;
      var y1c = this._y1c;
      var b1 = this._b1;
      var y0a, i;
      if (lag === this._lag) {
        for (i = 0; i < inNumSamples; ++i) {
          y0a = inIn[i];
          y1a = y0a + b1 * (y1a - y0a);
          y1b = y1a + b1 * (y1b - y1a);
          y1c = y1b + b1 * (y1c - y1b);
          out[i] = y1c;
        }
      } else {
        this._b1 = (lag === 0) ? 0 : Math.exp(log001 / (lag * this.rate.sampleRate));
        var b1_slope = (this._b1 - b1) * this.rate.slopeFactor;
        this._lag = lag;
        for (i = 0; i < inNumSamples; ++i) {
          b1 += b1_slope;
          y0a = inIn[i];
          y1a = y0a + b1 * (y1a - y0a);
          y1b = y1a + b1 * (y1b - y1a);
          y1c = y1b + b1 * (y1c - y1b);
          out[i] = y1c;
        }
      }
      this._y1a = y1a;
      this._y1b = y1b;
      this._y1c = y1c;
    };
    var next_1_i = function() {
      var out = this.outputs[0];
      var y1a = this._y1a;
      var y1b = this._y1b;
      var y1c = this._y1c;
      var b1 = this._b1;
      var y0a = this.inputs[0][0];
      y1a = y0a + b1 * (y1a - y0a);
      y1b = y1a + b1 * (y1b - y1a);
      y1c = y1b + b1 * (y1c - y1b);
      out[0] = y1c;
      this._y1a = y1a;
      this._y1b = y1b;
      this._y1c = y1c;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Ramp = cc.ugen.specs.Lag;

  cc.unit.specs.Ramp = (function() {
    var ctor = function() {
      if (this.rate.bufLength === 1) {
        this.process = next_1;
      } else {
        this.process = next;
      }
      this._counter = 1;
      this._level = this.inputs[0][0];
      this._slope = 0;
      this.outputs[0][0] = this._level;
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var period = this.inputs[1][0];
      var slope = this._slope;
      var level = this._level;
      var counter = this._counter;
      var remain = inNumSamples;
      var sampleRate = this.rate.sampleRate;
      var nsmps, i, j = 0;
      while (remain) {
        nsmps = Math.min(remain, counter);
        for (i = 0; i < nsmps; ++i) {
          out[j++] = level;
          level += slope;
        }
        counter -= nsmps;
        remain  -= nsmps;
        if (counter <= 0){
          counter = (period * sampleRate)|0;
          counter = Math.max(1, counter);
          slope = (inIn[j-1] - level) / counter;
        }
      }
      this._level = level;
      this._slope = slope;
      this._counter = counter;
    };
    var next_1 = function() {
      var out = this.outputs[0];
      out[0] = this._level;
      this._level += this._slope;
      if (--this._counter <= 0) {
        var _in = this.inputs[0][0];
        var period = this.inputs[1][0];
        var counter = (period * this.rate.sampleRate)|0;
        this._counter = counter = Math.max(1, counter);
        this._slope = (_in - this._level) / counter;
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.LagUD = {
    $ar: {
      defaults: "in=0,lagTimeU=0.1,lagTimeD=0.1,mul=1,add=0",
      ctor: function(_in, lagTimeU, lagTimeD, mul, add) {
        return this.multiNew(2, _in, lagTimeU, lagTimeD).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,lagTimeU=0.1,lagTimeD=0.1,mul=1,add=0",
      ctor: function(_in, lagTimeU, lagTimeD, mul, add) {
        return this.multiNew(1, _in, lagTimeU, lagTimeD).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.LagUD = (function() {
    var ctor = function() {
      this.process = next;
      this._lagu = undefined;
      this._lagd = undefined;
      this._b1u = 0;
      this._b1d = 0;
      this._y1 = this.inputs[0][0];
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var lagu = this.inputs[1][0];
      var lagd = this.inputs[2][0];
      var y1 = this._y1;
      var b1u = this._b1u;
      var b1d = this._b1d;
      var i, y0;
      if ((lagu === this._lagu) && (lagd === this._lagd)) {
        for (i = 0; i < inNumSamples; ++i) {
          y0 = inIn[i];
          if (y0 > y1) {
            out[i] = y1 = y0 + b1u * (y1 - y0);
          } else {
            out[i] = y1 = y0 + b1d * (y1 - y0);
          }
        }
      } else {
        this._b1u = (lagu === 0) ? 0 : Math.exp(log001 / (lagu * this.rate.sampleRate));
        var b1u_slope = (this._b1u - b1u) * this.rate.slopeFactor;
        this._lagu = lagu;
        this._b1d = (lagd === 0) ? 0 : Math.exp(log001 / (lagd * this.rate.sampleRate));
        var b1d_slope = (this._b1d - b1d) * this.rate.slopeFactor;
        this._lagd = lagd;
        for (i = 0; i < inNumSamples; ++i) {
          b1u += b1u_slope;
          b1d += b1d_slope;
          y0 = inIn[i];
          if (y0 > y1) {
            out[i] = y1 = y0 + b1u * (y1 - y0);
          } else {
            out[i] = y1 = y0 + b1d * (y1 - y0);
          }
        }
      }
      this._y1 = y1;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Lag2UD = cc.ugen.specs.LagUD;

  cc.unit.specs.Lag2UD = (function() {
    var ctor = function() {
      this.process = next;
      this._lagu = 0;
      this._lagd = 0;
      this._b1u = 0;
      this._b1d = 0;
      this._y1a = this.inputs[0][0];
      this._y1b = this.inputs[0][0];
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var lagu = this.inputs[1][0];
      var lagd = this.inputs[2][0];
      var y1a = this._y1a;
      var y1b = this._y1b;
      var b1u = this._b1u;
      var b1d = this._b1d;
      var i, y0a;
      if ((lagu === this._lagu) && (lagd === this._lagd)) {
        for (i = 0; i < inNumSamples; ++i) {
          y0a = inIn[i];
          if (y0a > y1a) {
            y1a = y0a + b1u * (y1a - y0a);
          } else {
            y1a = y0a + b1d * (y1a - y0a);
          }
          if (y1a > y1b) {
            y1b = y1a + b1u * (y1b - y1a);
          } else {
            y1b = y1a + b1d * (y1b - y1a);
          }
          out[i] = y1b;
        }
      } else {
        this._b1u = (lagu === 0) ? 0 : Math.exp(log001 / (lagu * this.rate.sampleRate));
        var b1u_slope = (this._b1u - b1u) * this.rate.slopeFactor;
        this._lagu = lagu;
        this._b1d = (lagd === 0) ? 0 : Math.exp(log001 / (lagd * this.rate.sampleRate));
        var b1d_slope = (this._b1d - b1d) * this.rate.slopeFactor;
        this._lagd = lagd;
        for (i = 0; i < inNumSamples; ++i) {
          b1u += b1u_slope;
          b1d += b1d_slope;
          y0a = inIn[i];
          if (y0a > y1a) {
            y1a = y0a + b1u * (y1a - y0a);
          } else {
            y1a = y0a + b1d * (y1a - y0a);
          }
          if (y1a > y1b) {
            y1b = y1a + b1u * (y1b - y1a);
          } else {
            y1b = y1a + b1d * (y1b - y1a);
          }
          out[i] = y1b;
        }
      }
      this._y1a = y1a;
      this._y1b = y1b;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Lag3UD = cc.ugen.specs.LagUD;

  cc.unit.specs.Lag3UD = (function() {
    var ctor = function() {
      this.process = next;
      this._lagu = 0;
      this._lagd = 0;
      this._b1u = 0;
      this._b1d = 0;
      this._y1a = this.inputs[0][0];
      this._y1b = this.inputs[0][0];
      this._y1c = this.inputs[0][0];
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var lagu = this.inputs[1][0];
      var lagd = this.inputs[2][0];
      var y1a = this._y1a;
      var y1b = this._y1b;
      var y1c = this._y1c;
      var b1u = this._b1u;
      var b1d = this._b1d;
      var i, y0a;
      if ((lagu === this._lagu) && (lagd === this._lagd)) {
        for (i = 0; i < inNumSamples; ++i) {
          y0a = inIn[i];
          if (y0a > y1a) {
            y1a = y0a + b1u * (y1a - y0a);
          } else {
            y1a = y0a + b1d * (y1a - y0a);
          }
          if (y1a > y1b) {
            y1b = y1a + b1u * (y1b - y1a);
          } else {
            y1b = y1a + b1d * (y1b - y1a);
          }
          if (y1a > y1b) {
            y1c = y1b + b1u * (y1c - y1b);
          } else {
            y1c = y1b + b1d * (y1c - y1b);
          }
          out[i] = y1c;
        }
      } else {
        this._b1u = (lagu === 0) ? 0 : Math.exp(log001 / (lagu * this.rate.sampleRate));
        var b1u_slope = (this._b1u - b1u) * this.rate.slopeFactor;
        this._lagu = lagu;
        this._b1d = (lagd === 0) ? 0 : Math.exp(log001 / (lagd * this.rate.sampleRate));
        var b1d_slope = (this._b1d - b1d) * this.rate.slopeFactor;
        this._lagd = lagd;
        for (i = 0; i < inNumSamples; ++i) {
          b1u += b1u_slope;
          b1d += b1d_slope;
          y0a = inIn[i];
          if (y0a > y1a) {
            y1a = y0a + b1u * (y1a - y0a);
          } else {
            y1a = y0a + b1d * (y1a - y0a);
          }
          if (y1a > y1b) {
            y1b = y1a + b1u * (y1b - y1a);
          } else {
            y1b = y1a + b1d * (y1b - y1a);
          }
          if (y1a > y1b) {
            y1c = y1b + b1u * (y1c - y1b);
          } else {
            y1c = y1b + b1d * (y1c - y1b);
          }
          out[i] = y1c;
        }
      }
      this._y1a = y1a;
      this._y1b = y1b;
      this._y1c = y1c;
    };
    return ctor;
  })();
  
  cc.ugen.specs.VarLag = {
    $ar: {
      defaults: "in=0,time=0.1,curvature=0,warp=5,start=0,mul=1,add=0",
      ctor: function(_in, time, curvature, warp, start, mul, add) {
        return this.multiNew(2, _in, time, curvature, warp, start).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,time=0.1,curvature=0,warp=5,start=0,mul=1,add=0",
      ctor: function(_in, time, curvature, warp, start, mul, add) {
        return this.multiNew(1, _in, time, curvature, warp, start).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.VarLag = (function() {
    var ctor = function() {
      if (this.bufLength === 1) {
        this.process = next_1;
      } else {
        this.process = next;
      }
      var lagTime = this.inputs[1][0];
      var counter = Math.max(1, (lagTime * this.rate.sampleRate)|0);
      this._level   = this.inputs[2][0];
      this._counter = counter;
      this._in      = this.inputs[0][0];
      this._slope   = (this._in - this._level) / counter;
      this._lagTime = lagTime;
      this.outputs[0][0] = this._level;
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var _in = this.inputs[0][0];
      var lagTime = this.inputs[1][0];
      var slope   = this._slope;
      var level   = this._level;
      var counter = this._counter;
      var i, scaleFactor;
      if (_in !== this._in) {
        this._counter = counter = Math.max(1, (lagTime * this.rate.sampleRate)|0);
        this._slope   = slope   = (_in - this._in) / counter;
        this._in      = _in;
        this._lagTime = lagTime;
      } else if (lagTime !== this._lagTime) {
        scaleFactor = lagTime / this._lagTime;
        this._counter = counter = Math.max(1, (this._counter * scaleFactor)|0);
        this._slope   = slope   = (this._slope / scaleFactor) || 0;
        this._lagTime = lagTime;
      }
      _in = this._in;
      if (counter > 0) {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = level;
          if (counter > 0) {
            level += slope;
            counter -= 1;
          } else {
            level = _in;
          }
        }
      } else {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = level;
        }
      }
      this._level   = level;
      this._slope   = slope;
      this._counter = counter;
    };
    var next_1 = function() {
      var _in  = this.inputs[0][0];
      var lagTime = this.inputs[1][0];
      var counter = this._counter;
      var scaleFactor;
      if (_in !== this._in) {
        this._counter = counter = Math.max(1, (lagTime * this.rate.sampleRate)|0);
        this._slope   = (_in - this._level) / counter;
        this._in      = _in;
        this._lagTime = lagTime;
      } else if (lagTime !== this._lagTime) {
        if (counter !== 0) {
          scaleFactor = lagTime / this._lagTime;
          this._counter = counter = Math.max(1, (this._counter * scaleFactor)|0);
          this._slope   = this._slope / scaleFactor;
        }
        this._lagTime = lagTime;
      }
      this.outputs[0][0] = this._level;
      if (this._counter > 0) {
        this._level += this._slope;
        this._counter -= 1;
      } else {
        this._level = this._in;
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.Slew = {
    $ar: {
      defaults: "in=0,up=1,dn=1,mul=1,add=0",
      ctor: function(_in, up, dn, mul, add) {
        return this.multiNew(2, _in, up, dn).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,up=1,dn=1,mul=1,add=0",
      ctor: function(_in, up, dn, mul, add) {
        return this.multiNew(1, _in, up, dn).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.Slew = (function() {
    var ctor = function() {
      this.process = next;
      this._level = this.inputs[0][0];
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var sampleDur = this.rate.sampleDur;
      var upf = +this.inputs[1][0] * sampleDur;
      var dnf = -this.inputs[2][0] * sampleDur;
      var level = this._level;
      var slope;
      for (var i = 0; i < inNumSamples; ++i) {
        slope = inIn[i] - level;
        level += Math.max(dnf, Math.min(slope, upf));
        out[i] = level;
      }
      this._level = level;
    };
    return ctor;
  })();
  
  module.exports = {};

});
define('cc/plugins/info', function(require, exports, module) {

  var cc = require("../cc");
  
  var InfoUGenBase = {
    $ir: {
      ctor: function() {
        return this.multiNew(0);
      }
    }
  };
  
  cc.ugen.specs.SampleRate = InfoUGenBase;

  cc.unit.specs.SampleRate = (function() {
    var ctor = function() {
      this.outputs[0][0] = cc.server.rates[2].sampleRate;
    };
    return ctor;
  })();
  
  cc.ugen.specs.SampleDur = InfoUGenBase;
  
  cc.unit.specs.SampleDur = (function() {
    var ctor = function() {
      this.outputs[0][0] = cc.server.rates[2].sampleDur;
    };
    return ctor;
  })();
  
  cc.ugen.specs.RadiansPerSample = InfoUGenBase;

  cc.unit.specs.RadiansPerSample = (function() {
    var ctor = function() {
      this.outputs[0][0] = cc.server.rates[2].radiansPerSample;
    };
    return ctor;
  })();
  
  cc.ugen.specs.ControlRate = InfoUGenBase;

  cc.unit.specs.ControlRate = (function() {
    var ctor = function() {
      this.outputs[0][0] = cc.server.rates[1].sampleRate;
    };
    return ctor;
  })();
  
  cc.ugen.specs.ControlDur = InfoUGenBase;
  
  cc.unit.specs.ControlDur = (function() {
    var ctor = function() {
      this.outputs[0][0] = cc.server.rates[2].bufDuration;
    };
    return ctor;
  })();

  // TODO:
  // cc.ugen.specs.SubsampleOffset = InfoUGenBase;

  // cc.ugen.specs.NumOutputBuses = InfoUGenBase;

  // cc.ugen.specs.NumAudioBuses = InfoUGenBase;

  // cc.ugen.specs.NumControlBuses = InfoUGenBase;

  // cc.ugen.specs.NumBuffers = InfoUGenBase;

  // cc.ugen.specs.NumRunningSynths = {
  //   $kr: {
  //     ctor: function() {
  //       return this.multiNew(1);
  //     }
  //   },
  //   $ir: {
  //     ctor: function() {
  //       return this.multiNew(0);
  //     }
  //   }
  // };
  
  module.exports = {};

});
define('cc/plugins/inout', function(require, exports, module) {

  var cc = require("../cc");
  var slice = [].slice;
  
  cc.ugen.specs.In = {
    Klass: cc.MultiOutUGen,
    $ar: {
      defaults: "bus=0,numChannels=1",
      ctor: function(bus, numChannels) {
        return this.multiNew(2, numChannels, bus);
      }
    },
    $kr: {
      defaults: "bus=0,numChannels=1",
      ctor: function(bus, numChannels) {
        return this.multiNew(1, numChannels, bus);
      }
    },
    init: function(numChannels) {
      this.inputs = slice.call(arguments, 1);
      this.numOfInputs = this.inputs.length;
      return this.initOutputs(numChannels, this.rate);
    }
  };
  
  cc.unit.specs.In = (function() {
    var ctor = function() {
      if (this.calcRate === 2) {
        this.process = next_a;
        this._busOffset = 0;
      } else {
        this.process = next_k;
        this._busOffset = this.bufLength * 16;
      }
    };
    var next_a = function(inNumSamples, instance) {
      var out = this.outputs[0];
      var bus  = instance.bus;
      var bufLength = this.bufLength;
      var offset = (this.inputs[0][0] * bufLength)|0;
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = bus[offset + i];
      }
    };
    var next_k = function(inNumSamples, instance) {
      var value = instance.bus[this._busOffset + (this.inputs[0][0]|0)];
      this.outputs[0][0] = value;
    };
    return ctor;
  })();
  
  cc.ugen.specs.A2K = {
    $kr: {
      defaults: "in=0",
      ctor: function(_in) {
        if (_in.rate !== 2) {
          throw new Error("first input is not audio rate");
        }
        return this.multiNew(1, _in);
      }
    }
  };
  
  cc.unit.specs.A2K = (function() {
    var ctor = function() {
      this.process = next;
    };
    var next = function() {
      this.outputs[0][0] = this.inputs[0][0];
    };
    return ctor;
  })();
  
  cc.ugen.specs.K2A = {
    $ar: {
      defaults: "in=0",
      ctor: function(_in) {
        return this.multiNew(2, _in);
      }
    }
  };
  
  cc.unit.specs.K2A = (function() {
    var ctor = function() {
      this.process = next;
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var value = this.inputs[0][0];
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = value;
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.T2K = {
    $kr: {
      defaults: "in=0",
      ctor: function(_in) {
        if (_in.rate !== 2) {
          throw new Error("first input is not audio rate");
        }
        return this.multiNew(1, _in);
      }
    }
  };

  cc.unit.specs.T2K = (function() {
    var ctor = function() {
      this.process = next;
      this._bufLength = cc.server.rates[2].bufLength;
      this.outputs[0][0] = this.input[0][0];
    };
    var next = function() {
      var inIn = this.input[0];
      var out  = 0;
      var val, n = this._bufLength;
      for (var i = 0; i < n; ++i) {
        val = inIn[i];
        if (val > out) {
          out = val;
        }
      }
      this.outputs[0][0] = out;
    };
    return ctor;
  })();
  
  cc.ugen.specs.T2A = {
    $kr: {
      defaults: "in=0,offset=0",
      ctor: function(_in, offset) {
        if (_in.rate !== 2) {
          throw new Error("first input is not audio rate");
        }
        return this.multiNew(2, _in, offset);
      }
    }
  };

  cc.unit.specs.T2A = (function() {
    var ctor = function() {
      this.process = next;
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var level = this.input[0][0];
      for (var i = 0; i < inNumSamples; ++i) {
        out[0] = 0;
      }
      if (this._level <= 0 && level > 0) {
        this.outputs[0][this.input[1][0]|0] = level;
      }
      this._level = level;
    };
    return ctor;
  })();
  
  module.exports = {};

});
define('cc/plugins/line', function(require, exports, module) {
  
  var cc = require("../cc");
  
  cc.ugen.specs.Line = {
    $ar: {
      defaults: "start=0,end=1,dur=1,mul=1,add=0,doneAction=0",
      ctor: function(start, end, dur, mul, add, doneAction) {
        return this.multiNew(2, start, end, dur, doneAction).madd(mul, add);
      }
    },
    $kr: {
      defaults: "start=0,end=1,dur=1,mul=1,add=0,doneAction=0",
      ctor: function(start, end, dur, mul, add, doneAction) {
        return this.multiNew(1, start, end, dur, doneAction).madd(mul, add);
      }
    }
  };
  
  cc.unit.specs.Line = (function() {
    var ctor = function() {
      this.process = next;
      var start = this.inputs[0][0];
      var end = this.inputs[1][0];
      var dur = this.inputs[2][0];
      var counter = Math.round(dur * this.rate.sampleRate);
      this._counter = Math.max(1, counter);
      if (counter === 0) {
        this._level = end;
        this._slope = 0;
      } else {
        this._slope = (end - start) / this._counter;
        this._level = start + this._slope;
      }
      this._endLevel = end;
      this._doneAction = this.inputs[3][0];
      this.outputs[0][0] = this._level;
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var level   = this._level;
      var counter = this._counter;
      var slope   = this._slope;
      var i, remain = inNumSamples;
      do {
        var nsmps;
        if (counter === 0) {
          nsmps  = remain;
          remain = 0;
          var endLevel = this._endLevel;
          for (i = 0; i < nsmps; ++i) {
            out[i] = endLevel;
          }
        } else {
          nsmps = Math.min(remain, counter);
          counter -= nsmps;
          remain  -= nsmps;
          for (i = 0; i < nsmps; ++i) {
            out[i] = level;
            level += slope;
          }
          if (counter === 0) {
            this.doneAction(this._doneAction);
          }
        }
      } while (remain);
      this._counter = counter;
      this._level   = level;
    };
    
    return ctor;
  })();
  
  cc.ugen.specs.XLine = {
    $ar: {
      defaults: "start=1,end=2,dur=1,mul=1,add=0,doneAction=0",
      ctor: function(start, end, dur, mul, add, doneAction) {
        return this.multiNew(2, start, end, dur, doneAction).madd(mul, add);
      }
    },
    $kr: {
      defaults: "start=1,end=2,dur=1,mul=1,add=0,doneAction=0",
      ctor: function(start, end, dur, mul, add, doneAction) {
        return this.multiNew(1, start, end, dur, doneAction).madd(mul, add);
      }
    }
  };
  
  cc.unit.specs.XLine = (function() {
    var ctor = function() {
      this.process = next;
      var start = this.inputs[0][0] || 0.001;
      var end   = this.inputs[1][0] || 0.001;
      var dur   = this.inputs[2][0];
      var counter = Math.round(dur * this.rate.sampleRate);
      if (counter === 0) {
        this._level   = end;
        this._counter = 0;
        this._growth  = 0;
      } else {
        this._counter = counter;
        this._growth = Math.pow(end / start, 1 / counter);
        this._level  = start * this._growth;
      }
      this._endLevel = end;
      this._doneAction = this.inputs[3][0];
      this.outputs[0][0] = this._level;
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var level   = this._level;
      var counter = this._counter;
      var growth  = this._growth;
      var i, remain = inNumSamples;
      do {
        var nsmps;
        if (counter === 0) {
          nsmps  = remain;
          remain = 0;
          var endLevel = this._endLevel;
          for (i = 0; i < nsmps; ++i) {
            out[i] = endLevel;
          }
        } else {
          nsmps = Math.min(remain, counter);
          counter -= nsmps;
          remain  -= nsmps;
          for (i = 0; i < nsmps; ++i) {
            out[i] = level;
            level *= growth;
          }
          if (counter === 0) {
            this.doneAction(this._doneAction);
          }
        }
      } while (remain);
      this._counter = counter;
      this._level   = level;
    };
    return ctor;
  })();
  
  module.exports = {};

});
define('cc/plugins/noise', function(require, exports, module) {

  var cc = require("../cc");
  var utils = require("./utils");
  var cubicinterp = utils.cubicinterp;

  // frand: return a float from 0.0 to 0.999...
  // Math.random();

  // frand0: return a float from +1.0 to +1.999...
  // Math.random() + 1;

  // frand2: return a float from -1.0 to +0.999...
  // Math.random() * 2 - 1;
  
  // frand8: return a float from -0.125 to +0.124999...
  // Math.random() * 0.25 - 0.125; 
  
  
  cc.ugen.specs.WhiteNoise = {
    $ar: {
      defaults: "mul=1,add=0",
      ctor: function(mul, add) {
        return this.multiNew(2).madd(mul, add);
      }
    },
    $kr: {
      defaults: "mul=1,add=0",
      ctor: function(mul, add) {
        return this.multiNew(1).madd(mul, add);
      }
    }
  };

  cc.unit.specs.WhiteNoise = (function() {
    var ctor = function() {
      this.process = next;
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = Math.random() * 2 - 1; // frand2
      }
    };
    return ctor;
  })();

  cc.ugen.specs.BrownNoise = cc.ugen.specs.WhiteNoise;
  
  cc.unit.specs.BrownNoise = (function() {
    var ctor = function() {
      this.process = next;
      this._level = Math.random() * 2 - 1;
      this.outputs[0][0] = this._level;
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var z   = this._level;
      for (var i = 0; i < inNumSamples; ++i) {
        z += Math.random() * 0.25 - 0.125; // frand8
        if (z > 1) {
          z = 2 - z;
        } else if (z < -1) {
          z = -2 - z;
        }
        out[i] = z;
      }
      this._level = z;
    };
    return ctor;
  })();
  
  cc.ugen.specs.PinkNoise = cc.ugen.specs.WhiteNoise;
  
  cc.unit.specs.PinkNoise = (function() {
    var ctor = function() {
      this.process = next;
      var whites = new Uint8Array(5);
      for (var i = 0; i < 5; ++i) {
        whites[i] = ((Math.random() * 1073741824)|0) % 25;
      }
      this._whites = whites;
      this._key    = 0;
      this.process(1);
    };
    var MAX_KEY = 31;
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var key = this._key|0, whites = this._whites;
      var last_key, sum, diff, i, j;
      for (i = 0; i < inNumSamples; ++i) {
        last_key = key++;
        if (key > MAX_KEY) {
          key = 0;
        }
        diff = last_key ^ key;
        for (j = sum = 0; j < 5; ++j) {
          if (diff & (1 << j)) {
            whites[j] = ((Math.random() * 1073741824)|0) % 25;
          }
          sum += whites[j];
        }
        out[i] = (sum * 0.01666666) - 1;
      }
      this._key = key;
    };
    return ctor;
  })();

  cc.ugen.specs.ClipNoise = cc.ugen.specs.WhiteNoise;
  
  cc.unit.specs.ClipNoise = (function() {
    var ctor = function() {
      this.process = next;
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = Math.random() < 0.5 ? -1 : +1;
      }
    };
    return ctor;
  })();

  cc.ugen.specs.GrayNoise = cc.ugen.specs.WhiteNoise;

  cc.unit.specs.GrayNoise = (function() {
    var ctor = function() {
      this.process = next;
      this._counter = 0;
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var counter = this._counter;
      for (var i = 0; i < inNumSamples; ++i) {
        // counter ^= 1L << (trand(s1,s2,s3) & 31);
        // ZXP(out) = counter * 4.65661287308e-10f;
        counter ^= 1 << ((Math.random() * 31)|0);
        out[i] = counter * 4.65661287308e-10;
      }
      this._counter = counter;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Crackle = {
    $ar: {
      defaults: "chaosParam=1.5,mul=1,add=0",
      ctor: function(chaosParam, mul, add) {
        return this.multiNew(2, chaosParam).madd(mul, add);
      }
    },
    $kr: {
      defaults: "chaosParam=1.5,mul=1,add=0",
      ctor: function(chaosParam, mul, add) {
        return this.multiNew(1, chaosParam).madd(mul, add);
      }
    }
  };

  cc.unit.specs.Crackle = (function() {
    var ctor = function() {
      this.process = next;
      this._y1 = Math.random();
      this._y2 = 0;
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var paramf = this.inputs[0][0];
      var y1 = this._y1;
      var y2 = this._y2;
      var y0;
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = y0 = Math.abs(y1 * paramf - y2 - 0.05);
        y2 = y1;
        y1 = y0;
      }
      this._y1 = y1;
      this._y2 = y2;
    };
    return ctor;
  })();

  cc.ugen.specs.Logistic = {
    $ar: {
      defaults: "chaosParam=1.5,freq=1000,init=0.5,mul=1,add=0",
      ctor: function(chaosParam, freq, init, mul, add) {
        return this.multiNew(2, chaosParam, freq, init).madd(mul, add);
      }
    },
    $kr: {
      defaults: "chaosParam=1.5,freq=1000,init=0.5,mul=1,add=0",
      ctor: function(chaosParam, freq, init, mul, add) {
        return this.multiNew(1, chaosParam, freq, init).madd(mul, add);
      }
    }
  };
  
  cc.unit.specs.Logistic = (function() {
    var ctor = function() {
      this.process = next;
      this._y1 = this.inputs[2][0];
      this._counter = 0;
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var paramf  = this.inputs[0][0];
      var freq    = this.inputs[1][0];
      var y1      = this._y1;
      var counter = this._counter;
      var remain  = inNumSamples;
      var sampleRate = this.rate.sampleRate;
      var nsmps, i, j = 0;
      do {
        if (counter <= 0) {
          counter = Math.max(1, sampleRate / Math.max(0.001, freq))|0;
          y1 = paramf * y1 * (1.0 - y1); // chaotic equation
        }
        nsmps = Math.min(counter, remain);
        counter -= nsmps;
        remain  -= nsmps;
        for (i = 0; i < nsmps; ++i) {
          out[j++] = y1;
        }
      } while (remain);
      this._y1 = y1;
      this._counter = counter;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Dust = {
    $ar: {
      defaults: "density=0,mul=1,add=0",
      ctor: function(density, mul, add) {
        return this.multiNew(2, density).madd(mul, add);
      }
    },
    $kr: {
      defaults: "density=0,mul=1,add=0",
      ctor: function(density, mul, add) {
        return this.multiNew(1, density).madd(mul, add);
      }
    }
  };
  
  cc.unit.specs.Dust = (function() {
    var ctor = function() {
      this.process  = next;
      this._density = 0;
      this._scale   = 0;
      this._thresh  = 0;
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var density = this.inputs[0][0];
      var thresh, scale;
      if (density !== this._density) {
        thresh = this._thresh = density * this.rate.sampleDur;
        scale  = this._scale  = thresh > 0 ? 1 / thresh : 0;
        this._density = density;
      } else {
        thresh = this._thresh;
        scale  = this._scale;
      }
      for (var i = 0; i < inNumSamples; ++i) {
        var z = Math.random();
        out[i] = z < thresh ? z * scale : 0;
      }
    };
    return ctor;
  })();

  cc.ugen.specs.Dust2 = cc.ugen.specs.Dust;
  
  cc.unit.specs.Dust2 = (function() {
    var ctor = function() {
      this.process  = next;
      this._density = 0;
      this._scale   = 0;
      this._thresh  = 0;
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var density = this.inputs[0][0];
      var thresh, scale;
      if (density !== this._density) {
        thresh = this._thresh = density * this.rate.sampleDur;
        scale  = this._scale  = thresh > 0 ? 2 / thresh : 0;
        this._density = density;
      } else {
        thresh = this._thresh;
        scale  = this._scale;
      }
      for (var i = 0; i < inNumSamples; ++i) {
        var z = Math.random();
        out[i] = z < thresh ? z * scale - 1 : 0;
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.LFNoise0 = {
    $ar: {
      defaults: "freq=500,mul=1,add=0",
      ctor: function(freq, mul, add) {
        return this.multiNew(2, freq).madd(mul, add);
      }
    },
    $kr: {
      defaults: "freq=500,mul=1,add=0",
      ctor: function(freq, mul, add) {
        return this.multiNew(1, freq).madd(mul, add);
      }
    }
  };
  
  cc.unit.specs.LFNoise0 = (function() {
    var ctor = function() {
      this.process  = next;
      this._level   = 0;
      this._counter = 0;
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var freq = this.inputs[0][0];
      var level   = this._level;
      var counter = this._counter;
      var i, remain = inNumSamples;
      var j = 0;
      do {
        if (counter <= 0) {
          counter = Math.max(1, (this.rate.sampleRate / Math.max(freq, 0.001))|0);
          level = Math.random() * 2 - 1;
        }
        var nsmps = Math.min(remain, counter);
        remain  -= nsmps;
        counter -= nsmps;
        for (i = 0; i < nsmps; ++i) {
          out[j++] = level;
        }
      } while (remain);
      this._counter = counter;
      this._level   = level;
    };
    return ctor;
  })();
  
  cc.ugen.specs.LFNoise1 = cc.ugen.specs.LFNoise0;
  
  cc.unit.specs.LFNoise1 = (function() {
    var ctor = function() {
      this.process  = next;
      this._level   = Math.random() * 2 - 1;
      this._counter = 0;
      this._slope   = 0;
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var freq = this.inputs[0][0];
      var level   = this._level;
      var slope   = this._slope;
      var counter = this._counter;
      var i, remain = inNumSamples;
      var j = 0;
      do {
        if (counter <= 0) {
          counter = Math.max(1, (this.rate.sampleRate / Math.max(freq, 0.001))|0);
          var nextLevel = Math.random() * 2 - 1;
          slope = (nextLevel - level) / counter;
        }
        var nsmps = Math.min(remain, counter);
        remain  -= nsmps;
        counter -= nsmps;
        for (i = 0; i < nsmps; ++i) {
          out[j++] = level;
          level += slope;
        }
      } while (remain);
      this._level   = level;
      this._slope   = slope;
      this._counter = counter;
    };
    return ctor;
  })();

  cc.ugen.specs.LFNoise2 = cc.ugen.specs.LFNoise0;
  
  cc.unit.specs.LFNoise2 = (function() {
    var ctor = function() {
      this.process  = next;
      this._level   = 0;
      this._counter = 0;
      this._slope   = 0;
      this._curve   = 0;
      this._nextValue = Math.random() * 2 - 1;
      this._nextMidPt = this._nextValue * 0.5;
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var freq = this.inputs[0][0];
      var level   = this._level;
      var slope   = this._slope;
      var curve   = this._curve;
      var counter = this._counter;
      var i, remain = inNumSamples;
      var j = 0;
      do {
        if (counter <= 0) {
          var value = this._nextValue;
          this._nextValue = Math.random() * 2 - 1;
          level = this._nextMidPt;
          this._nextMidPt = (this._nextValue + value) * 0.5;
          counter = Math.max(2, (this.rate.sampleRate / Math.max(freq, 0.001))|0);
          var fseglen = counter;
          curve = 2 * (this._nextMidPt - level - fseglen * slope) / (fseglen * fseglen + fseglen);
        }
        var nsmps = Math.min(remain, counter);
        remain  -= nsmps;
        counter -= nsmps;
        for (i = 0; i < nsmps; ++i) {
          out[j++] = level;
          slope += curve;
          level += slope;
        }
      } while (remain);
      this._level   = level;
      this._slope   = slope;
      this._curve   = curve;
      this._counter = counter;
    };
    return ctor;
  })();
  
  cc.ugen.specs.LFClipNoise = cc.ugen.specs.LFNoise0;
  
  cc.unit.specs.LFClipNoise = (function() {
    var ctor = function() {
      this.process = next;
      this._counter = 0;
      this._level   = 0;
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var freq = this.inputs[0][0];
      var level   = this._level;
      var counter = this._counter;
      var i, remain = inNumSamples;
      var j = 0;
      do {
        if (counter <= 0) {
          counter = Math.max(1, (this.rate.sampleRate / Math.max(freq, 0.001))|0);
          level = Math.random() < 0.5 ? -1 : +1;
        }
        var nsmps = Math.min(remain, counter);
        remain  -= nsmps;
        counter -= nsmps;
        for (i = 0; i < nsmps; ++i) {
          out[j++] = level;
        }
      } while (remain);
      this._counter = counter;
      this._level   = level;
    };
    return ctor;
  })();
  
  cc.ugen.specs.LFDNoise0 = cc.ugen.specs.LFNoise0;
  
  cc.unit.specs.LFDNoise0 = (function() {
    var ctor = function() {
      if (this.inRates[0] === 2) {
        this.process = next;
      } else {
        this.process = next_k;
      }
      this._level = 0;
      this._phase = 0;
      next.call(this, 1);
    };
    
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var freqIn = this.inputs[0];
      var level = this._level;
      var phase = this._phase;
      var smpdur = this.rate.sampleDur;
      for (var i = 0; i < inNumSamples; ++i) {
        phase -= freqIn[i] * smpdur;
        if (phase < 0) {
          phase = 1 + (phase % 1);
          level = Math.random() * 2 - 1;
        }
        out[i] = level;
      }
      this._level = level;
      this._phase = phase;
    };
    
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var freq = this.inputs[0][0];
      var level = this._level;
      var phase = this._phase;
      var smpdur = this.rate.sampleDur;
      var dphase = smpdur * freq;
      for (var i = 0; i < inNumSamples; ++i) {
        phase -= dphase;
        if (phase < 0) {
          phase = 1 + (phase % 1);
          level = Math.random() * 2 - 1;
        }
        out[i] = level;
      }
      this._level = level;
      this._phase = phase;
    };
    
    return ctor;
  })();
  
  cc.ugen.specs.LFDNoise1 = cc.ugen.specs.LFNoise0;
  
  cc.unit.specs.LFDNoise1 = (function() {
    var ctor = function() {
      if (this.inRates[0] === 2) {
        this.process = next;
      } else {
        this.process = next_k;
      }
      this._phase = 0;
      this._prevLevel = 0;
      this._nextLevel = 0;
      next.call(this, 1);
    };

    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var freqIn = this.inputs[0];
      var prevLevel = this._prevLevel;
      var nextLevel = this._nextLevel;
      var phase = this._phase;
      var smpdur = this.rate.sampleDur;
      for (var i = 0; i < inNumSamples; ++i) {
        phase -= freqIn[i] * smpdur;
        if (phase < 0) {
          phase = 1 + (phase % 1);
          prevLevel = nextLevel;
          nextLevel = Math.random() * 2 - 1;
        }
        out[i] = nextLevel + ( phase * (prevLevel - nextLevel) );
      }
      this._prevLevel = prevLevel;
      this._nextLevel = nextLevel;
      this._phase     = phase;
    };

    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var freq = this.inputs[0][0];
      var prevLevel = this._prevLevel;
      var nextLevel = this._nextLevel;
      var phase = this._phase;
      var smpdur = this.rate.sampleDur;
      var dphase = freq * smpdur;
      for (var i = 0; i < inNumSamples; ++i) {
        phase -= dphase;
        if (phase < 0) {
          phase = 1 + (phase % 1);
          prevLevel = nextLevel;
          nextLevel = Math.random() * 2 - 1;
        }
        out[i] = nextLevel + ( phase * (prevLevel - nextLevel) );
      }
      this._prevLevel = prevLevel;
      this._nextLevel = nextLevel;
      this._phase     = phase;
    };
    
    return ctor;
  })();
  
  cc.ugen.specs.LFDNoise3 = cc.ugen.specs.LFNoise0;
  
  cc.unit.specs.LFDNoise3 = (function() {
    var ctor = function() {
      if (this.inRates[0] === 2) {
        this.process = next;
      } else {
        this.process = next_k;
      }
      this._phase  = 0;
      this._levelA = 0;
      this._levelB = 0;
      this._levelC = 0;
      this._levelD = 0;
      next.call(this, 1);
    };

    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var freqIn = this.inputs[0];
      var a = this._levelA;
      var b = this._levelB;
      var c = this._levelC;
      var d = this._levelD;
      var phase = this._phase;
      var smpdur = this.rate.sampleDur;
      for (var i = 0; i < inNumSamples; ++i) {
        phase -= freqIn[i] * smpdur;
        if (phase < 0) {
          phase = 1 + (phase % 1);
          a = b;
          b = c;
          c = d;
          d = Math.random() * 2 - 1;
        }
        out[i] = cubicinterp(1 - phase, a, b, c, d);
      }
      this._levelA = a;
      this._levelB = b;
      this._levelC = c;
      this._levelD = d;
      this._phase  = phase;
    };
    
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var freq = this.inputs[0][0];
      var a = this._levelA;
      var b = this._levelB;
      var c = this._levelC;
      var d = this._levelD;
      var phase = this._phase;
      var smpdur = this.rate.sampleDur;
      var dphase = freq * smpdur;
      for (var i = 0; i < inNumSamples; ++i) {
        phase -= dphase;
        if (phase < 0) {
          phase = 1 + (phase % 1);
          a = b;
          b = c;
          c = d;
          d = Math.random() * 2 - 1;
        }
        out[i] = cubicinterp(1 - phase, a, b, c, d);
      }
      this._levelA = a;
      this._levelB = b;
      this._levelC = c;
      this._levelD = d;
      this._phase  = phase;
    };
    
    return ctor;
  })();
  
  cc.ugen.specs.LFDClipNoise = cc.ugen.specs.LFNoise0;
  
  cc.unit.specs.LFDClipNoise = (function() {
    var ctor = function() {
      if (this.inRates[0] === 2) {
        this.process = next;
      } else {
        this.process = next_k;
      }
      this._level = 0;
      this._phase = 0;
      next.call(this, 1);
    };
    
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var freqIn = this.inputs[0];
      var level = this._level;
      var phase = this._phase;
      var smpdur = this.rate.sampleDur;
      for (var i = 0; i < inNumSamples; ++i) {
        phase -= freqIn[i] * smpdur;
        if (phase < 0) {
          phase = 1 + (phase % 1);
          level = Math.random() < 0.5 ? -1 : +1;
        }
        out[i] = level;
      }
      this._level = level;
      this._phase = phase;
    };
    
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var freq = this.inputs[0][0];
      var level = this._level;
      var phase = this._phase;
      var smpdur = this.rate.sampleDur;
      var dphase = smpdur * freq;
      for (var i = 0; i < inNumSamples; ++i) {
        phase -= dphase;
        if (phase < 0) {
          phase = 1 + (phase % 1);
          level = Math.random() < 0.5 ? -1 : +1;
        }
        out[i] = level;
      }
      this._level = level;
      this._phase = phase;
    };
    
    return ctor;
  })();

  module.exports = {};

});
define('cc/plugins/osc', function(require, exports, module) {
  
  var cc = require("../cc");

  var utils = require("./utils");
  
  var twopi = 2 * Math.PI;
  var kSineSize = utils.kSineSize;
  var kSineMask = utils.kSineMask;
  var kBadValue = utils.kBadValue;
  var gSineWavetable = utils.gSineWavetable;
  var gSine    = utils.gSine;
  var gInvSine = utils.gInvSine;

  var osc_next_aa = function(unit, inNumSamples, calc) {
    var out = unit.outputs[0];
    var freqIn  = unit.inputs[unit._freqIndex];
    var phaseIn = unit.inputs[unit._phaseIndex];
    var mask  = unit._mask;
    var table = unit._table;
    var cpstoinc = unit._cpstoinc;
    var radtoinc = unit._radtoinc;
    var x = unit._x, i;
    for (i = 0; i < inNumSamples; ++i) {
      out[i] = calc(table, mask, x + radtoinc * phaseIn[i]);
      x += freqIn[i] * cpstoinc;
    }
    unit._x = x;
  };
  var osc_next_ak = function(unit, inNumSamples, calc) {
    var out = unit.outputs[0];
    var freqIn    = unit.inputs[unit._freqIndex];
    var nextPhase = unit.inputs[unit._phaseIndex][0];
    var mask  = unit._mask;
    var table = unit._table;
    var radtoinc = unit._radtoinc;
    var cpstoinc = unit._cpstoinc;
    var phase = unit._phase;
    var x = unit._x, i;
    if (nextPhase === phase) {
      phase *= radtoinc;
      for (i = 0; i < inNumSamples; ++i) {
        out[i] = calc(table, mask, x + phase);
        x += freqIn[i] * cpstoinc;
      }
    } else {
      var phase_slope = (nextPhase - phase) * unit.rate.slopeFactor;
      for (i = 0; i < inNumSamples; ++i) {
        out[i] = calc(table, mask, x + radtoinc * phase);
        phase += phase_slope;
        x += freqIn[i] * cpstoinc;
      }
      unit._phase = nextPhase;
    }
    unit._x = x;
  };
  var osc_next_ai = function(unit, inNumSamples, calc) {
    var out = unit.outputs[0];
    var freqIn = unit.inputs[unit._freqIndex];
    var phase  = unit._phase * unit._radtoinc;
    var mask  = unit._mask;
    var table = unit._table;
    var cpstoinc = unit._cpstoinc;
    var x = unit._x, i;
    for (i = 0; i < inNumSamples; ++i) {
      out[i] = calc(table, mask, x + phase);
      x += cpstoinc * freqIn[i];
    }
    unit._x = x;
  };
  var osc_next_ka = function(unit, inNumSamples, calc) {
    var out = unit.outputs[0];
    var nextFreq = unit.inputs[unit._freqIndex][0];
    var phaseIn = unit.inputs[unit._phaseIndex];
    var mask  = unit._mask;
    var table = unit._table;
    var radtoinc = unit._radtoinc;
    var cpstoinc = unit._cpstoinc;
    var freq = unit._freq;
    var x = unit._x, i;
    if (nextFreq === freq) {
      freq *= cpstoinc;
      for (i = 0; i < inNumSamples; ++i) {
        out[i] = calc(table, mask, x + radtoinc * phaseIn[i]);
        x += freq;
      }
    } else {
      var freq_slope = (nextFreq - freq) * unit.rate.slopeFactor;
      for (i = 0; i < inNumSamples; ++i) {
        out[i] = calc(table, mask, x + radtoinc * phaseIn[i]);
        x += freq * cpstoinc;
        freq += freq_slope;
      }
      unit._freq = nextFreq;
    }
    unit._x = x;
  };
  var osc_next_kk = function(unit, inNumSamples, calc) {
    var out = unit.outputs[0];
    var nextFreq  = unit.inputs[unit._freqIndex][0];
    var nextPhase = unit.inputs[unit._phaseIndex][0];
    var mask  = unit._mask;
    var table = unit._table;
    var radtoinc = unit._radtoinc;
    var cpstoinc = unit._cpstoinc;
    var freq = unit._freq;
    var phase = unit._phase;
    var x = unit._x, i;
    if (nextFreq === freq && nextPhase === phase) {
      freq  *= cpstoinc;
      phase *= radtoinc;
      for (i = 0; i < inNumSamples; ++i) {
        out[i] = calc(table, mask, x + phase);
        x += freq;
      }
    } else {
      var freq_slope  = (nextFreq  - freq ) * unit.rate.slopeFactor;
      var phase_slope = (nextPhase - phase) * unit.rate.slopeFactor;
      for (i = 0; i < inNumSamples; ++i) {
        out[i] = calc(table, mask, x + radtoinc * phase);
        x += freq * cpstoinc;
        freq  += freq_slope;
        phase += phase_slope;
      }
      unit._freq  = nextFreq;
      unit._phase = nextPhase;
    }
    unit._x = x;
  };
  var get_table = function(unit, instance, shift) {
    var buffer = instance.buffers[unit._bufnumIn[0]|0];
    if (buffer) {
      var samples = buffer.samples;
      if (samples) {
        if (unit._table === samples) {
          return true;
        }
        var length  = samples.length;
        var logSize = Math.log(length) / Math.log(2);
        if (logSize === (logSize|0)) {
          length >>= shift;
          unit._radtoinc = length / twopi;
          unit._cpstoinc = length * unit.rate.sampleDur;
          unit._table    = samples;
          unit._mask     = length - 1;
          return true;
        }
      }
    }
    return false;
  };
  
  cc.ugen.specs.Osc = {
    $ar: {
      defaults: "bufnum=0,freq=440,phase=0,mul=1,add=0",
      ctor: function(bufnum, freq, phase, mul, add) {
        return this.multiNew(2, bufnum, freq, phase).madd(mul, add);
      }
    },
    $kr: {
      defaults: "bufnum=0,freq=440,phase=0,mul=1,add=0",
      ctor: function(bufnum, freq, phase, mul, add) {
        return this.multiNew(1, bufnum, freq, phase).madd(mul, add);
      }
    }
  };

  cc.unit.specs.Osc = (function() {
    var ctor = function() {
      this._bufnumIn = this.inputs[0];
      this._freq  = this.inputs[1][0];
      this._phase = this.inputs[2][0];
      this._freqIndex  = 1;
      this._phaseIndex = 2;
      this._radtoinc = 0;
      this._cpstoinc = 0;
      this._mask    = 0;
      this._table   = null;
      this._x = 0;
      switch (this.inRates[0]) {
      case 2:
        switch (this.inRates[1]) {
        case 2  : this.process = next_aa; break;
        case 1: this.process = next_ak; break;
        case 0 : this.process = next_ai; break;
        case 3 : this.process = next_ak; break;
        }
        break;
      default:
        switch (this.inRates[1]) {
        case 2  : this.process = next_ka; break;
        case 1: this.process = next_kk; break;
        case 0 : this.process = next_kk; break;
        case 3 : this.process = next_kk; break;
        }
      }
    };
    var wcalc = function(table, mask, pphase) {
      var index = (pphase & mask) << 1;
      return table[index] + (pphase-(pphase|0)) * table[index+1];
    };
    var next_aa = function(inNumSamples, instance) {
      if (get_table(this, instance, 1)) {
        osc_next_aa(this, inNumSamples, wcalc);
      }
    };
    var next_ak = function(inNumSamples, instance) {
      if (get_table(this, instance, 1)) {
        osc_next_ak(this, inNumSamples, wcalc);
      }
    };
    var next_ai = function(inNumSamples, instance) {
      if (get_table(this, instance, 1)) {
        osc_next_ai(this, inNumSamples, wcalc);
      }
    };
    var next_ka = function(inNumSamples, instance) {
      if (get_table(this, instance, 1)) {
        osc_next_ka(this, inNumSamples, wcalc);
      }
    };
    var next_kk = function(inNumSamples, instance) {
      if (get_table(this, instance, 1)) {
        osc_next_kk(this, inNumSamples, wcalc);
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.SinOsc = {
    $ar: {
      defaults: "freq=440,phase=0,mul=1,add=0",
      ctor: function(freq, phase, mul, add) {
        return this.multiNew(2, freq, phase).madd(mul, add);
      }
    },
    $kr: {
      defaults: "freq=440,phase=0,mul=1,add=0",
      ctor: function(freq, phase, mul, add) {
        return this.multiNew(1, freq, phase).madd(mul, add);
      }
    }
  };

  cc.unit.specs.SinOsc = (function() {
    var ctor = function() {
      this._freq  = this.inputs[0][0];
      this._phase = this.inputs[1][0];
      this._freqIndex  = 0;
      this._phaseIndex = 1;
      this._radtoinc = kSineSize / twopi;
      this._cpstoinc = kSineSize * this.rate.sampleDur;
      this._mask  = kSineMask;
      this._table = gSineWavetable;
      this._x = 0;
      switch (this.inRates[0]) {
      case 2:
        switch (this.inRates[1]) {
        case 2  : this.process = next_aa; break;
        case 1: this.process = next_ak; break;
        case 0 : this.process = next_ai; break;
        case 3 : this.process = next_ak; break;
        }
        break;
      default:
        switch (this.inRates[1]) {
        case 2  : this.process = next_ka; break;
        case 1: this.process = next_kk; break;
        case 0 : this.process = next_kk; break;
        case 3 : this.process = next_kk; break;
        }
      }
      osc_next_kk(this, 1, wcalc);
    };
    var wcalc = function(table, mask, pphase) {
      var index = (pphase & mask) << 1;
      return table[index] + (pphase-(pphase|0)) * table[index+1];
    };
    var next_aa = function(inNumSamples) {
      osc_next_aa(this, inNumSamples, wcalc);
    };
    var next_ak = function(inNumSamples) {
      osc_next_ak(this, inNumSamples, wcalc);
    };
    var next_ai = function(inNumSamples) {
      osc_next_ai(this, inNumSamples, wcalc);
    };
    var next_ka = function(inNumSamples) {
      osc_next_ka(this, inNumSamples, wcalc);
    };
    var next_kk = function(inNumSamples) {
      osc_next_kk(this, inNumSamples, wcalc);
    };
    return ctor;
  })();

  cc.ugen.specs.PMOsc = {
    $ar: {
      defaults: "carfreq=0,modfreq=0,pmindex=0,modphase=0,mul=1,add=0",
      ctor: function(carfreq, modfreq, pmindex, modphase, mul, add) {
        var SinOsc = cc.global.SinOsc;
        return SinOsc.ar(carfreq, SinOsc.ar(modfreq, modphase, pmindex), mul, add);
      }
    },
    $kr: {
      defaults: "carfreq=0,modfreq=0,pmindex=0,modphase=0,mul=1,add=0",
      ctor: function(carfreq, modfreq, pmindex, modphase, mul, add) {
        var SinOsc = cc.global.SinOsc;
        return SinOsc.kr(carfreq, SinOsc.kr(modfreq, modphase, pmindex), mul, add);
      }
    }
  };
  
  cc.ugen.specs.SinOscFB = {
    $ar: {
      defaults: "freq=440,feedback=0,mul=1,add=0",
      ctor: function(freq, feedback, mul, add) {
        return this.multiNew(2, freq, feedback).madd(mul, add);
      }
    },
    $kr: {
      defaults: "freq=440,feedback=0,mul=1,add=0",
      ctor: function(freq, feedback, mul, add) {
        return this.multiNew(1, freq, feedback).madd(mul, add);
      }
    }
  };

  cc.unit.specs.SinOscFB = (function() {
    var ctor = function() {
      this.process = next;
      this._radtoinc = kSineSize / twopi;
      this._cpstoinc = kSineSize * this.rate.sampleDur;
      this._mask  = kSineMask;
      this._table = gSineWavetable;
      this._freq     = this.inputs[0][0];
      this._feedback = this.inputs[1][0] * this._radtoinc;
      this._y = 0;
      this._x = 0;
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var nextFreq     = this.inputs[0][0];
      var nextFeedback = this.inputs[1][0];
      var mask  = this._mask;
      var table = this._table;
      var radtoinc = this._radtoinc;
      var cpstoinc = this._cpstoinc;
      var freq = this._freq;
      var feedback = this._feedback;
      var y = this._y;
      var x = this._x, pphase, index, i;
      if (nextFreq === freq && nextFeedback === feedback) {
        freq     *= cpstoinc;
        feedback *= radtoinc;
        for (i = 0; i < inNumSamples; ++i) {
          pphase = x + feedback * y;
          index  = (pphase & mask) << 1;
          out[i] = y = table[index] + (pphase-(pphase|0)) * table[index+1];
          x += freq;
        }
      } else {
        var freq_slope     = (nextFreq     - freq    ) * this.rate.slopeFactor;
        var feedback_slope = (nextFeedback - feedback) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          pphase = x + radtoinc * feedback * y;
          index  = (pphase & mask) << 1;
          out[i] = y = table[index] + (pphase-(pphase|0)) * table[index+1];
          x += freq * cpstoinc;
          freq     += freq_slope;
          feedback += feedback_slope;
        }
        this._freq     = nextFreq;
        this._feedback = nextFeedback;
      }
      this._y = y;
      this._x = x;
    };
    return ctor;
  })();
  
  cc.ugen.specs.OscN = {
    $ar: {
      defaults: "bufnum=0,freq=440,phase=0,mul=1,add=0",
      ctor: function(bufnum, freq, phase, mul, add) {
        return this.multiNew(2, bufnum, freq, phase).madd(mul, add);
      }
    },
    $kr: {
      defaults: "bufnum=0,freq=440,phase=0,mul=1,add=0",
      ctor: function(bufnum, freq, phase, mul, add) {
        return this.multiNew(1, bufnum, freq, phase).madd(mul, add);
      }
    }
  };

  cc.unit.specs.OscN = (function() {
    var ctor = function() {
      this._bufnumIn = this.inputs[0];
      this._freq  = this.inputs[1][0];
      this._phase = this.inputs[2][0];
      this._freqIndex  = 1;
      this._phaseIndex = 2;
      this._radtoinc = 0;
      this._cpstoinc = 0;
      this._mask    = 0;
      this._table   = null;
      this._x = 0;
      
      switch (this.inRates[0]) {
      case 2:
        switch (this.inRates[1]) {
        case 2  : this.process = next_aa; break;
        case 1: this.process = next_ak; break;
        case 0 : this.process = next_ai; break;
        case 3 : this.process = next_ak; break;
        }
        break;
      default:
        switch (this.inRates[1]) {
        case 2  : this.process = next_ka; break;
        case 1: this.process = next_kk; break;
        case 0 : this.process = next_kk; break;
        case 3 : this.process = next_kk; break;
        }
      }
    };
    var calc = function(table, mask, pphase) {
      return table[pphase & mask];
    };
    var next_aa = function(inNumSamples, instance) {
      if (get_table(this, instance, 0)) {
        osc_next_aa(this, inNumSamples, calc);
      }
    };
    var next_ak = function(inNumSamples, instance) {
      if (get_table(this, instance, 0)) {
        osc_next_ak(this, inNumSamples, calc);
      }
    };
    var next_ai = function(inNumSamples, instance) {
      if (get_table(this, instance, 0)) {
        osc_next_ai(this, inNumSamples, calc);
      }
    };
    var next_ka = function(inNumSamples, instance) {
      if (get_table(this, instance, 0)) {
        osc_next_ka(this, inNumSamples, calc);
      }
    };
    var next_kk = function(inNumSamples, instance) {
      if (get_table(this, instance, 0)) {
        osc_next_kk(this, inNumSamples, calc);
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.FSinOsc = {
    $ar: {
      defaults: "freq=440,iphase=0,mul=1,add=0",
      ctor: function(freq, phase, mul, add) {
        return this.multiNew(2, freq, phase).madd(mul, add);
      }
    },
    $kr: {
      defaults: "freq=440,iphase=0,mul=1,add=0",
      ctor: function(freq, phase, mul, add) {
        return this.multiNew(1, freq, phase).madd(mul, add);
      }
    }
  };

  cc.unit.specs.FSinOsc = (function() {
    var ctor = function() {
      this.process = next;
      this._freq = this.inputs[0][0];
      var iphase = this.inputs[1][0];
      var w = this._freq * this.rate.radiansPerSample;
      this._b1 = 2 * Math.cos(w);
      this._y1 = Math.sin(iphase);
      this._y2 = Math.sin(iphase - w);
      this.outputs[0][0] = this._y1;
    };
    var next = function() {
      var out = this.outputs[0];
      var freq = this.inputs[0][0];
      var rate = this.rate;
      var b1, y0, y1, y2, w, i, j;
      if (freq !== this._freq) {
        this._freq = freq;
        w = freq * rate.radiansPerSample;
        this._b1 = b1 = 2 * Math.cos(w);
      } else {
        b1 = this._b1;
      }
      y1 = this._y1;
      y2 = this._y2;
      j = 0;
      for (i = rate.filterLoops; i--; ) {
        out[j++] = y0 = b1 * y1 - y2;
        out[j++] = y2 = b1 * y0 - y1;
        out[j++] = y1 = b1 * y2 - y0;
      }
      for (i = rate.filterRemain; i--; ) {
        out[j++] = y0 = b1 * y1 - y2;
        y2 = y1;
        y1 = y0;
      }
      this._y1 = y1;
      this._y2 = y2;
    };
    return ctor;
  })();
  
  cc.ugen.specs.LFSaw = {
    $ar: {
      defaults: "freq=440,iphase=0,mul=1,add=0",
      ctor: function(freq, iphase, mul, add) {
        return this.multiNew(2, freq, iphase).madd(mul, add);
      }
    },
    $kr: {
      defaults: "freq=440,iphase=0,mul=1,add=0",
      ctor: function(freq, iphase, mul, add) {
        return this.multiNew(1, freq, iphase).madd(mul, add);
      }
    }
  };
  
  cc.unit.specs.LFSaw = (function() {
    var ctor = function() {
      this.process = next;
      this._cpstoinc = 2 * this.rate.sampleDur;
      this._phase    = this.inputs[1][0];
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out   = this.outputs[0];
      var freq  = this.inputs[0][0] * this._cpstoinc;
      var phase = this._phase;
      var i;
      if (freq >= 0) {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = phase;
          phase += freq;
          if (phase >= 1) {
            phase -= 2;
          }
        }
      } else {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = phase;
          phase += freq;
          if (phase <= -1) {
            phase += 2;
          }
        }
      }
      this._phase = phase;
    };
    return ctor;
  })();
  
  cc.ugen.specs.LFPar = cc.ugen.specs.LFSaw;

  cc.unit.specs.LFPar = (function() {
    var ctor = function() {
      this.process = next;
      this._cpstoinc = 4 * this.rate.sampleDur;
      this._phase   = this.inputs[1][0];
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out   = this.outputs[0];
      var freq  = this.inputs[0][0] * this._cpstoinc;
      var phase = this._phase;
      var z, y;
      for (var i = 0; i < inNumSamples; ++i) {
        if (phase < 1) {
          z = phase;
          y = 1 - z * z;
        } else if (phase < 3) {
          z = phase - 2;
          y = z * z - 1;
        } else {
          phase -= 4;
          z = phase;
          y = 1 - z * z;
        }
        out[i] = y;
        phase += freq;
      }
      this._phase = phase;
    };
    return ctor;
  })();
  
  cc.ugen.specs.LFCub = cc.ugen.specs.LFSaw;

  cc.unit.specs.LFCub = (function() {
    var ctor = function() {
      this.process = next;
      this._cpstoinc = 2 * this.rate.sampleDur;
      this._phase   = this.inputs[1][0] + 0.5;
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out   = this.outputs[0];
      var freq  = this.inputs[0][0] * this._cpstoinc;
      var phase = this._phase;
      var z;
      for (var i = 0; i < inNumSamples; ++i) {
        if (phase < 1) {
          z = phase;
        } else if (phase < 2) {
          z = 2 - phase;
        } else {
          phase -= 2;
          z = phase;
        }
        out[i] = z * z * (6 - 4 * z) - 1;
        phase += freq;
      }
      this._phase = phase;
    };
    return ctor;
  })();
  
  cc.ugen.specs.LFTri = cc.ugen.specs.LFSaw;

  cc.unit.specs.LFTri = (function() {
    var ctor = function() {
      this.process = next;
      this._cpstoinc = 4 * this.rate.sampleDur;
      this._phase   = this.inputs[1][0];
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out   = this.outputs[0];
      var freq  = this.inputs[0][0] * this._cpstoinc;
      var phase = this._phase;
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = phase > 1 ? 2 - phase : phase;
        phase += freq;
        if (phase >= 3) {
          phase -= 4;
        }
      }
      this._phase = phase;
    };
    return ctor;
  })();
  
  cc.ugen.specs.LFPulse = {
    $ar: {
      defaults: "freq=440,iphase=0,width=0.5,mul=1,add=0",
      ctor: function(freq, iphase, width, mul, add) {
        return this.multiNew(2, freq, iphase, width).madd(mul, add);
      }
    },
    $kr: {
      defaults: "freq=440,iphase=0,width=0.5,mul=1,add=0",
      ctor: function(freq, iphase, width, mul, add) {
        return this.multiNew(1, freq, iphase, width).madd(mul, add);
      }
    }
  };

  cc.unit.specs.LFPulse = (function() {
    var ctor = function() {
      this.process = next;
      this._cpstoinc = this.rate.sampleDur;
      this._phase   = this.inputs[1][0];
      this._duty    = this.inputs[2][0];
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var freq     = this.inputs[0][0] * this._cpstoinc;
      var nextDuty = this.inputs[2][0];
      var duty  = this._duty;
      var phase = this._phase;
      var z;
      for (var i = 0; i < inNumSamples; ++i) {
        if (phase > 1) {
          phase -= 1;
          duty = nextDuty;
          z = duty < 0.5 ? 1 : 0;
        } else {
          z = phase < duty ? 1 : 0;
        }
        out[i] = z;
        phase += freq;
      }
      this._duty  = duty;
      this._phase = phase;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Blip = {
    $ar: {
      defaults: "freq=440,numharm=200,mul=1,add=0",
      ctor: function(freq, numharm, mul, add) {
        return this.multiNew(2, freq, numharm).madd(mul, add);
      }
    }
  };

  cc.unit.specs.Blip = (function() {
    var ctor = function() {
      this.process = next;
      this._freq    = this.inputs[0][0];
      this._numharm = this.inputs[1][0]|0;
      this._cpstoinc = kSineSize * this.rate.sampleDur * 0.5;
      var N = this._numharm;
      var maxN = Math.max(1, (this.rate.sampleRate * 0.5 / this._freq)|0);
      this._N  = Math.max(1, Math.min(N, maxN));
      this._mask = kSineMask;
      this._scale = 0.5 / this._N;
      this._phase = 0;
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var freq  = this.inputs[0][0];
      var numharm = this.inputs[1][0]|0;
      var phase = this._phase;
      var mask = this._mask;
      var numtbl = gSine, dentbl = gInvSine;
      var N, N2, maxN, prevN, prevN2, scale, prevScale, crossfade;
      var tblIndex, t0, t1, pfrac, denom, rphase, numer, n1, n2;
      var i, xfade, xfade_slope;
      if (numharm !== this._numharm || freq !== this._freq) {
        N    = numharm;
        maxN = Math.max(1, (this.rate.sampleRate * 0.5 / this._freq)|0);
        if (maxN < N) {
          N = maxN;
          freq = this._cpstoinc * Math.max(this._freq, freq);
        } else {
          if (N < 1) {
            N = 1;
          }
          freq = this._cpstoinc * freq;
        }
        crossfade = (N !== this._N);
        prevN = this._N;
        prevScale = this._scale;
        this._N = Math.max(1, Math.min(N, maxN));
        this._scale = scale = 0.5 / N;
      } else {
        N = this._N;
        freq = this._cpstoinc * freq;
        scale = this._scale;
        crossfade = false;
      }
      N2 = 2 * N + 1;
      if (crossfade) {
        prevN2 = 2 * prevN + 1;
        xfade_slope = this.rate.slopeFactor;
        xfade = 0;
        for (i = 0; i < inNumSamples; ++i) {
          tblIndex = phase & mask;
          t0 = dentbl[tblIndex];
          t1 = dentbl[tblIndex+1];
          if (t0 === kBadValue || t1 === kBadValue) {
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            pfrac = phase - (phase|0);
            denom = t0 + (t1 - t0) * pfrac;
            if (Math.abs(denom) < 0.0005) {
              out[i] = 1;
            } else {
              rphase = phase * prevN2;
              pfrac = rphase - (rphase|0);
              tblIndex = rphase & mask;
              t0 = numtbl[tblIndex];
              t1 = numtbl[tblIndex+1];
              numer = t0 + (t1 - t0) * pfrac;
              n1 = (numer / denom - 1) * prevScale;

              rphase = phase * N2;
              pfrac = rphase - (rphase|0);
              tblIndex = rphase & mask;
              t0 = numtbl[tblIndex];
              t1 = numtbl[tblIndex+1];
              numer = t0 + (t1 - t0) * pfrac;
              n2 = (numer / denom - 1) * scale;

              out[i] = n1 + xfade * (n2 - n1);
            }
          } else {
            pfrac = phase - (phase|0);
            denom = t0 + (t1 - t0) * pfrac;

            rphase = phase * prevN2;
            pfrac = rphase - (rphase|0);
            tblIndex = rphase & mask;
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            numer = t0 + (t1 - t0) * pfrac;
            n1 = (numer * denom - 1) * prevScale;

            rphase = phase * N2;
            pfrac = rphase - (rphase|0);
            tblIndex = rphase & mask;
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            numer = t0 + (t1 - t0) * pfrac;
            n2 = (numer * denom - 1) * scale;

            out[i] = n1 + xfade * (n2 - n1);
          }
          phase += freq;
          xfade += xfade_slope;
        }
      } else {
        // hmm, if freq is above sr/4 then revert to sine table osc ?
        // why bother, it isn't a common choice for a fundamental.
        for (i = 0; i < inNumSamples; ++i) {
          tblIndex = phase & mask;
          t0 = dentbl[tblIndex];
          t1 = dentbl[tblIndex+1];
          if (t0 === kBadValue || t1 === kBadValue) {
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            pfrac = phase - (phase|0);
            denom = t0 + (t1 - t0) * pfrac;
            if (Math.abs(denom) < 0.0005) {
              out[i] = 1;
            } else {
              rphase = phase * N2;
              pfrac = rphase - (rphase|0);
              tblIndex = rphase & mask;
              t0 = numtbl[tblIndex];
              t1 = numtbl[tblIndex+1];
              numer = t0 + (t1 - t0) * pfrac;
              out[i] = (numer / denom - 1) * scale;
            }
          } else {
            pfrac = phase - (phase|0);
            denom = t0 + (t1 - t0) * pfrac;
            rphase = phase * N2;
            pfrac = rphase - (rphase|0);
            tblIndex = rphase & mask;
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            numer = t0 + (t1 - t0) * pfrac;
            out[i] = (numer * denom - 1) * scale;
          }
          phase += freq;
        }
      }
      if (phase >= 65536) {
        phase -= 65536;
      }
      this._phase = phase;
      this._freq = this.inputs[0][0];
      this._numharm = numharm;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Saw = {
    $ar: {
      defaults: "freq=440,mul=1,add=0",
      ctor: function(freq, mul, add) {
        return this.multiNew(2, freq).madd(mul, add);
      }
    }
  };

  cc.unit.specs.Saw = (function() {
    var ctor = function() {
      this.process = next;
      this._freq = this.inputs[0][0];
      this._cpstoinc = kSineSize * this.rate.sampleDur * 0.5;
      this._N    = Math.max(1, (this.rate.sampleRate * 0.5 / this._freq)|0);
      this._mask = kSineMask;
      this._scale = 0.5 / this._N;
      this._phase = 0;
      this._y1 = -0.46;
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out   = this.outputs[0];
      var freq  = this.inputs[0][0];
      var phase = this._phase;
      var y1 = this._y1;
      var mask = this._mask;
      var numtbl = gSine, dentbl = gInvSine;
      var N, N2, prevN, prevN2, scale, prevScale, crossfade;
      var tblIndex, t0, t1, pfrac, denom, rphase, numer, n1, n2;
      var i, xfade, xfade_slope;
      if (freq !== this._freq) {
        N = Math.max(1, (this.rate.sampleRate * 0.5 / freq)|0);
        if (N !== this._N) {
          freq = this._cpstoinc * Math.max(this._freq, freq);
          crossfade = true;
        } else {
          freq = this._cpstoinc * freq;
          crossfade = false;
        }
        prevN = this._N;
        prevScale = this._scale;
        this._N = N;
        this._scale = scale = 0.5 / N;
      } else {
        N = this._N;
        freq = this._cpstoinc * freq;
        scale = this._scale;
        crossfade = false;
      }
      N2 = 2 * N + 1;
      if (crossfade) {
        prevN2 = 2 * prevN + 1;
        xfade_slope = this.rate.slopeFactor;
        xfade = 0;
        for (i = 0; i < inNumSamples; ++i) {
          tblIndex = phase & mask;
          t0 = dentbl[tblIndex];
          t1 = dentbl[tblIndex+1];
          if (t0 === kBadValue || t1 === kBadValue) {
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            pfrac = phase - (phase|0);
            denom = t0 + (t1 - t0) * pfrac;
            if (Math.abs(denom) < 0.0005) {
              out[i] = y1 = 1 + 0.999 * y1;
            } else {
              rphase = phase * prevN2;
              pfrac = rphase - (rphase|0);
              tblIndex = rphase & mask;
              t0 = numtbl[tblIndex];
              t1 = numtbl[tblIndex+1];
              numer = t0 + (t1 - t0) * pfrac;
              n1 = (numer / denom - 1) * prevScale;

              rphase = phase * N2;
              pfrac = rphase - (rphase|0);
              tblIndex = rphase & mask;
              t0 = numtbl[tblIndex];
              t1 = numtbl[tblIndex+1];
              numer = t0 + (t1 - t0) * pfrac;
              n2 = (numer / denom - 1) * scale;

              out[i] = y1 = n1 + xfade * (n2 - n1) + 0.999 * y1;
            }
          } else {
            pfrac = phase - (phase|0);
            denom = t0 + (t1 - t0) * pfrac;

            rphase = phase * prevN2;
            pfrac = rphase - (rphase|0);
            tblIndex = rphase & mask;
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            numer = t0 + (t1 - t0) * pfrac;
            n1 = (numer * denom - 1) * prevScale;

            rphase = phase * N2;
            pfrac = rphase - (rphase|0);
            tblIndex = rphase & mask;
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            numer = t0 + (t1 - t0) * pfrac;
            n2 = (numer * denom - 1) * scale;

            out[i] = y1 = n1 + xfade * (n2 - n1) + 0.999 * y1;
          }
          phase += freq;
          xfade += xfade_slope;
        }
      } else {
        // hmm, if freq is above sr/4 then revert to sine table osc ?
        // why bother, it isn't a common choice for a fundamental.
        for (i = 0; i < inNumSamples; ++i) {
          tblIndex = phase & mask;
          t0 = dentbl[tblIndex];
          t1 = dentbl[tblIndex+1];
          if (t0 === kBadValue || t1 === kBadValue) {
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            pfrac = phase - (phase|0);
            denom = t0 + (t1 - t0) * pfrac;
            if (Math.abs(denom) < 0.0005) {
              out[i] = y1 = 1 + 0.999 * y1;
            } else {
              rphase = phase * N2;
              pfrac = rphase - (rphase|0);
              tblIndex = rphase & mask;
              t0 = numtbl[tblIndex];
              t1 = numtbl[tblIndex+1];
              numer = t0 + (t1 - t0) * pfrac;
              out[i] = y1 = (numer / denom - 1) * scale + 0.999 * y1;
            }
          } else {
            pfrac = phase - (phase|0);
            denom = t0 + (t1 - t0) * pfrac;
            rphase = phase * N2;
            pfrac = rphase - (rphase|0);
            tblIndex = rphase & mask;
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            numer = t0 + (t1 - t0) * pfrac;
            out[i] = y1 = (numer * denom - 1) * scale + 0.999 * y1;
          }
          phase += freq;
        }
      }
      if (phase >= 65536) { phase -= 65536; }
      this._y1 = y1;
      this._phase = phase;
      this._freq = this.inputs[0][0];
    };
    return ctor;
  })();
  
  cc.ugen.specs.Pulse = {
    $ar: {
      defaults: "freq=440,width=0.5,mul=1,add=0",
      ctor: function(freq, width, mul, add) {
        return this.multiNew(2, freq, width).madd(mul, add);
      }
    }
  };

  cc.unit.specs.Pulse = (function() {
    var ctor = function() {
      this.process = next;
      this._freq = this.inputs[0][0];
      this._cpstoinc = kSineSize * this.rate.sampleDur * 0.5;
      this._N = Math.max(1, (this.rate.sampleRate * 0.5 / this._freq)|0);
      this._mask = kSineMask;
      this._scale = 0.5 / this._N;
      this._phase = 0;
      this._duty  = 0;
      this._y1 = 0;
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var freq  = this.inputs[0][0];
      var duty  = this._duty;
      var phase = this._phase;
      var y1 = this._y1;
      var mask = this._mask;
      var numtbl = gSine, dentbl = gInvSine;
      var N, N2, prevN, prevN2, scale, prevScale, crossfade;
      var tblIndex, t0, t1, pfrac, denom, rphase, numer, n1, n2;
      var phase2, nextDuty, duty_slope, rscale, pul1, pul2;
      var i, xfade, xfade_slope;
      if (freq !== this._freq) {
        N = Math.max(1, (this.rate.sampleRate * 0.5 / freq)|0);
        if (N !== this._N) {
          freq = this._cpstoinc * Math.max(this._freq, freq);
          crossfade = true;
        } else {
          freq = this._cpstoinc * freq;
          crossfade = false;
        }
        prevN = this._N;
        prevScale = this._scale;
        this._N = N;
        this._scale = scale = 0.5 / N;
      } else {
        N = this._N;
        freq = this._cpstoinc * freq;
        scale = this._scale;
        crossfade = false;
      }
      N2 = 2 * N + 1;

      nextDuty = this.inputs[1][0];
      duty_slope = (nextDuty - duty) * this.rate.slopeFactor;
      rscale = 1 / scale + 1;
      if (crossfade) {
        prevN2 = 2 * prevN + 1;
        xfade_slope = this.rate.slopeFactor;
        xfade = 0;
        for (i = 0; i < inNumSamples; ++i) {
          tblIndex = phase & mask;
          t0 = dentbl[tblIndex];
          t1 = dentbl[tblIndex+1];
          if (t0 === kBadValue || t1 === kBadValue) {
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            pfrac = phase - (phase|0);
            denom = t0 + (t1 - t0) * pfrac;
            if (Math.abs(denom) < 0.0005) {
              pul1 = 1;
            } else {
              rphase = phase * prevN2;
              pfrac = rphase - (rphase|0);
              tblIndex = rphase & mask;
              t0 = numtbl[tblIndex];
              t1 = numtbl[tblIndex+1];
              numer = t0 + (t1 - t0) * pfrac;
              n1 = (numer / denom - 1) * prevScale;

              rphase = phase * N2;
              pfrac = rphase - (rphase|0);
              tblIndex = rphase & mask;
              t0 = numtbl[tblIndex];
              t1 = numtbl[tblIndex+1];
              numer = t0 + (t1 - t0) * pfrac;
              n2 = (numer / denom - 1) * scale;

              pul1 = n1 + xfade * (n2 - n1);
            }
          } else {
            pfrac = phase - (phase|0);
            denom = t0 + (t1 - t0) * pfrac;

            rphase = phase * prevN2;
            pfrac = rphase - (rphase|0);
            tblIndex = rphase & mask;
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            numer = t0 + (t1 - t0) * pfrac;
            n1 = (numer * denom - 1) * prevScale;

            rphase = phase * N2;
            pfrac = rphase - (rphase|0);
            tblIndex = rphase & mask;
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            numer = t0 + (t1 - t0) * pfrac;
            n2 = (numer * denom - 1) * scale;

            pul1 = n1 + xfade * (n2 - n1);
          }

          phase2 = phase + (duty * kSineSize * 0.5);
          tblIndex = phase2 & mask;
          t0 = dentbl[tblIndex];
          t1 = dentbl[tblIndex+1];
          if (t0 === kBadValue || t1 === kBadValue) {
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            pfrac = phase2 - (phase2|0);
            denom = t0 + (t1 - t0) * pfrac;
            if (Math.abs(denom) < 0.0005) {
              pul2 = 1;
            } else {
              rphase = phase2 * prevN2;
              pfrac = rphase - (rphase|0);
              tblIndex = rphase & mask;
              t0 = numtbl[tblIndex];
              t1 = numtbl[tblIndex+1];
              numer = t0 + (t1 - t0) * pfrac;
              n1 = (numer / denom - 1) * prevScale;

              rphase = phase2 * N2;
              pfrac = rphase - (rphase|0);
              tblIndex = rphase & mask;
              t0 = numtbl[tblIndex];
              t1 = numtbl[tblIndex+1];
              numer = t0 + (t1 - t0) * pfrac;
              n2 = (numer / denom - 1) * scale;

              pul2 = n1 + xfade * (n2 - n1);
            }
          } else {
            pfrac = phase2 - (phase2|0);
            denom = t0 + (t1 - t0) * pfrac;

            rphase = phase2 * prevN2;
            pfrac = rphase - (rphase|0);
            tblIndex = rphase & mask;
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            numer = t0 + (t1 - t0) * pfrac;
            n1 = (numer * denom - 1) * prevScale;

            rphase = phase2 * N2;
            pfrac = rphase - (rphase|0);
            tblIndex = rphase & mask;
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            numer = t0 + (t1 - t0) * pfrac;
            n2 = (numer * denom - 1) * scale;

            pul2 = n1 + xfade * (n2 - n1);
          }
          out[i] = y1 = pul1 - pul2 + 0.999 * y1;
          phase += freq;
          duty  += duty_slope;
          xfade += xfade_slope;
        }
      } else {
        for (i = 0; i < inNumSamples; ++i) {
          tblIndex = phase & mask;
          t0 = dentbl[tblIndex];
          t1 = dentbl[tblIndex+1];
          if (t0 === kBadValue || t1 === kBadValue) {
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            pfrac = phase - (phase|0);
            denom = t0 + (t1 - t0) * pfrac;
            if (Math.abs(denom) < 0.0005) {
              pul1 = rscale;
            } else {
              rphase = phase * N2;
              pfrac = rphase - (rphase|0);
              tblIndex = rphase & mask;
              t0 = numtbl[tblIndex];
              t1 = numtbl[tblIndex+1];
              numer = t0 + (t1 - t0) * pfrac;
              pul1 = numer / denom;
            }
          } else {
            pfrac = phase - (phase|0);
            denom = t0 + (t1 - t0) * pfrac;
            rphase = phase * N2;
            pfrac = rphase - (rphase|0);
            tblIndex = rphase & mask;
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            numer = t0 + (t1 - t0) * pfrac;
            pul1 = numer * denom;
          }

          phase2 = phase + (duty * kSineSize * 0.5);
          tblIndex = phase2 & mask;
          t0 = dentbl[tblIndex];
          t1 = dentbl[tblIndex+1];
          if (t0 === kBadValue || t1 === kBadValue) {
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            pfrac = phase2 - (phase2|0);
            denom = t0 + (t1 - t0) * pfrac;
            if (Math.abs(denom) < 0.0005) {
              pul2 = rscale;
            } else {
              rphase = phase2 * N2;
              pfrac = rphase - (rphase|0);
              tblIndex = rphase & mask;
              t0 = numtbl[tblIndex];
              t1 = numtbl[tblIndex+1];
              numer = t0 + (t1 - t0) * pfrac;
              pul2 = numer / denom;
            }
          } else {
            pfrac = phase2 - (phase2|0);
            denom = t0 + (t1 - t0) * pfrac;
            rphase = phase2 * N2;
            pfrac = rphase - (rphase|0);
            tblIndex = rphase & mask;
            t0 = numtbl[tblIndex];
            t1 = numtbl[tblIndex+1];
            numer = t0 + (t1 - t0) * pfrac;
            pul2 = numer * denom;
          }
          out[i] = y1 = (pul1 - pul2) * scale + 0.999 * y1;
          phase += freq;
          duty  += duty_slope;
        }
      }
      if (phase >= 65536) { phase -= 65536; }
      this._y1 = y1;
      this._phase = phase;
      this._freq = this.inputs[0][0];
      this._duty = nextDuty;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Impulse = {
    $ar: {
      defaults: "freq=440,phase=0,mul=1,add=0",
      ctor: function(freq, phase, mul, add) {
        return this.multiNew(2, freq, phase).madd(mul, add);
      }
    },
    $kr: {
      defaults: "freq=440,phase=0,mul=1,add=0",
      ctor: function(freq, phase, mul, add) {
        return this.multiNew(1, freq, phase).madd(mul, add);
      }
    }
  };

  cc.unit.specs.Impulse = (function() {
    var ctor = function() {
      this._phase = this.inputs[1][0];
      if (this.inRates[0] === 2) {
        this.process = next_a;
        if (this.inRates[1] !== 0) {
          this._phase = 1;
        }
      } else {
        this.process = next_k;
        if (this.inRates[1] !== 0) {
          this._phase = 1;
        }
      }
      this._phaseOffset = 0;
      this._cpstoinc    = this.rate.sampleDur;
      if (this._phase === 0) {
        this._phase = 1;
      }
    };
    var next_a = function(inNumSamples) {
      var out     = this.outputs[0];
      var freqIn  = this.inputs[0];
      var phaseOffset = this.inputs[1][0];
      var cpstoinc = this._cpstoinc;
      var phase    = this._phase;
      var prevPhaseOffset = this._phaseOffset;
      var phase_slope = (phaseOffset - prevPhaseOffset) * this.rate.slopeFactor;
      phase += prevPhaseOffset;
      for (var i = 0; i < inNumSamples; ++i) {
        phase += phase_slope;
        if (phase >= 1) {
          phase -= 1;
          out[i] = 1;
        } else {
          out[i] = 0;
        }
        phase += freqIn[i] * cpstoinc;
      }
      this._phase = phase - phaseOffset;
      this._phaseOffset = phaseOffset;
    };
    var next_k = function(inNumSamples) {
      var out   = this.outputs[0];
      var freq  = this.inputs[0][0] * this._cpstoinc;
      var phaseOffset = this.inputs[1][0];
      var phase = this._phase;
      var prevPhaseOffset = this._phaseOffset;
      var phase_slope = (phaseOffset - prevPhaseOffset) * this.rate.slopeFactor;
      phase += prevPhaseOffset;
      for (var i = 0; i < inNumSamples; ++i) {
        phase += phase_slope;
        if (phase >= 1) {
          phase -= 1;
          out[i] = 1;
        } else {
          out[i] = 0;
        }
        phase += freq;
      }
      this._phase = phase - phaseOffset;
      this._phaseOffset = phaseOffset;
    };
    return ctor;
  })();

  cc.ugen.specs.TrigImpulse = {
    $ar: {
      defaults: "trig=0,freq=440,phase=0,mul=1,add=0",
      ctor: function(trig, freq, phase, mul, add) {
        return this.multiNew(2, trig, freq, phase).madd(mul, add);
      }
    },
    $kr: {
      defaults: "trig=0,freq=440,phase=0,mul=1,add=0",
      ctor: function(trig, freq, phase, mul, add) {
        return this.multiNew(1, trig, freq, phase).madd(mul, add);
      }
    }
  };
  
  cc.unit.specs.TrigImpulse = (function() {
    var ctor = function() {
      this._phase = this.inputs[2][0];
      if (this.inRates[1] === 2) {
        this.process = next_ka;
        if (this.inRates[2] !== 0) {
          this._phase = 1;
        }
      } else {
        this.process = next_kk;
        if (this.inRates[2] !== 0) {
          this._phase = 1;
        }
      }
      this._phaseOffset = 0;
      this._cpstoinc    = this.rate.sampleDur;
      if (this._phase === 0) {
        this._phase = 1;
      }
      this._prevTrig = this.inputs[0][0];
    };
    var next_ka = function(inNumSamples) {
      var out     = this.outputs[0];
      var trig    = this.inputs[0];
      var freqIn  = this.inputs[1];
      var phaseOffset = this.inputs[2][0];
      var cpstoinc = this._cpstoinc;
      var phase    = this._phase;
      var prevPhaseOffset = this._phaseOffset;
      var phase_slope = (phaseOffset - prevPhaseOffset) * this.rate.slopeFactor;
      var prevTrig = this._prevTrig;
      if (trig > 0 && prevTrig <= 0) {
        phase = phaseOffset;
        if (this.inRates[2] !== 0) {
          phase = 1;
        }
        if (phase === 0) {
          phase = 1;
        }
      }
      phase += prevPhaseOffset;
      for (var i = 0; i < inNumSamples; ++i) {
        phase += phase_slope;
        if (phase >= 1) {
          phase -= 1;
          out[i] = 1;
        } else {
          out[i] = 0;
        }
        phase += freqIn[i] * cpstoinc;
      }
      this._phase = phase - phaseOffset;
      this._phaseOffset = phaseOffset;
      this._prevTrig    = trig;
    };
    var next_kk = function(inNumSamples) {
      var out  = this.outputs[0];
      var trig = this.inputs[0][0];
      var freq = this.inputs[1][0] * this._cpstoinc;
      var phaseOffset = this.inputs[2][0];
      var phase = this._phase;
      var prevPhaseOffset = this._phaseOffset;
      var phase_slope = (phaseOffset - prevPhaseOffset) * this.rate.slopeFactor;
      var prevTrig = this._prevTrig;
      if (trig > 0 && prevTrig <= 0) {
        phase = phaseOffset;
        if (this.inRates[2] !== 0) {
          phase = 1;
        }
        if (phase === 0) {
          phase = 1;
        }
      }
      phase += prevPhaseOffset;
      for (var i = 0; i < inNumSamples; ++i) {
        phase += phase_slope;
        if (phase >= 1) {
          phase -= 1;
          out[i] = 1;
        } else {
          out[i] = 0;
        }
        phase += freq;
      }
      this._phase       = phase - phaseOffset;
      this._phaseOffset = phaseOffset;
      this._prevTrig    = trig;
    };
    return ctor;
  })();
  
  cc.ugen.specs.SyncSaw = {
    $ar: {
      defaults: "syncFreq=440,sawFreq=440,mul=1,add=0",
      ctor: function(syncFreq, sawFreq, mul, add) {
        return this.multiNew(2, syncFreq, sawFreq).madd(mul, add);
      }
    },
    $kr: {
      defaults: "syncFreq=440,sawFreq=440,mul=1,add=0",
      ctor: function(syncFreq, sawFreq, mul, add) {
        return this.multiNew(1, syncFreq, sawFreq).madd(mul, add);
      }
    }
  };

  cc.unit.specs.SyncSaw = (function() {
    var ctor = function() {
      if (this.inRates[0] === 2) {
        if (this.inRates[1] === 2) {
          this.process = next_aa;
        } else {
          this.process = next_ak;
        }
      } else {
        if (this.inRates[1] === 2) {
          this.process = next_ka;
        } else {
          this.process = next_kk;
        }
      }
      this._freqMul = 2 * this.rate.sampleDur;
      this._phase1 = 0;
      this._phase2 = 0;
      next_kk.call(this, 1);
    };
    var next_aa = function(inNumSamples) {
      var out = this.outputs[0];
      var freq1In = this.inputs[0];
      var freq2In = this.inputs[1];
      var freqMul = this._freqMul;
      var phase1 = this._phase1;
      var phase2 = this._phase2;
      var freq1x, freq2x, z;
      for (var i = 0; i < inNumSamples; ++i) {
        freq1x = freq1In[i] * freqMul;
        freq2x = freq2In[i] * freqMul;
        z = phase2;
        phase2 += freq2x;
        if (phase2 >= 1) {
          phase2 -= 2;
        }
        phase1 += freq1x;
        if (phase1 >= 1) {
          phase1 -= 2;
          phase2 = (phase1 + 1) * freq2x / freq1x - 1;
        }
        out[i] = z;
      }
      this._phase1 = phase1;
      this._phase2 = phase2;
    };
    var next_ak = function(inNumSamples) {
      var out = this.outputs[0];
      var freq1In = this.inputs[0];
      var freq2In = this.inputs[1];
      var freqMul = this._freqMul;
      var phase1 = this._phase1;
      var phase2 = this._phase2;
      var freq1x, freq2x, z;
      freq2x = freq2In[0] * freqMul;
      for (var i = 0; i < inNumSamples; ++i) {
        freq1x = freq1In[i] * freqMul;
        z = phase2;
        phase2 += freq2x;
        if (phase2 >= 1) {
          phase2 -= 2;
        }
        phase1 += freq1x;
        if (phase1 >= 1) {
          phase1 -= 2;
          phase2 = (phase1 + 1) * freq2x / freq1x - 1;
        }
        out[i] = z;
      }
      this._phase1 = phase1;
      this._phase2 = phase2;
    };
    var next_ka = function(inNumSamples) {
      var out = this.outputs[0];
      var freq1In = this.inputs[0];
      var freq2In = this.inputs[1];
      var freqMul = this._freqMul;
      var phase1 = this._phase1;
      var phase2 = this._phase2;
      var freq1x, freq2x, z;
      freq1x = freq1In[0] * freqMul;
      for (var i = 0; i < inNumSamples; ++i) {
        freq2x = freq2In[i] * freqMul;
        z = phase2;
        phase2 += freq2x;
        if (phase2 >= 1) {
          phase2 -= 2;
        }
        phase1 += freq1x;
        if (phase1 >= 1) {
          phase1 -= 2;
          phase2 = (phase1 + 1) * freq2x / freq1x - 1;
        }
        out[i] = z;
      }
      this._phase1 = phase1;
      this._phase2 = phase2;
    };
    var next_kk = function(inNumSamples) {
      var out = this.outputs[0];
      var freq1x = this.inputs[0][0] * this._freqMul;
      var freq2x = this.inputs[1][0] * this._freqMul;
      var phase1 = this._phase1;
      var phase2 = this._phase2;
      var z;
      for (var i = 0; i < inNumSamples; ++i) {
        z = phase2;
        phase2 += freq2x;
        if (phase2 >= 1) {
          phase2 -= 2;
        }
        phase1 += freq1x;
        if (phase1 >= 1) {
          phase1 -= 2;
          phase2 = (phase1 + 1) * freq2x / freq1x - 1;
        }
        out[i] = z;
      }
      this._phase1 = phase1;
      this._phase2 = phase2;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Select = {
    $ar: {
      defaults: "which=0,array=[]",
      ctor: function(which, array) {
        return this.multiNewList([2, which].concat(array));
      }
    },
    $kr: {
      defaults: "which=0,array=[]",
      ctor: function(which, array) {
        return this.multiNewList([1, which].concat(array));
      }
    },
    checkInputs: function() {
      if (this.rate === 2) {
        var inputs = this.inputs;
        for (var i = 1, imax = inputs.length; i < imax; ++i) {
          if (inputs[i].rate !== 2) {
            throw new Error("input was not audio rate:" + inputs[i].toString());
          }
        }
      }
    }
  };

  cc.unit.specs.Select = (function() {
    var ctor = function() {
      if (this.bufLength === 1) {
        this.process = next_1;
      } else if (this.inRates[0] === 2) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      this._maxIndex = this.inputs.length - 1;
      next_1.call(this);
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var inputs  = this.inputs;
      var whichIn = inputs[0];
      var maxIndex = this._maxIndex;
      var index;
      for (var i = 0; i < inNumSamples; ++i) {
        index = Math.max(1, Math.min((whichIn[i]|0) + 1, maxIndex));
        out[i] = inputs[index][i];
      }
    };
    var next_k = function() {
      var index = Math.max(1, Math.min((this.inputs[0][0]|0) + 1, this._maxIndex));
      this.outputs[0].set(this.inputs[index]);
    };
    var next_1 = function() {
      var index = Math.max(1, Math.min((this.inputs[0][0]|0) + 1, this._maxIndex));
      this.outputs[0][0] = this.inputs[index][0];
    };
    return ctor;
  })();
  
  cc.ugen.specs.DC = {
    $ir: {
      defaults: "in=0",
      ctor: function(_in) {
        return this.multiNew(0, _in);
      }
    },
    $kr: {
      defaults: "in=0",
      ctor: function(_in) {
        return this.multiNew(1, _in);
      }
    },
    $ar: {
      defaults: "in=0",
      ctor: function(_in) {
        return this.multiNew(2, _in);
      }
    }
  };

  cc.unit.specs.DC = (function() {
    var ctor = function() {
      var out = this.outputs[0];
      var val = this.inputs[0][0];
      for (var i = out.length; i--; ) {
        out[i] = val;
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.Silent = {
    $ir: {
      ctor: function() {
        return cc.global.DC.ir(0);
      }
    },
    $kr: {
      ctor: function() {
        return cc.global.DC.kr(0);
      }
    },
    $ar: {
      ctor: function() {
        return cc.global.DC.ar(0);
      }
    }
  };
  
  module.exports = {};

});
define('cc/plugins/pan', function(require, exports, module) {

  var cc = require("../cc");
  var gSine = require("./utils").gSine;
  var slice = [].slice;
  
  cc.ugen.specs.Pan2 = {
    Klass: cc.MultiOutUGen,
    $ar: {
      defaults: "in=0,pos=0,level=1",
      ctor: function(_in, pos, level) {
        return this.multiNew(2, _in, pos, level);
      }
    },
    $kr: {
      defaults: "in=0,pos=0,level=1",
      ctor: function(_in, pos, level) {
        return this.multiNew(1, _in, pos, level);
      }
    },
    init: function() {
      this.inputs = slice.call(arguments);
      this.channels = [
        cc.createOutputProxy(this.rate, this, 0),
        cc.createOutputProxy(this.rate, this, 1)
      ];
      this.numOfOutputs = 2;
      return this.channels;
    },
    checkInputs: function() {
      return cc.ugen.checkNInputs.call(this, 1);
    }
  };
  
  cc.unit.specs.Pan2 = (function() {
    var ctor = function() {
      if (this.inRates[1] === 2) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      this._pos   = this.inputs[1][0];
      this._level = this.inputs[2][0];
      var ipos = (1024 * this._pos + 1024 + 0.5)|0;
      ipos = Math.max(0, Math.min(ipos, 2048));
      this._leftAmp  = this._level * gSine[2048 - ipos];
      this._rightAmp = this._level * gSine[ipos];
      next_a.call(this, 1);
    };
    var next_a = function(inNumSamples) {
      var leftOut  = this.outputs[0];
      var rightOut = this.outputs[1];
      var inIn  = this.inputs[0];
      var posIn = this.inputs[1];
      var nextLevel = this.inputs[2][0];
      var level = this._level;
      var i, _in, ipos, leftAmp, rightAmp;
      if (level !== nextLevel) {
        var level_slope = (nextLevel - level) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          ipos = (1024 * posIn[i] + 1024 + 0.5)|0;
          ipos = Math.max(0, Math.min(ipos, 2048));
          leftAmp  = level * gSine[2048 - ipos];
          rightAmp = level * gSine[ipos];
          _in = inIn[i];
          leftOut[i]  = _in * leftAmp;
          rightOut[i] = _in * rightAmp;
          level += level_slope;
        }
        this._level = nextLevel;
      } else {
        for (i = 0; i < inNumSamples; ++i) {
          ipos = (1024 * posIn[i] + 1024 + 0.5)|0;
          ipos = Math.max(0, Math.min(ipos, 2048));
          leftAmp  = level * gSine[2048 - ipos];
          rightAmp = level * gSine[ipos];
          _in = inIn[i];
          leftOut[i]  = _in * leftAmp;
          rightOut[i] = _in * rightAmp;
        }
      }
    };
    var next_k = function(inNumSamples) {
      var leftOut  = this.outputs[0];
      var rightOut = this.outputs[1];
      var inIn      = this.inputs[0];
      var nextPos   = this.inputs[1][0];
      var nextLevel = this.inputs[2][0];
      var leftAmp  = this._leftAmp;
      var rightAmp = this._rightAmp;
      var i, _in;
      if (this._pos !== nextPos || this._level !== nextLevel) {
        var ipos = (1024 * nextPos + 1024 + 0.5)|0;
        ipos = Math.max(0, Math.min(ipos, 2048));
        var nextLeftAmp  = nextLevel * gSine[2048 - ipos];
        var nextRightAmp = nextLevel * gSine[ipos];
        var slopeFactor = this.rate.slopeFactor;
        var leftAmp_slope  = (nextLeftAmp  - leftAmp ) * slopeFactor;
        var rightAmp_slope = (nextRightAmp - rightAmp) * slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          _in = inIn[i];
          leftOut[i]  = _in * leftAmp;
          rightOut[i] = _in * rightAmp;
          leftAmp  += leftAmp_slope;
          rightAmp += rightAmp_slope;
        }
        this._pos      = nextPos;
        this._level    = nextLevel;
        this._leftAmp  = nextLeftAmp;
        this._rightAmp = nextRightAmp;
      } else {
        for (i = 0; i < inNumSamples; ++i) {
          _in = inIn[i];
          leftOut[i]  = _in * leftAmp;
          rightOut[i] = _in * rightAmp;
        }
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.XFade2 = {
    $ar: {
      defaults: "inA=0,inB=0,pan=0,level=1",
      ctor: function(inA, inB, pan, level) {
        return this.multiNew(2, inA, inB, pan, level);
      }
    },
    $kr: {
      defaults: "inA=0,inB=0,pan=0,level=1",
      ctor: function(inA, inB, pan, level) {
        return this.multiNew(1, inA, inB, pan, level);
      }
    },
    checkInputs: function() {
      return cc.ugen.checkNInputs.call(this, 2);
    }
  };

  cc.unit.specs.XFade2 = (function() {
    var ctor = function() {
      if (this.inRates[2] === 2) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      this._pos   = this.inputs[2][0];
      this._level = this.inputs[3][0];
      var ipos = (1024 * this._pos + 1024 + 0.5)|0;
      ipos = Math.max(0, Math.min(ipos, 2048));
      this._leftAmp  = this._level * gSine[2048 - ipos];
      this._rightAmp = this._level * gSine[ipos];
      next_k.call(this, 1);
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var leftIn  = this.inputs[0];
      var rightIn = this.inputs[1];
      var posIn   = this.inputs[2];
      var nextLevel = this.inputs[3][0];
      var leftAmp   = this._leftAmp;
      var rightAmp  = this._rightAmp;
      var level     = this._level;
      var i, ipos;
      if (level !== nextLevel) {
        var level_slope = (nextLevel - this._level) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          ipos = (1024 * posIn[i] + 1024 + 0.5)|0;
          ipos = Math.max(0, Math.min(ipos, 2048));
          leftAmp  = level * gSine[2048 - ipos];
          rightAmp = level * gSine[ipos];
          out[i] = leftIn[i] * leftAmp + rightIn[i] * rightAmp;
          level += level_slope;
        }
        this._level = nextLevel;
      } else {
        for (i = 0; i < inNumSamples; ++i) {
          ipos = (1024 * posIn[i] + 1024 + 0.5)|0;
          ipos = Math.max(0, Math.min(ipos, 2048));
          leftAmp  = level * gSine[2048 - ipos];
          rightAmp = level * gSine[ipos];
          out[i] = leftIn[i] * leftAmp + rightIn[i] * rightAmp;
        }
      }
    };
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var leftIn  = this.inputs[0];
      var rightIn = this.inputs[1];
      var nextPos   = this.inputs[2][0];
      var nextLevel = this.inputs[3][0];
      var leftAmp   = this._leftAmp;
      var rightAmp  = this._rightAmp;
      var i;
      if (this._pos !== nextPos || this._level !== nextLevel) {
        var ipos = (1024 * nextPos + 1024 + 0.5)|0;
        ipos = Math.max(0, Math.min(ipos, 2048));
        var nextLeftAmp  = nextLevel * gSine[2048 - ipos];
        var nextRightAmp = nextLevel * gSine[ipos];
        var slopeFactor = this.rate.slopeFactor;
        var leftAmp_slope  = (nextLeftAmp  - leftAmp ) * slopeFactor;
        var rightAmp_slope = (nextRightAmp - rightAmp) * slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = leftIn[i] * leftAmp + rightIn[i] * rightAmp;
          leftAmp  += leftAmp_slope;
          rightAmp += rightAmp_slope;
        }
        this._pos   = nextPos;
        this._level = nextLevel;
        this._leftAmp  = nextLeftAmp;
        this._rightAmp = nextRightAmp;
      } else {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = leftIn[i] * leftAmp + rightIn[i] * rightAmp;
        }
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.LinXFade2 = {
    $ar: {
      defaults: "inA=0,inB=0,pan=0,level=1",
      ctor: function(inA, inB, pan, level) {
        return this.multiNew(2, inA, inB, pan).__mul__(level);
      }
    },
    $kr: {
      defaults: "inA=0,inB=0,pan=0,level=1",
      ctor: function(inA, inB, pan, level) {
        return this.multiNew(1, inA, inB, pan).__mul__(level);
      }
    },
    checkInputs: function() {
      return cc.ugen.checkNInputs.call(this, 2);
    }
  };
  
  cc.unit.specs.LinXFade2 = (function() {
    var ctor = function() {
      if (this.inRates[2] === 2) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      this._pos = Math.max(-1, Math.min(this.inputs[2][0], 1));
      this._amp = this._pos * 0.5 + 0.5;
      next_a.call(this, 1);
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var leftIn  = this.inputs[0];
      var rightIn = this.inputs[1];
      var posIn   = this.inputs[2];
      var pos, amp;
      for (var i = 0; i < inNumSamples; ++i) {
        pos = Math.max(-1, Math.min(posIn[i], 1));
        amp = pos * 0.5 + 0.5;
        out[i] = leftIn[i] + amp * (rightIn[i] - leftIn[i]);
      }
    };
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var leftIn  = this.inputs[0];
      var rightIn = this.inputs[1];
      var nextPos = this.inputs[2][0];
      var amp = this._amp;
      var i, pos;
      if (this._pos !== nextPos) {
        pos = Math.max(-1, Math.min(nextPos, 1));
        var nextAmp = pos * 0.5 + 0.5;
        var amp_slope = (nextAmp - amp) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = leftIn[i] + amp * (rightIn[i] - leftIn[i]);
          amp += amp_slope;
        }
        this._pos = nextPos;
        this._amp = nextAmp;
      } else {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = leftIn[i] + amp * (rightIn[i] - leftIn[i]);
        }
      }
    };
    return ctor;
  })();
  
  module.exports = {};

});
define('cc/plugins/random', function(require, exports, module) {

  var cc = require("../cc");

  cc.ugen.specs.Rand = {
    $new: {
      defaults: "lo=0,hi=1",
      ctor: function(lo, hi) {
        return this.multiNew(0, lo, hi);
      }
    }
  };

  cc.unit.specs.Rand = (function() {
    var ctor = function() {
      var lo = this.inputs[0][0];
      var hi = this.inputs[1][0];
      var range = hi - lo;
      this.outputs[0][0] = Math.random() * range + lo;
    };
    return ctor;
  })();
  
  cc.ugen.specs.IRand = {
    $new: {
      defaults: "lo=0,hi=127",
      ctor: function(lo, hi) {
        return this.multiNew(0, lo, hi);
      }
    }
  };
  
  cc.unit.specs.IRand = (function() {
    var ctor = function() {
      var lo = this.inputs[0][0];
      var hi = this.inputs[1][0];
      var range = hi - lo;
      this.outputs[0][0] = (Math.random() * range + lo)|0;
    };
    return ctor;
  })();
  
  cc.ugen.specs.TRand = {
    $ar: {
      defaults: "lo=0,hi=1,trig=1",
      ctor: function(lo, hi, trig) {
        return this.multiNew(2, lo, hi, trig);
      }
    },
    $kr: {
      defaults: "lo=0,hi=1,trig=1",
      ctor: function(lo, hi, trig) {
        return this.multiNew(1, lo, hi, trig);
      }
    }
  };
  
  cc.unit.specs.TRand = (function() {
    var ctor = function() {
      if (this.calcRate === 2) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      var lo = this.inputs[0][0];
      var hi = this.inputs[1][0];
      var range = hi - lo;
      this.outputs[0][0] = this._value = Math.random() * range + lo;
      this._trig = this.inputs[2][0];
    };
    var next_k = function() {
      var out = this.outputs[0];
      var trig = this.inputs[2][0];
      if (trig > 0 && this._trig <= 0) {
        var lo = this.inputs[0][0];
        var hi = this.inputs[1][0];
        var range = hi - lo;
        out[0] = this._value = Math.random() * range + lo;
      } else {
        out[0] = this._value;
      }
      this._trig = trig;
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var trigIn = this.inputs[2];
      var value  = this._value;
      var prev   = this._trig;
      var next;
      for (var i = 0; i < inNumSamples; ++i) {
        next = trigIn[i];
        if (next > 0 && prev <= 0) {
          var lo = this.inputs[0][0];
          var hi = this.inputs[1][0];
          var range = hi - lo;
          out[i] = value = Math.random() * range + lo;
        } else {
          out[i] = value;
        }
        prev = next;
      }
      this._trig  = next;
      this._value = value;
    };
    return ctor;
  })();
  
  cc.ugen.specs.TIRand = {
    $ar: {
      defaults: "lo=0,hi=127,trig=1",
      ctor: function(lo, hi, trig) {
        return this.multiNew(2, lo, hi, trig);
      }
    },
    $kr: {
      defaults: "lo=0,hi=127,trig=1",
      ctor: function(lo, hi, trig) {
        return this.multiNew(1, lo, hi, trig);
      }
    }
  };
  
  cc.unit.specs.TIRand = (function() {
    var ctor = function() {
      if (this.calcRate === 2) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      var lo = this.inputs[0][0]|0;
      var hi = this.inputs[1][0]|0;
      var range = hi - lo;
      this.outputs[0][0] = this._value = (Math.random() * range + lo)|0;
      this._trig = this.inputs[2][0];
    };
    var next_k = function() {
      var out = this.outputs[0];
      var trig = this.inputs[2][0];
      if (trig > 0 && this._trig <= 0) {
        var lo = this.inputs[0][0]|0;
        var hi = this.inputs[1][0]|0;
        var range = hi - lo;
        out[0] = this._value = (Math.random() * range + lo)|0;
      } else {
        out[0] = this._value;
      }
      this._trig = trig;
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var trigIn = this.inputs[2];
      var value  = this._value;
      var prev   = this._trig;
      var next;
      for (var i = 0; i < inNumSamples; ++i) {
        next = trigIn[i];
        if (next > 0 && prev <= 0) {
          var lo = this.inputs[0][0]|0;
          var hi = this.inputs[1][0]|0;
          var range = hi - lo;
          out[i] = value = (Math.random() * range + lo)|0;
        } else {
          out[i] = value;
        }
        prev = next;
      }
      this._trig  = next;
      this._value = value;
    };
    return ctor;
  })();
  
  cc.ugen.specs.LinRand = {
    $new: {
      defaults: "lo=0,hi=1,minmax=0",
      ctor: function(lo, hi, minmax) {
        return this.multiNew(0, lo, hi, minmax);
      }
    }
  };
  
  cc.unit.specs.LinRand = (function() {
    var ctor = function() {
      var lo = this.inputs[0][0];
      var hi = this.inputs[1][0];
      var n  = this.inputs[2][0]|0;
      var range = hi - lo;
      var a = Math.random();
      var b = Math.random();
      if (n <= 0) {
        this.outputs[0][0] = Math.min(a, b) * range + lo;
      } else {
        this.outputs[0][0] = Math.max(a, b) * range + lo;
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.NRand = {
    $new: {
      defaults: "lo=0,hi=1,n=0",
      ctor: function(lo, hi, n) {
        return this.multiNew(0, lo, hi, n);
      }
    }
  };
  
  cc.unit.specs.NRand = (function() {
    var ctor = function() {
      var lo = this.inputs[0][0];
      var hi = this.inputs[1][0];
      var n  = this.inputs[2][0]|0;
      if (n) {
        var range = hi - lo;
        var sum = 0;
        for (var i = 0; i < n; ++i) {
          sum += Math.random();
        }
        this.outputs[0][0] = (sum/n) * range + lo;
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.ExpRand = {
    $new: {
      defaults: "lo=0.01,hi=1",
      ctor: function(lo, hi) {
        return this.multiNew(0, lo, hi);
      }
    }
  };

  cc.unit.specs.ExpRand = (function() {
    var ctor = function() {
      var lo = this.inputs[0][0] || 0.01;
      var hi = this.inputs[1][0];
      var ratio = hi / lo;
      this.outputs[0][0] = Math.pow(ratio, Math.random()) * lo;
    };
    return ctor;
  })();
  
  cc.ugen.specs.TExpRand = {
    $ar: {
      defaults: "lo=0.01,hi=1,trig=1",
      ctor: function(lo, hi, trig) {
        return this.multiNew(2, lo, hi, trig);
      }
    },
    $kr: {
      defaults: "lo=0.01,hi=1,trig=1",
      ctor: function(lo, hi, trig) {
        return this.multiNew(1, lo, hi, trig);
      }
    }
  };
  
  cc.unit.specs.TExpRand = (function() {
    var ctor = function() {
      if (this.calcRate === 2) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      var lo = this.inputs[0][0] || 0.01;
      var hi = this.inputs[1][0];
      var ratio = hi / lo;
      this.outputs[0][0] = this._value = Math.pow(ratio, Math.random()) * lo;
      this._trig = this.inputs[2][0];
    };
    var next_k = function() {
      var out = this.outputs[0];
      var trig = this.inputs[2][0];
      if (trig > 0 && this._trig <= 0) {
        var lo = this.inputs[0][0] || 0.01;
        var hi = this.inputs[1][0];
        var ratio = hi / lo;
        out[0] = this._value = Math.pow(ratio, Math.random()) * lo;
      } else {
        out[0] = this._value;
      }
      this._trig = trig;
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var trigIn = this.inputs[2];
      var value  = this._value;
      var prev   = this._trig;
      var next;
      for (var i = 0; i < inNumSamples; ++i) {
        next = trigIn[i];
        if (next > 0 && prev <= 0) {
          var lo = this.inputs[0][0] || 0.01;
          var hi = this.inputs[1][0];
          var ratio = hi / lo;
          out[i] = value = Math.pow(ratio, Math.random()) * lo;
        } else {
          out[i] = value;
        }
        prev = next;
      }
      this._trig  = next;
      this._value = value;
    };
    return ctor;
  })();
  
  cc.ugen.specs.CoinGate = {
    $ar: {
      defaults: "prob=0,in=0",
      ctor: function(prob, _in) {
        return this.multiNew(2, prob, _in);
      }
    },
    $kr: {
      defaults: "prob=0,in=0",
      ctor: function(prob, _in) {
        return this.multiNew(1, prob, _in);
      }
    }
  };
  
  cc.unit.specs.CoinGate = (function() {
    var ctor = function() {
      if (this.calcRate === 2) {
        this.process = next;
      } else {
        this.process = next_k;
      }
      this._trig = this.inputs[1][0];
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var trigIn = this.inputs[1];
      var prevTrig = this._trig;
      var prob   = this.inputs[0][0];
      var curTrig, level;
      for (var i = 0; i < inNumSamples; ++i) {
        curTrig = trigIn[i];
        level   = 0;
        if (prevTrig <= 0 && curTrig > 0) {
          if (Math.random() < prob) {
            level = curTrig;
          }
        }
        prevTrig = curTrig;
        out[i] = level;
      }
      this._trig = prevTrig;
    };
    var next_k = function() {
      var trig = this.inputs[1][0];
      var level = 0;
      if (trig > 0 && this._trig <= 0) {
        if (Math.random() < this.inputs[0][0]) {
          level = trig;
        }
      }
      this.outputs[0][0] = level;
      this._trig = trig;
    };
    return ctor;
  })();
  
  module.exports = {};

});
define('cc/plugins/range', function(require, exports, module) {

  var cc = require("../cc");

  cc.ugen.specs.InRange = {
    $ar: {
      defaults: "in,lo=0,hi=1",
      ctor: function(_in, lo, hi) {
        return this.multiNew(2, _in, lo, hi);
      }
    },
    $kr: {
      defaults: "in,lo=0,hi=1",
      ctor: function(_in, lo, hi) {
        return this.multiNew(1, _in, lo, hi);
      }
    },
    $ir: {
      defaults: "in,lo=0,hi=1",
      ctor: function(_in, lo, hi) {
        return this.multiNew(0, _in, lo, hi);
      }
    }
  };

  cc.unit.specs.InRange = (function() {
    var ctor = function() {
      this.process = next;
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var loIn = this.inputs[1];
      var hiIn = this.inputs[2];
      for (var i = 0; i < inNumSamples; ++i) {
        var _in = inIn[i];
        out[i] = (loIn[i] <= _in && _in <= hiIn[i]) ? 1 : 0;
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.Clip = cc.ugen.specs.InRange;

  cc.unit.specs.Clip = (function() {
    var ctor = function() {
      if (this.inRates[1] === 2 && this.inRates[2] === 2) {
        this.process = next_aa;
      } else {
        this.process = next_kk;
      }
      this._lo = this.inputs[1][0];
      this._hi = this.inputs[2][0];
      this.process(1);
    };
    var next_aa = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var loIn = this.inputs[1];
      var hiIn = this.inputs[2];
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = Math.max(loIn[i], Math.min(inIn[i], hiIn[i]));
      }
    };
    var next_kk = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var next_lo = this.inputs[1][0];
      var next_hi = this.inputs[2][0];
      var lo = this._lo;
      var hi = this._hi;
      var i;
      if (next_lo === lo && next_hi === hi) {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = Math.max(lo, Math.min(inIn[i], hi));
        }
      } else {
        var lo_slope = (next_lo - lo) * this.rate.slopeFactor;
        var hi_slope = (next_hi - hi) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          lo += lo_slope;
          hi += hi_slope;
          out[i] = Math.max(lo, Math.min(inIn[i], hi));
        }
        this._lo = next_lo;
        this._hi = next_hi;
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.Fold = cc.ugen.specs.InRange;

  cc.unit.specs.Fold = (function() {
    var fold = function(val, lo, hi) {
      var x, range1, range2;
      if (hi === lo) {
        return lo;
      }
      if (val >= hi) {
        val = (hi * 2) - val;
        if (val >= lo) {
          return val;
        }
      } else if (val < lo) {
        val = (lo * 2) - val;
        if (val < hi) {
          return val;
        }
      } else {
        return val;
      }
      range1 = hi - lo;
      range2 = range1 * 2;
      x = val - lo;
      x -= range2 * Math.floor(x / range2);
      if (x >= range1) {
        return range2 - x + lo;
      }
      return x + lo;
    };
    var ctor = function() {
      if (this.inRates[1] === 2 && this.inRates[2] === 2) {
        this.process = next_aa;
      } else {
        this.process = next_kk;
      }
      this._lo = this.inputs[1][0];
      this._hi = this.inputs[2][0];
      this.process(1);
    };
    var next_aa = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var loIn = this.inputs[1];
      var hiIn = this.inputs[2];
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = Math.max(loIn[i], Math.min(inIn[i], hiIn[i]));
      }
    };
    var next_kk = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var next_lo = this.inputs[1][0];
      var next_hi = this.inputs[2][0];
      var lo = this._lo;
      var hi = this._hi;
      var i;
      if (next_lo === lo && next_hi === hi) {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = fold(inIn[i], lo, hi);
        }
      } else {
        var lo_slope = (next_lo - lo) * this.rate.slopeFactor;
        var hi_slope = (next_hi - hi) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          lo += lo_slope;
          hi += hi_slope;
          out[i] = fold(inIn[i], lo, hi);
        }
        this._lo = next_lo;
        this._hi = next_hi;
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.Wrap = cc.ugen.specs.InRange;

  cc.unit.specs.Wrap = (function() {
    var wrap = function(val, lo, hi) {
      if (hi === lo) {
        return lo;
      }
      var range = (hi - lo);
      if (val >= hi) {
        val -= range;
        if (val < hi) {
          return val;
        }
      } else if (val < lo) {
        val += range;
        if (val >= lo) {
          return val;
        }
      } else {
        return val;
      }
      return val - range * Math.floor((val - lo) / range);
    };
    var ctor = function() {
      if (this.inRates[1] === 2 && this.inRates[2] === 2) {
        this.process = next_aa;
      } else {
        this.process = next_kk;
      }
      this._lo = this.inputs[1][0];
      this._hi = this.inputs[2][0];
      this.process(1);
    };
    var next_aa = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var loIn = this.inputs[1];
      var hiIn = this.inputs[2];
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = Math.max(loIn[i], Math.min(inIn[i], hiIn[i]));
      }
    };
    var next_kk = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var next_lo = this.inputs[1][0];
      var next_hi = this.inputs[2][0];
      var lo = this._lo;
      var hi = this._hi;
      var i;
      if (next_lo === lo && next_hi === hi) {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = wrap(inIn[i], lo, hi);
        }
      } else {
        var lo_slope = (next_lo - lo) * this.rate.slopeFactor;
        var hi_slope = (next_hi - hi) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          lo += lo_slope;
          hi += hi_slope;
          out[i] = wrap(inIn[i], lo, hi);
        }
        this._lo = next_lo;
        this._hi = next_hi;
      }
    };
    return ctor;
  })();
  
  var linlin_ctor = function(_in, srclo, srchi, dstlo, dsthi) {
    var scale  = (dsthi.__sub__(dstlo)).__div__(srchi.__sub__(srclo));
    var offset = dstlo.__sub__(scale.__mul__(srclo));
    return cc.createMulAdd(_in, scale, offset);
  };
  
  cc.ugen.specs.LinLin = {
    $ar: {
      defaults: "in=0,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: linlin_ctor
    },
    $kr: {
      defaults: "in=0,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: linlin_ctor
    },
    $ir: {
      defaults: "in=0,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: linlin_ctor
    }
  };
  
  var linexp_ctor = function(_in, srclo, srchi, dstlo, dsthi) {
    // Math.pow(dsthi / dstlo, (_in-srclo)/(srchi-srclo)) * dstlo
    return dsthi.__div__(dstlo).pow(
      (_in.__sub__(srclo)).__div__(srchi.__sub__(srclo))
    ).__mul__(dstlo);
  };
  
  cc.ugen.specs.LinExp = {
    $ar: {
      defaults: "in=0,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: linexp_ctor
    },
    $kr: {
      defaults: "in=0,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: linexp_ctor
    },
    $ir: {
      defaults: "in=0,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: linexp_ctor
    }
  };

  var explin_ctor = function(_in, srclo, srchi, dstlo, dsthi) {
    // Math.log(_in/srclo) / Math.log(srchi/srclo) * (dsthi-dstlo) + dstlo
    return _in.__div__(srclo).log().__div__(
      srchi.__div__(srclo).log()
    ).__mul__(
      dsthi.__sub__(dstlo)
    ).__add__(dstlo);
  };
  
  cc.ugen.specs.ExpLin = {
    $ar: {
      defaults: "in=0,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: explin_ctor
    },
    $kr: {
      defaults: "in=0,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: explin_ctor
    },
    $ir: {
      defaults: "in=0,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: explin_ctor
    }
  };

  var expexp_ctor = function(_in, srclo, srchi, dstlo, dsthi) {
    // Math.pow(dsthi/dstlo, Math.log(_in/srclo) / Math.log(srchi-srclo)) * dstlo
    return dsthi.__div__(dstlo).pow(
      _in.__div__(srclo).log().__div__(
        srchi.__div__(srclo).log()
      )
    ).__mul__(dstlo);
  };
  
  cc.ugen.specs.ExpExp = {
    $ar: {
      defaults: "in=0,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: expexp_ctor
    },
    $kr: {
      defaults: "in=0,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: expexp_ctor
    },
    $ir: {
      defaults: "in=0,srclo=0,srchi=1,dstlo=1,dsthi=2",
      ctor: expexp_ctor
    }
  };
  
  module.exports = {};

});
define('cc/plugins/reverb', function(require, exports, module) {

  var cc = require("../cc");

  cc.ugen.specs.FreeVerb = {
    checkInputs: cc.ugen.checkSameRateAsFirstInput,
    $ar: {
      defaults: "in=0,mix=0.33,room=0.5,damp=0.5,mul=1,add=0",
      ctor: function(_in, mix, room, damp, mul, add) {
        return this.multiNew(2, _in, mix, room, damp).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,mix=0.33,room=0.5,damp=0.5,mul=1,add=0",
      ctor: function(_in, mix, room, damp, mul, add) {
        return this.multiNew(1, _in, mix, room, damp).madd(mul, add);
      }
    }
  };
  
  cc.unit.specs.FreeVerb = (function() {
    var ctor = function() {
      this.process = next;
      
      this._iota0 = 0;
      this._iota1 = 0;
      this._iota2 = 0;
      this._iota3 = 0;
      this._iota4 = 0;
      this._iota5 = 0;
      this._iota6 = 0;
      this._iota7 = 0;
      this._iota8 = 0;
      this._iota9 = 0;
      this._iota10 = 0;
      this._iota11 = 0;

      this._R0_0 = 0;
      this._R1_0 = 0;
      this._R2_0 = 0;
      this._R3_0 = 0;
      this._R4_0 = 0;
      this._R5_0 = 0;
      this._R6_0 = 0;
      this._R7_0 = 0;
      this._R8_0 = 0;
      this._R9_0 = 0;
      this._R10_0 = 0;
      this._R11_0 = 0;
      this._R12_0 = 0;
      this._R13_0 = 0;
      this._R14_0 = 0;
      this._R15_0 = 0;
      this._R16_0 = 0;
      this._R17_0 = 0;
      this._R18_0 = 0;
      this._R19_0 = 0;

      this._R0_1 = 0;
      this._R1_1 = 0;
      this._R2_1 = 0;
      this._R3_1 = 0;

      this._dline0 = new Float32Array(225);
      this._dline1 = new Float32Array(341);
      this._dline2 = new Float32Array(441);
      this._dline3 = new Float32Array(556);
      this._dline4 = new Float32Array(1617);
      this._dline5 = new Float32Array(1557);
      this._dline6 = new Float32Array(1491);
      this._dline7 = new Float32Array(1422);
      this._dline8 = new Float32Array(1277);
      this._dline9 = new Float32Array(1116);
      this._dline10 = new Float32Array(1188);
      this._dline11 = new Float32Array(1356);

      this.process(1);
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var ftemp0 = Math.max(0, Math.min(this.inputs[1][0], 1)); // mix
      var ftemp1 = 1 - ftemp0;

      var room = Math.max(0, Math.min(this.inputs[2][0], 1)); // room
      var ftemp5 = 0.7 + (0.28 * room);

      var damp = Math.max(0, Math.min(this.inputs[3][0], 1)); // damp
      var ftemp6 = 0.4 * damp;
      var ftemp7 = 1 - ftemp6;

      var iota0 = this._iota0;
      var iota1 = this._iota1;
      var iota2 = this._iota2;
      var iota3 = this._iota3;
      var iota4 = this._iota4;
      var iota5 = this._iota5;
      var iota6 = this._iota6;
      var iota7 = this._iota7;
      var iota8 = this._iota8;
      var iota9 = this._iota9;
      var iota10 = this._iota10;
      var iota11 = this._iota11;

      var R0_1 = this._R0_1;
      var R1_1 = this._R1_1;
      var R2_1 = this._R2_1;
      var R3_1 = this._R3_1;

      var R0_0 = this._R0_0;
      var R1_0 = this._R1_0;
      var R2_0 = this._R2_0;
      var R3_0 = this._R3_0;
      var R4_0 = this._R4_0;
      var R5_0 = this._R5_0;
      var R6_0 = this._R6_0;
      var R7_0 = this._R7_0;
      var R8_0 = this._R8_0;
      var R9_0 = this._R9_0;
      var R10_0 = this._R10_0;
      var R11_0 = this._R11_0;
      var R12_0 = this._R12_0;
      var R13_0 = this._R13_0;
      var R14_0 = this._R14_0;
      var R15_0 = this._R15_0;
      var R16_0 = this._R16_0;
      var R17_0 = this._R17_0;
      var R18_0 = this._R18_0;
      var R19_0 = this._R19_0;

      var dline0 = this._dline0;
      var dline1 = this._dline1;
      var dline2 = this._dline2;
      var dline3 = this._dline3;
      var dline4 = this._dline4;
      var dline5 = this._dline5;
      var dline6 = this._dline6;
      var dline7 = this._dline7;
      var dline8 = this._dline8;
      var dline9 = this._dline9;
      var dline10 = this._dline10;
      var dline11 = this._dline11;

      for (var i = 0; i < inNumSamples; ++i) {
        var ftemp2 = inIn[i];
        var ftemp4 = 1.500000e-2 * ftemp2;
        if (++iota0 === 225) {
          iota0 = 0;
        }
        var T0 = dline0[iota0];
        if (++iota1 === 341) {
          iota1 = 0;
        }
        var T1 = dline1[iota1];
        if (++iota2 === 441) {
          iota2 = 0;
        }
        var T2 = dline2[iota2];
        if (++iota3 === 556) {
          iota3 = 0;
        }
        var T3 = dline3[iota3];
        if (++iota4 === 1617) {
          iota4 = 0;
        }
        var T4 = dline4[iota4];
        R5_0 = (ftemp7 * R4_0) + (ftemp6 * R5_0);
        dline4[iota4] = ftemp4 + (ftemp5 * R5_0);
        R4_0 = T4;
        if (++iota5 === 1557) {
          iota5 = 0;
        }
        var T5 = dline5[iota5];
        R7_0 = (ftemp7 * R6_0) + (ftemp6 * R7_0);
        dline5[iota5] = ftemp4 + (ftemp5 * R7_0);
        R6_0 = T5;
        if (++iota6 === 1491) {
          iota6 = 0;
        }
        var T6 = dline6[iota6];
        R9_0 = (ftemp7 * R8_0) + (ftemp6 * R9_0);
        dline6[iota6] = ftemp4 + (ftemp5 * R9_0);
        R8_0 = T6;
        if (++iota7 === 1422) {
          iota7 = 0;
        }
        var T7 = dline7[iota7];
        R11_0 = (ftemp7 * R10_0) + (ftemp6 * R11_0);
        dline7[iota7] = ftemp4 + (ftemp5 * R11_0);
        R10_0 = T7;
        if (++iota8 === 1277) {
          iota8 = 0;
        }
        var T8 = dline8[iota8];
        R13_0 = (ftemp7 * R12_0) + (ftemp6 * R13_0);
        dline8[iota8] = ftemp4 + (ftemp5 * R13_0);
        R12_0 = T8;
        if (++iota9 === 1116) {
          iota9 = 0;
        }
        var T9 = dline9[iota9];
        R15_0 = (ftemp7 * R14_0) + (ftemp6 * R15_0);
        dline9[iota9] = ftemp4 + (ftemp5 * R15_0);
        R14_0 = T9;
        if (++iota10 === 1188) {
          iota10 = 0;
        }
        var T10 = dline10[iota10];
        R17_0 = (ftemp7 * R16_0) + (ftemp6 * R17_0);
        dline10[iota10] = ftemp4 + (ftemp5 * R17_0);
        R16_0 = T10;
        if (++iota11 === 1356) {
          iota11 = 0;
        }
        var T11 = dline11[iota11];
        R19_0 = (ftemp7 * R18_0) + (ftemp6 * R19_0);
        dline11[iota11] = ftemp4 + (ftemp5 * R19_0);
        R18_0 = T11;
        var ftemp8 = R16_0 + R18_0;
        dline3[iota3] = (((0.5 * R3_0) + R4_0) + (R6_0 + R8_0)) + ((R10_0 + R12_0) + (R14_0 + ftemp8));
        R3_0 = T3;
        R3_1 = R3_0 - (((R4_0 + R6_0) + (R8_0 + R10_0)) + ((R12_0 + R14_0) + ftemp8));
        dline2[iota2] = (0.5 * R2_0) + R3_1;
        R2_0 = T2;
        R2_1 = (R2_0 - R3_1);
        dline1[iota1] = (0.5 * R1_0) + R2_1;
        R1_0 = T1;
        R1_1 = (R1_0 - R2_1);
        dline0[iota0] = (0.5 * R0_0) + R1_1;
        R0_0 = T0;
        R0_1 = R0_0 - R1_1;
        out[i] = (ftemp1 * ftemp2) + (ftemp0 * R0_1);
      }
      
      this._iota0 = iota0;
      this._iota1 = iota1;
      this._iota2 = iota2;
      this._iota3 = iota3;
      this._iota4 = iota4;
      this._iota5 = iota5;
      this._iota6 = iota6;
      this._iota7 = iota7;
      this._iota8 = iota8;
      this._iota9 = iota9;
      this._iota10 = iota10;
      this._iota11 = iota11;

      this._R0_1 = R0_1;
      this._R1_1 = R1_1;
      this._R2_1 = R2_1;
      this._R3_1 = R3_1;

      this._R0_0 = R0_0;
      this._R1_0 = R1_0;
      this._R2_0 = R2_0;
      this._R3_0 = R3_0;
      this._R4_0 = R4_0;
      this._R5_0 = R5_0;
      this._R6_0 = R6_0;
      this._R7_0 = R7_0;
      this._R8_0 = R8_0;
      this._R9_0 = R9_0;
      this._R10_0 = R10_0;
      this._R11_0 = R11_0;
      this._R12_0 = R12_0;
      this._R13_0 = R13_0;
      this._R14_0 = R14_0;
      this._R15_0 = R15_0;
      this._R16_0 = R16_0;
      this._R17_0 = R17_0;
      this._R18_0 = R18_0;
      this._R19_0 = R19_0;
    };
    return ctor;
  })();
  
  module.exports = {};

});
define('cc/plugins/trig', function(require, exports, module) {

  var cc = require("../cc");
  var sc_wrap = require("./utils").sc_wrap;
  
  cc.ugen.specs.Trig = {
    $ar: {
      defaults: "in=0,dur=0.1",
      ctor: function(_in, dur) {
        return this.multiNew(2, _in, dur);
      }
    },
    $kr: {
        defaults: "in=0,dur=0.1",
      ctor: function(_in, dur) {
        return this.multiNew(1, _in, dur);
      }
    },
    signalRange: 1
  };
  
  cc.unit.specs.Trig = (function() {
    var ctor = function() {
      if (this.calcRate === 2 && this.inRates[0] !== 2) {
        this.process = next_k;
      } else {
        this.process = next;
      }
      this._counter = 0;
      this._trig = 0;
      this._level = 0;
      this.outputs[0][0] = 0;
    };
    var next = function(inNumSamples) {
      var out    = this.outputs[0];
      var trigIn = this.inputs[0];
      var dur    = this.inputs[1][0];
      var sr = this.rate.sampleRate;
      var trig  = this._trig;
      var level = this._level;
      var counter = this._counter;
      var curTrig, zout;
      for (var i = 0; i < inNumSamples; ++i) {
        curTrig = trigIn[i];
        if (counter > 0) {
          zout = --counter ? level : 0;
        } else {
          if (curTrig > 0 && trig <= 0) {
            counter = Math.max(1, (dur * sr + 0.5)|0);
            zout = level = curTrig;
          } else {
            zout = 0;
          }
        }
        out[i] = zout;
        trig   = curTrig;
      }
      this._trig    = trig;
      this._counter = counter;
      this._level   = level;
    };
    var next_k = function(inNumSamples) {
      var out    = this.outputs[0];
      var trigIn = this.inputs[0];
      var dur    = this.inputs[1][0];
      var sr = this.rate.sampleRate;
      var trig  = this._trig;
      var level = this._level;
      var counter = this._counter;
      var curTrig, zout;
      curTrig = trigIn[0];
      for (var i = 0; i < inNumSamples; ++i) {
        if (counter > 0) {
          zout = --counter ? level : 0;
        } else {
          if (curTrig > 0 && trig <= 0) {
            counter = Math.max(1, (dur * sr + 0.5)|0);
            zout = level = curTrig;
          } else {
            zout = 0;
          }
        }
        out[i] = zout;
        trig   = curTrig;
      }
      this._trig    = curTrig;
      this._counter = counter;
      this._level   = level;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Trig1 = cc.ugen.specs.Trig;
  
  cc.unit.specs.Trig1 = (function() {
    var ctor = function() {
      if (this.calcRate === 2 && this.inRates[0] !== 2) {
        this.process = next_k;
      } else {
        this.process = next;
      }
      this._counter = 0;
      this._trig    = 0;
      this.outputs[0][0] = 0;
    };
    var next = function(inNumSamples) {
      var out     = this.outputs[0];
      var trigIn  = this.inputs[0];
      var dur     = this.inputs[1][0];
      var sr      = this.rate.sampleRate;
      var trig    = this._trig;
      var counter = this._counter;
      var curTrig, zout;
      for (var i = 0; i < inNumSamples; ++i) {
        curTrig = trigIn[i];
        if (counter > 0) {
          zout = --counter ? 1 : 0;
        } else {
          if (curTrig > 0 && trig <= 0) {
            counter = Math.max(1, (dur * sr + 0.5)|0);
            zout = 1;
          } else {
            zout = 0;
          }
        }
        out[i] = zout;
        trig   = curTrig;
      }
      this._trig    = trig;
      this._counter = counter;
    };
    var next_k = function(inNumSamples) {
      var out     = this.outputs[0];
      var trigIn  = this.inputs[0];
      var dur     = this.inputs[1][0];
      var sr      = this.rate.sampleRate;
      var trig    = this._trig;
      var counter = this._counter;
      var curTrig, zout;
      curTrig = trigIn[0];
      for (var i = 0; i < inNumSamples; ++i) {
        if (counter > 0) {
          zout = --counter ? 1 : 0;
        } else {
          if (curTrig > 0 && trig <= 0) {
            counter = Math.max(1, (dur * sr + 0.5)|0);
            zout = 1;
          } else {
            zout = 0;
          }
        }
        out[i] = zout;
        trig   = curTrig;
      }
      this._trig    = trig;
      this._counter = counter;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Latch = {
    $ar: {
      defaults: "in=0,trig=0",
      ctor: function(_in, trig) {
        return this.multiNew(2, _in, trig);
      }
    },
    $kr: {
      defaults: "in=0,trig=0",
      ctor: function(_in, trig) {
        return this.multiNew(1, _in, trig);
      }
    }
  };
  
  cc.unit.specs.Latch = (function() {
    var ctor = function() {
      if (this.inRates[1] === 2) {
        this.process = next_aa;
      } else {
        this.process = next_ak;
      }
      this._trig  = 0;
      this._level = 0;
      this.outputs[0][0] = this.inputs[1][0] > 0 ? this.inputs[0][0] : 0;
    };
    var next_aa = function(inNumSamples) {
      var out    = this.outputs[0];
      var inIn   = this.inputs[0];
      var trigIn = this.inputs[1];
      var trig  = this._trig;
      var level = this._level;
      var curTrig;
      for (var i = 0; i < inNumSamples; ++i) {
        curTrig = trigIn[i];
        if (trig <= 0 && curTrig > 0) {
          level = inIn[i];
        }
        out[i] = level;
        trig   = curTrig;
      }
      this._trig  = trig;
      this._level = level;
    };
    var next_ak = function(inNumSamples) {
      var out   = this.outputs[0];
      var level = this._level;
      var trig  = this.inputs[0][1];
      if (this._trig <= 0 && trig > 0) {
        level = this.inputs[0][0];
      }
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = level;
      }
      this._trig  = trig;
      this._level = level;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Gate = cc.ugen.specs.Latch;
  
  cc.unit.specs.Gate = (function() {
    var ctor = function() {
      if (this.inRates[1] === 2) {
        this.process = next_aa;
      } else {
        this.process = next_ak;
      }
      this._level = 0;
      this.outputs[0][0] = 0;
    };
    var next_aa = function(inNumSamples) {
      var out    = this.outputs[0];
      var inIn   = this.inputs[0];
      var trigIn = this.inputs[1];
      var level  = this._level;
      var curTrig;
      for (var i = 0; i < inNumSamples; ++i) {
        curTrig = trigIn[i];
        if (curTrig > 0) {
          level = inIn[i];
        }
        out[i] = level;
      }
      this._level = level;
    };
    var next_ak = function(inNumSamples) {
      var out    = this.outputs[0];
      var inIn   = this.inputs[0];
      var trig   = this.inputs[1][0];
      var level  = this._level;
      var i;
      if (trig > 0) {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = level = inIn[i];
        }
        this._level = level;
      } else {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = level;
        }
      }
    };
    return ctor;
  })();

  cc.ugen.specs.PulseCount = {
    $ar: {
      defaults: "trig=0,reset=0",
      ctor: function(trig, reset) {
        return this.multiNew(2, trig, reset);
      }
    },
    $kr: {
      defaults: "trig=0,reset=0",
      ctor: function(trig, reset) {
        return this.multiNew(1, trig, reset);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  
  cc.unit.specs.PulseCount = (function() {
    var ctor = function() {
      if (this.inRates[1] === 2) {
        this.process = next_a;
      } else {
        this.process = next;
      }
      this._prevtrig  = 0;
      this._prevreset = 0;
      this._level = 0;
      this.outputs[0][0] = 0;
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var trigIn  = this.inputs[0];
      var resetIn = this.inputs[1];
      var prevtrig  = this._prevtrig;
      var prevreset = this._prevreset;
      var level = this._level;
      var curtrig, curreset;
      for (var i = 0; i < inNumSamples; ++i) {
        curtrig  = trigIn[i];
        curreset = resetIn[i];
        if (prevreset <= 0 && curreset > 0) {
          level = 0;
        } else if (prevtrig <= 0 && curtrig > 0) {
          level += 1;
        }
        out[i] = level;
        prevtrig  = curtrig;
        prevreset = curreset;
      }
      this._level = level;
      this._prevtrig  = prevtrig;
      this._prevreset = prevreset;
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var trigIn  = this.inputs[0];
      var resetIn = this.inputs[1];
      var prevtrig  = this._prevtrig;
      var prevreset = this._prevreset;
      var level = this._level;
      var curtrig, curreset;

      curtrig  = trigIn[0];
      curreset = resetIn[0];
      if (prevreset <= 0 && curreset > 0) {
        level = 0;
      } else if (prevtrig <= 0 && curtrig > 0) {
        level += 1;
      }
      out[0] = level;
      prevtrig  = curtrig;
      prevreset = curreset;
      
      for (var i = 1; i < inNumSamples; ++i) {
        curtrig  = trigIn[i];
        curreset = resetIn[i];
        if (prevreset <= 0 && curreset > 0) {
          level = 0;
        } else if (prevtrig <= 0 && curtrig > 0) {
          level += 1;
        }
        out[i] = level;
        prevtrig  = curtrig;
        prevreset = curreset;
      }
      this._level = level;
      this._prevtrig  = prevtrig;
      this._prevreset = prevreset;
    };
    return ctor;
  })();

  cc.ugen.specs.Peak = {
    $ar: {
      defaults: "in=0,trig=0",
      ctor: function(_in, trig) {
        return this.multiNew(2, _in, trig);
      }
    },
    $kr: {
      defaults: "in=0,trig=0",
      ctor: function(_in, trig) {
        return this.multiNew(1, _in, trig);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.Peak = (function() {
    var ctor = function() {
      if (this.inRates[1] === 2) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      this._prevtrig = 0;
      this.outputs[0][0] = this._level = this.inputs[0][0];
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn   = this.inputs[0];
      var trigIn = this.inputs[1];
      var prevtrig = this._prevtrig;
      var level    = this._level;
      var curtrig, inlevel;
      for (var i = 0; i < inNumSamples; ++i) {
        curtrig = trigIn[i];
        inlevel = Math.abs(inIn[i]);
        out[i] = level = Math.max(inlevel, level);
        if (prevtrig <= 0 && curtrig > 0) {
          level = inlevel;
        }
        prevtrig = curtrig;
      }
      this._prevtrig = prevtrig;
      this._level    = level;
    };
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn   = this.inputs[0];
      var trigIn = this.inputs[1];
      var prevtrig = this._prevtrig;
      var level    = this._level;
      var curtrig, inlevel;
      
      curtrig = trigIn[0];
      inlevel = Math.abs(inIn[0]);
      out[0] = level = Math.max(inlevel, level);
      if (prevtrig <= 0 && curtrig > 0) {
        level = inlevel;
      }
      prevtrig = curtrig;
      
      for (var i = 1; i < inNumSamples; ++i) {
        curtrig = trigIn[i];
        inlevel = Math.abs(inIn[i]);
        out[i] = level = Math.max(inlevel, level);
        if (prevtrig <= 0 && curtrig > 0) {
          level = inlevel;
        }
        prevtrig = curtrig;
      }
      this._prevtrig = prevtrig;
      this._level    = level;
    };
    return ctor;
  })();

  cc.ugen.specs.RunningMin = cc.ugen.specs.Peak;
  
  cc.unit.specs.RunningMin = (function() {
    var ctor = function() {
      if (this.inRates[1] === 2) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      this._prevtrig = 0;
      this.outputs[0][0] = this._level = this.inputs[0][0];
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn   = this.inputs[0];
      var trigIn = this.inputs[1];
      var prevtrig = this._prevtrig;
      var level    = this._level;
      var curtrig, inlevel;
      for (var i = 0; i < inNumSamples; ++i) {
        curtrig = trigIn[i];
        inlevel = inIn[i];
        if (inlevel < level) {
          level = inlevel;
        }
        out[i] = level;
        if (prevtrig <= 0 && curtrig > 0) {
          level = inlevel;
        }
        prevtrig = curtrig;
      }
      this._prevtrig = prevtrig;
      this._level    = level;
    };
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn   = this.inputs[0];
      var trigIn = this.inputs[1];
      var prevtrig = this._prevtrig;
      var level    = this._level;
      var curtrig, inlevel;
      
      curtrig = trigIn[0];
      inlevel = inIn[0];
      if (inlevel < level) {
        level = inlevel;
      }
      out[0] = level;
      if (prevtrig <= 0 && curtrig > 0) {
        level = inlevel;
      }
      prevtrig = curtrig;
      
      for (var i = 1; i < inNumSamples; ++i) {
        curtrig = trigIn[i];
        inlevel = inIn[i];
        if (inlevel < level) {
          level = inlevel;
        }
        out[i] = level;
        if (prevtrig <= 0 && curtrig > 0) {
          level = inlevel;
        }
        prevtrig = curtrig;
      }
      this._prevtrig = prevtrig;
      this._level    = level;
    };
    return ctor;
  })();
  
  cc.ugen.specs.RunningMax = cc.ugen.specs.Peak;

  cc.unit.specs.RunningMax = (function() {
    var ctor = function() {
      if (this.inRates[1] === 2) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      this._prevtrig = 0;
      this.outputs[0][0] = this._level = this.inputs[0][0];
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn   = this.inputs[0];
      var trigIn = this.inputs[1];
      var prevtrig = this._prevtrig;
      var level    = this._level;
      var curtrig, inlevel;
      for (var i = 0; i < inNumSamples; ++i) {
        curtrig = trigIn[i];
        inlevel = inIn[i];
        if (inlevel > level) {
          level = inlevel;
        }
        out[i] = level;
        if (prevtrig <= 0 && curtrig > 0) {
          level = inlevel;
        }
        prevtrig = curtrig;
      }
      this._prevtrig = prevtrig;
      this._level    = level;
    };
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn   = this.inputs[0];
      var trigIn = this.inputs[1];
      var prevtrig = this._prevtrig;
      var level    = this._level;
      var curtrig, inlevel;
      
      curtrig = trigIn[0];
      inlevel = inIn[0];
      if (inlevel > level) {
        level = inlevel;
      }
      out[0] = level;
      if (prevtrig <= 0 && curtrig > 0) {
        level = inlevel;
      }
      prevtrig = curtrig;
      
      for (var i = 1; i < inNumSamples; ++i) {
        curtrig = trigIn[i];
        inlevel = inIn[i];
        if (inlevel > level) {
          level = inlevel;
        }
        out[i] = level;
        if (prevtrig <= 0 && curtrig > 0) {
          level = inlevel;
        }
        prevtrig = curtrig;
      }
      this._prevtrig = prevtrig;
      this._level    = level;
    };
    return ctor;
  })();

  cc.ugen.specs.Stepper = {
    $ar: {
      defaults: "trig=0,reset=0,min=0,max=7,step=1,resetval",
      ctor: function(trig, reset, min, max, step, resetval) {
        if (typeof resetval === "undefined") {
          resetval = min;
        }
        return this.multiNew(2, trig, reset, min, max, step, resetval);
      }
    },
    $kr: {
      defaults: "trig=0,reset=0,min=0,max=7,step=1,resetval",
      ctor: function(trig, reset, min, max, step, resetval) {
        if (typeof resetval === "undefined") {
          resetval = min;
        }
        return this.multiNew(1, trig, reset, min, max, step, resetval);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.Stepper = (function() {
    var ctor = function() {
      if (this.inRates[1] === 2) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      this._prevtrig  = 0;
      this._prevreset = 0;
      this._level     = this.inputs[5][0];
      this.outputs[0][0] = 0;
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var trigIn  = this.inputs[0];
      var resetIn = this.inputs[1];
      var zmin = this.inputs[2][0];
      var zmax = this.inputs[3][0];
      var step = this.inputs[4][0];
      var resetval = this.inputs[5][0];
      var prevtrig  = this._prevtrig;
      var prevreset = this._prevreset;
      var level    = this._level;
      var curtrig, curreset;
      for (var i = 0; i < inNumSamples; ++i) {
        curtrig  = trigIn[i];
        curreset = resetIn[i];
        if (prevreset <= 0 && curreset > 0) {
          level = sc_wrap(resetval, zmin, zmax);
        } else if (prevtrig <= 0 && curtrig > 0) {
          level = sc_wrap(level + step, zmin, zmax);
        }
        out[i] = level;
        prevtrig  = curtrig;
        prevreset = curreset;
      }
      this._level    = level;
      this._prevtrig  = prevtrig;
      this._prevreset = prevreset;
    };
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var trigIn  = this.inputs[0];
      var resetIn = this.inputs[1];
      var zmin = this.inputs[2][0];
      var zmax = this.inputs[3][0];
      var step = this.inputs[4][0];
      var resetval = this.inputs[5][0];
      var prevtrig  = this._prevtrig;
      var prevreset = this._prevreset;
      var level    = this._level;
      var curtrig, curreset;

      curtrig  = trigIn[0];
      curreset = resetIn[0];
      if (prevreset <= 0 && curreset > 0) {
        level = sc_wrap(resetval, zmin, zmax);
      } else if (prevtrig <= 0 && curtrig > 0) {
        level = sc_wrap(level + step, zmin, zmax);
      }
      out[0] = level;
      prevtrig  = curtrig;
      prevreset = curreset;
      
      for (var i = 1; i < inNumSamples; ++i) {
        curtrig  = trigIn[i];
        if (prevtrig <= 0 && curtrig > 0) {
          level = sc_wrap(level + step, zmin, zmax);
        }
        out[i] = level;
        prevtrig  = curtrig;
        prevreset = curreset;
      }
      this._level    = level;
      this._prevtrig  = prevtrig;
      this._prevreset = prevreset;
    };
    return ctor;
  })();

  cc.ugen.specs.PulseDivider = {
    $ar: {
      defaults: "trig=0,div=2,start=0",
      ctor: function(trig, div, start) {
        return this.multiNew(2, trig, div, start);
      }
    },
    $kr: {
      defaults: "trig=0,div=2,start=0",
      ctor: function(trig, div, start) {
        return this.multiNew(1, trig, div, start);
      }
    }
  };

  cc.unit.specs.PulseDivider = (function() {
    var ctor = function() {
      this.process = next;
      this._prevtrig = 0;
      this._level    = 0;
      this._counter  = Math.floor(this.inputs[2][0] + 0.5);
      this.outputs[0][0] = 0;
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var trigIn = this.inputs[0];
      var div    = this.inputs[1][0]|0;
      var prevtrig = this._prevtrig;
      var counter  = this._counter;
      var z, curtrig;
      for (var i = 0; i < inNumSamples; ++i) {
        curtrig = trigIn[i];
        if (prevtrig <= 0 && curtrig > 0) {
          counter++;
          if (counter >= div) {
            counter = 0;
            z = 1;
          } else {
            z = 0;
          }
        } else {
          z = 0;
        }
        out[i] = z;
        prevtrig = curtrig;
      }
      this._counter  = counter;
      this._prevtrig = prevtrig;
    };
    return ctor;
  })();

  cc.ugen.specs.SetResetFF = cc.ugen.specs.PulseCount;

  cc.unit.specs.SetResetFF = (function() {
    var ctor = function() {
      if (this.inRates[1] === 2) {
        this.process = next_a;
      } else {
        this.process = next;
      }
      this._prevtrig  = 0;
      this._prevreset = 0;
      this._level = 0;
      this.outputs[0][0] = 0;
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var trigIn  = this.inputs[0];
      var resetIn = this.inputs[1];
      var prevtrig  = this._prevtrig;
      var prevreset = this._prevreset;
      var level = this._level;
      var curtrig, curreset;
      for (var i = 0; i < inNumSamples; ++i) {
        curtrig  = trigIn[i];
        curreset = resetIn[i];
        if (prevreset <= 0 && curreset > 0) {
          level = 0;
        } else if (prevtrig <= 0 && curtrig > 0) {
          level = 1;
        }
        out[i] = level;
        prevtrig  = curtrig;
        prevreset = curreset;
      }
      this._level = level;
      this._prevtrig  = prevtrig;
      this._prevreset = prevreset;
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var trigIn  = this.inputs[0];
      var resetIn = this.inputs[1];
      var prevtrig  = this._prevtrig;
      var prevreset = this._prevreset;
      var level = this._level;
      var curtrig, curreset;
      
      curtrig  = trigIn[0];
      curreset = resetIn[0];
      if (prevreset <= 0 && curreset > 0) {
        level = 0;
      } else if (prevtrig <= 0 && curtrig > 0) {
        level = 1;
      }
      out[0] = level;
      prevtrig  = curtrig;
      prevreset = curreset;
      
      for (var i = 1; i < inNumSamples; ++i) {
        curtrig = trigIn[i];
        if (prevtrig <= 0 && curtrig > 0) {
          level = 1;
        }
        out[i] = level;
        prevtrig  = curtrig;
      }
      this._level = level;
      this._prevtrig  = prevtrig;
      this._prevreset = prevreset;
    };
    
    return ctor;
  })();

  cc.ugen.specs.ToggleFF = {
    $ar: {
      defaults: "trig=0",
      ctor: function(trig) {
        return this.multiNew(2, trig);
      }
    },
    $kr: {
      defaults: "trig=0",
      ctor: function(trig) {
        return this.multiNew(1, trig);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.ToggleFF = (function() {
    var ctor = function() {
      this.process = next;
      this._prevtrig = 0;
      this._level = 0;
      this.outputs[0][0] = 0;
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var trigIn = this.inputs[0];
      var prevtrig = this._prevtrig;
      var level    = this._level;
      var curtrig;
      for (var i = 0; i < inNumSamples; ++i) {
        curtrig = trigIn[i];
        if (prevtrig <= 0 && curtrig > 0) {
          level = 1 - level;
        }
        out[i] = level;
        prevtrig = curtrig;
      }
      this._prevtrig = prevtrig;
      this._level    = level;
    };
    return ctor;
  })();
  
  cc.ugen.specs.ZeroCrossing = {
    $ar: {
      defaults: "in=0",
      ctor: function(_in) {
        return this.multiNew(2, _in);
      }
    },
    $kr: {
      defaults: "in=0",
      ctor: function(_in) {
        return this.multiNew(1, _in);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  
  cc.unit.specs.ZeroCrossing = (function() {
    var ctor = function() {
      this.process = next;
      this._prevfrac = 0;
      this._previn  = this.inputs[0][0];
      this._counter = 0;
      this.outputs[0][0] = this._level = 0;
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var previn   = this._previn;
      var prevfrac = this._prevfrac;
      var level   = this._level;
      var counter = this._counter;
      var sampleRate = this.rate.sampleRate;
      var curin, frac;
      for (var i = 0; i < inNumSamples; ++i) {
        counter++;
        curin = inIn[i];
        if (counter > 4 && previn <= 0 && curin > 0) {
          frac = -previn / (curin - previn);
          level = sampleRate / (frac + counter - prevfrac);
          prevfrac = frac;
          counter  = 0;
        }
        out[i] = level;
        previn = curin;
      }
      this._previn   = previn;
      this._prevfrac = prevfrac;
      this._level    = level;
      this._counter  = counter;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Timer = cc.ugen.specs.ZeroCrossing;

  cc.unit.specs.Timer = (function() {
    var ctor = function() {
      this.process = next;
      this._prevfrac = 0;
      this._previn  = this.inputs[0][0];
      this._counter = 0;
      this.outputs[0][0] = this._level = 0;
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var previn   = this._previn;
      var prevfrac = this._prevfrac;
      var level   = this._level;
      var counter = this._counter;
      var sampleDur = this.rate.sampleDur;
      var curin, frac;
      for (var i = 0; i < inNumSamples; ++i) {
        counter++;
        curin = inIn[i];
        if (previn <= 0 && curin > 0) {
          frac = -previn / (curin - previn);
          level = sampleDur * (frac + counter - prevfrac);
          prevfrac = frac;
          counter  = 0;
        }
        out[i] = level;
        previn = curin;
      }
      this._previn   = previn;
      this._prevfrac = prevfrac;
      this._level    = level;
      this._counter  = counter;
    };
    return ctor;
  })();

  cc.ugen.specs.Sweep = {
    $ar: {
      defaults: "trig=0,rate=1",
      ctor: function(trig, rate) {
        return this.multiNew(2, trig, rate);
      }
    },
    $kr: {
      defaults: "trig=0,rate=1",
      ctor: function(trig, rate) {
        return this.multiNew(1, trig, rate);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.Sweep = (function() {
    var ctor = function() {
      this.process = next;
      this._prevtrig = this.inputs[0][0];
      this._level = 0;
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var trigIn = this.inputs[0];
      var rate   = this.inputs[1][0] * this.rate.sampleDur;
      var prevtrig = this._prevtrig;
      var level    = this._level;
      var curtrig, frac;
      for (var i = 0; i < inNumSamples; ++i) {
        curtrig = trigIn[i];
        if (prevtrig <= 0 && curtrig > 0) {
          frac = -prevtrig / (curtrig - prevtrig);
          level = frac * rate;
        } else {
          level += rate;
        }
        out[i] = level;
        prevtrig = curtrig;
      }
      this._prevtrig = prevtrig;
      this._level    = level;
    };
    return ctor;
  })();
  
  cc.ugen.specs.Phasor = {
    $ar: {
      defaults: "trig=0,rate=1,start=0,end=1,resetPos=0",
      ctor: function(trig, rate, start, end, resetPos) {
        return this.multiNew(2, trig, rate, start, end, resetPos);
      }
    },
    $kr: {
      defaults: "trig=0,rate=1,start=0,end=1,resetPos=0",
      ctor: function(trig, rate, start, end, resetPos) {
        return this.multiNew(1, trig, rate, start, end, resetPos);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  
  cc.unit.specs.Phasor = (function() {
    var ctor = function() {
      this.process = next;
      this._prevtrig = this.inputs[0][0];
      this.outputs[0][0] = this._level = this.inputs[2][0];
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var trigIn = this.inputs[0];
      var rate   = this.inputs[1][0];
      var start  = this.inputs[2][0];
      var end    = this.inputs[3][0];
      var resetPos = this.inputs[4][0];
      var prevtrig = this._prevtrig;
      var level    = this._level;
      var curtrig, frac;
      for (var i = 0; i < inNumSamples; ++i) {
        curtrig = trigIn[i];
        if (prevtrig <= 0 && curtrig > 0) {
          frac = 1 - prevtrig / (curtrig - prevtrig);
          level = resetPos + frac * rate;
        }
        out[i] = level;
        level += rate;
        level = sc_wrap(level, start, end);
        prevtrig = curtrig;
      }
      this._prevtrig = prevtrig;
      this._level    = level;
    };
    return ctor;
  })();

  cc.ugen.specs.PeakFollower = {
    $ar: {
      defaults: "in=0,decay=0.999",
      ctor: function(_in, decay) {
        return this.multiNew(2, _in, decay);
      }
    },
    $kr: {
      defaults: "in=0,decay=0.999",
      ctor: function(_in, decay) {
        return this.multiNew(1, _in, decay);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.PeakFollower = (function() {
    var ctor = function() {
      this.process = next;
      this._decay = this.inputs[1][0];
      this.outputs[0][0] = this._level = this.inputs[0][0];
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn  = this.inputs[0];
      var decay = this.inputs[1][0];
      var level = this._level;
      var i, inlevel;
      if (decay === this._decay) {
        for (i = 0; i < inNumSamples; ++i) {
          inlevel = Math.abs(inIn[i]);
          if (inlevel >= level) {
            level = inlevel;
          } else {
            level = inlevel + decay * (level - inlevel);
          }
          out[i] = level;
        }
      } else {
        var decay_slope = (decay - this._decay) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          inlevel = Math.abs(inIn[i]);
          if (inlevel >= level) {
            level = inlevel;
          } else {
            level = (1 - Math.abs(decay)) * inlevel + decay * level;
            decay += decay_slope;
          }
          out[i] = level;
        }
      }
      this._level = level;
      this._decay = decay;
    };
    return ctor;
  })();
  
  module.exports = {};

});
define('cc/plugins/ui', function(require, exports, module) {
  
  var cc = require("../cc");
  var log001 = Math.log(0.001);
  
  var MouseXY = {
    $kr: {
      defaults: "minval=0,maxval=1,warp=0,lag=0.2",
      ctor: function(minval, maxval, warp, lag) {
        if (warp === "exponential" ) {
          warp = 1;
        } else if (warp === "linear") {
          warp = 0;
        }
        return this.multiNew(1, minval, maxval, warp, lag);
      }
    }
  };
  
  cc.ugen.specs.MouseX = MouseXY;
  
  cc.unit.specs.MouseX = (function() {
    var ctor = function() {
      this.process = next;
      this._y1  = 0;
      this._b1  = 0;
      this._lag = 0;
      this.process(1);
    };
    var next = function(inNumSamples, instance) {
      var minval = this.inputs[0][0] || 0.01;
      var maxval = this.inputs[1][0];
      var warp   = this.inputs[2][0];
      var lag    = this.inputs[3][0];
      var y1 = this._y1;
      var b1 = this._b1;
      if (lag !== this._lag) {
        this._b1  = lag === 0 ? 0 : Math.exp(log001 / (lag * this.rate.sampleRate));
        this._lag = lag;
      }
      var y0 = instance ? instance.f32_syncItems[2] : 0;
      if (warp === 0) {
        y0 = (maxval - minval) * y0 + minval;
      } else {
        y0 = Math.pow(maxval / minval, y0) * minval;
        if (isNaN(y0)) { y0 = 0; }
      }
      this.outputs[0][0] = y1 = y0 + b1 * (y1 - y0);
      this._y1 = y1;
    };
    return ctor;
  })();
  
  cc.ugen.specs.MouseY = MouseXY;

  cc.unit.specs.MouseY = (function() {
    var ctor = function() {
      this.process = next;
      this._y1  = 0;
      this._b1  = 0;
      this._lag = 0;
      this.process(1);
    };
    var next = function(inNumSamples, instance) {
      var minval = this.inputs[0][0] || 0.01;
      var maxval = this.inputs[1][0];
      var warp   = this.inputs[2][0];
      var lag    = this.inputs[3][0];
      var y1 = this._y1;
      var b1 = this._b1;
      if (lag !== this._lag) {
        this._b1  = lag === 0 ? 0 : Math.exp(log001 / (lag * this.rate.sampleRate));
        this._lag = lag;
      }
      var y0 = instance ? instance.f32_syncItems[3] : 0;
      if (warp === 0) {
        y0 = (maxval - minval) * y0 + minval;
      } else {
        y0 = Math.pow(maxval / minval, y0) * minval;
        if (isNaN(y0)) { y0 = 0; }
      }
      this.outputs[0][0] = y1 = y0 + b1 * (y1 - y0);
      this._y1 = y1;
    };
    return ctor;
  })();
  
  cc.ugen.specs.MouseButton = {
    $kr: {
      defaults: "minval=0,maxval=1,lag=0.2",
      ctor: function(minval, maxval, lag) {
        return this.multiNew(1, minval, maxval, lag);
      }
    }
  };
  
  cc.unit.specs.MouseButton = (function() {
    var ctor = function() {
      this.process = next;
      this._y1  = 0;
      this._b1  = 0;
      this._lag = 0;
      this.process(1);
    };
    var next = function(inNumSamples, instance) {
      var minval = this.inputs[0][0];
      var maxval = this.inputs[1][0];
      var lag    = this.inputs[2][0];
      var y1 = this._y1;
      var b1 = this._b1;
      if (lag !== this._lag) {
        this._b1  = lag === 0 ? 0 : Math.exp(log001 / (lag * this.rate.sampleRate));
        this._lag = lag;
      }
      var y0 = instance ? (instance.f32_syncItems[4] ? maxval : minval) : minval;
      this.outputs[0][0] = y1 = y0 + b1 * (y1 - y0);
      this._y1 = y1;
    };
    return ctor;
  })();
  
  module.exports = {};

});
define('cc/lang/lang-worker', function(require, exports, module) {

  var cc = require("./cc");
  var extend = require("../common/extend");
  var onmessage = require("./utils").lang_onmessage;
  
  var WorkerSynthLang = (function() {
    function WorkerSynthLang() {
      cc.opmode = "worker";
      
      cc.SynthLang.call(this);
      this.sampleRate = 44100;
      this.channels   = 2;
      this.strmLength = 1024;
      this.bufLength  = 64;
    }
    extend(WorkerSynthLang, cc.SynthLang);
    
    WorkerSynthLang.prototype.sendToClient = function(msg) {
      postMessage(msg);
    };
    WorkerSynthLang.prototype.process = function() {
      this.currentTime += this.currentTimeIncr;
      this.taskManager.process();
      var timelineResult = this.timelineResult.splice(0);
      this.sendToServer(["/processed", timelineResult]);
    };
    
    return WorkerSynthLang;
  })();

  cc.createWorkerSynthLang = function() {
    var lang = new WorkerSynthLang();
    global.onmessage = onmessage;
    return lang;
  };
  
  module.exports = {};

});
define('cc/lang/lang-nodejs', function(require, exports, module) {

  var cc = require("./cc");
  var extend = require("../common/extend");
  
  var NodeJSSynthLang = (function() {
    function NodeJSSynthLang() {
      cc.opmode = "nodejs";
      
      cc.SynthLang.call(this);
      
      this.sampleRate = 44100;
      this.channels   = 2;
      this.strmLength = 4096;
      this.bufLength  = 64;
    }
    extend(NodeJSSynthLang, cc.SynthLang);

    NodeJSSynthLang.prototype.process = function() {
      this.currentTime += this.currentTimeIncr;
      this.taskManager.process();
      var timelineResult = this.timelineResult.splice(0);
      this.sendToServer(["/processed", timelineResult]);
    };
    
    return NodeJSSynthLang;
  })();

  cc.createNodeJSSynthLang = function() {
    var lang = new NodeJSSynthLang();
    return lang;
  };
  
  module.exports = {};

});
define('cc/lang/lang-socket', function(require, exports, module) {

  var cc = require("./cc");
  var extend = require("../common/extend");
  var onmessage = require("./utils").lang_onmessage;
  
  var SocketSynthLang = (function() {
    require("../common/browser");
    
    function SocketSynthLang() {
      cc.opmode = "nodejs";
      
      cc.SynthLang.call(this);
      
      this.sampleRate = 44100;
      this.channels   = 2;
      this.strmLength = 4096;
      this.bufLength  = 64;
      this.socketPath = null;
    }
    extend(SocketSynthLang, cc.SynthLang);

    SocketSynthLang.prototype.sendToClient = function(msg) {
      postMessage(msg);
    };
    SocketSynthLang.prototype.sendToServer = function() {
    };
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
      var currentTimeIncr = this.currentTimeIncr;
      while (n--) {
        this.currentTime += currentTimeIncr;
        taskManager.process();
        timelineResult = timelineResult.concat(
          this.timelineResult.splice(0), 0
        );
      }
      this.sendToServer(["/processed", timelineResult]);
    };

    SocketSynthLang.prototype.extendCommands = function(commands) {
      commands["/socket/open"] = function(msg) {
        this.socketPath = msg[1];
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

  cc.createSocketSynthLang = function() {
    var lang = new SocketSynthLang();
    global.onmessage = onmessage;
    cc.opmode = "socket";
    return lang;
  };
  
  module.exports = {};

});
define('cc/server/server', function(require, exports, module) {

  var cc = require("./cc");
  var commands = {};
  
  var SynthServer = (function() {
    function SynthServer() {
      this.sampleRate = 0;
      this.channels   = 0;
      this.strmLength = 0;
      this.bufLength  = 0;
      this.instance = null;
      this.rates    = null;
      this.strm     = null;
      this.timer    = cc.createTimer();
      this.initialized = false;
      this.syncCount    = 0;
      this.sysSyncCount = 0;
    }
    
    SynthServer.prototype.sendToLang = function() {
      throw "SynthServer#sendToLang: should be overridden";
    };
    SynthServer.prototype.recvFromLang = function(msg, userId) {
      userId = userId|0;
      if (msg instanceof Uint8Array) {
        this.instance.doBinayCommand(msg, userId);
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
      throw "SynthServer#connect: should be overridden";
    };
    SynthServer.prototype.init = function(msg) {
      if (!this.initialized) {
        this.initialized = true;
        if (msg) {
          this.sampleRate = msg[1]|0;
          this.channels   = msg[2]|0;
          this.strmLength = msg[3]|0;
        }
        this.strm = new Int16Array(this.strmLength * this.channels);

        var busLength  = this.bufLength * 16 + 128;
        var bufLength  = this.bufLength;
        var bufLength4 = this.bufLength << 2;
        
        this.busLength = busLength;
        this.busClear  = new Float32Array(busLength);
        this.busOut    = new Float32Array(busLength);
        this.busOutLen = this.bufLength << 1;
        this.busOutL   = new Float32Array(this.busOut.buffer, 0         , bufLength);
        this.busOutR   = new Float32Array(this.busOut.buffer, bufLength4, bufLength);
        if (!this.instance) {
          this.instance = cc.createInstance(0);
        }
        this.rates = [];
        this.rates[2  ] = cc.createRate(this.sampleRate, this.bufLength);
        this.rates[1] = cc.createRate(this.sampleRate / this.bufLength, 1);
        this.rates[0 ] = this.rates[1];
        this.rates[3 ] = this.rates[1];
      }
    };
    SynthServer.prototype.play = function(msg, userId) {
      userId = userId|0;
      this.instance.play(userId);
      if (!this.timer.isRunning()) {
        var that = this;
        this.timer.start(function() { that.process(); }, 10);
      }
      this.sendToLang([
        "/played", this.syncCount
      ]);
    };
    SynthServer.prototype.pause = function(msg, userId) {
      userId = userId|0;
      this.instance.pause(userId);
      if (this.timer.isRunning()) {
        if (!this.instance.isRunning()) {
          this.timer.stop();
        }
      }
      this.sendToLang([
        "/paused", this.syncCount
      ]);
    };
    SynthServer.prototype.reset = function(msg, userId) {
      userId = userId|0;
      this.instance.reset(userId);
    };
    SynthServer.prototype.pushToTimeline = function(msg, userId) {
      userId = userId|0;
      var timeline = msg[1];
      if (timeline.length) {
        this.instance.pushToTimeline(timeline, userId);
      }
    };
    SynthServer.prototype.process = function() {
      throw "SynthServer#process: should be overridden";
    };
    
    return SynthServer;
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
    // receive a message from the lang-interface via the lang
    if (this.exports) {
      msg = msg[1];
      msg.userId = userId;
      this.exports.emit("message", msg);
    }
  };
  
  cc.SynthServer = SynthServer;
  
  // TODO: moved
  require("../common/timer");
  require("./rate");
  require("./unit");
  require("./buffer");
  require("./node");
  require("./instance");
  require("./server-worker");
  require("./server-nodejs");
  require("./server-socket");
  require("./basic_unit");
  require("../plugins/installer");
  
  cc.createSynthServer = function() {
    switch (cc.opmode) {
    case "worker":
      return cc.createWorkerSynthServer();
    case "nodejs":
      return cc.createNodeJSSynthServer();
    case "socket":
      return cc.createSocketSynthServer();
    }
    throw new Error("A SynthServer is not defined for: " + cc.opmode);
  };
  
  module.exports = {};

});
define('cc/server/cc', function(require, exports, module) {

  var _cc = require("../cc");

  if (!_cc.UGen) {
    _cc.UGen = Object;
  }
  
  module.exports = _cc;

});
define('cc/common/timer', function(require, exports, module) {
  
  var cc = require("../cc");
  
  var NativeTimer = (function() {
    function NativeTimer() {
      this._timerId = 0;
    }
    NativeTimer.prototype.start = function(callback, interval) {
      if (this._timerId) {
        clearInterval(this._timerId);
      }
      this._timerId = setInterval(callback, interval);
    };
    NativeTimer.prototype.stop = function() {
      if (this._timerId) {
        clearInterval(this._timerId);
      }
      this._timerId = 0;
    };
    NativeTimer.prototype.isRunning = function() {
      return !!this._timerId;
    };
    return NativeTimer;
  })();

  var WorkerTimer = (function() {
    if (typeof Worker === "undefined") {
      return;
    }
    /*global URL:true */
    var worker_path = (function() {
      try {
        var source = "var t=0;onmessage=function(e){if(t)t=clearInterval(t),0;if(typeof e.data=='number'&&e.data>0)t=setInterval(function(){postMessage(0);},e.data);};";
        var blob = new Blob([source], {type:"text/javascript"});
        return URL.createObjectURL(blob);
      } catch (e) {}
    })();
    /*global URL:false */
    if (!worker_path) {
      return;
    }
    function WorkerTimer() {
      this._worker = new Worker(worker_path);
      this._worker.onmessage = null;
    }
    WorkerTimer.prototype.start = function(callback, interval) {
      if (this._worker.onmessage) {
        this._worker.postMessage(0);
      }
      this._worker.onmessage = callback;
      this._worker.postMessage(interval);
    };
    WorkerTimer.prototype.stop = function() {
      if (this._worker.onmessage) {
        this._worker.postMessage(0);
      }
      this._worker.onmessage = null;
    };
    WorkerTimer.prototype.isRunning = function() {
      return !!this._worker.onmessage;
    };
    return WorkerTimer;
  })();
  
  cc.createTimer = function() {
    if (WorkerTimer) {
      return new WorkerTimer();
    }
    return new NativeTimer();
  };
  
  module.exports = {
    WorkerTimer: WorkerTimer,
    NativeTimer: NativeTimer
  };

});
define('cc/server/rate', function(require, exports, module) {
  
  var cc = require("./cc");
  
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
  
  cc.createRate = function(sampleRate, bufLength) {
    return new Rate(sampleRate, bufLength);
  };
  
  module.exports = {};

});
define('cc/server/unit', function(require, exports, module) {

  var cc = require("../cc");
  
  var Unit = (function() {
    function Unit(parent, specs) {
      this.parent = parent;
      this.specs  = specs;
      this.name         = specs[0];
      this.calcRate     = specs[1];
      this.specialIndex = specs[2];
      this.numOfInputs  = specs[3].length >> 1;
      this.numOfOutputs = specs[4].length;
      this.inputs    = new Array(this.numOfInputs);
      this.inRates   = new Array(this.numOfInputs);
      this.fromUnits = new Array(this.numOfInputs);
      this.outRates = specs[4];
      this.rate     = cc.server.rates[this.calcRate];
      var bufLength = this.rate.bufLength;
      var allOutputs = new Float32Array(bufLength * this.numOfOutputs);
      var outputs    = new Array(this.numOfOutputs);
      for (var i = 0, imax = outputs.length; i < imax; ++i) {
        outputs[i] = new Float32Array(
          allOutputs.buffer,
          bufLength * i * allOutputs.BYTES_PER_ELEMENT,
          bufLength
        );
      }
      this.outputs    = outputs;
      this.allOutputs = allOutputs;
      this.bufLength  = bufLength;
      this.done       = false;
    }
    Unit.prototype.init = function() {
      var ctor = cc.unit.specs[this.name];
      if (typeof ctor === "function") {
        ctor.call(this);
      } else {
        throw new Error(this.name + "'s ctor is not found.");
      }
      return this;
    };
    Unit.prototype.doneAction = function(action) {
      this.parent.doneAction(action);
    };
    return Unit;
  })();
  
  cc.createUnit = function(parent, specs) {
    return new Unit(parent, specs);
  };
  
  module.exports = {
    Unit : Unit
  };

});
define('cc/server/buffer', function(require, exports, module) {

  var cc = require("./cc");
  
  var BufferSource = (function() {
    function BufferSource(bufSrcId) {
      this.bufSrcId   = bufSrcId;
      this.channels   = 0;
      this.sampleRate = 0;
      this.frames     = 0;
      this.samples    = null;
      this.pendings   = [];
    }
    BufferSource.prototype.set = function(channels, sampleRate, frames, samples) {
      this.channels   = channels;
      this.sampleRate = sampleRate;
      this.frames     = frames;
      this.samples    = samples;
      this.pendings.forEach(function(items) {
        var buffer     = items[0];
        var startFrame = items[1];
        var frames  = items[2];
        buffer.bindBufferSource(this, startFrame, frames);
      }, this);
      this.pendings = null;
    };
    return BufferSource;
  })();
  
  var Buffer = (function() {
    function Buffer(bufnum, frames, channels) {
      this.bufnum     = bufnum;
      this.frames     = frames;
      this.channels   = channels;
      this.sampleRate = cc.server.sampleRate;
      this.samples    = new Float32Array(frames * channels);
    }
    Buffer.prototype.bindBufferSource = function(bufSrc, startFrame, frames) {
      startFrame = Math.max( 0, Math.min(startFrame|0, bufSrc.frames));
      frames     = Math.max(-1, Math.min(frames    |0, bufSrc.frames - startFrame));
      if (startFrame === 0) {
        if (frames === -1) {
          this.samples = bufSrc.samples;
          this.frames  = bufSrc.frames;
        } else {
          this.samples = new Float32Array(bufSrc.samples.buffer, 0, frames);
          this.frames = frames;
        }
      } else {
        if (frames === -1) {
          this.samples = new Float32Array(bufSrc.samples.buffer, startFrame * 4);
          this.frames = bufSrc.frames - startFrame;
        } else {
          this.samples = new Float32Array(bufSrc.samples.buffer, startFrame * 4, frames);
          this.frames = frames;
        }
      }
      this.channels   = bufSrc.channels;
      this.sampleRate = bufSrc.sampleRate;
    };
    Buffer.prototype.zero = function() {
      var i, samples = this.samples;
      for (i = samples.length; i--; ) {
        samples[i] = 0;
      }
    };
    Buffer.prototype.set = function(params) {
      var samples = this.samples;
      var samples_length = samples.length;
      var index, value, values;
      var i, imax = params.length;
      var j, jmax;
      for (i = 0; i < imax; i += 2) {
        index = params[i];
        if (typeof index !== "number" || index < 0 || samples_length <= index) {
          continue;
        }
        index |= 0;
        value = params[i+1];
        if (typeof value === "number") {
          samples[index] = value || 0; // remove NaN
        } else if (Array.isArray(value)) {
          values = value;
          for (j = 0, jmax = values.length; j < jmax; ++j) {
            if (samples_length <= index + j) {
              break;
            }
            value = values[j];
            if (typeof value === "number") {
              samples[index + j] = value || 0; // remove NaN
            }
          }
        }
      }
    };
    Buffer.prototype.gen = function(cmd, flags, params) {
      var func = gen_func[cmd];
      if (func) {
        var samples = this.samples;
        var normalize = !!(flags & 1);
        var wavetable = !!(flags & 2);
        var clear     = !!(flags & 4);
        if (clear) {
          for (var i = samples.length; i--; ) {
            samples[i] = 0;
          }
        }
        func(samples, wavetable, params);
        if (normalize) {
          if (wavetable) {
            normalize_wsamples(samples.length, samples, 1);
          } else {
            normalize_samples(samples.length, samples, 1);
          }
        }
      }
    };
    return Buffer;
  })();

  var gen_func = {};
  
  gen_func.sine1 = function(samples, wavetable, params) {
    var len = samples.length;
    var i, imax;
    if (wavetable) {
      for (i = 0, imax = params.length; i < imax; ++i) {
        add_wpartial(len, samples, i+1, params[i], 0);
      }
    } else {
      for (i = 0, imax = params.length; i < imax; ++i) {
        add_partial(len, samples, i+1, params[i], 0);
      }
    }
  };
  
  gen_func.sine2 = function(samples, wavetable, params) {
    var len = samples.length;
    var i, imax;
    if (wavetable) {
      for (i = 0, imax = params.length; i < imax; i += 2) {
        add_wpartial(len, samples, params[i], params[i+1], 0);
      }
    } else {
      for (i = 0, imax = params.length; i < imax; i += 2) {
        add_partial(len, samples, params[i], params[i+1], 0);
      }
    }
  };
  
  gen_func.sine3 = function(samples, wavetable, params) {
    var len = samples.length;
    var i, imax;
    if (wavetable) {
      for (i = 0, imax = params.length; i < imax; i += 3) {
        add_wpartial(len, samples, params[i], params[i+1], params[i+2]);
      }
    } else {
      for (i = 0, imax = params.length; i < imax; i += 3) {
        add_partial(len, samples, params[i], params[i+1], params[i+2]);
      }
    }
  };

  gen_func.cheby = function(samples, wavetable, params) {
    var len = samples.length;
    var i, imax;
    if (wavetable) {
      for (i = 0, imax = params.length; i < imax; ++i) {
        add_wchebyshev(len, samples, i+1, params[i]);
      }
    } else {
      for (i = 0, imax = params.length; i < imax; ++i) {
        add_chebyshev(len, samples, i+1, params[i]);
      }
    }
  };
  
  var add_wpartial = function(size, data, partial, amp, phase) {
    if (amp === 0) {
      return;
    }
    var size2 = size >> 1;
    var w = (partial * 2.0 * Math.PI) / size2;
    var cur = amp * Math.sin(phase);
    var next;
    phase += w;
    for (var i = 0; i < size; i += 2) {
      next = amp * Math.sin(phase);
      data[i] += 2 * cur - next;
      data[i+1] += next - cur;
      cur = next;
      phase += w;
    }
  };
  var add_partial = function(size, data, partial, amp, phase) {
    if (amp === 0) {
      return;
    }
    var w = (partial * 2.0 * Math.PI) / size;
    for (var i = 0; i < size; ++i) {
      data[i] += amp * Math.sin(phase);
      phase += w;
    }
  };
  var add_wchebyshev = function(size, data, partial, amp) {
    if (amp === 0) {
      return;
    }
    var size2 = size >> 1;
    var w = 2 / size2;
    var phase = -1;
    var offset = -amp * Math.cos(partial * Math.PI * 0.5);
    var cur = amp * Math.cos(partial * Math.acos(phase)) - offset;
    var next;
    phase += w;
    for (var i = 0; i < size; i += 2) {
      next = amp * Math.cos(partial * Math.acos(phase)) - offset;
      data[i] += 2 * cur - next;
      data[i+1] += next - cur;
      cur = next;
      phase += w;
    }
  };
  var add_chebyshev = function(size, data, partial, amp) {
    if (amp === 0) {
      return;
    }
    var w = 2 / size;
    var phase = -1;
    var offset = -amp * Math.cos(partial * Math.PI * 0.5);
    for (var i = 0; i < size; ++i) {
      data[i] += amp * Math.cos(partial * Math.acos(phase)) - offset;
      phase += w;
    }
  };

  var normalize_samples = function(size, data, peak) {
    var maxamp, absamp, ampfac, i;
    for (i = maxamp = 0; i < size; ++i) {
      absamp = Math.abs(data[i]);
      if (absamp > maxamp) { maxamp = absamp; }
    }
    if (maxamp !== 0 && maxamp !== peak) {
      ampfac = peak / maxamp;
      for (i = 0; i < size; ++i) {
        data[i] *= ampfac;
      }
    }
  };

  var normalize_wsamples = function(size, data, peak) {
    var maxamp, absamp, ampfac, i;
    for (i = maxamp = 0; i < size; i += 2) {
      absamp = Math.abs(data[i] + data[i+1]);
      if (absamp > maxamp) { maxamp = absamp; }
    }
    if (maxamp !== 0 && maxamp !== peak) {
      ampfac = peak / maxamp;
      for (i = 0; i < size; ++i) {
        data[i] *= ampfac;
      }
    }
  };

  cc.createServerBufferSource = function(bufSrcId) {
    return new BufferSource(bufSrcId);
  };
  
  cc.createServerBuffer = function(bufnum, frames, channels) {
    return new Buffer(bufnum, frames, channels);
  };
  
  module.exports = {
    BufferSource: BufferSource,
    Buffer: Buffer
  };

});
define('cc/server/node', function(require, exports, module) {

  var cc = require("./cc");
  var extend = require("../common/extend");
  
  var graphFunc  = {};
  var doneAction = {};
  
  graphFunc[0] = function(target, node) {
    var prev;
    if (target instanceof Group) {
      if (target.head === null) {
        target.head = target.tail = node;
      } else {
        prev = target.head.prev;
        if (prev) {
          prev.next = node;
        }
        node.next = target.head;
        target.head.prev = node;
        target.head = node;
      }
      node.parent = target;
    }
  };
  graphFunc[1] = function(target, node) {
    var next;
    if (target instanceof Group) {
      if (target.tail === null) {
        target.head = target.tail = node;
      } else {
        next = target.tail.next;
        if (next) {
          next.prev = node;
        }
        node.prev = target.tail;
        target.tail.next = node;
        target.tail = node;
      }
      node.parent = target;
    }
  };
  graphFunc[2] = function(target, node) {
    var prev = target.prev;
    target.prev = node;
    node.prev = prev;
    if (prev) {
      prev.next = node;
    }
    node.next = target;
    if (target.parent && target.parent.head === target) {
      target.parent.head = node;
    }
    node.parent = target.parent;
  };
  graphFunc[3] = function(target, node) {
    var next = target.next;
    target.next = node;
    node.next = next;
    if (next) {
      next.prev = node;
    }
    node.prev = target;
    if (target.parent && target.parent.tail === target) {
      target.parent.tail = node;
    }
    node.parent = target.parent;
  };
  graphFunc[4] = function(target, node) {
    node.next = target.next;
    node.prev = target.prev;
    node.head = target.head;
    node.tail = target.tail;
    node.parent = target.parent;
    if (target.prev) {
      target.prev.next = node;
    }
    if (target.next) {
      target.next.prev = node;
    }
    if (target.parent && target.parent.head === target) {
      target.parent.head = node;
    }
    if (target.parent && target.parent.tail === target) {
      target.parent.tail = node;
    }
  };
  
  doneAction[0] = function() {
    // do nothing when the UGen is finished
  };
  doneAction[1] = function() {
    // pause the enclosing synth, but do not free it
    this.running = false;
  };
  doneAction[2] = function() {
    // free the enclosing synth
    free.call(this);
  };
  doneAction[3] = function() {
    // free both this synth and the preceding node
    var prev = this.prev;
    if (prev) {
      free.call(prev);
    }
    free.call(this);
  };
  doneAction[4] = function() {
    // free both this synth and the following node
    var next = this.next;
    free.call(this);
    if (next) {
      free.call(next);
    }
  };
  doneAction[5] = function() {
    // free this synth; if the preceding node is a group then do g_freeAll on it, else free it
    var prev = this.prev;
    if (prev instanceof Group) {
      g_freeAll(prev);
    } else {
      free.call(prev);
    }
    free.call(this);
  };
  doneAction[6] = function() {
    // free this synth; if the following node is a group then do g_freeAll on it, else free it
    var next = this.next;
    free.call(this);
    if (next) {
      g_freeAll(next);
    } else {
      free.call(next);
    }
  };
  doneAction[7] = function() {
    // free this synth and all preceding nodes in this group
    var next = this.parent.head;
    if (next) {
      var node = next;
      while (node && node !== this) {
        next = node.next;
        free.call(node);
        node = next;
      }
    }
    free.call(this);
  };
  doneAction[8] = function() {
    // free this synth and all following nodes in this group
    var next = this.next;
    free.call(this);
    if (next) {
      var node = next;
      while (node) {
        next = node.next;
        free.call(node);
        node = next;
      }
    }
  };
  doneAction[9] = function() {
    // free this synth and pause the preceding node
    var prev = this.prev;
    free.call(this);
    if (prev) {
      prev.running = false;
    }
  };
  doneAction[10] = function() {
    // free this synth and pause the following node
    var next = this.next;
    free.call(this);
    if (next) {
      next.running = false;
    }
  };
  doneAction[11] = function() {
    // free this synth and if the preceding node is a group then do g_deepFree on it, else free it
    var prev = this.prev;
    if (prev instanceof Group) {
      g_deepFree(prev);
    } else {
      free.call(prev);
    }
    free.call(this);
  };
  doneAction[12] = function() {
    // free this synth and if the following node is a group then do g_deepFree on it, else free it
    var next = this.next;
    free.call(this);
    if (next) {
      g_deepFree(next);
    } else {
      free.call(next);
    }
  };
  doneAction[13] = function() {
    // free this synth and all other nodes in this group (before and after)
    var next = this.parent.head;
    if (next) {
      var node = next;
      while (node) {
        next = node.next;
        free.call(node);
        node = next;
      }
    }
  };
  doneAction[14] = function() {
    // free the enclosing group and all nodes within it (including this synth)
    g_deepFree(this);
  };
  var free = function() {
    if (this.prev) {
      this.prev.next = this.next;
    }
    if (this.next) {
      this.next.prev = this.prev;
    }
    if (this.parent) {
      if (this.parent.head === this) {
        this.parent.head = this.next;
      }
      if (this.parent.tail === this) {
        this.parent.tail = this.prev;
      }

      var userId;
      if (this.instance) {
        userId = this.instance.userId;
      }
    }
    this.prev = null;
    this.next = null;
    this.parent = null;
    this.blocking = false;
    if (this.instance) {
      delete this.instance.nodes[this.nodeId];
    }
  };
  var g_freeAll = function(node) {
    var next = node.head;
    free.call(node);
    node = next;
    while (node) {
      next = node.next;
      free.call(node);
      node = next;
    }
  };
  var g_deepFree = function(node) {
    var next = node.head;
    free.call(node);
    node = next;
    while (node) {
      next = node.next;
      free.call(node);
      if (node instanceof Group) {
        g_deepFree(node);
      }
      node = next;
    }
  };
  
  var Node = (function() {
    function Node(nodeId, instance) {
      this.nodeId = nodeId|0;
      this.next   = null;
      this.prev   = null;
      this.parent = null;
      this.running = true;
      this.instance = instance;
    }
    Node.prototype.play = function() {
      this.running = true;
    };
    Node.prototype.pause = function() {
      this.running = false;
    };
    Node.prototype.stop = function() {
      free.call(this);
    };
    Node.prototype.run = function(inRun) {
      this.running = !!inRun; // TODO
    };
    Node.prototype.end = function() {
      this.running = false; // TODO
    };
    Node.prototype.doneAction = function(action) {
      var func = doneAction[action];
      if (func) {
        func.call(this);
        var userId;
        if (this.instance) {
          userId = this.instance.userId;
        }
      }
    };
    return Node;
  })();

  var Group = (function() {
    function Group(nodeId, target, addAction, instance) {
      Node.call(this, nodeId, instance);
      this.head = null;
      this.tail = null;
      if (target) {
        graphFunc[addAction](target, this);
      }
    }
    extend(Group, Node);
    
    Group.prototype.process = function(inNumSamples, instance) {
      if (this.head && this.running) {
        this.head.process(inNumSamples, instance);
      }
      if (this.next) {
        this.next.process(inNumSamples, instance);
      }
    };
    
    return Group;
  })();

  var Synth = (function() {
    function Synth(nodeId, target, addAction, defId, controls, instance) {
      Node.call(this, nodeId, instance);
      if (instance) {
        var specs = instance.defs[defId];
        if (specs) {
          this.build(specs, controls, instance);
        }
      }
      if (target) {
        graphFunc[addAction](target, this);
      }
    }
    extend(Synth, Node);
    
    Synth.prototype.build = function(specs, controls, instance) {
      this.specs = specs;
      var list, value, unit, i, imax;
      var fixNumList, unitList, filteredUnitList;
      list = specs.consts;
      fixNumList = new Array(list.length);
      for (i = 0, imax = list.length; i < imax; ++i) {
        value = list[i];
        fixNumList[i] = instance.getFixNum(value);
      }
      list = specs.defList;
      unitList = new Array(list.length);
      for (i = 0, imax = list.length; i < imax; ++i) {
        unitList[i] = cc.createUnit(this, list[i]);
      }
      
      this.params   = specs.params;
      this.controls = new Float32Array(this.params.values);
      this.set(controls);
      
      this.unitList = filteredUnitList = [];
      for (i = 0, imax = unitList.length; i < imax; ++i) {
        unit = unitList[i];
        var inputs    = unit.inputs;
        var inRates   = unit.inRates;
        var fromUnits = unit.fromUnits;
        var inSpec  = unit.specs[3];
        for (var j = 0, jmax = inputs.length; j < jmax; ++j) {
          var j2 = j << 1;
          if (inSpec[j2] === -1) {
            inputs[j]  = fixNumList[inSpec[j2+1]].outputs[0];
            inRates[j] = 0;
          } else {
            inputs[j]    = unitList[inSpec[j2]].outputs[inSpec[j2+1]];
            inRates[j]   = unitList[inSpec[j2]].outRates[inSpec[j2+1]];
            fromUnits[j] = unitList[inSpec[j2]];
          }
        }
        unit.init();
        if (unit.process) {
          filteredUnitList.push(unit);
        }
      }
      return this;
    };

    Synth.prototype.set = function(controls) {
      for (var i = 0, imax = controls.length; i < imax; i += 2) {
        var index = controls[i    ];
        var value = controls[i + 1];
        this.controls[index] = value;
      }
    };
    
    Synth.prototype.process = function(inNumSamples, instance) {
      if (this.running && this.unitList) {
        var unitList = this.unitList;
        for (var i = 0, imax = unitList.length; i < imax; ++i) {
          var unit = unitList[i];
          if (unit.calcRate !== 3) {
            unit.process(unit.rate.bufLength, instance);
          }
        }
      }
      if (this.next) {
        this.next.process(inNumSamples, instance);
      }
    };
    
    return Synth;
  })();
  
  cc.createServerRootNode = function(instance) {
    return new Group(0, 0, 0, instance);
  };

  cc.createServerGroup = function(nodeId, target, addAction, instance) {
    return new Group(nodeId, target, addAction, instance);
  };

  cc.createServerSynth = function(nodeId, target, addAction, defId, controls, instance) {
    return new Synth(nodeId, target, addAction, defId, controls, instance);
  };
  
  module.exports = {
    Node : Node,
    Group: Group,
    Synth: Synth
  };

});
define('cc/server/instance', function(require, exports, module) {

  var cc = require("./cc");
  var push = [].push;
  
  var commands = {};
  
  var Instance = (function() {
    function Instance(userId) {
      this.userId  = userId|0;
      this.bus      = new Float32Array(cc.server.busClear);
      this.busClear = cc.server.busClear;
      
      this.busIndex = 0;
      this.busAmp   = 0.8;
      this.timeline = [];
      this.timelineIndex = 0;
      this.rootNode = cc.createServerRootNode(this);
      this.nodes   = { 0:this.rootNode };
      this.fixNums = {};
      this.defs    = {};
      this.buffers = {};
      this.bufSrc  = {};
      this.syncItems     = new Uint8Array(20);
      this.i16_syncItems = new Int16Array(this.syncItems.buffer);
      this.f32_syncItems = new Float32Array(this.syncItems.buffer);
    }
    Instance.prototype.play = function() {
      this.rootNode.running = true;
      this.bus.set(this.busClear);
      this.timeline = [];
    };
    Instance.prototype.pause = function() {
      this.rootNode.running = false;
      this.bus.set(this.busClear);
      this.timeline = [];
    };
    Instance.prototype.reset = function() {
      this.bus.set(this.busClear);
      this.timeline = [];
      this.rootNode = cc.createServerRootNode(this);
      this.nodes   = { 0:this.rootNode };
      this.fixNums = {};
      this.defs    = {};
      this.buffers = {};
      this.bufSrc  = {};
    };
    Instance.prototype.isRunning = function() {
      return this.rootNode.running;
    };
    Instance.prototype.pushToTimeline = function(timeline) {
      push.apply(this.timeline, timeline);
    };
    Instance.prototype.doBinayCommand = function(binary) {
      var func  = commands[(binary[1] << 8) + binary[0]];
      if (func) {
        func(this, binary);
      }
    };
    Instance.prototype.getFixNum = function(value) {
      var fixNums = this.fixNums;
      return fixNums[value] || (fixNums[value] = {
        outputs: [ new Float32Array([value]) ]
      });
    };
    Instance.prototype.process = function(bufLength) {
      var timeline = this.timeline;
      var args, func;
      
      while ((args = timeline.shift())) {
        func = commands[args[0]];
        if (func) {
          func(this, args);
        }
      }
      
      this.bus.set(this.busClear);
      this.rootNode.process(bufLength, this);
    };
    
    return Instance;
  })();
  
  commands["/n_run"] = function(instance, args) {
    var nodeId = args[1]|0;
    var flag   = !!args[2];
    var target = instance.nodes[nodeId];
    if (target) {
      target.running = flag;
    }
  };
  commands["/n_free"] = function(instance, args) {
    var nodeId = args[1]|0;
    var target = instance.nodes[nodeId];
    if (target) {
      target.doneAction(2);
    }
  };
  commands["/n_set"] = function(instance, args) {
    var nodeId = args[1]|0;
    var controls = args[2];
    var target = instance.nodes[nodeId];
    if (target) {
      target.set(controls);
    }
  };
  commands["/g_new"] = function(instance, args) {
    var nodeId       = args[1]|0;
    var addAction    = args[2]|0;
    var targetNodeId = args[3]|0;
    var target = instance.nodes[targetNodeId];
    if (target) {
      instance.nodes[nodeId] = cc.createServerGroup(nodeId, target, addAction, instance);
    }
  };
  commands["/s_def"] = function(instance, args) {
    var defId = args[1]|0;
    var specs = args[2];
    instance.defs[defId] = specs;
  };
  commands["/s_new"] = function(instance, args) {
    var nodeId       = args[1]|0;
    var addAction    = args[2]|0;
    var targetNodeId = args[3]|0;
    var defId        = args[4]|0;
    var controls     = args[5];
    var target = instance.nodes[targetNodeId];
    if (target) {
      instance.nodes[nodeId] = cc.createServerSynth(nodeId, target, addAction, defId, controls, instance);
    }
  };
  commands["/b_new"] = function(instance, args) {
    var bufnum   = args[1]|0;
    var frames   = args[2]|0;
    var channels = args[3]|0;
    instance.buffers[bufnum] = cc.createServerBuffer(bufnum, frames, channels);
  };
  commands["/b_bind"] = function(instance, args) {
    var bufnum     = args[1]|0;
    var bufSrcId   = args[2]|0;
    var startFrame = args[3]|0;
    var frames     = args[4]|0;
    var buffer = instance.buffers[bufnum];
    var bufSrc = instance.bufSrc[bufSrcId];
    if (buffer) {
      if (bufSrc) {
        buffer.bindBufferSource(bufSrc, startFrame, frames);
      } else {
        bufSrc = cc.createServerBufferSource(bufSrcId);
        bufSrc.pendings.push([buffer, startFrame, frames]);
        instance.bufSrc[bufSrcId] = bufSrc;
      }
    }
  };
  commands["/b_free"] = function(instance, args) {
    var bufnum = args[1]|0;
    delete instance.buffers[bufnum];
  };
  commands["/b_zero"] = function(instance, args) {
    var bufnum = args[1]|0;
    var buffer = instance.buffers[bufnum];
    if (buffer) {
      buffer.zero();
    }
  };
  commands["/b_set"] = function(instance, args) {
    var bufnum = args[1]|0;
    var params = args[2];
    var buffer = instance.buffers[bufnum];
    if (buffer) {
      buffer.set(params);
    }
  };
  commands["/b_gen"] = function(instance, args) {
    var bufnum = args[1]|0;
    var cmd    = args[2];
    var flag   = args[3]|0;
    var params = args.slice(4);
    var buffer = instance.buffers[bufnum];
    if (buffer) {
      buffer.gen(cmd, flag, params);
    }
  };
  
  commands[0] = function(instance, binary) {
    instance.syncItems.set(binary);
    var server    = cc.server;
    var syncCount = new Uint32Array(binary.buffer)[1];
    if (server.sysSyncCount < syncCount) {
      server.sysSyncCount = syncCount;
    }
  };
  commands[1] = function(instance, binary) {
    var bufSrcId = (binary[3] << 8) + binary[2];
    var channels = (binary[7] << 8) + binary[6];
    var sampleRate = (binary[11] << 24) + (binary[10] << 16) + (binary[ 9] << 8) + binary[ 8];
    var frames     = (binary[15] << 24) + (binary[14] << 16) + (binary[13] << 8) + binary[12];
    var samples = new Float32Array(binary.buffer, 16);
    var bufSrc = instance.bufSrc[bufSrcId];
    if (!bufSrc) {
      bufSrc = cc.createServerBufferSource(bufSrcId);
    }
    bufSrc.set(channels, sampleRate, frames, samples);
    instance.bufSrc[bufSrcId] = bufSrc;
  };
  
  cc.createInstance = function(userId) {
    return new Instance(userId);
  };
  
  module.exports = {
    Instance: Instance,
    commands: commands
  };

});
define('cc/server/server-worker', function(require, exports, module) {

  var cc = require("./cc");
  var extend = require("../common/extend");
  
  var WorkerSynthServer = (function() {
    function WorkerSynthServer() {
      cc.SynthServer.call(this);
      
      this.sampleRate = 44100;
      this.channels   = 2;
      this.strmLength = 1024;
      this.bufLength  = 64;
    }
    extend(WorkerSynthServer, cc.SynthServer);
    
    WorkerSynthServer.prototype.sendToLang = function(msg) {
      postMessage(msg);
    };
    WorkerSynthServer.prototype.connect = function() {
      this.sendToLang([
        "/connected", this.sampleRate, this.channels
      ]);
    };
    WorkerSynthServer.prototype.process = function() {
      if (this.sysSyncCount < this.syncCount - 4) {
        return;
      }
      var strm = this.strm;
      var instance = this.instance;
      var strmLength = this.strmLength;
      var bufLength  = this.bufLength;
      var busOut  = this.busOut;
      var busOutL = this.busOutL;
      var busOutR = this.busOutR;
      var lang = cc.lang;
      var offset = 0;
      for (var i = 0, imax = strmLength / bufLength; i < imax; ++i) {
        lang.process();
        instance.process(bufLength);
        busOut.set(instance.bus);
        var j = bufLength, k = strmLength + bufLength;
        while (k--, j--) {
          strm[j + offset] = Math.max(-32768, Math.min(busOutL[j] * 32768, 32767));
          strm[k + offset] = Math.max(-32768, Math.min(busOutR[j] * 32768, 32767));
        }
        offset += bufLength;
      }
      this.sendToLang(strm);
      this.syncCount += 1;
    };
    
    return WorkerSynthServer;
  })();
  
  cc.createWorkerSynthServer = function() {
    var server = new WorkerSynthServer();
    cc.opmode = "worker";
    return server;
  };
  
  module.exports = {};

});
define('cc/server/server-nodejs', function(require, exports, module) {

  var cc = require("./cc");
  var extend = require("../common/extend");
  
  var NodeJSSynthServer = (function() {
    function NodeJSSynthServer() {
      require("../common/audioapi");
      
      cc.SynthServer.call(this);
      
      this.sampleRate = 44100;
      this.channels   = 2;
      this.strmLength = 4096;
      this.bufLength  = 64;
    }
    extend(NodeJSSynthServer, cc.SynthServer);
    
    NodeJSSynthServer.prototype.init = function() {
      if (!this.initialized) {
        cc.SynthServer.prototype.init.call(this);
        this.api = cc.createAudioAPI(this);
      }
    };
    NodeJSSynthServer.prototype.connect = function() {
      this.sendToLang([
        "/connected", this.sampleRate, this.channels
      ]);
    };
    NodeJSSynthServer.prototype.play = function(msg, userId) {
      userId = userId|0;
      this.instance.play(userId);
      if (this.api) {
        this._strm = new Int16Array(this.strmLength * this.channels);
        this.strmList = new Array(8);
        this.strmListReadIndex  = 0;
        this.strmListWriteIndex = 0;
        var strmList = this.strmList;
        for (var i = strmList.length; i--; ) {
          strmList[i] = new Int16Array(this._strm);
        }
        if (!this.api.isPlaying) {
          this.api.play();
        }
      }
      if (!this.timer.isRunning()) {
        var that = this;
        setTimeout(function() {
          that.timer.start(function() { that.process(); }, 10);
        }, 50); // TODO: ???
      }
    };
    NodeJSSynthServer.prototype.pause = function(msg, userId) {
      userId = userId|0;
      this.instance.pause(userId);
      if (this.api) {
        if (this.api.isPlaying) {
          if (!this.instance.isRunning()) {
            this.api.pause();
          }
        }
      }
      if (this.timer.isRunning()) {
        if (!this.instance.isRunning()) {
          this.timer.stop();
        }
      }
    };
    NodeJSSynthServer.prototype.process = function() {
      if (this.sysSyncCount < this.syncCount - 4) {
        return;
      }
      var strm = this.strm;
      var instance = this.instance;
      var strmLength = this.strmLength;
      var bufLength  = this.bufLength;
      var busOut  = this.busOut;
      var busOutL = this.busOutL;
      var busOutR = this.busOutR;
      var lang = cc.lang;
      var offset = 0;
      for (var i = 0, imax = strmLength / bufLength; i < imax; ++i) {
        lang.process();
        instance.process(bufLength);
        busOut.set(instance.bus);
        var j = bufLength, k = strmLength + bufLength;
        while (k--, j--) {
          strm[j + offset] = Math.max(-32768, Math.min(busOutL[j] * 32768, 32767));
          strm[k + offset] = Math.max(-32768, Math.min(busOutR[j] * 32768, 32767));
        }
        offset += bufLength;
      }
      this.sendToLang(strm);
      this.syncCount += 1;
      if (this.api) {
        this.strmList[this.strmListWriteIndex & 7] = new Int16Array(strm);
        this.strmListWriteIndex += 1;
      }
    };
    NodeJSSynthServer.prototype._process = function() {
      var strm = this.strmList[this.strmListReadIndex & 7];
      if (strm) {
        this.strmListReadIndex += 1;
        this._strm.set(strm);
      }
      this.sysSyncCount += 1;
    };
    
    return NodeJSSynthServer;
  })();
  
  cc.NodeJSSynthServer = NodeJSSynthServer;
  cc.createNodeJSSynthServer = function() {
    var server = new NodeJSSynthServer();
    cc.opmode = "nodejs";
    return server;
  };
  
  module.exports = {};

});
define('cc/server/server-socket', function(require, exports, module) {

  var cc = require("./cc");
  var extend = require("../common/extend");
  var emitter = require("../common/emitter");
  
  var InstanceManager = (function() {
    function InstanceManager() {
      this.map  = {};
      this.list = [];
      this.server = null;
      this.process = process0;
    }
    
    InstanceManager.prototype.append = function(userId) {
      if (!this.map[userId]) {
        var instance = cc.createInstance(userId);
        this.map[userId] = instance;
        this.list.push(instance);
        if (this.list.length === 1) {
          this.process = process1;
        } else {
          this.process = processN;
        }
      }
      return this.map[userId];
    };
    InstanceManager.prototype.remove = function(userId) {
      var instance = this.map[userId];
      if (instance) {
        this.list.splice(this.list.indexOf(instance), 1);
        delete this.map[userId];
        if (this.list.length === 1) {
          this.process = process1;
        } else if (this.list.length === 0) {
          this.process = process0;
        }
      }
    };
    InstanceManager.prototype.play = function(userId) {
      var instance = this.map[userId];
      if (instance) {
        instance.play();
      }
    };
    InstanceManager.prototype.pause = function(userId) {
      var instance = this.map[userId];
      if (instance) {
        instance.pause();
      }
    };
    InstanceManager.prototype.reset = function(userId) {
      var instance = this.map[userId];
      if (instance) {
        instance.reset();
      }
    };
    InstanceManager.prototype.isRunning = function() {
      return this.list.some(function(instance) {
        return instance.isRunning();
      });
    };
    InstanceManager.prototype.pushToTimeline = function(timeline, userId) {
      var instance = this.map[userId];
      if (instance) {
        instance.pushToTimeline(timeline);
      }
    };
    InstanceManager.prototype.doBinayCommand = function(binary, userId) {
      var instance = this.map[userId];
      if (instance) {
        instance.doBinayCommand(binary);
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
      var busOut    = this.busOut;
      var busOutLen = this.busOutLen;
      var instance;
      busOut.set(this.busClear);
      for (var i = 0, imax = list.length; i < imax; ++i) {
        instance = list[i];
        instance.process(bufLength);
        var inBus = instance.bus;
        var inAmp = instance.busAmp;
        for (var j = busOutLen; j--; ) {
          busOut[j] += inBus[j] * inAmp;
        }
      }
    };
    
    return InstanceManager;
  })();

  var SocketSynthServer = (function() {
    var WebSocketServer;
    if (global.require) {
      WebSocketServer = global.require("ws").Server;
    }
    function SocketSynthServer() {
      cc.NodeJSSynthServer.call(this);
      this.sampleRate = 44100;
      this.channels   = 2;
      this.strmLength = 4096;
      this.bufLength  = 64;
      this.instance   = new InstanceManager();
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
        that.instance.append(userId);
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
            that.instance.remove(userId);
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
      if (this.sysSyncCount < this.syncCount - 4) {
        return;
      }
      var strm = this.strm;
      var instance = this.instance;
      var strmLength = this.strmLength;
      var bufLength  = this.bufLength;
      var busOutL = this.busOutL;
      var busOutR = this.busOutR;
      var offset = 0;
      for (var i = 0, imax = strmLength / bufLength; i < imax; ++i) {
        instance.process(bufLength);
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
        this.strmListWriteIndex = (this.strmListWriteIndex + 1) & 7;
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
  
  module.exports = {
    InstanceManager: InstanceManager
  };

});
  
define('cc/server/basic_unit', function(require, exports, module) {

  var cc = require("../cc");
  var ops = require("../common/ops");
  var log001 = Math.log(0.001);
  
  var avoidzero = function(a) {
    if (a < 0) {
      if (-1e-6 < a) {
        a = -1e-6;
      }
    } else if (a < +1e-6) {
      a = 1e-6;
    }
    return a;
  };

  var calcDemandInput = function(unit, index, offset) {
    var fromUnit = unit.fromUnits[index];
    if (fromUnit) {
      switch (fromUnit.calcRate) {
      case 2:
        return unit.inputs[index][offset-1];
      case 3:
        fromUnit.process(offset);
        /* fall through */
      default:
        return unit.inputs[index][0];
      }
    } else {
      return unit.inputs[index][0];
    }
  };
  
  var resetDemandInput = function(unit, index) {
    var fromUnit = unit.fromUnits[index];
    if (fromUnit && fromUnit.calcRate === 3) {
      fromUnit.process(0);
    }
  };
  
  var uopFunc = {};
  
  cc.unit.specs.UnaryOpUGen = (function() {
    var ctor = function() {
      var func = uopFunc[ops.UNARY_OPS_MAP[this.specialIndex]];
      var process;
      if (func) {
        if (this.calcRate === 3) {
          this.process = func.d;
        } else {
          switch (this.inRates[0]) {
          case 2  : process = func.a; break;
          case 1: process = func.k; break;
          }
          this.process = process;
          if (this.process) {
            this.process(1);
          } else {
            this.outputs[0][0] = func(this.inputs[0][0]);
          }
        }
      } else {
        var opName = ops.UNARY_OPS_MAP[this.specialIndex] || "unknown";
        throw new Error("UnaryOpUGen[" + opName + "] is not defined.");
      }
    };
    
    return ctor;
  })();
  
  var unary_k = function(func) {
    return function() {
      this.outputs[0][0] = func(this.inputs[0][0]);
    };
  };
  var unary_a = function(func) {
    return function(inNumSamples) {
      var out = this.outputs[0];
      var a = this.inputs[0];
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = func(a[i  ]); out[i+1] = func(a[i+1]);
        out[i+2] = func(a[i+2]); out[i+3] = func(a[i+3]);
        out[i+4] = func(a[i+4]); out[i+5] = func(a[i+5]);
        out[i+6] = func(a[i+6]); out[i+7] = func(a[i+7]);
      }
    };
  };
  var unary_d = function(func) {
    return function(inNumSamples) {
      if (inNumSamples) {
        var x = calcDemandInput(this, 0, inNumSamples);
        this.outputs[0][0] = isNaN(x) ? NaN : func(x);
      } else {
        resetDemandInput(this, 0);
      }
    };
  };
  
  uopFunc.neg = function(a) {
    return -a;
  };
  uopFunc.not = function(a) {
    return a === 0 ? 1 : 0;
  };
  uopFunc.abs = function(a) {
    return Math.abs(a);
  };
  uopFunc.ceil = function(a) {
    return Math.ceil(a);
  };
  uopFunc.floor = function(a) {
    return Math.floor(a);
  };
  uopFunc.frac = function(a) {
    if (a < 0) {
      return 1 + (a - (a|0));
    }
    return a - (a|0);
  };
  uopFunc.sign = function(a) {
    if (a === 0) {
      return 0;
    } else if (a > 0) {
      return 1;
    }
    return -1;
  };
  uopFunc.squared = function(a) {
    return a * a;
  };
  uopFunc.cubed = function(a) {
    return a * a * a;
  };
  uopFunc.sqrt = function(a) {
    return Math.sqrt(Math.abs(a));
  };
  uopFunc.exp = function(a) {
    return Math.exp(a);
  };
  uopFunc.reciprocal = function(a) {
    return 1 / avoidzero(a);
  };
  uopFunc.midicps = function(a) {
    return 440 * Math.pow(2, (a - 69) * 1/12);
  };
  uopFunc.cpsmidi = function(a) {
    return Math.log(Math.abs(avoidzero(a)) * 1/440) * Math.LOG2E * 12 + 69;
  };
  uopFunc.midiratio = function(a) {
    return Math.pow(2, a * 1/12);
  };
  uopFunc.ratiomidi = function(a) {
    return Math.log(Math.abs(avoidzero(a))) * Math.LOG2E * 12;
  };
  uopFunc.dbamp = function(a) {
    return Math.pow(10, a * 0.05);
  };
  uopFunc.ampdb = function(a) {
    return Math.log(Math.abs(avoidzero(a))) * Math.LOG10E * 20;
  };
  uopFunc.octcps = function(a) {
    return 440 * Math.pow(2, avoidzero(a) - 4.75);
  };
  uopFunc.cpsoct = function(a) {
    return Math.log(Math.abs(a) * 1/440) * Math.LOG2E + 4.75;
  };
  uopFunc.log = function(a) {
    return Math.log(Math.abs(avoidzero(a)));
  };
  uopFunc.log2 = function(a) {
    return Math.log(Math.abs(avoidzero(a))) * Math.LOG2E;
  };
  uopFunc.log10 = function(a) {
    return Math.log(Math.abs(avoidzero(a))) * Math.LOG10E;
  };
  uopFunc.sin = function(a) {
    return Math.sin(a);
  };
  uopFunc.cos = function(a) {
    return Math.cos(a);
  };
  uopFunc.tan = function(a) {
    return Math.tan(a);
  };
  uopFunc.asin = function(a) {
    return Math.asin(Math.max(-1, Math.min(a, 1)));
  };
  uopFunc.acos = function(a) {
    return Math.acos(Math.max(-1, Math.min(a, 1)));
  };
  uopFunc.atan = function(a) {
    return Math.atan(a);
  };
  uopFunc.sinh = function(a) {
    return (Math.pow(Math.E, a) - Math.pow(Math.E, -a)) * 0.5;
  };
  uopFunc.cosh = function(a) {
    return (Math.pow(Math.E, a) + Math.pow(Math.E, -a)) * 0.5;
  };
  uopFunc.tanh = function(a) {
    var sinh = (Math.pow(Math.E, a) - Math.pow(Math.E, -a)) * 0.5;
    var cosh = (Math.pow(Math.E, a) + Math.pow(Math.E, -a)) * 0.5;
    return sinh / cosh;
  };
  uopFunc.rand = function(a) {
    return Math.random() * a;
  };
  uopFunc.rand2 = function(a) {
    return (Math.random() * 2 - 1) * a;
  };
  uopFunc.linrand = function(a) {
    return Math.min(Math.random(), Math.random()) * a;
  };
  uopFunc.bilinrand = function(a) {
    return (Math.random() - Math.random()) * a;
  };
  uopFunc.sum3rand = function(a) {
    return (Math.random() + Math.random() + Math.random() - 1.5) * 0.666666667 * a;
  };
  uopFunc.distort = function(a) {
    return a / (1 + Math.abs(a));
  };
  uopFunc.softclip = function(a) {
    var absa = Math.abs(a);
    return absa <= 0.5 ? a : (absa - 0.25) / a;
  };
  uopFunc.coin = function(a) {
    return Math.random() < a ? 1 : 0;
  };
  uopFunc.num = function(a) {
    return +a;
  };
  uopFunc.tilde = function(a) {
    return ~a;
  };
  uopFunc.pi = function(a) {
    return Math.PI * a;
  };
  uopFunc.to_i = function(a) {
    return a|0;
  };
  uopFunc.half = function(a) {
    return a * 0.5;
  };
  uopFunc.twice = function(a) {
    return a * 2;
  };
  
  Object.keys(uopFunc).forEach(function(key) {
    var func = uopFunc[key];
    func.a = unary_a(func);
    func.k = unary_k(func);
    func.d = unary_d(func);
  });
  
  var bopFunc = {};
  
  cc.unit.specs.BinaryOpUGen = (function() {
    var ctor = function() {
      var func = bopFunc[ops.BINARY_OPS_MAP[this.specialIndex]];
      var process;
      if (func) {
        if (this.calcRate === 3) {
          this.process = func.dd;
        } else {
          switch (this.inRates[0]) {
          case 2:
            switch (this.inRates[1]) {
            case 2  : process = func.aa; break;
            case 1: process = func.ak; break;
            case 0 : process = func.ai; break;
            }
            break;
          case 1:
            switch (this.inRates[1]) {
            case 2  : process = func.ka; break;
            case 1: process = func.kk; break;
            case 0 : process = func.kk; break;
            }
            break;
          case 0:
            switch (this.inRates[1]) {
            case 2  : process = func.ia; break;
            case 1: process = func.kk; break;
            case 0 : process = null   ; break;
            }
            break;
          }
          this.process = process;
          this._a = this.inputs[0][0];
          this._b = this.inputs[1][0];
          if (this.process) {
            this.process(1);
          } else {
            this.outputs[0][0] = func(this.inputs[0][0], this.inputs[1][0]);
          }
        }
      } else {
        var opName = ops.BINARY_OPS_MAP[this.specialIndex] || "unknown";
        throw new Error("BinaryOpUGen[" + opName + "] is not defined.");
      }
    };
    
    return ctor;
  })();
  
  var binary_aa = function(func) {
    return function(inNumSamples) {
      var out = this.outputs[0];
      var aIn = this.inputs[0], bIn = this.inputs[1];
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = func(aIn[i  ], bIn[i  ]); out[i+1] = func(aIn[i+1], bIn[i+1]);
        out[i+2] = func(aIn[i+2], bIn[i+2]); out[i+3] = func(aIn[i+3], bIn[i+3]);
        out[i+4] = func(aIn[i+4], bIn[i+4]); out[i+5] = func(aIn[i+5], bIn[i+5]);
        out[i+6] = func(aIn[i+6], bIn[i+6]); out[i+7] = func(aIn[i+7], bIn[i+7]);
      }
    };
  };
  var binary_ak = function(func) {
    return function(inNumSamples) {
      var out = this.outputs[0];
      var aIn = this.inputs[0], b = this._b;
      var nextB  = this.inputs[1][0];
      var b_slope = (nextB - this._b) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = func(aIn[i  ], b); b += b_slope;
        out[i+1] = func(aIn[i+1], b); b += b_slope;
        out[i+2] = func(aIn[i+2], b); b += b_slope;
        out[i+3] = func(aIn[i+3], b); b += b_slope;
        out[i+4] = func(aIn[i+4], b); b += b_slope;
        out[i+5] = func(aIn[i+5], b); b += b_slope;
        out[i+6] = func(aIn[i+6], b); b += b_slope;
        out[i+7] = func(aIn[i+7], b); b += b_slope;
      }
      this._b = nextB;
    };
  };
  var binary_ai = function(func) {
    return function(inNumSamples) {
      var out = this.outputs[0];
      var aIn = this.inputs[0], b = this._b;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = func(aIn[i  ], b);
        out[i+1] = func(aIn[i+1], b);
        out[i+2] = func(aIn[i+2], b);
        out[i+3] = func(aIn[i+3], b);
        out[i+4] = func(aIn[i+4], b);
        out[i+5] = func(aIn[i+5], b);
        out[i+6] = func(aIn[i+6], b);
        out[i+7] = func(aIn[i+7], b);
      }
    };
  };
  var binary_ka = function(func) {
    return function(inNumSamples) {
      var out = this.outputs[0];
      var a = this._a, bIn = this.inputs[1];
      var nextA  = this.inputs[0][0];
      var a_slope = (nextA - this._a) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = func(a, bIn[i  ]); a += a_slope;
        out[i+1] = func(a, bIn[i+1]); a += a_slope;
        out[i+2] = func(a, bIn[i+2]); a += a_slope;
        out[i+3] = func(a, bIn[i+3]); a += a_slope;
        out[i+4] = func(a, bIn[i+4]); a += a_slope;
        out[i+5] = func(a, bIn[i+5]); a += a_slope;
        out[i+6] = func(a, bIn[i+6]); a += a_slope;
        out[i+7] = func(a, bIn[i+7]); a += a_slope;
      }
      this._a = nextA;
    };
  };
  var binary_kk = function(func) {
    return function() {
      this.outputs[0][0] = func(this.inputs[0][0], this.inputs[1][0]);
    };
  };
  var binary_ia = function(func) {
    return function(inNumSamples) {
      var out = this.outputs[0];
      var a = this._a, bIn = this.inputs[1];
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = func(a, bIn[i  ]);
        out[i+1] = func(a, bIn[i+1]);
        out[i+2] = func(a, bIn[i+2]);
        out[i+3] = func(a, bIn[i+3]);
        out[i+4] = func(a, bIn[i+4]);
        out[i+5] = func(a, bIn[i+5]);
        out[i+6] = func(a, bIn[i+6]);
        out[i+7] = func(a, bIn[i+7]);
      }
    };
  };
  var binary_dd = function(func) {
    return function(inNumSamples) {
      if (inNumSamples) {
        var a = calcDemandInput(this, 0, inNumSamples);
        var b = calcDemandInput(this, 1, inNumSamples);
        this.outputs[0][0] = isNaN(a) || isNaN(b) ? NaN : func(a, b);
      } else {
        resetDemandInput(this, 0);
        resetDemandInput(this, 1);
      }
    };
  };
  
  bopFunc["+"] = function(a, b) {
    return a + b;
  };
  bopFunc["+"].aa = function(inNumSamples) {
    var out = this.outputs[0];
    var aIn = this.inputs[0], bIn = this.inputs[1];
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = aIn[i  ] + bIn[i  ];
      out[i+1] = aIn[i+1] + bIn[i+1];
      out[i+2] = aIn[i+2] + bIn[i+2];
      out[i+3] = aIn[i+3] + bIn[i+3];
      out[i+4] = aIn[i+4] + bIn[i+4];
      out[i+5] = aIn[i+5] + bIn[i+5];
      out[i+6] = aIn[i+6] + bIn[i+6];
      out[i+7] = aIn[i+7] + bIn[i+7];
    }
  };
  bopFunc["+"].ak = function(inNumSamples) {
    var out = this.outputs[0];
    var aIn = this.inputs[0], b = this._b;
    var nextB  = this.inputs[1][0];
    var b_slope = (nextB - this._b) * this.rate.slopeFactor;
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = aIn[i  ] + b; b += b_slope;
      out[i+1] = aIn[i+1] + b; b += b_slope;
      out[i+2] = aIn[i+2] + b; b += b_slope;
      out[i+3] = aIn[i+3] + b; b += b_slope;
      out[i+4] = aIn[i+4] + b; b += b_slope;
      out[i+5] = aIn[i+5] + b; b += b_slope;
      out[i+6] = aIn[i+6] + b; b += b_slope;
      out[i+7] = aIn[i+7] + b; b += b_slope;
    }
    this._b = nextB;
  };
  bopFunc["+"].ai = function(inNumSamples) {
    var out = this.outputs[0];
    var aIn = this.inputs[0], b = this._b;
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = aIn[i  ] + b;
      out[i+1] = aIn[i+1] + b;
      out[i+2] = aIn[i+2] + b;
      out[i+3] = aIn[i+3] + b;
      out[i+4] = aIn[i+4] + b;
      out[i+5] = aIn[i+5] + b;
      out[i+6] = aIn[i+6] + b;
      out[i+7] = aIn[i+7] + b;
    }
  };
  bopFunc["+"].ka = function(inNumSamples) {
    var out = this.outputs[0];
    var a = this._a, bIn = this.inputs[1];
    var nextA  = this.inputs[0][0];
    var a_slope = (nextA - this._a) * this.rate.slopeFactor;
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = a + bIn[i  ]; a += a_slope;
      out[i+1] = a + bIn[i+1]; a += a_slope;
      out[i+2] = a + bIn[i+2]; a += a_slope;
      out[i+3] = a + bIn[i+3]; a += a_slope;
      out[i+4] = a + bIn[i+4]; a += a_slope;
      out[i+5] = a + bIn[i+5]; a += a_slope;
      out[i+6] = a + bIn[i+6]; a += a_slope;
      out[i+7] = a + bIn[i+7]; a += a_slope;
    }
    this._a = nextA;
  };
  bopFunc["+"].kk = function() {
    this.outputs[0][0] = this.inputs[0][0] + this.inputs[1][0];
  };
  bopFunc["+"].ia = function(inNumSamples) {
    var out = this.outputs[0];
    var a = this._a, bIn = this.inputs[1];
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = a + bIn[i  ];
      out[i+1] = a + bIn[i+1];
      out[i+2] = a + bIn[i+2];
      out[i+3] = a + bIn[i+3];
      out[i+4] = a + bIn[i+4];
      out[i+5] = a + bIn[i+5];
      out[i+6] = a + bIn[i+6];
      out[i+7] = a + bIn[i+7];
    }
  };
  
  bopFunc["-"] = function(a, b) {
    return a - b;
  };
  bopFunc["-"].aa = function(inNumSamples) {
    var out = this.outputs[0];
    var aIn = this.inputs[0], bIn = this.inputs[1];
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = aIn[i  ] - bIn[i  ];
      out[i+1] = aIn[i+1] - bIn[i+1];
      out[i+2] = aIn[i+2] - bIn[i+2];
      out[i+3] = aIn[i+3] - bIn[i+3];
      out[i+4] = aIn[i+4] - bIn[i+4];
      out[i+5] = aIn[i+5] - bIn[i+5];
      out[i+6] = aIn[i+6] - bIn[i+6];
      out[i+7] = aIn[i+7] - bIn[i+7];
    }
  };
  bopFunc["-"].ak = function(inNumSamples) {
    var out = this.outputs[0];
    var aIn = this.inputs[0], b = this._b;
    var nextB  = this.inputs[1][0];
    var b_slope = (nextB - this._b) * this.rate.slopeFactor;
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = aIn[i  ] - b; b += b_slope;
      out[i+1] = aIn[i+1] - b; b += b_slope;
      out[i+2] = aIn[i+2] - b; b += b_slope;
      out[i+3] = aIn[i+3] - b; b += b_slope;
      out[i+4] = aIn[i+4] - b; b += b_slope;
      out[i+5] = aIn[i+5] - b; b += b_slope;
      out[i+6] = aIn[i+6] - b; b += b_slope;
      out[i+7] = aIn[i+7] - b; b += b_slope;
    }
    this._b = nextB;
  };
  bopFunc["-"].ai = function(inNumSamples) {
    var out = this.outputs[0];
    var aIn = this.inputs[0], b = this._b;
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = aIn[i  ] - b;
      out[i+1] = aIn[i+1] - b;
      out[i+2] = aIn[i+2] - b;
      out[i+3] = aIn[i+3] - b;
      out[i+4] = aIn[i+4] - b;
      out[i+5] = aIn[i+5] - b;
      out[i+6] = aIn[i+6] - b;
      out[i+7] = aIn[i+7] - b;
    }
  };
  bopFunc["-"].ka = function(inNumSamples) {
    var out = this.outputs[0];
    var a = this._a, bIn = this.inputs[1];
    var nextA  = this.inputs[0][0];
    var a_slope = (nextA - this._a) * this.rate.slopeFactor;
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = a - bIn[i  ]; a += a_slope;
      out[i+1] = a - bIn[i+1]; a += a_slope;
      out[i+2] = a - bIn[i+2]; a += a_slope;
      out[i+3] = a - bIn[i+3]; a += a_slope;
      out[i+4] = a - bIn[i+4]; a += a_slope;
      out[i+5] = a - bIn[i+5]; a += a_slope;
      out[i+6] = a - bIn[i+6]; a += a_slope;
      out[i+7] = a - bIn[i+7]; a += a_slope;
    }
    this._a = nextA;
  };
  bopFunc["-"].kk = function() {
    this.outputs[0][0] = this.inputs[0][0] - this.inputs[1][0];
  };
  bopFunc["-"].ia = function(inNumSamples) {
    var out = this.outputs[0];
    var a = this._a, bIn = this.inputs[1];
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = a - bIn[i  ];
      out[i+1] = a - bIn[i+1];
      out[i+2] = a - bIn[i+2];
      out[i+3] = a - bIn[i+3];
      out[i+4] = a - bIn[i+4];
      out[i+5] = a - bIn[i+5];
      out[i+6] = a - bIn[i+6];
      out[i+7] = a - bIn[i+7];
    }
  };

  bopFunc["*"] = function(a, b) {
    return a * b;
  };
  bopFunc["*"].aa = function(inNumSamples) {
    var out = this.outputs[0];
    var aIn = this.inputs[0], bIn = this.inputs[1];
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = aIn[i  ] * bIn[i  ];
      out[i+1] = aIn[i+1] * bIn[i+1];
      out[i+2] = aIn[i+2] * bIn[i+2];
      out[i+3] = aIn[i+3] * bIn[i+3];
      out[i+4] = aIn[i+4] * bIn[i+4];
      out[i+5] = aIn[i+5] * bIn[i+5];
      out[i+6] = aIn[i+6] * bIn[i+6];
      out[i+7] = aIn[i+7] * bIn[i+7];
    }
  };
  bopFunc["*"].ak = function(inNumSamples) {
    var out = this.outputs[0];
    var aIn = this.inputs[0], b = this._b;
    var nextB  = this.inputs[1][0];
    var b_slope = (nextB - this._b) * this.rate.slopeFactor;
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = aIn[i  ] * b; b += b_slope;
      out[i+1] = aIn[i+1] * b; b += b_slope;
      out[i+2] = aIn[i+2] * b; b += b_slope;
      out[i+3] = aIn[i+3] * b; b += b_slope;
      out[i+4] = aIn[i+4] * b; b += b_slope;
      out[i+5] = aIn[i+5] * b; b += b_slope;
      out[i+6] = aIn[i+6] * b; b += b_slope;
      out[i+7] = aIn[i+7] * b; b += b_slope;
    }
    this._b = nextB;
  };
  bopFunc["*"].ai = function(inNumSamples) {
    var out = this.outputs[0];
    var aIn = this.inputs[0], b = this._b;
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = aIn[i  ] * b;
      out[i+1] = aIn[i+1] * b;
      out[i+2] = aIn[i+2] * b;
      out[i+3] = aIn[i+3] * b;
      out[i+4] = aIn[i+4] * b;
      out[i+5] = aIn[i+5] * b;
      out[i+6] = aIn[i+6] * b;
      out[i+7] = aIn[i+7] * b;
    }
  };
  bopFunc["*"].ka = function(inNumSamples) {
    var out = this.outputs[0];
    var a = this._a, bIn = this.inputs[1];
    var nextA  = this.inputs[0][0];
    var a_slope = (nextA - this._a) * this.rate.slopeFactor;
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = a * bIn[i  ]; a += a_slope;
      out[i+1] = a * bIn[i+1]; a += a_slope;
      out[i+2] = a * bIn[i+2]; a += a_slope;
      out[i+3] = a * bIn[i+3]; a += a_slope;
      out[i+4] = a * bIn[i+4]; a += a_slope;
      out[i+5] = a * bIn[i+5]; a += a_slope;
      out[i+6] = a * bIn[i+6]; a += a_slope;
      out[i+7] = a * bIn[i+7]; a += a_slope;
    }
    this._a = nextA;
  };
  bopFunc["*"].kk = function() {
    this.outputs[0][0] = this.inputs[0][0] * this.inputs[1][0];
  };
  bopFunc["*"].ia = function(inNumSamples) {
    var out = this.outputs[0];
    var a = this._a, bIn = this.inputs[1];
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = a * bIn[i  ];
      out[i+1] = a * bIn[i+1];
      out[i+2] = a * bIn[i+2];
      out[i+3] = a * bIn[i+3];
      out[i+4] = a * bIn[i+4];
      out[i+5] = a * bIn[i+5];
      out[i+6] = a * bIn[i+6];
      out[i+7] = a * bIn[i+7];
    }
  };

  bopFunc["/"] = function(a, b) {
    return b === 0 ? 0 : a / b;
  };
  bopFunc["%"] = function(a, b) {
    return b === 0 ? 0 : a % b;
  };

  bopFunc.eq = function(a, b) {
    return a === b ? 1 : 0;
  };
  bopFunc.ne = function(a, b) {
    return a !== b ? 1 : 0;
  };
  bopFunc.lt = function(a, b) {
    return a < b ? 1 : 0;
  };
  bopFunc.gt = function(a, b) {
    return a > b ? 1 : 0;
  };
  bopFunc.le = function(a, b) {
    return a <= b ? 1 : 0;
  };
  bopFunc.ge = function(a, b) {
    return a >= b ? 1 : 0;
  };
  bopFunc.bitAnd = function(a, b) {
    return a & b;
  };
  bopFunc.bitOr = function(a, b) {
    return a | b;
  };
  bopFunc.bitXor = function(a, b) {
    return a ^ b;
  };
  bopFunc.min = function(a, b) {
    return Math.min(a, b);
  };
  bopFunc.max = function(a, b) {
    return Math.max(a, b);
  };
  var gcd = function(a, b, t) {
    a = a|0; b = b|0;
    while (b !== 0) {
      t = a % b; a = b; b = t;
    }
    return Math.abs(a);
  };
  bopFunc.lcm = function(a, b) {
    if (a === 0 && b === 0) {
      return 0;
    }
    return Math.abs(a * b) / gcd(a, b);
  };
  bopFunc.gcd = function(a, b) {
    return gcd(a, b);
  };
  bopFunc.round = function(a, b) {
    return b === 0 ? a : Math.round(a / b) * b;
  };
  bopFunc.roundUp = function(a, b) {
    return b === 0 ? a : Math.ceil(a / b) * b;
  };
  bopFunc.roundDown = function(a, b) {
    return b === 0 ? a : Math.floor(a / b) * b;
  };
  bopFunc.trunc = function(a, b) {
    return b === 0 ? a : Math.floor(a / b) * b;
  };
  bopFunc.atan2 = function(a, b) {
    return Math.atan2(a, b);
  };
  bopFunc.hypot = function(a, b) {
    return Math.sqrt((a * a) + (b * b));
  };
  bopFunc.hypotApx = function(a, b) {
    var x = Math.abs(a), y = Math.abs(b);
    var minxy = Math.min(x, y);
    return x + y - (Math.sqrt(2) - 1) * minxy;
  };
  bopFunc.pow = function(a, b) {
    return Math.pow(Math.abs(a), b);
  };
  bopFunc.leftShift = function(a, b) {
    if (b < 0) {
      return (a|0) >> (-b|0);
    }
    return (a|0) << (b|0);
  };
  bopFunc.rightShift = function(a, b) {
    if (b < 0) {
      return (a|0) << (-b|0);
    }
    return (a|0) >> (b|0);
  };
  bopFunc.unsignedRightShift = function(a, b) {
    if (b < 0) {
      return (a|0) << (-b|0);
    }
    return (a|0) >> (b|0);
  };
  bopFunc.ring1 = function(a, b) {
    return a * b + a;
  };
  bopFunc.ring2 = function(a, b) {
    return a * b + a + b;
  };
  bopFunc.ring3 = function(a, b) {
    return a * a * b;
  };
  bopFunc.ring4 = function(a, b) {
    return a * a * b - a * b * b;
  };
  bopFunc.difsqr = function(a, b) {
    return a * a - b * b;
  };
  bopFunc.sumsqr = function(a, b) {
    return a * a + b * b;
  };
  bopFunc.sqrsum = function(a, b) {
    return (a + b) * (a + b);
  };
  bopFunc.sqrdif = function(a, b) {
    return (a - b) * (a - b);
  };
  bopFunc.absdif = function(a, b) {
    return Math.abs(a - b);
  };
  bopFunc.thresh = function(a, b) {
    return a < b ? 0 : a;
  };
  bopFunc.amclip = function(a, b) {
    return a * 0.5 * (b + Math.abs(b));
  };
  bopFunc.scaleneg = function(a, b) {
    b = 0.5 * b + 0.5;
    return (Math.abs(a) - a) * b + a;
  };
  bopFunc.clip2 = function(a, b) {
    return Math.max(-b, Math.min(a, b));
  };
  bopFunc.excess = function(a, b) {
    return a - Math.max(-b, Math.min(a, b));
  };
  bopFunc.fold2 = function(val, hi) {
    var x, range1, range2;
    if (hi === 0) {
      return 0;
    }
    range1 = hi + hi;
    if (val >= hi) {
      val = range1 - val;
      if (val >= -hi) {
        return val;
      }
    } else if (val < -hi) {
      val = -range1 - val;
      if (val < hi) {
        return val;
      }
    } else {
      return val;
    }
    
    range2 = range1 + range1;
    x = val + hi;
    x -= range2 * Math.floor(x / range2);
    if (x >= range1) {
      return range2 - x - hi;
    }
    return x - hi;
  };
  bopFunc.wrap2 = function(val, hi) {
    if (hi === 0) {
      return 0;
    }
    var range = hi * 2;
    if (val >= hi) {
      val -= range;
      if (val < hi) {
        return val;
      }
    } else if (val < -hi) {
      val += range;
      if (val >= -hi) {
        return val;
      }
    } else {
      return val;
    }
    return val - range * Math.floor((val + hi) / range);
  };
  
  
  Object.keys(bopFunc).forEach(function(key) {
    var func = bopFunc[key];
    if (!func.aa) {
      func.aa = binary_aa(func);
    }
    if (!func.ak) {
      func.ak = binary_ak(func);
    }
    if (!func.ai) {
      func.ai = binary_ai(func);
    }
    if (!func.ka) {
      func.ka = binary_ka(func);
    }
    if (!func.kk) {
      func.kk = binary_kk(func);
    }
    if (!func.ia) {
      func.ia = binary_ia(func);
    }
    func.ki = func.kk;
    func.ik = func.kk;
    func.dd = binary_dd(func);
  });
  
  cc.unit.specs.Control = (function() {
    var ctor = function() {
      if (this.numOfOutputs === 1) {
        this.process = next_1;
      } else {
        this.process = next_k;
      }
      this.process(1);
    };
    var next_1 = function() {
      this.outputs[0][0] = this.parent.controls[this.specialIndex];
    };
    var next_k = function() {
      var controls = this.parent.controls;
      var outputs  = this.outputs;
      var numChannels = outputs.length;
      for (var i = 0, j = this.specialIndex; i < numChannels; ++i, ++j) {
        outputs[i][0] = controls[j];
      }
    };
    return ctor;
  })();
  
  cc.unit.specs.LagControl = (function() {
    var ctor = function() {
      if (this.numOfOutputs === 1) {
        this.process = next_1;
      } else {
        this.process = next_k;
      }
      var numChannels = this.numOfOutputs;
      var y1 = this._y1 = new Float32Array(numChannels);
      var b1 = this._b1 = new Float32Array(numChannels);
      var controls = this.parent.controls;
      var inputs   = this.inputs;
      var sampleRate = this.rate.sampleRate;
      var lag;
      for (var i = 0; i < numChannels; ++i) {
        y1[i] = controls[i];
        lag   = inputs[i][0];
        b1[i] = lag === 0 ? 0 : Math.exp(log001 / (lag * sampleRate));
      }
      this.process(1);
    };
    var next_1 = function() {
      var y1 = this._y1;
      var b1 = this._b1;
      var z = this.parent.controls[this.specialIndex];
      var x = z + b1[0] * (y1[0] - z);
      this.outputs[0][0] = y1[0] = x;
    };
    var next_k = function() {
      var controls = this.parent.controls;
      var outputs  = this.outputs;
      var numChannels = this.outputs.length;
      var y1 = this._y1;
      var b1 = this._b1;
      var z, x, i, j;
      for (i = 0, j = this.specialIndex; i < numChannels; ++i, ++j) {
        z = controls[j];
        x = z + b1[i] * (y1[i] - z);
        outputs[i][0] = y1[i] = x;
      }
    };
    return ctor;
  })();
  
  cc.unit.specs.TrigControl = (function() {
    var ctor = function() {
      if (this.numOfOutputs === 1) {
        this.process = next_1;
      } else {
        this.process = next_k;
      }
      this.process(1);
    };
    var next_1 = function() {
      var controls     = this.parent.controls;
      var specialIndex = this.specialIndex;
      this.outputs[0][0] = controls[specialIndex];
      controls[specialIndex] = 0;
    };
    var next_k = function() {
      var controls = this.parent.controls;
      var outputs  = this.outputs;
      var numChannels = outputs.length;
      for (var i = 0, j = this.specialIndex; i < numChannels; ++i, ++j) {
        outputs[i][0] = controls[j];
        controls[j] = 0;
      }
    };
    return ctor;
  })();
  
  cc.unit.specs.Out = (function() {
    var ctor = function() {
      if (this.calcRate === 2) {
        this.process = next_a;
        this._busOffset = 0;
      } else {
        this.process = next_k;
        this._busOffset = this.bufLength * 16;
      }
    };
    var next_a = function(inNumSamples, instance) {
      var inputs = this.inputs;
      var bus    = instance.bus;
      var bufLength = this.bufLength;
      var offset, _in;
      var fbusChannel = (inputs[0][0]|0) - 1;
      for (var i = 1, imax = inputs.length; i < imax; ++i) {
        offset = (fbusChannel + i) * bufLength;
        _in = inputs[i];
        for (var j = 0; j < inNumSamples; j++) {
          bus[offset + j] += _in[j];
        }
      }
    };
    var next_k = function(inNumSamples, instance) {
      var inputs = this.inputs;
      var bus    = instance.bus;
      var offset    = this._busOffset + (inputs[0][0]|0) - 1;
      for (var i = 1, imax = inputs.length; i < imax; ++i) {
        bus[offset + i] += inputs[i][0];
      }
    };
    return ctor;
  })();

  cc.unit.specs.MulAdd = (function() {
    var ctor = function() {
      if (this.calcRate === 3) {
        this.process = next[3];
      } else {
        var rates = this.inRates;
        this.process = next[rates[0]][rates[1]][rates[2]];
        this._in  = this.inputs[0][0];
        this._mul = this.inputs[1][0];
        this._add = this.inputs[2][0];
        if (this.process) {
          this.process(1);
        } else {
          this.outputs[0][0] = this._in * this._mul + this._add;
        }
      }
    };
    
    var next = {};
    next[2] = {};
    next[2][2] = {};
    next[2][1] = {};
    next[2][0] = {};
    next[1] = {};
    next[1][2] = {};
    next[1][1] = {};
    next[1][0] = {};
    next[0] = {};
    next[0][2] = {};
    next[0][1] = {};
    next[0][0] = {};

    next[2][2][2] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn  = this.inputs[0];
      var mulIn = this.inputs[1];
      var addIn = this.inputs[2];
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn[i  ] * mulIn[i  ] + addIn[i  ];
        out[i+1] = inIn[i+1] * mulIn[i+1] + addIn[i+1];
        out[i+2] = inIn[i+2] * mulIn[i+2] + addIn[i+2];
        out[i+3] = inIn[i+3] * mulIn[i+3] + addIn[i+3];
        out[i+4] = inIn[i+4] * mulIn[i+4] + addIn[i+4];
        out[i+5] = inIn[i+5] * mulIn[i+5] + addIn[i+5];
        out[i+6] = inIn[i+6] * mulIn[i+6] + addIn[i+6];
        out[i+7] = inIn[i+7] * mulIn[i+7] + addIn[i+7];
      }
    };
    next[2][2][1] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn  = this.inputs[0];
      var mulIn = this.inputs[1];
      var add = this._add;
      var nextAdd = this.inputs[2][0];
      var add_slope = (nextAdd - add) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn[i  ] * mulIn[i  ] + add; add += add_slope;
        out[i+1] = inIn[i+1] * mulIn[i+1] + add; add += add_slope;
        out[i+2] = inIn[i+2] * mulIn[i+2] + add; add += add_slope;
        out[i+3] = inIn[i+3] * mulIn[i+3] + add; add += add_slope;
        out[i+4] = inIn[i+4] * mulIn[i+4] + add; add += add_slope;
        out[i+5] = inIn[i+5] * mulIn[i+5] + add; add += add_slope;
        out[i+6] = inIn[i+6] * mulIn[i+6] + add; add += add_slope;
        out[i+7] = inIn[i+7] * mulIn[i+7] + add; add += add_slope;
      }
      this._add = nextAdd;
    };
    next[2][2][0] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn  = this.inputs[0];
      var mulIn = this.inputs[1];
      var add = this._add;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn[i  ] * mulIn[i  ] + add;
        out[i+1] = inIn[i+1] * mulIn[i+1] + add;
        out[i+2] = inIn[i+2] * mulIn[i+2] + add;
        out[i+3] = inIn[i+3] * mulIn[i+3] + add;
        out[i+4] = inIn[i+4] * mulIn[i+4] + add;
        out[i+5] = inIn[i+5] * mulIn[i+5] + add;
        out[i+6] = inIn[i+6] * mulIn[i+6] + add;
        out[i+7] = inIn[i+7] * mulIn[i+7] + add;
      }
    };
    next[2][1][2] = function(inNumSamples) {
      var out   = this.outputs[0];
      var inIn  = this.inputs[0];
      var mul   = this._mul;
      var addIn = this.inputs[2];
      var nextMul = this.inputs[1][0];
      var mul_slope = (nextMul - mul) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn[i  ] * mul + addIn[i  ]; mul += mul_slope;
        out[i+1] = inIn[i+1] * mul + addIn[i+1]; mul += mul_slope;
        out[i+2] = inIn[i+2] * mul + addIn[i+2]; mul += mul_slope;
        out[i+3] = inIn[i+3] * mul + addIn[i+3]; mul += mul_slope;
        out[i+4] = inIn[i+4] * mul + addIn[i+4]; mul += mul_slope;
        out[i+5] = inIn[i+5] * mul + addIn[i+5]; mul += mul_slope;
        out[i+6] = inIn[i+6] * mul + addIn[i+6]; mul += mul_slope;
        out[i+7] = inIn[i+7] * mul + addIn[i+7]; mul += mul_slope;
      }
      this._mul = nextMul;
    };
    next[2][1][1] = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var mul  = this._mul;
      var add  = this._add;
      var nextMul = this.inputs[1][0];
      var mul_slope = (nextMul - mul) * this.rate.slopeFactor;
      var nextAdd = this.inputs[2][0];
      var add_slope = (nextAdd - add) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn[i  ] * mul + add; mul += mul_slope; add += add_slope;
        out[i+1] = inIn[i+1] * mul + add; mul += mul_slope; add += add_slope;
        out[i+2] = inIn[i+2] * mul + add; mul += mul_slope; add += add_slope;
        out[i+3] = inIn[i+3] * mul + add; mul += mul_slope; add += add_slope;
        out[i+4] = inIn[i+4] * mul + add; mul += mul_slope; add += add_slope;
        out[i+5] = inIn[i+5] * mul + add; mul += mul_slope; add += add_slope;
        out[i+6] = inIn[i+6] * mul + add; mul += mul_slope; add += add_slope;
        out[i+7] = inIn[i+7] * mul + add; mul += mul_slope; add += add_slope;
      }
      this._mul = nextMul;
      this._add = nextAdd;
    };
    next[2][1][0] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn  = this.inputs[0];
      var mul   = this._mul;
      var add = this._add;
      var nextMul = this.inputs[1][0];
      var mul_slope = (nextMul - mul) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn[i  ] * mul + add; mul += mul_slope;
        out[i+1] = inIn[i+1] * mul + add; mul += mul_slope;
        out[i+2] = inIn[i+2] * mul + add; mul += mul_slope;
        out[i+3] = inIn[i+3] * mul + add; mul += mul_slope;
        out[i+4] = inIn[i+4] * mul + add; mul += mul_slope;
        out[i+5] = inIn[i+5] * mul + add; mul += mul_slope;
        out[i+6] = inIn[i+6] * mul + add; mul += mul_slope;
        out[i+7] = inIn[i+7] * mul + add; mul += mul_slope;
      }
      this._mul = nextMul;
    };
    next[2][0][2] = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var mul  = this._mul;
      var addIn = this.inputs[2];
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn[i  ] * mul + addIn[i  ];
        out[i+1] = inIn[i+1] * mul + addIn[i+1];
        out[i+2] = inIn[i+2] * mul + addIn[i+2];
        out[i+3] = inIn[i+3] * mul + addIn[i+3];
        out[i+4] = inIn[i+4] * mul + addIn[i+4];
        out[i+5] = inIn[i+5] * mul + addIn[i+5];
        out[i+6] = inIn[i+6] * mul + addIn[i+6];
        out[i+7] = inIn[i+7] * mul + addIn[i+7];
      }
    };
    next[2][0][1] = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var mul  = this._mul;
      var add  = this._add;
      var nextAdd = this.inputs[2][0];
      var add_slope = (nextAdd - add) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn[i  ] * mul + add; add += add_slope;
        out[i+1] = inIn[i+1] * mul + add; add += add_slope;
        out[i+2] = inIn[i+2] * mul + add; add += add_slope;
        out[i+3] = inIn[i+3] * mul + add; add += add_slope;
        out[i+4] = inIn[i+4] * mul + add; add += add_slope;
        out[i+5] = inIn[i+5] * mul + add; add += add_slope;
        out[i+6] = inIn[i+6] * mul + add; add += add_slope;
        out[i+7] = inIn[i+7] * mul + add; add += add_slope;
      }
      this._add = nextAdd;
    };
    next[2][0][0] = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var mul  = this._mul;
      var add  = this._add;
      var nextMul = this.inputs[1][0];
      var mul_slope = (nextMul - mul) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn[i  ] * mul + add; mul += mul_slope;
        out[i+1] = inIn[i+1] * mul + add; mul += mul_slope;
        out[i+2] = inIn[i+2] * mul + add; mul += mul_slope;
        out[i+3] = inIn[i+3] * mul + add; mul += mul_slope;
        out[i+4] = inIn[i+4] * mul + add; mul += mul_slope;
        out[i+5] = inIn[i+5] * mul + add; mul += mul_slope;
        out[i+6] = inIn[i+6] * mul + add; mul += mul_slope;
        out[i+7] = inIn[i+7] * mul + add; mul += mul_slope;
      }
      this._mul = nextMul;
    };
    next[1][1][2] = function(inNumSamples) {
      var out   = this.outputs[0];
      var _in   = this._in;
      var mul   = this._mul;
      var addIn = this.inputs[2];
      var nextIn = this.inputs[0][0];
      var in_slope = (nextIn - _in) * this.rate.slopeFactor;
      var nextMul = this.inputs[1][0];
      var mul_slope = (nextMul - mul) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = _in * mul + addIn[i  ]; _in += in_slope; mul += mul_slope;
        out[i+1] = _in * mul + addIn[i+1]; _in += in_slope; mul += mul_slope;
        out[i+2] = _in * mul + addIn[i+2]; _in += in_slope; mul += mul_slope;
        out[i+3] = _in * mul + addIn[i+3]; _in += in_slope; mul += mul_slope;
        out[i+4] = _in * mul + addIn[i+4]; _in += in_slope; mul += mul_slope;
        out[i+5] = _in * mul + addIn[i+5]; _in += in_slope; mul += mul_slope;
        out[i+6] = _in * mul + addIn[i+6]; _in += in_slope; mul += mul_slope;
        out[i+7] = _in * mul + addIn[i+7]; _in += in_slope; mul += mul_slope;
      }
      this._in  = nextIn;
      this._mul = nextMul;
    };
    next[1][1][1] = function() {
      this.outputs[0][0] = this.inputs[0][0] * this.inputs[1][0] + this.inputs[2][0];
    };
    next[1][1][0] = function() {
      this.outputs[0][0] = this.inputs[0][0] * this.inputs[1][0] + this._add;
    };
    next[1][0][2] = function(inNumSamples) {
      var out = this.outputs[0];
      var _in   = this._in;
      var mul   = this._mul;
      var addIn = this.inputs[2];
      var nextIn = this.inputs[0][0];
      var in_slope = (nextIn - _in) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = _in * mul + addIn[i  ]; _in += in_slope;
        out[i+1] = _in * mul + addIn[i+1]; _in += in_slope;
        out[i+2] = _in * mul + addIn[i+2]; _in += in_slope;
        out[i+3] = _in * mul + addIn[i+3]; _in += in_slope;
        out[i+4] = _in * mul + addIn[i+4]; _in += in_slope;
        out[i+5] = _in * mul + addIn[i+5]; _in += in_slope;
        out[i+6] = _in * mul + addIn[i+6]; _in += in_slope;
        out[i+7] = _in * mul + addIn[i+7]; _in += in_slope;
      }
      this._in  = nextIn;
    };
    next[1][0][1] = function() {
      this.outputs[0][0] = this.inputs[0][0] * this._mul + this.inputs[2][0];
    };
    next[1][0][0] = function() {
      this.outputs[0][0] = this.inputs[0][0] * this._mul + this._add;
    };
    next[3] = function(inNumSamples) {
      if (inNumSamples) {
        var a = calcDemandInput(this, 0, inNumSamples);
        var b = calcDemandInput(this, 1, inNumSamples);
        var c = calcDemandInput(this, 2, inNumSamples);
        this.outputs[0][0] = isNaN(a) || isNaN(b) || isNaN(c) ? NaN : (a * b) + c;
      } else {
        resetDemandInput(this, 0);
        resetDemandInput(this, 1);
        resetDemandInput(this, 2);
      }
    };
    
    return ctor;
  })();

  cc.unit.specs.Sum3 = (function() {
    var ctor = function() {
      if (this.calcRate === 3) {
        this.process = next[3];
      } else {
        var rates = this.inRates;
        this.process = next[rates[0]][rates[1]][rates[2]];
        this._in0 = this.inputs[0][0];
        this._in1 = this.inputs[1][0];
        this._in2 = this.inputs[2][0];
        if (this.process) {
          this.process(1);
        } else {
          this.outputs[0][0] = this._in0 + this._in1 + this._in2;
        }
      }
    };
    
    var next = {};
    next[2] = {};
    next[2][2] = {};
    next[2][1] = {};
    next[2][0] = {};
    next[1] = {};
    next[1][1] = {};
    next[1][0] = {};
    next[0] = {};
    next[0][0] = {};

    next[2][2][2] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var inIn2 = this.inputs[2];
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn0[i  ] + inIn1[i  ] + inIn2[i  ];
        out[i+1] = inIn0[i+1] + inIn1[i+1] + inIn2[i+1];
        out[i+2] = inIn0[i+2] + inIn1[i+2] + inIn2[i+2];
        out[i+3] = inIn0[i+3] + inIn1[i+3] + inIn2[i+3];
        out[i+4] = inIn0[i+4] + inIn1[i+4] + inIn2[i+4];
        out[i+5] = inIn0[i+5] + inIn1[i+5] + inIn2[i+5];
        out[i+6] = inIn0[i+6] + inIn1[i+6] + inIn2[i+6];
        out[i+7] = inIn0[i+7] + inIn1[i+7] + inIn2[i+7];
      }
    };
    next[2][2][1] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var in2   = this._in2;
      var nextIn2 = this.inputs[2][0];
      var in2_slope = (nextIn2 - in2) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn0[i  ] + inIn1[i  ] + in2; in2 += in2_slope;
        out[i+1] = inIn0[i+1] + inIn1[i+1] + in2; in2 += in2_slope;
        out[i+2] = inIn0[i+2] + inIn1[i+2] + in2; in2 += in2_slope;
        out[i+3] = inIn0[i+3] + inIn1[i+3] + in2; in2 += in2_slope;
        out[i+4] = inIn0[i+4] + inIn1[i+4] + in2; in2 += in2_slope;
        out[i+5] = inIn0[i+5] + inIn1[i+5] + in2; in2 += in2_slope;
        out[i+6] = inIn0[i+6] + inIn1[i+6] + in2; in2 += in2_slope;
        out[i+7] = inIn0[i+7] + inIn1[i+7] + in2; in2 += in2_slope;
      }
      this._in2 = nextIn2;
    };
    next[2][2][0] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var in2   = this._in2;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn0[i  ] + inIn1[i  ] + in2;
        out[i+1] = inIn0[i+1] + inIn1[i+1] + in2;
        out[i+2] = inIn0[i+2] + inIn1[i+2] + in2;
        out[i+3] = inIn0[i+3] + inIn1[i+3] + in2;
        out[i+4] = inIn0[i+4] + inIn1[i+4] + in2;
        out[i+5] = inIn0[i+5] + inIn1[i+5] + in2;
        out[i+6] = inIn0[i+6] + inIn1[i+6] + in2;
        out[i+7] = inIn0[i+7] + inIn1[i+7] + in2;
      }
    };
    next[2][1][1] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn0 = this.inputs[0];
      var in12  = this._in1 + this._in2;
      var nextIn12 = this.inputs[1][0] + this.inputs[2][0];
      var in12_slope = (nextIn12 - in12) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn0[i  ] + in12; in12 += in12_slope;
        out[i+1] = inIn0[i+1] + in12; in12 += in12_slope;
        out[i+2] = inIn0[i+2] + in12; in12 += in12_slope;
        out[i+3] = inIn0[i+3] + in12; in12 += in12_slope;
        out[i+4] = inIn0[i+4] + in12; in12 += in12_slope;
        out[i+5] = inIn0[i+5] + in12; in12 += in12_slope;
        out[i+6] = inIn0[i+6] + in12; in12 += in12_slope;
        out[i+7] = inIn0[i+7] + in12; in12 += in12_slope;
      }
      this._in1 = this.inputs[1][0];
      this._in2 = this.inputs[2][0];
    };
    next[2][1][0] = next[2][1][1];
    next[2][0][0] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn0 = this.inputs[0];
      var in12  = this._in1 + this._in2;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn0[i  ] + in12;
        out[i+1] = inIn0[i+1] + in12;
        out[i+2] = inIn0[i+2] + in12;
        out[i+3] = inIn0[i+3] + in12;
        out[i+4] = inIn0[i+4] + in12;
        out[i+5] = inIn0[i+5] + in12;
        out[i+6] = inIn0[i+6] + in12;
        out[i+7] = inIn0[i+7] + in12;
      }
    };
    next[1][1][1] = function() {
      this.outputs[0][0] = this.inputs[0][0] + this.inputs[1][0] + this.inputs[2][0];
    };
    next[1][1][0] = next[1][1][1];
    next[1][0][0] = next[1][1][1];

    next[3] = function(inNumSamples) {
      if (inNumSamples) {
        var a = calcDemandInput(this, 0, inNumSamples);
        var b = calcDemandInput(this, 1, inNumSamples);
        var c = calcDemandInput(this, 2, inNumSamples);
        this.outputs[0][0] = isNaN(a) || isNaN(b) || isNaN(c) ? NaN : (a + b + c);
      } else {
        resetDemandInput(this, 0);
        resetDemandInput(this, 1);
        resetDemandInput(this, 2);
      }
    };
    
    return ctor;
  })();
  
  cc.unit.specs.Sum4 = (function() {
    var ctor = function() {
      if (this.calcRate === 3) {
        this.process = next[3];
      } else {
        var rates = this.inRates;
        this.process = next[rates[0]][rates[1]][rates[2]][rates[3]];
        this._in0 = this.inputs[0][0];
        this._in1 = this.inputs[1][0];
        this._in2 = this.inputs[2][0];
        this._in3 = this.inputs[3][0];
        if (this.process) {
          this.process(1);
        } else {
          this.outputs[0][0] = this._in0 + this._in1 + this._in2 + this._in3;
        }
      }
    };

    var next = {};
    next[2] = {};
    next[2][2] = {};
    next[2][2][2] = {};
    next[2][2][1] = {};
    next[2][2][0] = {};
    next[2][1] = {};
    next[2][1][1] = {};
    next[2][1][0] = {};
    next[2][0] = {};
    next[2][0][0] = {};
    next[1] = {};
    next[1][1] = {};
    next[1][1][1] = {};
    next[1][1][0] = {};
    next[1][0] = {};
    next[1][0][0] = {};
    next[0] = {};
    next[0][0] = {};
    next[0][0][0] = {};
    
    next[2][2][2][2] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var inIn2 = this.inputs[2];
      var inIn3 = this.inputs[3];
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn0[i  ] + inIn1[i  ] + inIn2[i  ] + inIn3[i  ];
        out[i+1] = inIn0[i+1] + inIn1[i+1] + inIn2[i+1] + inIn3[i+1];
        out[i+2] = inIn0[i+2] + inIn1[i+2] + inIn2[i+2] + inIn3[i+2];
        out[i+3] = inIn0[i+3] + inIn1[i+3] + inIn2[i+3] + inIn3[i+3];
        out[i+4] = inIn0[i+4] + inIn1[i+4] + inIn2[i+4] + inIn3[i+4];
        out[i+5] = inIn0[i+5] + inIn1[i+5] + inIn2[i+5] + inIn3[i+5];
        out[i+6] = inIn0[i+6] + inIn1[i+6] + inIn2[i+6] + inIn3[i+6];
        out[i+7] = inIn0[i+7] + inIn1[i+7] + inIn2[i+7] + inIn3[i+7];
      }
    };
    next[2][2][2][1] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var inIn2 = this.inputs[2];
      var in3   = this._in3;
      var nextIn3 = this.inputs[3][0];
      var in3_slope = (nextIn3 - in3) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn0[i  ] + inIn1[i  ] + inIn2[i  ] + in3; in3 += in3_slope;
        out[i+1] = inIn0[i+1] + inIn1[i+1] + inIn2[i+1] + in3; in3 += in3_slope;
        out[i+2] = inIn0[i+2] + inIn1[i+2] + inIn2[i+2] + in3; in3 += in3_slope;
        out[i+3] = inIn0[i+3] + inIn1[i+3] + inIn2[i+3] + in3; in3 += in3_slope;
        out[i+4] = inIn0[i+4] + inIn1[i+4] + inIn2[i+4] + in3; in3 += in3_slope;
        out[i+5] = inIn0[i+5] + inIn1[i+5] + inIn2[i+5] + in3; in3 += in3_slope;
        out[i+6] = inIn0[i+6] + inIn1[i+6] + inIn2[i+6] + in3; in3 += in3_slope;
        out[i+7] = inIn0[i+7] + inIn1[i+7] + inIn2[i+7] + in3; in3 += in3_slope;
      }
      this._in3 = nextIn3;
    };
    next[2][2][2][0] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var inIn2 = this.inputs[2];
      var in3   = this._in3;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn0[i  ] + inIn1[i  ] + inIn2[i  ] + in3;
        out[i+1] = inIn0[i+1] + inIn1[i+1] + inIn2[i+1] + in3;
        out[i+2] = inIn0[i+2] + inIn1[i+2] + inIn2[i+2] + in3;
        out[i+3] = inIn0[i+3] + inIn1[i+3] + inIn2[i+3] + in3;
        out[i+4] = inIn0[i+4] + inIn1[i+4] + inIn2[i+4] + in3;
        out[i+5] = inIn0[i+5] + inIn1[i+5] + inIn2[i+5] + in3;
        out[i+6] = inIn0[i+6] + inIn1[i+6] + inIn2[i+6] + in3;
        out[i+7] = inIn0[i+7] + inIn1[i+7] + inIn2[i+7] + in3;
      }
    };
    next[2][2][1][1] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var in23  = this._in2 + this._in3;
      var nextIn23 = this.inputs[2][0] + this.inputs[3][0];
      var in23_slope = (nextIn23 - in23) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn0[i  ] + inIn1[i  ] + in23; in23 += in23_slope;
        out[i+1] = inIn0[i+1] + inIn1[i+1] + in23; in23 += in23_slope;
        out[i+2] = inIn0[i+2] + inIn1[i+2] + in23; in23 += in23_slope;
        out[i+3] = inIn0[i+3] + inIn1[i+3] + in23; in23 += in23_slope;
        out[i+4] = inIn0[i+4] + inIn1[i+4] + in23; in23 += in23_slope;
        out[i+5] = inIn0[i+5] + inIn1[i+5] + in23; in23 += in23_slope;
        out[i+6] = inIn0[i+6] + inIn1[i+6] + in23; in23 += in23_slope;
        out[i+7] = inIn0[i+7] + inIn1[i+7] + in23; in23 += in23_slope;
      }
      this._in2 = this.inputs[2][0];
      this._in3 = this.inputs[2][0];
    };
    next[2][2][1][0] = next[2][2][1][1];
    next[2][2][0][0] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var in23  = this._in2 + this._in3;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn0[i  ] + inIn1[i  ] + in23;
        out[i+1] = inIn0[i+1] + inIn1[i+1] + in23;
        out[i+2] = inIn0[i+2] + inIn1[i+2] + in23;
        out[i+3] = inIn0[i+3] + inIn1[i+3] + in23;
        out[i+4] = inIn0[i+4] + inIn1[i+4] + in23;
        out[i+5] = inIn0[i+5] + inIn1[i+5] + in23;
        out[i+6] = inIn0[i+6] + inIn1[i+6] + in23;
        out[i+7] = inIn0[i+7] + inIn1[i+7] + in23;
      }
    };
    next[2][1][1][1] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn0 = this.inputs[0];
      var in123 = this._in1 + this._in2 + this._in3;
      var nextIn123 = this.inputs[1][0] + this.inputs[2][0] + this.inputs[3][0];
      var in123_slope = (nextIn123 - in123) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn0[i  ] + in123; in123 += in123_slope;
        out[i+1] = inIn0[i+1] + in123; in123 += in123_slope;
        out[i+2] = inIn0[i+2] + in123; in123 += in123_slope;
        out[i+3] = inIn0[i+3] + in123; in123 += in123_slope;
        out[i+4] = inIn0[i+4] + in123; in123 += in123_slope;
        out[i+5] = inIn0[i+5] + in123; in123 += in123_slope;
        out[i+6] = inIn0[i+6] + in123; in123 += in123_slope;
        out[i+7] = inIn0[i+7] + in123; in123 += in123_slope;
      }
      this._in1 = this.inputs[1][0];
      this._in2 = this.inputs[2][0];
      this._in3 = this.inputs[3][0];
    };
    next[2][1][1][0] = next[2][1][1][1];
    next[2][1][0][0] = next[2][1][1][1];
    next[2][0][0][0] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn0 = this.inputs[0];
      var in123 = this._in1 + this._in2 + this._in3;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn0[i  ] + in123;
        out[i+1] = inIn0[i+1] + in123;
        out[i+2] = inIn0[i+2] + in123;
        out[i+3] = inIn0[i+3] + in123;
        out[i+4] = inIn0[i+4] + in123;
        out[i+5] = inIn0[i+5] + in123;
        out[i+6] = inIn0[i+6] + in123;
        out[i+7] = inIn0[i+7] + in123;
      }
    };
    next[1][1][1][1] = function() {
      this.outputs[0][0] = this.inputs[0][0] + this.inputs[1][0] + this.inputs[2][0] + this.inputs[3][0];
    };
    next[1][1][1][0] = next[1][1][1][1];
    next[1][1][0][0] = next[1][1][1][1];
    next[1][0][0][0] = next[1][1][1][1];
    
    next[3] = function(inNumSamples) {
      if (inNumSamples) {
        var a = calcDemandInput(this, 0, inNumSamples);
        var b = calcDemandInput(this, 1, inNumSamples);
        var c = calcDemandInput(this, 2, inNumSamples);
        var d = calcDemandInput(this, 3, inNumSamples);
        this.outputs[0][0] = isNaN(a) || isNaN(b) || isNaN(c) || isNaN(d) ? NaN : (a + b + c + d);
      } else {
        resetDemandInput(this, 0);
        resetDemandInput(this, 1);
        resetDemandInput(this, 2);
        resetDemandInput(this, 3);
      }
    };
    
    return ctor;
  })();
  
  module.exports = {
    uopFunc: uopFunc,
    unary_k: unary_k,
    unary_a: unary_a,
    bopFunc: bopFunc,
    binary_aa: binary_aa,
    binary_ak: binary_ak,
    binary_ai: binary_ai,
    binary_ka: binary_ka,
    binary_kk: binary_kk,
    binary_ia: binary_ia
  };

});
var exports = _require("cc/cc", "cc/loader");
if (typeof module !== "undefined") {
  module.exports = exports;
}
})(this.self||global);
