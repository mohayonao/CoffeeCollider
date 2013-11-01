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
      var allOuts  = new Float32Array(bufLength * this.numOfOutputs);
      var outs     = new Array(this.numOfOutputs);
      for (var i = 0, imax = outs.length; i < imax; ++i) {
        outs[i] = new Float32Array(
          allOuts.buffer,
          bufLength * i * allOuts.BYTES_PER_ELEMENT,
          bufLength
        );
      }
      this.outs      = outs;
      this.allOuts   = allOuts;
      this.bufLength = bufLength;
      this.done      = false;
    }
    Unit.prototype.init = function(tag) {
      var ctor = specs[this.name];
      if (typeof ctor === "function") {
        ctor.call(this);
      } else {
        console.warn(this.name + "'s ctor is not found.");
      }
      this.tag = tag;
      return this;
    };
    Unit.prototype.doneAction = function(action) {
      if (!this.done) {
        this.done = true;
        this.parent.doneAction(action, this.tag);
      }
    };
    return Unit;
  })();
  
  
  module.exports = {
    Unit : Unit,
    specs: specs,
    
    use  : function() {
      cc.createUnit = function(parent, specs) {
        return new Unit(parent, specs);
      };
    }
  };

});
