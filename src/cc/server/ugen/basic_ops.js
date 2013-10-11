define(function(require, exports, module) {
  "use strict";

  var fn = require("../fn");
  var C  = fn.constant;
  var array = require("../array").impl;
  var UGen  = require("./ugen").UGen;

  var asRate = function(obj) {
    if (Array.isArray(obj)) {
      return obj.reduce(function(rate, obj) {
        return Math.max(rate, asRate(obj));
      }, 0);
    }
    return (obj && obj.rate) || 0;
  };

  var UnaryOpUGen = (function() {
    function UnaryOpUGen() {
      UGen.call(this);
    }
    fn.extend(UnaryOpUGen, UGen);

    UnaryOpUGen.prototype.$new = function(selector, a) {
      return this.multiNew(C.AUDIO, selector, a);
    };

    fn.classmethod(UnaryOpUGen);

    UnaryOpUGen.prototype.initialize = function(op, a) {
      this.op = op;
      var index = C.UNARY_OP_UGEN_MAP.indexOf(op);
      if (index === -1) {
        throw "Unknown operator: " + op;
      }
      this.specialIndex = index;
      this.rate   = a.rate|C.SCALAR;
      this.inputs = [a];
      return this;
    };

    return UnaryOpUGen;
  })();

  var BinaryOpUGen = (function() {
    function BinaryOpUGen() {
      UGen.call(this);
    }
    fn.extend(BinaryOpUGen, UGen);

    BinaryOpUGen.prototype.$new = function(selector, a, b) {
      return this.multiNew(null, selector, a, b);
    };
    BinaryOpUGen.prototype.$new1 = function(rate, selector, a, b) {
      if (selector === "-" && typeof b === "number") {
        selector = "+";
        b = -b;
      }
      if (selector === "/" && typeof b === "number") {
        selector = "*";
        b = 1 / b; // TODO: div(0) ?
      }
      if (selector === "*") {
        if (typeof a === "number" && typeof b === "number") {
          return a * b;
        } else if (a === 0 || b === 0) {
          return 0;
        }
        return optimizeMulObjects(a, b);
      }
      if (selector === "+") {
        if (typeof a === "number" && typeof b === "number") {
          return a + b;
        } else if (a === 0) {
          return b;
        } else if (b === 0) {
          return a;
        } else if (a instanceof BinaryOpUGen) {
          if (a.op === "*") {
            return MulAdd.new1(null, a.inputs[0], a.inputs[1], b);
          }
        } else if (a instanceof MulAdd) {
          if (typeof a.inputs[2] === "number" && typeof b === "number") {
            if (a.inputs[2] + b === 0) {
              return BinaryOpUGen.new1(null, "*!", a.inputs[0], a.inputs[1]);
            } else {
              a.inputs[2] += b;
              return a;
            }
          }
          b = BinaryOpUGen.new1(null, "+", a.inputs[2], b);
          a = BinaryOpUGen.new1(null, "*!", a.inputs[0], a.inputs[1]);
          return BinaryOpUGen.new1(null, "+", a, b);
        }
        return optimizeSumObjects(a, b);
      }
      if (selector === "+!") {
        selector = "+";
      } else if (selector === "*!") {
        selector = "*";
      }
      return UGen.new1.apply(this, [C.AUDIO].concat(selector, a, b));
    };
    fn.classmethod(BinaryOpUGen);

    BinaryOpUGen.prototype.initialize = function(op, a, b) {
      this.op = op;
      var index = C.BINARY_OP_UGEN_MAP.indexOf(op);
      if (index === -1) {
        throw "Unknown operator: " + op;
      }
      this.specialIndex = index;
      this.rate = Math.max(a.rate|C.SCALAR, b.rate|C.SCALAR);
      this.inputs = [a, b];
      return this;
    };

    BinaryOpUGen.prototype.toString = function() {
      return "BinaryOpUGen(" + this.op + ")";
    };
    
    return BinaryOpUGen;
  })();

  var MulAdd = (function() {
    function MulAdd() {
      UGen.call(this);
    }
    fn.extend(MulAdd, UGen);

    MulAdd.prototype.$new = function(_in, mul, add) {
      return this.multiNew(null, _in, mul, add);
    };
    MulAdd.prototype.$new1 = function(rate, _in, mul, add) {
      var t, minus, nomul, noadd;
      if (_in.rate - mul.rate < 0) {
        t = _in; _in = mul; mul = t;
      }
      if (mul === 0) {
        return add;
      }
      minus = mul === -1;
      nomul = mul ===  1;
      noadd = add ===  0;

      if (nomul && noadd) {
        return _in;
      }
      if (minus && noadd) {
        return BinaryOpUGen.new1(null, "*", _in, -1);
      }
      if (noadd) {
        return BinaryOpUGen.new1(null, "*", _in, mul);
      }
      if (minus) {
        return BinaryOpUGen.new1(null, "-", add, _in);
      }
      if (nomul) {
        return BinaryOpUGen.new1(null, "+", _in, add);
      }
      if (validate(_in, mul, add)) {
        return UGen.new1.apply(this, [C.AUDIO].concat(_in, mul, add));
      }
      if (validate(mul, _in, add)) {
        return UGen.new1.apply(this, [C.AUDIO].concat(mul, _in, add));
      }
      return _in * mul + add;
    };
    fn.classmethod(MulAdd);

    MulAdd.prototype.initialize = function(_in, mul, add) {
      var argArray = [_in, mul, add];
      this.inputs = argArray;
      this.rate   = asRate(argArray);
      return this;
    };
    MulAdd.prototype.toString = function() {
      return "MulAdd";
    };

    var validate = function(_in, mul, add) {
      _in = asRate(_in);
      mul = asRate(mul);
      add = asRate(add);
      if (_in === C.AUDIO) {
        return true;
      }
      if (_in === C.CONTROL &&
          (mul === C.CONTROL || mul === C.SCALAR) &&
          (add === C.CONTROL || add === C.SCALAR)) {
        return true;
      }
      return false;
    };

    return MulAdd;
  })();

  var Sum3 = (function() {
    function Sum3() {
      UGen.call(this);
    }
    fn.extend(Sum3, UGen);

    Sum3.prototype.$new = function(in0, in1, in2) {
      return this.multiNew(null, in0, in1, in2);
    };
    Sum3.prototype.$new1 = function(dummyRate, in0, in1, in2) {
      if (in0 === 0) {
        return BinaryOpUGen.new1(null, "+", in1, in2);
      }
      if (in1 === 0) {
        return BinaryOpUGen.new1(null, "+", in0, in2);
      }
      if (in2 === 0) {
        return BinaryOpUGen.new1(null, "+", in0, in1);
      }
      var argArray = [in0, in1, in2];
      var rate = asRate(argArray);
      var sortedArgs = argArray.sort(function(a, b) {
        return b.rate - a.rate;
      });
      return UGen.new1.apply(this, [rate].concat(sortedArgs));
    };
    fn.classmethod(Sum3);

    Sum3.prototype.toString = function() {
      return "Sum3";
    };
    
    return Sum3;
  })();

  var Sum4 = (function() {
    function Sum4() {
      UGen.call(this);
    }
    fn.extend(Sum4, UGen);
    
    Sum4.prototype.$new = function(in0, in1, in2, in3) {
      return this.multiNew(null, in0, in1, in2, in3);
    };
    Sum4.prototype.$new1 = function(dummyRate, in0, in1, in2, in3) {
      if (in0 === 0) {
        return Sum3.new1(null, in1, in2, in3);
      }
      if (in1 === 0) {
        return Sum3.new1(null, in0, in2, in3);
      }
      if (in2 === 0) {
        return Sum3.new1(null, in0, in1, in3);
      }
      if (in3 === 0) {
        return Sum3.new1(null, in0, in1, in2);
      }
      var argArray = [in0, in1, in2, in3];
      var rate = asRate(argArray);
      var sortedArgs = argArray.sort(function(a, b) {
        return b.rate - a.rate;
      });
      return UGen.new1.apply(this, [rate].concat(sortedArgs));
    };
    fn.classmethod(Sum4);

    Sum4.prototype.toString = function() {
      return "Sum4";
    };
    
    return Sum4;
  })();

  var optimizeSumObjects = (function() {
    var collect = function(obj) {
      if (typeof obj === "number") {
        return obj;
      }
      var i = obj.inputs;
      if (obj instanceof BinaryOpUGen && obj.op === "+") {
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
        case 4: return Sum4.new1(null, a[0], a[1], a[2], a[3]);
        case 3: return Sum3.new1(null, a[0], a[1], a[2]);
        case 2: return BinaryOpUGen.new1(null, "+!", a[0], a[1]);
        case 1: return a[0];
        }
      });
      switch (a.length) {
      case 4: return Sum4.new1(null, a[0], a[1], a[2], a[3]);
      case 3: return Sum3.new1(null, a[0], a[1], a[2]);
      case 2: return BinaryOpUGen.new1(null, "+!", a[0], a[1]);
      case 1: return a[0];
      default: return work(array.clump(a, 4));
      }
    };
    return function(in1, in2) {
      var list = array.flatten([ collect(in1), collect(in2) ], Infinity, []);
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
      list = array.clump(list, 4);
      if (list.length === 1 && list[0].length === 2) {
        return BinaryOpUGen.new1(null, "+!", list[0][0], list[0][1]);
      }
      return work(list);
    };
  })();

  var optimizeMulObjects = (function() {
    var collect = function(obj) {
      if (typeof obj === "number") { return obj; }
      var i = obj.inputs;
      if (obj instanceof BinaryOpUGen && obj.op === "*") {
        return [ collect(i[0]), collect(i[1]) ];
      }
      return obj;
    };
    var work = function(a) {
      a = a.map(function(a) {
        if (a.length === 2) {
          return BinaryOpUGen.new1(null, "*!", a[0], a[1]);
        } else {
          return a[0];
        }
      });
      switch (a.length) {
      case 2:
        return BinaryOpUGen.new1(null, "*!", a[0], a[1]);
      case 1:
        return a[0];
      default:
        return work(array.clump(a, 2));
      }
    };
    return function(in1, in2) {
      var list = array.flatten([ collect(in1), collect(in2) ], Infinity, []);
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
      list = array.clump(list, 2);
      if (list.length === 1 && list[0].length === 2) {
        return BinaryOpUGen.new1(null, "*!", list[0][0], list[0][1]);
      }
      return work(list);
    };
  })();
  
  UGen.prototype.madd = fn(function(mul, add) {
    return MulAdd.new(this, mul, add);
  }).defaults("mul=1,add=0").build();
  
  module.exports = {
    UnaryOpUGen : UnaryOpUGen,
    BinaryOpUGen: BinaryOpUGen,
    MulAdd: MulAdd,
    Sum3: Sum3,
    Sum4: Sum4,
  };

});
