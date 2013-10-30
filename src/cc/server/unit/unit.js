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
      this.rate = cc.getRateInstance(this.calcRate);
      var bufLength = this.rate.bufLength;
      var outs = new Array(this.numOfOutputs);
      for (var i = 0, imax = outs.length; i < imax; ++i) {
        outs[i] = new Float32Array(bufLength);
      }
      this.outs      = outs;
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
  
  specs.Control = (function() {
    var ctor = function() {
      if (this.numOfOutputs === 1) {
        this.process = next_1;
      } else {
        this.process = next_k;
      }
      this.process(1);
    };
    var next_1 = function() {
      this.outs[0][0] = this.parent.controls[this.specialIndex];
    };
    var next_k = function() {
      var controls = this.parent.controls;
      var outs = this.outs;
      var specialIndex = this.specialIndex;
      for (var i = 0, imax = outs.length; i < imax; ++i) {
        outs[i][0] = controls[i + specialIndex];
      }
    };
    return ctor;
  })();
  
  specs.Out = (function() {
    var ctor = function() {
      this._bufLength = cc.server.bufLength;
      if (this.calcRate === C.AUDIO) {
        this.process = next_a;
        this._busOffset = 0;
      } else {
        this.process = next_k;
        this._busOffset = this._bufLength * C.AUDIO_BUS_LEN;
      }
    };
    var next_a = function(inNumSamples, instance) {
      inNumSamples = inNumSamples|0;
      var inputs = this.inputs;
      var bus    = instance.bus;
      var bufLength = this._bufLength;
      var offset, _in;
      var fbusChannel = (inputs[0][0]|0) - 1;
      for (var i = 1, imax = inputs.length; i < imax; ++i) {
        offset = (fbusChannel + i) * bufLength;
        _in = inputs[i];
        for (var j = 0; j < inNumSamples; j++) {
          bus[offset + j] += _in[j];
        }
      }
    };
    var next_k = function(inNumSamples, instance) {
      var inputs = this.inputs;
      var bus    = instance.bus;
      var offset    = this._busOffset + (inputs[0][0]|0) - 1;
      for (var i = 1, imax = inputs.length; i < imax; ++i) {
        bus[offset + i] += inputs[i][0];
      }
    };
    return ctor;
  })();
  
  specs.In = (function() {
    var ctor = function() {
      this._bufLength = cc.server.bufLength;
      if (this.calcRate === C.AUDIO) {
        this.process = next_a;
        this._busOffset = 0;
      } else {
        this.process = next_k;
        this._busOffset = this._bufLength * C.AUDIO_BUS_LEN;
      }
    };
    var next_a = function(inNumSamples, instance) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var bus  = instance.bus;
      var bufLength = this._bufLength;
      var offset = (this.inputs[0][0] * bufLength)|0;
      for (var i = 0; i < inNumSamples; ++i) {
        outs[i] = bus[offset + i];
      }
    };
    var next_k = function(inNumSamples, instance) {
      inNumSamples = inNumSamples|0;
      var outs  = this.outs[0];
      var value = instance.bus[this._busOffset + (this.inputs[0][0]|0)];
      for (var i = 0; i < inNumSamples; ++i) {
        outs[i] = value;
      }
    };
    return ctor;
  })();
  
  module.exports = {
    Unit : Unit,
    specs: specs,
  };

});
