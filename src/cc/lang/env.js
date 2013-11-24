define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var extend = require("../common/extend");
  var fn = require("./fn");
  var utils = require("./utils");
  
  // utility functions
  var shapeNames = {
    step: 0,
    lin : 1, linear     : 1,
    exp : 2, exponential: 2,
    sin : 3, sine       : 3,
    wel : 4, welch      : 4,
    sqr : 6, squared    : 6,
    cub : 7, cubed      : 7
  };

  var shapeNumber = function(shapeName) {
    if (typeof shapeName === "number") {
      return 5;
    }
    return shapeNames[shapeName] || 0;
  };
  
  var curveValue = function(curve) {
    if (typeof curve === "number") {
      return curve;
    }
    return 0;
  };
  
  var Env = (function() {
    function Env(levels, times, curve, releaseNode, loopNode, offset) {
      this._levels = levels;
      this._times  = utils.wrapExtend(times, levels.length - 1);
      this._curve  = curve || "lin";
      this._releaseNode = releaseNode;
      this._loopNode    = loopNode;
      this._offset      = offset;
      this._array       = null;
    }
    extend(Env, cc.Object);
    
    Env.prototype.ar = fn(function(doneAction, gate, timeScale, mul, add) {
      return cc.global.EnvGen(C.AUDIO, this, gate, mul, add, timeScale, doneAction);
    }).defaults("doneAction=0,gate=1,timeScale=1,mul=1,add=0").multiCall().build();
    
    Env.prototype.kr = fn(function(doneAction, gate, timeScale, mul, add) {
      return cc.global.EnvGen(C.CONTROL, this, gate, mul, add, timeScale, doneAction);
    }).defaults("doneAction=0,gate=1,timeScale=1,mul=1,add=0").multiCall().build();
    
    Env.prototype.asMultichannelArray = function() {
      if (!this._array) {
        this._array = this.asArray();
      }
      return this._array;
    };
    
    Env.prototype.asArray = function() {
      var contents;
      var levelArray  = this._levels;
      var timeArray   = this._times;
      var curvesArray = this._curve;
      var size = this._times.length;
      if (!Array.isArray(curvesArray)) {
        curvesArray = [ curvesArray ];
      }
      var releaseNode = typeof this._releaseNode === "number" ? this._releaseNode : -99;
      var loopNode    = typeof this._loopNode    === "number" ? this._loopNode    : -99;
      
      var wrapAt;
      contents = [
        levelArray[0], size, releaseNode, loopNode
      ];
      for (var i = 0; i < size; ++i) {
        wrapAt = i % curvesArray.length;
        contents.push(
          levelArray[i+1], timeArray[i], shapeNumber(curvesArray[wrapAt]), curveValue (curvesArray[wrapAt])
        );
      }
      return utils.flop(contents);
    };
    
    return Env;
  })();
  
  cc.global.Env = fn(function(levels, times, curve, releaseNode, loopNode, offset) {
    if (!Array.isArray(levels)) {
      levels = [ 0, 1, 0 ];
    }
    if (!Array.isArray(times)) {
      times = [ 1, 1 ];
    }
    return new Env(levels, times, curve, releaseNode, loopNode, offset);
  }).defaults("levels=0,times=0,curve=\"lin\",releaseNode,loopNode,offset=0").build();

  cc.global.Env.triangle = fn(function(dur, level) {
    dur = dur.__mul__(0.5);
    return new Env(
      [0, level, 0],
      [dur, dur]
    );
  }).defaults("dur=1,level=1").build();
  
  cc.global.Env.sine = fn(function(dur, level) {
    dur = dur.__mul__(0.5);
    return new Env(
      [0, level, 0],
      [dur, dur],
      "sine"
    );
  }).defaults("dur=1,level=1").build();

  cc.global.Env.perc = fn(function(attackTime, releaseTime, level, curve) {
    return new Env(
      [0, level, 0],
      [attackTime, releaseTime],
      curve
    );
  }).defaults("attackTime=0.01,releaseTime=1,level=1,curve=-4").build();

  cc.global.Env.linen = fn(function(attackTime, sustainTime, releaseTime, level, curve) {
    return new Env(
      [0, level, level, 0],
      [attackTime, sustainTime, releaseTime],
      curve
    );
  }).defaults("attackTime=0.01,sustainTime=1,releaseTime=1,level=1,curve=\"lin\"").build();

  cc.global.Env.xyc = function() {
    throw "not implemented";
  };
  
  cc.global.Env.pairs = function() {
    throw "not implemented";
  };

  cc.global.Env.cutoff = fn(function(releaseTime, level, curve) {
    var curveNo = shapeNumber(curve);
    var releaseLevel = curveNo === 2 ? 1e-05 : 0;
    return new Env(
      [level, releaseLevel],
      [releaseTime],
      curve,
      0
    );
  }).defaults("releaseTime=0.1,level=1,curve=\"lin\"").build();

  cc.global.Env.dadsr = fn(function(delayTime, attackTime, decayTime, sustainLevel, releaseTime, peakLevel, curve, bias) {
    return new Env(
      [0, 0, peakLevel, peakLevel.__mul__(sustainLevel), 0].__add__(bias),
      [delayTime, attackTime, decayTime, releaseTime],
      curve,
      3
    );
  }).defaults("delayTime=0.1,attackTime=0.01,decayTime=0.3,sustainLevel=0.5,releaseTime=1,peakLevel=1,curve=-4,bias=0").build();

  cc.global.Env.adsr = fn(function(attackTime, decayTime, sustainLevel, releaseTime, peakLevel, curve, bias) {
    return new Env(
      [0, peakLevel, peakLevel.__mul__(sustainLevel), 0].__add__(bias),
      [attackTime, decayTime, releaseTime],
      curve,
      2
    );
  }).defaults("attackTime=0.01,decayTime=0.3,sustainLevel=0.5,releaseTime=1,peakLevel=1,curve=-4,bias=0").build();

  cc.global.Env.asr = fn(function(attackTime, sustainLevel, releaseTime, curve) {
    return new Env(
      [0, sustainLevel, 0],
      [attackTime, releaseTime],
      curve,
      1
    );
  }).defaults("attackTime=0.01,sustainLevel=1,releaseTime=1,curve=-4").build();

  cc.global.Env.circle = function() {
    throw "not implemented";
  };
  
  module.exports = {};

});
