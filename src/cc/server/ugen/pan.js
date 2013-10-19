define(function(require, exports, module) {
  "use strict";

  var ugen = require("./ugen");
  var OutputProxy = ugen.OutputProxy;

  var pan2_ctor = function(rate) {
    return function(_in, pos, level) {
      this.init.call(this, rate, _in, pos, level);
      this.channels = [
        new OutputProxy(this.rate, this, 0),
        new OutputProxy(this.rate, this, 1),
      ];
      this.numOfOutputs = 2;
      return this.channels;
    };
  };
  
  var iPan2 = {
    ar: {
      defaults: "in=0,pos=0,level=1",
      ctor: pan2_ctor(C.AUDIO),
      Klass: ugen.MultiOutUGen
    },
    kr: {
      defaults: "in=0,pos=0,level=1",
      ctor: pan2_ctor(C.CONTROL),
      Klass: ugen.MultiOutUGen
    },
  };
  
  var install = function() {
    ugen.register("Pan2", iPan2);
  };
  
  module.exports = {
    install: install
  };

});
