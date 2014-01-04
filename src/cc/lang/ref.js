define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");

  var Ref = (function() {
    function Ref(value) {
      this._value = value;
    }
    Ref.prototype.value = function() {
      return this._value;
    };
    return Ref;
  })();
  
  cc.global.$ = function(value) {
    return new Ref(value);
  };
  
  cc.instanceOfRef = function(obj) {
    return obj instanceof Ref;
  };
  
  module.exports = {
    Ref: Ref
  };

});
