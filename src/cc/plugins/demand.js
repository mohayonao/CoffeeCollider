define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

  var isDemandInput = function(unit, index) {
    var fromUnit = unit.fromUnits[index];
    return fromUnit && fromUnit.calcRate === C.DEMAND;
  };

  var inputDemand = function(unit, index) {
    var fromUnit = unit.fromUnits[index];
    if (fromUnit && fromUnit.calcRate === C.DEMAND) {
      fromUnit.process(1);
    }
    return unit.inputs[index][0];
  };
  
  var inputDemandA = function(unit, index, offset) {
    var fromUnit = unit.fromUnits[index];
    if (fromUnit) {
      switch (fromUnit.calcRate) {
      case C.AUDIO:
        return unit.inputs[index][offset-1];
      case C.DEMAND:
        fromUnit.process(offset);
        /* fall through */
      default:
        return unit.inputs[index][0];
      }
    } else {
      return unit.inputs[index][0];
    }
  };
  
  var resetDemandInput = function(unit, index) {
    var fromUnit = unit.fromUnits[index];
    if (fromUnit && fromUnit.calcRate === C.DEMAND) {
      fromUnit.process(0);
    }
  };
  
  cc.ugen.specs.Demand = {
    Klass: cc.MultiOutUGen,
    $ar: {
      defaults: "trig=0,reset=0,demandUGens=[]",
      ctor: function(trig, reset, demandUGens) {
        return this.multiNewList([C.AUDIO, trig, reset].concat(demandUGens));
      }
    },
    $kr: {
      defaults: "trig=0,reset=0,demandUGens=[]",
      ctor: function(trig, reset, demandUGens) {
        return this.multiNewList([C.CONTROL, trig, reset].concat(demandUGens));
      }
    },
    init: function() {
      return this.initOutputs(this.inputs.length - 2, this.rate);
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };

  cc.unit.specs.Demand = (function() {
    var ctor = function() {
      this.process = next;
      this._prevtrig  = 0;
      this._prevreset = 0;
      this._prevout   = new Float32Array(this.numOfOutputs);
    };
    var next = function(inNumSamples) {
      var outputs = this.outputs;
      var inputs  = this.inputs;
      var trigIn  = inputs[0];
      var resetIn = inputs[1];
      var prevout = this._prevout;
      var prevtrig  = this._prevtrig;
      var prevreset = this._prevreset;
      var ztrig, zreset, x;
      var numOfInputs = this.numOfInputs;
      var j, k;
      
      for (var i = 0; i < inNumSamples; ++i) {
        ztrig  = trigIn[i];
        zreset = resetIn[i];
        if (zreset > 0 && prevreset <= 0) {
          for (j = 2; j < numOfInputs; ++j) {
            resetDemandInput(this, j);
          }
        }
        if (ztrig > 0 && prevtrig <= 0) {
          for (j = 2, k = 0; j < numOfInputs; ++j) {
            x = inputDemandA(this, j, i + 1);
            if (isNaN(x)) {
              x = prevout[k];
              this.done = true;
            } else {
              prevout[k] = x;
            }
            outputs[k][i] = x;
          }
        } else {
          for (j = 2, k = 0; j < numOfInputs; ++j) {
            outputs[k][i] = prevout[k];
          }
        }
        prevtrig  = ztrig;
        prevreset = zreset;
      }
      this._prevtrig  = prevtrig;
      this._prevreset = prevreset;
    };
    return ctor;
  })();

  cc.ugen.specs.Dgeom = {
    $new: {
      defaults: "start=1,grow=2,length=Infinity",
      ctor: function(start, grow, length) {
        return this.multiNew(C.DEMAND, length, start, grow);
      }
    }
  };

  cc.unit.specs.Dgeom = (function() {
    var ctor = function() {
      this.process = next;
      this._grow  = 0;
      this._value = 0;
      next.call(this, 0);
    };

    var next = function(inNumSamples) {
      var grow, x;
      if (inNumSamples) {
        grow = inputDemandA(this, 2, inNumSamples);
        if (!isNaN(grow)) {
          this._grow = grow;
        }
        if (this._repeats < 0) {
          x = inputDemandA(this, 0, inNumSamples);
          this._repeats = x|0;
          this._value   = inputDemandA(this, 1, inNumSamples);
        }
        if (this._repeatCount >= this._repeats) {
          this.outputs[0][0] = NaN;
          return;
        }
        this.outputs[0][0] = this._value;
        this._value *= this._grow;
        this._repeatCount++;
      } else {
        this._repeats = -1;
        this._repeatCount = 0;
      }
    };
    
    return ctor;
  })();

  cc.ugen.specs.Dseries = {
    $new: {
      defaults: "start=1,step=1,length=Infinity",
      ctor: function(start, step, length) {
        return this.multiNew(C.DEMAND, length, start, step);
      }
    }
  };

  cc.unit.specs.Dseries = (function() {
    var ctor = function() {
      this.process = next;
      this._step  = 0;
      this._value = 0;
      next.call(this, 0);
    };

    var next = function(inNumSamples) {
      var step, x;
      if (inNumSamples) {
        step = inputDemandA(this, 2, inNumSamples);
        if (!isNaN(step)) {
          this._step = step;
        }
        if (this._repeats < 0) {
          x = inputDemandA(this, 0, inNumSamples);
          this._repeats = x|0;
          this._value   = inputDemandA(this, 1, inNumSamples);
        }
        if (this._repeatCount >= this._repeats) {
          this.outputs[0][0] = NaN;
          return;
        }
        this.outputs[0][0] = this._value;
        this._value += this._step;
        this._repeatCount++;
      } else {
        this._repeats = -1;
        this._repeatCount = 0;
      }
    };
    
    return ctor;
  })();

  cc.ugen.specs.Dwhite = {
    $new: {
      defaults: "lo=0,hi=1,length=Infinity",
      ctor: function(lo, hi, length) {
        return this.multiNew(C.DEMAND, length, lo, hi);
      }
    }
  };

  cc.unit.specs.Dwhite = (function() {
    var ctor = function() {
      this.process = next;
      this._lo = 0;
      this._hi = 0;
      next.call(this, 0);
    };

    var next = function(inNumSamples) {
      var lo, hi, x;
      if (inNumSamples) {
        if (this._repeats < 0) {
          x = inputDemandA(this, 0, inNumSamples);
          this._repeats = x|0;
        }
        if (this._repeatCount >= this._repeats) {
          this.outputs[0][0] = NaN;
          return;
        }
        this._repeatCount++;
        lo = inputDemandA(this, 1, inNumSamples);
        hi = inputDemandA(this, 2, inNumSamples);
        
        if (!isNaN(lo)) { this._lo = lo; }
        if (!isNaN(hi)) { this._hi = hi; }
        this.outputs[0][0] = Math.random() * (this._hi - this._lo) + this._lo;
      } else {
        this._repeats = -1;
        this._repeatCount = 0;
      }
    };
    
    return ctor;
  })();
  
  cc.ugen.specs.Diwhite = {
    $new: {
      defaults: "lo=0,hi=127,length=Infinity",
      ctor: function(lo, hi, length) {
        return this.multiNew(C.DEMAND, length, lo, hi);
      }
    }
  };
  
  cc.unit.specs.Diwhite = (function() {
    var ctor = function() {
      this.process = next;
      this._lo = 0;
      this._hi = 0;
      next.call(this, 0);
    };

    var next = function(inNumSamples) {
      var lo, hi, x;
      if (inNumSamples) {
        if (this._repeats < 0) {
          x = inputDemandA(this, 0, inNumSamples);
          this._repeats = x|0;
        }
        if (this._repeatCount >= this._repeats) {
          this.outputs[0][0] = NaN;
          return;
        }
        this._repeatCount++;
        lo = inputDemandA(this, 1, inNumSamples);
        hi = inputDemandA(this, 2, inNumSamples);
        
        if (!isNaN(lo)) { this._lo = lo|0; }
        if (!isNaN(hi)) { this._hi = hi|0; }
        this.outputs[0][0] = (Math.random() * (this._hi - this._lo) + this._lo)|0;
      } else {
        this._repeats = -1;
        this._repeatCount = 0;
      }
    };
    
    return ctor;
  })();
  
  var ListDUGen = {
    $new: {
      defaults: "list=[],repeats=1",
      ctor: function(list, repeats) {
        return this.multiNewList([C.DEMAND, repeats].concat(list));
      }
    }
  };

  cc.ugen.specs.Dser = ListDUGen;

  cc.unit.specs.Dser = (function() {
    var ctor = function() {
      this.process = next;
      next.call(this, 0);
    };

    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var x;
      if (inNumSamples) {
        if (this._repeats < 0) {
          x = inputDemandA(this, 0, inNumSamples);
          this._repeats = isNaN(x) ? 0 : Math.floor(x + 0.5);
        }
        while (true) {
          if (this._index >= this.numOfInputs) {
            this._index = 1;
          }
          if (this._repeatCount >= this._repeats) {
            out[0] = NaN;
            return;
          }
          if (isDemandInput(this, this._index)) {
            if (this._needToResetChild) {
              this._needToResetChild = false;
              resetDemandInput(this, this._index);
            }
            x = inputDemandA(this, this._index, inNumSamples);
            if (isNaN(x)) {
              this._index++;
              this._repeatCount++;
              this._needToResetChild = true;
            } else {
              out[0] = x;
              return;
            }
          } else {
            out[0] = this.inputs[this._index][0];
            this._index++;
            this._repeatCount++;
            this._needToResetChild = true;
            return;
          }
        }
      } else {
        this._repeats = -1;
        this._repeatCount = 0;
        this._needToResetChild = true;
        this._index = 1;
      }
    };

    return ctor;
  })();
  
  cc.ugen.specs.Dseq = ListDUGen;

  cc.unit.specs.Dseq = (function() {
    var ctor = function() {
      this.process = next;
      next.call(this, 0);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var x, attempts;
      if (inNumSamples) {
        if (this._repeats < 0) {
          x = inputDemandA(this, 0, inNumSamples);
          this._repeats = isNaN(x) ? 0 : Math.floor(x + 0.5);
        }
        attempts = 0;
        while (true) {
          if (this._index >= this.numOfInputs) {
            this._index = 1;
            this._repeatCount++;
          }
          if (this._repeatCount >= this._repeats) {
            out[0] = NaN;
            this._index = 1;
            return;
          }
          if (isDemandInput(this, this._index)) {
            if (this._needToResetChild) {
              this._needToResetChild = false;
              resetDemandInput(this, this._index);
            }
            x = inputDemandA(this, this._index, inNumSamples);
            if (isNaN(x)) {
              this._index++;
              this._needToResetChild = true;
            } else {
              out[0] = x;
              return;
            }
          } else {
            out[0] = inputDemandA(this, this._index, inNumSamples);
            this._index++;
            this._needToResetChild = true;
            return;
          }
          if (attempts++ > this.numOfInputs) {
            return;
          }
        }
      } else {
        this._repeats = -1;
        this._repeatCount = 0;
        this._needToResetChild = true;
        this._index = 1;
      }
    };
    return ctor;
  })();

  cc.ugen.specs.Dshuf = ListDUGen;
  
  cc.unit.specs.Dshuf = (function() {
    var ctor = function() {
      this.process = next;
      var indices = new Array(this.numOfInputs - 1);
      for (var i = 0, imax = indices.length; i < imax; ++i) {
        indices[i] = i + 1;
      }
      this._indices = indices.sort(scramble);
      next.call(this, 0);
    };
    var scramble = function() {
      return Math.random() - 0.5;
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var x, attempts;
      if (inNumSamples) {
        if (this._repeats < 0) {
          x = inputDemandA(this, 0, inNumSamples);
          this._repeats = isNaN(x) ? 0 : Math.floor(x + 0.5);
        }
        attempts = 0;
        while (true) {
          if (this._index >= this.numOfInputs - 1) {
            this._index = 0;
            this._repeatCount++;
          }
          if (this._repeatCount >= this._repeats) {
            out[0] = NaN;
            this._index = 0;
            return;
          }
          var index = this._indices[this._index];
          if (isDemandInput(this, index)) {
            if (this._needToResetChild) {
              this._needToResetChild = false;
              resetDemandInput(this, index);
            }
            x = inputDemandA(this, index, inNumSamples);
            if (isNaN(x)) {
              this._index++;
              this._needToResetChild = true;
            } else {
              out[0] = x;
              return;
            }
          } else {
            out[0] = inputDemandA(this, index, inNumSamples);
            this._index++;
            this._needToResetChild = true;
            return;
          }
          if (attempts++ > this.numOfInputs) {
            return;
          }
        }
      } else {
        this._repeats = -1;
        this._repeatCount = 0;
        this._needToResetChild = true;
        this._index = 1;
      }
    };
    return ctor;
  })();

  cc.ugen.specs.Drand = ListDUGen;
  
  cc.unit.specs.Drand = (function() {
    var ctor = function() {
      this.process = next;
      next.call(this, 0);
    };

    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var x;
      if (inNumSamples) {
        if (this._repeats < 0) {
          x = inputDemandA(this, 0, inNumSamples);
          this._repeats = isNaN(x) ? 0 : Math.floor(x + 0.5);
        }
        while (true) {
          if (this._repeatCount >= this._repeats) {
            out[0] = NaN;
            return;
          }
          if (isDemandInput(this, this._index)) {
            if (this._needToResetChild) {
              this._needToResetChild = false;
              resetDemandInput(this, this._index);
            }
            x = inputDemandA(this, this._index, inNumSamples);
            if (isNaN(x)) {
              this._index = ((Math.random() * (this.numOfInputs-1))|0)+1;
              this._repeatCount++;
              this._needToResetChild = true;
            } else {
              out[0] = x;
              return;
            }
          } else {
            out[0] = this.inputs[this._index][0];
            this._index = ((Math.random() * (this.numOfInputs-1))|0)+1;
            this._repeatCount++;
            this._needToResetChild = true;
            return;
          }
        }
      } else {
        this._repeats = -1;
        this._repeatCount = 0;
        this._needToResetChild = true;
        this._index = 1;
      }
    };

    return ctor;
  })();
  
  cc.ugen.specs.Duty = {
    $ar: {
      defaults: "dur=1,reset=0,level=1,doneAction=0",
      ctor: function(dur, reset, level, doneAction) {
        return this.multiNew(C.AUDIO, dur, reset, doneAction, level);
      }
    },
    $kr: {
      defaults: "dur=1,reset=0,level=1,doneAction=0",
      ctor: function(dur, reset, level, doneAction) {
        return this.multiNew(C.CONTROL, dur, reset, doneAction, level);
      }
    }
  };

  var duty_dur        = 0;
  var duty_reset      = 1;
  var duty_doneAction = 2;
  var duty_level      = 3;
  
  cc.unit.specs.Duty = (function() {
    var ctor = function() {
      if (this.inRates[duty_reset] === C.AUDIO) {
        this.process = next_da;
        this._prevreset = 0;
      } else {
        if (this.inRates[duty_reset] === C.DEMAND) {
          this.process = next_dd;
          this._prevreset = inputDemand(this, duty_reset) * this.rate.sampleRate;
        } else {
          this.process = next_dk;
          this._prevreset = 0;
        }
      }
      this._count   = inputDemand(this, duty_dur) * this.rate.sampleRate - 1;
      this._prevout = inputDemand(this, duty_level);
      this.outputs[0][0] = this._prevout;
    };
    var next_da = function(inNumSamples) {
      var out = this.outputs[0];
      var resetIn   = this.inputs[duty_reset];
      var prevout   = this._prevout;
      var count     = this._count;
      var prevreset = this._prevreset;
      var sr = this.rate.sampleRate;
      var zreset, x;
      for (var i = 0; i < inNumSamples; ++i) {
        zreset = resetIn[i];
        if (zreset > 0 && prevreset <= 0) {
          resetDemandInput(this, duty_level);
          resetDemandInput(this, duty_dur);
          count = 0;
        }
        if (count <= 0) {
          count = inputDemandA(this, duty_dur, i+1) * sr + count;
          if (isNaN(count)) {
            this.doneAction(this.inputs[3][duty_doneAction]);
          }
          x = inputDemandA(this, duty_level, i + 1);
          if (isNaN(x)) {
            x = prevout;
            this.doneAction(this.inputs[3][duty_doneAction]);
          } else {
            prevout = x;
          }
          out[i] = x;
        } else {
          count--;
          out[i] = prevout;
        }
      }
      this._count     = count;
      this._prevreset = prevreset;
      this._prevout   = prevout;
    };
    var next_dk = function(inNumSamples) {
      var out = this.outputs[0];
      var resetIn   = this.inputs[duty_reset];
      var prevout   = this._prevout;
      var count     = this._count;
      var prevreset = this._prevreset;
      var sr = this.rate.sampleRate;
      var zreset, x;
      zreset = resetIn[0];
      for (var i = 0; i < inNumSamples; ++i) {
        if (zreset > 0 && prevreset <= 0) {
          resetDemandInput(this, duty_level);
          resetDemandInput(this, duty_dur);
          count = 0;
        }
        if (count <= 0) {
          count = inputDemandA(this, duty_dur, i+1) * sr + count;
          if (isNaN(count)) {
            this.doneAction(this.inputs[duty_doneAction][0]);
          }
          x = inputDemandA(this, duty_level, i + 1);
          if (isNaN(x)) {
            x = prevout;
            this.doneAction(this.inputs[duty_doneAction][0]);
          } else {
            prevout = x;
          }
          out[i] = x;
        } else {
          count--;
          out[i] = prevout;
        }
      }
      this._count     = count;
      this._prevreset = prevreset;
      this._prevout   = prevout;
    };
    var next_dd = function(inNumSamples) {
      var out = this.outputs[0];
      var prevout = this._prevout;
      var count   = this._count;
      var reset   = this._prevreset;
      var sr = this.rate.sampleRate;
      var x;
      
      for (var i = 0; i < inNumSamples; ++i) {
        if (reset <= 0) {
          resetDemandInput(this, duty_level);
          resetDemandInput(this, duty_dur);
          count = 0;
          reset = inputDemandA(this, duty_reset, i + 1) * sr + reset;
        } else {
          reset--;
        }
        if (count <= 0) {
          count = inputDemandA(this, duty_dur, i+1) * sr + count;
          if (isNaN(count)) {
            this.doneAction(this.inputs[duty_doneAction][0]);
          }
          x = inputDemandA(this, duty_level, i + 1);
          if (isNaN(x)) {
            x = prevout;
            this.doneAction(this.inputs[duty_doneAction][0]);
          } else {
            prevout = x;
          }
          out[i] = x;
        }
        out[i] = prevout;
        count--;
      }
      this._count     = count;
      this._prevreset = reset;
      this._prevout   = prevout;
    };
    return ctor;
  })();
                        
  
  cc.ugen.specs.TDuty = {
    $ar: {
      defaults: "dur=1,reset=0,level=1,doneAction=0,gapFirst=0",
      ctor: function(dur, reset, level, doneAction, gapFirst) {
        return this.multiNew(C.AUDIO, dur, reset, doneAction, level, gapFirst);
      }
    },
    $kr: {
      defaults: "dur=1,reset=0,level=1,doneAction=0,gapFirst=0",
      ctor: function(dur, reset, level, doneAction, gapFirst) {
        return this.multiNew(C.CONTROL, dur, reset, doneAction, level, gapFirst);
      }
    }
  };

  cc.unit.specs.TDuty = (function() {
    var ctor = function() {
      if (this.inRates[duty_reset] === C.AUDIO) {
        this.process = next_da;
        this._prevreset = 0;
      } else {
        if (this.inRates[duty_reset] === C.DEMAND) {
          this.process = next_dd;
          this._prevreset = inputDemand(this, duty_reset) * this.rate.sampleRate;
        } else {
          this.process = next_dk;
          this._prevreset = 0;
        }
      }
      if (this.inputs[4][0]) {
        this._count = inputDemand(this, duty_dur) * this.rate.sampleRate;
      } else {
        this._count = 0;
      }
      this.outputs[0][0] = 0;
    };
    var next_da = function(inNumSamples) {
      var out = this.outputs[0];
      var resetIn = this.inputs[duty_reset];
      var count = this._count;
      var prevreset = this._prevreset;
      var sr = this.rate.sampleRate;
      var zreset, x;
      for (var i = 0; i < inNumSamples; ++i) {
        zreset = resetIn[i];
        if (zreset > 0 && prevreset <= 0) {
          resetDemandInput(this, duty_level);
          resetDemandInput(this, duty_dur);
          count = 0;
        }
        if (count <= 0) {
          count = inputDemandA(this, duty_dur, 1 + 1) * sr + count;
          if (isNaN(count)) {
            this.doneAction(this.inputs[duty_doneAction][0]);
          }
          x = inputDemandA(this, duty_level, i + 1);
          if (isNaN(x)) {
            x = 0;
          }
          out[i] = x;
        } else {
          out[i] = 0;
        }
        count--;
        prevreset = zreset;
      }
      this._count = count;
      this._prevreset = prevreset;
    };
    var next_dk = function(inNumSamples) {
      var out = this.outputs[0];
      var resetIn = this.inputs[duty_reset];
      var count = this._count;
      var prevreset = this._prevreset;
      var sr = this.rate.sampleRate;
      var zreset, x;
      zreset = resetIn[0];
      for (var i = 0; i < inNumSamples; ++i) {
        if (zreset > 0 && prevreset <= 0) {
          resetDemandInput(this, duty_level);
          resetDemandInput(this, duty_dur);
          count = 0;
        }
        if (count <= 0) {
          count = inputDemandA(this, duty_dur, 1 + 1) * sr + count;
          if (isNaN(count)) {
            this.doneAction(this.inputs[duty_doneAction][0]);
          }
          x = inputDemandA(this, duty_level, i + 1);
          if (isNaN(x)) {
            x = 0;
          }
          out[i] = x;
        } else {
          out[i] = 0;
        }
        count--;
        prevreset = zreset;
      }
      this._count = count;
      this._prevreset = prevreset;
    };
    var next_dd = function(inNumSamples) {
      var out = this.outputs[0];
      var count = this._count;
      var reset = this._prevreset;
      var sr = this.rate.sampleRate;
      var x;
      for (var i = 0; i < inNumSamples; ++i) {
        if (reset <= 0) {
          resetDemandInput(this, duty_level);
          resetDemandInput(this, duty_dur);
          count = 0;
          reset = inputDemandA(this, duty_reset, i + 1) * sr + reset;
        } else {
          reset--;
        }
        if (count <= 0) {
          count = inputDemandA(this, duty_dur, 1 + 1) * sr + count;
          if (isNaN(count)) {
            this.doneAction(this.inputs[duty_doneAction][0]);
          }
          x = inputDemandA(this, duty_level, i + 1);
          if (isNaN(x)) {
            x = 0;
          }
          out[i] = x;
        } else {
          out[i] = 0;
        }
        count--;
      }
      this._count = count;
      this._prevreset = reset;
    };
    return ctor;
  })();
  
  module.exports = {};

});
