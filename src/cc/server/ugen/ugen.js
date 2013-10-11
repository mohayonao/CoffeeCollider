define(function(require, exports, module) {
  "use strict";

  var fn = require("../fn");
  var C  = fn.constant;
  var array = require("../array.impl");
  var slice = [].slice;

  var UGen = (function() {
    function UGen() {
      this.name = "UGen";
      this.specialIndex = 0;
      this.rate   = C.AUDIO;
      this.inputs = [];
    }

    UGen.prototype.$new1 = function(rate) {
      var args = slice.call(arguments, 1);
      this.rate = rate;
      return this.initialize.apply(this, args);
    };
    UGen.prototype.$multiNew = function() {
      return this.multiNewList(slice.call(arguments));
    };
    UGen.prototype.$multiNewList = function(list) {
      var zipped = array.zip.apply(null, list);
      if (zipped.length === 1) {
        return this.new1.apply(this, list);
      }
      return zipped.map(function(list) {
        return this.constructor.multiNewList(list);
      }, this);
    };
    fn.classmethod(UGen);

    UGen.prototype.initialize = function() {
      this.inputs = slice.call(arguments);
      return this;
    };

    UGen.prototype.toString = function() {
      return this.name;
    };
    
    return UGen;
  })();

  var install = function() {
  };

  module.exports = {
    UGen: UGen,
    install: install,
  };

});
