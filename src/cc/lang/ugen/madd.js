define(function(require, exports, module) {
  "use strict";
  
  var cc = require("../cc");
  var extend = require("../../common/extend");
  var fn     = require("../fn");
  
  var asRate = function(obj) {
    if (Array.isArray(obj)) {
      return obj.reduce(function(rate, obj) {
        return Math.max(rate, asRate(obj));
      }, 0);
    }
    return (obj && obj.rate) || 0;
  };
  
  var MulAdd = (function() {
    function MulAdd() {
      cc.UGen.call(this, "MulAdd");
    }
    extend(MulAdd, cc.UGen);

    MulAdd.prototype.init = function(_in, mul, add) {
      var t, minus, nomul, noadd, rate;
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
      if (validate(_in, mul, add)) {
        rate = asRate([_in, mul, add]);
        return cc.UGen.prototype.init.apply(this, [rate, _in, mul, add]);
      }
      if (validate(mul, _in, add)) {
        rate = asRate([mul, _in, add]);
        return cc.UGen.prototype.init.apply(this, [rate, mul, _in, add]);
      }
      return _in * mul + add;
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
        return b.rate - a.rate;
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
        return b.rate - a.rate;
      });
      return cc.UGen.prototype.init.apply(this, [rate].concat(sortedArgs));
    };
    
    return Sum4;
  })();
  
  
  module.exports = {
    use: function() {
      cc.createMulAdd = fn(function(_in, mul, add) {
        return new MulAdd().init(_in, mul, add);
      }).multiCall().build();
      cc.createSum3 = fn(function(in0, in1, in2) {
        return new Sum3().init(in0, in1, in2);
      }).multiCall().build();
      cc.createSum4 = fn(function(in0, in1, in2, in3) {
        return new Sum4().init(in0, in1, in2, in3);
      }).multiCall().build();
      cc.instanceOfMulAdd = function(obj) {
        return obj instanceof MulAdd;
      };
      cc.instanceOfSum3 = function(obj) {
        return obj instanceof Sum3;
      };
      cc.instanceOfSum4 = function(obj) {
        return obj instanceof Sum4;
      };
    }
  };

  module.exports.use();

});
