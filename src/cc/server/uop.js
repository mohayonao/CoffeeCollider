define(function(require, exports, module) {
  "use strict";

  var install = function(namespace) {
    Number.prototype.num = function() {
      return +this;
    };
    Boolean.prototype.num = function() {
      return +this;
    };
    Array.prototype.num = function() {
      return this.map(function(i) {
        return i.num();
      });
    };
    String.prototype.num = function() {
      return +this;
    };
    namespace.num = function(that) {
      return that.num();
    };
    
    Number.prototype.neg = function() {
      return -this;
    };
    Boolean.prototype.neg = function() {
      return !this;
    };
    Array.prototype.neg = function() {
      return this.map(function(i) {
        return i.neg();
      });
    };
    String.prototype.neg = function() {
      return this;
    };
    namespace.neg = function(that) {
      return that.neg();
    };

    Number.prototype.not = function() {
      return !this;
    };
    Boolean.prototype.not = function() {
      return !this;
    };
    Array.prototype.not = function() {
      return this.map(function(i) {
        return i.not();
      });
    };
    String.prototype.not = function() {
      return !this;
    };
    namespace.not = function(that) {
      return that.not();
    };

    Number.prototype.tilde = function() {
      return ~this;
    };
    Boolean.prototype.tilde = function() {
      return this;
    };
    Array.prototype.tilde = function() {
      return this.map(function(i) {
        return i.tilde();
      });
    };
    String.prototype.tilde = function() {
      return this;
    };
    namespace.tilde = function(that) {
      return that.tilde();
    };
    
  };

  module.exports = {
    install: install
  };

});
