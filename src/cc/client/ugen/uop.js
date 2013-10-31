define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var extend = require("../../common/extend");
  var ops    = require("../../common/ops");
  
  var UnaryOpUGen = (function() {
    function UnaryOpUGen(selector, a) {
      cc.UGen.call(this, "UnaryOpUGen");
      init.call(this, selector, a);
    }
    extend(UnaryOpUGen, cc.UGen);

    var init = function(selector, a) {
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
  
  var use = function() {
    cc.createUnaryOpUGen = function(selector, a) {
      return new UnaryOpUGen(selector, a);
    };
    cc.instanceOfUnaryOpUGen = function(obj) {
      return obj instanceof UnaryOpUGen;
    };
  };
  
  exports = function() {
  };

  module.exports = {
    use:use, exports:exports
  };

});
