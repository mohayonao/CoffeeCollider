define(function(require, exports, module) {
  "use strict";
  
  var Timer = (function() {
    function Timer() {
      this.timerId = 0;
      this.isRunning = false;
    }
    Timer.prototype.start = function(callback, interval) {
      if (this.timerId) {
        clearInterval(this.timerId);
      }
      this.timerId = setInterval(callback, interval);
      this.isRunning = true;
    };
    Timer.prototype.stop = function() {
      if (this.timerId) {
        clearInterval(this.timerId);
      }
      this.isRunning = false;
    };
    return Timer;
  })();
  
  module.exports = {
    Timer: Timer
  };

});
