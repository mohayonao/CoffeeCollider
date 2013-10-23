define(function(require, exports, module) {
  "use strict";
  
  var Buffer = (function() {
    function Buffer(bufId) {
      this.bufId       = bufId;
      this.numFrames   = 0;
      this.numChannels = 0;
      this.sampleRate  = 0;
      this.samples     = null;
    }
    Buffer.prototype.set = function(numFrames, numChannels, sampleRate, samples) {
      this.numFrames   = numFrames;
      this.numChannels = numChannels;
      this.sampleRate  = sampleRate;
      this.samples     = samples;
    };
    return Buffer;
  })();
  
  module.exports = {
    Buffer: Buffer
  };

});
