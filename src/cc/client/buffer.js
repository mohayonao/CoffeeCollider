define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  var extend = require("../common/extend");
  var emitter = require("../common/emitter");

  var bufSrcId = 0;
  var bufferSrcCache = {};

  var AudioBuffer = (function() {
    var bufId = 0;
    function AudioBuffer() {
      emitter.mixin(this);
      this.klassName = "Buffer";
      // TODO: set below parameters
      this.frames     = 0;
      this.channels   = 0;
      this.sampleRate = 0;
      
      this._blocking = true;
      this._bufId = bufId++;
      cc.client.pushToTimeline([
        "/b_new", this._bufId
      ]);
    }
    extend(AudioBuffer, cc.Object);
    
    AudioBuffer.prototype.performWait = function() {
      return this._blocking;
    };
    
    return AudioBuffer;
  })();
  
  var newBufferSource = function(path, buffer) {
    // binary data format
    //  0 command
    //  1
    //  2 bufSrcId
    //  3
    //  4 (not use)
    //  5
    //  6 channels
    //  7
    //  8 sampleRate
    //  9
    // 10
    // 11
    // 12 numFrames
    // 13
    // 14
    // 15
    // 16.. samples
    var uint8 = new Uint8Array(C.BUFSRC_HEADER_SIZE + buffer.samples.length * 4);
    var int16 = new Uint16Array(uint8.buffer);
    var int32 = new Uint32Array(uint8.buffer);
    var f32   = new Float32Array(uint8.buffer);
    var _bufSrcId = bufSrcId++;
    int16[0] = C.BINARY_CMD_SET_BUFSRC;
    int16[1] = _bufSrcId;
    int16[3] = buffer.numChannels;
    int32[2] = buffer.sampleRate;
    int32[3] = buffer.numFrames;
    f32.set(buffer.samples, 4);
    cc.client.sendToServer(uint8);
    bufferSrcCache[path] = _bufSrcId;
    delete buffer.samples;
    return _bufSrcId;
  };
  
  var bindBufferSource = function(bufSrcId, startFrame, numFrames) {
    cc.client.pushToTimeline([
      "/b_bind", this._bufId, bufSrcId, startFrame, numFrames
    ]);
  };
  
  var BufferInterface = function() {
  };
  BufferInterface.read = fn(function(path, startFrame, numFrames) {
    if (typeof path !== "string") {
      throw new TypeError("Buffer.Read: arguments[0] should be a string.");
    }
    var bufSrcId = bufferSrcCache[path];
    var buffer = new AudioBuffer();
    if (typeof bufSrcId === "number") {
      bindBufferSource.call(buffer, bufSrcId, startFrame, numFrames);
    } else {
      cc.client.requestBuffer(path, function(result) {
        if (result) {
          var bufSrcId = newBufferSource(path, result);
          bindBufferSource.call(buffer, bufSrcId, startFrame, numFrames);
        }
      });
    }
    return buffer;
  }).defaults("path,startFrame=0,numFrames=-1").multiCall().build();
  
  var resetBuffer = function() {
    bufferSrcCache = {};
    bufSrcId = 0;
  };
  
  
  module.exports = {
    AudioBuffer: AudioBuffer,
    
    use: function() {
      cc.createAudioBuffer = function() {
        return new AudioBuffer();
      };
      cc.instanceOfAudioBuffer = function(obj) {
        return obj instanceof AudioBuffer;
      };
      cc.resetBuffer = resetBuffer;
    },
    exports: function() {
      // TODO: rename????
      if (typeof Buffer === "undefined") {
        cc.global.Buffer = BufferInterface;
      }
    }
  };

});
