define(function(require, exports, module) {
  "use strict";

  var cc = require("cc/cc");
  var AudioContext = require("./audio-context").AudioContext;

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
      var src = cc.coffeeScriptPath;
      script.src = src;
      script.onload = function() {
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
