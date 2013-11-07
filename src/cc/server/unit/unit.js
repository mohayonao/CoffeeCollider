define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

  var specs = {};
  
  var Unit = (function() {
    function Unit(parent, specs) {
      this.parent = parent;
      this.specs  = specs;
      this.name         = specs[0];
      this.calcRate     = specs[1];
      this.specialIndex = specs[2];
      this.numOfInputs  = specs[3].length >> 1;
      this.numOfOutputs = specs[4].length;
      this.inputs   = new Array(this.numOfInputs);
      this.inRates  = new Array(this.numOfInputs);
      this.outRates = specs[4];
      this.rate     = cc.getRateInstance(this.calcRate || C.CONTROL);
      var bufLength = this.rate.bufLength;
      var allOutputs = new Float32Array(bufLength * this.numOfOutputs);
      var outputs    = new Array(this.numOfOutputs);
      for (var i = 0, imax = outputs.length; i < imax; ++i) {
        outputs[i] = new Float32Array(
          allOutputs.buffer,
          bufLength * i * allOutputs.BYTES_PER_ELEMENT,
          bufLength
        );
      }
      this.outputs    = outputs;
      this.allOutputs = allOutputs;
      this.bufLength  = bufLength;
      this.done       = false;
    }
    Unit.prototype.init = function(tag) {
      var ctor = specs[this.name];
      if (typeof ctor === "function") {
        ctor.call(this);
      } else {
        cc.console.warn(this.name + "'s ctor is not found.");
      }
      this.tag = tag || "";
      return this;
    };
    Unit.prototype.doneAction = function(action) {
      if (!this.done) {
        this.done = true;
        this.parent.doneAction(action, this.tag);
      }
      action = 0;
    };
    return Unit;
  })();

  var zapgremlins = function(a) {
    if (isNaN(a) || (-1e-6 < a && a < 0) || (0 <= a && a < +1e-6)) {
      return 0;
    }
    return a;
  };
  
  var avoidzero = function(a) {
    if (a < 0) {
      if (-1e-6 < a) {
        a = -1e-6;
      }
    } else if (a < +1e-6) {
      a = 1e-6;
    }
    return a;
  };
  
  module.exports = {
    Unit : Unit,
    specs: specs,

    zapgremlins: zapgremlins,
    avoidzero  : avoidzero,
    
    use: function() {
      cc.createUnit = function(parent, specs) {
        return new Unit(parent, specs);
      };
    }
  };

});
