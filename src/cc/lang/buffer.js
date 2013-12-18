define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  var utils  = require("./utils");
  var extend = require("../common/extend");
  var slice = [].slice;
  
  var BufferSource = (function() {
    var bufSrcId = 0;
    var cache = {};
    function BufferSource(source, id) {
      this.bufSrcId = bufSrcId++;
      
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
      
      var uint8 = new Uint8Array(C.BUFSRC_HEADER_SIZE + source.samples.length * 4);
      var int16 = new Uint16Array(uint8.buffer);
      var int32 = new Uint32Array(uint8.buffer);
      var f32   = new Float32Array(uint8.buffer);
      int16[0] = C.BINARY_CMD_SET_BUFSRC;
      int16[1] = this.bufSrcId;
      int16[3] = source.numChannels;
      int32[2] = source.sampleRate;
      int32[3] = source.numFrames;
      f32.set(source.samples, 4);
      cc.lang.sendToServer(uint8);
      
      if (id) {
        cache[id] = this;
      }
    }
    BufferSource.prototype.bind = function(buffer, startFrame, numFrames) {
      cc.lang.pushToTimeline([
        "/b_bind", buffer.bufnum, this.bufSrcId, startFrame, numFrames
      ]);
    };
    BufferSource.get = function(id) {
      return cache[id];
    };
    BufferSource.reset = function() {
      cache = {};
    };
    return BufferSource;
  })();
  
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
      new BufferSource(source).bind(buffer, 0, -1);
    }
    return buffer;
  }).defaults("numFrames=0,numChannels=1,source").build();
  
  cc.global.Buffer["new"] = cc.global.Buffer;
  
  cc.global.Buffer.read = fn(function(path, startFrame, numFrames) {
    if (typeof path !== "string") {
      throw new TypeError("Buffer.Read: path should be a string.");
    }
    var bufSrc = BufferSource.get(path);
    var buffer = new Buffer();
    if (bufSrc) {
      bufSrc.bind(buffer, startFrame, numFrames);
    } else {
      cc.lang.requestBuffer(path, function(result) {
        if (result) {
          buffer.sampleRate = result.sampleRate;
          buffer.path       = path;
          new BufferSource(result, path).bind(buffer, startFrame, numFrames);
        }
      });
    }
    return buffer;
  }).defaults("path,startFrame=0,numFrames=-1").build();
  
  cc.instanceOfBuffer = function(obj) {
    return obj instanceof Buffer;
  };
  
  cc.resetBuffer = function() {
    BufferSource.reset();
  };
  
  module.exports = {
    BufferSource: BufferSource,
    Buffer      : Buffer
  };

});
