define(function(require, exports, module) {
  "use strict";
  
  var NativeTimer = (function() {
    function NativeTimer() {
      this.timerId = 0;
      this.isRunning = false;
    }
    NativeTimer.prototype.start = function(callback, interval) {
      if (this.timerId) {
        clearInterval(this.timerId);
      }
      this.timerId = setInterval(callback, interval);
      this.isRunning = true;
    };
    NativeTimer.prototype.stop = function() {
      if (this.timerId) {
        clearInterval(this.timerId);
      }
      this.isRunning = false;
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
      this.worker = new Worker(worker_path);
      this.isRunning = false;
    }
    WorkerTimer.prototype.start = function(callback, interval) {
      this.worker.onmessage = callback;
      this.worker.postMessage(interval);
      this.isRunning = true;
    };
    WorkerTimer.prototype.stop = function() {
      this.worker.postMessage(0);
      this.worker.onmessage = null;
      this.isRunning = false;
    };
    
    return WorkerTimer;
  })();

  var setIntervalCache = [];
  var setTimeoutCache  = [];
  var _setInterval = setInterval;
  var _setTimeout  = setTimeout;
  var _clearInterval = clearInterval;
  var _clearTimeout  = clearTimeout;
  
  var init = function() {
    global.setInterval = function(func, delay) {
      var id = _setInterval(func, delay);
      setIntervalCache.push(id);
      return id;
    };
    global.clearInterval = function(id) {
      _clearInterval(id);
      var index = setIntervalCache.indexOf(id);
      if (index !== -1) {
        setIntervalCache.splice(index, 1);
      }
    };
    global.setTimeout = function(func, delay) {
      var id = _setTimeout(func, delay);
      setTimeoutCache.push(id);
      return id;
    };
    global.clearTimeout = function(id) {
      _clearTimeout(id);
      var index = setTimeoutCache.indexOf(id);
      if (index !== -1) {
        setTimeoutCache.splice(index, 1);
      }
    };
  };
  
  var reset = function() {
    setIntervalCache.splice(0).forEach(function(id) {
      clearInterval(id);
    });
    setTimeoutCache.splice(0).forEach(function(id) {
      clearTimeout(id);
    });
  };
  
  module.exports = {
    Timer: WorkerTimer || NativeTimer,
    init : init,
    reset: reset
  };

});
