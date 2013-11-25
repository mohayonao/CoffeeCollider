define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  
  cc.ugen.specs.PlayBuf = {
    Klass: cc.MultiOutUGen,
    $ar: {
      defaults: "numChannels=0,buffer=0,rate=1,trigger=1,startPos=0,loop=0,doneAction=0",
      ctor: function(numChannels, buffer, rate, trigger, startPos, loop, doneAction) {
        if (typeof numChannels !== "number") {
          throw new TypeError("PlayBuf: numChannels should be an integer.");
        }
        this.init(C.AUDIO, buffer, rate, trigger, startPos, loop, doneAction);
        return this.initOutputs(numChannels, this.rate);
      }
    },
    $kr: {
      defaults: "numChannels=0,buffer,rate=1,trigger=1,startPos=0,loop=0,doneAction=0",
      ctor: function(numChannels, buffer, rate, trigger, startPos, loop, doneAction) {
        if (typeof numChannels !== "number") {
          throw new TypeError("PlayBuf: numChannels should be an integer.");
        }
        this.init(C.AUDIO, buffer, rate, trigger, startPos, loop, doneAction);
        return this.initOutputs(numChannels, this.rate);
      }
    }
  };
  
  module.exports = {};

});
