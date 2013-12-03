define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var extend = require("../common/extend");
  var slice = [].slice;
  
  var SyncBlock = (function() {
    function SyncBlock(init) {
      this.klassName = "SyncBlock";
      if (init instanceof SyncBlock) {
        this._segments = init._segments;
      } else if (typeof init === "function") {
        this._segments = init();
      } else {
        this._segments = [];
      }
      this._state = this._segments.length ? C.PLAYING : C.FINISHED;
      this._pc = 0;
      this._paused = false;
      this._child  = null;
    }
    extend(SyncBlock, cc.Object);
    
    SyncBlock.prototype.clone = function() {
      return new SyncBlock(this);
    };
    
    SyncBlock.prototype.reset = function() {
      this._state = this._segments.length ? C.PLAYING : C.FINISHED;
      this._pc = 0;
    };
    
    SyncBlock.prototype.perform = function() {
      var segments = this._segments;
      var pc = this._pc, pcmax = segments.length;
      var args = slice.call(arguments);
      var result;

      if (this._child) {
        this.perform.apply(this._child, args);
        if (this._child._state === C.PLAYING) {
          return;
        }
        this._child = null;
      }
      
      cc.currentSyncBlock = this;
      this._paused = false;
      while (pc < pcmax) {
        result = segments[pc++].apply(null, args);
        if (this._paused) {
          break;
        }
        if (result instanceof SyncBlock) {
          this._child = result;
          break;
        }
      }
      if (pcmax <= pc && !(this._paused)) {
        this._state = C.FINISHED;
      }
      this._paused = false;
      cc.currentSyncBlock = null;
      this._pc = pc;
    };
    
    SyncBlock.prototype.performWait = function() {
      return this._state === C.PLAYING;
    };
    
    SyncBlock.prototype.performWaitState = SyncBlock.prototype.performWait;
    
    return SyncBlock;
  })();
  
  cc.global.syncblock = function(init) {
    return new SyncBlock(init);
  };
  cc.instanceOfSyncBlock = function(obj) {
    return obj instanceof SyncBlock;
  };
  cc.pauseSyncBlock = function() {
    if (cc.currentSyncBlock) {
      cc.currentSyncBlock._paused = true;
    }
  };
  
  module.exports = {
    SyncBlock: SyncBlock,
  };

});
