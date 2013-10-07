define(function(require, exports, module) {
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
    CoffeeCollider.prototype.send = function(msg) {
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
