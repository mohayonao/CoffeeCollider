define(function(require, exports, module) {
  "use strict";

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
    NativeTimer.prototype.isRunning = function() {
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

});
