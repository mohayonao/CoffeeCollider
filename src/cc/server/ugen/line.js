define(function(require, exports, module) {
  "use strict";
  
  var fn = require("../fn");
  var UGen = require("./ugen").UGen;

  var Line = (function() {
    function Line() {
      UGen.call(this);
      this.klassName = "Line";
    }
    fn.extend(Line, UGen);
    
    Line.prototype.$ar = fn(function(start, end, dur, mul, add, doneAction) {
      return this.multiNew(C.AUDIO, start, end, dur, doneAction).madd(mul, add);
    }).defaults("start=0,end=1,dur=1,mul=1,add=0,doneAction=0").build();
    
    Line.prototype.$kr = fn(function(start, end, dur, mul, add, doneAction) {
      return this.multiNew(C.CONTROL, start, end, dur, doneAction).madd(mul, add);
    }).defaults("start=0,end=1,dur=1,mul=1,add=0,doneAction=0").build();
    
    fn.classmethod(Line);
    
    return Line;
  })();
  
  var install = function(register) {
    register("Line", Line);
  };
  
  module.exports = {
    Line: Line,
    install: install
  };

});
