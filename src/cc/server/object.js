define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  
  var setup = function(key, func) {
    [cc.Object, Array, Boolean, Date, Function, Number, String].forEach(function(Klass) {
      Klass.prototype[key] = func;
    });
  };

  var install = function() {
    setup("__plus__", function() {
      return +this;
    });
    setup("__minus__", function() {
      return -this;
    });
    setup("__add__", function(b) {
      return this + b;
    });
    setup("__sub__", function(b) {
      return this - b;
    });
    setup("__mod__", function(b) {
      return this * b;
    });
    setup("__div__", function(b) {
      return this / b;
    });
    setup("__mod__", function(b) {
      return this % b;
    });
    setup("__and__", function(b) {
      return this && b;
    });
    setup("__or__", function(b) {
      return this || b;
    });
    setup("next", function() {
      return this;
    });
  };
  
  module.exports = {
    install: install
  };

});
