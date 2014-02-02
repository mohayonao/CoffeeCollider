define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  
  var Unit = (function() {
    function Unit(parent, specs) {
      this.parent = parent;
      this.world  = parent.world;
      this.specs  = specs;
      this.name         = specs[0];
      this.calcRate     = specs[1];
      this.specialIndex = specs[2];
      this.numInputs    = specs[3].length >> 1;
      this.numOutputs   = specs[4].length;
      this.inputs    = new Array(this.numInputs);
      this.inRates   = new Array(this.numInputs);
      this.fromUnits = new Array(this.numInputs);
      this.outRates = specs[4];
      this.rate     = cc.server.rates[this.calcRate];
      var bufLength = this.rate.bufLength;
      
      var BYTES_PER_ELEMENT = Float32Array.BYTES_PER_ELEMENT;
      
      var heap = new Float32Array(
        parent.heap.buffer,
        parent.heapIndex * BYTES_PER_ELEMENT,
        bufLength * this.numOutputs
      );
      parent.heapIndex += bufLength * this.numOutputs;
      
      var outputs    = new Array(this.numOutputs);
      for (var i = 0, imax = outputs.length; i < imax; ++i) {
        outputs[i] = new Float32Array(
          heap.buffer,
          heap.byteOffset + (bufLength * i * BYTES_PER_ELEMENT),
          bufLength
        );
      }
      this.heap      = heap;
      this.outputs   = outputs;
      this.bufLength = bufLength;
      this.done      = false;
    }
    Unit.prototype.init = function() {
      var ctor = cc.unit.specs[this.name];
      if (typeof ctor === "function") {
        ctor.call(this);
      } else {
        throw new Error(this.name + "'s ctor is not found.");
      }
      return this;
    };
    Unit.prototype.doneAction = function(action) {
      this.parent.doneAction(action);
    };
    return Unit;
  })();
  
  cc.createUnit = function(parent, specs) {
    return new Unit(parent, specs);
  };
  
  module.exports = {
    Unit : Unit
  };

});
