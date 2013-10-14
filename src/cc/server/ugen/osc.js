define(function(require, exports, module) {
  "use strict";
  
  var fn = require("../fn");
  var UGen = require("./ugen").UGen;

  var SinOsc = (function() {
    function SinOsc() {
      UGen.call(this);
      this.klassName = "SinOsc";
    }
    fn.extend(SinOsc, UGen);
    
    SinOsc.prototype.$ar = fn(function(freq, phase, mul, add) {
      return this.multiNew(C.AUDIO, freq, phase).madd(mul, add);
    }).defaults("freq=440,phase=0,mul=1,add=0").build();
    
    SinOsc.prototype.$kr = fn(function(freq, phase, mul, add) {
      return this.multiNew(C.CONTROL, freq, phase).madd(mul, add);
    }).defaults("freq=440,phase=0,mul=1,add=0").build();
    
    fn.classmethod(SinOsc);
    
    return SinOsc;
  })();

  var install = function(namespace) {
    namespace.register("SinOsc", SinOsc);
  };
  
  module.exports = {
    SinOsc: SinOsc,
    install: install
  };

});
