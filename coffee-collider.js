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
    if (typeof module !== "function") {
      throw (moduleName);
    }
    var ret = module(req, exports, mod);
    exports = ret || mod.exports;
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
var define = _define;
define('cc/loader', function(require, exports, module) {

  var cc = require("./cc");

  if (typeof document !== "undefined") {
    cc.context = "client";
    require("./client/installer").install(global);
  } else if (typeof WorkerLocation !== "undefined") {
    cc.context = "server";
    require("./server/installer").install(global);
  }
  
  module.exports = {
  };

});
define('cc/cc', function(require, exports, module) {

  module.exports = {
    version: "0",
  };

});
define('cc/client/installer', function(require, exports, module) {

  var cc = require("../cc");
  var CoffeeCollider = require("./coffee_collider").CoffeeCollider;

  if (typeof document !== "undefined") {
    var scripts = document.getElementsByTagName("script");
    if (scripts && scripts.length) {
      var m;
      for (var i = 0; i < scripts.length; i++) {
        if (!cc.coffeeColliderPath) {
          m = /^(.*\/)coffee-collider(?:-min)?\.js/.exec(scripts[i].src);
          if (m) {
            cc.rootPath = m[1];
            cc.coffeeColliderPath = m[0];
            break;
          }
        }
      }
    }
  }
  
  var install = function(global) {
    global.CoffeeCollider = CoffeeCollider;
  };

  module.exports = {
    install: install
  };

});
define('cc/client/coffee_collider', function(require, exports, module) {

  var cc = require("../cc");
  var SynthClient = require("./client").SynthClient;

  var CoffeeCollider = (function() {
    function CoffeeCollider() {
      this.version    = cc.version;
      this.client = new SynthClient();
      this.sampleRate = this.client.sampleRate;
      this.channels   = this.client.channels;
      this.compiler   = this.client.compiler;
    }
    CoffeeCollider.prototype.destroy = function() {
      if (this.client) {
        this.client.destroy();
        delete this.client;
        delete this.sampleRate;
        delete this.channels;
      }
      return this;
    };
    CoffeeCollider.prototype.play = function() {
      if (this.client) {
        this.client.play();
      }
      return this;
    };
    CoffeeCollider.prototype.reset = function() {
      if (this.client) {
        this.client.reset();
      }
      return this;
    };
    CoffeeCollider.prototype.pause = function() {
      if (this.client) {
        this.client.pause();
      }
      return this;
    };
    CoffeeCollider.prototype.exec = function(code, callback) {
      if (this.client) {
        this.client.exec(code, callback);
      }
      return this;
    };
    CoffeeCollider.prototype.getStream = function() {
      if (this.client) {
        return this.client.strm;
      }
    };
    CoffeeCollider.prototype.loadScript = function(path) {
      if (this.client) {
        this.client.loadScript(path);
      }
      return this;
    };
    return CoffeeCollider;
  })();

  module.exports = {
    CoffeeCollider: CoffeeCollider
  };

});
define('cc/client/client', function(require, exports, module) {

  var cc = require("../cc");
  var SoundSystem = require("./sound_system").SoundSystem;
  var Compiler = require("./compiler").Compiler;
  var unpack = require("./utils").unpack;

  var commands = {};
  
  var SynthClient = (function() {
    function SynthClient() {
      var that = this;
      this.worker = new Worker(cc.coffeeColliderPath);
      this.worker.addEventListener("message", function(e) {
        var msg = e.data;
        if (msg instanceof Float32Array) {
            that.strmList[that.strmListWriteIndex] = msg;
            that.strmListWriteIndex = (that.strmListWriteIndex + 1) & 7;
        } else {
          that.recv(msg);
        }
      });
      this.compiler = new Compiler();
      
      this.isConnected = false;
      this.execId = 0;
      this.execCallbacks = {};

      this.sys = SoundSystem.getInstance();
      this.sys.append(this);

      this.sampleRate = this.sys.sampleRate;
      this.channels   = this.sys.channels;
      this.strmLength = this.sys.strmLength;
      this.bufLength  = this.sys.bufLength;
      
      this.isPlaying = false;
      this.strm = new Float32Array(this.strmLength * this.channels);
      this.strmList = new Array(8);
      this.strmListReadIndex  = 0;
      this.strmListWriteIndex = 0;
    }
    SynthClient.prototype.destroy = function() {
      this.sys.remove(this);
      delete this.worker;
    };
    SynthClient.prototype.play = function() {
      if (!this.isPlaying) {
        this.isPlaying = true;
        this.sys.play();
        this.send(["/play", this.sys.syncCount]);
      }
    };
    SynthClient.prototype.reset = function() {
    };
    SynthClient.prototype.pause = function() {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.sys.pause();
        this.send(["/pause"]);
      }
    };
    SynthClient.prototype.process = function() {
      var strm = this.strmList[this.strmListReadIndex];
      if (strm) {
        this.strmListReadIndex = (this.strmListReadIndex + 1) & 7;
        this.strm.set(strm);
      }
    };
    SynthClient.prototype.exec = function(code, callback) {
      if (typeof code === "string") {
        code = this.compiler.compile(code.trim());
        this.send(["/exec", this.execId, code]);
        if (typeof callback === "function") {
          this.execCallbacks[this.execId] = callback;
        }
        this.execId += 1;
      }
    };
    SynthClient.prototype.loadScript = function(path) {
      this.send(["/loadScript", path]);
    };
    SynthClient.prototype.send = function(msg) {
      this.worker.postMessage(msg);
    };
    SynthClient.prototype.recv = function(msg) {
      if (!msg) {
        return;
      }
      var func = commands[msg[0]];
      if (func) {
        func.call(this, msg);
      }
    };
    SynthClient.prototype.sync = function(syncItems) {
      this.send(syncItems);
    };
    return SynthClient;
  })();
  
  commands["/connect"] = function() {
    this.isConnected = true;
    this.send([
      "/init", this.sampleRate, this.channels, this.strmLength, this.bufLength, this.sys.syncCount
    ]);
  };
  commands["/exec"] = function(msg) {
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
    SynthClient: SynthClient
  };

});
define('cc/client/sound_system', function(require, exports, module) {

  var cc = require("../cc");
  
  var AudioAPI;
  
  var SoundSystem = (function() {
    function SoundSystem() {
      this.sampleRate = 44100;
      this.channels   = 2;
      this.api = new AudioAPI(this);
      this.sampleRate = this.api.sampleRate;
      this.channels   = this.api.channels;
      this.colliders  = [];
      this.process    = process0;
      this.strmLength = 1024;
      this.bufLength  = 64;
      this.strm  = new Float32Array(this.strmLength * this.channels);
      this.clear = new Float32Array(this.strmLength * this.channels);
      this.syncCount = 0;
      this.syncItems = new Float32Array(6); // syncCount, currentTime
      this.isPlaying = false;
    }
    var instance = null;
    SoundSystem.getInstance = function() {
      if (!instance) {
        instance = new SoundSystem();
      }
      return instance;
    };
    SoundSystem.prototype.append = function(cc) {
      var index = this.colliders.indexOf(cc);
      if (index === -1) {
        this.colliders.push(cc);
        if (this.colliders.length === 1) {
          this.process = process1;
        } else {
          this.process = processN;
        }
      }
    };
    SoundSystem.prototype.remove = function(cc) {
      var index = this.colliders.indexOf(cc);
      if (index !== -1) {
        this.colliders.splice(index, 1);
      }
      if (this.colliders.length === 1) {
        this.process = process1;
      } else if (this.colliders.length === 0) {
        this.process = process0;
      } else {
        this.process = processN;
      }
    };
    SoundSystem.prototype.play = function() {
      if (!this.isPlaying) {
        this.isPlaying = true;
        this.syncCount = 0;
        this.api.play();
      }
    };
    SoundSystem.prototype.pause = function() {
      if (this.isPlaying) {
        var flag = this.colliders.every(function(cc) {
          return !cc.isPlaying;
        });
        if (flag) {
          this.isPlaying = false;
          this.api.pause();
        }
      }
    };

    var process0 = function() {
      this.strm.set(this.clear);
    };
    var process1 = function() {
      var cc = this.colliders[0];
      this.syncItems[0] = this.syncCount;
      cc.process();
      this.strm.set(cc.strm);
      cc.sync(this.syncItems);
      this.syncCount++;
    };
    var processN = function() {
      var strm = this.strm;
      var strmLength = strm.length;
      var colliders  = this.colliders;
      var syncItems  = this.syncItems;
      var cc, tmp;
      syncItems[0] = this.syncCount;
      strm.set(this.clear);
      for (var i = 0, imax = colliders.length; i < imax; ++i) {
        cc = colliders[i];
        cc.process();
        tmp = cc.strm;
        for (var j = 0; j < strmLength; j += 8) {
          strm[j  ] += tmp[j  ]; strm[j+1] += tmp[j+1]; strm[j+2] += tmp[j+2]; strm[j+3] += tmp[j+3];
          strm[j+4] += tmp[j+4]; strm[j+5] += tmp[j+5]; strm[j+6] += tmp[j+6]; strm[j+7] += tmp[j+7];
        }
        cc.sync(syncItems);
      }
      this.syncCount++;
    };
    
    return SoundSystem;
  })();

  var AudioContext = global.AudioContext || global.webkitAudioContext;
  
  if (AudioContext) {
    AudioAPI = (function() {
      function WebAudioAPI(sys) {
        this.sys = sys;
        this.context = new AudioContext();
        this.sampleRate = this.context.sampleRate;
        this.channels   = 2;
      }

      WebAudioAPI.prototype.play = function() {
        var sys = this.sys;
        var onaudioprocess;
        var strmLength  = sys.strmLength;
        var strmLength4 = strmLength * 4;
        var buffer = sys.strm.buffer;
        if (this.sys.sampleRate === this.sampleRate) {
          onaudioprocess = function(e) {
            var outs = e.outputBuffer;
            sys.process();
            outs.getChannelData(0).set(new Float32Array(
              buffer.slice(0, strmLength4)
            ));
            outs.getChannelData(1).set(new Float32Array(
              buffer.slice(strmLength4)
            ));
          };
        }
        this.bufSrc = this.context.createBufferSource();
        this.jsNode = this.context.createJavaScriptNode(strmLength, 2, this.channels);
        this.jsNode.onaudioprocess = onaudioprocess;
        this.bufSrc.noteOn(0);
        this.bufSrc.connect(this.jsNode);
        this.jsNode.connect(this.context.destination);
      };
      WebAudioAPI.prototype.pause = function() {
        this.bufSrc.disconnect();
        this.jsNode.disconnect();
      };
      return WebAudioAPI;
    })();
  } else if (typeof Audio === "function" && typeof new Audio().mozSetup === "function") {
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
      }
      AudioDataAPI.prototype.play = function() {
        var sys = this.sys;
        var audio = new Audio();
        var interleaved = new Float32Array(sys.strmLength * sys.channels);
        var msec = (sys.strmLength / sys.sampleRate) * 1000;
        var written = 0;
        var start = Date.now();
        var inL = new Float32Array(sys.strm.buffer, 0, sys.strmLength);
        var inR = new Float32Array(sys.strm.buffer, sys.strmLength * 4);

        var onaudioprocess = function() {
          if (written > Date.now() - start) {
            return;
          }
          var i = interleaved.length;
          var j = inL.length;
          sys.process();
          while (j--) {
            interleaved[--i] = inR[j];
            interleaved[--i] = inL[j];
          }
          audio.mozWriteAudio(interleaved);
          written += msec;
        };

        audio.mozSetup(sys.channels, sys.sampleRate);
        timer.onmessage = onaudioprocess;
        timer.postMessage(msec * 0.8);
      };
      AudioDataAPI.prototype.pause = function() {
        timer.postMessage(0);
      };
      return AudioDataAPI;
    })();
  }

  if (!AudioAPI) {
    AudioAPI = (function() {
      function FallbackAudioAPI(sys) {
        this.sys = sys;
        this.sampleRate = 44100;
        this.channels   = 2;
      }
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
                  var x = (_in[i] * 16384 + 32768)|0;
                  x = Math.max(16384, Math.min(x, 49152));
                  out[i] = String.fromCharCode(x);
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
    SoundSystem: SoundSystem
  };

});
define('cc/client/compiler', function(require, exports, module) {

  var CoffeeScript = (function() {
    if (global.CoffeeScript) {
      return global.CoffeeScript;
    }
    try {
      return require(["coffee-script"][0]);
    } catch(e) {}
  })();

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
  // THIS
  // SUPER
  // INDENT
  // OUTDENT
  // TERMINATOR

  var TAG   = 0;
  var VALUE = 1;
  var _     = {}; // empty location
  
  var dumpTokens = function(tokens) {
    console.log(tokens.map(function(t) {
      return t[0] + "\t" + t[1];
    }).join("\n"));
  };
  
  var tab = function(n) {
    var t = "";
    while (n--) {
      t += " ";
    }
    return t;
  };
  
  var findOperandHead = function(tokens, index) {
    var bracket = 0;
    var indent  = 0;
    while (0 < index) {
      var token = tokens[index - 1];
      if (!token || token[TAG] !== ".") {
        token = tokens[index];
        switch (token[TAG]) {
        case "PARAM_START":
          return index;
        case "(": case "[": case "{":
          bracket -= 1;
          /* falls through */
        case "IDENTIFIER":
        case "NUMBER": case "STRING": case "BOOL":
        case "REGEX": case "NULL": case "UNDEFINED":
          if (indent === 0 && bracket === 0) {
            token = tokens[index - 1];
            if (token) {
              if (token[TAG] === "UNARY") {
                return index - 1;
              }
              if (token[VALUE] === "+" || token[VALUE] === "-") {
                token = tokens[index - 2];
                if (!token) {
                  return index - 1;
                }
                switch (token[TAG]) {
                case "INDENT": case "TERMINATOR": case "CALL_START":
                case "COMPOUND_ASSIGN": case "UNARY": case "LOGIC":
                case "SHIFT": case "COMPARE": case "=": case "..": case "...":
                case "[": case "(": case "{": case ",": case "?":
                  return index - 1;
                }
              }
            }
            return index;
          }
          break;
        case "}": case "]": case ")": case "PARAM_END": case "CALL_END":
          bracket += 1;
          break;
        case "INDENT":
          indent += token[VALUE]|0;
          break;
        case "OUTDENT":
          indent -= token[VALUE]|0;
          break;
        }
      }
      index -= 1;
    }
    return 0;
  };

  var findOperandTail = function(tokens, index) {
    var bracket  = 0;
    var indent   = 0;
    var inParams = false;
    while (index < tokens.length) {
      var token = tokens[index];
      if (inParams) {
        inParams = token[TAG] !== "PARAM_END";
        index += 1;
        continue;
      }
      switch (token[TAG]) {
      case "}": case "]": case ")": case "CALL_END":
        bracket -= 1;
        break;
      case "OUTDENT":
        indent -= token[VALUE]|0;
        break;
      case "PARAM_START":
        inParams = true;
        index += 1;
        continue;
      }
      token = tokens[index + 1];
      if (!token || token[TAG] !== ".") {
        token = tokens[index];
        switch (token[TAG]) {
        case "TERMINATOR":
          if (indent === 0) {
            return index - 1;
          }
          break;
        case "IDENTIFIER":
          token = tokens[index + 1];
          if (token && token[TAG] === "CALL_START") {
            bracket += 1;
            break;
          }
          if (indent === 0 && bracket === 0) {
            return index;
          }
          break;
        case "NUMBER": case "STRING": case "BOOL":
        case "REGEX": case "NULL": case "UNDEFINED":
          if (indent === 0 && bracket === 0) {
            return index;
          }
          break;
        case "(": case "[": case "{":
          bracket += 1;
          break;
        case "}": case "]": case ")": case "CALL_END":
          if (indent === 0 && bracket === 0) {
            return index;
          }
          break;
        case "INDENT":
          indent += token[VALUE]|0;
          break;
        case "OUTDENT":
          if (indent === 0 && bracket === 0) {
            return index;
          }
          break;
        }
      }
      index += 1;
    }
    return tokens.length - 1;
  };

  var replacePi = function(tokens) {
    var i = tokens.length - 1;
    while (0 <= i) {
      var a, b, token = tokens[i];
      if (token[VALUE] === "pi") {
        tokens.splice(i, 1);
        token = tokens[i - 1];
        if (token && token[TAG] === "NUMBER") {
          a = findOperandHead(tokens, i);
          tokens.splice(i, 0, ["MATH", "*", _]);
          b = i;
        } else {
          a = -1;
          b = i - 1;
        }
        tokens.splice(b+1, 0, ["IDENTIFIER", "Math", _]);
        tokens.splice(b+2, 0, ["."         , "."   , _]);
        tokens.splice(b+3, 0, ["IDENTIFIER", "PI"  , _]);
        if (a !== -1) {
          tokens.splice(b+4, 0, [")", ")", _]);
          tokens.splice(a, 0, ["(", "(", _]);
        }
      }
      i -= 1;
    }
    // dumpTokens(tokens);
    return tokens;
  };

  var replacePrecedence = function(tokens) {
    var i = tokens.length - 1;
    while (0 <= i) {
      var token = tokens[i];
      if (token[TAG] === "MATH") {
        var a = findOperandHead(tokens, i);
        var b = findOperandTail(tokens, i) + 1;
        tokens.splice(b, 0, [")", ")" , _]);
        tokens.splice(a, 0, ["(", "(" , _]);
      }
      i -= 1;
    }
    // dumpTokens(tokens);
    return tokens;
  };

  var replaceUnaryOpTable = {
    "+": "num",
    "-": "neg",
    "!": "not",
    "~": "tilde",
  };

  var replaceUnaryOp = function(tokens) {
    var i = tokens.length - 1;
    while (0 <= i) {
      var token = tokens[i];
      if (replaceUnaryOpTable.hasOwnProperty(token[VALUE])) {
        var selector = replaceUnaryOpTable[token[VALUE]];
        token = tokens[i - 1] || { 0:"TERMINATOR" };
        switch (token[TAG]) {
        case "INDENT": case "TERMINATOR": case "CALL_START":
        case "COMPOUND_ASSIGN": case "UNARY": case "LOGIC":
        case "SHIFT": case "COMPARE": case "=": case "..": case "...":
        case "[": case "(": case "{": case ",": case "?": case "+": case "-":
          var a = findOperandTail(tokens, i);
          tokens.splice(a+1, 0, ["."         , "."     , _]);
          tokens.splice(a+2, 0, ["IDENTIFIER", selector, _]);
          tokens.splice(a+3, 0, ["CALL_START", "("     , _]);
          tokens.splice(a+4, 0, ["CALL_END"  , ")"     , _]);
          tokens.splice(i, 1);
        }
      }
      i -= 1;
    }
    // dumpTokens(tokens);
    return tokens;
  };
  
  var replaceBinaryOpTable = {
    "+": "__add__",
    "-": "__sub__",
    "*": "__mul__",
    "/": "__div__",
    "%": "__mod__",
  };
  
  var replaceBinaryOp = function(tokens) {
    var i = 0;
    var replaceable = false;
    while (i < tokens.length) {
      var token = tokens[i];
      if (replaceable) {
        if (replaceBinaryOpTable.hasOwnProperty(token[VALUE])) {
          var selector = replaceBinaryOpTable[token[VALUE]];
          var b = findOperandTail(tokens, i) + 1;
          tokens.splice(i++, 1, ["."         , "."     , _]);
          tokens.splice(i++, 0, ["IDENTIFIER", selector, _]);
          tokens.splice(i  , 0, ["CALL_START", "("     , _]);
          tokens.splice(b+2, 0, ["CALL_END"  , ")"     , _]);
          replaceable = false;
          continue;
        }
      }
      switch (token[TAG]) {
      case "INDENT": case "TERMINATOR": case "CALL_START":
      case "COMPOUND_ASSIGN": case "UNARY": case "LOGIC":
      case "SHIFT": case "COMPARE": case "=": case "..": case "...":
      case "[": case "(": case "{": case ",": case "?":
        replaceable = false;
        break;
      default:
        replaceable = true;
      }
      i += 1;
    }
    // dumpTokens(tokens);
    return tokens;
  };

  var replaceCompoundAssignTable = {
    "+=": "__add__",
    "-=": "__sub__",
    "*=": "__mul__",
    "/=": "__div__",
    "%=": "__mod__",
  };
  
  var replaceCompoundAssign = function(tokens) {
    var i = tokens.length - 1;
    while (0 <= i) {
      var token = tokens[i];
      if (replaceCompoundAssignTable.hasOwnProperty(token[VALUE])) {
        var selector = replaceCompoundAssignTable[token[VALUE]];
        var a = findOperandHead(tokens, i);
        var b = findOperandTail(tokens, i) + 1;
        tokens[i] = ["=", "=", _];
        tokens.splice(i+1, 0, ["."         , "."     , _]);
        tokens.splice(i+2, 0, ["IDENTIFIER", selector, _]);
        tokens.splice(i+3, 0, ["CALL_START", "("     , _]);
        tokens.splice(b+3, 0, ["CALL_END"  , ")"     , _]);
        for (var j = a; j < i; j++) {
          tokens.splice(i+1, 0, tokens[j]);
        }
      }
      i -= 1;
    }
    // dumpTokens(tokens);
    return tokens;
  };

  var cleanupParenthesis = function(tokens) {
    var i = 0;
    var bracket = 0;
    while (i < tokens.length) {
      var token = tokens[i];
      if (token[TAG] === "(") {
        token = tokens[i + 1];
        if (token && token[TAG] === "(") {
          bracket = 2;
          for (var j = i + 2; j < tokens.length; j++) {
            token = tokens[j][TAG];
            if (token === "(") {
              bracket += 1;
            } if (token === ")") {
              bracket -= 1;
              if (bracket === 0) {
                if (tokens[j - 1][TAG] === ")") {
                  tokens.splice(j, 1);
                  tokens.splice(i, 1);
                  i -= 1;
                }
                break;
              }
            }
          }
        }
      }
      i += 1;
    }
    // dumpTokens(tokens);
    return tokens;
  };

  var replaceSynthDef = (function() {
    var getParams = function(tokens, index) {
      var begin = -1, end = -1;
      for (var i = index + 1; i < tokens.length; ++i) {
        if (tokens[i][TAG] === "PARAM_START") {
          begin = i;
        } else if (tokens[i][TAG] === "PARAM_END") {
          end = i;
          break;
        }
      }
      var replace = "";
      if (begin !== -1) {
        replace = tokens.slice(begin+1, end).map(function(t) {
          return t[VALUE];
        }).join("").replace(/"/g, "'");
      }
      replace = "\"" + replace + "\"";
      return { begin:begin, end:end, replace:replace };
    };
    return function(tokens) {
      var i = tokens.length - 1;
      while (0 <= i) {
        var token = tokens[i];
        if (token[TAG] === "IDENTIFIER" && token[VALUE] === "def") {
          token = tokens[i + 1];
          if (token[TAG] === "CALL_START") {
            var a = findOperandTail(tokens, i + 2);
            var params = getParams(tokens, i + 1);
            tokens.splice(++a, 0, [","     , ","           , _]);
            tokens.splice(++a, 0, ["STRING", params.replace, _]);
          }
        }
        i -= 1;
      }
      // dumpTokens(tokens);
      return tokens;
    };
  })();
  
  var Compiler = (function() {
    function Compiler() {
    }
    Compiler.prototype.tokens = function(code) {
      var tokens = CoffeeScript.tokens(code);
      tokens = replacePi(tokens);
      tokens = replaceUnaryOp(tokens);
      tokens = replacePrecedence(tokens);
      tokens = replaceBinaryOp(tokens);
      tokens = replaceCompoundAssign(tokens);
      tokens = replaceSynthDef(tokens);
      tokens = cleanupParenthesis(tokens);
      return tokens;
    };
    Compiler.prototype.compile = function(code) {
      var tokens = this.tokens(code);
      return CoffeeScript.nodes(tokens).compile({bare:true}).trim();
    };
    Compiler.prototype.toString = function(tokens) {
      var indent = 0;
      if (typeof tokens === "string") {
        tokens = this.tokens(tokens);
      }
      return tokens.map(function(token) {
        switch (token[TAG]) {
        case "TERMINATOR":
          return "\n";
        case "INDENT":
          indent += token[VALUE]|0;
          return "\n" + tab(indent);
        case "OUTDENT":
          indent -= token[VALUE]|0;
          return "\n" + tab(indent);
        case ",":
          return token[VALUE] + " ";
        default:
          return token[VALUE];
        }
      }).join("").trim();
    };
    return Compiler;
  })();

  module.exports = {
    Compiler  : Compiler,
    dumpTokens: dumpTokens,
    findOperandHead: findOperandHead,
    findOperandTail: findOperandTail,
    replacePi            : replacePi,
    replacePrecedence    : replacePrecedence,
    replaceBinaryOp      : replaceBinaryOp,
    replaceUnaryOp       : replaceUnaryOp,
    replaceCompoundAssign: replaceCompoundAssign,
    replaceSynthDef      : replaceSynthDef,
    cleanupParenthesis   : cleanupParenthesis,
  };

});
define('cc/client/utils', function(require, exports, module) {

  var unpack = (function() {
    var func = function() {};
    var _ = function(data) {
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
            return _(data);
          });
        } else {
          if (data.klassName && /^[_a-z$][_a-z0-9$]*$/i.test(data.klassName)) {
            result = eval.call(null, "new (function " + data.klassName + "(){})");
            delete data.klassName;
          } else {
            result = {};
          }
          Object.keys(data).forEach(function(key) {
            result[key] = _(data[key]);
          });
        }
      } else {
        result = data;
      }
      return result;
    };
    return function(data) {
      return _(data);
    };
  })();
  
  module.exports = {
    unpack: unpack
  };

});
define('cc/server/installer', function(require, exports, module) {
  
  var install = function(namespace) {
    namespace = namespace || {};
    namespace.register = function(name) {
      if (!/^__.*__$/.test(name)) {
        namespace[name] = function(recv) {
          if (recv !== null && recv !== undefined) {
            var func = recv[name];
            if (typeof func === "function") {
              return func.apply(recv, Array.prototype.slice.call(arguments, 1));
            } else {
              return func;
            }
          }
          return 0;
        };
      }
    };
    require("./server").install(namespace);
    require("./array").install(namespace);
    require("./bop").install(namespace);
    require("./uop").install(namespace);
    require("./node").install(namespace);
    require("./synth/installer").install(namespace);
    delete namespace.register;
  };

  module.exports = {
    install: install
  };

});
define('cc/server/server', function(require, exports, module) {

  var cc = require("./cc");
  var Group = require("./ctrl/node").Group;
  var pack = require("./utils").pack;
  
  var commands = {};
  var twopi = 2 * Math.PI;
  
  var SynthServer = (function() {
    function SynthServer() {
      this.klassName = "SynthServer";
      this.sysSyncCount   = 0;
      this.sysCurrentTime = 0;
      this.syncItems = new Float32Array(6);
      this.timerId = 0;
    }
    SynthServer.prototype.send = function(msg) {
      postMessage(msg);
    };
    SynthServer.prototype.recv = function(msg) {
      if (!msg) {
        return;
      }
      var func = commands[msg[0]];
      if (func) {
        func.call(this, msg);
      }
    };
    SynthServer.prototype.getRate = function(rate) {
      return this.rates[rate] || this.rates[1];
    };
    SynthServer.prototype.onaudioprocess = function() {
      if (this.syncCount - this.sysSyncCount >= 4) {
        return;
      }
      var strm = this.strm;
      var strmLength = this.strmLength;
      var root = this.rootNode;
      var bufLength = this.bufLength;
      var offset = 0;
      var busBuffer = this.busBuffer;
      var busClear  = this.busClear;
      var busOutL = this.busOutL;
      var busOutR = this.busOutR;
      var n = strmLength / bufLength;
      while (n--) {
        busBuffer.set(busClear);
        root.process(bufLength);
        strm.set(busOutL, offset);
        strm.set(busOutR, offset + strmLength);
        offset += bufLength;
      }
      this.send(strm);
      this.syncCount += 1;
    };
    return SynthServer;
  })();

  commands["/init"] = function(msg) {
    this.sampleRate = msg[1];
    this.channels   = msg[2];
    this.strmLength = msg[3];
    this.bufLength  = msg[4];
    this.syncCount  = msg[5];
    this.strm = new Float32Array(this.strmLength * this.channels);
    this.rates = {};
    this.rates[2  ] = new Rate(this.sampleRate, this.bufLength);
    this.rates[1] = new Rate(this.sampleRate / this.bufLength, 1);
    this.rootNode = new Group();
    var busLength  = this.bufLength * 128 + 4096;
    var busBuffer  = new Float32Array(busLength);
    var bufLength  = this.bufLength;
    var bufLength4 = this.bufLength << 2;
    this.busBuffer = busBuffer;
    this.busClear  = new Float32Array(busLength);
    this.busOutL   = new Float32Array(busBuffer.buffer, 0         , bufLength);
    this.busOutR   = new Float32Array(busBuffer.buffer, bufLength4, bufLength);
  };
  commands["/play"] = function(msg) {
    if (this.timerId === 0) {
      var onaudioprocess = this.onaudioprocess.bind(this);
      this.timerId = setInterval(onaudioprocess, 10);
      this.syncCount = msg[1];
    }
  };
  commands["/pause"] = function() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = 0;
    }
  };
  commands["/reset"] = function() {
  };
  commands["/exec"] = function(msg) {
    var execId = msg[1];
    var code   = msg[2];
    var result  = pack(eval.call(global, code));
    this.send(["/exec", execId, result]);
  };
  commands["/loadScript"] = function(msg) {
    importScripts(msg[1]);
  };

  var Rate = (function() {
    function Rate(sampleRate, bufLength) {
      this.klassName = "Rate";
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
    var server = cc.server = new SynthServer();
    addEventListener("message", function(e) {
      var msg = e.data;
      if (msg instanceof Float32Array) {
        server.sysSyncCount   = msg[0]|0;
        server.sysCurrentTime = msg[1]|0;
        server.syncItems.set(msg);
      } else {
        server.recv(msg);
      }
    });
    server.send(["/connect"]);
    if (typeof global.console === "undefined") {
      global.console = (function() {
        var console = {};
        ["log", "debug", "info", "warn", "error"].forEach(function(method) {
          console[method] = function() {
            server.send(["/console/" + method, Array.prototype.slice.call(arguments)]);
          };
        });
        return console;
      })();
    }
  };
  
  module.exports = {
    SynthServer: SynthServer,
    Rate: Rate,
    install: install
  };

});
define('cc/server/cc', function(require, exports, module) {

  module.exports = require("../cc");

});
define('cc/server/utils', function(require, exports, module) {
  
  var pack = (function() {
    var _ = function(data, stack) {
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
            return _(data, stack);
          });
        } else {
          result = {};
          Object.keys(data).forEach(function(key) {
            result[key] = _(data[key], stack);
          });
        }
        stack.pop();
      } else {
        result = data;
      }
      return result;
    };
    return function(data) {
      return _(data, []);
    };
  })();
  
  module.exports = {
    pack: pack
  };

});
define('cc/server/array', function(require, exports, module) {

  var fn = require("./fn");
  var impl = require("./array.impl");

  var zip = impl.zip;
  
  var flatten = fn(function(list, level) {
    if (!Array.isArray(list)) {
      return [list];
    }
    return impl.flatten(list, level, []);
  }).defaults("list,level=Infinity").build();
  
  var clump = fn(function(list, groupSize) {
    if (!Array.isArray(list)) {
      return [list];
    }
    return impl.clump(list, groupSize);
  }).defaults("list,groupSize=2").build();
  
  var install = function(namespace) {
    Array.prototype.zip = function() {
      return zip.apply(null, this);
    };
    Array.prototype.flatten = fn(function(level) {
      return impl.flatten(this, level, []);
    }).defaults("level=Infinity").build();
    Array.prototype.clump = fn(function(groupSize) {
      return impl.clump(this, groupSize);
    }).defaults("groupSize=2").build();

    Array.prototype.toString = function() {
      return "[ " + this.map(function(x) {
        if (!x) {
          return x + "";
        }
        return x.toString();
      }).join(", ") + " ]";
    };
    
    if (namespace) {
      namespace.zip     = zip;
      namespace.flatten = flatten;
      namespace.clump   = clump;
    }
  };

  module.exports = {
    install: install,
    zip    : zip,
    flatten: flatten,
    clump  : clump,
  };

});
define('cc/server/fn', function(require, exports, module) {

  var array = require("./array.impl");
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
    Fn.prototype.multicall = function(flag) {
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
          vals.push(items.length > 1 ? +items[1].trim() : undefined);
        });
      }
      var ret = func;
      if (this.multi) {
        if (this.def) {
          ret = function() {
            var args = slice.call(arguments);
            args = resolve_args(keys, vals, slice.call(arguments));
            if (containsArray(args)) {
              return array.zip.apply(null, args).map(function(items) {
                return func.apply(this, items);
              }, this);
            }
            return func.apply(this, args);
          };
        } else {
          ret = function() {
            var args = slice.call(arguments);
            if (containsArray(args)) {
              return array.zip.apply(null, args).map(function(items) {
                return func.apply(this, items);
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
    var resolve_args = function(keys, vals, given) {
      var dict;
      var args = vals.slice();
      if (fn.isDictionary(given[given.length - 1])) {
        dict = given.pop();
        for (var key in dict) {
          var index = keys.indexOf(key);
          if (index !== -1) {
            args[index] = dict[key];
          }
        }
      }
      for (var i = 0, imax = Math.min(given.length, args.length); i < imax; ++i) {
        args[i] = given[i];
      }
      if (dict && args.length < keys.length - 1) {
        args.push(dict);
      }
      return args;
    };
    return function(func) {
      return new Fn(func);
    };
  })();
  
  var copy = function(obj) {
    var ret = {};
    Object.keys(obj).forEach(function(key) {
      ret[key] = obj[key];
    });
    return ret;
  };
  
  fn.extend = function(child, parent) {
    for (var key in parent) {
      if (parent.hasOwnProperty(key)) {
        if (key === "classmethods") {
          child[key] = copy(parent[key]);
        } else {
          child[key] = parent[key];
        }
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

  fn.classmethod = (function() {
    var _classmethod = function(Klass, func) {
      return function() {
        if (this instanceof Klass) {
          return func.apply(this, arguments);
        } else {
          return func.apply(new Klass(), arguments);
        }
      };
    };
    return function(child) {
      var classmethods = child.classmethods || {};
      Object.keys(child.prototype).forEach(function(key) {
        if (key.charAt(0) === "$" && typeof child.prototype[key] === "function") {
          classmethods[key] = child.prototype[key];
          delete child.prototype[key];
        }
      });
      Object.keys(classmethods).forEach(function(key) {
        var func = classmethods[key];
        key = key.substr(1);
        child[key] = _classmethod(child, func);
        child.prototype[key] = func;
      });
      child.classmethods = classmethods;
    };
  })();
  
  fn.isDictionary = function(obj) {
    return !!(obj && obj.constructor === Object);
  };

  module.exports = fn;

});
define('cc/server/array.impl', function(require, exports, module) {

  var slice = [].slice;

  var zip = function() {
    var list = slice.call(arguments);
    var maxSize = list.reduce(function(len, sublist) {
      return Math.max(len, Array.isArray(sublist) ? sublist.length : 1);
    }, 0);
    var a   = new Array(maxSize);
    var len = list.length;
    if (len === 0) {
      a[0] = [];
    } else {
      for (var i = 0; i < maxSize; ++i) {
        var sublist = a[i] = new Array(len);
        for (var j = 0; j < len; ++j) {
          sublist[j] = Array.isArray(list[j]) ? list[j][i % list[j].length] : list[j];
        }
      }
    }
    return a;
  };

  var flatten = function(that, level, list) {
    for (var i = 0, imax = that.length; i < imax; ++i) {
      if (level <= 0 || !Array.isArray(that[i])) {
        list.push(that[i]);
      } else {
        list = flatten(that[i], level - 1, list);
      }
    }
    return list;
  };

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
    if (sublist.length > 0) {
      result.push(sublist);
    }
    return result;
  };
  
  module.exports = {
    zip    : zip,
    flatten: flatten,
    clump  : clump,
  };

});
define('cc/server/bop', function(require, exports, module) {

  var UGen = require("./ugen/ugen").UGen;
  var BinaryOpUGen = require("./ugen/basic_ops").BinaryOpUGen;

  var aliases = {
    __add__: "+",
    __sub__: "-",
    __mul__: "*",
    __div__: "/",
    __mod__: "%",
  };

  var install = function() {
    Object.keys(calcFunc).forEach(function(key) {
      var keyForBop = aliases[key] || key;
      var func = calcFunc[key];
      Number.prototype[key] = function(b) {
        if (Array.isArray(b)) {
          return b.map(function(b) {
            return this[key](b);
          }, this);
        } else if (b instanceof UGen) {
          return BinaryOpUGen.new(keyForBop, this, b);
        }
        return func(this, b);
      };
      if (calcFunc[key].array) {
        func = calcFunc[key];
      }
      Array.prototype[key] = function(b) {
        var a = this;
        if (Array.isArray(b)) {
          if (a.length === b.length) {
            return a.map(function(a, index) {
              return a[key](b[index]);
            });
          } else if (a.length > b.length) {
            return a.map(function(a, index) {
              return a[key](b[index % b.length]);
            });
          } else {
            return b.map(function(b, index) {
              return a[index % a.length][key](b);
            });
          }
        } else if (b instanceof UGen) {
          return BinaryOpUGen.new(keyForBop, this, b);
        }
        return a.map(function(a) {
          return a[key](b);
        });
      };
      UGen.prototype[key] = function(b) {
        return BinaryOpUGen.new(keyForBop, this, b);
      };
      if (calcFunc[key].str) {
        var strFunc = calcFunc[key].str;
        String.prototype[key] = function(b) {
          if (Array.isArray(b)) {
            return b.map(function(b) {
              return this[key](b);
            }, this);
          }
          return strFunc(this, b);
        };
      }
    });
  };

  var calcFunc = {};

  calcFunc.__add__ = function(a, b) {
    return a + b;
  };
  calcFunc.__add__.str = calcFunc.__add__;
  calcFunc.__sub__ = function(a, b) {
    return a - b;
  };
  calcFunc.__mul__ = function(a, b) {
    return a * b;
  };
  calcFunc.__mul__.str = function(a, b) {
    if (typeof b === "number") {
      var list = new Array(Math.max(0, b));
      for (var i = 0; i < b; i++) {
        list[i] = a;
      }
      return list.join("");
    }
    return a;
  };
  calcFunc.__div__ = function(a, b) {
    return a / b;
  };
  calcFunc.__mod__ = function(a, b) {
    return a % b;
  };
  
  module.exports = {
    install: install,
  };

});
define('cc/server/ugen/ugen', function(require, exports, module) {

  var fn = require("../fn");
  var array = require("../array.impl");
  var slice = [].slice;

  var addToSynthDef = null;

  var UGen = (function() {
    function UGen() {
      this.klassName = "UGen";
      this.rate = 2;
      this.signalRange = 2;
      this.specialIndex = 0;
      this.outputIndex  = 0;
      this.numOfInputs  = 0;
      this.numOfOutputs = 1;
      this.inputs = [];
    }

    UGen.prototype.$new1 = function(rate) {
      var args = slice.call(arguments, 1);
      this.rate = rate;
      if (addToSynthDef) {
        addToSynthDef(this);
      }
      this.numOfInputs = this.inputs.length;
      return this.initialize.apply(this, args);
    };
    UGen.prototype.$multiNew = function() {
      return this.multiNewList(slice.call(arguments));
    };
    UGen.prototype.$multiNewList = function(list) {
      var zipped = array.zip.apply(null, list);
      if (zipped.length === 1) {
        return this.new1.apply(this, list);
      }
      return zipped.map(function(list) {
        return this.constructor.multiNewList(list);
      }, this);
    };
    fn.classmethod(UGen);

    UGen.prototype.initialize = function() {
      this.inputs = slice.call(arguments);
      return this;
    };
    
    return UGen;
  })();

  var MultiOutUGen = (function() {
    function MultiOutUGen() {
      UGen.call(this);
      this.klassName = "MultiOutUGen";
      this.channels = null;
    }
    fn.extend(MultiOutUGen, UGen);
    fn.classmethod(MultiOutUGen);
    
    MultiOutUGen.prototype.initOutputs = function(numChannels, rate) {
      var channels = new Array(numChannels);
      for (var i = 0; i < numChannels; ++i) {
        channels[i] = OutputProxy.new(rate, this, i);
      }
      this.channels = channels;
      this.numOfOutputs = channels.length;
      this.inputs = this.inputs.map(function(ugen) {
        return (ugen instanceof UGen) ? ugen : ugen.valueOf();
      });
      this.numOfInputs = this.inputs.length;
      return (numChannels === 1) ? channels[0] : channels;
    };
    
    return MultiOutUGen;
  })();

  var OutputProxy = (function() {
    function OutputProxy() {
      UGen.call(this);
      this.klassName = "OutputProxy";
    }
    fn.extend(OutputProxy, UGen);

    OutputProxy.prototype.$new = function(rate, source, index) {
      return this.new1(rate, source, index);
    };
    fn.classmethod(OutputProxy);

    OutputProxy.prototype.initialize = function(source, index) {
      this.inputs = [ source ];
      this.numOfInputs = 1;
      this.outputIndex = index;
      return this;
    };
    
    return OutputProxy;
  })();

  var Control = (function() {
    function Control() {
      MultiOutUGen.call(this);
      this.klassName = "Control";
      this.values = [];
    }
    fn.extend(Control, MultiOutUGen);

    Control.prototype.$kr = function(values) {
      return this.multiNewList([1].concat(values));
    };
    fn.classmethod(Control);

    Control.prototype.initialize = function() {
      this.values = slice.call(arguments);
      return this.initOutputs(this.values.length, this.rate);
    };

    return Control;
  })();

  var Out = (function() {
    function Out() {
      UGen.call(this);
      this.klassName = "Out";
      this.numOutputs = 0;
    }
    fn.extend(Out, UGen);

    Out.prototype.$ar = fn(function(bus, channelsArray) {
      this.multiNewList([2, bus].concat(channelsArray));
      return 0; // Out has no output
    }).defaults("bus=0,channelsArray=0").build();
    Out.prototype.$kr = fn(function(bus, channelsArray) {
      this.multiNewList([1, bus].concat(channelsArray));
      return 0; // Out has no output
    }).defaults("bus=0,channelsArray=0").build();
    
    fn.classmethod(Out);
    
    return Out;
  })();

  var setSynthDef = function(func) {
    addToSynthDef = func;
  };

  var install = function(namespace) {
    namespace.Out = Out;
  };

  module.exports = {
    UGen: UGen,
    MultiOutUGen: MultiOutUGen,
    OutputProxy : OutputProxy,
    Control     : Control,
    Out         : Out,
    setSynthDef : setSynthDef,
    install: install,
  };

});
define('cc/server/ugen/basic_ops', function(require, exports, module) {

  var fn = require("../fn");
  var array = require("../array.impl");
  var UGen  = require("./ugen").UGen;

  var asRate = function(obj) {
    if (Array.isArray(obj)) {
      return obj.reduce(function(rate, obj) {
        return Math.max(rate, asRate(obj));
      }, 0);
    }
    return (obj && obj.rate) || 0;
  };

  var UNARY_OP_UGEN_MAP = "num neg not tilde".split(" ");
  
  var UnaryOpUGen = (function() {
    function UnaryOpUGen() {
      UGen.call(this);
      this.klassName = "UnaryOpUGen";
    }
    fn.extend(UnaryOpUGen, UGen);

    UnaryOpUGen.prototype.$new = function(selector, a) {
      return this.multiNew(2, selector, a);
    };

    fn.classmethod(UnaryOpUGen);

    UnaryOpUGen.prototype.initialize = function(op, a) {
      this.op = op;
      var index = UNARY_OP_UGEN_MAP.indexOf(op);
      if (index === -1) {
        throw "Unknown operator: " + op;
      }
      this.specialIndex = index;
      this.rate   = a.rate|0;
      this.inputs = [a];
      return this;
    };

    return UnaryOpUGen;
  })();

  var BINARY_OP_UGEN_MAP = "+ - * / %".split(" ");

  var BinaryOpUGen = (function() {
    function BinaryOpUGen() {
      UGen.call(this);
      this.klassName = "BinaryOpUGen";
    }
    fn.extend(BinaryOpUGen, UGen);

    BinaryOpUGen.prototype.$new = function(selector, a, b) {
      return this.multiNew(null, selector, a, b);
    };
    BinaryOpUGen.prototype.$new1 = function(rate, selector, a, b) {
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
        } else if (a instanceof BinaryOpUGen) {
          if (a.op === "*") {
            return MulAdd.new1(null, a.inputs[0], a.inputs[1], b);
          }
        } else if (a instanceof MulAdd) {
          if (typeof a.inputs[2] === "number" && typeof b === "number") {
            if (a.inputs[2] + b === 0) {
              return BinaryOpUGen.new1(null, "*!", a.inputs[0], a.inputs[1]);
            } else {
              a.inputs[2] += b;
              return a;
            }
          }
          b = BinaryOpUGen.new1(null, "+", a.inputs[2], b);
          a = BinaryOpUGen.new1(null, "*!", a.inputs[0], a.inputs[1]);
          return BinaryOpUGen.new1(null, "+", a, b);
        }
        return optimizeSumObjects(a, b);
      }
      if (selector === "+!") {
        selector = "+";
      } else if (selector === "*!") {
        selector = "*";
      }
      return UGen.new1.apply(this, [2].concat(selector, a, b));
    };
    fn.classmethod(BinaryOpUGen);

    BinaryOpUGen.prototype.initialize = function(op, a, b) {
      this.op = op;
      var index = BINARY_OP_UGEN_MAP.indexOf(op);
      if (index === -1) {
        throw "Unknown operator: " + op;
      }
      this.specialIndex = index;
      this.rate = Math.max(a.rate|0, b.rate|0);
      this.inputs = [a, b];
      return this;
    };
    
    return BinaryOpUGen;
  })();

  var MulAdd = (function() {
    function MulAdd() {
      UGen.call(this);
      this.klassName = "MulAdd";
    }
    fn.extend(MulAdd, UGen);
    
    MulAdd.prototype.$new = function(_in, mul, add) {
      return this.multiNew(null, _in, mul, add);
    };
    MulAdd.prototype.$new1 = function(rate, _in, mul, add) {
      var t, minus, nomul, noadd;
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
        return BinaryOpUGen.new1(null, "*", _in, -1);
      }
      if (noadd) {
        return BinaryOpUGen.new1(null, "*", _in, mul);
      }
      if (minus) {
        return BinaryOpUGen.new1(null, "-", add, _in);
      }
      if (nomul) {
        return BinaryOpUGen.new1(null, "+", _in, add);
      }
      if (validate(_in, mul, add)) {
        return UGen.new1.apply(this, [2].concat(_in, mul, add));
      }
      if (validate(mul, _in, add)) {
        return UGen.new1.apply(this, [2].concat(mul, _in, add));
      }
      return _in * mul + add;
    };
    fn.classmethod(MulAdd);
    
    MulAdd.prototype.initialize = function(_in, mul, add) {
      var argArray = [_in, mul, add];
      this.inputs = argArray;
      this.rate   = asRate(argArray);
      return this;
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
      UGen.call(this);
      this.klassName = "Sum3";
    }
    fn.extend(Sum3, UGen);
    
    Sum3.prototype.$new = function(in0, in1, in2) {
      return this.multiNew(null, in0, in1, in2);
    };
    Sum3.prototype.$new1 = function(dummyRate, in0, in1, in2) {
      if (in0 === 0) {
        return BinaryOpUGen.new1(null, "+", in1, in2);
      }
      if (in1 === 0) {
        return BinaryOpUGen.new1(null, "+", in0, in2);
      }
      if (in2 === 0) {
        return BinaryOpUGen.new1(null, "+", in0, in1);
      }
      var argArray = [in0, in1, in2];
      var rate = asRate(argArray);
      var sortedArgs = argArray.sort(function(a, b) {
        return b.rate - a.rate;
      });
      return UGen.new1.apply(this, [rate].concat(sortedArgs));
    };
    fn.classmethod(Sum3);
    
    return Sum3;
  })();

  var Sum4 = (function() {
    function Sum4() {
      UGen.call(this);
      this.klassName = "Sum4";
    }
    fn.extend(Sum4, UGen);
    
    Sum4.prototype.$new = function(in0, in1, in2, in3) {
      return this.multiNew(null, in0, in1, in2, in3);
    };
    Sum4.prototype.$new1 = function(dummyRate, in0, in1, in2, in3) {
      if (in0 === 0) {
        return Sum3.new1(null, in1, in2, in3);
      }
      if (in1 === 0) {
        return Sum3.new1(null, in0, in2, in3);
      }
      if (in2 === 0) {
        return Sum3.new1(null, in0, in1, in3);
      }
      if (in3 === 0) {
        return Sum3.new1(null, in0, in1, in2);
      }
      var argArray = [in0, in1, in2, in3];
      var rate = asRate(argArray);
      var sortedArgs = argArray.sort(function(a, b) {
        return b.rate - a.rate;
      });
      return UGen.new1.apply(this, [rate].concat(sortedArgs));
    };
    fn.classmethod(Sum4);
    
    return Sum4;
  })();
  
  var optimizeSumObjects = (function() {
    var collect = function(obj) {
      if (typeof obj === "number") {
        return obj;
      }
      var i = obj.inputs;
      if (obj instanceof BinaryOpUGen && obj.op === "+") {
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
        case 4: return Sum4.new1(null, a[0], a[1], a[2], a[3]);
        case 3: return Sum3.new1(null, a[0], a[1], a[2]);
        case 2: return BinaryOpUGen.new1(null, "+!", a[0], a[1]);
        case 1: return a[0];
        }
      });
      switch (a.length) {
      case 4: return Sum4.new1(null, a[0], a[1], a[2], a[3]);
      case 3: return Sum3.new1(null, a[0], a[1], a[2]);
      case 2: return BinaryOpUGen.new1(null, "+!", a[0], a[1]);
      case 1: return a[0];
      default: return work(array.clump(a, 4));
      }
    };
    return function(in1, in2) {
      var list = array.flatten([ collect(in1), collect(in2) ], Infinity, []);
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
      list = array.clump(list, 4);
      if (list.length === 1 && list[0].length === 2) {
        return BinaryOpUGen.new1(null, "+!", list[0][0], list[0][1]);
      }
      return work(list);
    };
  })();

  var optimizeMulObjects = (function() {
    var collect = function(obj) {
      if (typeof obj === "number") { return obj; }
      var i = obj.inputs;
      if (obj instanceof BinaryOpUGen && obj.op === "*") {
        return [ collect(i[0]), collect(i[1]) ];
      }
      return obj;
    };
    var work = function(a) {
      a = a.map(function(a) {
        if (a.length === 2) {
          return BinaryOpUGen.new1(null, "*!", a[0], a[1]);
        } else {
          return a[0];
        }
      });
      switch (a.length) {
      case 2:
        return BinaryOpUGen.new1(null, "*!", a[0], a[1]);
      case 1:
        return a[0];
      default:
        return work(array.clump(a, 2));
      }
    };
    return function(in1, in2) {
      var list = array.flatten([ collect(in1), collect(in2) ], Infinity, []);
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
      list = array.clump(list, 2);
      if (list.length === 1 && list[0].length === 2) {
        return BinaryOpUGen.new1(null, "*!", list[0][0], list[0][1]);
      }
      return work(list);
    };
  })();
  
  Number.prototype.madd = fn(function(mul, add) {
    return MulAdd.new(this, mul, add);
  }).defaults("mul=1,add=0").build();
  Array.prototype.madd = fn(function(mul, add) {
    return array.zip.apply(null, [this, mul, add]).map(function(items) {
      var _in = items[0], mul = items[1], add = items[2];
      return MulAdd.new(_in, mul, add);
    });
  }).defaults("mul=1,add=0").build();
  UGen.prototype.madd = fn(function(mul, add) {
    return MulAdd.new(this, mul, add);
  }).defaults("mul=1,add=0").build();

  UGen.prototype.range = fn(function(lo, hi) {
    var mul, add;
    if (this.signalRange === 2) {
      mul = (hi - lo) * 0.5;
      add = mul + lo;
    } else {
      mul = (hi - lo);
      add = lo;
    }
    return MulAdd.new1(null, this, mul, add);
  }).defaults("lo=0,hi=1").multicall().build();

  UGen.prototype.unipolar = fn(function(mul) {
    return this.range(0, mul);
  }).defaults("mul=1").build();

  UGen.prototype.bipolar = fn(function(mul) {
    return this.range(mul.neg(), mul);
  }).defaults("mul=1").build();
  
  var install = function() {
  };
  
  module.exports = {
    UnaryOpUGen : UnaryOpUGen,
    BinaryOpUGen: BinaryOpUGen,
    MulAdd: MulAdd,
    Sum3: Sum3,
    Sum4: Sum4,
    UNARY_OP_UGEN_MAP : UNARY_OP_UGEN_MAP,
    BINARY_OP_UGEN_MAP: BINARY_OP_UGEN_MAP,
    install: install,
  };

});
define('cc/server/uop', function(require, exports, module) {

  var install = function(namespace) {
    Object.keys(calcFunc).forEach(function(key) {
      var func = calcFunc[key];
      Number.prototype[key] = function() {
        return func(this);
      };
      Array.prototype[key] = function() {
        return this.map(function(i) {
          return i[key]();
        });
      };
      Boolean.prototype[key] = function() {
        return func(+this);
      };
      String.prototype[key] = function() {
        return func(+this);
      };
      if (namespace && namespace.register) {
        namespace.register(key);
      }
    });
  };

  var calcFunc = {};

  calcFunc.num = function(a) {
    return +a;
  };
  calcFunc.neg = function(a) {
    return -a;
  };
  calcFunc.not = function(a) {
    return !a;
  };
  calcFunc.tilde = function(a) {
    return ~a;
  };

  module.exports = {
    install: install
  };

});
define('cc/server/node', function(require, exports, module) {

  var cc = require("./cc");
  var fn = require("./fn");
  var FixNum = require("./synth/fixnum").FixNum;
  var Unit   = require("./synth/unit").Unit;

  var Node = (function() {
    function Node() {
      this.klassName = "Node";
      this.next    = null;
      this.prev    = null;
      this.parent  = null;
      this.running = true;
    }
    
    var appendFunc = {};
    appendFunc.addToHead = function(node) {
      var prev;
      if (this.head === null) {
        this.head = this.tail = node;
      } else {
        prev = this.head.prev;
        if (prev) { prev.next = node; }
        node.next = this.head;
        this.head.prev = node;
        this.head = node;
      }
      node.parent = this;
    };
    appendFunc.addToTail = function(node) {
      var next;
      if (this.tail === null) {
        this.head = this.tail = node;
      } else {
        next = this.tail.next;
        if (next) { next.prev = node; }
        node.prev = this.tail;
        this.tail.next = node;
        this.tail = node;
      }
      node.parent = this;
    };
    appendFunc.addBefore = function(node) {
      var prev = this.prev;
      this.prev = node;
      node.prev = prev;
      if (prev) { prev.next = node; }
      node.next = this;
      if (this.parent && this.parent.head === this) {
        this.parent.head = node;
      }
      node.parent = this.parent;
    };
    appendFunc.addAfter = function(node) {
      var next = this.next;
      this.next = node;
      node.next = next;
      if (next) { next.prev = node; }
      node.prev = this;
      if (this.parent && this.parent.tail === this) {
        this.parent.tail = node;
      }
      node.parent = this.parent;
    };
    
    Node.prototype.append = function(node, addAction) {
      if (appendFunc[addAction]) {
        appendFunc[addAction].call(this, node);
      }
      return this;
    };

    Node.prototype.remove = function() {
      if (this.parent) {
        if (this.parent.head === this) {
          this.parent.head = this.next;
        }
        if (this.parent.tail === this) {
          this.parent.tail = this.prev;
        }
      }
      if (this.prev) {
        this.prev.next = this.next;
      }
      if (this.next) {
        this.next.prev = this.prev;
      }
      this.prev = null;
      this.next = null;
      this.parent = null;
      return this;
    };
    
    return Node;
  })();

  var Group = (function() {
    function Group() {
      Node.call(this);
      this.klassName = "Group";
      this.head = null;
      this.tail = null;
    }
    fn.extend(Group, Node);
    
    Group.prototype.process = function(inNumSamples) {
      if (this.head && this.running) {
        this.head.process(inNumSamples);
      }
      if (this.next) {
        this.next.process(inNumSamples);
      }
    };
    
    return Group;
  })();

  var Synth = (function() {
    function Synth(specs, target, args, addAction) {
      Node.call(this);
      this.klassName = "Synth";
      this.specs = JSON.parse(specs);
      target.append(this, addAction);
      build.call(this, this.specs, args);
    }
    fn.extend(Synth, Node);

    var build = function(specs, args) {
      this.server = cc.server;
      var fixNumList = specs.consts.map(function(value) {
        return new FixNum(value);
      });
      var unitList = specs.defs.map(function(spec) {
        return new Unit(this, spec);
      }, this);
      this.controls = new Float32Array(specs.params.values);
      this.set(args);
      this.unitList = unitList.filter(function(unit) {
        var inputs  = unit.inputs;
        var inRates = unit.inRates;
        var inSpec  = unit.specs[3];
        for (var i = 0, imax = inputs.length; i < imax; ++i) {
          var i2 = i << 1;
          if (inSpec[i2] === -1) {
            inputs[i]  = fixNumList[inSpec[i2+1]].outs[0];
            inRates[i] = 0;
          } else {
            inputs[i]  = unitList[inSpec[i2]].outs[inSpec[i2+1]];
            inRates[i] = unitList[inSpec[i2]].outRates[inSpec[i2+1]];
          }
        }
        unit.init();
        return !!unit.process;
      });
    };
    Synth.prototype.set = function(args) {
      if (!args) {
        return this;
      }
      return this;
    };
    Synth.prototype.process = function(inNumSamples) {
      if (this.running) {
        var unitList = this.unitList;
        for (var i = 0, imax = unitList.length; i < imax; ++i) {
          var unit = unitList[i];
          unit.process(unit.rate.bufLength);
        }
      }
      if (this.next) {
        this.next.process(inNumSamples);
      }
    };
    
    return Synth;
  })();

  var install = function() {
  };
  
  module.exports = {
    Node : Node,
    Group: Group,
    Synth: Synth,
    install: install,
  };

});
define('cc/server/synth/fixnum', function(require, exports, module) {

  var map = {};

  var FixNum = (function() {
    function FixNum(value) {
      if (map[value]) {
        return map[value];
      }
      this.klassName = "FixNum";
      this.outs = [ new Float32Array([value]) ];
      map[value] = this;
    }
    FixNum.reset = function() {
      map = {};
    };
    return FixNum;
  })();

  module.exports = {
    FixNum: FixNum
  };

});
define('cc/server/synth/unit', function(require, exports, module) {

  var units = {};
  
  var Unit = (function() {
    function Unit(parent, specs) {
      this.klassName = "Unit";
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
      this.rate = parent.server.getRate(this.calcRate);
      var bufLength = this.rate.bufLength;
      var outs = new Array(this.numOfOutputs);
      for (var i = 0, imax = outs.length; i < imax; ++i) {
        outs[i] = new Float32Array(bufLength);
      }
      this.outs      = outs;
      this.bufLength = bufLength;
      this.done      = false;
    }
    Unit.prototype.init = function() {
      var ctor = units[this.name];
      if (ctor) {
        ctor.call(this);
      } else {
        console.warn(this.name + "'s ctor is not found.");
      }
      return this;
    };
    return Unit;
  })();

  var register = function(name, payload) {
    units[name] = payload();
  };

  var install = function() {
  };
  
  module.exports = {
    Unit: Unit,
    register: register,
    install : install
  };

});
define('cc/server/synth/installer', function(require, exports, module) {

  var install = function() {
    require("./out").install();
    require("./bop").install();
    require("./control").install();
    require("./sinosc").install();
  };
  
  module.exports = {
    install: install
  };

});
define('cc/server/synth/out', function(require, exports, module) {

  var unit = require("./unit");

  var Out = function() {
    var ctor = function() {
      this._busBuffer = this.parent.server.busBuffer;
      this._bufLength = this.parent.server.bufLength;
      if (this.calcRate === 2) {
        this.process = next_a;
        this._busOffset = 0;
      } else {
        this.process = next_k;
        this._busOffset = this._bufLength * 128;
      }
    };
    var next_a = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var inputs = this.inputs;
      var busBuffer = this._busBuffer;
      var bufLength = this._bufLength;
      var offset, _in;
      var fbusChannel = (inputs[0][0]|0) - 1;
      for (var i = 1, imax = inputs.length; i < imax; ++i) {
        offset = (fbusChannel + i) * bufLength;
        _in = inputs[i];
        for (var j = 0; j < inNumSamples; j++) {
          busBuffer[offset + j] += _in[j];
        }
      }
    };
    var next_k = function() {
      var inputs = this.inputs;
      var busBuffer = this._busBuffer;
      var offset    = this._busOffset + (inputs[0][0]|0) - 1;
      for (var i = 1, imax = inputs.length; i < imax; ++i) {
        busBuffer[offset + i] += inputs[i][0];
      }
    };
    return ctor;
  };

  module.exports = {
    install: function() {
      unit.register("Out", Out);
    }
  };

});
define('cc/server/synth/bop', function(require, exports, module) {

  var unit = require("./unit");
  var BINARY_OP_UGEN_MAP = require("../ugen/basic_ops").BINARY_OP_UGEN_MAP;

  var AA = 2   * 10 + 2;
  var AK = 2   * 10 + 1;
  var AI = 2   * 10 + 0;
  var KA = 1 * 10 + 2;
  var KK = 1 * 10 + 1;
  var KI = 1 * 10 + 0;
  var IA = 0  * 10 + 2;
  var IK = 0  * 10 + 1;
  var II = 0  * 10 + 0;

  var calcFunc = {};
  
  var BinaryOpUGen = function() {
    var ctor = function() {
      var func = calcFunc[BINARY_OP_UGEN_MAP[this.specialIndex]];
      var process;
      if (func) {
        switch (this.inRates[0] * 10 + this.inRates[1]) {
        case AA: process = func.aa; break;
        case AK: process = func.ak; break;
        case AI: process = func.ai; break;
        case KA: process = func.ka; break;
        case KK: process = func.kk; break;
        case KI: process = func.ki; break;
        case IA: process = func.ia; break;
        case IK: process = func.ik; break;
        case II: process = func.ii; break;
        }
        this.process = process;
        this._a = this.inputs[0][0];
        this._b = this.inputs[1][0];
        if (this.process) {
          this.process(1);
        } else {
          this.outs[0][0] = func(this.inputs[0][0], this.inputs[1][0]);
        }
      } else {
        console.log("BinaryOpUGen[" + this.specialIndex + "] is not defined.");
      }
    };
    return ctor;
  };

  var aa = function(func) {
    return function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var out = this.outs[0];
      var aIn = this.inputs[0], bIn = this.inputs[1];
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = func(aIn[i  ], bIn[i  ]); out[i+1] = func(aIn[i+1], bIn[i+1]);
        out[i+2] = func(aIn[i+2], bIn[i+2]); out[i+3] = func(aIn[i+3], bIn[i+3]);
        out[i+4] = func(aIn[i+4], bIn[i+4]); out[i+5] = func(aIn[i+5], bIn[i+5]);
        out[i+6] = func(aIn[i+6], bIn[i+6]); out[i+7] = func(aIn[i+7], bIn[i+7]);
      }
    };
  };
  var ak = function(func) {
    return function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var aIn  = this.inputs[0], b = this._b;
      var nextB  = this.inputs[1][0];
      var b_slope = (nextB - this._b) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = func(aIn[i  ], b); b += b_slope;
        outs[i+1] = func(aIn[i+1], b); b += b_slope;
        outs[i+2] = func(aIn[i+2], b); b += b_slope;
        outs[i+3] = func(aIn[i+3], b); b += b_slope;
        outs[i+4] = func(aIn[i+4], b); b += b_slope;
        outs[i+5] = func(aIn[i+5], b); b += b_slope;
        outs[i+6] = func(aIn[i+6], b); b += b_slope;
        outs[i+7] = func(aIn[i+7], b); b += b_slope;
      }
      this._b = nextB;
    };
  };
  var ai = function(func) {
    return function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var aIn = this.inputs[0], b = this._b;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = func(aIn[i  ], b);
        outs[i+1] = func(aIn[i+1], b);
        outs[i+2] = func(aIn[i+2], b);
        outs[i+3] = func(aIn[i+3], b);
        outs[i+4] = func(aIn[i+4], b);
        outs[i+5] = func(aIn[i+5], b);
        outs[i+6] = func(aIn[i+6], b);
        outs[i+7] = func(aIn[i+7], b);
      }
    };
  };
  var ka = function(func) {
    return function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var a = this._a, bIn = this.inputs[1];
      var nextA  = this.inputs[0][0];
      var a_slope = (nextA - this._a) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = func(a, bIn[i  ]); a += a_slope;
        outs[i+1] = func(a, bIn[i+1]); a += a_slope;
        outs[i+2] = func(a, bIn[i+2]); a += a_slope;
        outs[i+3] = func(a, bIn[i+3]); a += a_slope;
        outs[i+4] = func(a, bIn[i+4]); a += a_slope;
        outs[i+5] = func(a, bIn[i+5]); a += a_slope;
        outs[i+6] = func(a, bIn[i+6]); a += a_slope;
        outs[i+7] = func(a, bIn[i+7]); a += a_slope;
      }
      this._a = nextA;
    };
  };
  var kk = function(func) {
    return function() {
      this.outs[0][0] = func(this.inputs[0][0], this.inputs[1][0]);
    };
  };
  var ia = function(func) {
    return function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var a = this._a, bIn = this.inputs[1];
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = func(a, bIn[i  ]);
        outs[i+1] = func(a, bIn[i+1]);
        outs[i+2] = func(a, bIn[i+2]);
        outs[i+3] = func(a, bIn[i+3]);
        outs[i+4] = func(a, bIn[i+4]);
        outs[i+5] = func(a, bIn[i+5]);
        outs[i+6] = func(a, bIn[i+6]);
        outs[i+7] = func(a, bIn[i+7]);
      }
    };
  };

  calcFunc["+"] = function(a, b) {
    return a + b;
  };
  calcFunc["+"].aa = function(inNumSamples) {
    inNumSamples = inNumSamples|0;
    var out = this.outs[0];
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
    inNumSamples = inNumSamples|0;
    var out = this.outs[0];
    var aIn  = this.inputs[0], b = this._b;
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
    inNumSamples = inNumSamples|0;
    var out = this.outs[0];
    var aIn  = this.inputs[0], b = this._b;
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
    inNumSamples = inNumSamples|0;
    var out = this.outs[0];
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
    this.outs[0][0] = this.inputs[0][0] + this.inputs[1][0];
  };
  calcFunc["+"].ia = function(inNumSamples) {
    inNumSamples = inNumSamples|0;
    var out = this.outs[0];
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
    inNumSamples = inNumSamples|0;
    var out = this.outs[0];
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
    inNumSamples = inNumSamples|0;
    var out = this.outs[0];
    var aIn  = this.inputs[0], b = this._b;
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
    inNumSamples = inNumSamples|0;
    var out = this.outs[0];
    var aIn  = this.inputs[0], b = this._b;
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
    inNumSamples = inNumSamples|0;
    var out = this.outs[0];
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
    this.outs[0][0] = this.inputs[0][0] - this.inputs[1][0];
  };
  calcFunc["-"].ia = function(inNumSamples) {
    inNumSamples = inNumSamples|0;
    var out = this.outs[0];
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
    inNumSamples = inNumSamples|0;
    var out = this.outs[0];
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
    inNumSamples = inNumSamples|0;
    var out = this.outs[0];
    var aIn  = this.inputs[0], b = this._b;
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
    inNumSamples = inNumSamples|0;
    var out = this.outs[0];
    var aIn  = this.inputs[0], b = this._b;
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
    inNumSamples = inNumSamples|0;
    var out = this.outs[0];
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
    this.outs[0][0] = this.inputs[0][0] * this.inputs[1][0];
  };
  calcFunc["*"].ia = function(inNumSamples) {
    inNumSamples = inNumSamples|0;
    var out = this.outs[0];
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
  
  Object.keys(calcFunc).forEach(function(key) {
    var func = calcFunc[key];
    if (!func.aa) { func.aa = aa(func); }
    if (!func.ak) { func.ak = ak(func); }
    if (!func.ai) { func.ai = ai(func); }
    if (!func.ka) { func.ka = ka(func); }
    if (!func.kk) { func.kk = kk(func); }
    if (!func.ki) { func.ki = func.kk;  }
    if (!func.ia) { func.ia = ia(func); }
    if (!func.ik) { func.ik = func.kk;  }
  });
  
  module.exports = {
    install: function() {
      unit.register("BinaryOpUGen", BinaryOpUGen);
    }
  };

});
define('cc/server/synth/control', function(require, exports, module) {

  var unit = require("./unit");

  var Control = function() {
    var ctor = function() {
      if (this.numOfOutputs === 1) {
        this.process = next_1;
      } else {
        this.process = next_k;
      }
      this.process(1);
    };
    var next_1 = function() {
      this.outs[0][0] = this.parent.controls[this.specialIndex];
    };
    var next_k = function() {
      var controls = this.parent.controls;
      var outs = this.outs;
      var specialIndex = this.specialIndex;
      for (var i = 0, imax = outs.length; i < imax; ++i) {
        outs[i][0] = controls[i + specialIndex];
      }
    };
    return ctor;
  };
  
  module.exports = {
    install: function() {
      unit.register("Control", Control);
    }
  };

});
define('cc/server/synth/sinosc', function(require, exports, module) {

  var unit = require("./unit");
  
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
  
  var SinOsc = function() {
    var ctor = function() {
      this._freq  = this.inputs[0][0];
      this._phase = this.inputs[1][0];
      this._radtoinc = kSineSize / twopi;
      this._cpstoinc = kSineSize * this.rate.sampleDur;
      this._mask  = kSineMask;
      this._table = gSineWavetable;
      if (this.inRates[0] === 2) {
        if (this.inRates[1] === 2) {
          this.process = aa;
        } else if (this.inRates[1] === 1) {
          this.process = ak;
        } else {
          this.process = ai;
        }
        this._x = 0;
      } else {
        if (this.inRates[1] === 2) {
          this.process = ka;
          this._x = 0;
        } else {
          this.process = kk;
          this._x = this._phase * this._radtoinc;
        }
      }
      kk.call(this, 1);
    };
    var aa = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
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
        outs[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
        x += freqIn[i] * cpstoinc;
      }
      this._x = x;
    };
    var ak = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
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
          outs[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
          x += freqIn[i] * cpstoinc;
        }
      } else {
        var phase_slope = (nextPhase - phase) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          pphase = x + radtoinc * phase;
          index  = (pphase & mask) << 1;
          outs[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
          phase += phase_slope;
          x += freqIn[i] * cpstoinc;
        }
        this._phase = nextPhase;
      }
      this._x = x;
    };
    var ai = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var freqIn = this.inputs[0];
      var phase  = this._phase * this._radtoinc;
      var mask  = this._mask;
      var table = this._table;
      var cpstoinc = this._cpstoinc;
      var x = this._x, pphase, index, i;
      for (i = 0; i < inNumSamples; ++i) {
        pphase = x + phase;
        index  = (pphase & mask) << 1;
        outs[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
        x += cpstoinc * freqIn[i];
      }
      this._x = x;
    };
    var ka = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
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
          outs[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
          x += freq;
        }
      } else {
        var freq_slope = (nextFreq - freq) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          pphase = x + radtoinc * phaseIn[i];
          index  = (pphase & mask) << 1;
          outs[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
          x += freq * cpstoinc;
          freq += freq_slope;
        }
        this._freq = nextFreq;
      }
      this._x = x;
    };
    var kk = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
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
          outs[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
          x += freq;
        }
      } else {
        var freq_slope  = (nextFreq  - freq ) * this.rate.slopeFactor;
        var phase_slope = (nextPhase - phase) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          pphase = x + radtoinc * phase;
          index  = (pphase & mask) << 1;
          outs[i] = table[index] + (pphase-(pphase|0)) * table[index+1];
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
  };
  
  module.exports = {
    install: function() {
      unit.register("SinOsc", SinOsc);
    }
  };

});
_require("cc/cc", "cc/loader");
})(this.self||global);
