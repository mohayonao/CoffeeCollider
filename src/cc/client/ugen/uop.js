define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var extend = require("../../common/extend");
  var ops    = require("../../common/ops");
  
  var UnaryOpUGen = (function() {
    function UnaryOpUGen() {
      cc.UGen.call(this, "UnaryOpUGen");
    }
    extend(UnaryOpUGen, cc.UGen);

    UnaryOpUGen.prototype.init = function(selector, a) {
      var index = ops.UNARY_OP_UGEN_MAP.indexOf(selector);
      if (index === -1) {
        throw new TypeError("UnaryOpUGen: unknown operator '" + selector + "'");
      }
      var rate = a.rate|C.SCALAR;
      cc.UGen.prototype.init.call(this, rate);
      this.op = selector;
      this.specialIndex = index;
      this.inputs = [a];
      this.numOfInputs = 1;
      return this;
    };

    return UnaryOpUGen;
  })();
  
  
  module.exports = {
    use: function() {
      cc.createUnaryOpUGen = function(selector, a) {
        return new UnaryOpUGen().init(selector, a);
      };
      cc.instanceOfUnaryOpUGen = function(obj) {
        return obj instanceof UnaryOpUGen;
      };
    }
  };

});
