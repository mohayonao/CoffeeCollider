define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

  var convertEnv = function(env) {
    return env.asMultichannelArray();
  };
  
  cc.ugen.specs.EnvGen = {
    $ar: {
      defaults: "envelope,gate=1,levelScale=1,levelBias=0,timeScale=1,doneAction=0",
      ctor: function(envelope, gate, levelScale, levelBias, timeScale, doneAction) {
        envelope = convertEnv(envelope)[0]; // TODO: unbubble
        return this.init.apply(this, [C.AUDIO, gate, levelScale, levelBias, timeScale, doneAction].concat(envelope));
      }
    },
    $kr: {
      defaults: "envelope,gate=1,levelScale=1,levelBias=0,timeScale=1,doneAction=0",
      ctor: function(envelope, gate, levelScale, levelBias, timeScale, doneAction) {
        envelope = convertEnv(envelope)[0]; // TODO: unbubble
        return this.init.apply(this, [C.CONTROL, gate, levelScale, levelBias, timeScale, doneAction].concat(envelope));
      }
    }
  };
  
  cc.ugen.specs.Linen = {
    $kr: {
      defaults: "gate=1,attackTime=0.01,susLevel=1,releaseTime=1,doneAction=0",
      ctor: function(gate, attackTime, susLevel, releaseTime, doneAction) {
        return this.init(C.CONTROL, gate, attackTime, susLevel, releaseTime, doneAction);
      }
    }
  };
  
  module.exports = {};

});
