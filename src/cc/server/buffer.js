define(function(require, exports, module) {
  "use strict";

  var BufferSource = (function() {
    function BufferSource(bufSrcId) {
      this.bufSrcId   = bufSrcId;
      this.channels   = 0;
      this.sampleRate = 0;
      this.frames     = 0;
      this.samples    = null;
      this.pendings   = [];
    }
    BufferSource.prototype.set = function(channels, sampleRate, frames, samples) {
      this.channels   = channels;
      this.sampleRate = sampleRate;
      this.frames     = frames;
      this.samples    = samples;
      this.pendings.forEach(function(items) {
        var buffer     = items[0];
        var startFrame = items[1];
        var frames  = items[2];
        buffer.bindBufferSource(this, startFrame, frames);
      }, this);
      this.pendings = null;
    };
    return BufferSource;
  })();
  
  var AudioBuffer = (function() {
    function AudioBuffer(bufId) {
      this.bufId      = bufId;
      this.frames     = 0;
      this.channels   = 0;
      this.sampleRate = 0;
      this.samples    = null;
    }
    AudioBuffer.prototype.bindBufferSource = function(bufSrc, startFrame, frames) {
      startFrame = Math.max( 0, Math.min(startFrame|0, bufSrc.frames));
      frames  = Math.max(-1, Math.min(frames |0, bufSrc.frames - startFrame));
      if (startFrame === 0) {
        if (frames === -1) {
          this.samples = bufSrc.samples;
          this.frames  = bufSrc.frames;
        } else {
          this.samples = new Float32Array(
            bufSrc.samples.buffer.slice(C.BUFSRC_HEADER_SIZE, frames * 4)
          );
          this.frames = frames;
        }
      } else {
        if (frames === -1) {
          this.samples = new Float32Array(
            bufSrc.samples.buffer.slice(C.BUFSRC_HEADER_SIZE + startFrame * 4)
          );
          this.frames = bufSrc.frames - startFrame;
        } else {
          this.samples = new Float32Array(
            bufSrc.samples.buffer.slice(C.BUFSRC_HEADER_SIZE + startFrame * 4, (startFrame + frames) * 4)
          );
          this.frames = frames;
        }
      }
      this.channels   = bufSrc.channels;
      this.sampleRate = bufSrc.sampleRate;
    };
    return AudioBuffer;
  })();
  
  module.exports = {
    BufferSource: BufferSource,
    AudioBuffer : AudioBuffer
  };

});
