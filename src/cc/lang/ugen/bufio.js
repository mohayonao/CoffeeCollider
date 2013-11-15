define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  
  var slice = [].slice;

  var playbuf_ctor = function(rate) {
    return function(numChannels, buffer) {
      if (typeof numChannels !== "number") {
        throw new TypeError("Buffer: arguments[0] should be an integer.");
      }
      if (!cc.instanceOfAudioBuffer(buffer)) {
        throw new TypeError("Buffer: arguments[1] should be a buffer.");
      }
      numChannels = Math.max(0, numChannels|0);
      this.init.apply(this, [rate].concat(slice.call(arguments, 1)));
      this.specialIndex = buffer._bufId;
      return this.initOutputs(numChannels, this.rate);
    };
  };
  
  cc.ugen.specs.PlayBuf = {
    _Klass: cc.MultiOutUGen,
    ar: {
      defaults: "numChannels=0,buffer,rate=1,trigger=1,startPos=0,loop=0,doneAction=0",
      ctor: playbuf_ctor(C.AUDIO)
    },
    kr: {
      defaults: "numChannels=0,buffer,rate=1,trigger=1,startPos=0,loop=0,doneAction=0",
      ctor: playbuf_ctor(C.CONTROL)
    }
  };
  
  module.exports = {};

});
