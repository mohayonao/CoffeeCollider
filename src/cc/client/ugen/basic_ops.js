define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var extend = require("../../common/extend");
  var utils = require("../utils");
  var UGen  = require("./ugen").UGen;

  var asRate = function(obj) {
    if (Array.isArray(obj)) {
      return obj.reduce(function(rate, obj) {
        return Math.max(rate, asRate(obj));
      }, 0);
    }
    return (obj && obj.rate) || 0;
  };

  var UNARY_OP_UGEN_MAP = "num neg not tilde".split(" ");

  var UnaryOpUGen = (function() {
    function UnaryOpUGen() {
      UGen.call(this, "UnaryOpUGen");
    }
    extend(UnaryOpUGen, UGen);

    UnaryOpUGen.prototype.init = function(selector, a) {
      var index = UNARY_OP_UGEN_MAP.indexOf(selector);
      if (index === -1) {
        throw new TypeError("UnaryOpUGen: unknown operator '" + selector + "'");
      }
      var rate = a.rate|C.SCALAR;
      UGen.prototype.init.call(rate);
      this.op = selector;
      this.specialIndex = index;
      this.inputs = [a];
      this.numOfInputs = 1;
      return this;
    };

    return UnaryOpUGen;
  })();

  var BINARY_OP_UGEN_MAP = "+ - * / %".split(" ");

  var BinaryOpUGen = (function() {
    function BinaryOpUGen() {
      UGen.call(this, "BinaryOpUGen");
    }
    extend(BinaryOpUGen, UGen);

    BinaryOpUGen.prototype.init = function(selector, a, b) {
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
            return new MulAdd().init(a.inputs[0], a.inputs[1], b);
          }
        } else if (a instanceof MulAdd) {
          if (typeof a.inputs[2] === "number" && typeof b === "number") {
            if (a.inputs[2] + b === 0) {
              return new BinaryOpUGen().init("*!", a.inputs[0], a.inputs[1]);
            } else {
              a.inputs[2] += b;
              return a;
            }
          }
          b = new BinaryOpUGen().init("+", a.inputs[2], b);
          a = new BinaryOpUGen().init("*!", a.inputs[0], a.inputs[1]);
          return new BinaryOpUGen().init("+", a, b);
        }
        return optimizeSumObjects(a, b);
      }
      if (selector === "+!") {
        selector = "+";
      } else if (selector === "*!") {
        selector = "*";
      }
      
      var index = BINARY_OP_UGEN_MAP.indexOf(selector);
      if (index === -1) {
        throw new TypeError("BinaryOpUGen: unknown operator '" + selector + "'");
      }
      var rate = Math.max(a.rate|C.SCALAR, b.rate|C.SCALAR);
      UGen.prototype.init.call(this, rate);
      this.op = selector;
      this.specialIndex = index;
      this.inputs = [a, b];
      this.numOfInputs = 2;
      return this;
    };

    return BinaryOpUGen;
  })();

  var MulAdd = (function() {
    function MulAdd() {
      UGen.call(this, "MulAdd");
    }
    extend(MulAdd, UGen);

    MulAdd.prototype.init = function(_in, mul, add) {
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
        return new BinaryOpUGen().init("*", _in, -1);
      }
      if (noadd) {
        return new BinaryOpUGen().init("*", _in, mul);
      }
      if (minus) {
        return new BinaryOpUGen().init("-", add, _in);
      }
      if (nomul) {
        return new BinaryOpUGen().init("+", _in, add);
      }
      if (validate(_in, mul, add)) {
        return init.call(this, _in, mul, add);
      }
      if (validate(mul, _in, add)) {
        return init.call(this, mul, _in, add);
      }
      return _in * mul + add;
    };

    var init = function(_in, mul, add) {
      var rate = asRate([_in, mul, add]);
      return UGen.prototype.init.apply(this, [rate, _in, mul, add]);
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
      UGen.call(this, "Sum3");
    }
    extend(Sum3, UGen);
    
    Sum3.prototype.init = function(in0, in1, in2) {
      if (in0 === 0) {
        return new BinaryOpUGen().init("+", in1, in2);
      }
      if (in1 === 0) {
        return new BinaryOpUGen().init("+", in0, in2);
      }
      if (in2 === 0) {
        return new BinaryOpUGen().init("+", in0, in1);
      }
      var rate = asRate([in0, in1, in2]);
      var sortedArgs = [in0, in1, in2].sort(function(a, b) {
        return b.rate - a.rate;
      });
      return UGen.prototype.init.apply(this, [rate].concat(sortedArgs));
    };
    
    return Sum3;
  })();

  var Sum4 = (function() {
    function Sum4() {
      UGen.call(this, "Sum4");
    }
    extend(Sum4, UGen);
    
    Sum4.prototype.init = function(in0, in1, in2, in3) {
      if (in0 === 0) {
        return new Sum3().init(in1, in2, in3);
      }
      if (in1 === 0) {
        return new Sum3().init(in0, in2, in3);
      }
      if (in2 === 0) {
        return new Sum3().init(in0, in1, in3);
      }
      if (in3 === 0) {
        return new Sum3().init(in0, in1, in2);
      }
      var rate = asRate([in0, in1, in2, in3]);
      var sortedArgs = [in0, in1, in2, in3].sort(function(a, b) {
        return b.rate - a.rate;
      });
      return UGen.prototype.init.apply(this, [rate].concat(sortedArgs));
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
        case 4: return new Sum4().init(a[0], a[1], a[2], a[3]);
        case 3: return new Sum3().init(a[0], a[1], a[2]);
        case 2: return new BinaryOpUGen().init("+!", a[0], a[1]);
        case 1: return a[0];
        }
      });
      switch (a.length) {
      case 4: return new Sum4().init(a[0], a[1], a[2], a[3]);
      case 3: return new Sum4().init(a[0], a[1], a[2]);
      case 2: return new BinaryOpUGen().init("+!", a[0], a[1]);
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
        return new BinaryOpUGen().init("+!", list[0][0], list[0][1]);
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
          return new BinaryOpUGen().init("*!", a[0], a[1]);
        } else {
          return a[0];
        }
      });
      switch (a.length) {
      case 2:
        return new BinaryOpUGen().init("*!", a[0], a[1]);
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
        return new BinaryOpUGen().init("*!", list[0][0], list[0][1]);
      }
      return work(list);
    };
  })();
  
  exports = function() {
  };

  cc.emit("basic_ops.js", {
    UnaryOpUGen : UnaryOpUGen,
    BinaryOpUGen: BinaryOpUGen,
    MulAdd      : MulAdd,
  });
  
  module.exports = {
    UnaryOpUGen : UnaryOpUGen,
    BinaryOpUGen: BinaryOpUGen,
    MulAdd: MulAdd,
    Sum3: Sum3,
    Sum4: Sum4,
    UNARY_OP_UGEN_MAP : UNARY_OP_UGEN_MAP,
    BINARY_OP_UGEN_MAP: BINARY_OP_UGEN_MAP,
    exports: exports,
  };

});
