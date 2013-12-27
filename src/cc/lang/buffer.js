define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  var utils  = require("./utils");
  var extend = require("../common/extend");
  var slice = [].slice;
  
  var Buffer = (function() {
    var bufnum = 0;
    function Buffer(frames, channels) {
      this.klassName = "Buffer";
      
      this.bufnum     = bufnum++;
      this.frames     = frames  |0;
      this.channels   = channels|0;
      this.sampleRate = cc.lang.sampleRate;
      this.path       = null;
      
      cc.lang.pushToTimeline([
        "/b_new", this.bufnum, this.frames, this.channels
      ]);
    }
    extend(Buffer, cc.Object);
    
    Buffer.prototype.free = function() {
      cc.lang.pushToTimeline([
        "/b_free", this.bufnum
      ]);
      return this;
    };
    
    Buffer.prototype.zero = function() {
      cc.lang.pushToTimeline([
        "/b_zero", this.bufnum
      ]);
      return this;
    };
    
    Buffer.prototype.set = function() {
      var args = slice.call(arguments);
      if (args.length) {
        cc.lang.pushToTimeline([
          "/b_set", this.bufnum, args
        ]);
      }
      return this;
    };
    Buffer.prototype.setn = Buffer.prototype.set;

    var calcFlag = function(normalize, asWavetable, clearFirst) {
      return (normalize ? 1 : 0) + (asWavetable ? 2 : 0) + (clearFirst ? 4 : 0);
    };
    
    Buffer.prototype.sine1 = fn(function(amps, normalize, asWavetable, clearFirst) {
      amps = utils.asArray(amps);
      var flags = calcFlag(normalize, asWavetable, clearFirst);
      cc.lang.pushToTimeline(
        ["/b_gen", this.bufnum, "sine1", flags].concat(amps)
      );
      return this;
    }).defaults("amps=[],normalize=true,asWavetable=true,clearFirst=true").build();

    Buffer.prototype.sine2 = fn(function(freqs, amps, normalize, asWavetable, clearFirst) {
      freqs = utils.asArray(freqs);
      amps  = utils.asArray(amps);
      var flags = calcFlag(normalize, asWavetable, clearFirst);
      var len = Math.max(freqs.length, amps.length) * 2;
      cc.lang.pushToTimeline(
        ["/b_gen", this.bufnum, "sine2", flags].concat(utils.lace([freqs, amps], len))
      );
      return this;
    }).defaults("freqs=[],amps=[],normalize=true,asWavetable=true,clearFirst=true").build();

    Buffer.prototype.sine3 = fn(function(freqs, amps, phases, normalize, asWavetable, clearFirst) {
      freqs  = utils.asArray(freqs);
      amps   = utils.asArray(amps);
      phases = utils.asArray(phases);
      var flags = calcFlag(normalize, asWavetable, clearFirst);
      var len = Math.max(freqs.length, amps.length, phases.length) * 3;
      cc.lang.pushToTimeline(
        ["/b_gen", this.bufnum, "sine3", flags].concat(utils.lace([freqs, amps, phases], len))
      );
      return this;
    }).defaults("freqs=[],amps=[],phases=[],normalize=true,asWavetable=true,clearFirst=true").build();

    Buffer.prototype.cheby = fn(function(amplitudes, normalize, asWavetable, clearFirst) {
      amplitudes = utils.asArray(amplitudes);
      var flags = calcFlag(normalize, asWavetable, clearFirst);
      cc.lang.pushToTimeline(
        ["/b_gen", this.bufnum, "cheby", flags].concat(amplitudes)
      );
      return this;
    }).defaults("amplitudes=[],normalize=true,asWavetable=true,clearFirst=true").build();
    
    Buffer.prototype.asUGenInput = function() {
      return this.bufnum;
    };
    
    Buffer.prototype.asString = function() {
      return "Buffer(" + this.bufnum + ", " + this.frames + ", " + this.channels + ", " + this.sampleRate + ", " + this.path + ")";
    };
    
    return Buffer;
  })();
  
  var sendBufferData = function(buffer, data) {
    var uint8 = new Uint8Array(C.BUFSRC_HEADER_SIZE + data.samples.length * 4);
    var int16 = new Uint16Array(uint8.buffer);
    var int32 = new Uint32Array(uint8.buffer);
    var f32   = new Float32Array(uint8.buffer);
    int16[0] = C.BINARY_CMD_SET_BUFSRC;
    int16[1] = buffer.bufnum;
    int16[3] = data.numChannels;
    int32[2] = data.sampleRate;
    int32[3] = data.numFrames;
    f32.set(data.samples, 4);
    cc.lang.sendToServer(uint8);
  };
  
  cc.global.Buffer = fn(function(numFrames, numChannels, source) {
    if (Array.isArray(numFrames)) {
      numFrames = new Float32Array(numFrames);
    }
    if (numFrames instanceof Float32Array) {
      source = {
        sampleRate : cc.lang.sampleRate,
        numChannels: 1,
        numFrames  : numFrames.length,
        samples    : numFrames
      };
      numFrames   = source.numFrames;
      numChannels = source.numChannels;
    }
    var buffer = new Buffer(numFrames, numChannels);
    if (source) {
      sendBufferData(buffer, source);
    }
    return buffer;
  }).defaults("numFrames=0,numChannels=1,source").build();
  
  cc.global.Buffer["new"] = cc.global.Buffer;
  
  cc.global.Buffer.read = fn(function(path, startFrame, numFrames) {
    if (typeof path !== "string") {
      throw new TypeError("Buffer.Read: path should be a string.");
    }
    var buffer = new Buffer();
    cc.lang.requestBuffer(path, function(data) {
      var samples;
      if (data) {
        buffer.sampleRate = data.sampleRate;
        buffer.path       = path;
        
        samples    = data.samples;
        startFrame = Math.max( 0, Math.min(startFrame|0, data.numFrames));
        numFrames  = Math.max(-1, Math.min(numFrames |0, data.numFrames - startFrame));
        
        if (startFrame === 0) {
          if (numFrames !== -1) {
            samples = new Float32Array(samples.buffer, 0, numFrames);
          }
        } else {
          if (numFrames === -1) {
            samples = new Float32Array(samples.buffer, startFrame * 4);
          } else {
            samples = new Float32Array(samples.buffer, startFrame * 4, numFrames);
          }
        }
        sendBufferData(buffer, data);
      }
    });
    return buffer;
  }).defaults("path,startFrame=0,numFrames=-1").build();
  
  cc.instanceOfBuffer = function(obj) {
    return obj instanceof Buffer;
  };
  
  module.exports = {
    Buffer: Buffer
  };

});
