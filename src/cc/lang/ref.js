define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var utils = require("./utils");
  
  var Ref = (function() {
    function Ref(value) {
      this.klassName = "Ref";
      this._value = value;
    }
    Ref.prototype.value = function() {
      return this._value;
    };
    Ref.prototype.asUGenInput = function() {
      return this;
    };
    Ref.prototype.dereference = Ref.prototype.value;
    Ref.prototype.multichannelExpandRef = function(rank) {
      var list = utils.asArray(this._value);
      if (utils.maxSizeAtDepth(list, rank) <= 1) {
        return this;
      }
      var reflist = utils.flopDeep(list, rank).map(function(item) {
        return new Ref(item);
      });
      return utils.unbubble(reflist, 0, 1);
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
