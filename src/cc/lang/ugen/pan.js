define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var slice = [].slice;
  
  cc.ugen.specs.Pan2 = {
    Klass: cc.MultiOutUGen,
    $ar: {
      defaults: "in=0,pos=0,level=1",
      ctor: function(_in, pos, level) {
        return cc.ugen.multiNewList(this, [C.AUDIO, _in, pos, level]);
      }
    },
    $kr: {
      defaults: "in=0,pos=0,level=1",
      ctor: function(_in, pos, level) {
        return cc.ugen.multiNewList(this, [C.CONTROL, _in, pos, level]);
      }
    },
    init: function() {
      this.inputs = slice.call(arguments);
      this.channels = [
        cc.createOutputProxy(this.rate, this, 0),
        cc.createOutputProxy(this.rate, this, 1),
      ];
      this.numOfOutputs = 2;
      return this.channels;
    },
    checkInputs: function() {
      return cc.ugen.checkNInputs.call(this, 1);
    }
  };
  
  cc.ugen.specs.XFade2 = {
    $ar: {
      defaults: "inA=0,inB=0,pan=0,level=1",
      ctor: function(inA, inB, pan, level) {
        return cc.ugen.multiNewList(this, [C.AUDIO, inA, inB, pan, level]);
      }
    },
    $kr: {
      defaults: "inA=0,inB=0,pan=0,level=1",
      ctor: function(inA, inB, pan, level) {
        return cc.ugen.multiNewList(this, [C.CONTROL, inA, inB, pan, level]);
      }
    },
    checkInputs: function() {
      return cc.ugen.checkNInputs.call(this, 2);
    }
  };

  cc.ugen.specs.LinXFade2 = {
    $ar: {
      defaults: "inA=0,inB=0,pan=0,level=1",
      ctor: function(inA, inB, pan, level) {
        return cc.ugen.multiNewList(this, [C.AUDIO, inA, inB, pan]).__mul__(level);
      }
    },
    $kr: {
      defaults: "inA=0,inB=0,pan=0,level=1",
      ctor: function(inA, inB, pan, level) {
        return cc.ugen.multiNewList(this, [C.CONTROL, inA, inB, pan]).__mul__(level);
      }
    },
    checkInputs: function() {
      return cc.ugen.checkNInputs.call(this, 2);
    }
  };
  
  module.exports = {};

});
