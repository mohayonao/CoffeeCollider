define(function(require, exports, module) {
  "use strict";
  
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
    NativeTimer: NativeTimer,
  };

});
