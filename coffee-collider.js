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
    require("./client/installer").install();
  } else if (typeof WorkerLocation !== "undefined") {
    cc.context = "server";
    require("./server/installer").install();
  }
  
  module.exports = {
  };

});
define('cc/cc', function(require, exports, module) {

  function CCObject() {
  }
  
  module.exports = {
    version: "0",
    Object: CCObject
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
  
  var install = function() {
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
  var unpack = require("../common/pack").unpack;

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
    SynthClient.prototype.readAudioFile = function(path, callback) {
      var sys = this.sys;
      if (!sys.api.decodeAudioFile) {
        callback(null);
        return;
      }
      var decode = function(buffer) {
        sys.api.decodeAudioFile(buffer, function(buffer) {
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
  commands["/buffer/request"] = function(msg) {
    var that = this;
    var requestId = msg[2];
    this.readAudioFile(msg[1], function(buffer) {
      that.send(["/buffer/response", buffer, requestId]);
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
      WebAudioAPI.prototype.decodeAudioFile = function(buffer, callback) {
        buffer = this.context.createBuffer(buffer, false);
        var numSamples = buffer.length * buffer.numberOfChannels;
        var samples = new Float32Array(numSamples);
        for (var i = 0, imax = buffer.numberOfChannels; i < imax; ++i) {
          samples.set(buffer.getChannelData(i), i * buffer.length);
        }
        callback({
          sampleRate : buffer.sampleRate,
          numChannels: buffer.numberOfChannels,
          numFrames  : buffer.length,
          samples    : samples,
        });
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

  var timevalue = require("../common/timevalue").calc;

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
  // RETURN
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
          indent += 1;
          break;
        case "OUTDENT":
          indent -= 1;
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
        indent -= 1;
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
          indent += 1;
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

  var replaceTimeValue = function(tokens) {
    var i = tokens.length - 1;
    while (0 <= i) {
      var token = tokens[i];
      if (token[TAG] === "STRING" && token[VALUE].charAt(0) === "\"") {
        var time = timevalue(token[VALUE].substr(1, token[VALUE].length-2));
        if (typeof time === "number") {
          token[TAG] = "NUMBER";
          token[VALUE] = time.toString();
        }
      }
      i -= 1;
    }
    // dumpTokens(tokens);
    return tokens;
  };

  var replacePi = function(tokens) {
    var i = tokens.length - 1;
    while (0 <= i) {
      var a, b, token = tokens[i];
      if (token[VALUE] === "pi") {
        tokens.splice(i, 1);
        token = tokens[i - 1];
        if (token && token[TAG] === "NUMBER") {
          a = i - 1;
          token = tokens[i - 2];
          if (token) {
            switch (token[TAG]) {
              case "UNARY": case "+": case "-":
              a -= 1;
            }
          }
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
    "+": "__plus__", "-": "__minus__"
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
        case "[": case "(": case "{": case ",": case "?": case "+": case "-": case ":":
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
    "+": "__add__", "-": "__sub__", "*": "__mul__", "/": "__div__", "%": "__mod__"
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

  var replaceGlobal = function(tokens) {
    var i = tokens.length - 2;
    while (i >= 0) {
      var token = tokens[i];
      if (token[TAG] === "IDENTIFIER" && token[VALUE].charAt(0) === "$") {
        var name = token[VALUE];
        if (!/\d/.test(name.charAt(1))) {
          name = name.substr(1);
        }
        if (name !== "") {
          token = tokens[i - 1];
          if (!token || token[TAG] !== ".") {
            tokens.splice(i  , 1, ["IDENTIFIER", "global", _]);
            tokens.splice(i+1, 0, ["."         , "."     , _]);
            tokens.splice(i+2, 0, ["IDENTIFIER", name    , _]);
          }
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

  var insertReturn = function(tokens) {
    tokens.splice(0, 0, ["("          , "("     , _]);
    tokens.splice(1, 0, ["PARAM_START", "("     , _]);
    tokens.splice(2, 0, ["IDENTIFIER" , "global", _]);
    tokens.splice(3, 0, ["PARAM_END"  , ")"     , _]);
    tokens.splice(4, 0, ["->"         , "->"    , _]);
    tokens.splice(5, 0, ["INDENT"     , 2       , _]);
    var i = tokens.length - 1;
    tokens.splice(i++, 0, ["OUTDENT"   , 2       , _]);
    tokens.splice(i++, 0, [")"         , ")"     , _]);
    tokens.splice(i++, 0, ["."         , "."     , _]);
    tokens.splice(i++, 0, ["IDENTIFIER", "call"  , _]);
    tokens.splice(i++, 0, ["CALL_START", "("     , _]);
    tokens.splice(i++, 0, ["THIS"      , "this"  , _]);
    tokens.splice(i++, 0, ["."         , "."     , _]);
    tokens.splice(i++, 0, ["IDENTIFIER", "self"  , _]);
    tokens.splice(i++, 0, ["LOGIC"     , "||"    , _]);
    tokens.splice(i++, 0, ["IDENTIFIER", "global", _]);
    tokens.splice(i++, 0, [","         , ","     , _]);
    tokens.splice(i++, 0, ["THIS"      , "this"  , _]);
    tokens.splice(i++, 0, ["."         , "."     , _]);
    tokens.splice(i++, 0, ["IDENTIFIER", "self"  , _]);
    tokens.splice(i++, 0, ["LOGIC"     , "||"    , _]);
    tokens.splice(i++, 0, ["IDENTIFIER", "global", _]);
    tokens.splice(i++, 0, ["CALL_END"  , ")"     , _]);
    // dumpTokens(tokens);
    return tokens;
  };
  
  var Compiler = (function() {
    function Compiler() {
    }
    Compiler.prototype.tokens = function(text) {
      var items = splitCodeAndData(text);
      var code  = items[0];
      var data  = items[1];
      var tokens = CoffeeScript.tokens(code);
      tokens = replaceTimeValue(tokens);
      tokens = replacePi(tokens);
      tokens = replaceUnaryOp(tokens);
      tokens = replacePrecedence(tokens);
      tokens = replaceBinaryOp(tokens);
      tokens = replaceCompoundAssign(tokens);
      tokens = replaceSynthDef(tokens);
      tokens = cleanupParenthesis(tokens);
      tokens = replaceGlobal(tokens);
      tokens = insertReturn(tokens);
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
          return "\n" + tab(indent);
        case "INDENT":
          indent += token[VALUE]|0;
          return "\n" + tab(indent);
        case "OUTDENT":
          indent -= token[VALUE]|0;
          return "\n" + tab(indent);
        case "RETURN":
          return "return ";
        case "UNARY":
          if (token[VALUE].length > 1) {
            return token[VALUE] + " ";
          }
          return token[VALUE];
        case "{":
          return "{";
        case ",": case "RELATION":
          return token[VALUE] + " ";
        case "=":
          return " = ";
        case "COMPOUND_ASSIGN": case "COMPARE": case "MATH": case "+": case "-":
          return " " + token[VALUE] + " ";
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
    replaceTimeValue     : replaceTimeValue,
    replacePi            : replacePi,
    replacePrecedence    : replacePrecedence,
    replaceUnaryOp       : replaceUnaryOp,
    replaceBinaryOp      : replaceBinaryOp,
    replaceCompoundAssign: replaceCompoundAssign,
    replaceSynthDef      : replaceSynthDef,
    replaceGlobal        : replaceGlobal,
    cleanupParenthesis   : cleanupParenthesis,
    insertReturn         : insertReturn,
  };

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
define('cc/server/installer', function(require, exports, module) {
  
  var install = function() {
    require("./object").install();
    require("./server").install();
    require("./bop").install();
    require("./uop").install();
    require("./buffer").install();
    require("./node").install();
    require("./sched").install();
    require("./scale").install();
    require("./ugen/installer").install();
    require("./unit/installer").install();
  };
  
  module.exports = {
    install : install
    };

});
define('cc/server/object', function(require, exports, module) {

  var cc = require("./cc");
  var fn = require("./fn");
  var utils = require("./utils");
  
  var MulAdd;
  
  var setup = function(key, func) {
    [cc.Object, Array, Boolean, Date, Function, Number, String].forEach(function(Klass) {
      fn.definePrototypeProperty(Klass, key, func);
    });
  };

  var install = function() {
    setup("__plus__", function() {
      return +this;
    });
    setup("__minus__", function() {
      return -this;
    });
    setup("__add__", function(b) {
      return this + b;
    });
    setup("__sub__", function(b) {
      return this - b;
    });
    setup("__mul__", function(b) {
      return this * b;
    });
    setup("__div__", function(b) {
      return this / b;
    });
    setup("__mod__", function(b) {
      return this % b;
    });
    setup("__and__", function(b) {
      return this && b;
    });
    setup("__or__", function(b) {
      return this || b;
    });
    setup("next", function() {
      return this;
    });
    setup("to_i", function() {
      return this|0;
    });
    setup("to_f", function() {
      return +this;
    });
    setup("to_s", function() {
      return this.toString();
    });
    setup("to_a", function() {
      return [this];
    });
    
    fn.definePrototypeProperty(String, "__mul__", function(b) {
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
      return this * b;
    });
    
    fn.definePrototypeProperty(Function, "__mul__", function(b) {
      if (typeof b === "function") {
        var f = this, g = b;
        return function() {
          return f.call(null, g.apply(null, arguments));
        };
      }
      return this * b;
    });
    
    fn.definePrototypeProperty(String, "__div__", function(b) {
      if (typeof b === "number") {
        return utils.clump(this.split(""), Math.ceil(this.length/b)).map(function(items) {
          return items.join("");
        });
      } else if (Array.isArray(b)) {
        return b.map(function(b) {
          return this.__div__(b);
        }, this);
      }
      return this / b;
    });
    
    fn.definePrototypeProperty(String, "__mod__", function(b) {
      if (typeof b === "number") {
        return utils.clump(this.split(""), b|0).map(function(items) {
          return items.join("");
        });
      } else if (Array.isArray(b)) {
        return b.map(function(b) {
          return this.__mod__(b);
        }, this);
      }
      return this % b;
    });
    
    fn.definePrototypeProperty(Number, "madd", fn(function(mul, add) {
      return new MulAdd().init(this, mul, add);
    }).defaults("mul=1,add=0").multiCall().build());
    
    fn.definePrototypeProperty(Array, "madd", fn(function(mul, add) {
      return utils.flop([this, mul, add]).map(function(items) {
        var _in = items[0], mul = items[1], add = items[2];
        return new MulAdd().init(_in, mul, add);
      });
    }).defaults("mul=1,add=0").multiCall().build());

    fn.definePrototypeProperty(Array, "to_i", function() {
      return this.map(function(x) {
        return x.to_i();
      });
    });
    fn.definePrototypeProperty(Array, "to_f", function() {
      return this.map(function(x) {
        return x.to_f();
      });
    });
    fn.definePrototypeProperty(Array, "to_s", function() {
      return this.map(function(x) {
        return x.to_s();
      });
    });
    fn.definePrototypeProperty(Array, "to_a", function() {
      return this;
    });
  };
  
  cc.once("basic_ops.js", function(payload) {
    MulAdd = payload.MulAdd;
  });
  
  module.exports = {
    install: install
  };

});
define('cc/server/cc', function(require, exports, module) {

  var _cc = require("../cc");
  var Emitter = require("../common/emitter").Emitter;
  
  Emitter.bind(_cc);
  
  module.exports = _cc;

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
    Emitter.bind = function(obj) {
      ["getListeners", "hasListeners", "on", "once", "off", "emit"].forEach(function(method) {
        if (!obj[method]) {
          obj[method] = Emitter.prototype[method];
        }
      });
      Emitter.call(obj);
      return obj;
    };
    return Emitter;
  })();

  module.exports = {
    Emitter: Emitter
  };

});
define('cc/server/fn', function(require, exports, module) {

  var cc = require("./cc");
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
              return utils.flop(args).map(function(items) {
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
  
  fn.extend = function(child, parent) {
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
  
  fn.sync = function(func) {
    return function() {
      cc.server.timeline.push(this, func, slice.call(arguments));
      return this;
    };
  };

  fn.definePrototypeProperty = function(Klass, key, func) {
    Object.defineProperty(Klass.prototype, key, {
      configurable: true,
      enumerable  : false,
      writable    : true,
      value       : func
    });
  };
  
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
  
  module.exports = {
    isDict : isDict,
    flop   : flop,
    flatten: flatten,
    clump  : clump
  };

});
define('cc/server/server', function(require, exports, module) {

  var cc = require("./cc");
  var Group    = require("./node").Group;
  var Timeline = require("./sched").Timeline;
  var buffer   = require("./buffer");
  var pack = require("../common/pack").pack;
  
  var commands = {};
  var twopi = 2 * Math.PI;
  
  var SynthServer = (function() {
    function SynthServer() {
      this.klassName = "SynthServer";
      this.sysSyncCount = 0;
      this.syncItems = new Float32Array(5);
      this.timeline = new Timeline(this);
      this.timerId = 0;
      this.bufferRequestId = 0;
      this.bufferRequestCallback = {};
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
      buffer.reset();
      this.timeline.reset();
      this.rootNode.prevNode = null;
      this.rootNode.nextNode = null;
      this.rootNode.headNode = null;
      this.rootNode.tailNode = null;
    };
    SynthServer.prototype.getRate = function(rate) {
      return this.rates[rate] || this.rates[1];
    };
    SynthServer.prototype.requestBuffer = function(path, callback) {
      if (!(typeof path === "string" && typeof callback === "function")) {
        return;
      }
      var requestId = this.bufferRequestId++;
      this.bufferRequestCallback[requestId] = callback;
      this.send(["/buffer/request", path, requestId]);
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
        root._process(bufLength);
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
            var args = Array.prototype.slice.call(arguments).map(function(x) {
              return pack(x);
            });
            server.send(["/console/" + method, args]);
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
  var utils = require("./utils");
  var ugen  = require("./ugen/ugen");
  var Unit    = require("./unit/unit").Unit;
  var FixNum  = require("./unit/unit").FixNum;
  var Emitter = require("../common/emitter").Emitter;
  var slice = [].slice;
  
  var graphFunc = {};
  graphFunc[-1] = function(node) {
    var prev;
    if (this instanceof Group) {
      if (this.headNode === null) {
        this.headNode = this.tailNode = node;
      } else {
        prev = this.headNode.prevNode;
        if (prev) {
          prev.nextNode = node;
        }
        node.nextNode = this.headNode;
        this.headNode.prevNode = node;
        this.headNode = node;
      }
      node.parentNode = this;
    }
  };
  graphFunc[-2] = function(node) {
    var next;
    if (this instanceof Group) {
      if (this.tailNode === null) {
        this.headNode = this.tailNode = node;
      } else {
        next = this.tailNode.nextNode;
        if (next) {
          next.prevNode = node;
        }
        node.prevNode = this.tailNode;
        this.tailNode.nextNode = node;
        this.tailNode = node;
      }
      node.parentNode = this;
    }
  };
  graphFunc[-3] = function(node) {
    var prev = this.prevNode;
    this.prevNode = node;
    node.prevNode = prev;
    if (prev) {
      prev.nextNode = node;
    }
    node.nextNode = this;
    if (this.parentNode && this.parentNode.headNode === this) {
      this.parentNode.headNode = node;
    }
    node.parentNode = this.parentNode;
  };
  graphFunc[-4] = function(node) {
    var next = this.nextNode;
    this.nextNode = node;
    node.nextNode = next;
    if (next) {
      next.prevNode = node;
    }
    node.prevNode = this;
    if (this.parentNode && this.parentNode.tailNode === this) {
      this.parentNode.tailNode = node;
    }
    node.parentNode = this.parentNode;
  };
  graphFunc[-5] = function(node) {
    node.nextNode = this.nextNode;
    node.prevNode = this.prevNode;
    node.headNode = this.headNode;
    node.tailNode = this.tailNode;
    node.parentNode = this.parentNode;
    if (this.prevNode) {
      this.prevNode.nextNode = node;
    }
    if (this.nextNode) {
      this.nextNode.prevNode = node;
    }
    if (this.parentNode && this.parentNode.headNode === this) {
      this.parentNode.headNode = node;
    }
    if (this.parentNode && this.parentNode.tailNode === this) {
      this.parentNode.tailNode = node;
    }
  };

  var doneAction = {}; // TODO: correct?
  doneAction[0] = function() {
    // do nothing when the UGen is finished
  };
  doneAction[1] = function() {
    // pause the enclosing synth, but do not free it
    this._running = false;
  };
  doneAction[2] = function() {
    // free the enclosing synth
    free.call(this);
  };
  doneAction[3] = function() {
    // free both this synth and the preceding node
    var prev = this.prevNode;
    if (prev) {
      free.call(prev);
    }
    free.call(this);
  };
  doneAction[4] = function() {
    // free both this synth and the following node
    var next = this.nextNode;
    free.call(this);
    if (next) {
      free.call(next);
    }
  };
  doneAction[5] = function() {
    // free this synth; if the preceding node is a group then do g_freeAll on it, else free it
    var prev = this.prevNode;
    if (prev instanceof Group) {
      g_freeAll(prev);
    } else {
      free.call(prev);
    }
    free.call(this);
  };
  doneAction[6] = function() {
    // free this synth; if the following node is a group then do g_freeAll on it, else free it
    var next = this.nextNode;
    free.call(this);
    if (next) {
      g_freeAll(next);
    } else {
      free.call(next);
    }
  };
  doneAction[7] = function() {
    // free this synth and all preceding nodes in this group
    var next = this.parentNode.headNode;
    if (next) {
      var node = next;
      while (node && node !== this) {
        next = node.nextNode;
        free.call(node);
        node = next;
      }
    }
    free.call(this);
  };
  doneAction[8] = function() {
    // free this synth and all following nodes in this group
    var next = this.nextNode;
    free.call(this);
    if (next) {
      var node = next;
      while (node) {
        next = node.nextNode;
        free.call(node);
        node = next;
      }
    }
  };
  doneAction[9] = function() {
    // free this synth and pause the preceding node
    var prev = this.prevNode;
    free.call(this);
    if (prev) {
      prev._running = false;
    }
  };
  doneAction[10] = function() {
    // free this synth and pause the following node
    var next = this.nextNode;
    free.call(this);
    if (next) {
      next._running = false;
    }
  };
  doneAction[11] = function() {
    // free this synth and if the preceding node is a group then do g_deepFree on it, else free it
    var prev = this.prevNode;
    if (prev instanceof Group) {
      g_deepFree(prev);
    } else {
      free.call(prev);
    }
    free.call(this);
  };
  doneAction[12] = function() {
    // free this synth and if the following node is a group then do g_deepFree on it, else free it
    var next = this.nextNode;
    free.call(this);
    if (next) {
      g_deepFree(next);
    } else {
      free.call(next);
    }
  };
  doneAction[13] = function() {
    // free this synth and all other nodes in this group (before and after)
    var next = this.parentNode.headNode;
    if (next) {
      var node = next;
      while (node) {
        next = node.nextNode;
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
    if (this.prevNode) {
      this.prevNode.nextNode = this.nextNode;
    }
    if (this.nextNode) {
      this.nextNode.prevNode = this.prevNode;
    }
    if (this.parentNode) {
      if (this.parentNode.headNode === this) {
        this.parentNode.headNode = this.nextNode;
      }
      if (this.parentNode.tailNode === this) {
        this.parentNode.tailNode = this.prevNode;
      }
      this.emit("end");
    }
    this.prevNode = null;
    this.nextNode = null;
    this.parentNode = null;
    this.blocking = false;
  };
  var g_freeAll = function(node) {
    var next = node.headNode;
    free.call(node);
    node = next;
    while (node) {
      next = node.nextNode;
      free.call(node);
      node = next;
    }
  };
  var g_deepFree = function(node) {
    var next = node.headNode;
    free.call(node);
    node = next;
    while (node) {
      next = node.nextNode;
      free.call(node);
      if (node instanceof Group) {
        g_deepFree(node);
      }
      node = next;
    }
  };
  
  var Node = (function() {
    function Node() {
      Emitter.bind(this);
      this.klassName = "Node";
      this.nextNode   = null;
      this.prevNode   = null;
      this.parentNode = null;
      this.blocking = true;
      this._running = true;
    }
    fn.extend(Node, cc.Object);
    Node.prototype.play = fn.sync(function() {
      this._running = true;
    });
    Node.prototype.pause = fn.sync(function() {
      this._running = false;
    });
    Node.prototype.stop = fn.sync(function() {
      free.call(this);
    });
    Node.prototype._doneAction = function(action, tag) {
      var func = doneAction[action];
      if (func) {
        this.emit("done", tag);
        func.call(this);
      }
    };
    return Node;
  })();

  var Group = (function() {
    function Group(node, addAction) {
      Node.call(this);
      this.klassName = "Group";
      this.headNode = null;
      this.tailNode = null;
      if (node) {
        var that = this;
        var timeline = cc.server.timeline;
        timeline.push(function() {
          graphFunc[addAction].call(node, that);
        });
      }
    }
    fn.extend(Group, Node);
    
    Group.prototype._process = function(inNumSamples) {
      if (this.headNode && this._running) {
        this.headNode._process(inNumSamples);
      }
      if (this.nextNode) {
        this.nextNode._process(inNumSamples);
      }
    };
    
    return Group;
  })();
  
  var Synth = (function() {
    function Synth(specs, node, args, addAction) {
      Node.call(this);
      this.klassName = "Synth";
      if (specs) {
        build.call(this, specs, args);
      }
      if (node) {
        var that = this;
        var timeline = cc.server.timeline;
        timeline.push(function() {
          graphFunc[addAction].call(node, that);
        });
      }
    }
    fn.extend(Synth, Node);
    
    var build = function(specs, args) {
      this.specs = specs = JSON.parse(specs);

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
        var tag     = unit.specs[5];
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
        unit.init(tag);
        return !!unit.process;
      });
      return this;
    };
    
    Synth.prototype.set = fn.sync(function(args) {
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
    });
    
    Synth.prototype._process = function(inNumSamples) {
      if (this._running) {
        var unitList = this.unitList;
        for (var i = 0, imax = unitList.length; i < imax; ++i) {
          var unit = unitList[i];
          unit.process(unit.rate.bufLength);
        }
      }
      if (this.nextNode) {
        this.nextNode._process(inNumSamples);
      }
    };
    
    return Synth;
  })();
  
  var SynthDef = (function() {
    function SynthDef(func, args) {
      this.klassName = "SynthDef";
      var isVaridArgs = false;
      if (args) {
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
      } else {
        args = { keys:[], vals:[] };
      }
      
      var children = [];
      ugen.setSynthDef(function(ugen) {
        children.push(ugen);
      });
      
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
      var controls = new ugen.Control(1).init(flatten);
      if (!Array.isArray(controls)) {
        controls = [ controls ];
      }
      var saved = controls.slice();
      for (i = 0; i < imax; ++i) {
        if (Array.isArray(args.vals[i])) {
          reshaped.push(saved.splice(0, args.vals[i].length));
        } else {
          reshaped.push(saved.shift());
        }
      }
      
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
        return [ x.klassName, x.rate, x.specialIndex|0, inputs, outputs, x.tag ];
      });
      var specs = {
        consts: consts,
        defs  : defs,
        params: params,
      };
      this.specs = specs;
      return this;
    }
    
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
      } else {
        addAction = "addToHead";
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
      case "addToHead":
        return SynthInterface.head(this, target, args);
      case "addToTail":
        return SynthInterface.tail(this, target, args);
      case "addBefore":
        return SynthInterface.before(this, target, args);
      case "addAfter":
        return SynthInterface.after(this, target, args);
      default:
        return SynthInterface.head(this, target, args);
      }
    }).multiCall().build();

    var topoSort = (function() {
      var _topoSort = function(x, list, checked) {
        checked.push(x);
        var index = list.indexOf(x);
        if (index !== -1) {
          list.splice(index, 1);
        }
        list.unshift(x);
        if (x.inputs) {
          x.inputs.forEach(function(x) {
            _topoSort(x, list, checked);
          });
        }
      };
      return function(list) {
        var checked = [];
        list.forEach(function(x) {
          if (x instanceof ugen.Out) {
            checked.push(x);
            x.inputs.forEach(function(x) {
              _topoSort(x, list, checked);
            });
          }
        });
        list = list.filter(function(x) {
          return checked.indexOf(x) !== -1;
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

  var GroupInterface = function() {
    return new Group();
  };
  GroupInterface.after = function(node) {
    node = node || cc.server.rootNode;
    if (!(node instanceof Node)) {
      throw new TypeError("Group.after: arguments[0] is not a Node.");
    }
    return new Group(node, -4);
  };
  GroupInterface.before = function(node) {
    node = node || cc.server.rootNode;
    if (!(node instanceof Node)) {
      throw new TypeError("Group.before: arguments[0] is not a Node.");
    }
    return new Group(node, -3);
  };
  GroupInterface.head = function(node) {
    node = node || cc.server.rootNode;
    if (!(node instanceof Group)) {
      throw new TypeError("Group.head: arguments[0] is not a Group.");
    }
    return new Group(node, -1);
  };
  GroupInterface.tail = function(node) {
    node = node || cc.server.rootNode;
    if (!(node instanceof Group)) {
      throw new TypeError("Group.tail: arguments[0] is not a Group.");
    }
    return new Group(node, -2);
  };
  GroupInterface.replace = function(node) {
    if (!(node instanceof Node)) {
      throw new TypeError("Group.replace: arguments[0] is not a Node.");
    }
    return new Group(node, -5);
  };
  
  var SynthInterface = function() {
    return new Synth();
  };
  SynthInterface.def = function(func, args) {
    if (typeof func !== "function") {
      throw new TypeError("Synth.def: arguments[0] is not a Function.");
    }
    return new SynthDef(func, args);
  };
  SynthInterface.after = function() {
    var node, def, args;
    if (arguments[0] instanceof SynthDef) {
      node = cc.server.rootNode;
      def  = arguments[0];
      args = arguments[1] || {};
    } else if (arguments[1] instanceof SynthDef) {
      node = arguments[0];
      def  = arguments[1];
      args = arguments[2] || {};
    }
    if (!(node instanceof Node)) {
      throw new TypeError("Synth.after: arguments[0] is not a Node.");
    }
    if (!(def instanceof SynthDef)) {
      throw new TypeError("Synth.after: arguments[1] is not a SynthDef.");
    }
    return new Synth(JSON.stringify(def.specs), node, args||{}, -4);
  };
  SynthInterface.before = function() {
    var node, def, args;
    if (arguments[0] instanceof SynthDef) {
      node = cc.server.rootNode;
      def  = arguments[0];
      args = arguments[1] || {};
    } else if (arguments[1] instanceof SynthDef) {
      node = arguments[0];
      def  = arguments[1];
      args = arguments[2] || {};
    }
    if (!(node instanceof Node)) {
      throw new TypeError("Synth.before: arguments[0] is not a Node.");
    }
    if (!(def instanceof SynthDef)) {
      throw new TypeError("Synth.before: arguments[1] is not a SynthDef.");
    }
    return new Synth(JSON.stringify(def.specs), node, args||{}, -3);
  };
  SynthInterface.head = function() {
    var node, def, args;
    if (arguments[0] instanceof SynthDef) {
      node = cc.server.rootNode;
      def  = arguments[0];
      args = arguments[1] || {};
    } else if (arguments[1] instanceof SynthDef) {
      node = arguments[0];
      def  = arguments[1];
      args = arguments[2] || {};
    }
    if (!(node instanceof Group)) {
      throw new TypeError("Synth.head: arguments[0] is not a Group.");
    }
    if (!(def instanceof SynthDef)) {
      throw new TypeError("Synth.head: arguments[1] is not a SynthDef.");
    }
    return new Synth(JSON.stringify(def.specs), node, args||{}, -1);
  };
  SynthInterface.tail = function() {
    var node, def, args;
    if (arguments[0] instanceof SynthDef) {
      node = cc.server.rootNode;
      def  = arguments[0];
      args = arguments[1] || {};
    } else if (arguments[1] instanceof SynthDef) {
      node = arguments[0];
      def  = arguments[1];
      args = arguments[2] || {};
    }
    if (!(node instanceof Group)) {
      throw new TypeError("Synth.tail: arguments[0] is not a Group.");
    }
    if (!(def instanceof SynthDef)) {
      throw new TypeError("Synth.tail: arguments[1] is not a SynthDef.");
    }
    return new Synth(JSON.stringify(def.specs), node, args||{}, -2);
  };
  SynthInterface.replace = function(node, def, args) {
    if (!(node instanceof Node)) {
      throw new TypeError("Synth.replace: arguments[0] is not a Node.");
    }
    if (!(def instanceof SynthDef)) {
      throw new TypeError("Synth.replace: arguments[1] is not a SynthDef.");
    }
    return new Synth(JSON.stringify(def.specs), node, args||{}, -5);
  };
  
  var install = function() {
    global.Group = GroupInterface;
    global.Synth = SynthInterface;
  };
  
  module.exports = {
    Node : Node,
    Group: Group,
    Synth: Synth,
    install: install,
  };

});
define('cc/server/ugen/ugen', function(require, exports, module) {
  
  var cc = require("../cc");
  var fn = require("../fn");
  var slice = [].slice;

  var UnaryOpUGen;
  var BinaryOpUGen;
  var MulAdd;

  var addToSynthDef = null;
  
  var UGen = (function() {
    function UGen(name, tag) {
      this.klassName = name;
      this.tag  = tag || "";
      this.rate = 2;
      this.signalRange = 2;
      this.specialIndex = 0;
      this.outputIndex  = 0;
      this.numOfInputs  = 0;
      this.numOfOutputs = 1;
      this.inputs = [];
    }
    fn.extend(UGen, cc.Object);
    
    UGen.prototype.init = function(rate) {
      this.rate = rate;
      if (addToSynthDef) {
        addToSynthDef(this);
      }
      this.inputs = slice.call(arguments, 1);
      this.numOfInputs = this.inputs.length;
      return this;
    };
    
    UGen.prototype.madd = fn(function(mul, add) {
      return new MulAdd().init(this, mul, add);
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
      return new MulAdd().init(this, mul, add);
    }).defaults("lo=0,hi=1").multiCall().build();
    
    UGen.prototype.unipolar = fn(function(mul) {
      return this.range(0, mul);
    }).defaults("mul=1").multiCall().build();
    
    UGen.prototype.bipolar = fn(function(mul) {
      return this.range(mul.neg(), mul);
    }).defaults("mul=1").multiCall().build();
    
    return UGen;
  })();
  
  var MultiOutUGen = (function() {
    function MultiOutUGen(name) {
      UGen.call(this, name || "MultiOutUGen");
      this.channels = null;
    }
    fn.extend(MultiOutUGen, UGen);
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
    fn.extend(OutputProxy, UGen);
    return OutputProxy;
  })();
  
  var Control = (function() {
    function Control(rate) {
      MultiOutUGen.call(this, "Control");
      this.rate   = rate;
      this.values = null;
    }
    fn.extend(Control, MultiOutUGen);
    Control.prototype.init = function(list) {
      UGen.prototype.init.apply(this, [this.rate].concat(list));
      this.values = list.slice();
      return this.initOutputs(this.values.length, this.rate);
    };
    return Control;
  })();

  var Out = (function() {
    function Out() {
      UGen.call(this, "Out");
    }
    fn.extend(Out, UGen);
    return Out;
  })();

  var out_ctor = function(rate) {
    return function(bus, channelsArray) {
      if (!(bus instanceof UGen || typeof bus === "number")) {
        throw new TypeError("Out: arguments[0] should be an UGen or a number.");
      }
      this.init.apply(this, [rate, bus].concat(channelsArray));
      return 0; // Out has no output
    };
  };
  
  var iOut = {
    ar: {
      defaults: "bus=0,channelsArray=0",
      ctor: out_ctor(2),
      multiCall: false,
      Klass: Out
    },
    kr: {
      defaults: "bus=0,channelsArray=0",
      ctor: out_ctor(1),
      multiCall: false,
      Klass: Out
    }
  };

  var iIn = {
    ar: {
      defaults: "bus=0,numChannels=1",
      ctor: function(bus, numChannels) {
        this.init.call(this, 2);
        this.inputs = [ bus ];
        return this.initOutputs(numChannels, this.rate);
      },
      Klass: MultiOutUGen
    },
    kr: {
      defaults: "bus=0,numChannels=1",
      ctor: function(bus, numChannels) {
        this.init.call(this, 1);
        this.inputs = [ bus ];
        return this.initOutputs(numChannels, this.rate);
      },
      Klass: MultiOutUGen
    }
  };
  
  var setSynthDef = function(func) {
    addToSynthDef = func;
  };
  
  var install = function() {
    register("Out", iOut);
    register("In" , iIn );
  };
  
  var register = function(name, payload) {
    var klass = global[name] = function() {
      return new UGen(name);
    };
    Object.keys(payload).forEach(function(key) {
      var setting   = payload[key];
      var defaults  = setting.defaults + ",tag";
      var ctor      = setting.ctor;
      var multiCall = setting.multiCall;
      if (multiCall === undefined) {
        multiCall = true;
      }
      var Klass     = setting.Klass || UGen;
      klass[key] = fn(function() {
        var args = slice.call(arguments, 0, arguments.length - 1);
        var tag  = arguments[arguments.length - 1];
        return ctor.apply(new Klass(name, tag), args);
      }).defaults(defaults).multiCall(multiCall).build();
    });
  };

  cc.once("basic_ops.js", function(payload) {
    UnaryOpUGen  = payload.UnaryOpUGen;
    BinaryOpUGen = payload.BinaryOpUGen;
    MulAdd       = payload.MulAdd;
  });
  
  module.exports = {
    UGen: UGen,
    MultiOutUGen: MultiOutUGen,
    OutputProxy : OutputProxy,
    Control     : Control,
    Out         : Out,
    setSynthDef : setSynthDef,
    register: register,
    install: install,
  };

});
define('cc/server/unit/unit', function(require, exports, module) {

  var cc = require("../cc");
    
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
      this.rate = cc.server.getRate(this.calcRate);
      var bufLength = this.rate.bufLength;
      var outs = new Array(this.numOfOutputs);
      for (var i = 0, imax = outs.length; i < imax; ++i) {
        outs[i] = new Float32Array(bufLength);
      }
      this.outs      = outs;
      this.bufLength = bufLength;
      this.done      = false;
    }
    Unit.prototype.init = function(tag) {
      var ctor = units[this.name];
      if (ctor) {
        ctor.call(this);
      } else {
        console.warn(this.name + "'s ctor is not found.");
      }
      this.tag = tag;
      return this;
    };
    Unit.prototype.doneAction = function(action) {
      if (!this.done) {
        this.done = true;
        this.parent._doneAction(action, this.tag);
      }
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
      this._busBuffer = cc.server.busBuffer;
      this._bufLength = cc.server.bufLength;
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

  var In = function() {
    var ctor = function() {
      this._busBuffer = cc.server.busBuffer;
      this._bufLength = cc.server.bufLength;
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
      var outs = this.outs[0];
      var busBuffer = this._busBuffer;
      var bufLength = this._bufLength;
      var offset = (this.inputs[0][0] * bufLength)|0;
      for (var i = 0; i < inNumSamples; ++i) {
        outs[i] = busBuffer[offset + i];
      }
    };
    var next_k = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs  = this.outs[0];
      var value = this._busBuffer[this._busOffset + (this.inputs[0][0]|0)];
      for (var i = 0; i < inNumSamples; ++i) {
        outs[i] = value;
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
    register("In"     , In     );
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

  var cc = require("./cc");
  var fn = require("./fn");
  var Emitter = require("../common/emitter").Emitter;
  var slice = [].slice;

  var Timeline = (function() {
    function Timeline() {
      this.klassName = "Timeline";
      this.reset();
    }
    Timeline.prototype.play = function() {
      this.counterIncr = (cc.server.bufLength / cc.server.sampleRate) * 1000;
    };
    Timeline.prototype.pause = function() {
    };
    Timeline.prototype.reset = function() {
      var globalTask = new GlobalTask(this);
      this._list  = [ globalTask ];
      this._stack = [ globalTask ];
      this._globalTask = globalTask;
    };
    Timeline.prototype.append = function(sched) {
      var index = this._list.indexOf(sched);
      if (index === -1) {
        this._list.push(sched);
      }
    };
    Timeline.prototype.remove = function(sched) {
      var index = this._list.indexOf(sched);
      if (index !== -1) {
        this._list.splice(index, 1);
      }
    };
    Timeline.prototype.push = function(that, func, args) {
      var sched = this._stack[this._stack.length - 1];
      sched._push(that, func, args);
    };
    Timeline.prototype.process = function() {
      var _list = this._list;
      var counterIncr = this.counterIncr;
      for (var i = 0; i < _list.length; ++i) {
        _list[i]._process(counterIncr);
      }
    };
    return Timeline;
  })();

  var Task = (function() {
    function Task(timeline) {
      Emitter.bind(this);
      this.klassName = "Task";
      this.blocking  = true;
      this._timeline = timeline || cc.server.timeline;
      this._context = new TaskContext(this);
      this._queue = [];
      this._bang  = false;
      this._index = 0;
      this._prev  = null;
      this._next  = null;
    }
    fn.extend(Task, cc.Object);
    
    Task.prototype.play = fn.sync(function() {
      var that = this;
      while (that._prev !== null) {
        that = that._prev;
      }
      if (that._timeline) {
        that._timeline.append(that);
      }
      if (that._queue.length === 0) {
        that._bang = true;
      }
    });
    Task.prototype.pause = fn.sync(function() {
      if (this._timeline) {
        this._timeline.remove(this);
      }
      this._bang = false;
    });
    Task.prototype.stop = fn.sync(function() {
      if (this._timeline) {
        this._timeline.remove(this);
      }
      this._bang = false;
      this._timeline = null;
      this.blocking = false;
      this.emit("end");
      if (this._next) {
        this._next._prev = null;
        this._next.play();
        this._next = null;
      }
    });
    Task.prototype["do"] = function(func) {
      var next = TaskInterface["do"](func);
      next._prev = this;
      this._next = next;
      return next;
    };
    Task.prototype.loop = function(func) {
      var next = TaskInterface.loop(func);
      next._prev = this;
      this._next = next;
      return next;
    };
    Task.prototype.each = function(list, func) {
      var next = TaskInterface.each(list, func);
      next._prev = this;
      this._next = next;
      return next;
    };
    Task.prototype.timeout = function(delay, func) {
      var next = TaskInterface.timeout(delay, func);
      next._prev = this;
      this._next = next;
      return next;
    };
    Task.prototype.interval = function(delay, func) {
      var next = TaskInterface.interval(delay, func);
      next._prev = this;
      this._next = next;
      return next;
    };
    
    Task.prototype._push = function(that, func, args) {
      switch (typeof that) {
      case "function":
        this._queue.push([that, null, args]);
        break;
      case "number":
        this._queue.push(that);
        break;
      default:
        this._queue.push([func, that, args]);
        break;
      }
    };
    Task.prototype._done = function() {
    };
    Task.prototype._process = function(counterIncr) {
      var _timeline = this._timeline;
      var _queue   = this._queue;
      var continuance = false;
      do {
        if (this._bang) {
          _timeline._stack.push(this);
          this._execute();
          this._index += 1;
          _timeline._stack.pop();
          this._bang = false;
        }
        var i = 0;
        LOOP:
        while (i < _queue.length) {
          var e = _queue[i];
          switch (typeof e) {
          case "number":
            _queue[i] -= counterIncr;
            if (_queue[i] > 0) {
              break LOOP;
            }
            break;
          case "function":
            e();
            break;
          default:
            if (Array.isArray(e)) {
              e[0].apply(e[1], e[2]);
            } else {
              if (e instanceof TaskWaitToken) {
                e.process(counterIncr);
              }
              if (e.blocking) {
                break LOOP;
              }
            }
          }
          i += 1;
        }
        continuance = false;
        if (i) {
          _queue.splice(0, i);
          if (_queue.length === 0) {
            continuance = this._done();
          }
        }
      } while (continuance);
    };
    return Task;
  })();

  var TaskWaitToken = (function() {
    function TaskWaitToken(time, list, callback) {
      this.time = time;
      this.list = list;
      this.callback = callback;
      this.blocking = true;
    }
    TaskWaitToken.create = function() {
      var args = slice.call(arguments);
      var callback = null;
      if (typeof args[args.length - 1] === "function") {
        callback = args.pop();
      }
      var time = 0;
      var list = [];
      args.forEach(function(x) {
        if (x) {
          if (typeof x === "number") {
            if (time < x) {
              time = x;
            }
          } else if (typeof x.blocking === "boolean") {
            list.push(x);
          }
        }
      });
      return new TaskWaitToken(time, list, callback);
    };
    TaskWaitToken.prototype.process = function(counterIncr) {
      this.time -= counterIncr;
      var blocking = this.list.some(function(x) {
        return x.blocking;
      });
      if (this.time <= 0 && !blocking) {
        this.blocking = false;
        if (this.callback) {
          this.callback();
          delete this.callback;
        }
      }
    };
    return TaskWaitToken;
  })();

  var TaskContext = (function() {
    function TaskContext(task) {
      this.klassName = "TaskContext";
      this.wait = function() {
        task._queue.push(TaskWaitToken.create.apply(null, arguments));
      };
      this.pause = function() {
        task.pause();
      };
      this.stop = function() {
        task.stop();
      };
    }
    return TaskContext;
  })();

  var GlobalTask = (function() {
    function GlobalTask(timeline) {
      Task.call(this, timeline);
      this.klassName = "GlobalTask";
    }
    fn.extend(GlobalTask, Task);
    GlobalTask.prototype.play  = function() {};
    GlobalTask.prototype.pause = function() {};
    GlobalTask.prototype.stop  = function() {};
    return GlobalTask;
  })();

  var TaskDo = (function() {
    function TaskLoop(func) {
      Task.call(this);
      this.func = func;
    }
    fn.extend(TaskLoop, Task);

    TaskLoop.prototype._execute = function() {
      this.func.call(this._context, this._index);
    };
    TaskLoop.prototype._done = function() {
      this.stop();
    };
    
    return TaskLoop;
  })();
  
  var TaskLoop = (function() {
    function TaskLoop(func) {
      TaskDo.call(this, func);
    }
    fn.extend(TaskLoop, TaskDo);

    TaskLoop.prototype._done = function() {
      this._bang = true;
    };
    
    return TaskLoop;
  })();

  var TaskEach = (function() {
    function TaskEach(list, func) {
      Task.call(this);
      this.list = list;
      this.func = func;
    }
    fn.extend(TaskEach, Task);

    TaskEach.prototype._execute = function() {
      if (this._index < this.list.length) {
        this.func.call(this._context, this.list[this._index], this._index);
      }
    };
    TaskEach.prototype._done = function() {
      if (this._index < this.list.length) {
        this._bang = true;
      } else {
        this.stop();
      }
    };
    
    return TaskEach;
  })();

  var TaskTimeout = (function() {
    function TaskTimeout(delay, func) {
      Task.call(this);
      delay = Math.max(0, delay);
      if (isNaN(delay)) {
        delay = 0;
      }
      this.func = func;
      this._queue.push(delay);
    }
    fn.extend(TaskTimeout, Task);
    
    TaskTimeout.prototype._execute = function() {
      this.func.call(this._context, this._index);
    };
    TaskTimeout.prototype._done = function() {
      if (this._index === 0) {
        this._bang = true;
        return true;
      }
      this.stop();
    };
    
    return TaskTimeout;
  })();
  
  var TaskInterval = (function() {
    function TaskInterval(delay, func) {
      TaskTimeout.call(this, delay, func);
    }
    fn.extend(TaskInterval, TaskTimeout);

    TaskInterval.prototype._done = function() {
      this._bang = true;
      return true;
    };
    
    return TaskInterval;
  })();
  
  var TaskBlock = (function() {
    function TaskBlock(count) {
      this.klassName = "TaskBlock";
      if (typeof count !== "number") {
        count = 1;
      }
      this._count = count;
      this.blocking = true;
    }
    TaskBlock.prototype.lock = fn.sync(function(count) {
      if (typeof count !== "number") {
        count = 1;
      }
      this._count += count;
    });
    TaskBlock.prototype.free = fn.sync(function(count) {
      if (typeof count !== "number") {
        count = 1;
      }
      this._count -= count;
      if (this._count <= 0) {
        this.blocking = false;
      }
    });
    return TaskBlock;
  })();
  
  var TaskInterface = function() {
  };
  TaskInterface["do"] = function(func) {
    if (typeof func !== "function") {
      throw new TypeError("Task.do: arguments[0] is not a Function.");
    }
    return new TaskDo(func);
  };
  TaskInterface.loop = function(func) {
    if (typeof func !== "function") {
      throw new TypeError("Task.loop: arguments[0] is not a Function.");
    }
    return new TaskLoop(func);
  };
  TaskInterface.each = function(list, func) {
    if (!(Array.isArray(list))) {
      throw new TypeError("Task.each: arguments[0] is not an Array.");
    }
    if (typeof func !== "function") {
      throw new TypeError("Task.each: arguments[1] is not a Function.");
    }
    return new TaskEach(list, func);
  };
  TaskInterface.timeout = function(delay, func) {
    if (typeof delay !== "number") {
      throw new TypeError("Task.timeout: arguments[0] is not a Number.");
    }
    if (typeof func !== "function") {
      throw new TypeError("Task.timeout: arguments[1] is not a Function.");
    }
    return new TaskTimeout(delay, func);
  };
  TaskInterface.interval = function(delay, func) {
    if (typeof delay !== "number") {
      throw new TypeError("Task.interval: arguments[0] is not a Number.");
    }
    if (typeof func !== "function") {
      throw new TypeError("Task.interval: arguments[1] is not a Function.");
    }
    return new TaskInterval(delay, func);
  };
  TaskInterface.block = function() {
    return new TaskBlock();
  };
  
  var install = function() {
    global.Task = TaskInterface;
    global.wait = function() {
      var globalTask = cc.server.timeline._globalTask;
      globalTask._queue.push(TaskWaitToken.create.apply(null, arguments));
    };
  };
  
  module.exports = {
    Timeline: Timeline,
    GlobalTask: GlobalTask,
    Task      : Task,
    TaskDo    : TaskDo,
    TaskLoop  : TaskLoop,
    TaskEach  : TaskEach,
    TaskTimeout : TaskTimeout,
    TaskInterval: TaskInterval,
    TaskBlock: TaskBlock,
    TaskInterface: TaskInterface,
    install: install
  };

});
define('cc/server/buffer', function(require, exports, module) {

  var cc = require("./cc");
  var fn = require("./fn");
  var Emitter = require("../common/emitter").Emitter;

  var bufferCache = {};
  var bufferStore = {};
  var bufid = 0;

  var Buffer = (function() {
    function Buffer() {
      Emitter.bind(this);
      this.klassName = "Buffer";
      this.samples     = null;
      this.numFrames   = 0;
      this.numChannels = 0;
      this.sampleRate  = 0;
      this.blocking = true;
      this._bufid = bufid++;
      bufferStore[this._bufid] = this;
    }
    fn.extend(Buffer, cc.Object);
    return Buffer;
  })();
  
  var setBuffer = function(buffer, startFrame, numFrames) {
    if (!buffer) {
      throw new Error("Buffer failed to decode an audio file.");
    }
    startFrame = Math.max( 0, Math.min(startFrame|0, buffer.numFrames));
    numFrames  = Math.max(-1, Math.min(numFrames |0, buffer.numFrames - startFrame));
    var samples, x, i, imax;
    if (startFrame === 0) {
      if (numFrames === -1) {
        samples   = buffer.samples;
        numFrames = buffer.numFrames;
      } else {
        samples = new Float32Array(numFrames * buffer.numChannels);
        for (i = 0, imax = buffer.numChannels; i < imax; ++i) {
          x = i * buffer.numFrames;
          samples.set(buffer.samples.subarray(x, x + numFrames));
        }
      }
    } else {
      if (numFrames === -1) {
        numFrames = buffer.numFrames - startFrame;
      }
      samples = new Float32Array(numFrames * buffer.numChannels);
      for (i = 0, imax = buffer.numChannels; i < imax; ++i) {
        x = i * buffer.numFrames + startFrame;
        samples.set(buffer.samples.subarray(x, x + numFrames));
      }
    }
    this.samples    = samples;
    this.numFrames  = numFrames;
    this.numChannels = buffer.numChannels;
    this.sampleRate  = buffer.sampleRate;
    this.blocking = false;
    this.emit("load", this);
  };
  
  var BufferInterface = function() {
  };
  BufferInterface.read = fn(function(path, startFrame, numFrames) {
    if (typeof path !== "string") {
      throw new TypeError("Buffer.Read: arguments[0] should be a string.");
    }
    var buffer = new Buffer();
    if (bufferCache[path]) {
      setBuffer.call(buffer, bufferCache[path], startFrame, numFrames);
    } else {
      cc.server.requestBuffer(path, function(result) {
        bufferCache[path] = result;
        setBuffer.call(buffer, result, startFrame, numFrames);
      });
    }
    return buffer;
  }).defaults("path,startFrame=0,numFrames=-1").multiCall().build();

  var reset = function() {
    bufferCache = {};
  };
  
  var get = function(id) {
    return bufferStore[id];
  };
  
  var install = function() {
    global.Buffer = BufferInterface;
  };
  
  module.exports = {
    Buffer: Buffer,
    reset : reset,
    get   : get,
    install: install
  };

});
define('cc/server/bop', function(require, exports, module) {

  var fn = require("./fn");
  var UGen  = require("./ugen/ugen").UGen;
  var BinaryOpUGen = require("./ugen/basic_ops").BinaryOpUGen;

  var setupNumberFunction = function(func, selector, ugenSelector) {
    return function(b) {
      if (Array.isArray(b)) {
        return b.map(function(b) {
          return this[selector](b);
        }, this);
      } else if (b instanceof UGen) {
        return new BinaryOpUGen().init(ugenSelector, this, b);
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
        return a.map(function(a) {
          return new BinaryOpUGen().init(ugenSelector, a, b);
        });
      }
      return a.map(function(a) {
        return a[selector](b);
      });
    };
  };
  var setupUGenFunction = function(selector) {
    return function(b) {
      return new BinaryOpUGen().init(selector, this, b);
    };
  };

  var setup = function(selector, func, ugenSelector) {
    ugenSelector = ugenSelector || selector;
    fn.definePrototypeProperty(
      Number, selector, setupNumberFunction(func, selector, ugenSelector)
    );
    fn.definePrototypeProperty(
      Array, selector, setupArrayFunction(selector, ugenSelector)
    );
    fn.definePrototypeProperty(
      UGen, selector, setupUGenFunction(ugenSelector)
    );
  };
  
  var install = function() {
    setup("__add__", function(a, b) {
      return a + b;
    }, "+");
    setup("__sub__", function(a, b) {
      return a - b;
    }, "-");
    setup("__mul__", function(a, b) {
      return a * b;
    }, "*");
    setup("__div__", function(a, b) {
      return a / b;
    }, "/");
    setup("__mod__", function(a, b) {
      return a % b;
    }, "%");
  };
  
  module.exports = {
    install: install,
  };

});
define('cc/server/ugen/basic_ops', function(require, exports, module) {

  var cc = require("../cc");
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
      UGen.call(this, "UnaryOpUGen");
    }
    fn.extend(UnaryOpUGen, UGen);

    UnaryOpUGen.prototype.init = function(selector, a) {
      var index = UNARY_OP_UGEN_MAP.indexOf(selector);
      if (index === -1) {
        throw new TypeError("UnaryOpUGen: unknown operator '" + selector + "'");
      }
      var rate = a.rate|0;
      UGen.prototype.init.call(rate);
      this.op = selector;
      this.specialIndex = index;
      this.inputs = [a];
      this.numOfInputs = 1;
      return this;
    };

    return UnaryOpUGen;
  })();

  var BINARY_OP_UGEN_MAP = "+ - * / %".split(" ");

  var BinaryOpUGen = (function() {
    function BinaryOpUGen() {
      UGen.call(this, "BinaryOpUGen");
    }
    fn.extend(BinaryOpUGen, UGen);

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
        } else if (a instanceof BinaryOpUGen) {
          if (a.op === "*") {
            return new MulAdd().init(a.inputs[0], a.inputs[1], b);
          }
        } else if (a instanceof MulAdd) {
          if (typeof a.inputs[2] === "number" && typeof b === "number") {
            if (a.inputs[2] + b === 0) {
              return new BinaryOpUGen().init("*!", a.inputs[0], a.inputs[1]);
            } else {
              a.inputs[2] += b;
              return a;
            }
          }
          b = new BinaryOpUGen().init("+", a.inputs[2], b);
          a = new BinaryOpUGen().init("*!", a.inputs[0], a.inputs[1]);
          return new BinaryOpUGen().init("+", a, b);
        }
        return optimizeSumObjects(a, b);
      }
      if (selector === "+!") {
        selector = "+";
      } else if (selector === "*!") {
        selector = "*";
      }
      
      var index = BINARY_OP_UGEN_MAP.indexOf(selector);
      if (index === -1) {
        throw new TypeError("BinaryOpUGen: unknown operator '" + selector + "'");
      }
      var rate = Math.max(a.rate|0, b.rate|0);
      UGen.prototype.init.call(this, rate);
      this.op = selector;
      this.specialIndex = index;
      this.inputs = [a, b];
      this.numOfInputs = 2;
      return this;
    };

    return BinaryOpUGen;
  })();

  var MulAdd = (function() {
    function MulAdd() {
      UGen.call(this, "MulAdd");
    }
    fn.extend(MulAdd, UGen);

    MulAdd.prototype.init = function(_in, mul, add) {
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
        return new BinaryOpUGen().init("*", _in, -1);
      }
      if (noadd) {
        return new BinaryOpUGen().init("*", _in, mul);
      }
      if (minus) {
        return new BinaryOpUGen().init("-", add, _in);
      }
      if (nomul) {
        return new BinaryOpUGen().init("+", _in, add);
      }
      if (validate(_in, mul, add)) {
        return init.call(this, _in, mul, add);
      }
      if (validate(mul, _in, add)) {
        return init.call(this, mul, _in, add);
      }
      return _in * mul + add;
    };

    var init = function(_in, mul, add) {
      var rate = asRate([_in, mul, add]);
      return UGen.prototype.init.apply(this, [rate, _in, mul, add]);
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
      UGen.call(this, "Sum3");
    }
    fn.extend(Sum3, UGen);
    
    Sum3.prototype.init = function(in0, in1, in2) {
      if (in0 === 0) {
        return new BinaryOpUGen().init("+", in1, in2);
      }
      if (in1 === 0) {
        return new BinaryOpUGen().init("+", in0, in2);
      }
      if (in2 === 0) {
        return new BinaryOpUGen().init("+", in0, in1);
      }
      var rate = asRate([in0, in1, in2]);
      var sortedArgs = [in0, in1, in2].sort(function(a, b) {
        return b.rate - a.rate;
      });
      return UGen.prototype.init.apply(this, [rate].concat(sortedArgs));
    };
    
    return Sum3;
  })();

  var Sum4 = (function() {
    function Sum4() {
      UGen.call(this, "Sum4");
    }
    fn.extend(Sum4, UGen);
    
    Sum4.prototype.init = function(in0, in1, in2, in3) {
      if (in0 === 0) {
        return new Sum3().init(in1, in2, in3);
      }
      if (in1 === 0) {
        return new Sum3().init(in0, in2, in3);
      }
      if (in2 === 0) {
        return new Sum3().init(in0, in1, in3);
      }
      if (in3 === 0) {
        return new Sum3().init(in0, in1, in2);
      }
      var rate = asRate([in0, in1, in2, in3]);
      var sortedArgs = [in0, in1, in2, in3].sort(function(a, b) {
        return b.rate - a.rate;
      });
      return UGen.prototype.init.apply(this, [rate].concat(sortedArgs));
    };
    
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
        case 4: return new Sum4().init(a[0], a[1], a[2], a[3]);
        case 3: return new Sum3().init(a[0], a[1], a[2]);
        case 2: return new BinaryOpUGen().init("+!", a[0], a[1]);
        case 1: return a[0];
        }
      });
      switch (a.length) {
      case 4: return new Sum4().init(a[0], a[1], a[2], a[3]);
      case 3: return new Sum4().init(a[0], a[1], a[2]);
      case 2: return new BinaryOpUGen().init("+!", a[0], a[1]);
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
        return new BinaryOpUGen().init("+!", list[0][0], list[0][1]);
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
          return new BinaryOpUGen().init("*!", a[0], a[1]);
        } else {
          return a[0];
        }
      });
      switch (a.length) {
      case 2:
        return new BinaryOpUGen().init("*!", a[0], a[1]);
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
        return new BinaryOpUGen().init("*!", list[0][0], list[0][1]);
      }
      return work(list);
    };
  })();
  
  var install = function() {
  };

  cc.emit("basic_ops.js", {
    UnaryOpUGen : UnaryOpUGen,
    BinaryOpUGen: BinaryOpUGen,
    MulAdd      : MulAdd,
  });
  
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

  var fn = require("./fn");
  var UGen = require("./ugen/ugen").UGen;
  var UnaryOpUGen = require("./ugen/basic_ops").UnaryOpUGen;
  
  var install = function() {
    fn.definePrototypeProperty(Array, "__plus__", function() {
      return this.map(function(x) {
        return x.__plus__();
      });
    });
    fn.definePrototypeProperty(UGen, "__plus__", function() {
      return new UnaryOpUGen("+", this);
    });
    fn.definePrototypeProperty(Array, "__minus__", function() {
      return this.map(function(x) {
        return x.__minus__();
      });
    });
    fn.definePrototypeProperty(UGen, "__minus__", function() {
      return new UnaryOpUGen("-", this);
    });
  };
  
  module.exports = {
    install: install
  };

});
define('cc/server/scale', function(require, exports, module) {

  var cc = require("./cc");
  var fn = require("./fn");
  
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
    fn.extend(Tuning, cc.Object);
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
    fn.extend(Scale, cc.Object);
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
  
  var install = function() {
    global.Scale  = ScaleInterface;
    global.Tuning = TuningInterface;
  };
  
  module.exports = {
    Scale  : Scale,
    Tuning : Tuning,
    install: install
  };

});
define('cc/server/ugen/installer', function(require, exports, module) {

  var install = function() {
    require("./ugen").install();
    require("./basic_ops").install();
    require("./bufio").install();
    require("./delay").install();
    require("./line").install();
    require("./osc").install();
    require("./pan").install();
    require("./ui").install();
  };
  
  module.exports = {
    install: install
  };
 
});
define('cc/server/ugen/bufio', function(require, exports, module) {

  var ugen = require("./ugen");
  var Buffer = require("../buffer").Buffer;
  var slice = [].slice;
  
  var playBuf_ctor = function(rate) {
    return function(numChannels, buffer) {
      if (typeof numChannels !== "number") {
        throw new TypeError("Buffer: arguments[0] should be an integer.");
      }
      if (!(buffer instanceof Buffer)) {
        throw new TypeError("Buffer: arguments[1] should be a buffer.");
      }
      numChannels = Math.max(0, numChannels|0);
      this.init.apply(this, [rate].concat(slice.call(arguments, 1)));
      this.specialIndex = buffer._bufid;
      if (buffer.samples !== null) {
        numChannels = buffer.numChannels;
      }
      return this.initOutputs(numChannels, this.rate);
    };
  };
  
  var iPlayBuf = {
    ar: {
      defaults: "numChannels=0,buffer,rate=1,trigger=1,startPos=0,loop=0,doneAction=0",
      ctor: playBuf_ctor(2),
      Klass: ugen.MultiOutUGen
    },
    kr: {
      defaults: "numChannels=0,buffer,rate=1,trigger=1,startPos=0,loop=0,doneAction=0",
      ctor: playBuf_ctor(1),
      Klass: ugen.MultiOutUGen
    },
  };

  module.exports = {
    install: function() {
      ugen.register("PlayBuf", iPlayBuf);
    }
  };

});
define('cc/server/ugen/delay', function(require, exports, module) {

  var ugen = require("./ugen");

  var iComb = {
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
  
  module.exports = {
    install: function() {
      ugen.register("CombN", iComb);
      ugen.register("CombL", iComb);
      ugen.register("CombC", iComb);
    }
  };

});
define('cc/server/ugen/line', function(require, exports, module) {
  
  var ugen = require("./ugen");
  
  var iLine = {
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
  
  var install = function() {
    ugen.register("Line", iLine);
  };
  
  module.exports = {
    install: install
  };

});
define('cc/server/ugen/osc', function(require, exports, module) {
  
  var ugen = require("./ugen");
  
  var iSinOsc = {
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
  
  var install = function() {
    ugen.register("SinOsc", iSinOsc);
  };
  
  module.exports = {
    install: install
  };

});
define('cc/server/ugen/pan', function(require, exports, module) {

  var ugen = require("./ugen");
  var OutputProxy = ugen.OutputProxy;

  var pan2_ctor = function(rate) {
    return function(_in, pos, level) {
      this.init.call(this, rate, _in, pos, level);
      this.channels = [
        new OutputProxy(this.rate, this, 0),
        new OutputProxy(this.rate, this, 1),
      ];
      this.numOfOutputs = 2;
      return this.channels;
    };
  };
  
  var iPan2 = {
    ar: {
      defaults: "in=0,pos=0,level=1",
      ctor: pan2_ctor(2),
      Klass: ugen.MultiOutUGen
    },
    kr: {
      defaults: "in=0,pos=0,level=1",
      ctor: pan2_ctor(1),
      Klass: ugen.MultiOutUGen
    },
  };
  
  var install = function() {
    ugen.register("Pan2", iPan2);
  };
  
  module.exports = {
    install: install
  };

});
define('cc/server/ugen/ui', function(require, exports, module) {
  
  var ugen = require("./ugen");
  
  var iMouseXY = {
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
  var iMouseButton = {
    kr: {
      defaults: "minval=0,maxval=1,lag=0.2",
      ctor: function(minval, maxval, lag) {
        return this.init(1, minval, maxval, lag);
      }
    }
  };
  
  var install = function() {
    ugen.register("MouseX", iMouseXY);
    ugen.register("MouseY", iMouseXY);
    ugen.register("MouseButton", iMouseButton);
  };
  
  module.exports = {
    install: install
  };

});
define('cc/server/unit/installer', function(require, exports, module) {

  var install = function() {
    require("./unit").install();
    require("./basic_ops").install();
    require("./bufio").install();
    require("./delay").install();
    require("./line").install();
    require("./osc").install();
    require("./pan").install();
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
define('cc/server/unit/bufio', function(require, exports, module) {
  
  var unit = require("./unit");
  var buffer = require("../buffer");
  
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
  
  var PlayBuf = function() {
    var ctor = function() {
      this._buffer = buffer.get(this.specialIndex);
      this._phase  = this.inputs[3][0];
      this._trig   = 0;
      this.process = next_choose;
      this.process.call(this);
    };
    var next_choose  = function(inNumSamples) {
      if (this._buffer.samples !== null) {
        if (this.inRates[1] === 2) {
          if (this.inRates[2] === 2) {
            this.process = next_kk; // aa
          } else {
            this.process = next_kk; // ak
          }
        } else {
          if (this.inRates[2] === 2) {
            this.process = next_kk; // ka
          } else {
            this.process = next_kk; // kk
          }
        }
        this.process.call(this, inNumSamples);
      }
    };
    var next_kk = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var buf = this._buffer;
      var outs = this.outs;
      var phase = this._phase;
      var rate  = this.inputs[1][0];
      var trig  = this.inputs[2][0];
      var loop  = this.inputs[4][0];
      var samples     = buf.samples;
      var numChannels = buf.numChannels;
      var numFrames   = buf.numFrames;
      var index0, index1, index2, index3, frac, a, b, c, d, offset;

      var hi = numFrames - 1;
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
        for (var j = 0, jmax = outs.length; j < jmax; ++j) {
          offset = numFrames * (j % numChannels);
          a = samples[index0 + offset];
          b = samples[index1 + offset];
          c = samples[index2 + offset];
          d = samples[index3 + offset];
          outs[j][i] = cubicinterp(frac, a, b, c, d);
        }
        phase += rate;
      }
      if (this.done) {
        this.doneAction(this.inputs[5][0]|0, this.tag);
      }
      this._phase = phase;
    };
    return ctor;
  };
  
  module.exports = {
    install: function() {
      unit.register("PlayBuf", PlayBuf);
    }
  };

});
define('cc/server/unit/delay', function(require, exports, module) {

  var unit = require("./unit");
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

  var CombN = function() {
    var ctor = function() {
      this.process = next;
      feedbackdelay_ctor.call(this);
    };
    var next = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
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
            outs[i] = value;
            irdphase++;
            iwrphase++;
          }
        } else {
          next_feedbk  = calcFeedback(delaytime, decaytime);
          feedbk_slope = (next_feedbk - feedbk) * this.rate.slopeFactor;
          for (i = 0; i < inNumSamples; ++i) {
            value = dlybuf[irdphase & mask];
            dlybuf[iwrphase & mask] = inIn[i] + feedbk * value;
            outs[i] = value;
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
          outs[i] = value;
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
  };

  var CombL = function() {
    var ctor = function() {
      this.process = next;
      feedbackdelay_ctor.call(this);
    };
    var next = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn = this.inputs[0];
      var delaytime = this.inputs[2][0];
      var decaytime = this.inputs[3][0];
      var dlybuf   = this._dlybuf;
      var iwrphase = this._iwrphase;
      var dsamp    = this._dsamp;
      var feedbk   = this._feedbk;
      var mask     = this._mask;
      var irdphase, frac, value, d1, d2;
      var next_feedbk, feedbk_slope, next_dsamp, dsamp_slope;
      var i;
      if (delaytime === this._delaytime) {
        irdphase = iwrphase - (dsamp|0);
        frac     = dsamp - (dsamp|0);
        if (decaytime === this._decaytime) {
          for (i = 0; i < inNumSamples; ++i) {
            d1 = dlybuf[(irdphase  )&mask];
            d2 = dlybuf[(irdphase-1)&mask];
            value = d1 + frac * (d2 - d1);
            dlybuf[iwrphase & mask] = inIn[i] + feedbk * value;
            outs[i] = value;
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
            outs[i] = value;
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
          outs[i] = value;
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
  };

  var CombC = function() {
    var ctor = function() {
      this.process = next;
      feedbackdelay_ctor.call(this);
    };
    var next = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn = this.inputs[0];
      var delaytime = this.inputs[2][0];
      var decaytime = this.inputs[3][0];
      var dlybuf   = this._dlybuf;
      var iwrphase = this._iwrphase;
      var dsamp    = this._dsamp;
      var feedbk   = this._feedbk;
      var mask     = this._mask;
      var irdphase, frac, value, d0, d1, d2, d3;
      var next_feedbk, feedbk_slope, next_dsamp, dsamp_slope;
      var i;
      if (delaytime === this._delaytime) {
        irdphase = iwrphase - (dsamp|0);
        frac     = dsamp - (dsamp|0);
        if (decaytime === this._decaytime) {
          for (i = 0; i < inNumSamples; ++i) {
            d0 = dlybuf[(irdphase+1)&mask];
            d1 = dlybuf[(irdphase  )&mask];
            d2 = dlybuf[(irdphase-1)&mask];
            d3 = dlybuf[(irdphase-2)&mask];
            value = cubicinterp(frac, d0, d1, d2, d3);
            dlybuf[iwrphase & mask] = inIn[i] + feedbk * value;
            outs[i] = value;
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
            outs[i] = value;
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
          outs[i] = value;
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
  };
  
  module.exports = {
    install: function() {
      unit.register("CombN", CombN);
      unit.register("CombL", CombL);
      unit.register("CombC", CombC);
    }
  };

});
define('cc/server/unit/line', function(require, exports, module) {

  var unit = require("./unit");
  
  var Line = function() {
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
      this.outs[0][0] = this._level;
    };
    var next = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
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
            outs[i] = endLevel;
          }
        } else {
          nsmps = Math.min(remain, counter);
          counter -= nsmps;
          remain  -= nsmps;
          for (i = 0; i < nsmps; ++i) {
            outs[i] = level;
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
  };
  
  module.exports = {
    install: function() {
      unit.register("Line", Line);
    }
  };

});
define('cc/server/unit/osc', function(require, exports, module) {

  var unit = require("./unit");
  var table = require("./table");
  
  var twopi = 2 * Math.PI;
  var kSineSize = table.kSineSize;
  var kSineMask = table.kSineMask;
  var gSineWavetable = table.gSineWavetable;
  
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

  var unit = require("./unit");
  var table = require("./table");
  var gSine = table.gSine;
  
  var Pan2 = function() {
    var ctor = function() {
      if (this.inRates[1] === 2) {
        this.process = aa;
      } else {
        this.process = ak;
      }
      this._pos   = this.inputs[1][0];
      this._level = this.inputs[2][0];
      var ipos = (1024 * this._pos + 1024 + 0.5)|0;
      ipos = Math.max(0, Math.min(ipos, 2048));
      this._leftAmp  = this._level * gSine[2048 - ipos];
      this._rightAmp = this._level * gSine[ipos];
      aa.call(this, 1);
    };
    var ak = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var leftOut  = this.outs[0];
      var rightOut = this.outs[1];
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
    var aa = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var leftOut  = this.outs[0];
      var rightOut = this.outs[1];
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
  };
  
  module.exports = {
    install: function() {
      unit.register("Pan2", Pan2);
    }
  };

});
define('cc/server/unit/ui', function(require, exports, module) {

  var cc = require("../cc");
  var unit = require("./unit");
  
  var log001 = Math.log(0.001);
  
  var MouseX = function() {
    var ctor = function() {
      this.process = next;
      this._y1  = 0;
      this._b1  = 0;
      this._lag = 0;
      this._mouse = cc.server.syncItems;
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
      this._mouse = cc.server.syncItems;
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
      this._mouse = cc.server.syncItems;
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
