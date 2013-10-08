(function(global) {
"use strict";
var _define = function(module, deps, payload) {
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
define('cc/loader', ['require', 'exports', 'module' , 'cc/cc', 'cc/front/coffee-collider', 'cc/lang/installer', 'cc/synth/synth-server'], function(require, exports, module) {
  "use strict";

  var cc = require("./cc");

  if (typeof document !== "undefined") {
    var scripts = document.getElementsByTagName("script");
    var langMode = false;
    if (scripts && scripts.length) {
      var m;
      for (var i = 0; i < scripts.length; i++) {
        if (!cc.coffeeColliderPath) {
          m = /^(.*\/coffee-collider(?:-min)?\.js)(#lang)?/.exec(scripts[i].src);
          if (m) {
            cc.coffeeColliderPath = m[1];
            if (m[2] === "#lang") {
              langMode = true;
            }
            break;
          }
        }
      }
    }

    if (!langMode) {
      cc.context = "window";
      global.CoffeeCollider = require("./front/coffee-collider").CoffeeCollider;
    } else {
      cc.context = "server";
      require("./lang/installer").install();
    }
  } else if (typeof WorkerLocation !== "undefined") {
    cc.context = "synth";
    require("./synth/synth-server");
  }
  
  module.exports = {
  };

});
define('cc/cc', ['require', 'exports', 'module' ], function(require, exports, module) {
  "use strict";

  module.exports = {};

});
define('cc/front/coffee-collider', ['require', 'exports', 'module' , 'cc/cc', 'cc/front/audio-context', 'cc/front/compiler'], function(require, exports, module) {
  "use strict";

  var cc = require("cc/cc");
  var AudioContext = require("./audio-context").AudioContext;
  var Compiler = require("./compiler").Compiler;

  var commands = {};
  
  var CoffeeColliderImpl = (function() {
    var context = null;
    function CoffeeColliderImpl() {
      var that = this;
      var iframe = document.createElement("iframe");
      iframe.style.width  = 0;
      iframe.style.height = 0;
      iframe.style.border = 0;
      iframe.sandbox = "allow-scripts allow-same-origin";
      document.body.appendChild(iframe);

      var script = document.createElement("script");
      var src = cc.coffeeColliderPath;
      script.src = src + "#lang";
      script.onload = function() {
        window.addEventListener("message", function(e) {
          var msg = e.data;
          if (msg instanceof Float32Array) {
            that.strmList[that.strmListWriteIndex] = msg;
            that.strmListWriteIndex = (that.strmListWriteIndex + 1) & 7;
          } else {
            that.recv(e.data);
          }
        });
      };
      iframe.contentDocument.body.appendChild(script);

      this.iframe = iframe;
      this.cclang = iframe.contentWindow;
      this.isConnected = false;
      this.execId = 0;
      this.execCallbacks = {};

      if (!context) {
        context = new AudioContext();
      }
      this.context = context;
      this.context.append(this);

      this.sampleRate = this.context.sampleRate;
      this.channels   = this.context.channels;
      this.strmLength = this.context.strmLength;
      this.bufLength  = this.context.bufLength;
      
      this.isPlaying = false;
      this.strm = new Float32Array(this.strmLength * this.channels);
      this.strmList = new Array(8);
      this.strmListReadIndex  = 0;
      this.strmListWriteIndex = 0;
    }
    CoffeeColliderImpl.prototype.destroy = function() {
      this.context.remove(this);
      document.body.removeChild(this.iframe);
    };
    CoffeeColliderImpl.prototype.play = function() {
      if (!this.isPlaying) {
        this.isPlaying = true;
        this.context.play();
        this.sendToLang(["/play"]);
      }
    };
    CoffeeColliderImpl.prototype.reset = function() {
    };
    CoffeeColliderImpl.prototype.pause = function() {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.context.pause();
        this.sendToLang(["/pause"]);
      }
    };
    CoffeeColliderImpl.prototype.process = function() {
      var strm = this.strmList[this.strmListReadIndex];
      if (strm) {
        this.strmListReadIndex = (this.strmListReadIndex + 1) & 7;
        this.strm.set(strm);
      }
    };
    CoffeeColliderImpl.prototype.exec = function(code, callback) {
      if (typeof code === "string") {
        code = new Compiler().compile(code.trim());
        this.sendToLang(["/exec", this.execId, code]);
        if (typeof callback === "function") {
          this.execCallbacks[this.execId] = callback;
        }
        this.execId += 1;
      }
    };
    CoffeeColliderImpl.prototype.loadJavaScript = function(path, callback) {
      var script = document.createElement("script");
      script.src = path;
      if (typeof callback === "function") {
        script.onload = function() {
          callback();
        };
      }
      this.iframe.contentDocument.body.appendChild(script);
    };
    CoffeeColliderImpl.prototype.sendToLang = function(msg) {
      this.cclang.postMessage(msg, "*");
    };
    CoffeeColliderImpl.prototype.recv = function(msg) {
      if (!msg) {
        return;
      }
      var func = commands[msg[0]];
      if (func) {
        func.call(this, msg);
      }
    };
    CoffeeColliderImpl.prototype.sync = function(syncItems) {
      this.sendToLang(syncItems);
    };
    return CoffeeColliderImpl;
  })();

  commands["/connect"] = function() {
    this.isConnected = true;
    this.sendToLang([
      "/init", this.sampleRate, this.channels, this.strmLength, this.bufLength, this.context.syncCount
    ]);
  };
  commands["/exec"] = function(msg) {
    var execId = msg[1];
    var result = msg[2];
    var callback = this.execCallbacks[execId];
    if (callback) {
      if (result !== undefined) {
        result = JSON.parse(result);
      }
      callback(result);
      delete this.execCallbacks[execId];
    }
  };

  var CoffeeCollider = (function() {
    function CoffeeCollider() {
      this.impl = new CoffeeColliderImpl();
      this.sampleRate = this.impl.sampleRate;
      this.channels   = this.impl.channels;
    }
    CoffeeCollider.prototype.destroy = function() {
      if (this.impl) {
        this.impl.destroy();
        delete this.impl;
        delete this.sampleRate;
        delete this.channels;
      }
      return this;
    };
    CoffeeCollider.prototype.play = function() {
      if (this.impl) {
        this.impl.play();
      }
      return this;
    };
    CoffeeCollider.prototype.reset = function() {
      if (this.impl) {
        this.impl.reset();
      }
      return this;
    };
    CoffeeCollider.prototype.pause = function() {
      if (this.impl) {
        this.impl.pause();
      }
      return this;
    };
    CoffeeCollider.prototype.exec = function(code, callback) {
      if (this.impl) {
        this.impl.exec(code, callback);
      }
      return this;
    };
    CoffeeCollider.prototype.getStream = function() {
      if (this.impl) {
        return this.impl.strm;
      }
    };
    CoffeeCollider.prototype.loadJavaScript = function(path, callback) {
      if (this.impl) {
        this.impl.loadJavaScript(path, callback);
      }
      return this;
    };
    return CoffeeCollider;
  })();
  
  module.exports = {
    CoffeeCollider: CoffeeCollider
  };

});
define('cc/front/audio-context', ['require', 'exports', 'module' , 'cc/front/web-audio-api'], function(require, exports, module) {
  "use strict";

  var AudioContext = (function() {
    function AudioContext() {
      var SoundAPI    = getAPI();
      this.sampleRate = 44100;
      this.channels   = 2;
      if (SoundAPI) {
        this.driver = new SoundAPI(this);
        this.sampleRate = this.driver.sampleRate;
        this.channels   = this.driver.channels;
      }
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
    AudioContext.prototype.append = function(cc) {
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
    AudioContext.prototype.remove = function(cc) {
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
    AudioContext.prototype.play = function() {
      if (!this.isPlaying) {
        this.isPlaying = true;
        this.syncCount = 0;
        this.driver.play();
      }
    };
    AudioContext.prototype.pause = function() {
      if (this.isPlaying) {
        var flag = this.colliders.every(function(cc) {
          return !cc.isPlaying;
        });
        if (flag) {
          this.isPlaying = false;
          this.driver.pause();
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
    
    return AudioContext;
  })();

  var getAPI = function() {
    return require("./web-audio-api").getAPI();
  };

  module.exports = {
    AudioContext: AudioContext
  };

});
define('cc/front/web-audio-api', ['require', 'exports', 'module' ], function(require, exports, module) {
  "use strict";

  var klass;
  module.exports = {
    getAPI: function() {
      return klass;
    }
  };

  var AudioContext = global.AudioContext || global.webkitAudioContext;
  if (!AudioContext) {
    return;
  }

  function WebAudioAPI(sys) {
    this.sys = sys;
    this.context = new AudioContext();
    this.sampleRate = this.context.sampleRate;
    this.channels   = sys.channels;
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

  klass = WebAudioAPI;

});
define('cc/front/compiler', ['require', 'exports', 'module' , 'cc/lang/bop'], function(require, exports, module) {
  "use strict";

  var bop = require("../lang/bop");

  var CoffeeScript = (function() {
    if (global.CoffeeScript) {
      return global.CoffeeScript;
    }
    try {
      return require(["coffee-script"][0]);
    } catch(e) {}
  })();

  var Compiler = (function() {
    var TAG = 0, VALUE = 1, _ = {};
    function Compiler() {
    }
    Compiler.prototype.compile = function(code) {
      var tokens = CoffeeScript.tokens(code);
      tokens = this.doPI(tokens);
      tokens = this.doBOP(tokens);
      return CoffeeScript.nodes(tokens).compile({bare:true}).trim();
    };
    Compiler.prototype.doPI = function(tokens) {
      var i, token, prev = [];
      i = 0;
      while (i < tokens.length) {
        token = tokens[i];
        if (token[VALUE] === "pi") {
          tokens.splice(i, 1);
          if (prev[TAG] === "NUMBER") {
            tokens.splice(i++, 0, ["MATH", "*", _]);
          }
          tokens.splice(i++, 0, ["IDENTIFIER", "Math", _]);
          tokens.splice(i++, 0, ["."         , "."   , _]);
          tokens.splice(i  , 0, ["IDENTIFIER", "PI"  , _]);
        }
        prev = tokens[i++];
      }
      return tokens;
    };
    Compiler.prototype.doBOP = (function() {
      var CALL = 0, BRACKET = 1;
      var REPLACE = bop.replaceTable;
      var peek = function(list) {
        return list[list.length - 1];
      };
      var pop = function(list) {
        list.pop();
        return list[list.length - 1];
      };
      var push = function(list, item) {
        list.push(item);
        return list[list.length - 1];
      };
      var beginCall = function(dst, sel) {
        dst.push(["."         , ".", _]);
        dst.push(["IDENTIFIER", sel, _]);
        dst.push(["CALL_START", "(", _]);
      };
      var closeCall = function(dst) {
        dst.push(["CALL_END", ")", _]);
      };
      return function(tokens) {
        var dstTokens = [], bracketStack = [];
        var bracket, token, replaceable = false;
        while ((token = tokens.shift())) {
          if (replaceable && REPLACE[token[VALUE]]) {
            beginCall(dstTokens, REPLACE[token[VALUE]]);
            bracket = { type:CALL };
            push(bracketStack, bracket);
            replaceable = false;
            continue;
          }
          replaceable = true;
          bracket = peek(bracketStack);
          switch (token[TAG]) {
          case ",": case "TERMINATOR": case "INDENT": case "OUTDENT":
            while (bracket && bracket.type === CALL) {
              closeCall(dstTokens);
              bracket = pop(bracketStack);
            }
            replaceable = false;
            break;
          case "CALL_START": case "(": case "[": case "{":
            push(bracketStack, {type:BRACKET});
            replaceable = false;
            break;
          case "}": case "]": case ")": case "CALL_END":
            while (bracket && bracket.type === CALL) {
              closeCall(dstTokens);
              bracket = pop(bracketStack);
            }
            if (bracket && bracket.type === BRACKET) {
              dstTokens.push(token);
              bracket = pop(bracketStack);
            }
            while (bracket && bracket.type === CALL) {
              closeCall(dstTokens, bracket);
              bracket = pop(bracketStack);
            }
            continue;
          }
          dstTokens.push(token);
        }
        return dstTokens;
      };
    })();
    return Compiler;
  })();

  module.exports = {
    Compiler: Compiler
  };

});
define('cc/lang/bop', ['require', 'exports', 'module' ], function(require, exports, module) {
  "use strict";

  var install = function() {
    var scalarFunc = function(selector, func) {
      return function(b) {
        if (Array.isArray(b)) {
          return b.map(function(b) {
            return this[selector](b);
          }, this);
        }
        return func(this, b);
      };
    };
    var arrayFunc = function(selector) {
      return function(b) {
        var a = this;
        if (Array.isArray(b)) {
          return b.map(function(b, index) {
            return a[index % a.length][selector](b);
          });
        }
        return a.map(function(a) {
          return a[selector](b);
        });
      };
    };
    
    Number.prototype.__add__ = scalarFunc("__add__", function(a, b) {
      return a + b;
    });
    Number.prototype.__sub__ = scalarFunc("__sub__", function(a, b) {
      return a - b;
    });
    Number.prototype.__mul__ = scalarFunc("__mul__", function(a, b) {
      return a * b;
    });
    Number.prototype.__div__ = scalarFunc("__div__", function(a, b) {
      return a / b;
    });
    Number.prototype.__mod__ = scalarFunc("__mod__", function(a, b) {
      return a % b;
    });
    Array.prototype.__add__ = arrayFunc("__add__");
    Array.prototype.__sub__ = arrayFunc("__sub__");
    Array.prototype.__mul__ = arrayFunc("__mul__");
    Array.prototype.__div__ = arrayFunc("__div__");
    Array.prototype.__mod__ = arrayFunc("__mod__");
    
    String.prototype.__add__ = scalarFunc("__add__", function(a, b) {
      return a + b;
    });
    String.prototype.__mul__ = scalarFunc("__mul__", function(a, b) {
      if (typeof b === "number") {
        var list = new Array(b);
        for (var i = 0; i < b; i++) {
          list[i] = a;
        }
        return list.join("");
      }
      return a;
    });
  };

  var replaceTable = {
    "+": "__add__",
    "-": "__sub__",
    "*": "__mul__",
    "/": "__div__",
    "%": "__mod__",
  };
  
  module.exports = {
    install: install,
    replaceTable: replaceTable
  };

});
define('cc/lang/installer', ['require', 'exports', 'module' , 'cc/lang/lang-server', 'cc/lang/bop'], function(require, exports, module) {
  "use strict";

  var install = function() {
    require("./lang-server").install();
    require("./bop").install();
  };

  module.exports = {
    install: install
  };

});
define('cc/lang/lang-server', ['require', 'exports', 'module' , 'cc/cc'], function(require, exports, module) {
  "use strict";

  var cc = require("cc/cc");

  var commands = {};
  
  var LangServer = (function() {
    function LangServer() {
      var that = this;
      this.worker = new Worker(cc.coffeeColliderPath);
      this.worker.addEventListener("message", function(e) {
        var msg = e.data;
        if (msg instanceof Float32Array) {
          that.sendToCC(msg);
        } else {
          that.recv(msg);
        }
      });
    }
    LangServer.prototype.sendToCC = function(msg) {
      window.parent.postMessage(msg, "*");
    };
    LangServer.prototype.sendToSynth = function(msg) {
      this.worker.postMessage(msg);
    };
    LangServer.prototype.recv = function(msg) {
      if (!msg) {
        return;
      }
      var func = commands[msg[0]];
      if (func) {
        func.call(this, msg);
      }
    };
    return LangServer;
  })();

  commands["/init"] = function(msg) {
    this.sendToSynth(msg);
  };
  commands["/play"] = function(msg) {
    this.sendToSynth(msg);
  };
  commands["/pause"] = function(msg) {
    this.sendToSynth(msg);
  };
  commands["/console/log"] = function(msg) {
    console.log.apply(console, msg[1]);
  };
  commands["/console/debug"] = function(msg) {
    console.debug.apply(console, msg[1]);
  };
  commands["/console/info"] = function(msg) {
    console.info.apply(console, msg[1]);
  };
  commands["/console/error"] = function(msg) {
    console.error.apply(console, msg[1]);
  };
  commands["/exec"] = function(msg) {
    var execId = msg[1];
    var code   = msg[2];
    var result = eval.call(global, code);
    this.sendToCC(["/exec", execId, JSON.stringify(result)]);
  };

  var install = function() {
    var server = new LangServer();
    window.addEventListener("message", function(e) {
      var msg = e.data;
      if (msg instanceof Float32Array) {
        server.sendToSynth(msg);
      } else {
        server.recv(msg);
      }
    });
    server.sendToCC(["/connect"]);
  };

  module.exports = {
    LangServer: LangServer,
    install: install
  };

});
define('cc/synth/synth-server', ['require', 'exports', 'module' ], function(require, exports, module) {
  "use strict";

  var commands = {};
  
  var SynthServer = (function() {
    function SynthServer() {
      this.sysSyncCount   = 0;
      this.sysCurrentTime = 0;
      this.syncItems = new Float32Array(6);
      this.onaudioprocess = this.onaudioprocess.bind(this);
      this.timerId = 0;
    }
    SynthServer.prototype.sendToLang = function(msg) {
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
    SynthServer.prototype.onaudioprocess = function() {
      if (this.syncCount - this.sysSyncCount >= 4) {
        return;
      }
      var strm = this.strm;
      for (var i = 0; i < strm.length; i++) {
        strm[i] = Math.random() * 0.5 - 0.25;
      }
      this.syncCount += 1;
      this.sendToLang(strm);
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
  };
  commands["/play"] = function() {
    if (this.timerId === 0) {
      this.timerId = setInterval(this.onaudioprocess, 10);
    }
  };
  commands["/pause"] = function() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = 0;
    }
  };
  
  var server = new SynthServer();
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

  global.console = (function() {
    var console = {};
    ["log", "debug", "info", "error"].forEach(function(method) {
      console[method] = function() {
        server.sendToLang(["/console/" + method, Array.prototype.slice.call(arguments)]);
      };
    });
    return console;
  })();
  
  module.exports = {
    SynthServer: SynthServer
  };

});
_require("cc/cc", "cc/loader");
})(this.self||global);
