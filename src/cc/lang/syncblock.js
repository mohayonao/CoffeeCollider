define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  
  var syncblock = function(init) {
    var func = function() {
      syncblock_reset.call(func);
      syncblock_perform.apply(func, arguments);
      return func._result;
    };
    
    if (init && init.isSyncBlock) {
      func._segments = init._segments;
    } else if (typeof init === "function") {
      func._segments = init();
    } else {
      func._segments = [];
    }
    func._state = func._segments.length ? C.PLAYING : C.FINISHED;
    func._pc = 0;
    func._paused = false;
    func._child  = null;
    func._result = undefined;
    
    func.isSyncBlock = true;
    func.clone = syncblock_clone;
    func.reset = syncblock_reset;
    func.perform = syncblock_perform;
    func.performWait      = syncblock_performWait;
    func.performWaitState = syncblock_performWaitState;
    
    return func;
  };
  
  var syncblock_clone = function() {
    return syncblock(this);
  };

  var syncblock_reset = function() {
    this._state = this._segments.length ? C.PLAYING : C.FINISHED;
    this._pc = 0;
    this._paused = false;
    this._child  = null;
    this._result = undefined;
  };
  
  var syncblock_perform = function() {
    var segments = this._segments;
    var pc = this._pc, pcmax = segments.length;
    var result;
    
    if (this._state === C.FINISHED) {
      return;
    }
    
    if (this._child) {
      this.perform.apply(this._child, arguments);
      if (this._child._state === C.PLAYING) {
        return;
      }
      this._child = null;
    }
    
    cc.currentSyncBlock = this;
    this._paused = false;
    while (pc < pcmax) {
      result = segments[pc++].apply(null, arguments);
      if (this._paused) {
        break;
      }
      if (result && result.isSyncBlock) {
        this._child = result;
        break;
      }
    }
    if (pcmax <= pc && !(this._paused)) {
      this._state  = C.FINISHED;
      this._result = result;
    }
    this._paused = false;
    cc.currentSyncBlock = null;
    this._pc = pc;
  };
  
  var syncblock_performWait = function() {
    return this._state === C.PLAYING;
  };
  var syncblock_performWaitState = function() {
    return this._state === C.PLAYING;
  };
  
  cc.global.syncblock = function(init) {
    return syncblock(init);
  };
  cc.instanceOfSyncBlock = function(obj) {
    return obj && !!obj.isSyncBlock;
  };
  cc.pauseSyncBlock = function() {
    if (cc.currentSyncBlock) {
      cc.currentSyncBlock._paused = true;
    }
  };
  
  module.exports = {};

});
