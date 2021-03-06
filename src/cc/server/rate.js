define(function(require, exports, module) {
  "use strict";
  
  var cc = require("./cc");
  
  var Rate = (function() {
    var twopi = 2 * Math.PI;
    function Rate(sampleRate, bufLength) {
      this.sampleRate = sampleRate;
      this.sampleDur  = 1 / sampleRate;
      this.radiansPerSample = twopi / sampleRate;
      this.bufLength   = bufLength;
      this.bufDuration = bufLength / sampleRate;
      this.bufRate = 1 / this.bufDuration;
      this.slopeFactor = 1 / bufLength;
      this.filterLoops  = (bufLength / 3)|0;
      this.filterRemain = (bufLength % 3)|0;
      if (this.filterLoops === 0) {
        this.filterSlope = 0;
      } else {
        this.filterSlope = 1 / this.filterLoops;
      }
    }
    return Rate;
  })();
  
  cc.createRate = function(sampleRate, bufLength) {
    return new Rate(sampleRate, bufLength);
  };
  
  module.exports = {};

});
