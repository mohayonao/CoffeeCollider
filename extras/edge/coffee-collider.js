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
        var m = /^(.*\/)coffee-collider(?:-min)?\.js(\#.*)?$/.exec(scripts[i].src);
        if (m) {
          cc.rootPath = m[1];
          cc.coffeeColliderPath = m[0];
          cc.coffeeColliderHash = m[2];
          break;
        }
      }
    }
    if (cc.coffeeColliderHash === "#iframe") {
      cc.opmode  = "iframe";
      cc.context = "lang";
      require("./lang/lang");
      cc.lang = cc.createSynthLang();
    } else if (cc.coffeeColliderHash === "#socket") {
      cc.opmode  = "socket";
      cc.context = "lang";
      require("./lang/lang");
      cc.lang = cc.createSynthLang();
    } else {
      cc.opmode  = "client";
      cc.context = "client";
      require("./client/client");
      global.CoffeeCollider = function(opts) {
        return cc.createSynthClient(opts);
      };
    }
  } else if (typeof WorkerLocation !== "undefined") {
    if (location.hash === "#iframe") {
      cc.opmode  = "iframe";
      cc.context = "server";
      require("./server/server");
      cc.server = cc.createSynthServer();
      cc.server.connect();
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
      return cc.server.client.createServer(opts);
    };
    module.exports = cc.global;
  }

});
define('cc/cc', function(require, exports, module) {
  
  module.exports = {
    version: "0.0.0+20131111110200",
    global : {},
    Object : function CCObject() {}
  };

});
define('cc/lang/lang', function(require, exports, module) {
  
  var cc = require("./cc");
  var pack   = require("../common/pack").pack;
  var commands = {};
  
  var SynthLang = (function() {
    function SynthLang() {
      this.klassName = "SynthLang";
      this.sampleRate = 0;
      this.channels   = 0;
      this.strmLength = 0;
      this.bufLength  = 0;
      this.rootNode   = cc.createGroup();
      this.taskManager   = cc.createTaskManager();
      this.timelineResult  = [];
      this.bufferRequestId = 0;
      this.bufferRequestCallback = {};
      this.phase = 0;

      this.extendCommands(commands);
    }
    
    SynthLang.prototype.sendToClient = function() {
      throw "SynthLang#sendToClient: should be overridden";
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
      throw "SynthLang#sendToServer: should be overridden";
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
      this.taskManager.play((this.bufLength / this.sampleRate) * 1000);
      this.sendToServer(msg);
    };
    SynthLang.prototype.pause = function(msg) {
      this.sendToServer(msg);
    };
    SynthLang.prototype.reset = function(msg) {
      cc.resetBuffer();
      cc.resetNode();
      cc.resetNativeTimers();
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
    var data     = msg[4];
    var callback = msg[5];
    if (!append) {
      this.reset(["/reset"]);
    }
    cc.DATA = data;
    if (cc.global !== global) {
      global.cc = cc.global;
    }
    global.cc.__context__ = this.taskManager.context;
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
  commands["/importScripts"] = function(msg) {
    importScripts(msg[1]);
  };
  commands["/console/log"] = function(msg) {
    this.sendToClient(msg);
  };
  commands["/console/debug"] = function(msg) {
    this.sendToClient(msg);
  };
  commands["/console/info"] = function(msg) {
    this.sendToClient(msg);
  };
  commands["/console/warn"] = function(msg) {
    this.sendToClient(msg);
  };
  commands["/console/error"] = function(msg) {
    this.sendToClient(msg);
  };
  commands["/emit/n_end"] = function(msg) {
    var nodeId = msg[1]|0;
    var n = cc.getNode(nodeId);
    if (n) {
      n.emit("end");
    }
  };
  commands["/emit/n_done"] = function(msg) {
    var nodeId = msg[1]|0;
    var tag    = msg[2];
    var n = cc.getNode(nodeId);
    if (n) {
      n.emit("done", tag);
    }
  };
  
  cc.SynthLang = SynthLang;
  
  module.exports = {
    use: function() {
      require("../common/timer");
      require("../common/console");
      require("./buffer");
      require("./node");
      require("./pattern");
      require("./random");
      require("./scale");
      require("./task");
      require("./synthdef");
      require("./ugen/ugen");
      require("./lang-worker");
      require("./lang-iframe");
      require("./lang-nodejs");
      require("./lang-socket");
      
      cc.createSynthLang = function() {
        require("./array");
        require("./boolean");
        require("./data");
        require("./date");
        require("./function");
        require("./number");
        require("./object");
        require("./string");
        
        switch (cc.opmode) {
        case "worker":
          return cc.createWorkerSynthLang();
        case "iframe":
          return cc.createIFrameSynthLang();
        case "nodejs":
          return cc.createNodeJSSynthLang();
        case "socket":
          return cc.createSocketSynthLang();
        }
        throw new Error("A SynthLang is not defined for: " + cc.opmode);
      };
      cc.replaceNativeTimerFunctions();
    }
  };

  module.exports.use();

});
define('cc/lang/cc', function(require, exports, module) {
  
  module.exports = require("../cc");

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
      if (typeof data === "function") {
        return "[Function]";
      }
      var result;
      if (typeof data === "object") {
        if (data.buffer instanceof ArrayBuffer) {
          return data;
        }
        stack.push(data);
        if (Array.isArray(data)) {
          result = data.map(function(data) {
            return _pack(data, stack);
          });
        } else {
          result = {};
          Object.keys(data).forEach(function(key) {
            if (key.charAt(0) !== "_") {
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
    var func = function() {};
    var _unpack = function(data) {
      if (!data) {
        return data;
      }
      if (typeof data === "string") {
        if (data === "[Function]") {
          return func;
        }
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
define('cc/common/timer', function(require, exports, module) {

  var cc = require("../cc");
  
  // save native timer functions
  var _setInterval   = setInterval;
  var _clearInterval = clearInterval;
  var _setTimeout    = setTimeout;
  var _clearTimeout  = clearTimeout;
  
  var NativeTimer = (function() {
    function NativeTimer() {
      this._timerId = 0;
    }
    NativeTimer.prototype.start = function(callback, interval) {
      if (this._timerId) {
        _clearInterval(this._timerId);
      }
      this._timerId = 0;
      if (typeof callback === "function" && typeof interval === "number") {
        this._timerId = _setInterval(callback, interval);
      }
    };
    NativeTimer.prototype.stop = function() {
      if (this._timerId) {
        _clearInterval(this._timerId);
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
        var path = URL.createObjectURL(blob);
        new Worker(path);
        return path;
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
      this._worker.onmessage = null;
      if (typeof callback === "function" && typeof interval === "number") {
        this._worker.onmessage = callback;
        this._worker.postMessage(interval);
      }
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

  var timerIdCache = [];
  var replaceNativeTimerFunctions = function() {
    global.setInterval = function(func, delay) {
      var id = _setInterval(func, delay);
      timerIdCache.push(id);
      return id;
    };
    global.clearInterval = function(id) {
      _clearInterval(id);
      var index = timerIdCache.indexOf(id);
      if (index !== -1) {
        timerIdCache.splice(index, 1);
      }
    };
    global.setTimeout = function(func, delay) {
      var id = _setTimeout(func, delay);
      timerIdCache.push(id);
      return id;
    };
    global.clearTimeout = function(id) {
      _clearTimeout(id);
      var index = timerIdCache.indexOf(id);
      if (index !== -1) {
        timerIdCache.splice(index, 1);
      }
    };
  };
  var restoreNativeTimerFunctions = function() {
    global.setInterval   = _setInterval;
    global.clearInterval = _clearInterval;
    global.setTimeout    = _setTimeout;
    global.clearTimeout  = _clearTimeout;
  };
  var resetNativeTimers = function() {
    timerIdCache.splice(0).forEach(function(timerId) {
      _clearInterval(timerId);
      _clearTimeout(timerId);
    });
  };
  
  module.exports = {
    WorkerTimer: WorkerTimer,
    NativeTimer: NativeTimer,
    
    use: function() {
      cc.createTimer = function() {
        if (WorkerTimer) {
          return new WorkerTimer();
        }
        return new NativeTimer();
      };
      cc.replaceNativeTimerFunctions = replaceNativeTimerFunctions;
      cc.restoreNativeTimerFunctions = restoreNativeTimerFunctions;
      cc.resetNativeTimers = resetNativeTimers;
    }
  };

  module.exports.use();

});
define('cc/common/console', function(require, exports, module) {

  var cc = require("../cc");
  var unpack = require("./pack").unpack;
  
  var bind = function(commands) {
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
  };
  
  module.exports = {
    bind: bind,
    use : function() {
      cc.console = {
        log: function() {
          global.console.log.apply(global.console, arguments);
        },
        info: function() {
          global.console.info.apply(global.console, arguments);
        },
        warn: function() {
          global.console.warn.apply(global.console, arguments);
        },
        error: function() {
          global.console.error.apply(global.console, arguments);
        }
      };
    }
  };

  module.exports.use();

});
define('cc/lang/buffer', function(require, exports, module) {

  var cc = require("./cc");
  var fn = require("./fn");
  var extend = require("../common/extend");
  var emitter = require("../common/emitter");

  var bufSrcId = 0;
  var bufferSrcCache = {};

  var AudioBuffer = (function() {
    var bufId = 0;
    function AudioBuffer() {
      emitter.mixin(this);
      this.klassName = "Buffer";
      // TODO: set below parameters
      this.frames     = 0;
      this.channels   = 0;
      this.sampleRate = 0;
      
      this._blocking = true;
      this._bufId = bufId++;
      cc.lang.pushToTimeline([
        "/b_new", this._bufId
      ]);
    }
    extend(AudioBuffer, cc.Object);
    
    AudioBuffer.prototype.performWait = function() {
      return this._blocking;
    };
    
    return AudioBuffer;
  })();
  
  var newBufferSource = function(path, buffer) {
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
    var uint8 = new Uint8Array(16 + buffer.samples.length * 4);
    var int16 = new Uint16Array(uint8.buffer);
    var int32 = new Uint32Array(uint8.buffer);
    var f32   = new Float32Array(uint8.buffer);
    var _bufSrcId = bufSrcId++;
    int16[0] = 1;
    int16[1] = _bufSrcId;
    int16[3] = buffer.numChannels;
    int32[2] = buffer.sampleRate;
    int32[3] = buffer.numFrames;
    f32.set(buffer.samples, 4);
    cc.lang.sendToServer(uint8);
    bufferSrcCache[path] = _bufSrcId;
    delete buffer.samples;
    return _bufSrcId;
  };
  
  var bindBufferSource = function(bufSrcId, startFrame, numFrames) {
    cc.lang.pushToTimeline([
      "/b_bind", this._bufId, bufSrcId, startFrame, numFrames
    ]);
  };
  
  var BufferInterface = function() {
  };
  BufferInterface.read = fn(function(path, startFrame, numFrames) {
    if (typeof path !== "string") {
      throw new TypeError("Buffer.Read: arguments[0] should be a string.");
    }
    var bufSrcId = bufferSrcCache[path];
    var buffer = new AudioBuffer();
    if (typeof bufSrcId === "number") {
      bindBufferSource.call(buffer, bufSrcId, startFrame, numFrames);
    } else {
      cc.lang.requestBuffer(path, function(result) {
        if (result) {
          var bufSrcId = newBufferSource(path, result);
          bindBufferSource.call(buffer, bufSrcId, startFrame, numFrames);
        }
      });
    }
    return buffer;
  }).defaults("path,startFrame=0,numFrames=-1").multiCall().build();
  
  var resetBuffer = function() {
    bufferSrcCache = {};
    bufSrcId = 0;
  };
  
  cc.global.Buffer = BufferInterface;
  
  module.exports = {
    AudioBuffer: AudioBuffer,
    
    use: function() {
      cc.createAudioBuffer = function() {
        return new AudioBuffer();
      };
      cc.instanceOfAudioBuffer = function(obj) {
        return obj instanceof AudioBuffer;
      };
      cc.resetBuffer = resetBuffer;
    }
  };

  module.exports.use();

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
      this.multi = false;
    }
    Fn.prototype.defaults = function(def) {
      this.def = def;
      return this;
    };
    Fn.prototype.multiCall = function(flag) {
      this.multi = flag === undefined ? true : !!flag;
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
            vals.push(JSON.parse(items[1]));
          } else {
            vals.push(undefined);
          }
        });
      }
      var ret = func;
      if (this.multi) {
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
      } else if (this.def) {
        ret = function() {
          var args = slice.call(arguments);
          args = resolve_args(keys, vals, slice.call(arguments));
          return func.apply(this, args);
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
    // var containsArray2 = function(list) {
    //   for (var i = 0, imax = list.length; i < imax; ++i) {
    //     if (Array.isArray(list[i])) {
    //       for (var j = 0, jmax = list[i].length; j < jmax; ++j) {
    //         if (Array.isArray(list[i][j])) {
    //           return true;
    //         }
    //       }
    //     }
    //   }
    //   return false;
    // };
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
  
  fn.definePrototypeProperty = function(Klass, key, func) {
    Object.defineProperty(Klass.prototype, key, {
      configurable: true,
      enumerable  : false,
      writable    : true,
      value       : func
    });
  };
  
  fn.setupBinaryOp = function(Klass, selector, func) {
    var ugenSelector;
    if (ops.UGEN_OP_ALIASES.hasOwnProperty(selector)) {
      ugenSelector = ops.UGEN_OP_ALIASES[selector];
    } else {
      ugenSelector = selector;
    }
    fn.definePrototypeProperty(Klass, selector, function(b) {
      var a = this;
      if (Array.isArray(b)) {
        return b.map(function(b) {
          return a[selector](b);
        });
      } else if (cc.instanceOfUGen(b)) {
        return cc.createBinaryOpUGen(ugenSelector, a, b);
      }
      return func.call(a, b);
    });
  };
  
  module.exports = fn;

});
define('cc/lang/utils', function(require, exports, module) {

  var cc = require("./cc");

  var isDict = function(obj) {
    return !!(obj && obj.constructor === Object);
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
    flop   : flop,
    flatten: flatten,
    clump  : clump,
    
    lang_onmessage: lang_onmessage
  };

});
define('cc/common/ops', function(require, exports, module) {

  var UNARY_OP_UGEN_MAP = "neg not isNil notNil bitNot abs asFloat asInt ceil floor frac sign squared cubed sqrt exp reciprocal midicps cpsmidi midiratio ratiomidi dbamp ampdb octcps cpsoct log log2 log10 sin cos tan asin acos atan sinh cosh tanh rand rand2 linrand bilinrand sum3rand distort softclip coin digitvalue silence thru rectWindow hanWindow welWindow triWindow ramp scurve numunaryselectors num tilde pi to_i".split(" ");
  var BINARY_OP_UGEN_MAP = "+ - * / / % eq ne lt gt le ge min max bitAnd bitOr bitXor lcm gcd round roundUp trunc atan2 hypot hypotApx pow leftShift rightShift unsignedRightShift fill ring1 ring2 ring3 ring4 difsqr sumsqr sqrsum sqrdif absdif thresh amclip scaleneg clip2 excess fold2 wrap2 firstarg randrange exprandrange numbinaryselectors roundDown".split(" ");

  var UGEN_OP_ALIASES = {
    __plus__ : "num",
    __minus__: "neg",
    __add__  : "+",
    __sub__  : "-",
    __mul__  : "*",
    __div__  : "/",
    __mod__  : "%",
  };
  
  module.exports = {
    UNARY_OP_UGEN_MAP : UNARY_OP_UGEN_MAP,
    BINARY_OP_UGEN_MAP: BINARY_OP_UGEN_MAP,
    UGEN_OP_ALIASES   : UGEN_OP_ALIASES,
  };

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
    child.__super__ = parent.prototype;
    return child;
  };
  
  module.exports = extend;

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
define('cc/lang/node', function(require, exports, module) {

  var cc = require("./cc");
  var utils   = require("./utils");
  var extend  = require("../common/extend");
  var emitter = require("../common/emitter");
  
  var nodes = {};
  
  var Node = (function() {
    var nodeId = 0;
    function Node() {
      emitter.mixin(this);
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
    Node.prototype.performWait = function() {
      return this._blocking;
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
    
    Synth.prototype.set = function(args) {
      var controls = args2controls(args, this.params);
      if (controls.length) {
        cc.lang.pushToTimeline([
          "/n_set", this.nodeId, controls
        ]);
      }
    };
    
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
        index = params.indices[index];
        var length = params.length[index];
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
  
  var GroupInterface = cc.global.Group = function() {
    return new Group();
  };
  GroupInterface.after = function(node) {
    return new Group(node || cc.lang.rootNode, 3);
  };
  GroupInterface.before = function(node) {
    return new Group(node || cc.lang.rootNode, 2);
  };
  GroupInterface.head = function(node) {
    return new Group(node || cc.lang.rootNode, 0);
  };
  GroupInterface.tail = function(node) {
    return new Group(node || cc.lang.rootNode, 1);
  };
  GroupInterface.replace = function(node) {
    return new Group(node, 4);
  };
  
  var SynthInterface = cc.global.Synth = function() {
    return new Synth();
  };
  SynthInterface.after = function() {
    var list = sortArgs(arguments);
    return new Synth(list[0], 3, list[1], list[2]);
  };
  SynthInterface.before = function() {
    var list = sortArgs(arguments);
    return new Synth(list[0], 2, list[1], list[2]);
  };
  SynthInterface.head = function() {
    var list = sortArgs(arguments);
    return new Synth(list[0], 0, list[1], list[2]);
  };
  SynthInterface.tail = function() {
    var list = sortArgs(arguments);
    return new Synth(list[0], 1, list[1], list[2]);
  };
  SynthInterface.replace = function(node, def, args) {
    return new Synth(node, 4, def, args);
  };
  
  
  module.exports = {
    Node : Node,
    Group: Group,
    Synth: Synth,

    // private methods
    args2controls : args2controls,
    
    use: function() {
      cc.createNode = function() {
        return new Node();
      };
      cc.createGroup = function(target, addAction) {
        return new Group(target, addAction);
      };
      cc.createSynth = function(target, addAction, def, args) {
        return new Synth(target, addAction, def, args);
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
    }
  };

  module.exports.use();

});
define('cc/lang/pattern', function(require, exports, module) {

  var cc = require("./cc");
  var fn = require("./fn");
  var extend  = require("../common/extend");
  var emitter = require("../common/emitter");
  var ops = require("../common/ops");
  
  var Pattern = (function() {
    function Pattern() {
      emitter.mixin(this);
      this.klassName = "Pattern";
      this._blocking = true;
    }
    extend(Pattern, cc.Object);
    
    Pattern.prototype.next = function() {
      if (this._blocking) {
        this.emit("end");
      }
      return null;
    };
    Pattern.prototype.nextN = function(n, inVal) {
      var a = new Array(n);
      for (var i = 0; i < n; ++i) {
        a[i] = this.next(inVal);
      }
      return a;
    };
    Pattern.prototype.valueOf = function(item) {
      if (item instanceof Pattern) {
        return item.next();
      }
      return item;
    };
    Pattern.prototype.reset = function() {
      this._blocking = false;
    };
    Pattern.prototype.performWait = function() {
      return this._blocking;
    };

    ops.UNARY_OP_UGEN_MAP.forEach(function(selector) {
      if (/^[a-z][a-zA-Z0-9_]*$/.test(selector)) {
        Pattern.prototype[selector] = function() {
          return new PUnaryOp(this, selector);
        };
      }
    });
    
    ops.BINARY_OP_UGEN_MAP.forEach(function(selector) {
      if (/^[a-z][a-zA-Z0-9_]*$/.test(selector)) {
        Pattern.prototype[selector] = function(b) {
          return new PBinaryOp(this, selector, b);
        };
      }
    });
    
    return Pattern;
  })();
  
  var PSequence = (function() {
    function PSequence(list, repeats, offset) {
      if (!(Array.isArray(list) || list instanceof Pattern)) {
        throw new TypeError("PSequence: the first argument is invalid");
      }
      if (typeof repeats !== "number") {
        throw new TypeError("PSequence: the second argument must be a Number");
      }
      if (typeof offset !== "number") {
        throw new TypeError("PSequence: the third argument must be a Number");
      }
      Pattern.call(this);
      this.klassName = "PSequence";
      this.list    = list;
      this.repeats = repeats;
      this.offset  = offset;
      this._pos = 0;
    }
    extend(PSequence, Pattern);
    
    PSequence.prototype.next = function() {
      if (this._blocking) {
        if (this._pos < this.repeats * this.list.length) {
          var index = (this._pos + this.offset) % this.list.length;
          var item  = this.list[index];
          var value = this.valueOf(item);
          if (!(value === null || value === undefined)) {
            if (!(item instanceof Pattern)) {
              this._pos += 1;
            }
            return value;
          }
          if (item instanceof Pattern) {
            item.reset();
          }
          this._pos += 1;
          return this.next();
        } else {
          this.emit("end");
          this._blocking = false;
        }
      }
      return null;
    };
    PSequence.prototype.reset = function() {
      this._pos = 0;
      this._blocking = true;
      var list = this.list;
      for (var i = 0, imax = list.length; i < imax; ++i) {
        if (list[i] instanceof Pattern) {
          list[i].reset();
        }
      }
    };
    
    return PSequence;
  })();

  var PShuffle = (function() {
    function PShuffle(list, repeats) {
      if (!(Array.isArray(list) || list instanceof Pattern)) {
        throw new TypeError("PShuffle: the first argument is invalid");
      }
      if (typeof repeats !== "number") {
        throw new TypeError("PShuffle: the second argument must be a Number");
      }
      list.sort(shuffle);
      PSequence.call(this, list, repeats, 0);
      this.klassName = "PShuffle";
    }
    extend(PShuffle, PSequence);
    var shuffle = function() {
      return Math.random() - 0.5;
    };
    return PShuffle;
  })();

  var PUnaryOp = (function() {
    function PUnaryOp(pattern, selector) {
      if (!Number.prototype.hasOwnProperty(selector)) {
        throw new TypeError("PUnaryOp: operator '" + selector + "' not supported");
      }
      Pattern.call(this);
      this.klassName = "PUnaryOp";
      this.pattern   = pattern;
      this.selector  = selector;
    }
    extend(PUnaryOp, Pattern);
    
    PUnaryOp.prototype.next = function() {
      if (this._blocking) {
        var val = this.pattern.next();
        if (val === null || val === undefined) {
          this.emit("end");
          this._blocking = false;
        } else {
          return val[this.selector].call(val);
        }
      }
      return null;
    };
    
    return PUnaryOp;
  })();

  var PBinaryOp = (function() {
    function PBinaryOp(pattern, selector, b) {
      if (!Number.prototype.hasOwnProperty(selector)) {
        throw new TypeError("PBinaryOp: operator '" + selector + "' not supported");
      }
      Pattern.call(this);
      this.klassName = "PBinaryOp";
      this.pattern   = pattern;
      this.selector  = selector;
      this.b = b;
    }
    extend(PBinaryOp, Pattern);
    
    PBinaryOp.prototype.next = function() {
      if (this._blocking) {
        var val = this.pattern.next();
        if (val === null || val === undefined) {
          this.emit("end");
          this._blocking = false;
        } else {
          return val[this.selector].call(val, this.b);
        }
      }
      return null;
    };
    
    return PBinaryOp;
  })();

  cc.global.PSequence = fn(function(list, repeats, offset) {
    return cc.createPSequence(list, repeats, offset);
  }).defaults("list,repeats=1,offset=0").build();
  cc.global.PShuffle = fn(function(list, repeats) {
    return cc.createPShuffle(list, repeats);
  }).defaults("list,repeats=1").build();
  
  module.exports = {
    Pattern  : Pattern,
    PSequence: PSequence,
    PShuffle : PShuffle,
    PUnaryOp : PUnaryOp,
    PBinaryOp: PBinaryOp,
    
    use: function() {
      cc.createPSequence = function(list, repeats, offset) {
        return new PSequence(list, repeats, offset);
      };
      cc.createPShuffle = function(list, repeats) {
        return new PShuffle(list, repeats);
      };
    }
  };

  module.exports.use();

});
define('cc/lang/random', function(require, exports, module) {
  
  var cc = require("./cc");
  var extend = require("../common/extend");
  
  var Random = (function() {
    function Random(seed) {
      if (typeof seed !== "number") {
        seed = Date.now();
      }
      var hash = seed;
      hash += ~(hash <<  15);
      hash ^=   hash >>> 10;
      hash +=   hash <<  3;
      hash ^=   hash >>> 6;
      hash += ~(hash <<  11);
      hash ^=   hash >>> 16;

      this.s1 = 1243598713 ^ seed;
      this.s2 = 3093459404 ^ seed;
      this.s3 = 1821928721 ^ seed;
      if (this.s1 <  2) {
        this.s1 = 1243598713;
      }
      if (this.s2 <  8) {
        this.s2 = 3093459404;
      }
      if (this.s3 < 16) {
        this.s3 = 1821928721;
      }
    }
    extend(Random, cc.Object);

    Random.prototype.trand = function() {
      this.s1 = ((this.s1 & 4294967294) << 12) ^ (((this.s1 << 13) ^  this.s1) >>> 19);
      this.s2 = ((this.s2 & 4294967288) <<  4) ^ (((this.s2 <<  2) ^  this.s2) >>> 25);
      this.s3 = ((this.s3 & 4294967280) << 17) ^ (((this.s3 <<  3) ^  this.s3) >>> 11);
      return this.s1 ^ this.s2 ^ this.s3;
    };

    var _i = new Uint32Array(1);
    var _f = new Float32Array(_i.buffer);
    
    Random.prototype.next = function() {
      _i[0] = 0x3F800000 | (this.trand() >>> 9);
      return _f[0] - 1;
    };
    
    return Random;
  })();

  cc.global.Random  = function(seed) {
    return cc.createRandom(seed);
  };
  
  module.exports = {
    Random: Random,
    
    use: function() {
      cc.createRandom = function(seed) {
        return new Random(seed);
      };
      cc.instanceOfRandom = function(obj) {
        return obj instanceof Random;
      };
    }
  };

  module.exports.use();

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
  
  var TuningInterface = fn(function(tuning, octaveRatio, name) {
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
  var tunings = {};
  Object.keys(tuningInfo).forEach(function(key) {
    var params = tuningInfo[key];
    tunings[key] = new Tuning(params[0], params[1], params[2]);
    TuningInterface[key] = tunings[key];
  });
  TuningInterface.at = function(key) {
    var t = tunings[key];
    if (t) {
      t = t.copy();
    }
    return t;
  };
  TuningInterface.choose = fn(function(size) {
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
  }).multiCall().build();
  TuningInterface.et = function(pitchesPerOctave) {
    var list = new Array(pitchesPerOctave);
    for (var i = 0; i < pitchesPerOctave; ++i) {
      list[i] = i * (12 / pitchesPerOctave);
    }
    return new Tuning(list, 2, "ET" + pitchesPerOctave);
  };
  TuningInterface.names = function() {
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
      if (inTuning === null) {
        inTuning = TuningInterface["default"](this._pitchesPerOctave);
      } else if (typeof inTuning === "string") {
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
      octave += (degree / that._degrees.length)|0;
      var ratios = that.ratios();
      var index  = degree % ratios.length;
      if (index < 0) {
        index = ratios.length + index;
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
  
  var ScaleInterface = fn(function(degrees, pitchesPerOctave, tuning, name) {
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
  var scales = {};
  Object.keys(scaleInfo).forEach(function(key) {
    var params = scaleInfo[key];
    if (params[2]) {
      params[2] = tunings[params[2]].copy();
    } else {
      params[2] = TuningInterface.et(params[1]);
    }
    scales[key] = new Scale(params[0], params[1], params[2], params[3]);
    ScaleInterface[key] = scales[key];
  });
  ScaleInterface.at = function(key, tuning) {
    var s = scales[key];
    if (s) {
      s = s.copy();
      if (tuning) {
        s.tuning(tuning);
      }
    }
    return s;
  };
  ScaleInterface.choose = fn(function(size, pitchesPerOctave) {
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
  }).multiCall().build();
  ScaleInterface.names = function() {
    return Object.keys(scales).sort();
  };

  cc.global.Scale  = ScaleInterface;
  cc.global.Tuning = TuningInterface;
  
  module.exports = {
    Scale : Scale,
    Tuning: Tuning,
    
    use: function() {
      cc.createScale = function(degrees, pitchesPerOctave, tuning, name) {
        return new Scale(degrees, pitchesPerOctave, tuning, name);
      };
      cc.createTuning = function(tuning, octaveRatio, name) {
        return new Tuning(tuning, octaveRatio, name);
      };
      cc.instanceOfScale = function(obj) {
        return obj instanceof Scale;
      };
      cc.instanceOfTuning = function(obj) {
        return obj instanceof Tuning;
      };
    }
  };

  module.exports.use();

});
define('cc/lang/task', function(require, exports, module) {

  var cc = require("./cc");
  var extend  = require("../common/extend");
  var emitter = require("../common/emitter");
  var slice = [].slice;

  var TaskManager = (function() {
    function TaskManager() {
      this.klassName = "TaskManager";
      this.tasks = [];
      this.counterIncr = 0;
    }
    extend(TaskManager, cc.Object);
    
    TaskManager.prototype.play = function(counterIncr) {
      this.counterIncr = Math.max(1, counterIncr);
    };
    TaskManager.prototype.pause = function() {
      this.counterIncr = 0;
    };
    TaskManager.prototype.reset = function() {
      this.tasks = [];
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
      var tasks = this.tasks;
      for (var i = 0; i < tasks.length; ++i) {
        tasks[i].process(counterIncr);
      }
    };
    
    return TaskManager;
  })();
  
  var TaskFunction = (function() {
    function TaskFunction(init) {
      emitter.mixin(this);
      this.klassName = "TaskFunction";
      if (arguments.length === 0) {
        this.segments = [];
      } else if (typeof init !== "function") {
        throw new TypeError("TaskFunction: first argument should be a Function.");
      } else {
        var segments = init();
        if (!Array.isArray(segments)) {
          throw new TypeError("TaskFunction: invalid initialize function");
        }
        this.segments = segments;
      }
      this._pc = 0;
    }
    extend(TaskFunction, cc.Object);
    
    TaskFunction.prototype.perform = function(context) {
      var func = this.segments[this._pc++];
      if (func) {
        func.apply(context, slice.call(arguments, 1));
        return true;
      }
      return false;
    };
    
    TaskFunction.prototype.clone = function() {
      var newInstance = new TaskFunction();
      newInstance.segments = this.segments;
      return newInstance;
    };
    
    TaskFunction.prototype.goTo = function(pc) {
      this._pc = Math.max(0, Math.min(pc, this.segments.length));
    };
    
    return TaskFunction;
  })();

  var TaskWaitToken = (function() {
    function TaskWaitToken(item) {
      this.klassName = "TaskWaitToken";
      this.item = item;
      this._blocking = true;
    }
    extend(TaskWaitToken, cc.Object);
    
    TaskWaitToken.prototype.performWait = function() {
      return this._blocking;
    };
    
    return TaskWaitToken;
  })();

  var TaskWaitTokenNumber = (function() {
    function TaskWaitTokenNumber(item) {
      TaskWaitToken.call(this, item);
      this.klassName = "TaskWaitTokenNumber";
      this.item *= 1000;
    }
    extend(TaskWaitTokenNumber, TaskWaitToken);
    
    TaskWaitTokenNumber.prototype.performWait = function(counterIncr) {
      if (this._blocking) {
        this.item -= counterIncr;
        if (this.item <= 0) {
          this._blocking = false;
        }
      }
      return this._blocking;
    };
    
    return TaskWaitTokenNumber;
  })();

  var TaskWaitTokenFunction = (function() {
    function TaskWaitTokenFunction(item) {
      TaskWaitToken.call(this, item);
      this.klassName = "TaskWaitTokenFunction";
    }
    extend(TaskWaitTokenFunction, TaskWaitToken);
    
    TaskWaitTokenFunction.prototype.performWait = function() {
      if (this._blocking) {
        this._blocking = !!this.item();
      }
      return this._blocking;
    };
    
    return TaskWaitTokenFunction;
  })();
  
  var TaskWaitTokenBoolean = (function() {
    function TaskWaitTokenBoolean(item) {
      TaskWaitToken.call(this, item);
      this.klassName = "TaskWaitTokenBoolean";
      this._blocking = item;
    }
    extend(TaskWaitTokenBoolean, TaskWaitToken);
    
    return TaskWaitTokenBoolean;
  })();

  var TaskWaitTokenBlockable = (function() {
    function TaskWaitTokenBlockable(item) {
      TaskWaitToken.call(this, item);
      this.klassName = "TaskWaitTokenBlockable";
    }
    extend(TaskWaitTokenBlockable, TaskWaitToken);
    
    TaskWaitTokenBlockable.prototype.performWait = function(counterIncr) {
      if (this._blocking) {
        this._blocking = this.item.performWait(counterIncr);
      }
      return this._blocking;
    };
    
    return TaskWaitTokenBlockable;
  })();

  var TaskWaitTokenLogicAND = (function() {
    function TaskWaitTokenLogicAND(list) {
      TaskWaitToken.call(this, []);
      this.klassName = "TaskWaitTokenLogicAND";
      var item = [];
      list.forEach(function(token) {
        if (token instanceof TaskWaitTokenLogicAND) {
          item = item.concat(token.item);
        } else {
          item.push(token);
        }
      });
      this.item = item;
    }
    extend(TaskWaitTokenLogicAND, TaskWaitToken);
    
    TaskWaitTokenLogicAND.prototype.performWait = function(counterIncr) {
      if (this._blocking) {
        this.item = this.item.filter(function(token) {
          return token.performWait(counterIncr);
        });
        this._blocking = this.item.length > 0;
      }
      return this._blocking;
    };
    
    return TaskWaitTokenLogicAND;
  })();

  var TaskWaitTokenLogicOR = (function() {
    function TaskWaitTokenLogicOR(list) {
      TaskWaitToken.call(this, []);
      var item = [];
      list.forEach(function(token) {
        if (token instanceof TaskWaitTokenLogicOR) {
          item = item.concat(token.item);
        } else {
          item.push(token);
        }
      });
      this.item = item;
    }
    extend(TaskWaitTokenLogicOR, TaskWaitToken);
    
    TaskWaitTokenLogicOR.prototype.performWait = function(counterIncr) {
      var blocking = true;
      this.item = this.item.filter(function(token) {
        var _blocking = token.performWait(counterIncr);
        blocking = _blocking && blocking;
        return _blocking;
      });
      if (this._blocking) {
        this._blocking = blocking;
      }
      return this._blocking;
    };
    
    return TaskWaitTokenLogicOR;
  })();
  
  var TaskProcessor = (function() {
    function TaskProcessor(func) {
      var that = this;
      
      emitter.mixin(this);
      this.klassName = "TaskProcessor";
      this.taskManager  = cc.taskManager;
      this._blocking = true;
      this._func  = func;
      this._count = 0;
      this._prev = null;
      this._next = null;
      this._wait = null;
      this._context = {
        wait: function(token) {
          that._wait = cc.createTaskWaitToken(token||0);
        },
        continue: function(token) {
          that._wait = cc.createTaskWaitToken(token||0);
          that._func.goTo(0);
          that._done();
        },
        redo: function(token) {
          that._wait = cc.createTaskWaitToken(token||0);
          that._func.goTo(0);
        },
        break: function() {
          that._func.goTo(Infinity);
          that.stop();
        }
      };
    }
    extend(TaskProcessor, cc.Object);
    
    TaskProcessor.prototype.play = function() {
      var that = this;
      // rewind to the head task of a chain
      while (that._prev !== null) {
        that = that._prev;
      }
      if (that.taskManager) {
        cc.taskManager.append(that);
      }
      this._blocking = true;
      return this;
    };
    TaskProcessor.prototype.pause = function() {
      if (this.taskManager) {
        this.taskManager.remove(this);
      }
      this._blocking = false;
      return this;
    };
    TaskProcessor.prototype.stop = function() {
      if (this.taskManager) {
        this.taskManager.remove(this);
        this.emit("end");
        if (this._next) {
          this._next._prev = null;
          this._next.play();
          this._next = null;
        }
      }
      this._count    = 0;
      this._blocking = false;
      this.taskManager = null;
      return this;
    };
    TaskProcessor.prototype.process = function(counterIncr) {
      var blocking;
      while (this._blocking) {
        if (this._wait) {
          blocking = this._wait.performWait(counterIncr);
          if (blocking) {
            return;
          }
          this._wait = null;
        }
        blocking = this._execute(this._count);
        if (!blocking) {
          this._done();
        }
        counterIncr  = 0;
      }
    };
    TaskProcessor.prototype._execute = function() {
      return this._func.perform(this._context, this._count);
    };
    TaskProcessor.prototype.performWait = function() {
      return this._blocking;
    };
    
    // task chain methods
    TaskProcessor.prototype["do"] = function(num, func) {
      var next = new TaskProcessorDo(num, func);
      next._prev = this;
      this._next = next;
      return next;
    };
    TaskProcessor.prototype.loop = function(func) {
      var next = new TaskProcessorDo(Infinity, func);
      next._prev = this;
      this._next = next;
      return next;
    };
    TaskProcessor.prototype.each = function(list, func) {
      var next = new TaskProcessorEach(list, cc.createTaskFunction(func));
      next._prev = this;
      this._next = next;
      return next;
    };
    
    return TaskProcessor;
  })();
  
  var TaskProcessorDo = (function() {
    function TaskProcessorDo() {
      var num, func;
      var i = 0;
      if (typeof arguments[i] === "number") {
        num = arguments[i++];
      }
      if (typeof arguments[i] === "function") {
        func = cc.createTaskFunction(arguments[i++]);
      } else if (func instanceof TaskFunction) {
        func = arguments[i++];
      }
      TaskProcessor.call(this, func);
      
      if (num !== Infinity) {
        num = num|0;
      }
      this._num = num;
      
      if (num === Infinity) {
        this.klassName = "TaskProcessorLoop";
      } else {
        this.klassName = "TaskProcessorDo";
      }
    }
    extend(TaskProcessorDo, TaskProcessor);
    
    TaskProcessorDo.prototype._done = function() {
      this._count += 1;
      if (this._count < this._num) {
        this._func.goTo(0);
      } else {
        this.stop();
      }
    };
    
    return TaskProcessorDo;
  })();

  var TaskProcessorEach = (function() {
    function TaskProcessorEach(list, func) {
      if (!(Array.isArray(list))) {
        throw new TypeError("Task.each: First argument must be an Array.");
      }
      TaskProcessor.call(this, func);
      this.klassName = "TaskProcessorEach";
      this._list = list;
    }
    extend(TaskProcessorEach, TaskProcessor);
    
    TaskProcessorEach.prototype._execute = function() {
      return this._func.perform(this._context, this._list[this._count], this._count);
    };
    TaskProcessorEach.prototype._done = function() {
      this._count += 1;
      if (this._count < this._list.length) {
        this._func.goTo(0);
      } else {
        this.stop();
      }
    };
    
    return TaskProcessorEach;
  })();

  var TaskProcessorRecursive = (function() {
    function TaskProcessorRecursive(func) {
      var that = this;
      TaskProcessor.call(this, func);
      this.klassName = "TaskProcessorRecursive";
      this._value   = 0;
      this._args    = [];
      this._context.recursive = function() {
        var next = new TaskProcessorRecursive(func.clone());
        next.play.apply(next, slice.call(arguments));
        that._wait = cc.createTaskWaitToken(next);
        return next;
      };
      this._context["return"] = function(value) {
        that._value = value;
        that.stop();
      };
    }
    extend(TaskProcessorRecursive, TaskProcessor);
    
    TaskProcessorRecursive.prototype.play = function() {
      this._args = slice.call(arguments).map(function(value) {
        if (value instanceof TaskProcessorRecursive) {
          value = value._value;
        }
        return value;
      });
      TaskProcessor.prototype.play.call(this);
      return this;
    };
    TaskProcessorRecursive.prototype._execute = function() {
      return this._func.perform.apply(this._func, [this._context].concat(this._args));
    };
    TaskProcessorRecursive.prototype._done = function() {
      this.stop();
    };
    
    return TaskProcessorRecursive;
  })();

  
  
  cc.global.Task = function(func) {
    return cc.createTaskFunction(func);
  };
  cc.global.Task["do"] = function(num, func) {
    return new TaskProcessorDo(num, func);
  };
  cc.global.Task.loop = function(func) {
    return new TaskProcessorDo(Infinity, func);
  };
  cc.global.Task.each = function(list, func) {
    return new TaskProcessorEach(list, cc.createTaskFunction(func));
  };
  cc.global.Task.recursive = function(func) {
    return new TaskProcessorRecursive(cc.createTaskFunction(func));
  };
  
  module.exports = {
    TaskManager  : TaskManager,
    TaskFunction : TaskFunction,
    TaskWaitToken         : TaskWaitToken,
    TaskWaitTokenNumber   : TaskWaitTokenNumber,
    TaskWaitTokenFunction : TaskWaitTokenFunction,
    TaskWaitTokenBoolean  : TaskWaitTokenBoolean,
    TaskWaitTokenBlockable: TaskWaitTokenBlockable,
    TaskWaitTokenLogicAND : TaskWaitTokenLogicAND,
    TaskWaitTokenLogicOR  : TaskWaitTokenLogicOR,
    TaskProcessor         : TaskProcessor,
    TaskProcessorDo       : TaskProcessorDo,
    TaskProcessorEach     : TaskProcessorEach,
    TaskProcessorRecursive: TaskProcessorRecursive,
    
    use: function() {
      cc.createTaskManager = function() {
        cc.taskManager = new TaskManager();
        return cc.taskManager;
      };
      cc.instanceOfTaskManager = function(obj) {
        return obj instanceof TaskManager;
      };
      cc.createTaskFunction = function(init) {
        return new TaskFunction(init);
      };
      cc.instanceOfTaskFunction = function(obj) {
        return obj instanceof TaskFunction;
      };
      cc.createTaskWaitToken = function(item) {
        if (item instanceof TaskWaitToken) {
          return item;
        }
        switch (typeof item) {
        case "number":
          return new TaskWaitTokenNumber(item);
        case "function":
          return new TaskWaitTokenFunction(item);
        case "boolean":
          return new TaskWaitTokenBoolean(item);
        default:
          if (Array.isArray(item)) {
            return cc.createTaskWaitLogic("and", item);
          } else if (item && typeof item.performWait === "function") {
            return new TaskWaitTokenBlockable(item);
          }
        }
        throw new TypeError("TaskWaitToken: Invalid type");
      };
      cc.instanceOfTaskWaitToken = function(obj) {
        return obj instanceof TaskWaitToken;
      };
      cc.createTaskWaitLogic = function(logic, list) {
        list = list.map(function(token) {
          return cc.createTaskWaitToken(token);
        });
        if (logic === "and") {
          return new TaskWaitTokenLogicAND(list);
        }
        return new TaskWaitTokenLogicOR(list);
      };
    }
  };
  
  module.exports.use();

});
define('cc/lang/synthdef', function(require, exports, module) {

  var cc = require("./cc");
  var fn = require("./fn");
  var utils  = require("./utils");
  var extend = require("../common/extend");
  
  var defId = 0;
  
  var SynthDef = (function() {
    function SynthDef(func, args) {
      this.klassName = "SynthDef";
      this._defId = defId++;
      
      this.func   = func;
      this.args   = args2keyValues(args);
      this.params = args2params(this.args);
      this.specs  = null;
    }
    extend(SynthDef, cc.Object);
    
    SynthDef.prototype.build = function() {
      if (!this.specs) {
        build.call(this);
        cc.lang.pushToTimeline([
          "/s_def", this._defId, JSON.stringify(this.specs)
        ]);
      }
      return this;
    };
    
    SynthDef.prototype.play = fn(function() {
      if (this.specs === null) {
        this.build();
      }
      
      var list = getSynthDefPlayArguments.apply(null, arguments);
      var target = list[0];
      var args   = list[1];
      var addAction = list[2];
      switch (addAction) {
      case "addToHead":
        return cc.createSynth(target, 0, this, args);
      case "addToTail":
        return cc.createSynth(target, 1, this, args);
      case "addBefore":
        return cc.createSynth(target, 2, this, args);
      case "addAfter":
        return cc.createSynth(target, 3, this, args);
      default:
        return cc.createSynth(target, 0, this, args);
      }
    }).multiCall().build();
    
    var build = function() {
      var args   = this.args;
      var params = this.params;
      
      var children = [];
      cc.setSynthDef(function(ugen) {
        children.push(ugen);
      });
      
      var controls = cc.createControl(1).init(params.flatten);
      if (!Array.isArray(controls)) {
        controls = [ controls ];
      }
      
      try {
        this.func.apply(null, reshapeArgs(args.vals, controls));
      } catch (e) {
        throw e.toString();
      } finally {
        cc.setSynthDef(null);
      }
      var consts  = getConstValues(children);
      var defList = makeDefList(topoSort(children), consts);
      
      var specs = {
        consts : consts,
        defList: defList,
        params : params.params
      };
      this.specs = specs;
      // console.log(specs);
    };
    
    return SynthDef;
  })();
  
  // private methods
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

  var args2params = function(args) {
    var params  = { names:[], indices:[], length:[], values:[] };
    var flatten = [];
    var opts    = null;
    for (var i = 0, imax = args.vals.length; i < imax; ++i) {
      var value;
      try {
        value = JSON.parse(args.vals[i]);
      } catch (e) {
        throw new TypeError("SynthDefFunction's arguments should be a JSONable: " + args.vals[i]);
      }
      if (isValidDefArg(value)) {
        var length = Array.isArray(value) ? value.length : 1;
        params.names  .push(args.keys[i]);
        params.indices.push(flatten.length);
        params.length .push(length);
        params.values .push(value);
        flatten = flatten.concat(value);
      } else if (i === imax - 1 && utils.isDict(value)) {
        // allow a dictionary be put the last
        opts = value;
      } else {
        throw new TypeError("SynthDefFunction's arguments should be a constant number or an array that contains it.");
      }
      if (opts) {
        args.keys.pop();
        args.vals.pop();
      }
    }
    return { params:params, flatten:flatten, opts:opts };
  };

  var isValidDefArg = function(obj) {
    if (typeof obj === "number") {
      return true;
    }
    if (Array.isArray(obj)) {
      return obj.every(function(obj) {
        return typeof obj === "number";
      });
    }
    return false;
  };
  
  var reshapeArgs = function(shape, flatten) {
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

  var getConstValues = function(list) {
    var consts = [];
    list.forEach(function(x) {
      if (x.inputs) {
        x.inputs.forEach(function(_in) {
          if (typeof _in === "number" && consts.indexOf(_in) === -1) {
            consts.push(_in);
          }
        });
      }
    });
    return consts.sort();
  };
  
  var topoSort = (function() {
    var _topoSort = function(x, list, checked, stack) {
      if (stack.indexOf(x) !== stack.length-1) {
        cc.console.warn("UGen graph contains recursion.");
        return;
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
  
  var getRate = function(ugen) {
    return ugen.rate;
  };
  var discard = function(ugen) {
    return typeof ugen !== "number" && !cc.instanceOfOutputProxy(ugen);
  };
  var makeDefList = function(list, consts) {
    var result = [];
    list = list.filter(discard);
    for (var i = 0, imax = list.length; i < imax; ++i) {
      var ugen = list[i];
      var inputs = [], outputs;
      for (var j = 0, jmax = ugen.inputs.length; j < jmax; ++j) {
        var index, subindex;
        if (cc.instanceOfOutputProxy(ugen.inputs[j])) {
          index = list.indexOf(ugen.inputs[j].inputs[0]);
        } else {
          index = list.indexOf(ugen.inputs[j]);
        }
        if (index !== -1) {
          subindex = ugen.inputs[j].outputIndex|0;
        } else {
          subindex = consts.indexOf(ugen.inputs[j]);
        }
        inputs.push(index, subindex);
      }
      if (cc.instanceOfMultiOutUGen(ugen)) {
        outputs = ugen.channels.map(getRate);
      } else if (ugen.numOfOutputs === 1) {
        outputs = [ ugen.rate ];
      } else {
        outputs = [];
      }
      result.push(
        [ ugen.klassName, ugen.rate, ugen.specialIndex|0, inputs, outputs, ugen.tag||"" ]
      );
    }
    return result;
  };
  
  cc.global.SynthDef = function(func, args) {
    return cc.createSynthDef(func, args);
  };
  
  module.exports = {
    SynthDef: SynthDef,
    
    args2keyValues: args2keyValues,
    args2params   : args2params,
    isValidDefArg : isValidDefArg,
    reshapeArgs   : reshapeArgs,
    getConstValues: getConstValues,
    topoSort      : topoSort,
    makeDefList   : makeDefList,
    
    use: function() {
      cc.createSynthDef = function(func, args) {
        return new SynthDef(func, args);
      };
      cc.instanceOfSynthDef = function(obj) {
        return obj instanceof SynthDef;
      };
    }
  };
  
  module.exports.use();

});
define('cc/lang/ugen/ugen', function(require, exports, module) {
  
  var cc = require("../cc");
  var fn = require("../fn");
  var extend = require("../../common/extend");
  var ops = require("../../common/ops");
  var slice  = [].slice;
  
  var addToSynthDef = null;
  var specs = {};
  cc.ugen = { specs:specs };
  
  var UGen = (function() {
    function UGen(name) {
      this.klassName = name;
      this.tag  = "";
      this.rate = 2;
      this.signalRange = 2;
      this.specialIndex = 0;
      this.outputIndex  = 0;
      this.numOfInputs  = 0;
      this.numOfOutputs = 1;
      this.inputs = [];
    }
    extend(UGen, cc.Object);
    
    UGen.prototype.init = function(rate) {
      this.rate = rate;
      if (addToSynthDef) {
        addToSynthDef(this);
      }
      this.inputs = slice.call(arguments, 1);
      this.numOfInputs = this.inputs.length;
      return this;
    };

    UGen.prototype.__plus__ = function() {
      return this;
    };
    UGen.prototype.__minus__ = function() {
      return this.neg();
    };
    fn.setupBinaryOp(UGen, "__add__", function(b) {
      return cc.createBinaryOpUGen("+", this, b);
    });
    fn.setupBinaryOp(UGen, "__sub__", function(b) {
      return cc.createBinaryOpUGen("-", this, b);
    });
    fn.setupBinaryOp(UGen, "__mul__", function(b) {
      return cc.createBinaryOpUGen("*", this, b);
    });
    fn.setupBinaryOp(UGen, "__div__", function(b) {
      return cc.createBinaryOpUGen("/", this, b);
    });
    fn.setupBinaryOp(UGen, "__mod__", function(b) {
      return cc.createBinaryOpUGen("%", this, b);
    });
    
    UGen.prototype.madd = fn(function(mul, add) {
      return cc.createMulAdd(this, mul, add);
    }).defaults("mul=1,add=0").multiCall().build();
    
    UGen.prototype.range = fn(function(lo, hi) {
      var mul, add;
      if (this.signalRange === 2) {
        mul = (hi - lo) * 0.5;
        add = mul + lo;
      } else {
        mul = (hi - lo);
        add = lo;
      }
      return cc.createMulAdd(this, mul, add);
    }).defaults("lo=0,hi=1").multiCall().build();
    
    UGen.prototype.unipolar = fn(function(mul) {
      return this.range(0, mul);
    }).defaults("mul=1").multiCall().build();
    
    UGen.prototype.bipolar = fn(function(mul) {
      return this.range(mul.neg(), mul);
    }).defaults("mul=1").multiCall().build();
    
    ops.UNARY_OP_UGEN_MAP.forEach(function(selector) {
      if (/^[a-z][a-zA-Z0-9_]*/.test(selector)) {
        UGen.prototype[selector] = function() {
          return cc.createUnaryOpUGen(selector, this);
        };
      }
    });
    
    ops.BINARY_OP_UGEN_MAP.forEach(function(selector) {
      if (/^[a-z][a-zA-Z0-9_]*/.test(selector)) {
        fn.setupBinaryOp(UGen, selector, function(b) {
          return cc.createBinaryOpUGen(selector, this, b);
        });
      }
    });
    
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
      this.inputs = this.inputs.map(function(ugen) {
        if (!(ugen instanceof UGen)) {
          ugen = +ugen;
          if (isNaN(ugen)) {
            ugen = 0;
          }
        }
        return ugen;
      });
      this.numOfInputs = this.inputs.length;
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
    return OutputProxy;
  })();
  
  
  var registerUGen = function(name, spec) {
    var klass = cc.global[name] = function() {
      return new UGen(name);
    };
    
    Object.keys(spec).forEach(function(key) {
      var setting   = spec[key];
      var defaults  = setting.defaults + ",tag";
      var ctor      = setting.ctor;
      var multiCall = setting.multiCall;
      if (multiCall === undefined) {
        multiCall = true;
      }
      if (setting.Klass !== null) {
        var Klass = setting.Klass || UGen;
        klass[key] = fn(function() {
          var args = slice.call(arguments, 0, arguments.length - 1);
          var tag  = arguments[arguments.length - 1];
          var instance = ctor.apply(new Klass(name, tag), args);
          if (instance instanceof UGen) {
            instance.tag = tag || "";
          }
          return instance;
        }).defaults(defaults).multiCall(multiCall).build();
      } else {
        klass[key] = fn(function() {
          var args = slice.call(arguments, 0, arguments.length - 1);
          var tag  = arguments[arguments.length - 1];
          var instance = ctor.apply(null, args);
          if (instance instanceof UGen) {
            instance.tag = tag || "";
          }
          return instance;
        }).defaults(defaults).multiCall(multiCall).build();
      }
    });
  };
  
  
  // exports for prototype extending
  cc.UGen = UGen;
  cc.MultiOutUGen = MultiOutUGen;
  cc.registerUGen = registerUGen;
  
  module.exports = {
    UGen        : UGen,
    MultiOutUGen: MultiOutUGen,
    OutputProxy : OutputProxy,
    
    use: function() {
      cc.createUGen = function() {
        return new UGen();
      };
      cc.createOutputProxy = function(rate, source, index) {
        return new OutputProxy(rate, source, index);
      };
      cc.instanceOfUGen = function(obj) {
        return obj instanceof UGen;
      };
      cc.instanceOfMultiOutUGen = function(obj) {
        return obj instanceof MultiOutUGen;
      };
      cc.instanceOfOutputProxy = function(obj) {
        return obj instanceof OutputProxy;
      };
      cc.setSynthDef = function(func) {
        if (func && addToSynthDef !== null) {
          throw new Error("nested Synth.def");
        }
        addToSynthDef = func;
      };
      
      require("./uop");
      require("./bop");
      require("./madd");
      require("./inout");
      require("./mix");
      
      // redefinition for tests
      cc.UGen = UGen;
      cc.MultiOutUGen = MultiOutUGen;
      cc.registerUGen = registerUGen;
    }
  };
  
  require("./bufio");
  require("./delay");
  require("./filter");
  require("./inout");
  require("./line");
  require("./osc");
  require("./pan");
  require("./ui");
  
  Object.keys(specs).forEach(function(name) {
    registerUGen(name, specs[name]);
  });
  
  module.exports.use();

});
define('cc/lang/ugen/uop', function(require, exports, module) {

  var cc = require("../cc");
  var extend = require("../../common/extend");
  var ops    = require("../../common/ops");
  
  var UnaryOpUGen = (function() {
    function UnaryOpUGen() {
      cc.UGen.call(this, "UnaryOpUGen");
    }
    extend(UnaryOpUGen, cc.UGen);

    UnaryOpUGen.prototype.init = function(selector, a) {
      var index = ops.UNARY_OP_UGEN_MAP.indexOf(selector);
      if (index === -1) {
        throw new TypeError("UnaryOpUGen: unknown operator '" + selector + "'");
      }
      var rate = a.rate|0;
      cc.UGen.prototype.init.call(this, rate);
      this.selector = selector;
      this.specialIndex = index;
      this.inputs = [a];
      this.numOfInputs = 1;
      return this;
    };

    return UnaryOpUGen;
  })();
  
  
  module.exports = {
    use: function() {
      cc.createUnaryOpUGen = function(selector, a) {
        return new UnaryOpUGen().init(selector, a);
      };
      cc.instanceOfUnaryOpUGen = function(obj) {
        return obj instanceof UnaryOpUGen;
      };
    }
  };

  module.exports.use();

});
define('cc/lang/ugen/bop', function(require, exports, module) {

  var cc = require("../cc");
  var extend = require("../../common/extend");
  var ops    = require("../../common/ops");
  var fn     = require("../fn");
  var utils  = require("../utils");
  
  var BinaryOpUGen = (function() {
    function BinaryOpUGen() {
      cc.UGen.call(this, "BinaryOpUGen");
    }
    extend(BinaryOpUGen, cc.UGen);
    
    BinaryOpUGen.prototype.init = function(selector, a, b) {
      if (selector === "-" && typeof b === "number") {
        selector = "+";
        b = -b;
      }
      if (selector === "/" && typeof b === "number") {
        selector = "*";
        b = 1 / b; // TODO: div(0) ?
      }
      if (selector === "*") {
        if (typeof a === "number" && typeof b === "number") {
          return a * b;
        } else if (a === 0 || b === 0) {
          return 0;
        }
        return optimizeMulObjects(a, b);
      }
      if (selector === "+") {
        if (typeof a === "number" && typeof b === "number") {
          return a + b;
        } else if (a === 0) {
          return b;
        } else if (b === 0) {
          return a;
        } else if (cc.instanceOfBinaryOpUGen(a)) {
          if (a.selector === "*") {
            return cc.createMulAdd(a.inputs[0], a.inputs[1], b);
          }
        } else if (cc.instanceOfMulAdd(a)) {
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
      
      var index = ops.BINARY_OP_UGEN_MAP.indexOf(selector);
      if (index === -1) {
        throw new TypeError("BinaryOpUGen: unknown operator '" + selector + "'");
      }
      var rate = Math.max(a.rate|0, b.rate|0);
      cc.UGen.prototype.init.call(this, rate);
      this.selector = selector;
      this.specialIndex = index;
      this.inputs = [a, b];
      this.numOfInputs = 2;
      return this;
    };

    return BinaryOpUGen;
  })();
  
  var optimizeSumObjects = (function() {
    var collect = function(obj) {
      if (typeof obj === "number") {
        return obj;
      }
      var i = obj.inputs;
      if (cc.instanceOfBinaryOpUGen(obj) && obj.selector === "+") {
        return [ collect(i[0]), collect(i[1]) ];
      } else if (cc.instanceOfSum3(obj)) {
        return [ collect(i[0]), collect(i[1]), collect(i[2]) ];
      } else if (cc.instanceOfSum4(obj)) {
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
      case 3: return cc.createSum4(a[0], a[1], a[2]);
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
      return work(list);
    };
  })();
  
  var optimizeMulObjects = (function() {
    var collect = function(obj) {
      if (typeof obj === "number") { return obj; }
      var i = obj.inputs;
      if (cc.instanceOfBinaryOpUGen(obj) && obj.selector === "*") {
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
  
  
  module.exports = {
    use: function() {
      cc.createBinaryOpUGen = fn(function(selector, a, b) {
        return new BinaryOpUGen().init(selector, a, b);
      }).multiCall().build();
      cc.instanceOfBinaryOpUGen = function(obj) {
        return obj instanceof BinaryOpUGen;
      };
    }
  };
  
  module.exports.use();

});
define('cc/lang/ugen/madd', function(require, exports, module) {
  
  var cc = require("../cc");
  var extend = require("../../common/extend");
  var fn     = require("../fn");
  
  var asRate = function(obj) {
    if (Array.isArray(obj)) {
      return obj.reduce(function(rate, obj) {
        return Math.max(rate, asRate(obj));
      }, 0);
    }
    return (obj && obj.rate) || 0;
  };
  
  var MulAdd = (function() {
    function MulAdd() {
      cc.UGen.call(this, "MulAdd");
    }
    extend(MulAdd, cc.UGen);

    MulAdd.prototype.init = function(_in, mul, add) {
      var t, minus, nomul, noadd, rate;
      if (_in.rate - mul.rate < 0) {
        t = _in; _in = mul; mul = t;
      }
      if (mul === 0) {
        return add;
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
      if (validate(_in, mul, add)) {
        rate = asRate([_in, mul, add]);
        return cc.UGen.prototype.init.apply(this, [rate, _in, mul, add]);
      }
      if (validate(mul, _in, add)) {
        rate = asRate([mul, _in, add]);
        return cc.UGen.prototype.init.apply(this, [rate, mul, _in, add]);
      }
      return _in * mul + add;
    };
    
    var validate = function(_in, mul, add) {
      _in = asRate(_in);
      mul = asRate(mul);
      add = asRate(add);
      if (_in === 2) {
        return true;
      }
      if (_in === 1 &&
          (mul === 1 || mul === 0) &&
          (add === 1 || add === 0)) {
        return true;
      }
      return false;
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
        return b.rate - a.rate;
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
        return b.rate - a.rate;
      });
      return cc.UGen.prototype.init.apply(this, [rate].concat(sortedArgs));
    };
    
    return Sum4;
  })();
  
  
  module.exports = {
    use: function() {
      cc.createMulAdd = fn(function(_in, mul, add) {
        return new MulAdd().init(_in, mul, add);
      }).multiCall().build();
      cc.createSum3 = fn(function(in0, in1, in2) {
        return new Sum3().init(in0, in1, in2);
      }).multiCall().build();
      cc.createSum4 = fn(function(in0, in1, in2, in3) {
        return new Sum4().init(in0, in1, in2, in3);
      }).multiCall().build();
      cc.instanceOfMulAdd = function(obj) {
        return obj instanceof MulAdd;
      };
      cc.instanceOfSum3 = function(obj) {
        return obj instanceof Sum3;
      };
      cc.instanceOfSum4 = function(obj) {
        return obj instanceof Sum4;
      };
    }
  };

  module.exports.use();

});
define('cc/lang/ugen/inout', function(require, exports, module) {

  var cc = require("../cc");
  var extend = require("../../common/extend");
  var utils = require("../utils");

  var Control = (function() {
    function Control(rate) {
      cc.MultiOutUGen.call(this, "Control");
      this.rate   = rate;
      this.values = null;
    }
    extend(Control, cc.MultiOutUGen);
    Control.prototype.init = function(list) {
      cc.UGen.prototype.init.apply(this, [this.rate].concat(list));
      this.values = list.slice();
      return this.initOutputs(this.values.length, this.rate);
    };
    return Control;
  })();
  
  cc.ugen.specs.In = {
    ar: {
      defaults: "bus=0,numChannels=1",
      ctor: function(bus, numChannels) {
        this.init.call(this, 2);
        this.inputs = [ bus ];
        return this.initOutputs(numChannels, this.rate);
      },
      Klass: cc.MultiOutUGen
    },
    kr: {
      defaults: "bus=0,numChannels=1",
      ctor: function(bus, numChannels) {
        this.init.call(this, 1);
        this.inputs = [ bus ];
        return this.initOutputs(numChannels, this.rate);
      },
      Klass: cc.MultiOutUGen
    }
  };
  
  
  var Out = (function() {
    function Out() {
      cc.UGen.call(this, "Out");
    }
    extend(Out, cc.UGen);
    return Out;
  })();
  
  var out_ctor = function(rate) {
    function ctor(bus, channelsArray) {
      if (!(cc.instanceOfUGen(bus) || typeof bus === "number")) {
        throw new TypeError("Out: arguments[0] should be an UGen or a number.");
      }
      if (!Array.isArray(channelsArray)) {
        channelsArray = [ channelsArray ];
      }
      channelsArray = utils.flatten(channelsArray);
      channelsArray = channelsArray.filter(function(x) {
        return x !== 0;
      });
      if (channelsArray.length) {
        cc.UGen.prototype.init.apply(new Out(), [rate, bus].concat(channelsArray));
      }
    }
    return function(bus, channelsArray) {
      if (Array.isArray(bus)) {
        bus.forEach(function(bus) {
          ctor(bus, channelsArray);
        });
      } else {
        ctor(bus, channelsArray);
      }
      return 0; // Out has no output
    };
  };
  
  cc.ugen.specs.Out = {
    ar: {
      defaults: "bus=0,channelsArray=0",
      ctor: out_ctor(2),
      multiCall: false,
      Klass: null
    },
    kr: {
      defaults: "bus=0,channelsArray=0",
      ctor: out_ctor(1),
      multiCall: false,
      Klass: null
    }
  };
  
  module.exports = {
    use: function() {
      cc.createControl = function(rate) {
        return new Control(rate);
      };
      cc.instanceOfOut = function(obj) {
        return obj instanceof Out;
      };
    }
  };

  module.exports.use();

});
define('cc/lang/ugen/mix', function(require, exports, module) {

  var cc = require("../cc");
  var utils = require("../utils");
  
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
  cc.global.Mix.fill = function(n, func) {
    n = n|0;
    var array = new Array(n);
    for (var i = 0; i < n; ++i) {
      array[i] = func(i);
    }
    return mix(array);
  };
  cc.global.Mix.ar = function() {
  };
  
  module.exports = {};

});
define('cc/lang/ugen/bufio', function(require, exports, module) {

  var cc = require("../cc");
  
  var slice = [].slice;

  var playbuf_ctor = function(rate) {
    return function(numChannels, buffer) {
      if (typeof numChannels !== "number") {
        throw new TypeError("Buffer: arguments[0] should be an integer.");
      }
      if (!cc.instanceOfAudioBuffer(buffer)) {
        throw new TypeError("Buffer: arguments[1] should be a buffer.");
      }
      numChannels = Math.max(0, numChannels|0);
      this.init.apply(this, [rate].concat(slice.call(arguments, 1)));
      this.specialIndex = buffer._bufId;
      return this.initOutputs(numChannels, this.rate);
    };
  };
  
  cc.ugen.specs.PlayBuf = {
    ar: {
      defaults: "numChannels=0,buffer,rate=1,trigger=1,startPos=0,loop=0,doneAction=0",
      ctor: playbuf_ctor(2),
      Klass: cc.MultiOutUGen
    },
    kr: {
      defaults: "numChannels=0,buffer,rate=1,trigger=1,startPos=0,loop=0,doneAction=0",
      ctor: playbuf_ctor(1),
      Klass: cc.MultiOutUGen
    },
  };
  
  module.exports = {};

});
define('cc/lang/ugen/delay', function(require, exports, module) {
  
  var cc = require("../cc");
  
  var Comb = {
    ar: {
      defaults: "in=0,maxdelaytime=0.2,delaytime=0.2,decaytime=1,mul=1,add=0",
      ctor: function(_in, maxdelaytime, delaytime, decaytime, mul, add) {
        return this.init(2, _in, maxdelaytime, delaytime, decaytime).madd(mul, add);
      }
    },
    kr: {
      defaults: "in=0,maxdelaytime=0.2,delaytime=0.2,decaytime=1,mul=1,add=0",
      ctor: function(_in, maxdelaytime, delaytime, decaytime, mul, add) {
        return this.init(2, _in, maxdelaytime, delaytime, decaytime).madd(mul, add);
      }
    },
  };
  cc.ugen.specs.CombN = Comb;
  cc.ugen.specs.CombL = Comb;
  cc.ugen.specs.CombC = Comb;
  
  module.exports = {};

});
define('cc/lang/ugen/filter', function(require, exports, module) {

  var cc = require("../cc");
  
  cc.ugen.specs.RLPF = {
    ar: {
      defaults: "in=0,freq=440,rq=1,mul=1,add=0",
      ctor: function(_in, freq, rq, mul, add) {
        return this.init(2, _in, freq, rq).madd(mul, add);
      }
    },
    kr: {
      defaults: "in=0,freq=440,rq=1,mul=1,add=0",
      ctor: function(_in, freq, rq, mul, add) {
        return this.init(1, _in, freq, rq).madd(mul, add);
      }
    }
  };
  
  cc.ugen.specs.RHPF = cc.ugen.specs.RLPF;
  
  module.exports = {};

});
define('cc/lang/ugen/line', function(require, exports, module) {
  
  var cc = require("../cc");
  
  cc.ugen.specs.Line = {
    ar: {
      defaults: "start=0,end=1,dur=1,mul=1,add=0,doneAction=0",
      ctor: function(start, end, dur, mul, add, doneAction) {
        return this.init(2, start, end, dur, doneAction).madd(mul, add);
      }
    },
    kr: {
      defaults: "start=0,end=1,dur=1,mul=1,add=0,doneAction=0",
      ctor: function(start, end, dur, mul, add, doneAction) {
        return this.init(1, start, end, dur, doneAction).madd(mul, add);
      }
    }
  };
  
  module.exports = {};

});
define('cc/lang/ugen/osc', function(require, exports, module) {
  
  var cc = require("../cc");
  
  cc.ugen.specs.SinOsc = {
    ar: {
      defaults: "freq=440,phase=0,mul=1,add=0",
      ctor: function(freq, phase, mul, add) {
        return this.init(2, freq, phase).madd(mul, add);
      }
    },
    kr: {
      defaults: "freq=440,phase=0,mul=1,add=0",
      ctor: function(freq, phase, mul, add) {
        return this.init(1, freq, phase).madd(mul, add);
      }
    }
  };

  cc.ugen.specs.SinOscFB = {
    ar: {
      defaults: "freq=440,feedback=0,mul=1,add=0",
      ctor: function(freq, feedback, mul, add) {
        return this.init(2, freq, feedback).madd(mul, add);
      }
    },
    kr: {
      defaults: "freq=440,feedback=0,mul=1,add=0",
      ctor: function(freq, feedback, mul, add) {
        return this.init(1, freq, feedback).madd(mul, add);
      }
    }
  };
  
  cc.ugen.specs.LFSaw = {
    ar: {
      defaults: "freq=440,iphase=0,mul=1,add=0",
      ctor: function(freq, iphase, mul, add) {
        return this.init(2, freq, iphase).madd(mul, add);
      }
    },
    kr: {
      defaults: "freq=440,iphase=0,mul=1,add=0",
      ctor: function(freq, iphase, mul, add) {
        return this.init(1, freq, iphase).madd(mul, add);
      }
    }
  };

  cc.ugen.specs.LFPar = cc.ugen.specs.LFSaw;
  cc.ugen.specs.LFCub = cc.ugen.specs.LFSaw;
  cc.ugen.specs.LFTri = cc.ugen.specs.LFSaw;

  cc.ugen.specs.LFPulse = {
    ar: {
      defaults: "freq=440,iphase=0,width=0.5,mul=1,add=0",
      ctor: function(freq, iphase, width, mul, add) {
        return this.init(2, freq, iphase, width).madd(mul, add);
      }
    },
    kr: {
      defaults: "freq=440,iphase=0,width=0.5,mul=1,add=0",
      ctor: function(freq, iphase, width, mul, add) {
        return this.init(1, freq, iphase, width).madd(mul, add);
      }
    }
  };
  
  module.exports = {};

});
define('cc/lang/ugen/pan', function(require, exports, module) {

  var cc = require("../cc");
  
  var pan2_ctor = function(rate) {
    return function(_in, pos, level) {
      this.init.call(this, rate, _in, pos, level);
      this.channels = [
        cc.createOutputProxy(this.rate, this, 0),
        cc.createOutputProxy(this.rate, this, 1),
      ];
      this.numOfOutputs = 2;
      return this.channels;
    };
  };
  
  cc.ugen.specs.Pan2 = {
    ar: {
      defaults: "in=0,pos=0,level=1",
      ctor: pan2_ctor(2),
      Klass: cc.MultiOutUGen
    },
    kr: {
      defaults: "in=0,pos=0,level=1",
      ctor: pan2_ctor(1),
      Klass: cc.MultiOutUGen
    },
  };
  
  module.exports = {};

});
define('cc/lang/ugen/ui', function(require, exports, module) {
  
  var cc = require("../cc");
  
  var MouseXY = {
    kr: {
      defaults: "minval=0,maxval=1,warp=0,lag=0.2",
      ctor: function(minval, maxval, warp, lag) {
        if (warp === "exponential") {
          warp = 1;
        } else if (typeof warp !== "number") {
          warp = 0;
        }
        return this.init(1, minval, maxval, warp, lag);
      }
    }
  };
  cc.ugen.specs.MouseX = MouseXY;
  cc.ugen.specs.MouseY = MouseXY;
  
  cc.ugen.specs.MouseButton = {
    kr: {
      defaults: "minval=0,maxval=1,lag=0.2",
      ctor: function(minval, maxval, lag) {
        return this.init(1, minval, maxval, lag);
      }
    }
  };
  
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
      this.taskManager.process();
      var timelineResult = this.timelineResult.splice(0);
      this.sendToServer(["/processed", timelineResult]);
    };
    
    return WorkerSynthLang;
  })();
  
  module.exports = {
    use: function() {
      cc.createWorkerSynthLang = function() {
        var lang = new WorkerSynthLang();
        global.onmessage = onmessage;
        return lang;
      };
    }
  };
  
  module.exports.use();

});
define('cc/lang/lang-iframe', function(require, exports, module) {

  var cc = require("./cc");
  var extend = require("../common/extend");
  var onmessage = require("./utils").lang_onmessage;
  
  var IFrameSynthLang = (function() {
    function IFrameSynthLang() {
      cc.opmode = "iframe";
      require("../common/browser");
      
      cc.SynthLang.call(this);
      
      var that = this;
      this.sampleRate = 44100;
      this.channels   = 2;
      this.strmLength = 2048;
      this.bufLength  = 128;
      this.server = cc.createWebWorker(cc.coffeeColliderPath);
      this.server.onmessage = function(e) {
        that.recvFromServer(e.data);
      };
    }
    extend(IFrameSynthLang, cc.SynthLang);
    
    IFrameSynthLang.prototype.sendToServer = function(msg) {
      this.server.postMessage(msg);
    };
    IFrameSynthLang.prototype.process = function() {
      var taskManager = this.taskManager;
      var n = this.strmLength / this.bufLength;
      var timelineResult = [];
      while (n--) {
        taskManager.process();
        timelineResult = timelineResult.concat(
          this.timelineResult.splice(0), 0
        );
      }
      this.sendToServer(["/processed", timelineResult]);
    };

    IFrameSynthLang.prototype.extendCommands = function(commands) {
      require("../common/console").bind(commands);
    };
    
    return IFrameSynthLang;
  })();

  module.exports = {
    use: function() {
      cc.createIFrameSynthLang = function() {
        var lang = new IFrameSynthLang();
        if (typeof window !== "undefined") {
          window.onmessage = function(e) {
            e.ports[0].onmessage = onmessage;
            lang.sendToClient = function(msg) {
              e.ports[0].postMessage(msg);
            };
            window.onmessage = null;
          };
        }
        return lang;
      };
    }
  };

  module.exports.use();

});
define('cc/common/browser', function(require, exports, module) {

  var cc = require("../cc");
  
  module.exports = {
    use: function() {
      cc.createWebWorker = function(path) {
        return new Worker(path);
      };
      cc.createWebSocket = function(path) {
        return new WebSocket(path);
      };
      cc.createXMLHttpRequest = function() {
        return new XMLHttpRequest();
      };
      cc.createMessageChannel = function() {
        return new MessageChannel();
      };
      cc.createHTMLIFrameElement = function() {
        var iframe = document.createElement("iframe");
        iframe.style.width  = 0;
        iframe.style.height = 0;
        iframe.style.border = 0;
        document.body.appendChild(iframe);
        return iframe;
      };
    }
  };

  module.exports.use();

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
      this.taskManager.process();
      var timelineResult = this.timelineResult.splice(0);
      this.sendToServer(["/processed", timelineResult]);
    };
    
    return NodeJSSynthLang;
  })();
  
  module.exports = {
    use: function() {
      cc.createNodeJSSynthLang = function() {
        var lang = new NodeJSSynthLang();
        return lang;
      };
    }
  };
  
  module.exports.use();

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
      this.bufLength  = 128;
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
          this.timelineResult.splice(0), 0
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
define('cc/lang/array', function(require, exports, module) {

  var cc = require("./cc");
  var fn = require("./fn");
  var ops   = require("../common/ops");
  var utils = require("./utils");

  var setupUnaryOp = function(selector) {
    fn.definePrototypeProperty(Array, selector, function() {
      return this.map(function(x) { return x[selector](); });
    });
  };

  setupUnaryOp("__plus__");
  setupUnaryOp("__minus__");
  ops.UNARY_OP_UGEN_MAP.forEach(function(selector) {
    if (/^[a-z][a-zA-Z0-9_]*$/.test(selector)) {
      setupUnaryOp(selector);
    }
  });
  
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

  var setupBinaryOp = function(selector) {
    var ugenSelector;
    if (ops.UGEN_OP_ALIASES.hasOwnProperty(selector)) {
      ugenSelector = ops.UGEN_OP_ALIASES[selector];
    } else {
      ugenSelector = selector;
    }
    fn.definePrototypeProperty(Array, selector, function(b, adverb) {
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
  };

  setupBinaryOp("__add__");
  setupBinaryOp("__sub__");
  setupBinaryOp("__mul__");
  setupBinaryOp("__div__");
  setupBinaryOp("__mod__");
  fn.definePrototypeProperty(Array, "__and__", function(b) {
    return cc.createTaskWaitLogic("and", this.concat(b));
  });
  fn.definePrototypeProperty(Array, "__or__", function(b) {
    return cc.createTaskWaitLogic("or", this.concat(b));
  });
  ops.BINARY_OP_UGEN_MAP.forEach(function(selector) {
    if (/^[a-z][a-zA-Z0-9_]*$/.test(selector)) {
      setupBinaryOp(selector);
    }
  });
  
  fn.definePrototypeProperty(Array, "madd", fn(function(mul, add) {
    return utils.flop([this, mul, add]).map(function(items) {
      var _in = items[0], mul = items[1], add = items[2];
      return cc.createMulAdd(_in, mul, add);
    });
  }).defaults("mul=1,add=0").multiCall().build());
  
  cc.global.SHORT = 1;
  cc.global.FOLD  = 2;
  cc.global.TABLE = 3;
  cc.global.FLAT  = 4;
  
  module.exports = {};

});
define('cc/lang/boolean', function(require, exports, module) {

  var cc = require("./cc");
  var fn = require("./fn");

  // unary operator methods
  fn.definePrototypeProperty(Boolean, "__plus__", function() {
    return +this;
  });
  fn.definePrototypeProperty(Boolean, "__minus__", function() {
    return -this;
  });

  // binary operator methods
  fn.definePrototypeProperty(Boolean, "__add__", function(b) {
    return this + b;
  });
  fn.definePrototypeProperty(Boolean, "__sub__", function(b) {
    var num = this - b;
    if (isNaN(num)) {
      return 0; // avoid NaN
    }
    return num;
  });
  fn.definePrototypeProperty(Boolean, "__mul__", function(b) {
    var num = this * b;
    if (isNaN(num)) {
      return 0; // avoid NaN
    }
    return num;
  });
  fn.definePrototypeProperty(Boolean, "__div__", function(b) {
    var num = this / b;
    if (isNaN(num)) {
      return 0; // avoid NaN
    }
    return num;
  });
  fn.definePrototypeProperty(Boolean, "__mod__", function(b) {
    var num = this % b;
    if (isNaN(num)) {
      return 0; // avoid NaN
    }
    return num;
  });
  fn.setupBinaryOp(Boolean, "__and__", function(b) {
    return cc.createTaskWaitLogic("and", [this].concat(b));
  });
  fn.setupBinaryOp(Boolean, "__or__", function(b) {
    return cc.createTaskWaitLogic("or", [this].concat(b));
  });
  
  module.exports = {};

});
define('cc/lang/data', function(require, exports, module) {

  var cc = require("./cc");
  
  cc.global.DATA = {
    get: function(n) {
      return cc.DATA[n] || "";
    }
  };
  
  module.exports = {};

});
define('cc/lang/date', function(require, exports, module) {

  var cc = require("./cc");
  var fn = require("./fn");
  
  // unary operator methods
  fn.definePrototypeProperty(Date, "__plus__", function() {
    return +this;
  });
  fn.definePrototypeProperty(Date, "__minus__", function() {
    return -this;
  });

  // binary operator methods
  fn.definePrototypeProperty(Date, "__add__", function(b) {
    return this + b;
  });
  fn.definePrototypeProperty(Date, "__sub__", function(b) {
    var num = this - b;
    if (isNaN(num)) {
      return 0; // avoid NaN
    }
    return num;
  });
  fn.definePrototypeProperty(Date, "__mul__", function(b) {
    var num = this * b;
    if (isNaN(num)) {
      return 0; // avoid NaN
    }
    return num;
  });
  fn.definePrototypeProperty(Date, "__div__", function(b) {
    var num = this / b;
    if (isNaN(num)) {
      return 0; // avoid NaN
    }
    return num;
  });
  fn.definePrototypeProperty(Date, "__mod__", function(b) {
    var num = this % b;
    if (isNaN(num)) {
      return 0; // avoid NaN
    }
    return num;
  });
  fn.setupBinaryOp(Date, "__and__", function(b) {
    return cc.createTaskWaitLogic("and", [this].concat(b));
  });
  fn.setupBinaryOp(Date, "__or__", function(b) {
    return cc.createTaskWaitLogic("or", [this].concat(b));
  });
  
  module.exports = {};

});
define('cc/lang/function', function(require, exports, module) {

  var cc = require("./cc");
  var fn = require("./fn");

  // unary operator methods
  fn.definePrototypeProperty(Function, "__plus__", function() {
    return 0; // avoid NaN
  });
  fn.definePrototypeProperty(Function, "__minus__", function() {
    return 0; // avoid NaN
  });

  // binary operator methods
  fn.definePrototypeProperty(Function, "__add__", function(b) {
    return this.toString() + b;
  });
  fn.definePrototypeProperty(Function, "__sub__", function() {
    return 0; // avoid NaN
  });
  fn.definePrototypeProperty(Function, "__mul__", function(b) {
    if (typeof b === "function") {
      var f = this, g = b;
      return function() {
        return f.call(null, g.apply(null, arguments));
      };
    }
    return 0; // avoid NaN
  });
  fn.definePrototypeProperty(Function, "__div__", function() {
    return 0; // avoid NaN
  });
  fn.definePrototypeProperty(Function, "__mod__", function() {
    return 0; // avoid NaN
  });
  fn.setupBinaryOp(Function, "__and__", function(b) {
    return cc.createTaskWaitLogic("and", [this].concat(b));
  });
  fn.setupBinaryOp(Function, "__or__", function(b) {
    return cc.createTaskWaitLogic("or", [this].concat(b));
  });
  
  module.exports = {};

});
define('cc/lang/number', function(require, exports, module) {

  var cc = require("./cc");
  var fn = require("./fn");
  
  // unary operator methods
  fn.definePrototypeProperty(Number, "__plus__", function() {
    return +this;
  });
  fn.definePrototypeProperty(Number, "__minus__", function() {
    return -this;
  });
  fn.definePrototypeProperty(Number, "neg", function() {
    return -this;
  });
  fn.definePrototypeProperty(Number, "not", function() {
    return this === 0 ? 1 : 0;
  });
  fn.definePrototypeProperty(Number, "abs", function() {
    return Math.abs(this);
  });
  fn.definePrototypeProperty(Number, "ceil", function() {
    return Math.ceil(this);
  });
  fn.definePrototypeProperty(Number, "floor", function() {
    return Math.floor(this);
  });
  fn.definePrototypeProperty(Number, "frac", function() {
    if (this < 0) {
      return 1 + (this - (this|0));
    }
    return this - (this|0);
  });
  fn.definePrototypeProperty(Number, "sign", function() {
    if (this === 0) {
      return 0;
    } else if (this > 0) {
      return 1;
    }
    return -1;
  });
  fn.definePrototypeProperty(Number, "squared", function() {
    return this * this;
  });
  fn.definePrototypeProperty(Number, "cubed", function() {
    return this * this * this;
  });
  fn.definePrototypeProperty(Number, "sqrt", function() {
    return Math.sqrt(Math.abs(this));
  });
  fn.definePrototypeProperty(Number, "exp", function() {
    return Math.exp(this);
  });
  fn.definePrototypeProperty(Number, "reciprocal", function() {
    return 1 / this;
  });
  fn.definePrototypeProperty(Number, "midicps", function() {
    return 440 * Math.pow(2, (this - 69) * 1/12);
  });
  fn.definePrototypeProperty(Number, "cpsmidi", function() {
    return Math.log(Math.abs(this) * 1/440) * Math.LOG2E * 12 + 69;
  });
  fn.definePrototypeProperty(Number, "midiratio", function() {
    return Math.pow(2, this * 1/12);
  });
  fn.definePrototypeProperty(Number, "ratiomidi", function() {
    return Math.log(Math.abs(this)) * Math.LOG2E * 12;
  });
  fn.definePrototypeProperty(Number, "dbamp", function() {
    return Math.pow(10, this * 0.05);
  });
  fn.definePrototypeProperty(Number, "ampdb", function() {
    return Math.log(Math.abs(this)) * Math.LOG10E * 20;
  });
  fn.definePrototypeProperty(Number, "octcps", function() {
    return 440 * Math.pow(2, this - 4.75);
  });
  fn.definePrototypeProperty(Number, "cpsoct", function() {
    return Math.log(Math.abs(this) * 1/440) * Math.LOG2E + 4.75;
  });
  fn.definePrototypeProperty(Number, "log", function() {
    return Math.log(Math.abs(this));
  });
  fn.definePrototypeProperty(Number, "log2", function() {
    return Math.log(Math.abs(this)) * Math.LOG2E;
  });
  fn.definePrototypeProperty(Number, "log10", function() {
    return Math.log(Math.abs(this)) * Math.LOG10E;
  });
  fn.definePrototypeProperty(Number, "sin", function() {
    return Math.sin(this);
  });
  fn.definePrototypeProperty(Number, "cos", function() {
    return Math.cos(this);
  });
  fn.definePrototypeProperty(Number, "tan", function() {
    return Math.tan(this);
  });
  fn.definePrototypeProperty(Number, "asin", function() {
    return Math.asin(Math.max(-1, Math.min(this, 1)));
  });
  fn.definePrototypeProperty(Number, "acos", function() {
    return Math.acos(Math.max(-1, Math.min(this, 1)));
  });
  fn.definePrototypeProperty(Number, "atan", function() {
    return Math.atan(this);
  });
  fn.definePrototypeProperty(Number, "sinh", function() {
    return (Math.pow(Math.E, this) - Math.pow(Math.E, -this)) * 0.5;
  });
  fn.definePrototypeProperty(Number, "cosh", function() {
    return (Math.pow(Math.E, this) + Math.pow(Math.E, -this)) * 0.5;
  });
  fn.definePrototypeProperty(Number, "tanh", function() {
    return this.sinh() / this.cosh();
  });
  fn.definePrototypeProperty(Number, "rand", function() {
    return Math.random() * this;
  });
  fn.definePrototypeProperty(Number, "rand2", function() {
    return (Math.random() * 2 - 1) * this;
  });
  fn.definePrototypeProperty(Number, "linrand", function() {
    return Math.min(Math.random(), Math.random()) * this;
  });
  fn.definePrototypeProperty(Number, "bilinrand", function() {
    return (Math.random() - Math.random()) * this;
  });
  fn.definePrototypeProperty(Number, "sum3rand", function() {
    return (Math.random() + Math.random() + Math.random() - 1.5) * 0.666666667 * this;
  });
  fn.definePrototypeProperty(Number, "distort", function() {
    return this / (1 + Math.abs(this));
  });
  fn.definePrototypeProperty(Number, "softclip", function() {
    var absa = Math.abs(this);
    return absa <= 0.5 ? this : (absa - 0.25) / this;
  });
  fn.definePrototypeProperty(Number, "coin", function() {
    return Math.random() < this;
  });
  fn.definePrototypeProperty(Number, "num", function() {
    return +this;
  });
  fn.definePrototypeProperty(Number, "tilde", function() {
    return ~this;
  });
  fn.definePrototypeProperty(Number, "pi", function() {
    return this * Math.PI;
  });
  fn.definePrototypeProperty(Number, "to_i", function() {
    return this|0;
  });
  
  // binary operator methods
  fn.setupBinaryOp(Number, "__add__", function(b) {
    return this + b;
  });
  fn.setupBinaryOp(Number, "__sub__", function(b) {
    return this - b;
  });
  fn.setupBinaryOp(Number, "__mul__", function(b) {
    return this * b;
  });
  fn.setupBinaryOp(Number, "__div__", function(b) {
    if (this === 0 && b === 0) {
      return 0; // avoid NaN
    }
    return this / b;
  });
  fn.setupBinaryOp(Number, "__mod__", function(b) {
    if (b === 0) {
      return 0; // avoid NaN
    }
    return this % b;
  });
  fn.setupBinaryOp(Number, "__and__", function(b) {
    return cc.createTaskWaitLogic("and", [this].concat(b));
  });
  fn.setupBinaryOp(Number, "__or__", function(b) {
    return cc.createTaskWaitLogic("or", [this].concat(b));
  });
  fn.setupBinaryOp(Number, "eq", function(b) {
    return this === b ? 1 : 0;
  });
  fn.setupBinaryOp(Number, "ne", function(b) {
    return this !== b ? 1 : 0;
  });
  fn.setupBinaryOp(Number, "lt", function(b) {
    return this < b ? 1 : 0;
  });
  fn.setupBinaryOp(Number, "gt", function(b) {
    return this > b ? 1 : 0;
  });
  fn.setupBinaryOp(Number, "le", function(b) {
    return this <= b ? 1 : 0;
  });
  fn.setupBinaryOp(Number, "ge", function(b) {
    return this >= b ? 1 : 0;
  });
  fn.setupBinaryOp(Number, "bitAnd", function(b) {
    return this & b;
  });
  fn.setupBinaryOp(Number, "bitOr", function(b) {
    return this | b;
  });
  fn.setupBinaryOp(Number, "bitXor", function(b) {
    return this ^ b;
  });
  fn.setupBinaryOp(Number, "min", function(b) {
    return Math.min(this, b);
  });
  fn.setupBinaryOp(Number, "max", function(b) {
    return Math.max(this, b);
  });
  
  var gcd = function(a, b, t) {
    a = a|0; b = b|0;
    while (b !== 0) {
      t = a % b; a = b; b = t;
    }
    return Math.abs(a);
  };
  fn.setupBinaryOp(Number, "lcm", function(b) {
    if (this === 0 && b === 0) {
      return 0; // avoid NaN
    }
    return Math.abs(this * b) / gcd(this, b);
  });
  fn.setupBinaryOp(Number, "gcd", function(b) {
    return gcd(this, b);
  });
  fn.setupBinaryOp(Number, "round", function(b) {
    if (b === 0) {
      return this; // avoid NaN
    }
    return Math.round(this / b) * b;
  });
  fn.setupBinaryOp(Number, "roundUp", function(b) {
    if (b === 0) {
      return this; // avoid NaN
    }
    return Math.ceil(this / b) * b;
  });
  fn.setupBinaryOp(Number, "roundDown", function(b) {
    if (b === 0) {
      return this; // avoid NaN
    }
    return Math.floor(this / b) * b;
  });
  fn.setupBinaryOp(Number, "trunc", function(b) {
    if (b === 0) {
      return this; // avoid NaN
    }
    return Math.floor(this / b) * b;
  });
  fn.setupBinaryOp(Number, "atan2", function(b) {
    return Math.atan2(this, b);
  });
  fn.setupBinaryOp(Number, "hypot", function(b) {
    return Math.sqrt((this * this) + (b * b));
  });
  fn.setupBinaryOp(Number, "hypotApx", function(b) {
    var x = Math.abs(this), y = Math.abs(b);
    var minxy = Math.min(x, y);
    return x + y - (Math.sqrt(2) - 1) * minxy;
  });
  fn.setupBinaryOp(Number, "pow", function(b) {
    return Math.pow(Math.abs(this), b);
  });
  fn.setupBinaryOp(Number, "leftShift", function(b) {
    if (b < 0) {
      return (this|0) >> (-b|0);
    }
    return (this|0) << (b|0);
  });
  fn.setupBinaryOp(Number, "rightShift", function(b) {
    if (b < 0) {
      return (this|0) << (-b|0);
    }
    return (this|0) >> (b|0);
  });
  fn.setupBinaryOp(Number, "unsignedRightShift", function(b) {
    if (b < 0) {
      return (this|0) << (-b|0);
    }
    return (this|0) >> (b|0);
  });
  fn.setupBinaryOp(Number, "ring1", function(b) {
    return this * b + this;
  });
  fn.setupBinaryOp(Number, "ring2", function(b) {
    return this * b + this + b;
  });
  fn.setupBinaryOp(Number, "ring3", function(b) {
    return this * this * b;
  });
  fn.setupBinaryOp(Number, "ring4", function(b) {
    return this * this * b - this * b * b;
  });
  fn.setupBinaryOp(Number, "difsqr", function(b) {
    return this * this - b * b;
  });
  fn.setupBinaryOp(Number, "sumsqr", function(b) {
    return this * this + b * b;
  });
  fn.setupBinaryOp(Number, "sqrsum", function(b) {
    return (this + b) * (this + b);
  });
  fn.setupBinaryOp(Number, "sqrdif", function(b) {
    return (this - b) * (this - b);
  });
  fn.setupBinaryOp(Number, "absdif", function(b) {
    return Math.abs(this - b);
  });
  fn.setupBinaryOp(Number, "thresh", function(b) {
    return this < b ? 0 : this;
  });
  fn.setupBinaryOp(Number, "amclip", function(b) {
    return this * 0.5 * (b + Math.abs(b));
  });
  fn.setupBinaryOp(Number, "scaleneg", function(b) {
    b = 0.5 * b + 0.5;
    return (Math.abs(this) - this) * b + this;
  });
  fn.setupBinaryOp(Number, "clip2", function(b) {
    return Math.max(-b, Math.min(this, b));
  });
  fn.setupBinaryOp(Number, "excess", function(b) {
    return this - Math.max(-b, Math.min(this, b));
  });
  fn.setupBinaryOp(Number, "fold2", function(b) {
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
  fn.setupBinaryOp(Number, "wrap2", function(b) {
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
  
  // others
  fn.definePrototypeProperty(Number, "madd", fn(function(mul, add) {
    return cc.createMulAdd(this, mul, add);
  }).defaults("mul=1,add=0").multiCall().build());
  
  module.exports = {};

});
define('cc/lang/object', function(require, exports, module) {

  var cc = require("./cc");

  cc.Object.prototype.__and__ = function(b) {
    return cc.createTaskWaitLogic("and", [this].concat(b));
  };
  
  cc.Object.prototype.__or__ = function(b) {
    return cc.createTaskWaitLogic("or", [this].concat(b));
  };
  
  module.exports = {};

});
define('cc/lang/string', function(require, exports, module) {
  
  var fn = require("./fn");
  var utils = require("./utils");
  
  // unary operator methods
  fn.definePrototypeProperty(String, "__plus__", function() {
    var num = +this;
    if (isNaN(num)) {
      return 0; // avoid NaN
    }
    return num;
  });
  fn.definePrototypeProperty(String, "__minus__", function() {
    var num = -this;
    if (isNaN(num)) {
      return 0; // avoid NaN
    }
    return num;
  });
  
  // binary operator methods
  fn.setupBinaryOp(String, "__add__", function(b) {
    return this + b;
  });
  fn.setupBinaryOp(String, "__sub__", function(b) {
    var num = this - b;
    if (isNaN(num)) {
      return 0; // avoid NaN
    }
    return num;
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
  
  fn.setupBinaryOp(String, "__mul__", function(b) {
    if (typeof b === "number") {
      return repeat(this, b);
    }
    return 0; // avoid NaN
  });
  fn.setupBinaryOp(String, "__div__", function(b) {
    if (typeof b === "number") {
      return utils.clump(this.split(""), Math.ceil(this.length/b)).map(function(items) {
        return items.join("");
      });
    }
    return 0; // avoid NaN
  });
  fn.setupBinaryOp(String, "__mod__", function(b) {
    if (typeof b === "number") {
      return utils.clump(this.split(""), Math.floor(b)).map(function(items) {
        return items.join("");
      });
    }
    return 0; // avoid NaN
  });
  
  module.exports = {};

});
define('cc/client/client', function(require, exports, module) {

  var cc = require("../cc");
  var emitter  = require("../common/emitter");
  var unpack   = require("../common/pack").unpack;
  var commands = {};
  var slice    = [].slice;
  
  var SynthClient = (function() {
    function SynthClient(opts) {
      emitter.mixin(this);
      opts = opts || {};
      this.version = cc.version;
      if (opts.socket) {
        this.impl = cc.createSynthClientSocketImpl(this, opts);
      } else if (opts.iframe) {
        this.impl = cc.createSynthClientIFrameImpl(this, opts);
      } else if (opts.nodejs) {
        this.impl = cc.createSynthClientNodeJSImpl(this, opts);
      } else {
        this.impl = cc.createSynthClientWorkerImpl(this, opts);
      }
      this.sampleRate = this.impl.sampleRate;
      this.channels   = this.impl.channels;
    }
    
    SynthClient.prototype.play = function() {
      this.impl.play();
      return this;
    };
    SynthClient.prototype.pause = function() {
      this.impl.pause();
      return this;
    };
    SynthClient.prototype.reset = function() {
      this.impl.reset();
      return this;
    };
    SynthClient.prototype.execute = function() {
      this.impl.execute.apply(this.impl, arguments);
      return this;
    };
    SynthClient.prototype.getStream = function() {
      return this.impl.getStream();
    };
    SynthClient.prototype.importScripts = function() {
      this.impl.importScripts(slice.call(arguments));
      return this;
    };
    SynthClient.prototype.getWebAudioComponents = function() {
      return this.impl.getWebAudioComponents();
    };
    
    return SynthClient;
  })();

  var SynthClientImpl = (function() {
    function SynthClientImpl(exports, opts) {
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
      this.strmList = new Array(16);
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
        }, false);
        window.addEventListener("mousedown", function() {
          f32_syncItems[4] = 1;
        }, false);
        window.addEventListener("mouseup", function() {
          f32_syncItems[4] = 0;
        }, false);
      }
      this.syncItems = syncItems;
      this.syncItemsUInt32 = new Uint32Array(syncItems.buffer);
    }
    
    SynthClientImpl.prototype.play = function() {
      if (!this.isPlaying) {
        this.isPlaying = true;
        this.sendToLang(["/play"]);
      }
    };
    SynthClientImpl.prototype._played = function(syncCount) {
      if (this.api) {
        var strm = this.strm;
        for (var i = 0, imax = strm.length; i < imax; ++i) {
          strm[i] = 0;
        }
        this.strmList.splice(0);
        this.strmListReadIndex  = 0;
        this.strmListWriteIndex = 0;
        this.syncCount = syncCount;
        this.api.play();
      }
      this.exports.emit("play");
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
      this.exports.emit("pause");
    };
    SynthClientImpl.prototype.reset = function() {
      this.execId = 0;
      this.execCallbacks = {};
      var strm = this.strm;
      for (var i = 0, imax = strm.length; i < imax; ++i) {
        strm[i] = 0;
      }
      this.strmList.splice(0);
      this.strmListReadIndex  = 0;
      this.strmListWriteIndex = 0;
      this.sendToLang(["/reset"]);
      this.exports.emit("reset");
    };
    SynthClientImpl.prototype.process = function() {
      var strm = this.strmList[this.strmListReadIndex & 15];
      if (strm) {
        this.strmListReadIndex += 1;
        this.strm.set(strm);
      }
      this.syncCount += 1;
      this.syncItemsUInt32[1] = this.syncCount;
      this.sendToLang(this.syncItems);
    };
    SynthClientImpl.prototype.execute = function(code) {
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
        if (callback) {
          this.execCallbacks[this.execId] = callback;
        }
        this.sendToLang([
          "/execute", this.execId, code, append, this.compiler.data, !!callback
        ]);
        this.execId += 1;
      }
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
        }
      };
    };
    SynthClientImpl.prototype.importScripts = function(list) {
      this.sendToLang(["/importScripts", list]);
    };
    SynthClientImpl.prototype.sendToLang = function(msg) {
      if (this.lang) {
        this.lang.postMessage(msg);
      }
    };
    SynthClientImpl.prototype.recvFromLang = function(msg) {
      if (msg instanceof Int16Array) {
        this.strmList[this.strmListWriteIndex & 15] = msg;
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
      if (this.api) {
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
      }
    };
    SynthClientImpl.prototype.getWebAudioComponents = function() {
      if (this.api && this.api.type === "Web Audio API") {
        return [ this.api.context, this.api.jsNode ];
      }
      return [];
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
      "/init", this.sampleRate, this.channels
    ]);
    this.exports.emit("connected");
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
        that.sendToLang(["/buffer/response", buffer, requestId]);
      }
    });
  };
  commands["/socket/sendToClient"] = function(msg) {
    this.exports.emit("message", msg[1]);
  };
  require("../common/console").bind(commands);
  
  cc.SynthClientImpl = SynthClientImpl;
  
  module.exports = {
    SynthClient    : SynthClient,
    SynthClientImpl: SynthClientImpl,
    
    use: function() {
      require("./client-worker");
      require("./client-iframe");
      require("./client-nodejs");
      require("./client-socket");
      require("../common/browser");
      require("../common/audioapi");
      require("./compiler/compiler");
      
      cc.createSynthClient = function(opts) {
        return new SynthClient(opts);
      };
      cc.createSynthClientImpl = function(exports, opts) {
        return new SynthClientImpl(exports, opts);
      };
    }
  };

  module.exports.use();

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
  
  module.exports = {
    use: function() {
      cc.createSynthClientWorkerImpl = function(exports, opts) {
        return new SynthClientWorkerImpl(exports, opts);
      };
    }
  };
  
  module.exports.use();
  
});
define('cc/client/client-iframe', function(require, exports, module) {

  var cc = require("../cc");
  var extend = require("../common/extend");
  
  var SynthClientIFrameImpl = (function() {
    function SynthClientIFrameImpl(exports, opts) {
      cc.opmode = "iframe";
      this.strmLength = 2048;
      this.bufLength  = 128;
      
      cc.SynthClientImpl.call(this, exports, opts);
      
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
        that.recvFromLang(e.data);
      };
      this.lang = channel.port1;
    }
    extend(SynthClientIFrameImpl, cc.SynthClientImpl);
    
    return SynthClientIFrameImpl;
  })();
  
  module.exports = {
    use: function() {
      cc.createSynthClientIFrameImpl = function(exports, opts) {
        return new SynthClientIFrameImpl(exports, opts);
      };
    }
  };

  module.exports.use();

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
  
  module.exports = {
    use: function() {
      cc.createSynthClientNodeJSImpl = function(exports, opts) {
        return new SynthClientNodeJSImpl(exports, opts);
      };
    }
  };

  module.exports.use();

});
define('cc/client/client-socket', function(require, exports, module) {

  var cc = require("../cc");
  var extend = require("../common/extend");

  var SynthClientSocketImpl = (function() {
    function SynthClientSocketImpl(exports, opts) {
      cc.opmode = "socket";
      this.strmLength = 4096;
      this.bufLength  = 128;
      
      cc.SynthClientImpl.call(this, exports, opts);
      
      var that = this;
      var iframe = this.iframe = cc.createHTMLIFrameElement();
      iframe.sandbox = "allow-scripts";
      iframe.srcdoc = "<script src='" + cc.coffeeColliderPath + "#socket'></script>";
      var channel = cc.createMessageChannel();
      iframe.onload = function() {
        iframe.contentWindow.postMessage(opts.socket, [channel.port2], "*");
      };
      channel.port1.onmessage = function(e) {
        that.recvFromLang(e.data);
      };
      this.lang = channel.port1;
      
      exports.socket = {
        open: function() {
          that.sendToLang([ "/socket/open" ]);
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
  
  module.exports = {
    use: function() {
      cc.createSynthClientSocketImpl = function(exports, opts) {
        return new SynthClientSocketImpl(exports, opts);
      };
    }
  };
  
  module.exports.use();
  
});
define('cc/common/audioapi', function(require, exports, module) {
  
  var cc = require("../cc");
  
  require("./audioapi-webaudio");
  require("./audioapi-audiodata");
  require("./audioapi-flashfallback");
  require("./audioapi-nodeaudio");
  
  module.exports = {
    use: function() {
      cc.createAudioAPI = function(sys, opts) {
        return cc.createWebAudioAPI(sys, opts) ||
          cc.createAudioDataAPI(sys, opts) ||
          cc.createFlashAudioAPI(sys, opts) ||
          cc.createNodeAudioAPI(sys, opts);
      };
    }
  };
  
  module.exports.use();

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
            samples    : samples,
          });
        };
        return WebAudioAPI;
      })();
    }
  }
  
  module.exports = {
    use: function() {
      cc.createWebAudioAPI = function(sys, opts) {
        if (AudioAPI) {
          return new AudioAPI(sys, opts);
        }
      };
    }
  };
  
  module.exports.use();
  
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
  
  module.exports = {
    use: function() {
      cc.createAudioDataAPI = function(sys, opts) {
        if (AudioAPI) {
          return new AudioAPI(sys, opts);
        }
      };
    }
  };
  
  module.exports.use();

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
  
  module.exports = {
    use: function() {
      cc.createFlashAudioAPI = function(sys, opts) {
        if (AudioAPI) {
          return new AudioAPI(sys, opts);
        }
      };
    }
  };

  module.exports.use();
  
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
  
  module.exports = {
    use: function() {
      cc.createNodeAudioAPI = function(sys, opts) {
        if (AudioAPI) {
          return new AudioAPI(sys, opts);
        }
      };
    }
  };

  module.exports.use();

});
define('cc/client/compiler/compiler', function(require, exports, module) {

  var cc = require("../../cc");
  
  var use = function() {
    require("./coffee");
    
    cc.createCompiler = function(lang) {
      if (lang === "coffee") {
        return cc.createCoffeeCompiler();
      }
      throw new TypeError("Compiler: '" + lang + "' not supported");
    };
  };
  
  module.exports = {
    use:use
  };

  module.exports.use();

});
define('cc/client/compiler/coffee', function(require, exports, module) {

  var CoffeeScript = global.CoffeeScript || global.require("coffee-script");
  
  var cc = require("../../cc");
  var timevalue = require("../../common/timevalue").calc;
  
  // CoffeeScript tags
  // IDENTIFIER
  // NUMBER
  // STRING
  // REGEX
  // BOOL
  // NULL
  // UNDEFINED
  // COMPOUND_ASSIGN -=, +=, div=, *=, %=, ||=, &&=, ?=, <<=, >>=, >>>=, &=, ^=, |=
  // UNARY           !, ~, new, typeof, delete, do
  // LOGIC           &&, ||, &, |, ^
  // SHIFT           <<, >>, >>>
  // COMPARE         ==, !=, <, >, <=, >=
  // MATH            *, div, %, 
  // RELATION        in, of, instanceof
  // =
  // +
  // -
  // ..
  // ...
  // ++
  // --
  // (
  // )
  // [
  // ]
  // {
  // }
  // ?
  // ::
  // @
  // IF
  // ELSE
  // WHILE
  // LOOP
  // SWITCH
  // LEADING_WHEN
  // THIS
  // SUPER
  // INDENT
  // OUTDENT
  // RETURN
  // TERMINATOR
  // HERECOMMENT

  var TAG   = 0;
  var VALUE = 1;
  var _     = {}; // empty location

  // utility functions
  var isDot = function(token) {
    return !!token && (token[TAG] === "." || token[TAG] === "@");
  };
  
  var getIdentifier = function(token) {
    var val = token[VALUE];
    if (val.reserved) {
      return val[0] + val[1] + (val[2]||"") + (val[3]||"") + (val[4]||"") +
        (val[5]||"") + (val[6]||"") + (val[7]||"");
    }
    return val;
  };
  
  var getLine = function(tokens, index) {
    var depth = 0;
    var result = { tokens:tokens, begin:index, end:-1, len:0, isLastLine:false };
    for (var i = index, imax = tokens.length; i < imax; ++i) {
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
          result.end = i;
        }
        break;
      case "INDENT":
        depth += 1;
        break;
      case "OUTDENT":
        depth -= 1;
        if (depth === -1) {
          result.end = i - 1;
          result.isLastLine = true;
        }
        break;
      }
      if (result.end !== -1) {
        break;
      }
    }
    if (result.end === -1) {
      result.end = tokens.length - 1;
    }
    result.len = result.end - result.begin + 1;
    return result;
  };
  var indexOfParamEnd = function(tokens, index) {
    var bracket = 0;
    for (var i = index, imax = tokens.length; i < imax; ++i) {
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
    for (var i = index, imax = tokens.length; i < imax; ++i) {
      if (tokens[i][TAG] === "TERMINATOR" || tokens[i][TAG] === ".") {
        break;
      }
      if (tokens[i][TAG] === "->" ||
          tokens[i][TAG] === "=>" ||
          tokens[i][TAG] === "PARAM_START") {
        return i;
      }
    }
    return -1;
  };
  var formatArgument = function(op) {
    return op.tokens.slice(op.begin, op.end+1).map(function(token, index) {
      if (token[TAG] === "STRING" && token[VALUE].charAt(0) === "'") {
        return "\"" + token[VALUE].substr(1, token[VALUE].length-2) + "\"";
      } else if (token[TAG] === "IDENTIFIER" && op.tokens[op.begin+index+1][TAG] === ":") {
        return "\"" + token[VALUE] + "\"";
      }
      return token[VALUE];
    }).join("");
  };
  
  
  
  
  var detectPlusMinusOperator = function(tokens) {
    if (tokens.cc_plusminus) {
      return tokens;
    }
    var prevTag = "";
    for (var i = 0, imax = tokens.length; i < imax; ++i) {
      var tag = tokens[i][TAG];
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
    if (!tokens.cc_plusminus) {
      for (var i = 0, imax = tokens.length; i < imax; ++i) {
        var val = tokens[i][VALUE];
        if (val === "+" || val === "-") {
          tokens[i][TAG] = val;
        }
      }
      return tokens;
    }
    delete tokens.cc_plusminus;
    return tokens;
  };
  
  var getPrevOperand = function(tokens, index) {
    tokens = detectPlusMinusOperator(tokens);
    
    var bracket = 0;
    var indent  = 0;
    var end = index;
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
          var prev;
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
    tokens = detectPlusMinusOperator(tokens);
    var bracket = 0;
    var indent  = 0;
    var begin = index;
    var imax = tokens.length - 2;

    if (tokens[index] && tokens[index][TAG] === "@") {
      if (tokens[index+1][TAG] !== "IDENTIFIER") {
        return {tokens:tokens, begin:index, end:index};
      }
    }
    
    while (index < imax) {
      var tag = tokens[index][TAG];
      
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
    return {tokens:tokens, begin:begin, end:Math.max(0,tokens.length-2)};
  };
  
  var func = {};
  var detectFunctionParameters = function(tokens) {
    if (tokens.cc_funcParams) {
      return tokens;
    }
    var stack = [
      { declared:[], args:[], local:[], outer:[] }
    ];
    stack.setVariables = func.setVariables(stack);
    
    var indent = 0;
    var args = [];
    var vars = [];
    for (var i = 0, imax = tokens.length - 1; i < imax; ++i) {
      var op, token = tokens[i];
      stack.peek = stack[stack.length-1];
      switch (token[TAG]) {
      case "PARAM_START":
        args = func.getInfoOfArguments(tokens, i);
        i    = args.end + 1;
        vars = args.vars;
        args = args.args;
        /* falls through */
      case "->": case "=>":
        var scope = {
          declared: stack.peek.declared.concat(stack.peek.local),
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
      "cc", "global", "console",
      "setInterval", "setTimeout", "clearInterval", "clearTimeout"
    ];
    return function(name) {
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
      for (var i = stack.length - 2; i >= 0; i--) {
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
    var end  = indexOfParamEnd(tokens, index);
    var vars = [];
    var args = [];
    for (var i = begin+1; i < end; ++i) {
      var op = getNextOperand(tokens, i);
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
    var tokens = op.tokens;
    list = list || [];
    if (tokens[op.begin][TAG] === "[" && tokens[op.end][TAG] === "]") {
      for (var i = op.begin+1, imax = op.end; i < imax; ++i) {
        var _op = getNextOperand(tokens, i);
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
  
  
  var replaceFixedTimeValue = function(tokens) {
    for (var i = 0, imax = tokens.length; i < imax; ++i) {
      var token = tokens[i];
      if (token[TAG] === "STRING" && token[VALUE].charAt(0) === "\"") {
        var time = timevalue(token[VALUE].substr(1, token[VALUE].length-2));
        if (typeof time === "number") {
          token[TAG] = "NUMBER";
          token[VALUE] = time.toString();
        }
      }
    }
    return tokens;
  };
  
  var replaceStrictlyPrecedence = function(tokens) {
    tokens = detectPlusMinusOperator(tokens);
    for (var i = tokens.length-1; i > 0; i--) {
      var token = tokens[i];
      if (token[TAG] === "MATH" && (token[VALUE] !== "+" && token[VALUE] !== "-")) {
        var prev = getPrevOperand(tokens, i);
        var next = getNextOperand(tokens, i);
        tokens.splice(next.end + 1, 0, [")", ")" , _]);
        tokens.splice(prev.begin  , 0, ["(", "(" , _]);
      }
    }
    return tokens;
  };

  var uop = {
    operatorDict: {
      "+": "__plus__", "-": "__minus__"
    }
  };
  var replaceUnaryOperator = function(tokens) {
    tokens = detectPlusMinusOperator(tokens);
    for (var i = tokens.length-1; i >= 0; i--) {
      var token = tokens[i];
      if (token[TAG] === "UNARY" && uop.operatorDict.hasOwnProperty(token[VALUE])) {
        var selector = uop.operatorDict[token[VALUE]];
        var next = getNextOperand(tokens, i);
        tokens.splice(
          next.end+1, 0,
          ["."         , "."     , _],
          ["IDENTIFIER", selector, _],
          ["CALL_START", "("     , _],
          ["CALL_END"  , ")"     , _]
        );
        tokens.splice(i, 1);
      }
    }
    return tokens;
  };
  
  var bop = {
    operatorDict: {
      "+": "__add__", "-": "__sub__", "*": "__mul__", "/": "__div__", "%": "__mod__"
    },
    adverbs: {
      W:"WRAP", S:"SHORT", C:"CLIP", F:"FOLD", T:"TABLE", X:"FLAT",
      WRAP:"WRAP", SHORT:"SHORT", CLIP:"CLIP", FOLD:"FOLD", TABLE:"TABLE", FLAT:"FLAT"
    }
  };
  var replaceTextBinaryAdverb = function(code) {
    Object.keys(bop.adverbs).forEach(function(key) {
      var a = new RegExp("([+\\-*/%])(" + key + ")\\1", "g");
      var b = "$1 " + "\"#!" + key.charAt(0) + "\"" + " $1";
      code = code.replace(a, b);
    });
    return code;
  };
  var replaceBinaryOperator = function(tokens) {
    tokens = detectPlusMinusOperator(tokens);
    for (var i = tokens.length-1; i >= 0; i--) {
      var token = tokens[i];
      if (token[TAG] === "MATH" && bop.operatorDict.hasOwnProperty(token[VALUE])) {
        var selector = bop.operatorDict[token[VALUE]];
        var adverb   = bop.checkAdvarb(tokens, i);
        var next = getNextOperand(tokens, i);
        if (adverb) {
          i -= 2;
          tokens.splice(
            i, 3,
            ["."         , "."     , _],
            ["IDENTIFIER", selector, _],
            ["CALL_START", "("     , _]
          );
          tokens.splice(
            next.end+1, 0,
            [","         , ","   , _],
            ["IDENTIFIER", adverb, _],
            ["CALL_END"  , ")"   , _]
          );
        } else {
          tokens.splice(
            i, 1,
            ["."         , "."     , _],
            ["IDENTIFIER", selector, _],
            ["CALL_START", "("     , _]
          );
          tokens.splice(
            next.end+3, 0,
            ["CALL_END", ")", _]
          );
        }
      }
    }
    return tokens;
  };
  bop.checkAdvarb = function(tokens, index) {
    var t0 = tokens[index  ];
    var t1 = tokens[index-1];
    var t2 = tokens[index-2];
    if (t0 && t1 && t2) {
      if (/^"#![WSCFTX]"$/.test(t1[VALUE])) {
        var key = t1[VALUE].charAt(3);
        if (t0[VALUE] === t2[VALUE] && bop.adverbs.hasOwnProperty(key)) {
          return bop.adverbs[key];
        }
      }
    }
  };
  
  
  var compound = {
    operatorDict: {
      "+=": "__add__",
      "-=": "__sub__",
      "*=": "__mul__",
      "/=": "__div__",
      "%=": "__mod__",
    }
  };
  var replaceCompoundAssign = function(tokens) {
    for (var i = tokens.length; --i > 0; ) {
      var token = tokens[i];
      if (compound.operatorDict.hasOwnProperty(token[VALUE])) {
        var selector = compound.operatorDict[token[VALUE]];
        var prev = getPrevOperand(tokens, i);
        var next = getNextOperand(tokens, i);

        tokens.splice(
          i, 1,
          ["="         , "="     , _],
          ["."         , "."     , _],
          ["IDENTIFIER", selector, _],
          ["CALL_START", "("     , _]
        );
        tokens.splice(
          next.end+4, 0,
          ["CALL_END", ")", _]
        );
        var subtokens = [ i+1, 0 ];
        for (var j = prev.begin; j < i; ++j) {
          subtokens.push(tokens[j]);
        }
        tokens.splice.apply(tokens, subtokens);
      }
    }
    return tokens;
  };

  var logic = {
    operatorDict: {
      "&&": "__and__", "||": "__or__"
    }
  };
  var replaceLogicOperator = function(tokens) {
    var replaceable = false;
    for (var i = 1; i < tokens.length; ++i) {
      var token = tokens[i];
      if (token[VALUE] === "wait" && tokens[i-1][TAG] === "@") {
        replaceable = true;
        continue;
      }
      if (token[TAG] === ",") {
        replaceable = false;
        continue;
      }
      if (replaceable) {
        if (token[TAG] === "LOGIC" && logic.operatorDict.hasOwnProperty(token[VALUE])) {
          var selector = logic.operatorDict[token[VALUE]];
          var next = getNextOperand(tokens, i);
          tokens.splice(
            i, 1,
            ["."         , "."     , _],
            ["IDENTIFIER", selector, _],
            ["CALL_START", "("     , _]
          );
          tokens.splice(
            next.end + 3, 0,
            ["CALL_END", ")", _]
          );
          i = next.end+3; // skip
        }
      }
    }
    return tokens;
  };
  
  
  var synthdef = {};
  var replaceSynthDefinition = function(tokens) {
    tokens = detectFunctionParameters(tokens);
    for (var i = tokens.length - 4; i--; ) {
      if ((i && tokens[i-1][TAG] === ".") || tokens[i][VALUE] !== "SynthDef") {
        continue;
      }
      var index = indexOfFunctionStart(tokens, i + 2);
      if (index === -1) {
        continue;
      }
      var args;
      if (tokens[index].cc_funcRef) {
        args = tokens[index].cc_funcRef.cc_funcParams.args;
      } else {
        args = [];
      }
      synthdef.replaceSynthDefDefaultArguments(tokens, index, args);
      
      index = getNextOperand(tokens, index).end + 1;
      synthdef.insertSynthDefArgumentsToAfterFunction(tokens, index, args);
    }
    return tokens;
  };
  synthdef.replaceSynthDefDefaultArguments = function(tokens, index, args) {
    if (args.length) {
      var remove = indexOfParamEnd(tokens, index) - index + 1;
      var subtokens = [ index, remove ];
      
      subtokens.push(["PARAM_START", "(", _]);
      for (var i = 0, imax = args.length; i < imax; i += 2) {
        if (i) {
          subtokens.push([",", ",", _]);
        }
        subtokens.push(["IDENTIFIER", args[i], _]);
      }
      subtokens.push(["PARAM_END"  , ")", _]);
      
      tokens.splice.apply(tokens, subtokens);
    }
  };
  synthdef.insertSynthDefArgumentsToAfterFunction = function(tokens, index, args) {
    var subtokens = [ index, 0 ];
    
    subtokens.push([",", ",", _],
                   ["[", "[", _]);
    for (var j = 0, jmax = args.length; j < jmax; ++j) {
      if (j) {
        subtokens.push([",", ",", _]);
      }
      subtokens.push(["STRING", "'" + (args[j]||0) + "'", _]);
    }
    subtokens.push(["]", "]", _]);
    
    tokens.splice.apply(tokens, subtokens);
  };
  

  var task = {
    contextMethods: ["wait", "break", "continue", "redo", "recursive", "return"]
  };
  var replaceTaskFunction = function(tokens) {
    tokens = detectFunctionParameters(tokens);
    for (var i = tokens.length - 4; i--; ) {
      if ((i && tokens[i-1][TAG] === ".") || tokens[i][VALUE] !== "Task") {
        continue;
      }
      var index = indexOfFunctionStart(tokens, i + 2);
      if (index === -1) {
        continue;
      }
      task.makeSegmentedFunction(getNextOperand(tokens, index), task.contextMethods);
    }
    return tokens;
  };
  
  task.makeSegmentedFunction = function(op, contextMethods) {
    var tokens = op.tokens;
    var body   = tokens.splice(op.begin, op.end-op.begin+1);
    var after  = tokens.splice(op.begin);
    var localVars, outerVars, args;
    
    var ref = body[0].cc_funcRef;
    
    if (ref) {
      localVars = ref.cc_funcParams.local;
      outerVars = ref.cc_funcParams.outer;
      args = ref.cc_funcParams.args.filter(function(name, i) {
        return !(i & 1);
      });
    } else {
      localVars = outerVars = args = [];
    }
    
    if (args.length) {
      // remove default args
      body.splice(0, indexOfParamEnd(body, 0) + 1);
    }
    body.splice(0, 2); // remove ->, INDENT
    body.pop();        // remove OUTDENT
    
    var replaced = [];
    task.beginOfSegmentedFunction(replaced, outerVars);
    {
      task.insertLocalVariables(replaced, localVars);
      replaced.push(["["      , "[" , _],
                    ["INDENT" , 2   , _]);
      var numOfSegments = 0;
      while (body.length) {
        if (numOfSegments++) {
          replaced.push(["TERMINATOR", "\n", _]);
        }
        task.beginOfSegment(replaced, args);
        task.insertSegment(replaced, body, contextMethods);
        task.endOfSegment(replaced, args);
      }
      replaced.push(["OUTDENT", 2  , _],
                    ["]"      , "]", _]);
    }
    task.endOfSegmentedFunction(replaced, outerVars);

    for (var i = replaced.length; i--; ) {
      replaced[i].cc_tasked = true;
    }
    tokens.push.apply(tokens, replaced);
    tokens.push.apply(tokens, after);
  };
  
  task.beginOfSegmentedFunction = function(tokens, outerVars) {
    if (outerVars.length) {
      tokens.push(["UNARY"      , "do", _],
                  ["PARAM_START", "(" , _]);
      for (var i = 0, imax = outerVars.length; i < imax; ++i) {
        if (i) {
          tokens.push([",", ",", _]);
        }
        tokens.push(["IDENTIFIER", outerVars[i], _]);
      }
      tokens.push(["PARAM_END"  , ")" , _],
                  ["->"         , "->", _],
                  ["INDENT"     , 2   , _]);
    }
    tokens.push(["->"     , "->", _],
                ["INDENT" , 2   , _]);
  };
  
  task.endOfSegmentedFunction = function(tokens, outerVars) {
    tokens.push(["OUTDENT", 2  , _]);
    if (outerVars.length) {
      tokens.push(["OUTDENT", 2  , _]);
    }
  };
  
  task.insertLocalVariables = function(tokens, localVars) {
    if (localVars.length) {
      for (var i = 0, imax = localVars.length; i < imax; i++) {
        tokens.push(["IDENTIFIER", localVars[i], _],
                    ["="         , "="         , _]);
      }
      tokens.push(["UNDEFINED" , "undefined", _],
                  ["TERMINATOR", "\n", _]);
    }
  };
  
  task.beginOfSegment = function(tokens, args) {
    if (args.length) {
      tokens.push(["PARAM_START", "(", _]);
      for (var i = 0, imax = args.length; i < imax; ++i) {
        if (i) {
          tokens.push([",", ",", _]);
        }
        tokens.push(["IDENTIFIER", args[i], _]);
      }
      tokens.push(["PARAM_END"  , ")", _]);
    }
    tokens.push(["->"    , "->", _],
                ["INDENT", 2   , _]);
  };
  
  task.endOfSegment = function(tokens) {
    tokens.push(["OUTDENT", 2, _]);
  };
  
  task.insertSegment = function(tokens, body, contextMethods) {
    var contextMethodCalled = false;
    
    while (!contextMethodCalled && body.length) {
      var line = getLine(body, 0);
      var closureVars = task.getClosureVariables(line);
      
      task.beginOfLine(tokens, line, closureVars);
      for (var i = line.len; i--; ) {
        if (!body[0].cc_tasked && body[0][TAG] === "@" && body[1]) {
          if (contextMethods.indexOf(getIdentifier(body[1])) !== -1) {
            contextMethodCalled = true;
          }
        }
        tokens.push(body.shift());
      }
      task.endOfLine(tokens, line, closureVars);
    }
  };
  
  task.getClosureVariables = function(line) {
    var tokens = line.tokens;
    var list = [];
    for (var i = 0, imax = line.len; i < imax; ++i) {
      if (!tokens[i].cc_tasked && (tokens[i][TAG] === "->" || tokens[i][TAG] === "=>")) {
        list.push.apply(list, tokens[i].cc_funcParams.outer);
      }
    }
    var set = {};
    return list.filter(function(name) {
      return set[name] ? false : !!(set[name] = true);
    });
  };
  
  task.beginOfLine = function(tokens, line, closureVars) {
    var i, imax;
    if (closureVars.length) {
      task.insertAssignment(tokens, line);
      tokens.push(["UNARY" , "do", _],
                  ["PARAM_START", "(", _]);
      for (i = 0, imax = closureVars.length; i < imax; ++i) {
        if (i) {
          tokens.push([",", ",", _]);
        }
        tokens.push(["IDENTIFIER", closureVars[i], _]);
      }
      tokens.push(["PARAM_END", ")" , _],
                  ["->"       , "->", _],
                  ["INDENT"   , 2   , _]);
    }
  };
  
  task.endOfLine = function(tokens, line, closureVars) {
    if (closureVars.length) {
      tokens.push(["OUTDENT"   , 2   , _],
                  ["TERMINATOR", "\n", _]);
    }
  };
  
  // TODO: fix it ( destructuring assginment? )
  task.insertAssignment = function(tokens, line) {
    var list = [];
    var line_tokens = line.tokens;
    if (line_tokens[0][TAG] === "IDENTIFIER") {
      var op = getNextOperand(line_tokens, 0);
      if (line_tokens[op.end+1] && line_tokens[op.end+1][TAG] === "=") {
        list = line_tokens.slice(0, op.end + 2);
      }
    }
    tokens.push.apply(tokens, list);
  };
  
  
  var replaceGlobalVariables = function(tokens) {
    for (var i = tokens.length - 1; i--; ) {
      var token = tokens[i];
      if (token[TAG] !== "IDENTIFIER") {
        continue;
      }
      if (/^\$[a-z][a-zA-Z0-9_]*$/.test(token[VALUE])) {
        if (tokens[i+1][TAG] === ":") {
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
    }
    return tokens;
  };
  
  var replaceCCVariables = function(tokens) {
    for (var i = tokens.length - 1; i--; ) {
      var token = tokens[i];
      if (token[TAG] !== "IDENTIFIER") {
        continue;
      }
      if (cc.global.hasOwnProperty(token[VALUE])) {
        if (tokens[i+1][TAG] === ":") {
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
    }
    return tokens;
  };
  
  var finalize = function(tokens) {
    tokens.unshift(["("          , "("        , _],
                   ["PARAM_START", "("        , _],
                   ["IDENTIFIER" , "global"   , _],
                   ["PARAM_END"  , ")"        , _],
                   ["->"         , "->"       , _],
                   ["INDENT"     , 2          , _]);
    
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
                ["CALL_END"  , ")"          , _]);
    return tokens;
  };
  
  var tab = function(n) {
    var t = "";
    for (var i = 0; i < n; ++i) {
      t += "  ";
    }
    return t;
  };
  var prettyPrint = function(tokens) {
    var indent = 0;
    tokens = detectPlusMinusOperator(tokens);
    return tokens.map(function(token) {
      switch (token[TAG]) {
      case "TERMINATOR":
        return "\n" + tab(indent);
      case "INDENT":
        indent += 1;
        return "\n" + tab(indent);
      case "OUTDENT":
        indent -= 1;
        return "\n" + tab(indent);
      case "RETURN":
        return "return ";
      case "UNARY":
        return token[VALUE] + (token[VALUE].length > 1 ? " " : "");
      case "{":
        return "{";
      case ",": case "RELATION": case "IF": case "SWITCH": case "LEADING_WHEN":
        return token[VALUE] + " ";
      case "=": case "COMPARE": case "MATH": case "LOGIC":
        return " " + token[VALUE] + " ";
      case "HERECOMMENT":
        return "/* " + token[VALUE] + " */";
      default:
        return token[VALUE];
      }
    }).join("").split("\n").filter(function(line) {
      return !(/^\s*$/.test(line));
    }).join("\n").trim();
  };
  
  var CoffeeCompiler = (function() {
    function CoffeeCompiler() {
    }
    CoffeeCompiler.prototype.tokens = function(code) {
      var data = [];
      code = replaceTextBinaryAdverb(code);
      var tokens = CoffeeScript.tokens(code);
      if (tokens.length) {
        tokens.forEach(function(token) {
          if (token[TAG] === "HERECOMMENT") {
            data.push(token[VALUE].trim());
          }
        });
        tokens = replaceGlobalVariables(tokens);
        tokens = replaceFixedTimeValue(tokens);
        tokens = replaceStrictlyPrecedence(tokens);
        tokens = replaceUnaryOperator(tokens);
        tokens = replaceBinaryOperator(tokens);
        tokens = replaceCompoundAssign(tokens);
        tokens = replaceLogicOperator(tokens);
        tokens = replaceSynthDefinition(tokens);
        tokens = replaceTaskFunction(tokens);
        tokens = replaceCCVariables(tokens);
        tokens = finalize(tokens);
      }
      this.code = code;
      this.data = data;
      return tokens;
    };
    CoffeeCompiler.prototype.compile = function(code) {
      var tokens = this.tokens(code);
      return CoffeeScript.nodes(tokens).compile({bare:true}).trim();
    };
    CoffeeCompiler.prototype.toString = function(tokens) {
      if (typeof tokens === "string") {
        tokens = this.tokens(tokens);
      }
      return prettyPrint(tokens);
    };
    return CoffeeCompiler;
  })();
  
  var use = function() {
    cc.createCoffeeCompiler = function() {
      return new CoffeeCompiler();
    };
  };
  
  module.exports = {
    CoffeeCompiler: CoffeeCompiler,
    
    detectPlusMinusOperator : detectPlusMinusOperator,
    revertPlusMinusOperator : revertPlusMinusOperator,
    getPrevOperand          : getPrevOperand,
    getNextOperand          : getNextOperand,
    detectFunctionParameters: detectFunctionParameters,

    replaceTextBinaryAdverb  : replaceTextBinaryAdverb,
    replaceFixedTimeValue    : replaceFixedTimeValue,
    replaceStrictlyPrecedence: replaceStrictlyPrecedence,
    replaceUnaryOperator     : replaceUnaryOperator,
    replaceBinaryOperator    : replaceBinaryOperator,
    replaceCompoundAssign    : replaceCompoundAssign,
    replaceLogicOperator     : replaceLogicOperator,
    replaceSynthDefinition   : replaceSynthDefinition,
    replaceTaskFunction      : replaceTaskFunction,
    replaceGlobalVariables   : replaceGlobalVariables,
    replaceCCVariables       : replaceCCVariables,
    finalize                 : finalize,
    prettyPrint              : prettyPrint,
    
    use: use,
  };

  module.exports.use();

});
define('cc/common/timevalue', function(require, exports, module) {

  var cc = require("../cc");
  
  var calc = function(str) {
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
    calc: calc,
  };

});
define('cc/server/server', function(require, exports, module) {

  var cc = require("./cc");
  var pack  = require("../common/pack").pack;
  var commands = {};
  
  var SynthServer = (function() {
    function SynthServer() {
      this.sampleRate = 0;
      this.channels   = 0;
      this.strmLength = 0;
      this.bufLength  = 0;
      this.instanceManager = cc.createInstanceManager();
      this.strm = null;
      this.timer = cc.createTimer();
      this.initialized = false;
      this.syncCount    = new Uint32Array(1);
      this.sysSyncCount = 0;
    }
    
    SynthServer.prototype.sendToLang = function() {
      throw "SynthServer#sendToLang: should be overridden";
    };
    SynthServer.prototype.recvFromLang = function(msg, userId) {
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
      throw "SynthServer#connect: should be overridden";
    };
    SynthServer.prototype.init = function(msg) {
      if (!this.initialized) {
        this.initialized = true;
        if (msg) {
          this.sampleRate = msg[1]|0;
          this.channels   = msg[2]|0;
        }
        this.strm  = new Int16Array(this.strmLength * this.channels);
        this.instanceManager.init(this);
        this.instanceManager.append(0);
      }
    };
    SynthServer.prototype.play = function(msg, userId) {
      userId = userId|0;
      this.instanceManager.play(userId);
      if (!this.timer.isRunning()) {
        this.timer.start(this.process.bind(this), 10);
      }
      this.sendToLang([
        "/played", this.syncCount[0]
      ]);
    };
    SynthServer.prototype.pause = function(msg, userId) {
      userId = userId|0;
      this.instanceManager.pause(userId);
      if (this.timer.isRunning()) {
        if (!this.instanceManager.isRunning()) {
          this.timer.stop();
        }
      }
      this.sendToLang([
        "/paused", this.syncCount[0]
      ]);
    };
    SynthServer.prototype.reset = function(msg, userId) {
      userId = userId|0;
      this.instanceManager.reset(userId);
    };
    SynthServer.prototype.pushToTimeline = function(msg, userId) {
      userId = userId|0;
      var timeline = msg[1];
      this.instanceManager.pushToTimeline(userId, timeline);
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
  
  module.exports = {
    use: function() {
      require("../common/timer");
      require("../common/console");
      require("./instance");
      require("./rate");
      require("./unit/unit");
      require("./server-worker");
      require("./server-iframe");
      require("./server-nodejs");
      require("./server-socket");
      
      cc.createSynthServer = function() {
        switch (cc.opmode) {
        case "worker":
          return cc.createWorkerSynthServer();
        case "iframe":
          return cc.createIFrameSynthServer();
        case "nodejs":
          return cc.createNodeJSSynthServer();
        case "socket":
          return cc.createSocketSynthServer();
        }
        throw new Error("A SynthServer is not defined for: " + cc.opmode);
      };
      
      if (typeof global.console === "undefined") {
        global.console = (function() {
          var console = {};
          ["log", "debug", "info", "warn", "error"].forEach(function(method) {
            console[method] = function() {
              if (cc.server) {
                var args = Array.prototype.slice.call(arguments).map(function(x) {
                  return pack(x);
                });
                cc.server.sendToLang(["/console/" + method, args]);
              }
            };
          });
          return console;
        })();
      }
    }
  };

  module.exports.use();

});
define('cc/server/cc', function(require, exports, module) {

  var _cc = require("../cc");

  if (!_cc.UGen) {
    _cc.UGen = Object;
  }
  
  module.exports = _cc;

});
define('cc/server/instance', function(require, exports, module) {

  var cc = require("./cc");
  var node = require("./node");
  var commands = require("./commands");
  
  var InstanceManager = (function() {
    function InstanceManager() {
      this.map  = {};
      this.list = [];
      this.server = null;
      this.process = process0;
    }

    InstanceManager.prototype.init = function(server) {
      if (this.server) {
        return;
      }
      var busLength  = server.bufLength * 16 + 128;
      var bufLength  = server.bufLength;
      var bufLength4 = server.bufLength << 2;
      this.server    = server;
      this.busClear  = new Float32Array(busLength);
      this.map       = {};
      this.list      = [];
      this.busOut    = new Float32Array(busLength);
      this.busOutLen = server.bufLength << 1;
      this.busOutL  = new Float32Array(this.busOut.buffer, 0         , bufLength);
      this.busOutR  = new Float32Array(this.busOut.buffer, bufLength4, bufLength);
    };
    InstanceManager.prototype.append = function(userId) {
      if (!this.map[userId]) {
        var instance = new Instance(this, userId);
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
        return instance.rootNode.running;
      });
    };
    InstanceManager.prototype.pushToTimeline = function(userId, timeline) {
      var instance = this.map[userId];
      if (instance) {
        instance.timeline = instance.timeline.concat(timeline);
      }
    };
    InstanceManager.prototype.doBinayCommand = function(userId, binary) {
      var instance = this.map[userId];
      if (instance) {
        instance.doBinayCommand(binary);
      }
    };
    
    var process0 = function() {
      this.busOut.set(this.busClear);
    };
    var process1 = function(bufLength, index) {
      this.list[0].process(bufLength, index);
      this.busOut.set(this.list[0].bus);
    };
    var processN = function(bufLength, index) {
      var list = this.list;
      var busOut    = this.busOut;
      var busOutLen = this.busOutLen;
      var instance;
      busOut.set(this.busClear);
      for (var i = 0, imax = list.length; i < imax; ++i) {
        instance = list[i];
        instance.process(bufLength, index);
        var inBus = instance.bus;
        var inAmp = instance.busAmp;
        for (var j = busOutLen; j--; ) {
          busOut[j] += inBus[j] * inAmp;
        }
      }
    };
    
    return InstanceManager;
  })();
  
  
  var Instance = (function() {
    function Instance(manager, userId) {
      var busLength = manager.server.bufLength * 16 + 128;
      this.manager = manager;
      this.userId  = userId|0;
      this.bus     = new Float32Array(busLength);
      this.busClear = manager.busClear;
      
      this.busIndex = 0;
      this.busAmp   = 0.8;
      this.timeline = [];
      this.timelineIndex = 0;
      this.rootNode = new node.Group(0, 0, 0, this);
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
    };
    Instance.prototype.pause = function() {
      this.rootNode.running = false;
      this.bus.set(this.busClear);
      this.timeline = [];
    };
    Instance.prototype.reset = function() {
      if (this.manager.busClear) {
        this.bus.set(this.manager.busClear);
      }
      this.timeline = [];
      this.rootNode = new node.Group(0, 0, 0, this);
      this.nodes   = { 0:this.rootNode };
      this.fixNums = {};
      this.defs    = {};
      this.buffers = {};
      this.bufSrc  = {};
    };
    Instance.prototype.doBinayCommand = function(binary) {
      var func  = commands[(binary[1] << 8) + binary[0]];
      if (func) {
        func.call(this, binary);
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
      var args;
      
      while ((args = timeline.shift())) {
        var func = commands[args[0]];
        if (func) {
          func.call(this, args);
        }
      }
      
      this.bus.set(this.busClear);
      this.rootNode.process(bufLength, this);
    };
    
    return Instance;
  })();
  
  
  module.exports = {
    InstanceManager: InstanceManager,
    
    use: function() {
      cc.createInstanceManager = function() {
        return new InstanceManager();
      };
    }
  };

  module.exports.use();

});
define('cc/server/node', function(require, exports, module) {

  var cc = require("./cc");
  var extend = require("../common/extend");
  
  var Unit = require("./unit/unit").Unit;
  var graphFunc  = {};
  var doneAction = {};
  
  graphFunc[0] = function(node) {
    var prev;
    if (this instanceof Group) {
      if (this.head === null) {
        this.head = this.tail = node;
      } else {
        prev = this.head.prev;
        if (prev) {
          prev.next = node;
        }
        node.next = this.head;
        this.head.prev = node;
        this.head = node;
      }
      node.parent = this;
    }
  };
  graphFunc[1] = function(node) {
    var next;
    if (this instanceof Group) {
      if (this.tail === null) {
        this.head = this.tail = node;
      } else {
        next = this.tail.next;
        if (next) {
          next.prev = node;
        }
        node.prev = this.tail;
        this.tail.next = node;
        this.tail = node;
      }
      node.parent = this;
    }
  };
  graphFunc[2] = function(node) {
    var prev = this.prev;
    this.prev = node;
    node.prev = prev;
    if (prev) {
      prev.next = node;
    }
    node.next = this;
    if (this.parent && this.parent.head === this) {
      this.parent.head = node;
    }
    node.parent = this.parent;
  };
  graphFunc[3] = function(node) {
    var next = this.next;
    this.next = node;
    node.next = next;
    if (next) {
      next.prev = node;
    }
    node.prev = this;
    if (this.parent && this.parent.tail === this) {
      this.parent.tail = node;
    }
    node.parent = this.parent;
  };
  graphFunc[4] = function(node) {
    node.next = this.next;
    node.prev = this.prev;
    node.head = this.head;
    node.tail = this.tail;
    node.parent = this.parent;
    if (this.prev) {
      this.prev.next = node;
    }
    if (this.next) {
      this.next.prev = node;
    }
    if (this.parent && this.parent.head === this) {
      this.parent.head = node;
    }
    if (this.parent && this.parent.tail === this) {
      this.parent.tail = node;
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
      cc.server.sendToLang([
        "/emit/n_end", this.nodeId
      ], userId);
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
    Node.prototype.doneAction = function(action, tag) {
      var func = doneAction[action];
      if (func) {
        func.call(this);
        var userId;
        if (this.instance) {
          userId = this.instance.userId;
        }
        cc.server.sendToLang([
          "/emit/n_done", this.nodeId, tag
        ], userId);
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
        graphFunc[addAction].call(target, this);
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
    function Synth(nodeId, node, addAction, defId, controls, instance) {
      Node.call(this, nodeId, instance);
      if (instance) {
        var specs = instance.defs[defId];
        if (specs) {
          this.build(specs, controls, instance);
        }
      }
      if (node) {
        graphFunc[addAction].call(node, this);
      }
    }
    extend(Synth, Node);
    
    Synth.prototype.build = function(specs, controls, instance) {
      this.specs = specs;

      var fixNumList = specs.consts.map(function(value) {
        return instance.getFixNum(value);
      });
      var unitList = specs.defList.map(function(spec) {
        return new Unit(this, spec);
      }, this);
      this.params   = specs.params;
      this.controls = new Float32Array(this.params.values);
      this.set(controls);
      this.unitList = unitList.filter(function(unit) {
        var inputs  = unit.inputs;
        var inRates = unit.inRates;
        var inSpec  = unit.specs[3];
        var tag     = unit.specs[5];
        for (var i = 0, imax = inputs.length; i < imax; ++i) {
          var i2 = i << 1;
          if (inSpec[i2] === -1) {
            inputs[i]  = fixNumList[inSpec[i2+1]].outputs[0];
            inRates[i] = 0;
          } else {
            inputs[i]  = unitList[inSpec[i2]].outputs[inSpec[i2+1]];
            inRates[i] = unitList[inSpec[i2]].outRates[inSpec[i2+1]];
          }
        }
        unit.init(tag);
        return !!unit.process;
      });
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
          unit.process(unit.rate.bufLength, instance);
        }
      }
      if (this.next) {
        this.next.process(inNumSamples, instance);
      }
    };
    
    return Synth;
  })();
  
  module.exports = {
    Node : Node,
    Group: Group,
    Synth: Synth,
  };

});
define('cc/server/unit/unit', function(require, exports, module) {

  var cc = require("../cc");

  var specs = {};
  cc.unit = { specs:specs };
  
  var Unit = (function() {
    function Unit(parent, specs) {
      this.parent = parent;
      this.specs  = specs;
      this.name         = specs[0];
      this.calcRate     = specs[1];
      this.specialIndex = specs[2];
      this.numOfInputs  = specs[3].length >> 1;
      this.numOfOutputs = specs[4].length;
      this.inputs   = new Array(this.numOfInputs);
      this.inRates  = new Array(this.numOfInputs);
      this.outRates = specs[4];
      this.rate     = cc.getRateInstance(this.calcRate || 1);
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
    Unit.prototype.init = function(tag) {
      var ctor = specs[this.name];
      if (typeof ctor === "function") {
        ctor.call(this);
      } else {
        cc.console.warn(this.name + "'s ctor is not found.");
      }
      this.tag = tag || "";
      return this;
    };
    Unit.prototype.doneAction = function(action) {
      if (!this.done) {
        this.done = true;
        this.parent.doneAction(action, this.tag);
      }
      action = 0;
    };
    return Unit;
  })();
  
  module.exports = {
    Unit : Unit,
    
    use: function() {
      cc.createUnit = function(parent, specs) {
        return new Unit(parent, specs);
      };
    }
  };

  require("./bop");
  require("./bufio");
  require("./delay");
  require("./filter");
  require("./inout");
  require("./line");
  require("./madd");
  require("./osc");
  require("./pan");
  require("./ui");
  require("./uop");
  
  module.exports.use();

});
define('cc/server/unit/bop', function(require, exports, module) {

  var cc  = require("../cc");
  var ops = require("../../common/ops");

  var calcFunc = {};
  
  cc.unit.specs.BinaryOpUGen = (function() {
    
    var ctor = function() {
      var func = calcFunc[ops.BINARY_OP_UGEN_MAP[this.specialIndex]];
      var process;
      if (func) {
        switch (this.inRates[0]) {
        case 2:
          switch (this.inRates[1]) {
          case 2:   process = func.aa; break;
          case 1: process = func.ak; break;
          case 0:  process = func.ai; break;
          }
          break;
        case 1:
          switch (this.inRates[1]) {
          case 2:   process = func.ka; break;
          case 1: process = func.kk; break;
          case 0:  process = func.kk; break;
          }
          break;
        case 0:
          switch (this.inRates[1]) {
          case 2:   process = func.ia; break;
          case 1: process = func.kk; break;
          case 0:  process = null   ; break;
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
      } else {
        cc.console.warn("BinaryOpUGen[" + ops.BINARY_OP_UGEN_MAP[this.specialIndex] + "] is not defined.");
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
  
  
  calcFunc["+"] = function(a, b) {
    return a + b;
  };
  calcFunc["+"].aa = function(inNumSamples) {
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
  calcFunc["+"].ak = function(inNumSamples) {
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
  calcFunc["+"].ai = function(inNumSamples) {
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
  calcFunc["+"].ka = function(inNumSamples) {
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
  calcFunc["+"].kk = function() {
    this.outputs[0][0] = this.inputs[0][0] + this.inputs[1][0];
  };
  calcFunc["+"].ia = function(inNumSamples) {
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
  
  calcFunc["-"] = function(a, b) {
    return a - b;
  };
  calcFunc["-"].aa = function(inNumSamples) {
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
  calcFunc["-"].ak = function(inNumSamples) {
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
  calcFunc["-"].ai = function(inNumSamples) {
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
  calcFunc["-"].ka = function(inNumSamples) {
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
  calcFunc["-"].kk = function() {
    this.outputs[0][0] = this.inputs[0][0] - this.inputs[1][0];
  };
  calcFunc["-"].ia = function(inNumSamples) {
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

  calcFunc["*"] = function(a, b) {
    return a * b;
  };
  calcFunc["*"].aa = function(inNumSamples) {
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
  calcFunc["*"].ak = function(inNumSamples) {
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
  calcFunc["*"].ai = function(inNumSamples) {
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
  calcFunc["*"].ka = function(inNumSamples) {
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
  calcFunc["*"].kk = function() {
    this.outputs[0][0] = this.inputs[0][0] * this.inputs[1][0];
  };
  calcFunc["*"].ia = function(inNumSamples) {
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

  calcFunc["/"] = function(a, b) {
    return b === 0 ? 0 : a / b;
  };
  calcFunc["%"] = function(a, b) {
    return b === 0 ? 0 : a % b;
  };

  calcFunc.eq = function(a, b) {
    return a === b ? 1 : 0;
  };
  calcFunc.ne = function(a, b) {
    return a !== b ? 1 : 0;
  };
  calcFunc.lt = function(a, b) {
    return a < b ? 1 : 0;
  };
  calcFunc.gt = function(a, b) {
    return a > b ? 1 : 0;
  };
  calcFunc.le = function(a, b) {
    return a <= b ? 1 : 0;
  };
  calcFunc.ge = function(a, b) {
    return a >= b ? 1 : 0;
  };
  calcFunc.bitAnd = function(a, b) {
    return a & b;
  };
  calcFunc.bitOr = function(a, b) {
    return a | b;
  };
  calcFunc.bitXor = function(a, b) {
    return a ^ b;
  };
  calcFunc.min = function(a, b) {
    return Math.min(a, b);
  };
  calcFunc.max = function(a, b) {
    return Math.max(a, b);
  };
  var gcd = function(a, b, t) {
    a = a|0; b = b|0;
    while (b !== 0) {
      t = a % b; a = b; b = t;
    }
    return Math.abs(a);
  };
  calcFunc.lcm = function(a, b) {
    if (a === 0 && b === 0) {
      return 0;
    }
    return Math.abs(a * b) / gcd(a, b);
  };
  calcFunc.gcd = function(a, b) {
    return gcd(a, b);
  };
  calcFunc.round = function(a, b) {
    return b === 0 ? a : Math.round(a / b) * b;
  };
  calcFunc.roundUp = function(a, b) {
    return b === 0 ? a : Math.ceil(a / b) * b;
  };
  calcFunc.roundDown = function(a, b) {
    return b === 0 ? a : Math.floor(a / b) * b;
  };
  calcFunc.trunc = function(a, b) {
    return b === 0 ? a : Math.floor(a / b) * b;
  };
  calcFunc.atan2 = function(a, b) {
    return Math.atan2(a, b);
  };
  calcFunc.hypot = function(a, b) {
    return Math.sqrt((a * a) + (b * b));
  };
  calcFunc.hypotApx = function(a, b) {
    var x = Math.abs(a), y = Math.abs(b);
    var minxy = Math.min(x, y);
    return x + y - (Math.sqrt(2) - 1) * minxy;
  };
  calcFunc.pow = function(a, b) {
    return Math.pow(Math.abs(a), b);
  };
  calcFunc.leftShift = function(a, b) {
    if (b < 0) {
      return (a|0) >> (-b|0);
    }
    return (a|0) << (b|0);
  };
  calcFunc.rightShift = function(a, b) {
    if (b < 0) {
      return (a|0) << (-b|0);
    }
    return (a|0) >> (b|0);
  };
  calcFunc.unsignedRightShift = function(a, b) {
    if (b < 0) {
      return (a|0) << (-b|0);
    }
    return (a|0) >> (b|0);
  };
  calcFunc.ring1 = function(a, b) {
    return a * b + a;
  };
  calcFunc.ring2 = function(a, b) {
    return a * b + a + b;
  };
  calcFunc.ring3 = function(a, b) {
    return a * a * b;
  };
  calcFunc.ring4 = function(a, b) {
    return a * a * b - a * b * b;
  };
  calcFunc.difsqr = function(a, b) {
    return a * a - b * b;
  };
  calcFunc.sumsqr = function(a, b) {
    return a * a + b * b;
  };
  calcFunc.sqrsum = function(a, b) {
    return (a + b) * (a + b);
  };
  calcFunc.sqrdif = function(a, b) {
    return (a - b) * (a - b);
  };
  calcFunc.absdif = function(a, b) {
    return Math.abs(a - b);
  };
  calcFunc.thresh = function(a, b) {
    return a < b ? 0 : a;
  };
  calcFunc.amclip = function(a, b) {
    return a * 0.5 * (b + Math.abs(b));
  };
  calcFunc.scaleneg = function(a, b) {
    b = 0.5 * b + 0.5;
    return (Math.abs(a) - a) * b + a;
  };
  calcFunc.clip2 = function(a, b) {
    return Math.max(-b, Math.min(a, b));
  };
  calcFunc.excess = function(a, b) {
    return a - Math.max(-b, Math.min(a, b));
  };
  calcFunc.fold2 = function(a, b) {
    var _in = a, x, c, range, range2;
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
  };
  calcFunc.wrap2 = function(a, b) {
    var _in = a, range;
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
  };
  
  
  Object.keys(calcFunc).forEach(function(key) {
    var func = calcFunc[key];
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
  });
  
  module.exports = {
    calcFunc : calcFunc,
    binary_aa: binary_aa,
    binary_ak: binary_ak,
    binary_ai: binary_ai,
    binary_ka: binary_ka,
    binary_kk: binary_kk,
    binary_ia: binary_ia,
  };

});
define('cc/server/unit/bufio', function(require, exports, module) {

  var cc = require("../cc");
  
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
  
  var cubicinterp = function(x, y0, y1, y2, y3) {
    var c0 = y1;
    var c1 = 0.5 * (y2 - y0);
    var c2 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
    var c3 = 0.5 * (y3 - y0) + 1.5 * (y1 - y2);
    return ((c3 * x + c2) * x + c1) * x + c0;
  };
  
  cc.unit.specs.PlayBuf = (function() {
    var ctor = function() {
      this._buffer = null;
      this._phase  = this.inputs[3][0];
      this._trig   = 0;
      this.process = next_choose;
    };
    
    var next_choose = function(inNumSamples, instance) {
      this._buffer = instance.buffers[this.specialIndex];
      if (this._buffer) {
        if (this._buffer.samples !== null) {
          if (this.inRates[1] === 2) {
            if (this.inRates[2] === 2) {
              this.process = next_kk; // TODO: implements aa
            } else {
              this.process = next_kk; // TODO: implements ak
            }
          } else {
            if (this.inRates[2] === 2) {
              this.process = next_kk; // TODO: implements ka
            } else {
              this.process = next_kk;
            }
          }
          this.process.call(this, inNumSamples);
          delete this.spec;
        }
      }
    };
    var next_kk = function(inNumSamples) {
      var buf = this._buffer;
      var outputs = this.outputs;
      var phase = this._phase;
      var rate  = this.inputs[1][0];
      var trig  = this.inputs[2][0];
      var loop  = this.inputs[4][0];
      var samples  = buf.samples;
      var channels = buf.channels;
      var frames   = buf.frames;
      var index0, index1, index2, index3, frac, a, b, c, d;

      var hi = frames - 1;
      if (trig > 0 && this._trig <= 0) {
        this.done = false;
        phase = this.inputs[3][0];
      }
      this._trig = trig;
      for (var i = 0; i < inNumSamples; ++i) {
        phase = sc_loop(this, phase, hi, loop);
        index1 = phase|0;
        index0 = index1 - 1;
        index2 = index1 + 1;
        index3 = index2 + 1;
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
        frac = phase - (phase|0);
        for (var j = 0, jmax = outputs.length; j < jmax; ++j) {
          a = samples[index0 * channels + j];
          b = samples[index1 * channels + j];
          c = samples[index2 * channels + j];
          d = samples[index3 * channels + j];
          outputs[j][i] = cubicinterp(frac, a, b, c, d);
        }
        phase += rate;
      }
      if (this.done) {
        this.doneAction(this.inputs[5][0]|0, this.tag);
      }
      this._phase = phase;
    };

    return ctor;
  })();
  
  module.exports = {};

});
define('cc/server/unit/delay', function(require, exports, module) {

  var cc = require("../cc");
  var log001 = Math.log(0.001);

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
  var cubicinterp = function(x, y0, y1, y2, y3) {
    var c0 = y1;
    var c1 = 0.5 * (y2 - y0);
    var c2 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
    var c3 = 0.5 * (y3 - y0) + 1.5 * (y1 - y2);
    return ((c3 * x + c2) * x + c1) * x + c0;
  };

  var feedbackdelay_ctor = function() {
    var delaybufsize;
    this._maxdelaytime = this.inputs[1][0];
    this._delaytime    = this.inputs[2][0];
    this._decaytime    = this.inputs[3][0];
    delaybufsize = Math.ceil(this._maxdelaytime * this.rate.sampleRate + 1);
    delaybufsize = delaybufsize + this.rate.bufLength;
    delaybufsize = 1 << Math.ceil(Math.log(delaybufsize) * Math.LOG2E);
    this._fdelaylen = this._idelaylen = delaybufsize;
    this._dlybuf    = new Float32Array(delaybufsize);
    this._mask      = delaybufsize - 1;
    this._dsamp     = calcDelay(this, this._delaytime, 1);
    this._iwrphase  = 0;
    this._feedbk    = calcFeedback(this._delaytime, this._decaytime);
  };

  cc.unit.specs.CombN = (function() {
    var ctor = function() {
      this.process = next_akk;
      feedbackdelay_ctor.call(this);
    };
    var next_akk = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var delaytime = this.inputs[2][0];
      var decaytime = this.inputs[3][0];
      var dlybuf   = this._dlybuf;
      var iwrphase = this._iwrphase;
      var dsamp    = this._dsamp;
      var feedbk   = this._feedbk;
      var mask     = this._mask;
      var irdphase, value;
      var next_feedbk, feedbk_slope, next_dsamp, dsamp_slope;
      var i;
      if (delaytime === this._delaytime) {
        irdphase = iwrphase - (dsamp|0);
        if (decaytime === this._decaytime) {
          for (i = 0; i < inNumSamples; ++i) {
            value = dlybuf[irdphase & mask];
            dlybuf[iwrphase & mask] = inIn[i] + feedbk * value;
            out[i] = value;
            irdphase++;
            iwrphase++;
          }
        } else {
          next_feedbk  = calcFeedback(delaytime, decaytime);
          feedbk_slope = (next_feedbk - feedbk) * this.rate.slopeFactor;
          for (i = 0; i < inNumSamples; ++i) {
            value = dlybuf[irdphase & mask];
            dlybuf[iwrphase & mask] = inIn[i] + feedbk * value;
            out[i] = value;
            feedbk += feedbk_slope;
            irdphase++;
            iwrphase++;
          }
          this._feedbk = next_feedbk;
          this._decaytime = decaytime;
        }
      } else {
        next_dsamp  = calcDelay(this, delaytime, 1);
        dsamp_slope = (next_dsamp - dsamp) * this.rate.slopeFactor;
        next_feedbk  = calcFeedback(delaytime, decaytime);
        feedbk_slope = (next_feedbk - feedbk) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          irdphase = iwrphase - (dsamp|0);
          value = dlybuf[irdphase & mask];
          dlybuf[iwrphase & mask] = inIn[i] + feedbk * value;
          out[i] = value;
          dsamp  += dsamp_slope;
          feedbk += feedbk_slope;
          irdphase++;
          iwrphase++;
        }
        this._feedbk = feedbk;
        this._dsamp  = dsamp;
        this._delaytime = delaytime;
        this._decaytime = decaytime;
      }
      this._iwrphase = iwrphase;
    };

    return ctor;
  })();

  cc.unit.specs.CombL = (function() {
    var ctor = function() {
      this.process = next_akk;
      feedbackdelay_ctor.call(this);
    };
    var next_akk = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var delaytime = this.inputs[2][0];
      var decaytime = this.inputs[3][0];
      var dlybuf   = this._dlybuf;
      var iwrphase = this._iwrphase;
      var dsamp    = this._dsamp;
      var feedbk   = this._feedbk;
      var mask     = this._mask;
      var frac     = dsamp - (dsamp|0);
      var irdphase, value, d1, d2;
      var next_feedbk, feedbk_slope, next_dsamp, dsamp_slope;
      var i;
      if (delaytime === this._delaytime) {
        irdphase = iwrphase - (dsamp|0);
        if (decaytime === this._decaytime) {
          for (i = 0; i < inNumSamples; ++i) {
            d1 = dlybuf[(irdphase  )&mask];
            d2 = dlybuf[(irdphase-1)&mask];
            value = d1 + frac * (d2 - d1);
            dlybuf[iwrphase & mask] = inIn[i] + feedbk * value;
            out[i] = value;
            irdphase++;
            iwrphase++;
          }
        } else {
          next_feedbk  = calcFeedback(delaytime, decaytime);
          feedbk_slope = (next_feedbk - feedbk) * this.rate.slopeFactor;
          for (i = 0; i < inNumSamples; ++i) {
            d1 = dlybuf[(irdphase  )&mask];
            d2 = dlybuf[(irdphase-1)&mask];
            value = d1 + frac * (d2 - d1);
            dlybuf[iwrphase & mask] = inIn[i] + feedbk * value;
            out[i] = value;
            feedbk += feedbk_slope;
            irdphase++;
            iwrphase++;
          }
          this._feedbk = next_feedbk;
          this._decaytime = decaytime;
        }
      } else {
        next_dsamp  = calcDelay(this, delaytime, 1);
        dsamp_slope = (next_dsamp - dsamp) * this.rate.slopeFactor;
        next_feedbk  = calcFeedback(delaytime, decaytime);
        feedbk_slope = (next_feedbk - feedbk) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          irdphase = iwrphase - (dsamp|0);
          d1 = dlybuf[(irdphase  )&mask];
          d2 = dlybuf[(irdphase-1)&mask];
          value = d1 + frac * (d2 - d1);
          dlybuf[iwrphase & mask] = inIn[i] + feedbk * value;
          out[i] = value;
          dsamp  += dsamp_slope;
          feedbk += feedbk_slope;
          irdphase++;
          iwrphase++;
        }
        this._feedbk = feedbk;
        this._dsamp  = dsamp;
        this._delaytime = delaytime;
        this._decaytime = decaytime;
      }
      this._iwrphase = iwrphase;
    };

    return ctor;
  })();
  
  cc.unit.specs.CombC = (function() {
    var ctor = function() {
      this.process = next_akk;
      feedbackdelay_ctor.call(this);
    };
    var next_akk = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var delaytime = this.inputs[2][0];
      var decaytime = this.inputs[3][0];
      var dlybuf   = this._dlybuf;
      var iwrphase = this._iwrphase;
      var dsamp    = this._dsamp;
      var feedbk   = this._feedbk;
      var mask     = this._mask;
      var frac     = dsamp - (dsamp|0);
      var irdphase, value, d0, d1, d2, d3;
      var next_feedbk, feedbk_slope, next_dsamp, dsamp_slope;
      var i;
      if (delaytime === this._delaytime) {
        irdphase = iwrphase - (dsamp|0);
        if (decaytime === this._decaytime) {
          for (i = 0; i < inNumSamples; ++i) {
            d0 = dlybuf[(irdphase+1)&mask];
            d1 = dlybuf[(irdphase  )&mask];
            d2 = dlybuf[(irdphase-1)&mask];
            d3 = dlybuf[(irdphase-2)&mask];
            value = cubicinterp(frac, d0, d1, d2, d3);
            dlybuf[iwrphase & mask] = inIn[i] + feedbk * value;
            out[i] = value;
            irdphase++;
            iwrphase++;
          }
        } else {
          next_feedbk  = calcFeedback(delaytime, decaytime);
          feedbk_slope = (next_feedbk - feedbk) * this.rate.slopeFactor;
          for (i = 0; i < inNumSamples; ++i) {
            d0 = dlybuf[(irdphase+1)&mask];
            d1 = dlybuf[(irdphase  )&mask];
            d2 = dlybuf[(irdphase-1)&mask];
            d3 = dlybuf[(irdphase-2)&mask];
            value = cubicinterp(frac, d0, d1, d2, d3);
            dlybuf[iwrphase & mask] = inIn[i] + feedbk * value;
            out[i] = value;
            feedbk += feedbk_slope;
            irdphase++;
            iwrphase++;
          }
          this._feedbk = next_feedbk;
          this._decaytime = decaytime;
        }
      } else {
        next_dsamp  = calcDelay(this, delaytime, 1);
        dsamp_slope = (next_dsamp - dsamp) * this.rate.slopeFactor;
        next_feedbk  = calcFeedback(delaytime, decaytime);
        feedbk_slope = (next_feedbk - feedbk) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          irdphase = iwrphase - (dsamp|0);
          d0 = dlybuf[(irdphase+1)&mask];
          d1 = dlybuf[(irdphase  )&mask];
          d2 = dlybuf[(irdphase-1)&mask];
          d3 = dlybuf[(irdphase-2)&mask];
          value = cubicinterp(frac, d0, d1, d2, d3);
          dlybuf[iwrphase & mask] = inIn[i] + feedbk * value;
          out[i] = value;
          dsamp  += dsamp_slope;
          feedbk += feedbk_slope;
          irdphase++;
          iwrphase++;
        }
        this._feedbk = feedbk;
        this._dsamp  = dsamp;
        this._delaytime = delaytime;
        this._decaytime = decaytime;
      }
      this._iwrphase = iwrphase;
    };

    return ctor;
  })();
  
  module.exports = {};

});
define('cc/server/unit/filter', function(require, exports, module) {

  var cc = require("../cc");
  var zapgremlins = require("./utils").zapgremlins;
  
  cc.unit.specs.RLPF = (function() {
    var ctor = function() {
      if (this.bufLength === 1) {
        this.process = next_1;
      } else {
        this.process = next;
      }
      this._a0 = 0;
      this._b1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq  = undefined;
      this._reson = undefined;
      next_1.call(this, 1);
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
      var i, imax, j = 0;
      if (freq !== this._freq || reson !== this._reson) {
        var qres = Math.max(0.001, reson);
        var pfreq = freq * this.rate.radiansPerSample;
        var D = Math.tan(pfreq * qres * 0.5);
        var C = ((1.0-D)/(1.0+D));
        var cosf = Math.cos(pfreq);
        var next_b1 = (1.0 + C) * cosf;
        var next_b2 = -C;
        var next_a0 = (1.0 + C - next_b1) * 0.25;
        var a0_slope = (next_a0 - a0) * this.rate.filterSlope;
        var b1_slope = (next_b1 - b1) * this.rate.filterSlope;
        var b2_slope = (next_b2 - b2) * this.rate.filterSlope;
        for (i = 0, imax = this.rate.filterLoops; i < imax; ++i) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = y0 + 2.0 * y1 + y2;
          y2 = a0 * inIn[j] + b1 * y0 + b2 * y1;
          out[j++] = y2 + 2.0 * y0 + y1;
          y1 = a0 * inIn[j] + b1 * y2 + b2 * y0;
          out[j++] = y1 + 2.0 * y2 + y0;
          a0 += a0_slope;
          b1 += b1_slope;
          b2 += b2_slope;
        }
        for (i = 0, imax = this.rate.filterRemain; i < imax; ++i) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = y0 + 2.0 * y1 + y2;
          y2 = y1; y1 = y0;
        }
        this._freq = freq;
        this._reson = reson;
        this._a0 = next_a0;
        this._b1 = next_b1;
        this._b2 = next_b2;
      } else {
        for (i = 0, imax = this.rate.filterLoops; i < imax; ++i) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = y0 + 2.0 * y1 + y2;
          y2 = a0 * inIn[j] + b1 * y0 + b2 * y1;
          out[j++] = y2 + 2.0 * y0 + y1;
          y1 = a0 * inIn[j] + b1 * y2 + b2 * y0;
          out[j++] = y1 + 2.0 * y2 + y0;
        }
        for (i = 0, imax = this.rate.filterRemain; i < imax; ++i) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = y0 + 2.0 * y1 + y2;
          y2 = y1; y1 = y0;
        }
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
    };
    var next_1 = function() {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var freq  = this.inputs[1][0];
      var reson = this.inputs[2][0];
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var b1 = this._b1;
      var b2 = this._b2;
      if (freq !== this._freq || reson !== this._reson) {
        var qres = Math.max(0.001, reson);
        var pfreq = freq * this.rate.radiansPerSample;
        var D = Math.tan(pfreq * qres * 0.5);
        var C = ((1.0-D)/(1.0+D));
        var cosf = Math.cos(pfreq);
        b1 = (1.0 + C) * cosf;
        b2 = -C;
        a0 = (1.0 + C - b1) * 0.25;
        y0 = a0 * inIn[0] + b1 * y1 + b2 * y2;
        out[0] = y0 + 2.0 * y1 + y2;
        y2 = y1; y1 = y0;
        this._freq = freq;
        this._reson = reson;
        this._a0 = a0;
        this._b1 = b1;
        this._b2 = b2;
      } else {
        y0 = a0 * inIn[0] + b1 * y1 + b2 * y2;
        out[0] = y0 + 2.0 * y1 + y2;
        y2 = y1; y1 = y0;
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
    };
    return ctor;
  })();

  cc.unit.specs.RHPF = (function() {
    var ctor = function() {
      if (this.bufLength === 1) {
        this.process = next_1;
      } else {
        this.process = next;
      }
      this._a0 = 0;
      this._b1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq  = undefined;
      this._reson = undefined;
      next_1.call(this, 1);
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
      var i, imax, j = 0;
      if (freq !== this._freq || reson !== this._reson) {
        var qres = Math.max(0.001, reson);
        var pfreq = freq * this.rate.radiansPerSample;
        var D = Math.tan(pfreq * qres * 0.5);
        var C = ((1.0-D)/(1.0+D));
        var cosf = Math.cos(pfreq);
        var next_b1 = (1.0 + C) * cosf;
        var next_b2 = -C;
        var next_a0 = (1.0 + C + next_b1) * 0.25;
        var a0_slope = (next_a0 - a0) * this.rate.filterSlope;
        var b1_slope = (next_b1 - b1) * this.rate.filterSlope;
        var b2_slope = (next_b2 - b2) * this.rate.filterSlope;
        for (i = 0, imax = this.rate.filterLoops; i < imax; ++i) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = y0 - 2.0 * y1 + y2;
          y2 = a0 * inIn[j] + b1 * y0 + b2 * y1;
          out[j++] = y2 - 2.0 * y0 + y1;
          y1 = a0 * inIn[j] + b1 * y2 + b2 * y0;
          out[j++] = y1 - 2.0 * y2 + y0;
          a0 += a0_slope;
          b1 += b1_slope;
          b2 += b2_slope;
        }
        for (i = 0, imax = this.rate.filterRemain; i < imax; ++i) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = y0 - 2.0 * y1 + y2;
          y2 = y1; y1 = y0;
        }
        this._freq = freq;
        this._reson = reson;
        this._a0 = next_a0;
        this._b1 = next_b1;
        this._b2 = next_b2;
      } else {
        for (i = 0, imax = this.rate.filterLoops; i < imax; ++i) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = y0 - 2.0 * y1 + y2;
          y2 = a0 * inIn[j] + b1 * y0 + b2 * y1;
          out[j++] = y2 - 2.0 * y0 + y1;
          y1 = a0 * inIn[j] + b1 * y2 + b2 * y0;
          out[j++] = y1 - 2.0 * y2 + y0;
        }
        for (i = 0, imax = this.rate.filterRemain; i < imax; ++i) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = y0 - 2.0 * y1 + y2;
          y2 = y1; y1 = y0;
        }
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
    };
    var next_1 = function() {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var freq  = this.inputs[1][0];
      var reson = this.inputs[2][0];
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var b1 = this._b1;
      var b2 = this._b2;
      if (freq !== this._freq || reson !== this._reson) {
        var qres = Math.max(0.001, reson);
        var pfreq = freq * this.rate.radiansPerSample;
        var D = Math.tan(pfreq * qres * 0.5);
        var C = ((1.0-D)/(1.0+D));
        var cosf = Math.cos(pfreq);
        b1 = (1.0 + C) * cosf;
        b2 = -C;
        a0 = (1.0 + C + b1) * 0.25;
        y0 = a0 * inIn[0] + b1 * y1 + b2 * y2;
        out[0] = y0 - 2.0 * y1 + y2;
        y2 = y1; y1 = y0;
        this._freq = freq;
        this._reson = reson;
        this._a0 = a0;
        this._b1 = b1;
        this._b2 = b2;
      } else {
        y0 = a0 * inIn[0] + b1 * y1 + b2 * y2;
        out[0] = y0 - 2.0 * y1 + y2;
        y2 = y1; y1 = y0;
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
    };
    return ctor;
  })();
  
  module.exports = {};

});
define('cc/server/unit/utils', function(require, exports, module) {
  
  var zapgremlins = function(a) {
    if (isNaN(a) || (-1e-6 < a && a < 0) || (0 <= a && a < +1e-6)) {
      return 0;
    }
    return a;
  };
  
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
  
  module.exports = {
    zapgremlins: zapgremlins,
    avoidzero  : avoidzero,
  };

});
define('cc/server/unit/inout', function(require, exports, module) {

  var cc = require("../cc");
  
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
      var outputs = this.outputs;
      var specialIndex = this.specialIndex;
      for (var i = 0, imax = outputs.length; i < imax; ++i) {
        outputs[i][0] = controls[i + specialIndex];
      }
    };
    return ctor;
  })();
  
  cc.unit.specs.In = (function() {
    var ctor = function() {
      this._bufLength = cc.server.bufLength;
      if (this.calcRate === 2) {
        this.process = next_a;
        this._busOffset = 0;
      } else {
        this.process = next_k;
        this._busOffset = this._bufLength * 16;
      }
    };
    var next_a = function(inNumSamples, instance) {
      var out = this.outputs[0];
      var bus  = instance.bus;
      var bufLength = this._bufLength;
      var offset = (this.inputs[0][0] * bufLength)|0;
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = bus[offset + i];
      }
    };
    var next_k = function(inNumSamples, instance) {
      var out = this.outputs[0];
      var value = instance.bus[this._busOffset + (this.inputs[0][0]|0)];
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = value;
      }
    };
    return ctor;
  })();
  
  cc.unit.specs.Out = (function() {
    var ctor = function() {
      this._bufLength = cc.server.bufLength;
      if (this.calcRate === 2) {
        this.process = next_a;
        this._busOffset = 0;
      } else {
        this.process = next_k;
        this._busOffset = this._bufLength * 16;
      }
    };
    var next_a = function(inNumSamples, instance) {
      var inputs = this.inputs;
      var bus    = instance.bus;
      var bufLength = this._bufLength;
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
  
  module.exports = {};

});
define('cc/server/unit/line', function(require, exports, module) {

  var cc = require("../cc");
  
  cc.unit.specs.Line = (function() {
    var ctor = function() {
      this.process = next_kkk;
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
    var next_kkk = function(inNumSamples) {
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
  
  module.exports = {};

});
define('cc/server/unit/madd', function(require, exports, module) {

  var cc = require("../cc");
  
  cc.unit.specs.MulAdd = (function() {
    var ctor = function() {
      var rates = this.inRates;
      var process = next[rates[0]][rates[1]][rates[2]];
      this.process = process;
      this._in  = this.inputs[0][0];
      this._mul = this.inputs[1][0];
      this._add = this.inputs[2][0];
      if (this.process) {
        this.process(1);
      } else {
        this.outputs[0][0] = this._in * this._mul + this._add;
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
    next[0][2][2] = function(inNumSamples) {
      var out = this.outputs[0];
      var _in   = this._in;
      var mulIn = this.inputs[1];
      var addIn = this.inputs[2];
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = _in * mulIn[i  ] + addIn[i  ];
        out[i+1] = _in * mulIn[i+1] + addIn[i+1];
        out[i+2] = _in * mulIn[i+2] + addIn[i+2];
        out[i+3] = _in * mulIn[i+3] + addIn[i+3];
        out[i+4] = _in * mulIn[i+4] + addIn[i+4];
        out[i+5] = _in * mulIn[i+5] + addIn[i+5];
        out[i+6] = _in * mulIn[i+6] + addIn[i+6];
        out[i+7] = _in * mulIn[i+7] + addIn[i+7];
      }
    };
    next[0][2][1] = function(inNumSamples) {
      var out = this.outputs[0];
      var _in   = this._in;
      var mulIn = this.inputs[1];
      var add = this._add;
      var nextAdd = this.inputs[2][0];
      var add_slope = (nextAdd - add) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = _in * mulIn[i  ] + add; add += add_slope;
        out[i+1] = _in * mulIn[i+1] + add; add += add_slope;
        out[i+2] = _in * mulIn[i+2] + add; add += add_slope;
        out[i+3] = _in * mulIn[i+3] + add; add += add_slope;
        out[i+4] = _in * mulIn[i+4] + add; add += add_slope;
        out[i+5] = _in * mulIn[i+5] + add; add += add_slope;
        out[i+6] = _in * mulIn[i+6] + add; add += add_slope;
        out[i+7] = _in * mulIn[i+7] + add; add += add_slope;
      }
      this._add = nextAdd;
    };
    next[0][2][0] = function(inNumSamples) {
      var out = this.outputs[0];
      var _in   = this._in;
      var mulIn = this.inputs[1];
      var add = this._add;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = _in * mulIn[i  ] + add;
        out[i+1] = _in * mulIn[i+1] + add;
        out[i+2] = _in * mulIn[i+2] + add;
        out[i+3] = _in * mulIn[i+3] + add;
        out[i+4] = _in * mulIn[i+4] + add;
        out[i+5] = _in * mulIn[i+5] + add;
        out[i+6] = _in * mulIn[i+6] + add;
        out[i+7] = _in * mulIn[i+7] + add;
      }
    };
    next[0][1][2] = function(inNumSamples) {
      var out = this.outputs[0];
      var _in   = this._in;
      var mul   = this._mul;
      var addIn = this.inputs[2];
      var nextMul = this.inputs[1][0];
      var mul_slope = (nextMul - mul) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = _in * mul + addIn[i  ]; mul += mul_slope;
        out[i+1] = _in * mul + addIn[i+1]; mul += mul_slope;
        out[i+2] = _in * mul + addIn[i+2]; mul += mul_slope;
        out[i+3] = _in * mul + addIn[i+3]; mul += mul_slope;
        out[i+4] = _in * mul + addIn[i+4]; mul += mul_slope;
        out[i+5] = _in * mul + addIn[i+5]; mul += mul_slope;
        out[i+6] = _in * mul + addIn[i+6]; mul += mul_slope;
        out[i+7] = _in * mul + addIn[i+7]; mul += mul_slope;
      }
      this._mul = nextMul;
    };
    next[0][1][1] = function() {
      this.outputs[0][0] = this._in * this.inputs[1][0] + this.inputs[2][0];
    };
    next[0][1][0] = function() {
      this.outputs[0][0] = this._in * this.inputs[1][0] + this._add;
    };
    next[0][0][2] = function(inNumSamples) {
      var out = this.outputs[0];
      var _in   = this._in;
      var mul   = this._mul;
      var addIn = this.inputs[2];
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = _in * mul + addIn[i  ];
        out[i+1] = _in * mul + addIn[i+1];
        out[i+2] = _in * mul + addIn[i+2];
        out[i+3] = _in * mul + addIn[i+3];
        out[i+4] = _in * mul + addIn[i+4];
        out[i+5] = _in * mul + addIn[i+5];
        out[i+6] = _in * mul + addIn[i+6];
        out[i+7] = _in * mul + addIn[i+7];
      }
    };
    next[0][0][1] = function() {
      this.outputs[0][0] = this._in * this._mul + this.inputs[2][0];
    };
    
    return ctor;
  })();

  cc.unit.specs.Sum3 = (function() {
    var ctor = function() {
      var rates = this.inRates;
      var process = next[rates[0]][rates[1]][rates[2]];
      this.process = process;
      this._in0 = this.inputs[0][0];
      this._in1 = this.inputs[1][0];
      this._in2 = this.inputs[2][0];
      if (this.process) {
        this.process(1);
      } else {
        this.outputs[0][0] = this._in0 * this._in1 + this._in2;
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

    return ctor;
  })();
  
  cc.unit.specs.Sum4 = (function() {
    var ctor = function() {
      var rates = this.inRates;
      var process = next[rates[0]][rates[1]][rates[2]][rates[3]];
      this.process = process;
      this._in0 = this.inputs[0][0];
      this._in1 = this.inputs[1][0];
      this._in2 = this.inputs[2][0];
      this._in3 = this.inputs[3][0];
      if (this.process) {
        this.process(1);
      } else {
        this.outputs[0][0] = this._in0 * this._in1 + this._in2 + this._in3;
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
    
    return ctor;
  })();
  
  module.exports = {};

});
define('cc/server/unit/osc', function(require, exports, module) {

  var cc = require("../cc");
  var table = require("./table");
  
  var twopi = 2 * Math.PI;
  var kSineSize = table.kSineSize;
  var kSineMask = table.kSineMask;
  var gSineWavetable = table.gSineWavetable;
  
  cc.unit.specs.SinOsc = (function() {
    var ctor = function() {
      this._freq  = this.inputs[0][0];
      this._phase = this.inputs[1][0];
      this._radtoinc = kSineSize / twopi;
      this._cpstoinc = kSineSize * this.rate.sampleDur;
      this._mask  = kSineMask;
      this._table = gSineWavetable;
      if (this.inRates[0] === 2) {
        if (this.inRates[1] === 2) {
          this.process = next_aa;
        } else if (this.inRates[1] === 1) {
          this.process = next_ak;
        } else {
          this.process = next_ai;
        }
        this._x = 0;
      } else {
        if (this.inRates[1] === 2) {
          this.process = next_ka;
          this._x = 0;
        } else {
          this.process = next_kk;
          this._x = this._phase * this._radtoinc;
        }
      }
      next_kk.call(this, 1);
    };
    var next_aa = function(inNumSamples) {
      var out = this.outputs[0];
      var freqIn  = this.inputs[0];
      var phaseIn = this.inputs[1];
      var mask  = this._mask;
      var table = this._table;
      var cpstoinc = this._cpstoinc;
      var radtoinc = this._radtoinc;
      var x = this._x, pphase, index, i;
      for (i = 0; i < inNumSamples; ++i) {
        pphase = x + radtoinc * phaseIn[i];
        index  = (pphase & mask) << 1;
        out[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
        x += freqIn[i] * cpstoinc;
      }
      this._x = x;
    };
    var next_ak = function(inNumSamples) {
      var out = this.outputs[0];
      var freqIn    = this.inputs[0];
      var nextPhase = this.inputs[1][0];
      var mask  = this._mask;
      var table = this._table;
      var radtoinc = this._radtoinc;
      var cpstoinc = this._cpstoinc;
      var phase = this._phase;
      var x = this._x, pphase, index, i;
      if (nextPhase === phase) {
        phase *= radtoinc;
        for (i = 0; i < inNumSamples; ++i) {
          pphase = x + phase;
          index  = (pphase & mask) << 1;
          out[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
          x += freqIn[i] * cpstoinc;
        }
      } else {
        var phase_slope = (nextPhase - phase) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          pphase = x + radtoinc * phase;
          index  = (pphase & mask) << 1;
          out[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
          phase += phase_slope;
          x += freqIn[i] * cpstoinc;
        }
        this._phase = nextPhase;
      }
      this._x = x;
    };
    var next_ai = function(inNumSamples) {
      var out = this.outputs[0];
      var freqIn = this.inputs[0];
      var phase  = this._phase * this._radtoinc;
      var mask  = this._mask;
      var table = this._table;
      var cpstoinc = this._cpstoinc;
      var x = this._x, pphase, index, i;
      for (i = 0; i < inNumSamples; ++i) {
        pphase = x + phase;
        index  = (pphase & mask) << 1;
        out[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
        x += cpstoinc * freqIn[i];
      }
      this._x = x;
    };
    var next_ka = function(inNumSamples) {
      var out = this.outputs[0];
      var nextFreq = this.inputs[0][0];
      var phaseIn = this.inputs[1];
      var mask  = this._mask;
      var table = this._table;
      var radtoinc = this._radtoinc;
      var cpstoinc = this._cpstoinc;
      var freq = this._freq;
      var x = this._x, pphase, index, i;
      if (nextFreq === freq) {
        freq *= cpstoinc;
        for (i = 0; i < inNumSamples; ++i) {
          pphase = x + radtoinc * phaseIn[i];
          index  = (pphase & mask) << 1;
          out[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
          x += freq;
        }
      } else {
        var freq_slope = (nextFreq - freq) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          pphase = x + radtoinc * phaseIn[i];
          index  = (pphase & mask) << 1;
          out[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
          x += freq * cpstoinc;
          freq += freq_slope;
        }
        this._freq = nextFreq;
      }
      this._x = x;
    };
    var next_kk = function(inNumSamples) {
      var out = this.outputs[0];
      var nextFreq  = this.inputs[0][0];
      var nextPhase = this.inputs[1][0];
      var mask  = this._mask;
      var table = this._table;
      var radtoinc = this._radtoinc;
      var cpstoinc = this._cpstoinc;
      var freq = this._freq;
      var phase = this._phase;
      var x = this._x, pphase, index, i;
      if (nextFreq === freq && nextPhase === phase) {
        freq  *= cpstoinc;
        phase *= radtoinc;
        for (i = 0; i < inNumSamples; ++i) {
          pphase = x + phase;
          index  = (pphase & mask) << 1;
          out[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
          x += freq;
        }
      } else {
        var freq_slope  = (nextFreq  - freq ) * this.rate.slopeFactor;
        var phase_slope = (nextPhase - phase) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          pphase = x + radtoinc * phase;
          index  = (pphase & mask) << 1;
          out[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
          x += freq * cpstoinc;
          freq  += freq_slope;
          phase += phase_slope;
        }
        this._freq  = nextFreq;
        this._phase = nextPhase;
      }
      this._x = x;
    };
    
    return ctor;
  })();

  cc.unit.specs.SinOscFB = (function() {
    var ctor = function() {
      this.process = next_aa;
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
    var next_aa = function(inNumSamples) {
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

  cc.unit.specs.LFSaw = (function() {
    var ctor = function() {
      if (this.inRates[0] === 2) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      this._cpstoinc = 2 * this.rate.sampleDur;
      this._phase    = this.inputs[1][0];
      this.process(1);
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var freqIn   = this.inputs[0];
      var cpstoinc = this._cpstoinc;
      var phase    = this._phase;
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = phase;
        phase += freqIn[i] * cpstoinc;
        if (phase >= 1) {
          phase -= 2;
        } else if (phase <= -1) {
          phase += 2;
        }
      }
      this._phase = phase;
    };
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var freq = this.inputs[0][0] * this._cpstoinc;
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

  cc.unit.specs.LFPar = (function() {
    var ctor = function() {
      if (this.inRates[0] === 2) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      this._cpstoinc = 4 * this.rate.sampleDur;
      this._phase   = this.inputs[1][0];
      this.process(1);
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var freqIn   = this.inputs[0];
      var cpstoinc = this._cpstoinc;
      var phase    = this._phase;
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
        phase += freqIn[i] * cpstoinc;
      }
      this._phase = phase;
    };
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var freq = this.inputs[0][0] * this._cpstoinc;
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

  cc.unit.specs.LFCub = (function() {
    var ctor = function() {
      if (this.inRates[0] === 2) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      this._cpstoinc = 2 * this.rate.sampleDur;
      this._phase   = this.inputs[1][0] + 0.5;
      this.process(1);
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var freqIn   = this.inputs[0];
      var cpstoinc = this._cpstoinc;
      var phase    = this._phase;
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
        phase += freqIn[i] * cpstoinc;
      }
      this._phase = phase;
    };
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var freq = this.inputs[0][0] * this._cpstoinc;
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

  cc.unit.specs.LFTri = (function() {
    var ctor = function() {
      if (this.inRates[0] === 2) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      this._cpstoinc = 4 * this.rate.sampleDur;
      this._phase   = this.inputs[1][0];
      this.process(1);
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var freqIn   = this.inputs[0];
      var cpstoinc = this._cpstoinc;
      var phase    = this._phase;
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = phase > 1 ? 2 - phase : phase;
        phase += freqIn[i] * cpstoinc;
        if (phase >= 3) { phase -= 4; }
      }
      this._phase = phase;
    };
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var freq = this.inputs[0][0] * this._cpstoinc;
      var phase = this._phase;
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = phase > 1 ? 2 - phase : phase;
        phase += freq;
        if (phase >= 3) { phase -= 4; }
      }
      this._phase = phase;
    };
    return ctor;
  })();

  cc.unit.specs.LFPulse = (function() {
    var ctor = function() {
      if (this.inRates[0] === 2) {
        this.process = next_a;
      } else {
        this.process = next_k;
      }
      this._cpstoinc = this.rate.sampleDur;
      this._phase   = this.inputs[1][0];
      this._duty    = this.inputs[2][0];
      this.process(1);
    };
    var next_a = function(inNumSamples) {
      var out = this.outputs[0];
      var freqIn   = this.inputs[0];
      var cpstoinc = this._cpstoinc;
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
        phase += freqIn[i] * cpstoinc;
      }
      this._duty  = duty;
      this._phase = phase;
    };
    var next_k = function(inNumSamples) {
      var out = this.outputs[0];
      var freq = this.inputs[0][0] * this._cpstoinc;
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
  
  module.exports = {};

});
define('cc/server/unit/table', function(require, exports, module) {

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
  
  module.exports = {
    kSineSize: kSineSize,
    kSineMask: kSineMask,
    gSine         : gSine,
    gInvSine      : gInvSine,
    gSineWavetable: gSineWavetable,
  };

});
define('cc/server/unit/pan', function(require, exports, module) {

  var cc = require("../cc");
  var table = require("./table");
  var gSine = table.gSine;

  cc.unit.specs.Pan2 = (function() {
    var ctor = function() {
      if (this.inRates[1] === 2) {
        this.process = next_aa;
      } else {
        this.process = next_ak;
      }
      this._pos   = this.inputs[1][0];
      this._level = this.inputs[2][0];
      var ipos = (1024 * this._pos + 1024 + 0.5)|0;
      ipos = Math.max(0, Math.min(ipos, 2048));
      this._leftAmp  = this._level * gSine[2048 - ipos];
      this._rightAmp = this._level * gSine[ipos];
      next_aa.call(this, 1);
    };
    var next_ak = function(inNumSamples) {
      var leftOut  = this.outputs[0];
      var rightOut = this.outputs[1];
      var inIn  = this.inputs[0];
      var pos   = this.inputs[1][0];
      var level = this.inputs[2][0];
      var leftAmp  = this._leftAmp;
      var rightAmp = this._rightAmp;
      var i, _in;
      if (pos !== this._pos || level !== this._level) {
        var ipos = (1024 * pos + 1024 + 0.5)|0;
        ipos = Math.max(0, Math.min(ipos, 2048));
        var nextLeftAmp  = level * gSine[2048 - ipos];
        var nextRightAmp = level * gSine[ipos];
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
        this._pos = pos;
        this._level = level;
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
    var next_aa = function(inNumSamples) {
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

    return ctor;
  })();
  
  module.exports = {};

});
define('cc/server/unit/ui', function(require, exports, module) {

  var cc = require("../cc");
  
  var log001 = Math.log(0.001);

  cc.unit.specs.MouseX = (function() {
    var ctor = function() {
      this.process = next_kkkk;
      this._y1  = 0;
      this._b1  = 0;
      this._lag = 0;
      this.process(1);
    };
    var next_kkkk = function(inNumSamples, instance) {
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

  cc.unit.specs.MouseY = (function() {
    var ctor = function() {
      this.process = next_kkkk;
      this._y1  = 0;
      this._b1  = 0;
      this._lag = 0;
      this.process(1);
    };
    var next_kkkk = function(inNumSamples, instance) {
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

  cc.unit.specs.MouseButton = (function() {
    var ctor = function() {
      this.process = next_kkk;
      this._y1  = 0;
      this._b1  = 0;
      this._lag = 0;
      this.process(1);
    };
    var next_kkk = function(inNumSamples, instance) {
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
define('cc/server/unit/uop', function(require, exports, module) {

  var cc  = require("../cc");
  var ops = require("../../common/ops");
  var avoidzero = require("./utils").avoidzero;
  
  var calcFunc = {};
  
  cc.unit.specs.UnaryOpUGen = (function() {
    
    var ctor = function() {
      var func = calcFunc[ops.UNARY_OP_UGEN_MAP[this.specialIndex]];
      var process;
      if (func) {
        switch (this.inRates[0]) {
        case 2:
          process = func.a;
          break;
        case 1:
          process = func.k;
          break;
        }
        this.process = process;
        if (this.process) {
          this.process(1);
        } else {
          this.outputs[0][0] = func(this.inputs[0][0]);
        }
      } else {
        cc.console.warn("UnaryOpUGen[" + ops.UNARY_OP_UGEN_MAP[this.specialIndex] + "] is not defined.");
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
  
  calcFunc.neg = function(a) {
    return -a;
  };
  calcFunc.not = function(a) {
    return a === 0 ? 1 : 0;
  };
  calcFunc.abs = function(a) {
    return Math.abs(a);
  };
  calcFunc.ceil = function(a) {
    return Math.ceil(a);
  };
  calcFunc.floor = function(a) {
    return Math.floor(a);
  };
  calcFunc.frac = function(a) {
    if (a < 0) {
      return 1 + (a - (a|0));
    }
    return a - (a|0);
  };
  calcFunc.sign = function(a) {
    if (a === 0) {
      return 0;
    } else if (a > 0) {
      return 1;
    }
    return -1;
  };
  calcFunc.squared = function(a) {
    return a * a;
  };
  calcFunc.cubed = function(a) {
    return a * a * a;
  };
  calcFunc.sqrt = function(a) {
    return Math.sqrt(Math.abs(a));
  };
  calcFunc.exp = function(a) {
    return Math.exp(a);
  };
  calcFunc.reciprocal = function(a) {
    return 1 / avoidzero(a);
  };
  calcFunc.midicps = function(a) {
    return 440 * Math.pow(2, (a - 69) * 1/12);
  };
  calcFunc.cpsmidi = function(a) {
    return Math.log(Math.abs(avoidzero(a)) * 1/440) * Math.LOG2E * 12 + 69;
  };
  calcFunc.midiratio = function(a) {
    return Math.pow(2, a * 1/12);
  };
  calcFunc.ratiomidi = function(a) {
    return Math.log(Math.abs(avoidzero(a))) * Math.LOG2E * 12;
  };
  calcFunc.dbamp = function(a) {
    return Math.pow(10, a * 0.05);
  };
  calcFunc.ampdb = function(a) {
    return Math.log(Math.abs(avoidzero(a))) * Math.LOG10E * 20;
  };
  calcFunc.octcps = function(a) {
    return 440 * Math.pow(2, avoidzero(a) - 4.75);
  };
  calcFunc.cpsoct = function(a) {
    return Math.log(Math.abs(a) * 1/440) * Math.LOG2E + 4.75;
  };
  calcFunc.log = function(a) {
    return Math.log(Math.abs(avoidzero(a)));
  };
  calcFunc.log2 = function(a) {
    return Math.log(Math.abs(avoidzero(a))) * Math.LOG2E;
  };
  calcFunc.log10 = function(a) {
    return Math.log(Math.abs(avoidzero(a))) * Math.LOG10E;
  };
  calcFunc.sin = function(a) {
    return Math.sin(a);
  };
  calcFunc.cos = function(a) {
    return Math.cos(a);
  };
  calcFunc.tan = function(a) {
    return Math.tan(a);
  };
  calcFunc.asin = function(a) {
    return Math.asin(Math.max(-1, Math.min(a, 1)));
  };
  calcFunc.acos = function(a) {
    return Math.acos(Math.max(-1, Math.min(a, 1)));
  };
  calcFunc.atan = function(a) {
    return Math.atan(a);
  };
  calcFunc.sinh = function(a) {
    return (Math.pow(Math.E, a) - Math.pow(Math.E, -a)) * 0.5;
  };
  calcFunc.cosh = function(a) {
    return (Math.pow(Math.E, a) + Math.pow(Math.E, -a)) * 0.5;
  };
  calcFunc.tanh = function(a) {
    var sinh = (Math.pow(Math.E, a) - Math.pow(Math.E, -a)) * 0.5;
    var cosh = (Math.pow(Math.E, a) + Math.pow(Math.E, -a)) * 0.5;
    return sinh / cosh;
  };
  calcFunc.rand = function(a) {
    return Math.random() * a;
  };
  calcFunc.rand2 = function(a) {
    return (Math.random() * 2 - 1) * a;
  };
  calcFunc.linrand = function(a) {
    return Math.min(Math.random(), Math.random()) * a;
  };
  calcFunc.bilinrand = function(a) {
    return (Math.random() - Math.random()) * a;
  };
  calcFunc.sum3rand = function(a) {
    return (Math.random() + Math.random() + Math.random() - 1.5) * 0.666666667 * a;
  };
  calcFunc.distort = function(a) {
    return a / (1 + Math.abs(a));
  };
  calcFunc.softclip = function(a) {
    var absa = Math.abs(a);
    return absa <= 0.5 ? a : (absa - 0.25) / a;
  };
  calcFunc.coin = function(a) {
    return Math.random() < a ? 1 : 0;
  };
  calcFunc.num = function(a) {
    return +a;
  };
  calcFunc.tilde = function(a) {
    return ~a;
  };
  calcFunc.pi = function(a) {
    return Math.PI * a;
  };
  calcFunc.to_i = function(a) {
    return a|0;
  };
  
  Object.keys(calcFunc).forEach(function(key) {
    var func = calcFunc[key];
    func.a = unary_a(func);
    func.k = unary_k(func);
  });
  
  module.exports = {
    calcFunc: calcFunc,
    unary_k : unary_k,
    unary_a : unary_a
  };

});
define('cc/server/commands', function(require, exports, module) {
  
  var node   = require("./node");
  var buffer = require("./buffer");
  
  var commands = {};
  
  // the 'this.' context is an instance.
  
  commands["/n_run"] = function(msg) {
    var nodeId = msg[1]|0;
    var flag   = !!msg[2];
    var target = this.nodes[nodeId];
    if (target) {
      target.running = flag;
    }
  };
  commands["/n_free"] = function(msg) {
    var nodeId = msg[1]|0;
    var target = this.nodes[nodeId];
    if (target) {
      target.doneAction(2);
    }
  };
  commands["/n_set"] = function(msg) {
    var nodeId = msg[1]|0;
    var controls = msg[2];
    var target = this.nodes[nodeId];
    if (target) {
      target.set(controls);
    }
  };
  commands["/g_new"] = function(msg) {
    var nodeId       = msg[1]|0;
    var addAction    = msg[2]|0;
    var targetNodeId = msg[3]|0;
    var target = this.nodes[targetNodeId];
    if (target) {
      this.nodes[nodeId] = new node.Group(nodeId, target, addAction, this);
    }
  };
  commands["/s_def"] = function(msg) {
    var defId = msg[1]|0;
    var specs = JSON.parse(msg[2]);
    this.defs[defId] = specs;
  };
  commands["/s_new"] = function(msg) {
    var nodeId       = msg[1]|0;
    var addAction    = msg[2]|0;
    var targetNodeId = msg[3]|0;
    var defId        = msg[4]|0;
    var controls     = msg[5];
    var target = this.nodes[targetNodeId];
    if (target) {
      this.nodes[nodeId] = new node.Synth(nodeId, target, addAction, defId, controls, this);
    }
  };
  commands["/b_new"] = function(msg) {
    var bufId = msg[1]|0;
    this.buffers[bufId] = new buffer.AudioBuffer(bufId);
  };
  commands["/b_bind"] = function(msg) {
    var bufId      = msg[1]|0;
    var bufSrcId   = msg[2]|0;
    var startFrame = msg[3]|0;
    var frames     = msg[4]|0;
    var buffer = this.buffers[bufId];
    var bufSrc = this.bufSrc[bufSrcId];
    if (buffer) {
      if (bufSrc) {
        buffer.bindBufferSource(bufSrc, startFrame, frames);
      } else {
        bufSrc = new buffer.BufferSource(bufSrcId);
        bufSrc.pendings.push([buffer, startFrame, frames]);
        this.bufSrc[bufSrcId] = bufSrc;
      }
    }
  };
  
  commands[0] = function(binary) {
    this.syncItems.set(binary);
    var server    = this.manager.server;
    var syncCount = new Uint32Array(binary.buffer)[1];
    if (server.sysSyncCount < syncCount) {
      server.sysSyncCount = syncCount;
    }
  };
  commands[1] = function(binary) {
    var bufSrcId = (binary[3] << 8) + binary[2];
    var channels = (binary[7] << 8) + binary[6];
    var sampleRate = (binary[11] << 24) + (binary[10] << 16) + (binary[ 9] << 8) + binary[ 8];
    var frames     = (binary[15] << 24) + (binary[14] << 16) + (binary[13] << 8) + binary[12];
    var samples = new Float32Array(binary.subarray(16).buffer);
    var bufSrc = this.bufSrc[bufSrcId];
    if (!bufSrc) {
      bufSrc = new buffer.BufferSource(bufSrcId);
    }
    bufSrc.set(channels, sampleRate, frames, samples);
    this.bufSrc[bufSrcId] = bufSrc;
  };
  
  module.exports = commands;

});
define('cc/server/buffer', function(require, exports, module) {

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
  
  var AudioBuffer = (function() {
    function AudioBuffer(bufId) {
      this.bufId      = bufId;
      this.frames     = 0;
      this.channels   = 0;
      this.sampleRate = 0;
      this.samples    = null;
    }
    AudioBuffer.prototype.bindBufferSource = function(bufSrc, startFrame, frames) {
      startFrame = Math.max( 0, Math.min(startFrame|0, bufSrc.frames));
      frames  = Math.max(-1, Math.min(frames |0, bufSrc.frames - startFrame));
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
    return AudioBuffer;
  })();
  
  module.exports = {
    BufferSource: BufferSource,
    AudioBuffer : AudioBuffer
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
  
  
  module.exports = {
    use: function() {
      cc.createRate = function(sampleRate, bufLength) {
        return new Rate(sampleRate, bufLength);
      };
      cc.getRateInstance = (function() {
        var rates = {};
        return function(rate) {
          if (!rates[rate]) {
            switch (rate) {
            case 2:
              rates[2] = new Rate(cc.server.sampleRate, cc.server.bufLength);
              break;
            case 1:
              rates[1] = new Rate(cc.server.sampleRate / cc.server.bufLength, 1);
              break;
            }
          }
          return rates[rate];
        };
      })();
    }
  };

  module.exports.use();

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
      this.offset = 0;
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
      if (this.sysSyncCount < this.syncCount[0] - 4) {
        return;
      }
      var strm = this.strm;
      var instanceManager = this.instanceManager;
      var strmLength = this.strmLength;
      var bufLength  = this.bufLength;
      var busOutL = instanceManager.busOutL;
      var busOutR = instanceManager.busOutR;
      var lang = cc.lang;
      var offset = 0;
      for (var i = 0, imax = strmLength / bufLength; i < imax; ++i) {
        lang.process();
        instanceManager.process(bufLength);
        var j = bufLength, k = strmLength + bufLength;
        while (k--, j--) {
          strm[j + offset] = Math.max(-32768, Math.min(busOutL[j] * 32768, 32767));
          strm[k + offset] = Math.max(-32768, Math.min(busOutR[j] * 32768, 32767));
        }
        offset += bufLength;
      }
      this.sendToLang(strm);
      this.syncCount[0] += 1;
    };
    
    return WorkerSynthServer;
  })();
  
  module.exports = {
    use: function() {
      cc.createWorkerSynthServer = function() {
        var server = new WorkerSynthServer();
        cc.opmode = "worker";
        return server;
      };
    }
  };
  
  module.exports.use();

});
define('cc/server/server-iframe', function(require, exports, module) {

  var cc = require("./cc");
  var extend = require("../common/extend");
  
  var IFrameSynthServer = (function() {
    function IFrameSynthServer() {
      cc.SynthServer.call(this);
      
      this.sampleRate = 44100;
      this.channels   = 2;
      this.strmLength = 2048;
      this.bufLength  = 128;
    }
    extend(IFrameSynthServer, cc.SynthServer);
    
    IFrameSynthServer.prototype.sendToLang = function(msg) {
      postMessage(msg);
    };
    IFrameSynthServer.prototype.connect = function() {
      this.sendToLang([
        "/connected", this.sampleRate, this.channels
      ]);
    };
    IFrameSynthServer.prototype.process = function() {
      if (this.sysSyncCount < this.syncCount[0] - 4) {
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
    };
    
    return IFrameSynthServer;
  })();
  
  module.exports = {
    use: function() {
      cc.createIFrameSynthServer = function() {
        var server = new IFrameSynthServer();
        global.onmessage = function(e) {
          server.recvFromLang(e.data, 0);
        };
        cc.opmode = "iframe";
        return server;
      };
    }
  };
  
  module.exports.use();

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
        this.timer.start(this.process.bind(this), 10);
      }
    };
    NodeJSSynthServer.prototype.pause = function(msg, userId) {
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
    NodeJSSynthServer.prototype.process = function() {
      if (this.sysSyncCount < this.syncCount[0] - 4) {
        return;
      }
      var strm = this.strm;
      var instanceManager = this.instanceManager;
      var strmLength = this.strmLength;
      var bufLength  = this.bufLength;
      var busOutL = instanceManager.busOutL;
      var busOutR = instanceManager.busOutR;
      var lang = cc.lang;
      var offset = 0;
      for (var i = 0, imax = strmLength / bufLength; i < imax; ++i) {
        lang.process();
        instanceManager.process(bufLength);
        var j = bufLength, k = strmLength + bufLength;
        while (k--, j--) {
          strm[j + offset] = Math.max(-32768, Math.min(busOutL[j] * 32768, 32767));
          strm[k + offset] = Math.max(-32768, Math.min(busOutR[j] * 32768, 32767));
        }
        offset += bufLength;
      }
      this.sendToLang(strm);
      this.syncCount[0] += 1;
      if (this.api) {
        this.strmList[this.strmListWriteIndex] = new Int16Array(strm);
        this.strmListWriteIndex = (this.strmListWriteIndex + 1) & 7;
      }
    };
    NodeJSSynthServer.prototype._process = function() {
      var strm = this.strmList[this.strmListReadIndex];
      if (strm) {
        this.strmListReadIndex = (this.strmListReadIndex + 1) & 7;
        this._strm.set(strm);
      }
      this.sysSyncCount += 1;
    };
    
    return NodeJSSynthServer;
  })();
  
  cc.NodeJSSynthServer = NodeJSSynthServer;
  
  module.exports = {
    use: function() {
      cc.createNodeJSSynthServer = function() {
        var server = new NodeJSSynthServer();
        cc.opmode = "nodejs";
        return server;
      };
    }
  };
  
  module.exports.use();

});
define('cc/server/server-socket', function(require, exports, module) {

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
      this.sampleRate = 44100;
      this.channels   = 2;
      this.strmLength = 4096;
      this.bufLength  = 128;
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
      if (this.sysSyncCount < this.syncCount[0] - 4) {
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
      this.syncCount[0] += 1;
      
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
        cc.console.warn("CoffeeColliderSocketServer has been created already.");
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
  
  module.exports = {
    use: function() {
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
    }
  };
  
  module.exports.use();

});
  var exports = _require("cc/cc", "cc/loader");
if (typeof module !== "undefined") {
  module.exports = exports;
}
})(this.self||global);
