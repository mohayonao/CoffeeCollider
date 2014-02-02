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
  
  cc.createTimer = function() {
    return new NativeTimer();
  };
  
  module.exports = {
    NativeTimer: NativeTimer
  };

});
