define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  
  cc.unit.specs.Control = (function() {
    var ctor = function() {
      if (this.numOfOutputs === 1) {
        this.process = next_1;
      } else {
        this.process = next_k;
      }
      this.process(1);
    };
    var next_1 = function() {
      this.outputs[0][0] = this.parent.controls[this.specialIndex];
    };
    var next_k = function() {
      var controls = this.parent.controls;
      var outputs = this.outputs;
      var specialIndex = this.specialIndex;
      for (var i = 0, imax = outputs.length; i < imax; ++i) {
        outputs[i][0] = controls[i + specialIndex];
      }
    };
    return ctor;
  })();
  
  cc.unit.specs.In = (function() {
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
      var out = this.outputs[0];
      var bus  = instance.bus;
      var bufLength = this._bufLength;
      var offset = (this.inputs[0][0] * bufLength)|0;
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = bus[offset + i];
      }
    };
    var next_k = function(inNumSamples, instance) {
      var out = this.outputs[0];
      var value = instance.bus[this._busOffset + (this.inputs[0][0]|0)];
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = value;
      }
    };
    return ctor;
  })();
  
  cc.unit.specs.Out = (function() {
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

  cc.unit.specs.A2K = (function() {
    var ctor = function() {
      this.process = next;
    };
    var next = function() {
      this.outputs[0][0] = this.inputs[0][0];
    };
    return ctor;
  })();
  
  cc.unit.specs.K2A = (function() {
    var ctor = function() {
      this.process = next;
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var value = this.inputs[0][0];
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = value;
      }
    };
    return ctor;
  })();
  
  module.exports = {};

});
