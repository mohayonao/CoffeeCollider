define(function(require, exports, module) {
  "use strict";

  var install = function(namespace) {
    Object.keys(calcFunc).forEach(function(key) {
      var func = calcFunc[key];
      Number.prototype[key] = function() {
        return func(this);
      };
      Array.prototype[key] = function() {
        return this.map(function(i) {
          return i[key]();
        });
      };
      Boolean.prototype[key] = function() {
        return func(+this);
      };
      String.prototype[key] = function() {
        return func(+this);
      };
      namespace.register(key);
    });
  };

  var calcFunc = {};

  calcFunc.num = function(a) {
    return +a;
  };
  calcFunc.neg = function(a) {
    return -a;
  };
  calcFunc.not = function(a) {
    return !a;
  };
  calcFunc.tilde = function(a) {
    return ~a;
  };

  module.exports = {
    install: install
  };

});
