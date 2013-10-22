define(function(require, exports, module) {
  "use strict";

  var Emitter = (function() {
    function Emitter(context) {
      this.__context   = context || this;
      this.__callbacks = {};
    }
    Emitter.prototype.getListeners = function(event) {
      return this.__callbacks[event] || (this.__callbacks[event] = []);
    };
    Emitter.prototype.hasListeners = function(event) {
      return this.getListeners(event).length > 0;
    };
    Emitter.prototype.on = function(event, callback) {
      var __callbacks = this.getListeners(event);
      if (__callbacks.indexOf(callback) === -1) {
        __callbacks.push(callback);
      }
      return this;
    };
    Emitter.prototype.once = function(event, callback) {
      var that = this;
      function wrapper() {
        that.off(event, wrapper);
        callback.apply(that.__context, arguments);
      }
      wrapper.callback = callback;
      this.on(event, wrapper);
      return this;
    };
    Emitter.prototype.off = function(event, callback) {
      if (arguments.length === 0) {
        this.__callbacks = {};
        return this;
      }
      var __callbacks = this.getListeners(event);
      if (arguments.length === 1) {
        __callbacks.splice(0);
        return this;
      }
      var index = __callbacks.indexOf(callback);
      if (index === -1) {
        for (var i = 0, imax = __callbacks.length; i < imax; ++i) {
          if (__callbacks[i].callback === callback) {
            index = i;
            break;
          }
        }
      }
      if (index !== -1) {
        __callbacks.splice(index, 1);
      }
      return this;
    };
    Emitter.prototype.emit = function(event) {
      var args = Array.prototype.slice.call(arguments, 1);
      var __callbacks = this.getListeners(event).slice(0);
      for (var i = 0, imax = __callbacks.length; i < imax; ++i) {
        __callbacks[i].apply(this.__context, args);
      }
      return this;
    };
    Emitter.bind = function(obj) {
      ["getListeners", "hasListeners", "on", "once", "off", "emit"].forEach(function(method) {
        if (!obj[method]) {
          obj[method] = Emitter.prototype[method];
        }
      });
      Emitter.call(obj);
      return obj;
    };
    return Emitter;
  })();

  module.exports = {
    Emitter: Emitter
  };

});
