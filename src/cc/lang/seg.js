define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var extend = require("../common/extend");
  var slice = [].slice;
  
  var SegmentedFunction = (function() {
    function SegmentedFunction(init) {
      this.klassName = "SegmentedFunction";
      if (init instanceof SegmentedFunction) {
        this._segments = init._segments;
      } else if (typeof init === "function") {
        this._segments = init();
      } else {
        this._segments = [];
      }
      this._state = this._segments.length ? C.PLAYING : C.FINISHED;
      this._pc = 0;
      this._paused = false;
    }
    extend(SegmentedFunction, cc.Object);
    
    SegmentedFunction.prototype.clone = function() {
      return new SegmentedFunction(this);
    };
    
    SegmentedFunction.prototype.reset = function() {
      this._state = this._segments.length ? C.PLAYING : C.FINISHED;
      this._pc = 0;
    };
    
    SegmentedFunction.prototype.perform = function() {
      var segments = this._segments;
      var pc = this._pc, pcmax = segments.length;
      var args = slice.call(arguments);
      
      cc.currentSegmentedFunction = this;
      this._paused = false;
      while (pc < pcmax) {
        segments[pc++].apply(null, args);
        if (this._paused) {
          break;
        }
      }
      if (pcmax <= pc && !(this._paused)) {
        this._state = C.FINISHED;
      }
      this._paused = false;
      cc.currentSegmentedFunction = null;
      this._pc = pc;
    };
    
    SegmentedFunction.prototype.performWait = function() {
      return this._state === C.PLAYING;
    };
    
    SegmentedFunction.prototype.performWaitState = SegmentedFunction.prototype.performWait;
    
    return SegmentedFunction;
  })();
  
  cc.global.SegmentedFunction = function(init) {
    return new SegmentedFunction(init);
  };
  cc.instanceOfSegmentedFunction = function(obj) {
    return obj instanceof SegmentedFunction;
  };
  cc.pauseSegmentedFunction = function() {
    if (cc.currentSegmentedFunction) {
      cc.currentSegmentedFunction._paused = true;
    }
  };
  
  module.exports = {
    SegmentedFunction: SegmentedFunction,
  };

});
