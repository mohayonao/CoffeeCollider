define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var extend = require("../common/extend");
  var ops    = require("../common/ops");
  var fn     = require("./fn");
  var utils  = require("./utils");

  var asRate = function(obj) {
    if (Array.isArray(obj)) {
      return obj.reduce(function(rate, obj) {
        return Math.max(rate, asRate(obj));
      }, 0);
    }
    if (obj) {
      switch (obj.rate) {
      case C.SCALAR: case C.CONTROL: case C.AUDIO:
        return obj.rate;
      }
    }
    return C.SCALAR;
  };
  
  var Control = (function() {
    function Control(rate) {
      cc.MultiOutUGen.call(this, "Control");
      this.rate   = rate;
      this.values = null;
    }
    extend(Control, cc.MultiOutUGen);
    
    Control.prototype.init = function(list) {
      cc.UGen.prototype.init.apply(this, [this.rate].concat(list));
      this.values = list.slice();
      return this.initOutputs(this.values.length, this.rate);
    };
    
    return Control;
  })();
  
  var UnaryOpUGen = (function() {
    function UnaryOpUGen() {
      cc.UGen.call(this, "UnaryOpUGen");
    }
    extend(UnaryOpUGen, cc.UGen);

    UnaryOpUGen.prototype.init = function(selector, a) {
      var index = ops.BINARY_OPS[selector];
      if (typeof index === "undefined") {
        throw new TypeError("UnaryOpUGen: unknown operator '" + selector + "'");
      }
      a = utils.asUGenInput(a);
      cc.UGen.prototype.init.call(this, asRate(a));
      this.selector = selector;
      this.specialIndex = index;
      this.inputs = [a];
      this.numOfInputs = 1;
      return this;
    };
    
    return UnaryOpUGen;
  })();
  
  var BinaryOpUGen = (function() {
    function BinaryOpUGen() {
      cc.UGen.call(this, "BinaryOpUGen");
    }
    extend(BinaryOpUGen, cc.UGen);
    
    BinaryOpUGen.prototype.init = function(selector, a, b) {
      a = utils.asUGenInput(a);
      b = utils.asUGenInput(b);
      if (typeof a === "number" && typeof b === "number") {
        switch (selector) {
        case "+": return utils.asUGenInput(a + b);
        case "-": return utils.asUGenInput(a - b);
        case "*": return utils.asUGenInput(a * b);
        case "/": return utils.asUGenInput(a / b);
        case "%": return utils.asUGenInput(a % b);
        }
      }
      
      if (selector === "-" && typeof b === "number") {
        selector = "+";
        b = -b;
      }
      if (selector === "/" && typeof b === "number") {
        selector = "*";
        b = 1 / b; // TODO: div(0) ?
      }
      if (selector === "*") {
        if (a === 0 || b === 0) {
          return 0;
        } else if (a === 1) {
          return b;
        } else if (b === 1) {
          return a;
        }
        return optimizeMulObjects(a, b);
      }
      if (selector === "+") {
        if (a === 0) {
          return b;
        } else if (b === 0) {
          return a;
        } else if (a instanceof BinaryOpUGen) {
          if (a.selector === "*") {
            return cc.createMulAdd(a.inputs[0], a.inputs[1], b);
          }
        } else if (a instanceof MulAdd) {
          if (typeof a.inputs[2] === "number" && typeof b === "number") {
            if (a.inputs[2] + b === 0) {
              return cc.createBinaryOpUGen("*!", a.inputs[0], a.inputs[1]);
            } else {
              a.inputs[2] += b;
              return a;
            }
          }
          b = cc.createBinaryOpUGen("+", a.inputs[2], b);
          a = cc.createBinaryOpUGen("*!", a.inputs[0], a.inputs[1]);
          return cc.createBinaryOpUGen("+", a, b);
        }
        return optimizeSumObjects(a, b);
      }
      if (selector === "+!") {
        selector = "+";
      } else if (selector === "*!") {
        selector = "*";
      }
      var index = ops.BINARY_OPS[selector];
      if (typeof index === "undefined") {
        throw new TypeError("BinaryOpUGen: unknown operator '" + selector + "'");
      }
      cc.UGen.prototype.init.call(this, asRate([a, b]));
      this.selector = selector;
      this.specialIndex = index;
      this.inputs = [a, b];
      this.numOfInputs = 2;
      return this;
    };
    
    return BinaryOpUGen;
  })();
  
  var optimizeSumObjects = (function() {
    var collect = function(obj) {
      if (typeof obj === "number") {
        return obj;
      }
      var i = obj.inputs;
      if (obj instanceof BinaryOpUGen && obj.selector === "+") {
        return [ collect(i[0]), collect(i[1]) ];
      } else if (obj instanceof Sum3) {
        return [ collect(i[0]), collect(i[1]), collect(i[2]) ];
      } else if (obj instanceof Sum4) {
        return [ collect(i[0]), collect(i[1]), collect(i[2]), collect(i[3]) ];
      }
      return obj;
    };
    var work = function(a) {
      a = a.map(function(a) {
        switch (a.length) {
        case 4: return cc.createSum4(a[0], a[1], a[2], a[3]);
        case 3: return cc.createSum3(a[0], a[1], a[2]);
        case 2: return cc.createBinaryOpUGen("+!", a[0], a[1]);
        case 1: return a[0];
        }
      });
      switch (a.length) {
      case 4: return cc.createSum4(a[0], a[1], a[2], a[3]);
      case 3: return cc.createSum4(a[0], a[1], a[2]);
      case 2: return cc.createBinaryOpUGen("+!", a[0], a[1]);
      case 1: return a[0];
      default: return work(utils.clump(a, 4));
      }
    };
    return function(in1, in2) {
      var list = utils.flatten([ collect(in1), collect(in2) ]);
      var fixnum = 0;
      list = list.filter(function(ugen) {
        if (typeof ugen === "number") {
          fixnum += ugen;
          return false;
        }
        return true;
      });
      if (fixnum !== 0) {
        list.push(fixnum);
      }
      list = utils.clump(list, 4);
      if (list.length === 1 && list[0].length === 2) {
        return cc.createBinaryOpUGen("+!", list[0][0], list[0][1]);
      }
      return work(list);
    };
  })();
  
  var optimizeMulObjects = (function() {
    var collect = function(obj) {
      if (typeof obj === "number") { return obj; }
      var i = obj.inputs;
      if (obj instanceof BinaryOpUGen && obj.selector === "*") {
        return [ collect(i[0]), collect(i[1]) ];
      }
      return obj;
    };
    var work = function(a) {
      a = a.map(function(a) {
        if (a.length === 2) {
          return cc.createBinaryOpUGen("*!", a[0], a[1]);
        } else {
          return a[0];
        }
      });
      switch (a.length) {
      case 2:
        return cc.createBinaryOpUGen("*!", a[0], a[1]);
      case 1:
        return a[0];
      default:
        return work(utils.clump(a, 2));
      }
    };
    return function(in1, in2) {
      var list = utils.flatten([ collect(in1), collect(in2) ]);
      var fixnum = 1;
      list = list.filter(function(ugen) {
        if (typeof ugen === "number") {
          fixnum *= ugen;
          return false;
        }
        return true;
      });
      if (fixnum !== 1) {
        list.push(fixnum);
      }
      list = utils.clump(list, 2);
      if (list.length === 1 && list[0].length === 2) {
        return cc.createBinaryOpUGen("*!", list[0][0], list[0][1]);
      }
      return work(list);
    };
  })();

  var MulAdd = (function() {
    function MulAdd() {
      cc.UGen.call(this, "MulAdd");
    }
    extend(MulAdd, cc.UGen);

    MulAdd.prototype.init = function(_in, mul, add) {
      var t, minus, nomul, noadd, rate;
      if (asRate(_in) < asRate(mul)) {
        t = _in; _in = mul; mul = t;
      }
      _in = utils.asUGenInput(_in);
      mul = utils.asUGenInput(mul);
      add = utils.asUGenInput(add);
      if (mul === 0) {
        return add;
      }
      if (typeof _in === "number" && typeof mul === "number") {
        _in *= mul;
        mul = 1;
      }
      
      minus = mul === -1;
      nomul = mul ===  1;
      noadd = add ===  0;
      
      if (nomul && noadd) {
        return _in;
      }
      if (minus && noadd) {
        return cc.createBinaryOpUGen("*", _in, -1);
      }
      if (noadd) {
        return cc.createBinaryOpUGen("*", _in, mul);
      }
      if (minus) {
        return cc.createBinaryOpUGen("-", add, _in);
      }
      if (nomul) {
        return cc.createBinaryOpUGen("+", _in, add);
      }
      rate = asRate([_in, mul, add]);
      return cc.UGen.prototype.init.apply(this, [rate, _in, mul, add]);
    };
    
    return MulAdd;
  })();
  
  var Sum3 = (function() {
    function Sum3() {
      cc.UGen.call(this, "Sum3");
    }
    extend(Sum3, cc.UGen);
    
    Sum3.prototype.init = function(in0, in1, in2) {
      if (in0 === 0) {
        return cc.createBinaryOpUGen("+", in1, in2);
      }
      if (in1 === 0) {
        return cc.createBinaryOpUGen("+", in0, in2);
      }
      if (in2 === 0) {
        return cc.createBinaryOpUGen("+", in0, in1);
      }
      var rate = asRate([in0, in1, in2]);
      var sortedArgs = [in0, in1, in2].sort(function(a, b) {
        return asRate(b) - asRate(a);
      });
      return cc.UGen.prototype.init.apply(this, [rate].concat(sortedArgs));
    };
    
    return Sum3;
  })();

  var Sum4 = (function() {
    function Sum4() {
      cc.UGen.call(this, "Sum4");
    }
    extend(Sum4, cc.UGen);
    
    Sum4.prototype.init = function(in0, in1, in2, in3) {
      if (in0 === 0) {
        return cc.createSum3(in1, in2, in3);
      }
      if (in1 === 0) {
        return cc.createSum3(in0, in2, in3);
      }
      if (in2 === 0) {
        return cc.createSum3(in0, in1, in3);
      }
      if (in3 === 0) {
        return cc.createSum3(in0, in1, in2);
      }
      var rate = asRate([in0, in1, in2, in3]);
      var sortedArgs = [in0, in1, in2, in3].sort(function(a, b) {
        return asRate(b) - asRate(a);
      });
      return cc.UGen.prototype.init.apply(this, [rate].concat(sortedArgs));
    };
    
    return Sum4;
  })();
  
  cc.ugen.specs.Out = {
    Klass: cc.Out,
    $ar: {
      defaults: "bus=0,channelsArray=0",
      ctor: function(bus, channelsArray) {
        cc.ugen.multiNewList(this, [C.AUDIO, bus].concat(channelsArray));
        return 0; // Out has no output
      }
    },
    $kr: {
      defaults: "bus=0,channelsArray=0",
      ctor: function(bus, channelsArray) {
        cc.ugen.multiNewList(this, [C.CONTROL, bus].concat(channelsArray));
        return 0; // Out has no output
      }
    }
  };
  
  cc.createControl = function(rate) {
    return new Control(rate);
  };
  cc.createUnaryOpUGen = function(selector, a) {
    return new UnaryOpUGen().init(selector, a);
  };
  cc.createBinaryOpUGen = fn(function(selector, a, b) {
    return new BinaryOpUGen().init(selector, a, b);
  }).multiCall().build();
  cc.createMulAdd = fn(function(_in, mul, add) {
    return new MulAdd().init(_in, mul, add);
  }).multiCall().build();
  cc.createSum3 = function(in0, in1, in2) {
    return new Sum3().init(in0, in1, in2);
  };
  cc.createSum4 = function(in0, in1, in2, in3) {
    return new Sum4().init(in0, in1, in2, in3);
  };
  
  module.exports = {
    Control: Control,
    UnaryOpUGen: UnaryOpUGen,
    BinaryOpUGen: BinaryOpUGen,
    MulAdd: MulAdd,
    Sum3: Sum3,
    Sum4: Sum4,
  };

});
