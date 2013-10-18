define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
    
  var units = {};
  
  var Unit = (function() {
    function Unit(parent, specs) {
      this.klassName = "Unit";
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
      this.rate = cc.server.getRate(this.calcRate);
      var bufLength = this.rate.bufLength;
      var outs = new Array(this.numOfOutputs);
      for (var i = 0, imax = outs.length; i < imax; ++i) {
        outs[i] = new Float32Array(bufLength);
      }
      this.outs      = outs;
      this.bufLength = bufLength;
      this.done      = false;
    }
    Unit.prototype.init = function() {
      var ctor = units[this.name];
      if (ctor) {
        ctor.call(this);
      } else {
        console.warn(this.name + "'s ctor is not found.");
      }
      return this;
    };
    Unit.prototype.doneAction = function(action) {
      if (!this.done) {
        this.done = true;
        this.parent._doneAction(action);
      }
    };
    return Unit;
  })();
  
  var FixNum = (function() {
    var map = {};
    function FixNum(value) {
      if (map[value]) {
        return map[value];
      }
      this.klassName = "FixNum";
      this.outs = [ new Float32Array([value]) ];
      map[value] = this;
    }
    FixNum.reset = function() {
      map = {};
    };
    return FixNum;
  })();

  var Control = function() {
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
  };
  
  var Out = function() {
    var ctor = function() {
      this._busBuffer = cc.server.busBuffer;
      this._bufLength = cc.server.bufLength;
      if (this.calcRate === C.AUDIO) {
        this.process = next_a;
        this._busOffset = 0;
      } else {
        this.process = next_k;
        this._busOffset = this._bufLength * C.AUDIO_BUS_LEN;
      }
    };
    var next_a = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var inputs = this.inputs;
      var busBuffer = this._busBuffer;
      var bufLength = this._bufLength;
      var offset, _in;
      var fbusChannel = (inputs[0][0]|0) - 1;
      for (var i = 1, imax = inputs.length; i < imax; ++i) {
        offset = (fbusChannel + i) * bufLength;
        _in = inputs[i];
        for (var j = 0; j < inNumSamples; j++) {
          busBuffer[offset + j] += _in[j];
        }
      }
    };
    var next_k = function() {
      var inputs = this.inputs;
      var busBuffer = this._busBuffer;
      var offset    = this._busOffset + (inputs[0][0]|0) - 1;
      for (var i = 1, imax = inputs.length; i < imax; ++i) {
        busBuffer[offset + i] += inputs[i][0];
      }
    };
    return ctor;
  };

  
  var register = function(name, payload) {
    units[name] = payload();
  };

  var install = function() {
    register("Control", Control);
    register("Out"    , Out    );
  };
  
  module.exports = {
    Unit    : Unit,
    FixNum  : FixNum,
    Control : Control,
    register: register,
    install : install
  };

});
