define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  
  var InfoUGenBase = {
    $ir: {
      ctor: function() {
        return this.multiNew(C.SCALAR);
      }
    }
  };
  
  cc.ugen.specs.SampleRate = InfoUGenBase;

  cc.unit.specs.SampleRate = (function() {
    var ctor = function() {
      this.outputs[0][0] = cc.server.rates[C.AUDIO].sampleRate;
    };
    return ctor;
  })();
  
  cc.ugen.specs.SampleDur = InfoUGenBase;
  
  cc.unit.specs.SampleDur = (function() {
    var ctor = function() {
      this.outputs[0][0] = cc.server.rates[C.AUDIO].sampleDur;
    };
    return ctor;
  })();
  
  cc.ugen.specs.RadiansPerSample = InfoUGenBase;

  cc.unit.specs.RadiansPerSample = (function() {
    var ctor = function() {
      this.outputs[0][0] = cc.server.rates[C.AUDIO].radiansPerSample;
    };
    return ctor;
  })();
  
  cc.ugen.specs.ControlRate = InfoUGenBase;

  cc.unit.specs.ControlRate = (function() {
    var ctor = function() {
      this.outputs[0][0] = cc.server.rates[C.CONTROL].sampleRate;
    };
    return ctor;
  })();
  
  cc.ugen.specs.ControlDur = InfoUGenBase;
  
  cc.unit.specs.ControlDur = (function() {
    var ctor = function() {
      this.outputs[0][0] = cc.server.rates[C.AUDIO].bufDuration;
    };
    return ctor;
  })();

  // TODO:
  // cc.ugen.specs.SubsampleOffset = InfoUGenBase;

  // cc.ugen.specs.NumOutputBuses = InfoUGenBase;

  // cc.ugen.specs.NumAudioBuses = InfoUGenBase;

  // cc.ugen.specs.NumControlBuses = InfoUGenBase;

  // cc.ugen.specs.NumBuffers = InfoUGenBase;

  // cc.ugen.specs.NumRunningSynths = {
  //   $kr: {
  //     ctor: function() {
  //       return this.multiNew(C.CONTROL);
  //     }
  //   },
  //   $ir: {
  //     ctor: function() {
  //       return this.multiNew(C.SCALAR);
  //     }
  //   }
  // };
  
  module.exports = {};

});
