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
  var slice = [].slice;

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
    CoffeeCollider.prototype.execute = function() {
      if (this.client) {
        this.client.execute.apply(this.client, arguments);
      }
      return this;
    };
    CoffeeCollider.prototype.getStream = function() {
      if (this.client) {
        return this.client.strm;
      }
    };
    CoffeeCollider.prototype.importScripts = function() {
      if (this.client) {
        this.client.importScripts(slice.call(arguments));
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
    }
    SynthClient.prototype.destroy = function() {
      this.sys.remove(this);
      delete this.worker;
    };
    SynthClient.prototype.play = function() {
      if (!this.isPlaying) {
        this.isPlaying = true;
        var strm = this.strm;
        for (var i = 0, imax = strm.length; i < imax; ++i) {
          strm[i] = 0;
        }
        this.strmList = new Array(8);
        this.strmListReadIndex  = 0;
        this.strmListWriteIndex = 0;
        this.sys.play();
        this.send(["/play", this.sys.syncCount]);
      }
    };
    SynthClient.prototype.reset = function() {
      this.send(["/reset"]);
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
    SynthClient.prototype.execute = function(code) {
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
        this.send(["/execute", this.execId, code, append, this.compiler.data, !!callback]);
        if (callback) {
          this.execCallbacks[this.execId] = callback;
        }
        this.execId += 1;
      }
    };
    SynthClient.prototype.importScripts = function(list) {
      this.send(["/importScripts", list]);
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
      // syncCount, mouse.button, mouse.pos.x, mouse.pox.y, keyCode
      this.syncItems = new Float32Array(5);
      this.isPlaying = false;

      var syncItems = this.syncItems;
      window.addEventListener("mousemove", function(e) {
        syncItems[2] = e.pageX / window.innerWidth;
        syncItems[3] = e.pageY / window.innerHeight;
      }, false);
      window.addEventListener("mousedown", function() {
        syncItems[1] = 1;
      }, false);
      window.addEventListener("mouseup", function() {
        syncItems[1] = 0;
      }, false);
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

  var splitCodeAndData = function(text) {
    var re = /^(\s*)__END__(\s*)$/gm;
    var m = re.exec(text);
    if (m === null) {
      return [ text, "" ];
    }
    var code = text.substr(0, m.index - 1);
    var data = text.substr(m.index + m[0].length + 1);
    return [ code, data ];
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
        case "CALL_START":
          bracket -= 1;
          break;
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
        if (tokens[i - 2] && tokens[i - 2][VALUE] === "Synth") {
          if (tokens[i - 1][TAG] === ".") {
            var token = tokens[i];
            if (token[VALUE] === "def") {
              token = tokens[i + 1];
              if (token[TAG] === "CALL_START") {
                var a = findOperandTail(tokens, i + 2);
                var params = getParams(tokens, i + 1);
                tokens.splice(++a, 0, [","     , ","           , _]);
                tokens.splice(++a, 0, ["STRING", params.replace, _]);
              }
            }
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
    Compiler.prototype.tokens = function(text) {
      var items = splitCodeAndData(text);
      var code  = items[0];
      var data  = items[1];
      var tokens = CoffeeScript.tokens(code);
      tokens = replacePi(tokens);
      tokens = replaceUnaryOp(tokens);
      tokens = replacePrecedence(tokens);
      tokens = replaceBinaryOp(tokens);
      tokens = replaceCompoundAssign(tokens);
      tokens = replaceSynthDef(tokens);
      tokens = cleanupParenthesis(tokens);
      this.code = code;
      this.data = data;
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
    splitCodeAndData: splitCodeAndData,
    findOperandHead : findOperandHead,
    findOperandTail : findOperandTail,
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
  
  var cc = require("./cc");
  
  var install = function(namespace) {
    namespace = namespace || {};
    namespace.register = register(namespace);
    require("./server").install(namespace);
    require("./bop").install(namespace);
    require("./uop").install(namespace);
    require("./node").install(namespace);
    require("./sched").install(namespace);
    require("./ugen/installer").install(namespace);
    require("./unit/installer").install(namespace);
    delete namespace.register;
  };

  var installed = cc.installed = {};

  var register = function(namespace) {
    return function(name, func) {
      if (func) {
        if (/^[A-Z]/.test(name)) {
          var Klass = func;
          var base = namespace[name] = installed[name] = function() {
            return new Klass();
          };
          if (Klass.classmethods) {
            Object.keys(Klass.classmethods).forEach(function(key) {
              key = key.substr(1);
              if (Klass[key]) {
                base[key] = Klass[key];
              }
            });
          }
        } else {
          namespace[name] = installed[name] = func;
        }
      }
    };
  };
  
  module.exports = {
    install : install,
    register: register
    };

});
define('cc/server/cc', function(require, exports, module) {

  module.exports = require("../cc");

});
define('cc/server/server', function(require, exports, module) {

  var cc = require("./cc");
  var Group    = require("./node").Group;
  var Timeline = require("./sched").Timeline;
  var pack = require("./utils").pack;
  
  var commands = {};
  var twopi = 2 * Math.PI;
  
  var SynthServer = (function() {
    function SynthServer() {
      this.klassName = "SynthServer";
      this.sysSyncCount = 0;
      this.syncItems = new Float32Array(5);
      this.timeline = new Timeline(this);
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
    SynthServer.prototype.reset = function() {
      this.timeline.reset();
      if (cc.installed) {
        Object.keys(cc.installed).forEach(function(name) {
          global[name] = cc.installed[name];
        });
      }
      this.rootNode.prev = null;
      this.rootNode.next = null;
      this.rootNode.head = null;
      this.rootNode.tail = null;
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
      var busOutL  = this.busOutL;
      var busOutR  = this.busOutR;
      var timeline = this.timeline;
      var n = strmLength / bufLength;
      while (n--) {
        timeline.process();
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
      this.timeline.play();
    }
  };
  commands["/pause"] = function() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = 0;
      this.timeline.pause();
    }
  };
  commands["/reset"] = function() {
    this.reset();
  };
  commands["/execute"] = function(msg) {
    var execId   = msg[1];
    var code     = msg[2];
    var append   = msg[3];
    var data     = msg[4];
    var callback = msg[5];
    if (!append) {
      this.reset();
    }
    global.DATA = data;
    var result = eval.call(global, code);
    if (callback) {
      this.send(["/execute", execId, pack(result)]);
    }
  };
  commands["/importScripts"] = function(msg) {
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
        server.sysSyncCount = msg[0]|0;
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
define('cc/server/node', function(require, exports, module) {

  var cc = require("./cc");
  var fn = require("./fn");
  var utils  = require("./utils");
  var ugen   = require("./ugen/ugen");
  var Unit   = require("./unit/unit").Unit;
  var FixNum = require("./unit/unit").FixNum;
  var slice = [].slice;

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
      build.call(this, specs, target, args, addAction);
    }
    fn.extend(Synth, Node);

    var build = function(specs, target, args, addAction) {
      var that = this;
      this.specs = specs = JSON.parse(specs);
      this.server = cc.server;

      var timeline = this.server.timeline;
      timeline.push(function() {
        target.append(that, addAction);
      });
      
      var fixNumList = specs.consts.map(function(value) {
        return new FixNum(value);
      });
      var unitList = specs.defs.map(function(spec) {
        return new Unit(this, spec);
      }, this);
      this.params   = specs.params;
      this.controls = new Float32Array(this.params.values);
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
      return this;
    };

    var _set = function(args) {
      var params = this.params;
      if (utils.isDict(args)) {
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
                  this.controls[index + i] = value;
                }
              }
            }, this);
          } else if (typeof value === "number" && !isNaN(value)) {
            this.controls[index] = value;
          }
        }, this);
      } else {
        slice.call(arguments).forEach(function(value, i) {
          var index = params.indices[i];
          var length = params.length[i];
          if (Array.isArray(value)) {
            value.forEach(function(value, i) {
              if (i < length) {
                if (typeof value === "number" && !isNaN(value)) {
                  this.controls[index + i] = value;
                }
              }
            }, this);
          } else if (typeof value === "number" && !isNaN(value)) {
            this.controls[index] = value;
          }
        }, this);
      }
      
    };
    
    Synth.prototype.set = function(args) {
      if (args === undefined) {
        return this;
      }
      var that = this;
      var timeline = this.server.timeline;
      timeline.push(function() {
        _set.call(that, args);
      });
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
  
  var SynthDefInterface = (function() {
    function SynthDefInterface() {
    }
    SynthDefInterface.prototype.$def = function(func) {
      if (typeof func === "function") {
        var instance = new SynthDef();
        instance.initialize.apply(instance, arguments);
        return instance;
      }
      throw "Synth.def() requires a function.";
    };
    fn.classmethod(SynthDefInterface);
    return SynthDefInterface;
  })();
  
  var SynthDef = (function() {
    function SynthDef() {
      this.klassName = "SynthDef";
    }
    SynthDef.prototype.initialize = function(func, args) {
      var isVaridArgs = false;
      if (/^[ a-zA-Z0-9_$,.=\-\[\]]+$/.test(args)) {
        args = unpackArguments(args);
        if (args) {
          isVaridArgs = args.vals.every(function(item) {
            if (typeof item === "number") {
              return true;
            } else if (Array.isArray(item)) {
              return item.every(function(item) {
                return typeof item === "number";
              });
            }
            if (item === undefined || item === null) {
              return true;
            }
            return false;
          });
        }
      }
      if (!isVaridArgs) {
        throw "UgenGraphFunc's arguments should be a constant number or an array that contains it.";
      }
      
      var params  = { names:[], indices:[], length:[], values:[] };
      var flatten = [];
      var i, imax, length;
      for (i = 0, imax = args.vals.length; i < imax; ++i) {
        length = Array.isArray(args.vals[i]) ? args.vals[i].length : 1;
        params.names  .push(args.keys[i]);
        params.indices.push(flatten.length);
        params.length .push(length);
        params.values = params.values.concat(args.vals[i]);
        flatten = flatten.concat(args.vals[i]);
      }
      var reshaped = [];
      var controls = ugen.Control.kr(flatten);
      if (!Array.isArray(controls)) {
        controls = [ controls ];
      }
      for (i = 0; i < imax; ++i) {
        if (Array.isArray(args.vals[i])) {
          reshaped.push(controls.slice(0, args.vals[i].length));
        } else {
          reshaped.push(controls.shift());
        }
      }
      
      var children = [];
      ugen.setSynthDef(function(ugen) {
        children.push(ugen);
      });
      
      try {
        func.apply(null, reshaped);
      } catch (e) {
        throw e.toString();
      } finally {
        ugen.setSynthDef(null);
      }

      var consts = [];
      children.forEach(function(x) {
        if (x.inputs) {
          x.inputs.forEach(function(_in) {
            if (typeof _in === "number" && consts.indexOf(_in) === -1) {
              consts.push(_in);
            }
          });
        }
      });
      consts.sort();
      var ugenlist = topoSort(children).filter(function(x) {
        return !(typeof x === "number" || x instanceof ugen.OutputProxy);
      });
      var defs = ugenlist.map(function(x) {
        var inputs = [];
        if (x.inputs) {
          x.inputs.forEach(function(x) {
            var index = ugenlist.indexOf((x instanceof ugen.OutputProxy) ? x.inputs[0] : x);
            var subindex = (index !== -1) ? x.outputIndex : consts.indexOf(x);
            inputs.push(index, subindex);
          });
        }
        var outputs;
        if (x instanceof ugen.MultiOutUGen) {
          outputs = x.channels.map(function(x) {
            return x.rate;
          });
        } else if (x.numOfOutputs === 1) {
          outputs = [ x.rate ];
        } else {
          outputs = [];
        }
        return [ x.klassName, x.rate, x.specialIndex|0, inputs, outputs ];
      });
      var specs = {
        consts: consts,
        defs  : defs,
        params: params,
      };
      this.specs = specs;
      return this;
    };
    
    SynthDef.prototype.play = fn(function() {
      var target, args, addAction;
      var i = 0;
      target = args;
      if (arguments[i] instanceof Node) {
        target = arguments[i++];
      } else {
        target = cc.server.rootNode;
      }
      if (utils.isDict(arguments[i])) {
        args = arguments[i++];
      }
      if (typeof arguments[i] === "string") {
        addAction = arguments[i];
      }
      
      if (args && arguments.length === 1) {
        if (args.target instanceof Node) {
          target = args.target;
          delete args.target;
        }
        if (typeof args.addAction === "string") {
          addAction = args.addAction;
          delete args.addAction;
        }
      }
      
      switch (addAction) {
      case "addToHead": case "addToTail": case "addBefore": case "addAfter":
        break;
      default:
        addAction = "addToHead";
      }
      return new Synth(JSON.stringify(this.specs), target, args, addAction);
    }).multiCall().build();

    var topoSort = (function() {
      var _topoSort = function(x, list) {
        var index = list.indexOf(x);
        if (index !== -1) {
          list.splice(index, 1);
        }
        list.unshift(x);
        if (x.inputs) {
          x.inputs.forEach(function(x) {
            _topoSort(x, list);
          });
        }
      };
      return function(list) {
        list.forEach(function(x) {
          if (x instanceof ugen.Out) {
            x.inputs.forEach(function(x) {
              _topoSort(x, list);
            });
          }
        });
        return list;
      };
    })();
    
    var splitArguments = function(args) {
      var result  = [];
      var begin   = 0;
      var bracket = 0;
      var inStr   = null;
      for (var i = 0, imax = args.length; i < imax; ++i) {
        var c = args.charAt(i);
        if (args.charAt(i-1) === "\\") {
          if (args.charAt(i-2) !== "\\") {
            continue;
          }
        }
        if (c === "\"" || c === "'") {
          if (inStr === null) {
            inStr = c;
          } else if (inStr === c) {
            inStr = null;
          }
        }
        if (inStr) {
          continue;
        }
        switch (c) {
        case ",":
          if (bracket === 0) {
            result.push(args.slice(begin, i).trim());
            begin = i + 1;
          }
          break;
        case "[":
          bracket += 1;
          break;
        case "]":
          bracket -= 1;
          break;
        }
      }
      if (begin !== i) {
        result.push(args.slice(begin, i).trim());
      }
      return result;
    };
    
    var unpackArguments = function(args) {
      var keys = [];
      var vals = [];
      if (args) {
        try {
          splitArguments(args).forEach(function(items) {
            var i = items.indexOf("=");
            var k, v;
            if (i === -1) {
              k = items;
              v = undefined;
            } else {
              k = items.substr(0, i).trim();
              v = JSON.parse(items.substr(i + 1));
            }
            keys.push(k);
            vals.push(v);
          });
        } catch (e) {
          return;
        }
      }
      return { keys:keys, vals:vals };
    };
    
    return SynthDef;
  })();
  
  var install = function(namespace) {
    namespace.register("Synth", SynthDefInterface);
  };
  
  module.exports = {
    Node : Node,
    Group: Group,
    Synth: Synth,
    install: install,
  };

});
define('cc/server/fn', function(require, exports, module) {

  var utils = require("./utils");
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
              return utils.flop(args).map(function(items) {
                return func.apply(this, items);
              }, this);
            }
            return func.apply(this, args);
          };
        } else {
          ret = function() {
            var args = slice.call(arguments);
            if (containsArray(args)) {
              return utils.apply(args).map(function(items) {
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
      if (utils.isDict(given[given.length - 1])) {
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

  module.exports = fn;

});
define('cc/server/utils', function(require, exports, module) {

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
    isDict : isDict,
    flop   : flop,
    flatten: flatten,
    clump  : clump,
    pack   : pack
  };

});
define('cc/server/ugen/ugen', function(require, exports, module) {

  var fn = require("../fn");
  var utils = require("../utils");
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
      var zipped = utils.flop(list);
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
    namespace.register("Out", Out);
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
define('cc/server/unit/unit', function(require, exports, module) {

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
  
  var FixNum = (function() {
    var map = {};
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

  
  var register = function(name, payload) {
    units[name] = payload();
  };

  var install = function() {
    register("Control", Control);
    register("Out"    , Out    );
  };
  
  module.exports = {
    Unit    : Unit,
    FixNum  : FixNum,
    Control : Control,
    register: register,
    install : install
  };

});
define('cc/server/sched', function(require, exports, module) {

  var cc = require("../cc");
  var fn = require("./fn");

  var Timeline = (function() {
    function Timeline(server) {
      this.klassName = "Timeline";
      this.server = server;
      this.list = [];
      this.requireSort = false;
      this.currentTime = 0;
      this.currentTimeIncr = 0;
    }
    Timeline.prototype.play = function() {
      this.currentTimeIncr = (this.server.bufLength / this.server.sampleRate) * 1000;
    };
    Timeline.prototype.pause = function() {
      this.currentTimeIncr = 0;
    };
    Timeline.prototype.reset = function() {
      this.list = [];
      this.requireSort = false;
      this.currentTime = 0;
    };
    Timeline.prototype.push = function() {
      var list = this.list;

      var i = 0;
      var time, looper, immediately;

      if (typeof arguments[i] === "number") {
        time = arguments[i++];
      } else {
        time = this.currentTime;
      }
      if (arguments[i] instanceof Scheduler) {
        looper = arguments[i++];
      } else if (typeof arguments[i] === "function") {
        looper = { execute: arguments[i++] };
      }
      if (typeof arguments[i] === "boolean") {
        immediately = arguments[i++];
      } else {
        immediately = false;
      }
      if (list.length) {
        if (time < list[list.length - 1][0]) {
          this.requireSort = true;
        }
      }
      list.push([ time, looper ]);
      if (immediately && this.requireSort) {
        list.sort(sortFunction);
        this.requireSort = false;
      }
    };
    var sortFunction = function(a, b) {
      return a[0] - b[0];
    };
    Timeline.prototype.process = function() {
      var currentTime = this.currentTime;
      var list = this.list;
      if (this.requireSort) {
        list.sort(sortFunction);
        this.requireSort = false;
      }
      var i = 0, imax = list.length;
      while (i < imax) {
        if (list[i][0] < currentTime) {
          list[i][1].execute(currentTime);
        } else {
          break;
        }
        i += 1;
      }
      if (i) {
        list.splice(0, i);
      }
      this.currentTime = currentTime + this.currentTimeIncr;
    };
    return Timeline;
  })();

  var Scheduler = (function() {
    function Scheduler() {
      this.klassName = "Scheduler";
      this.server = cc.server;
      this.payload = new SchedPayload(this.server.timeline);
      this.paused  = false;
    }
    Scheduler.prototype.execute = function(currentTime) {
      if (!this.paused) {
        this._execute();
        this.server.timeline.currentTime = currentTime;
      }
    };
    Scheduler.prototype.run = function() {
      var that = this;
      var timeline = this.server.timeline;
      timeline.push(function() {
        timeline.push(0, that);
      }, true);
    };
    Scheduler.prototype.pause = function() {
      this.paused = true;
    };
    return Scheduler;
  })();

  var SchedPayload = (function() {
    function SchedPayload(timeline) {
      this.timeline = timeline;
      this.isBreak  = false;
    }
    SchedPayload.prototype.wait = function(msec) {
      msec = +msec;
      if (!isNaN(msec)) {
        this.timeline.currentTime += msec;
      }
    };
    SchedPayload.prototype.break = function() {
      this.isBreak = true;
    };
    return SchedPayload;
  })();

  var TaskDo = (function() {
    function TaskLoop(func) {
      Scheduler.call(this);
      this.func = func;
    }
    fn.extend(TaskLoop, Scheduler);

    TaskLoop.prototype._execute = function() {
      this.func.call(this.payload);
    };
    
    return TaskLoop;
  })();
  
  var TaskLoop = (function() {
    function TaskLoop(func) {
      Scheduler.call(this);
      this.func = func;
    }
    fn.extend(TaskLoop, Scheduler);

    TaskLoop.prototype._execute = function() {
      this.func.call(this.payload);
      if (!this.payload.isBreak) {
        this.server.timeline.push(this);
      }
    };
    
    return TaskLoop;
  })();

  var TaskEach = (function() {
    function TaskEach(list, func) {
      Scheduler.call(this);
      this.list  = list;
      this.func  = func;
      this.index = 0;
    }
    fn.extend(TaskEach, Scheduler);

    TaskEach.prototype._execute = function() {
      if (this.index < this.list.length) {
        this.func.call(this.payload, this.list[this.index++]);
        if (!this.payload.isBreak) {
          this.server.timeline.push(this);
        }
      }
    };
    
    return TaskEach;
  })();

  var TaskTimeout = (function() {
    function TaskTimeout(delay, func) {
      Scheduler.call(this);
      this.delay = delay;
      this.func  = func;
    }
    fn.extend(TaskTimeout, Scheduler);
    
    TaskTimeout.prototype.run = function() {
      var that = this;
      var timeline = this.server.timeline;
      timeline.push(timeline.currentTime + this.delay, function() {
        timeline.push(0, that);
      });
    };
    TaskTimeout.prototype._execute = function() {
      this.func.call(this.payload);
    };
    
    return TaskTimeout;
  })();
  
  var TaskInterval = (function() {
    function TaskInterval(delay, func) {
      TaskTimeout.call(this, delay, func);
    }
    fn.extend(TaskInterval, TaskTimeout);

    TaskInterval.prototype._execute = function() {
      this.func.call(this.payload);
      if (!this.payload.isBreak) {
        var timeline = this.server.timeline;
        timeline.push(timeline.currentTime + this.delay, this);
      }
    };
    
    return TaskInterval;
  })();
  
  var Task = (function() {
    function Task() {
      this.klassName = "Task";
    }

    Task.prototype.$do = function(func) {
      return new TaskDo(func);
    };
    Task.prototype.$loop = function(func) {
      return new TaskLoop(func);
    };
    Task.prototype.$each = function(list, func) {
      return new TaskEach(list, func);
    };
    Task.prototype.$timeout = function(delay, func) {
      return new TaskTimeout(delay, func);
    };
    Task.prototype.$interval = function(delay, func) {
      return new TaskInterval(delay, func);
    };
    
    fn.classmethod(Task);
    
    return Task;
  })();

  var install = function(namespace) {
    namespace.register("Task", Task);
  };
  
  module.exports = {
    Timeline: Timeline,
    TaskLoop: TaskLoop,
    TaskEach: TaskEach,
    TaskTimeout : TaskTimeout,
    TaskInterval: TaskInterval,
    Task    : Task,
    install : install
  };

});
define('cc/server/bop', function(require, exports, module) {

  var utils = require("./utils");
  var UGen  = require("./ugen/ugen").UGen;
  var BinaryOpUGen = require("./ugen/basic_ops").BinaryOpUGen;

  var setupNumberFunction = function(func, selector, ugenSelector) {
    return function(b) {
      if (Array.isArray(b)) {
        return b.map(function(b) {
          return this[selector](b);
        }, this);
      } else if (b instanceof UGen) {
        return BinaryOpUGen.new(ugenSelector, this, b);
      }
      return func(this, b);
    };
  };
  var setupArrayFunction = function(selector, ugenSelector) {
    return function(b) {
      var a = this;
      if (Array.isArray(b)) {
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
      } else if (b instanceof UGen) {
        return BinaryOpUGen.new(ugenSelector, this, b);
      }
      return a.map(function(a) {
        return a[selector](b);
      });
    };
  };
  var setupUGenFunction = function(selector) {
    return function(b) {
      return BinaryOpUGen.new(selector, this, b);
    };
  };

  var setup = function(selector, func, ugenSelector) {
    ugenSelector = ugenSelector || selector;
    Number.prototype[selector] = setupNumberFunction(func, selector, ugenSelector);
    Array.prototype[selector]  = setupArrayFunction(selector, ugenSelector);
    UGen.prototype[selector]   = setupUGenFunction(ugenSelector);
  };

  var install = function() {
    setup("__add__", function(a, b) {
      return a + b;
    }, "+");
    String.prototype.__add__ = function(b) {
      return this + b;
    };
    Function.prototype.__add__ = function(b) {
      return this + b;
    };

    setup("__sub__", function(a, b) {
      return a - b;
    }, "-");
    
    setup("__mul__", function(a, b) {
      return a * b;
    }, "*");
    String.prototype.__mul__ = function(b) {
      if (typeof b === "number") {
        var result = new Array(Math.max(0, b));
        for (var i = 0; i < b; i++) {
          result[i] = this;
        }
        return result.join("");
      } else if (Array.isArray(b)) {
        return b.map(function(b) {
          return this.__mul__(b);
        }, this);
      }
      return this; // throw TypeError?
    };
    Function.prototype.__mul__ = function(b) {
      if (typeof b === "function") {
        var f = this, g = b;
        return function() {
          return f.call(null, g.apply(null, arguments));
        };
      }
      return this;
    };
    
    setup("__div__", function(a, b) {
      return a / b;
    }, "/");
    String.prototype.__div__ = function(b) {
      if (typeof b === "number") {
        return utils.clump(this.split(""), Math.ceil(this.length/b)).map(function(items) {
          return items.join("");
        });
      } else if (Array.isArray(b)) {
        return b.map(function(b) {
          return this.__div__(b);
        }, this);
      }
      return this; // throw TypeError?
    };

    setup("__mod__", function(a, b) {
      return a % b;
    }, "%");
    String.prototype.__mod__ = function(b) {
      if (typeof b === "number") {
        return utils.clump(this.split(""), b|0).map(function(items) {
          return items.join("");
        });
      } else if (Array.isArray(b)) {
        return b.map(function(b) {
          return this.__mod__(b);
        }, this);
      }
      return this; // throw TypeError?
    };
  };
  
  module.exports = {
    install: install,
  };

});
define('cc/server/ugen/basic_ops', function(require, exports, module) {

  var fn = require("../fn");
  var utils = require("../utils");
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
        return BinaryOpUGen.new1(null, "*!", list[0][0], list[0][1]);
      }
      return work(list);
    };
  })();
  
  Number.prototype.madd = fn(function(mul, add) {
    return MulAdd.new(this, mul, add);
  }).defaults("mul=1,add=0").build();
  Array.prototype.madd = fn(function(mul, add) {
    return utils.flop([this, mul, add]).map(function(items) {
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
  }).defaults("lo=0,hi=1").multiCall().build();

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

  var UGen = require("./ugen/ugen").UGen;
  var UnaryOpUGen = require("./ugen/basic_ops").UnaryOpUGen;
  
  var setupFunction = function(func) {
    return function() {
      return func(this);
    };
  };
  var setupArrayFunction = function(selector) {
    return function() {
      return this.map(function(x) {
        return x[selector]();
      });
    };
  };
  var setupUGenFunction = function(selector) {
    return function() {
      return UnaryOpUGen.new(selector, this);
    };
  };

  var setup = function(selector, func, others) {
    func = setupFunction(func);
    Number.prototype[selector] = func;
    Array.prototype[selector]  = setupArrayFunction(selector);
    UGen.prototype[selector]   = setupUGenFunction(selector);
    if (others) {
      String.prototype[selector]   = func;
      Boolean.prototype[selector]  = func;
      Function.prototype[selector] = func;
    }
  };
  
  var install = function() {
    setup("num", function(a) {
      return +a;
    }, true);
    
    setup("neg", function(a) {
      return -a;
    }, true);

    setup("not", function(a) {
      return !a;
    }, true);
    
    setup("tilde", function(a) {
      return ~a;
    }, true);
  };

  module.exports = {
    install: install
  };

});
define('cc/server/ugen/installer', function(require, exports, module) {

  var install = function(namespace) {
    require("./ugen").install(namespace);
    require("./basic_ops").install(namespace);
    require("./osc").install(namespace);
    require("./ui").install(namespace);
  };

  module.exports = {
    install: install
  };
 
});
define('cc/server/ugen/osc', function(require, exports, module) {
  
  var fn = require("../fn");
  var UGen = require("./ugen").UGen;

  var SinOsc = (function() {
    function SinOsc() {
      UGen.call(this);
      this.klassName = "SinOsc";
    }
    fn.extend(SinOsc, UGen);
    
    SinOsc.prototype.$ar = fn(function(freq, phase, mul, add) {
      return this.multiNew(2, freq, phase).madd(mul, add);
    }).defaults("freq=440,phase=0,mul=1,add=0").build();
    
    SinOsc.prototype.$kr = fn(function(freq, phase, mul, add) {
      return this.multiNew(1, freq, phase).madd(mul, add);
    }).defaults("freq=440,phase=0,mul=1,add=0").build();
    
    fn.classmethod(SinOsc);
    
    return SinOsc;
  })();

  var install = function(namespace) {
    namespace.register("SinOsc", SinOsc);
  };
  
  module.exports = {
    SinOsc: SinOsc,
    install: install
  };

});
define('cc/server/ugen/ui', function(require, exports, module) {

  var fn = require("../fn");
  var UGen = require("./ugen").UGen;

  var MouseX = (function() {
    function MouseX() {
      UGen.call(this);
      this.klassName = "MouseX";
    }
    fn.extend(MouseX, UGen);

    MouseX.prototype.$kr = fn(function(minval, maxval, warp, lag) {
      if (warp === "exponential") {
        warp = 1;
      } else if (typeof warp !== "number") {
        warp = 0;
      }
      return this.multiNew(1, minval, maxval, warp, lag);
    }).defaults("minval=0,maxval=1,warp=0,lag=0.2").build();
    
    fn.classmethod(MouseX);
    
    return MouseX;
  })();
  
  var MouseY = (function() {
    function MouseY() {
      UGen.call(this);
      this.klassName = "MouseY";
    }
    fn.extend(MouseY, UGen);

    MouseY.prototype.$kr = fn(function(minval, maxval, warp, lag) {
      if (warp === "exponential") {
        warp = 1;
      } else if (typeof warp !== "number") {
        warp = 0;
      }
      return this.multiNew(1, minval, maxval, warp, lag);
    }).defaults("minval=0,maxval=1,warp=0,lag=0.2").build();
    
    fn.classmethod(MouseY);
    
    return MouseY;
  })();
  
  var MouseButton = (function() {
    function MouseButton() {
      UGen.call(this);
      this.klassName = "MouseButton";
    }
    fn.extend(MouseButton, UGen);

    MouseButton.prototype.$kr = fn(function(minval, maxval, lag) {
      return this.multiNew(1, minval, maxval, lag);
    }).defaults("minval=0,maxval=1,lag=0.2").build();
    
    fn.classmethod(MouseButton);
    
    return MouseButton;
  })();
  
  var install = function(namespace) {
    namespace.register("MouseX", MouseX);
    namespace.register("MouseY", MouseY);
    namespace.register("MouseButton", MouseButton);
  };

  module.exports = {
    install: install
  };

});
define('cc/server/unit/installer', function(require, exports, module) {

  var install = function() {
    require("./unit").install();
    require("./basic_ops").install();
    require("./osc").install();
    require("./ui").install();
  };
  
  module.exports = {
    install: install
  };

});
define('cc/server/unit/basic_ops', function(require, exports, module) {

  var unit = require("./unit");
  var ops  = require("../ugen/basic_ops");

  var UnaryOpUGen = (function() {
    var UNARY_OP_UGEN_MAP = ops.UNARY_OP_UGEN_MAP;
    
    var calcFunc = {};
    
    var UnaryOpUGen = function() {
      var ctor = function() {
        var func = calcFunc[UNARY_OP_UGEN_MAP[this.specialIndex]];
        var process;
        if (func) {
          switch (this.inRates[0]) {
          case 2  : process = func.a; break;
          case 1: process = func.k; break;
          }
          this.process = process;
          if (this.process) {
            this.process(1);
          } else {
            this.outs[0][0] = func(this.inputs[0][0]);
          }
        } else {
          console.log("UnaryOpUGen[" + this.specialIndex + "] is not defined.");
        }
      };
      return ctor;
    };
    
    var k = function(func) {
      return function() {
        this.outs[0][0] = func(this.inputs[0][0]);
      };
    };
    var a = function(func) {
      return function(inNumSamples) {
        inNumSamples = inNumSamples|0;
        var out = this.outs[0];
        var a = this.inputs[0];
        for (var i = 0; i < inNumSamples; i += 8) {
          out[i  ] = func(a[i  ]); out[i+1] = func(a[i+1]);
          out[i+2] = func(a[i+2]); out[i+3] = func(a[i+3]);
          out[i+4] = func(a[i+4]); out[i+5] = func(a[i+5]);
          out[i+6] = func(a[i+6]); out[i+7] = func(a[i+7]);
        }
      };
    };

    calcFunc.num = function(a) {
      return +a;
    };
    calcFunc.neg = function(a) {
      return -a;
    };
    calcFunc.not = function(a) {
      return a > 0 ? 0 : 1;
    };
    calcFunc.tilde = function(a) {
      return ~a;
    };
    
    Object.keys(calcFunc).forEach(function(key) {
      var func = calcFunc[key];
      if (!func.a) { func.a = a(func); }
      if (!func.k) { func.k = k(func); }
    });
    
    return UnaryOpUGen;
  })();

  var BinaryOpUGen = (function() {
    var BINARY_OP_UGEN_MAP = ops.BINARY_OP_UGEN_MAP;

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
    
    return BinaryOpUGen;
  })();
  
  var MulAdd = function() {
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
        this.outs[0][0] = this._in * this._mul + this._add;
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
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn  = this.inputs[0];
      var mulIn = this.inputs[1];
      var addIn = this.inputs[2];
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn[i  ] * mulIn[i  ] + addIn[i  ];
        outs[i+1] = inIn[i+1] * mulIn[i+1] + addIn[i+1];
        outs[i+2] = inIn[i+2] * mulIn[i+2] + addIn[i+2];
        outs[i+3] = inIn[i+3] * mulIn[i+3] + addIn[i+3];
        outs[i+4] = inIn[i+4] * mulIn[i+4] + addIn[i+4];
        outs[i+5] = inIn[i+5] * mulIn[i+5] + addIn[i+5];
        outs[i+6] = inIn[i+6] * mulIn[i+6] + addIn[i+6];
        outs[i+7] = inIn[i+7] * mulIn[i+7] + addIn[i+7];
      }
    };
    next[2][2][1] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn  = this.inputs[0];
      var mulIn = this.inputs[1];
      var add = this._add;
      var nextAdd = this.inputs[2][0];
      var add_slope = (nextAdd - add) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn[i  ] * mulIn[i  ] + add; add += add_slope;
        outs[i+1] = inIn[i+1] * mulIn[i+1] + add; add += add_slope;
        outs[i+2] = inIn[i+2] * mulIn[i+2] + add; add += add_slope;
        outs[i+3] = inIn[i+3] * mulIn[i+3] + add; add += add_slope;
        outs[i+4] = inIn[i+4] * mulIn[i+4] + add; add += add_slope;
        outs[i+5] = inIn[i+5] * mulIn[i+5] + add; add += add_slope;
        outs[i+6] = inIn[i+6] * mulIn[i+6] + add; add += add_slope;
        outs[i+7] = inIn[i+7] * mulIn[i+7] + add; add += add_slope;
      }
      this._add = nextAdd;
    };
    next[2][2][0] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn  = this.inputs[0];
      var mulIn = this.inputs[1];
      var add = this._add;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn[i  ] * mulIn[i  ] + add;
        outs[i+1] = inIn[i+1] * mulIn[i+1] + add;
        outs[i+2] = inIn[i+2] * mulIn[i+2] + add;
        outs[i+3] = inIn[i+3] * mulIn[i+3] + add;
        outs[i+4] = inIn[i+4] * mulIn[i+4] + add;
        outs[i+5] = inIn[i+5] * mulIn[i+5] + add;
        outs[i+6] = inIn[i+6] * mulIn[i+6] + add;
        outs[i+7] = inIn[i+7] * mulIn[i+7] + add;
      }
    };
    next[2][1][2] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn  = this.inputs[0];
      var mul   = this._mul;
      var addIn = this.inputs[2];
      var nextMul = this.inputs[1][0];
      var mul_slope = (nextMul - mul) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn[i  ] * mul + addIn[i  ]; mul += mul_slope;
        outs[i+1] = inIn[i+1] * mul + addIn[i+1]; mul += mul_slope;
        outs[i+2] = inIn[i+2] * mul + addIn[i+2]; mul += mul_slope;
        outs[i+3] = inIn[i+3] * mul + addIn[i+3]; mul += mul_slope;
        outs[i+4] = inIn[i+4] * mul + addIn[i+4]; mul += mul_slope;
        outs[i+5] = inIn[i+5] * mul + addIn[i+5]; mul += mul_slope;
        outs[i+6] = inIn[i+6] * mul + addIn[i+6]; mul += mul_slope;
        outs[i+7] = inIn[i+7] * mul + addIn[i+7]; mul += mul_slope;
      }
      this._mul = nextMul;
    };
    next[2][1][1] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn  = this.inputs[0];
      var mul   = this._mul;
      var add   = this._add;
      var nextMul = this.inputs[1][0];
      var mul_slope = (nextMul - mul) * this.rate.slopeFactor;
      var nextAdd = this.inputs[2][0];
      var add_slope = (nextAdd - add) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn[i  ] * mul + add; mul += mul_slope; add += add_slope;
        outs[i+1] = inIn[i+1] * mul + add; mul += mul_slope; add += add_slope;
        outs[i+2] = inIn[i+2] * mul + add; mul += mul_slope; add += add_slope;
        outs[i+3] = inIn[i+3] * mul + add; mul += mul_slope; add += add_slope;
        outs[i+4] = inIn[i+4] * mul + add; mul += mul_slope; add += add_slope;
        outs[i+5] = inIn[i+5] * mul + add; mul += mul_slope; add += add_slope;
        outs[i+6] = inIn[i+6] * mul + add; mul += mul_slope; add += add_slope;
        outs[i+7] = inIn[i+7] * mul + add; mul += mul_slope; add += add_slope;
      }
      this._mul = nextMul;
      this._add = nextAdd;
    };
    next[2][1][0] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn  = this.inputs[0];
      var mul   = this._mul;
      var add = this._add;
      var nextMul = this.inputs[1][0];
      var mul_slope = (nextMul - mul) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn[i  ] * mul + add; mul += mul_slope;
        outs[i+1] = inIn[i+1] * mul + add; mul += mul_slope;
        outs[i+2] = inIn[i+2] * mul + add; mul += mul_slope;
        outs[i+3] = inIn[i+3] * mul + add; mul += mul_slope;
        outs[i+4] = inIn[i+4] * mul + add; mul += mul_slope;
        outs[i+5] = inIn[i+5] * mul + add; mul += mul_slope;
        outs[i+6] = inIn[i+6] * mul + add; mul += mul_slope;
        outs[i+7] = inIn[i+7] * mul + add; mul += mul_slope;
      }
      this._mul = nextMul;
    };
    next[2][0][2] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn  = this.inputs[0];
      var mul   = this._mul;
      var addIn = this.inputs[2];
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn[i  ] * mul + addIn[i  ];
        outs[i+1] = inIn[i+1] * mul + addIn[i+1];
        outs[i+2] = inIn[i+2] * mul + addIn[i+2];
        outs[i+3] = inIn[i+3] * mul + addIn[i+3];
        outs[i+4] = inIn[i+4] * mul + addIn[i+4];
        outs[i+5] = inIn[i+5] * mul + addIn[i+5];
        outs[i+6] = inIn[i+6] * mul + addIn[i+6];
        outs[i+7] = inIn[i+7] * mul + addIn[i+7];
      }
    };
    next[2][0][1] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn  = this.inputs[0];
      var mul   = this._mul;
      var add   = this._add;
      var nextAdd = this.inputs[2][0];
      var add_slope = (nextAdd - add) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn[i  ] * mul + add; add += add_slope;
        outs[i+1] = inIn[i+1] * mul + add; add += add_slope;
        outs[i+2] = inIn[i+2] * mul + add; add += add_slope;
        outs[i+3] = inIn[i+3] * mul + add; add += add_slope;
        outs[i+4] = inIn[i+4] * mul + add; add += add_slope;
        outs[i+5] = inIn[i+5] * mul + add; add += add_slope;
        outs[i+6] = inIn[i+6] * mul + add; add += add_slope;
        outs[i+7] = inIn[i+7] * mul + add; add += add_slope;
      }
      this._add = nextAdd;
    };
    next[2][0][0] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn  = this.inputs[0];
      var mul   = this._mul;
      var add = this._add;
      var nextMul = this.inputs[1][0];
      var mul_slope = (nextMul - mul) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn[i  ] * mul + add; mul += mul_slope;
        outs[i+1] = inIn[i+1] * mul + add; mul += mul_slope;
        outs[i+2] = inIn[i+2] * mul + add; mul += mul_slope;
        outs[i+3] = inIn[i+3] * mul + add; mul += mul_slope;
        outs[i+4] = inIn[i+4] * mul + add; mul += mul_slope;
        outs[i+5] = inIn[i+5] * mul + add; mul += mul_slope;
        outs[i+6] = inIn[i+6] * mul + add; mul += mul_slope;
        outs[i+7] = inIn[i+7] * mul + add; mul += mul_slope;
      }
      this._mul = nextMul;
    };
    next[1][1][2] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var _in   = this._in;
      var mul   = this._mul;
      var addIn = this.inputs[2];
      var nextIn = this.inputs[0][0];
      var in_slope = (nextIn - _in) * this.rate.slopeFactor;
      var nextMul = this.inputs[1][0];
      var mul_slope = (nextMul - mul) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = _in * mul + addIn[i  ]; _in += in_slope; mul += mul_slope;
        outs[i+1] = _in * mul + addIn[i+1]; _in += in_slope; mul += mul_slope;
        outs[i+2] = _in * mul + addIn[i+2]; _in += in_slope; mul += mul_slope;
        outs[i+3] = _in * mul + addIn[i+3]; _in += in_slope; mul += mul_slope;
        outs[i+4] = _in * mul + addIn[i+4]; _in += in_slope; mul += mul_slope;
        outs[i+5] = _in * mul + addIn[i+5]; _in += in_slope; mul += mul_slope;
        outs[i+6] = _in * mul + addIn[i+6]; _in += in_slope; mul += mul_slope;
        outs[i+7] = _in * mul + addIn[i+7]; _in += in_slope; mul += mul_slope;
      }
      this._in  = nextIn;
      this._mul = nextMul;
    };
    next[1][1][1] = function() {
      this.outs[0][0] = this.inputs[0][0] * this.inputs[1][0] + this.inputs[2][0];
    };
    next[1][1][0] = function() {
      this.outs[0][0] = this.inputs[0][0] * this.inputs[1][0] + this._add;
    };
    next[1][0][2] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var _in   = this._in;
      var mul   = this._mul;
      var addIn = this.inputs[2];
      var nextIn = this.inputs[0][0];
      var in_slope = (nextIn - _in) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = _in * mul + addIn[i  ]; _in += in_slope;
        outs[i+1] = _in * mul + addIn[i+1]; _in += in_slope;
        outs[i+2] = _in * mul + addIn[i+2]; _in += in_slope;
        outs[i+3] = _in * mul + addIn[i+3]; _in += in_slope;
        outs[i+4] = _in * mul + addIn[i+4]; _in += in_slope;
        outs[i+5] = _in * mul + addIn[i+5]; _in += in_slope;
        outs[i+6] = _in * mul + addIn[i+6]; _in += in_slope;
        outs[i+7] = _in * mul + addIn[i+7]; _in += in_slope;
      }
      this._in  = nextIn;
    };
    next[1][0][1] = function() {
      this.outs[0][0] = this.inputs[0][0] * this._mul + this.inputs[2][0];
    };
    next[1][0][0] = function() {
      this.outs[0][0] = this.inputs[0][0] * this._mul + this._add;
    };
    next[0][2][2] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var _in   = this._in;
      var mulIn = this.inputs[1];
      var addIn = this.inputs[2];
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = _in * mulIn[i  ] + addIn[i  ];
        outs[i+1] = _in * mulIn[i+1] + addIn[i+1];
        outs[i+2] = _in * mulIn[i+2] + addIn[i+2];
        outs[i+3] = _in * mulIn[i+3] + addIn[i+3];
        outs[i+4] = _in * mulIn[i+4] + addIn[i+4];
        outs[i+5] = _in * mulIn[i+5] + addIn[i+5];
        outs[i+6] = _in * mulIn[i+6] + addIn[i+6];
        outs[i+7] = _in * mulIn[i+7] + addIn[i+7];
      }
    };
    next[0][2][1] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var _in   = this._in;
      var mulIn = this.inputs[1];
      var add = this._add;
      var nextAdd = this.inputs[2][0];
      var add_slope = (nextAdd - add) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = _in * mulIn[i  ] + add; add += add_slope;
        outs[i+1] = _in * mulIn[i+1] + add; add += add_slope;
        outs[i+2] = _in * mulIn[i+2] + add; add += add_slope;
        outs[i+3] = _in * mulIn[i+3] + add; add += add_slope;
        outs[i+4] = _in * mulIn[i+4] + add; add += add_slope;
        outs[i+5] = _in * mulIn[i+5] + add; add += add_slope;
        outs[i+6] = _in * mulIn[i+6] + add; add += add_slope;
        outs[i+7] = _in * mulIn[i+7] + add; add += add_slope;
      }
      this._add = nextAdd;
    };
    next[0][2][0] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var _in   = this._in;
      var mulIn = this.inputs[1];
      var add = this._add;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = _in * mulIn[i  ] + add;
        outs[i+1] = _in * mulIn[i+1] + add;
        outs[i+2] = _in * mulIn[i+2] + add;
        outs[i+3] = _in * mulIn[i+3] + add;
        outs[i+4] = _in * mulIn[i+4] + add;
        outs[i+5] = _in * mulIn[i+5] + add;
        outs[i+6] = _in * mulIn[i+6] + add;
        outs[i+7] = _in * mulIn[i+7] + add;
      }
    };
    next[0][1][2] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var _in   = this._in;
      var mul   = this._mul;
      var addIn = this.inputs[2];
      var nextMul = this.inputs[1][0];
      var mul_slope = (nextMul - mul) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = _in * mul + addIn[i  ]; mul += mul_slope;
        outs[i+1] = _in * mul + addIn[i+1]; mul += mul_slope;
        outs[i+2] = _in * mul + addIn[i+2]; mul += mul_slope;
        outs[i+3] = _in * mul + addIn[i+3]; mul += mul_slope;
        outs[i+4] = _in * mul + addIn[i+4]; mul += mul_slope;
        outs[i+5] = _in * mul + addIn[i+5]; mul += mul_slope;
        outs[i+6] = _in * mul + addIn[i+6]; mul += mul_slope;
        outs[i+7] = _in * mul + addIn[i+7]; mul += mul_slope;
      }
      this._mul = nextMul;
    };
    next[0][1][1] = function() {
      this.outs[0][0] = this._in * this.inputs[1][0] + this.inputs[2][0];
    };
    next[0][1][0] = function() {
      this.outs[0][0] = this._in * this.inputs[1][0] + this._add;
    };
    next[0][0][2] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var _in   = this._in;
      var mul   = this._mul;
      var addIn = this.inputs[2];
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = _in * mul + addIn[i  ];
        outs[i+1] = _in * mul + addIn[i+1];
        outs[i+2] = _in * mul + addIn[i+2];
        outs[i+3] = _in * mul + addIn[i+3];
        outs[i+4] = _in * mul + addIn[i+4];
        outs[i+5] = _in * mul + addIn[i+5];
        outs[i+6] = _in * mul + addIn[i+6];
        outs[i+7] = _in * mul + addIn[i+7];
      }
    };
    next[0][0][1] = function() {
      this.outs[0][0] = this._in * this._mul + this.inputs[2][0];
    };
    return ctor;
  };

  var Sum3 = function() {
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
        this.outs[0][0] = this._in0 * this._in1 + this._in2;
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
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var inIn2 = this.inputs[2];
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn0[i  ] + inIn1[i  ] + inIn2[i  ];
        outs[i+1] = inIn0[i+1] + inIn1[i+1] + inIn2[i+1];
        outs[i+2] = inIn0[i+2] + inIn1[i+2] + inIn2[i+2];
        outs[i+3] = inIn0[i+3] + inIn1[i+3] + inIn2[i+3];
        outs[i+4] = inIn0[i+4] + inIn1[i+4] + inIn2[i+4];
        outs[i+5] = inIn0[i+5] + inIn1[i+5] + inIn2[i+5];
        outs[i+6] = inIn0[i+6] + inIn1[i+6] + inIn2[i+6];
        outs[i+7] = inIn0[i+7] + inIn1[i+7] + inIn2[i+7];
      }
    };
    next[2][2][1] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var in2   = this._in2;
      var nextIn2 = this.inputs[2][0];
      var in2_slope = (nextIn2 - in2) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn0[i  ] + inIn1[i  ] + in2; in2 += in2_slope;
        outs[i+1] = inIn0[i+1] + inIn1[i+1] + in2; in2 += in2_slope;
        outs[i+2] = inIn0[i+2] + inIn1[i+2] + in2; in2 += in2_slope;
        outs[i+3] = inIn0[i+3] + inIn1[i+3] + in2; in2 += in2_slope;
        outs[i+4] = inIn0[i+4] + inIn1[i+4] + in2; in2 += in2_slope;
        outs[i+5] = inIn0[i+5] + inIn1[i+5] + in2; in2 += in2_slope;
        outs[i+6] = inIn0[i+6] + inIn1[i+6] + in2; in2 += in2_slope;
        outs[i+7] = inIn0[i+7] + inIn1[i+7] + in2; in2 += in2_slope;
      }
      this._in2 = nextIn2;
    };
    next[2][2][0] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var in2   = this._in2;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn0[i  ] + inIn1[i  ] + in2;
        outs[i+1] = inIn0[i+1] + inIn1[i+1] + in2;
        outs[i+2] = inIn0[i+2] + inIn1[i+2] + in2;
        outs[i+3] = inIn0[i+3] + inIn1[i+3] + in2;
        outs[i+4] = inIn0[i+4] + inIn1[i+4] + in2;
        outs[i+5] = inIn0[i+5] + inIn1[i+5] + in2;
        outs[i+6] = inIn0[i+6] + inIn1[i+6] + in2;
        outs[i+7] = inIn0[i+7] + inIn1[i+7] + in2;
      }
    };
    next[2][1][1] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn0 = this.inputs[0];
      var in12  = this._in1 + this._in2;
      var nextIn12 = this.inputs[1][0] + this.inputs[2][0];
      var in12_slope = (nextIn12 - in12) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn0[i  ] + in12; in12 += in12_slope;
        outs[i+1] = inIn0[i+1] + in12; in12 += in12_slope;
        outs[i+2] = inIn0[i+2] + in12; in12 += in12_slope;
        outs[i+3] = inIn0[i+3] + in12; in12 += in12_slope;
        outs[i+4] = inIn0[i+4] + in12; in12 += in12_slope;
        outs[i+5] = inIn0[i+5] + in12; in12 += in12_slope;
        outs[i+6] = inIn0[i+6] + in12; in12 += in12_slope;
        outs[i+7] = inIn0[i+7] + in12; in12 += in12_slope;
      }
      this._in1 = this.inputs[1][0];
      this._in2 = this.inputs[2][0];
    };
    next[2][1][0] = next[2][1][1];
    next[2][0][0] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn0 = this.inputs[0];
      var in12  = this._in1 + this._in2;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn0[i  ] + in12;
        outs[i+1] = inIn0[i+1] + in12;
        outs[i+2] = inIn0[i+2] + in12;
        outs[i+3] = inIn0[i+3] + in12;
        outs[i+4] = inIn0[i+4] + in12;
        outs[i+5] = inIn0[i+5] + in12;
        outs[i+6] = inIn0[i+6] + in12;
        outs[i+7] = inIn0[i+7] + in12;
      }
    };
    next[1][1][1] = function() {
      this.outs[0][0] = this.inputs[0][0] + this.inputs[1][0] + this.inputs[2][0];
    };
    next[1][1][0] = next[1][1][1];
    next[1][0][0] = next[1][1][1];
    return ctor;
  };

  var Sum4 = function() {
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
        this.outs[0][0] = this._in0 * this._in1 + this._in2 + this._in3;
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
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var inIn2 = this.inputs[2];
      var inIn3 = this.inputs[3];
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn0[i  ] + inIn1[i  ] + inIn2[i  ] + inIn3[i  ];
        outs[i+1] = inIn0[i+1] + inIn1[i+1] + inIn2[i+1] + inIn3[i+1];
        outs[i+2] = inIn0[i+2] + inIn1[i+2] + inIn2[i+2] + inIn3[i+2];
        outs[i+3] = inIn0[i+3] + inIn1[i+3] + inIn2[i+3] + inIn3[i+3];
        outs[i+4] = inIn0[i+4] + inIn1[i+4] + inIn2[i+4] + inIn3[i+4];
        outs[i+5] = inIn0[i+5] + inIn1[i+5] + inIn2[i+5] + inIn3[i+5];
        outs[i+6] = inIn0[i+6] + inIn1[i+6] + inIn2[i+6] + inIn3[i+6];
        outs[i+7] = inIn0[i+7] + inIn1[i+7] + inIn2[i+7] + inIn3[i+7];
      }
    };
    next[2][2][2][1] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var inIn2 = this.inputs[2];
      var in3   = this._in3;
      var nextIn3 = this.inputs[3][0];
      var in3_slope = (nextIn3 - in3) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn0[i  ] + inIn1[i  ] + inIn2[i  ] + in3; in3 += in3_slope;
        outs[i+1] = inIn0[i+1] + inIn1[i+1] + inIn2[i+1] + in3; in3 += in3_slope;
        outs[i+2] = inIn0[i+2] + inIn1[i+2] + inIn2[i+2] + in3; in3 += in3_slope;
        outs[i+3] = inIn0[i+3] + inIn1[i+3] + inIn2[i+3] + in3; in3 += in3_slope;
        outs[i+4] = inIn0[i+4] + inIn1[i+4] + inIn2[i+4] + in3; in3 += in3_slope;
        outs[i+5] = inIn0[i+5] + inIn1[i+5] + inIn2[i+5] + in3; in3 += in3_slope;
        outs[i+6] = inIn0[i+6] + inIn1[i+6] + inIn2[i+6] + in3; in3 += in3_slope;
        outs[i+7] = inIn0[i+7] + inIn1[i+7] + inIn2[i+7] + in3; in3 += in3_slope;
      }
      this._in3 = nextIn3;
    };
    next[2][2][2][0] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var inIn2 = this.inputs[2];
      var in3   = this._in3;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn0[i  ] + inIn1[i  ] + inIn2[i  ] + in3;
        outs[i+1] = inIn0[i+1] + inIn1[i+1] + inIn2[i+1] + in3;
        outs[i+2] = inIn0[i+2] + inIn1[i+2] + inIn2[i+2] + in3;
        outs[i+3] = inIn0[i+3] + inIn1[i+3] + inIn2[i+3] + in3;
        outs[i+4] = inIn0[i+4] + inIn1[i+4] + inIn2[i+4] + in3;
        outs[i+5] = inIn0[i+5] + inIn1[i+5] + inIn2[i+5] + in3;
        outs[i+6] = inIn0[i+6] + inIn1[i+6] + inIn2[i+6] + in3;
        outs[i+7] = inIn0[i+7] + inIn1[i+7] + inIn2[i+7] + in3;
      }
    };
    next[2][2][1][1] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var in23  = this._in2 + this._in3;
      var nextIn23 = this.inputs[2][0] + this.inputs[3][0];
      var in23_slope = (nextIn23 - in23) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn0[i  ] + inIn1[i  ] + in23; in23 += in23_slope;
        outs[i+1] = inIn0[i+1] + inIn1[i+1] + in23; in23 += in23_slope;
        outs[i+2] = inIn0[i+2] + inIn1[i+2] + in23; in23 += in23_slope;
        outs[i+3] = inIn0[i+3] + inIn1[i+3] + in23; in23 += in23_slope;
        outs[i+4] = inIn0[i+4] + inIn1[i+4] + in23; in23 += in23_slope;
        outs[i+5] = inIn0[i+5] + inIn1[i+5] + in23; in23 += in23_slope;
        outs[i+6] = inIn0[i+6] + inIn1[i+6] + in23; in23 += in23_slope;
        outs[i+7] = inIn0[i+7] + inIn1[i+7] + in23; in23 += in23_slope;
      }
      this._in2 = this.inputs[2][0];
      this._in3 = this.inputs[2][0];
    };
    next[2][2][1][0] = next[2][2][1][1];
    next[2][2][0][0] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var in23  = this._in2 + this._in3;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn0[i  ] + inIn1[i  ] + in23;
        outs[i+1] = inIn0[i+1] + inIn1[i+1] + in23;
        outs[i+2] = inIn0[i+2] + inIn1[i+2] + in23;
        outs[i+3] = inIn0[i+3] + inIn1[i+3] + in23;
        outs[i+4] = inIn0[i+4] + inIn1[i+4] + in23;
        outs[i+5] = inIn0[i+5] + inIn1[i+5] + in23;
        outs[i+6] = inIn0[i+6] + inIn1[i+6] + in23;
        outs[i+7] = inIn0[i+7] + inIn1[i+7] + in23;
      }
    };
    next[2][1][1][1] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn0 = this.inputs[0];
      var in123 = this._in1 + this._in2 + this._in3;
      var nextIn123 = this.inputs[1][0] + this.inputs[2][0] + this.inputs[3][0];
      var in123_slope = (nextIn123 - in123) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn0[i  ] + in123; in123 += in123_slope;
        outs[i+1] = inIn0[i+1] + in123; in123 += in123_slope;
        outs[i+2] = inIn0[i+2] + in123; in123 += in123_slope;
        outs[i+3] = inIn0[i+3] + in123; in123 += in123_slope;
        outs[i+4] = inIn0[i+4] + in123; in123 += in123_slope;
        outs[i+5] = inIn0[i+5] + in123; in123 += in123_slope;
        outs[i+6] = inIn0[i+6] + in123; in123 += in123_slope;
        outs[i+7] = inIn0[i+7] + in123; in123 += in123_slope;
      }
      this._in1 = this.inputs[1][0];
      this._in2 = this.inputs[2][0];
      this._in3 = this.inputs[3][0];
    };
    next[2][1][1][0] = next[2][1][1][1];
    next[2][1][0][0] = next[2][1][1][1];
    next[2][0][0][0] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn0 = this.inputs[0];
      var in123 = this._in1 + this._in2 + this._in3;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn0[i  ] + in123;
        outs[i+1] = inIn0[i+1] + in123;
        outs[i+2] = inIn0[i+2] + in123;
        outs[i+3] = inIn0[i+3] + in123;
        outs[i+4] = inIn0[i+4] + in123;
        outs[i+5] = inIn0[i+5] + in123;
        outs[i+6] = inIn0[i+6] + in123;
        outs[i+7] = inIn0[i+7] + in123;
      }
    };
    next[1][1][1][1] = function() {
      this.outs[0][0] = this.inputs[0][0] + this.inputs[1][0] + this.inputs[2][0] + this.inputs[3][0];
    };
    next[1][1][1][0] = next[1][1][1][1];
    next[1][1][0][0] = next[1][1][1][1];
    next[1][0][0][0] = next[1][1][1][1];

    return ctor;
  };
  
  module.exports = {
    install: function() {
      unit.register("UnaryOpUGen" , UnaryOpUGen );
      unit.register("BinaryOpUGen", BinaryOpUGen);
      unit.register("MulAdd", MulAdd);
      unit.register("Sum3"  , Sum3  );
      unit.register("Sum4"  , Sum4  );
    }
  };

});
define('cc/server/unit/osc', function(require, exports, module) {

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
define('cc/server/unit/ui', function(require, exports, module) {

  var unit = require("./unit");
  
  var log001 = Math.log(0.001);
  
  var MouseX = function() {
    var ctor = function() {
      this.process = next;
      this._y1  = 0;
      this._b1  = 0;
      this._lag = 0;
      this._mouse = this.parent.server.syncItems;
      this.process(1);
    };
    var next = function() {
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
      var y0 = this._mouse[2];
      if (warp === 0) {
        y0 = (maxval - minval) * y0 + minval;
      } else {
        y0 = Math.pow(maxval / minval, y0) * minval;
      }
      this.outs[0][0] = y1 = y0 + b1 * (y1 - y0);
      this._y1 = y1;
    };
    return ctor;
  };

  var MouseY = function() {
    var ctor = function() {
      this.process = next;
      this._y1  = 0;
      this._b1  = 0;
      this._lag = 0;
      this._mouse = this.parent.server.syncItems;
      this.process(1);
    };
    var next = function() {
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
      var y0 = this._mouse[3];
      if (warp === 0) {
        y0 = (maxval - minval) * y0 + minval;
      } else {
        y0 = Math.pow(maxval / minval, y0) * minval;
      }
      this.outs[0][0] = y1 = y0 + b1 * (y1 - y0);
      this._y1 = y1;
    };
    return ctor;
  };

  var MouseButton = function() {
    var ctor = function() {
      this.process = next;
      this._y1  = 0;
      this._b1  = 0;
      this._lag = 0;
      this._mouse = this.parent.server.syncItems;
      this.process(1);
    };
    var next = function() {
      var minval = this.inputs[0][0];
      var maxval = this.inputs[1][0];
      var lag    = this.inputs[2][0];
      var y1 = this._y1;
      var b1 = this._b1;
      if (lag !== this._lag) {
        this._b1  = lag === 0 ? 0 : Math.exp(log001 / (lag * this.rate.sampleRate));
        this._lag = lag;
      }
      var y0 = this._mouse[1] ? maxval : minval;
      this.outs[0][0] = y1 = y0 + b1 * (y1 - y0);
      this._y1 = y1;
    };
    return ctor;
  };
  
  module.exports = {
    install: function() {
      unit.register("MouseX", MouseX);
      unit.register("MouseY", MouseY);
      unit.register("MouseButton", MouseButton);
    }
  };

});
_require("cc/cc", "cc/loader");
})(this.self||global);
