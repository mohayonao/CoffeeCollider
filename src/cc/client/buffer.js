define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  var extend = require("../common/extend");
  var Emitter = require("../common/emitter").Emitter;

  var bufferCache = {};

  var AudioBuffer = (function() {
    var bufId = 0;
    function AudioBuffer() {
      Emitter.bind(this);
      this.klassName = "Buffer";
      this.samples     = null;
      this.numFrames   = 0;
      this.numChannels = 0;
      this.sampleRate  = 0;
      this.blocking = true;
      this._bufId = bufId++;
      cc.client.pushToTimeline([
        "/b_new", this._bufId
      ]);
    }
    extend(AudioBuffer, cc.Object);
    return AudioBuffer;
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
    cc.client.pushToTimeline([
      "/b_set", this._bufId, numFrames, buffer.numChannels, buffer.sampleRate, samples
    ]);
  };
  
  var BufferInterface = function() {
  };
  BufferInterface.read = fn(function(path, startFrame, numFrames) {
    if (typeof path !== "string") {
      throw new TypeError("Buffer.Read: arguments[0] should be a string.");
    }
    var buffer = new AudioBuffer();
    if (bufferCache[path]) {
      setBuffer.call(buffer, bufferCache[path], startFrame, numFrames);
    } else {
      cc.client.requestBuffer(path, function(result) {
        bufferCache[path] = result;
        setBuffer.call(buffer, result, startFrame, numFrames);
      });
    }
    return buffer;
  }).defaults("path,startFrame=0,numFrames=-1").multiCall().build();

  var reset = function() {
    bufferCache = {};
  };
  
  var install = function() {
    global.Buffer = BufferInterface;
  };
  
  module.exports = {
    AudioBuffer: AudioBuffer,
    reset : reset,
    install: install
  };

});
