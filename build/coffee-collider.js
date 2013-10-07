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
define('cc/loader', ['require', 'exports', 'module' , 'cc/cc', 'cc/front/coffee-collider', 'cc/lang/server'], function(require, exports, module) {
  "use strict";

  var cc = require("cc/cc");

  if (typeof document !== "undefined") {
    var scripts = document.getElementsByTagName("script");
    if (scripts && scripts.length) {
      var m;
      for (var i = 0; i < scripts.length; i++) {
        m = /^(.*\/coffee-script\.js)/.exec(scripts[i].src);
        if (m) {
          cc.coffeeScriptPath = m[1];
        } else {
          m = /^(.*\/coffee-collider(?:-min)?\.js)(#lang)?/.exec(scripts[i].src);
          if (m) {
            cc.coffeeColliderPath = m[1];
            if (m[2] === "#lang") {
              cc.isLangMode = true;
            }
          }
        }
      }
    }

    if (!cc.isLangMode) {
      global.CoffeeCollider = require("cc/front/coffee-collider").CoffeeCollider;
    } else {
      require("cc/lang/server");
    }
  }
  
  module.exports = {
  };

});
define('cc/cc', ['require', 'exports', 'module' ], function(require, exports, module) {
  "use strict";

  module.exports = {};

});
define('cc/front/coffee-collider', ['require', 'exports', 'module' , 'cc/cc'], function(require, exports, module) {
  "use strict";

  var cc = require("cc/cc");
  
  var CoffeeCollider = (function() {
    function CoffeeCollider() {
      var that = this;
      var iframe = document.createElement("iframe");
      iframe.style.width  = 0;
      iframe.style.height = 0;
      iframe.style.border = 0;
      iframe.sandbox = "allow-scripts allow-same-origin";
      document.body.appendChild(iframe);

      var script = document.createElement("script");
      var src = cc.coffeeScriptPath;
      script.src = src;
      script.onload = function() {
        var script = document.createElement("script");
        var src = cc.coffeeColliderPath;
        script.src = src + "#lang";
        script.onload = function() {
          window.addEventListener("message", function(e) {
            that._recv(e.data);
          });
        };
        iframe.contentDocument.body.appendChild(script);
      };
      iframe.contentDocument.body.appendChild(script);

      this.cclang = iframe.contentWindow;
      this.isConnected = false;
    }
    CoffeeCollider.prototype.play = function() {
      return this;
    };
    CoffeeCollider.prototype.reset = function() {
      return this;
    };
    CoffeeCollider.prototype.pause = function() {
      return this;
    };
    CoffeeCollider.prototype.send = function(msg, callback) {
      this.cclang.postMessage(msg, "*");
      if (typeof callback === "function") {
        callback(/* result */);
      }
      return this;
    };
    CoffeeCollider.prototype._recv = function(msg) {
      if (msg === "/connect") {
        this.isConnected = true;
      } else {
        console.log(msg);
      }
    };
    return CoffeeCollider;
  })();
  
  module.exports = {
    CoffeeCollider: CoffeeCollider
  };

});
define('cc/lang/server', ['require', 'exports', 'module' , 'cc/lang/compiler'], function(require, exports, module) {
  "use strict";

  var Compiler = require("cc/lang/compiler").Compiler;

  var Server = (function() {
    function Server() {
      this.commands = {};
    }
    Server.prototype.send = function(msg) {
      window.parent.postMessage(msg, "*");
    };
    Server.prototype.recv = function(msg) {
      if (!msg) {
        return;
      }
      var func = this.commands[msg[0]];
      if (func) {
        func.call(this, msg);
      } else if (typeof msg === "string") {
        var code = new Compiler().compile(msg);
        var result = eval.call(global, code);
        console.log(result);
      }
    };
    return Server;
  })();

  var server = new Server();
  window.addEventListener("message", function(e) {
    server.recv(e.data);
  });
  server.send("/connect");

  module.exports = {
    Server: Server
  };

});
define('cc/lang/compiler', ['require', 'exports', 'module' ], function(require, exports, module) {
  "use strict";

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
      this.doPI(tokens);
      return CoffeeScript.nodes(tokens).compile({bare:true});
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
    return Compiler;
  })();

  module.exports = {
    Compiler: Compiler
  };

});
_require("cc/cc", "cc/loader");
})(this.self||global);
