define(function(require, exports, module) {
  "use strict";

  var map = {};

  var FixNum = (function() {
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

  module.exports = {
    FixNum: FixNum
  };

});
