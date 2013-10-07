define(function(require, exports, module) {
  "use strict";

  var cc = require("cc/cc");

  var commands = {};
  
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
      this._execId = 0;
      this._execCallbacks = {};
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
    CoffeeCollider.prototype.exec = function(code, callback) {
      if (typeof code === "string") {
        this.cclang.postMessage(["/exec", this._execId, code], "*");
        if (typeof callback === "function") {
          this._execCallbacks[this._execId] = callback;
        }
        this._execId += 1;
      }
      return this;
    };
    CoffeeCollider.prototype._recv = function(msg) {
      if (!msg) {
        return;
      }
      var func = commands[msg[0]];
      if (func) {
        func.call(this, msg);
      }
    };
    return CoffeeCollider;
  })();

  commands["/connect"] = function() {
    this.isConnected = true;
  };
  commands["/exec"] = function(msg) {
    var execId = msg[1];
    var result = msg[2];
    var callback = this._execCallbacks[execId];
    if (callback) {
      if (result !== undefined) {
        result = JSON.parse(result);
      }
      callback(result);
      delete this._execCallbacks[execId];
    }
  };
  
  module.exports = {
    CoffeeCollider: CoffeeCollider
  };

});
