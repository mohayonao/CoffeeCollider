define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  var Emitter = require("../common/emitter").Emitter;

  var bufferCache = {};
  var bufferStore = {};
  var bufid = 0;

  var Buffer = (function() {
    function Buffer() {
      Emitter.call(this);
      this.klassName = "Buffer";
      this.samples     = null;
      this.numFrames   = 0;
      this.numChannels = 0;
      this.sampleRate  = 0;
      this.blocking = true;
      this._bufid = bufid++;
      bufferStore[this._bufid] = this;
    }
    fn.extend(Buffer, Emitter);
    return Buffer;
  })();
  
  var setBuffer = function(buffer, startFrame, numFrames) {
    if (!buffer) {
      throw new Error("Buffer failed to decode an audio file.");
    }
    startFrame = Math.max( 0, Math.min(startFrame|0, buffer.numFrames));
    numFrames  = Math.max(-1, Math.min(numFrames |0, buffer.numFrames - startFrame));
    var samples, x, i, imax;
    if (startFrame === 0) {
      if (numFrames === -1) {
        samples   = buffer.samples;
        numFrames = buffer.numFrames;
      } else {
        samples = new Float32Array(numFrames * buffer.numChannels);
        for (i = 0, imax = buffer.numChannels; i < imax; ++i) {
          x = i * buffer.numFrames;
          samples.set(buffer.samples.subarray(x, x + numFrames));
        }
      }
    } else {
      if (numFrames === -1) {
        numFrames = buffer.numFrames - startFrame;
      }
      samples = new Float32Array(numFrames * buffer.numChannels);
      for (i = 0, imax = buffer.numChannels; i < imax; ++i) {
        x = i * buffer.numFrames + startFrame;
        samples.set(buffer.samples.subarray(x, x + numFrames));
      }
    }
    this.samples    = samples;
    this.numFrames  = numFrames;
    this.numChannels = buffer.numChannels;
    this.sampleRate  = buffer.sampleRate;
    this.blocking = false;
    this.emit("load", this);
  };
  
  var BufferInterface = function() {
  };
  BufferInterface.read = fn(function(path, startFrame, numFrames) {
    if (typeof path !== "string") {
      throw new TypeError("Buffer.Read: arguments[0] should be a string.");
    }
    var buffer = new Buffer();
    if (bufferCache[path]) {
      setBuffer.call(buffer, bufferCache[path], startFrame, numFrames);
    } else {
      cc.server.requestBuffer(path, function(result) {
        bufferCache[path] = result;
        setBuffer.call(buffer, result, startFrame, numFrames);
      });
    }
    return buffer;
  }).defaults("path,startFrame=0,numFrames=-1").multiCall().build();

  var reset = function() {
    bufferCache = {};
  };
  
  var get = function(id) {
    return bufferStore[id];
  };
  
  var install = function() {
    global.Buffer = BufferInterface;
  };
  
  module.exports = {
    Buffer: Buffer,
    reset : reset,
    get   : get,
    install: install
  };

});
