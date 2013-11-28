define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

  cc.ugen.specs.FreeVerb = {
    checkInputs: cc.ugen.checkSameRateAsFirstInput,
    $ar: {
      defaults: "in=0,mix=0.33,room=0.5,damp=0.5,mul=1,add=0",
      ctor: function(_in, mix, room, damp, mul, add) {
        return this.multiNew(C.AUDIO, _in, mix, room, damp).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,mix=0.33,room=0.5,damp=0.5,mul=1,add=0",
      ctor: function(_in, mix, room, damp, mul, add) {
        return this.multiNew(C.CONTROL, _in, mix, room, damp).madd(mul, add);
      }
    }
  };
  
  cc.unit.specs.FreeVerb = (function() {
    var ctor = function() {
      this.process = next;
      
      this._iota0 = 0;
      this._iota1 = 0;
      this._iota2 = 0;
      this._iota3 = 0;
      this._iota4 = 0;
      this._iota5 = 0;
      this._iota6 = 0;
      this._iota7 = 0;
      this._iota8 = 0;
      this._iota9 = 0;
      this._iota10 = 0;
      this._iota11 = 0;

      this._R0_0 = 0;
      this._R1_0 = 0;
      this._R2_0 = 0;
      this._R3_0 = 0;
      this._R4_0 = 0;
      this._R5_0 = 0;
      this._R6_0 = 0;
      this._R7_0 = 0;
      this._R8_0 = 0;
      this._R9_0 = 0;
      this._R10_0 = 0;
      this._R11_0 = 0;
      this._R12_0 = 0;
      this._R13_0 = 0;
      this._R14_0 = 0;
      this._R15_0 = 0;
      this._R16_0 = 0;
      this._R17_0 = 0;
      this._R18_0 = 0;
      this._R19_0 = 0;

      this._R0_1 = 0;
      this._R1_1 = 0;
      this._R2_1 = 0;
      this._R3_1 = 0;

      this._dline0 = new Float32Array(225);
      this._dline1 = new Float32Array(341);
      this._dline2 = new Float32Array(441);
      this._dline3 = new Float32Array(556);
      this._dline4 = new Float32Array(1617);
      this._dline5 = new Float32Array(1557);
      this._dline6 = new Float32Array(1491);
      this._dline7 = new Float32Array(1422);
      this._dline8 = new Float32Array(1277);
      this._dline9 = new Float32Array(1116);
      this._dline10 = new Float32Array(1188);
      this._dline11 = new Float32Array(1356);
      
      next.call(this, 1);
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var ftemp0 = Math.max(0, Math.min(this.inputs[1][0], 1)); // mix
      var ftemp1 = 1 - ftemp0;

      var room = Math.max(0, Math.min(this.inputs[2][0], 1)); // room
      var ftemp5 = 0.7 + (0.28 * room);

      var damp = Math.max(0, Math.min(this.inputs[3][0], 1)); // damp
      var ftemp6 = 0.4 * damp;
      var ftemp7 = 1 - ftemp6;

      var iota0 = this._iota0;
      var iota1 = this._iota1;
      var iota2 = this._iota2;
      var iota3 = this._iota3;
      var iota4 = this._iota4;
      var iota5 = this._iota5;
      var iota6 = this._iota6;
      var iota7 = this._iota7;
      var iota8 = this._iota8;
      var iota9 = this._iota9;
      var iota10 = this._iota10;
      var iota11 = this._iota11;

      var R0_1 = this._R0_1;
      var R1_1 = this._R1_1;
      var R2_1 = this._R2_1;
      var R3_1 = this._R3_1;

      var R0_0 = this._R0_0;
      var R1_0 = this._R1_0;
      var R2_0 = this._R2_0;
      var R3_0 = this._R3_0;
      var R4_0 = this._R4_0;
      var R5_0 = this._R5_0;
      var R6_0 = this._R6_0;
      var R7_0 = this._R7_0;
      var R8_0 = this._R8_0;
      var R9_0 = this._R9_0;
      var R10_0 = this._R10_0;
      var R11_0 = this._R11_0;
      var R12_0 = this._R12_0;
      var R13_0 = this._R13_0;
      var R14_0 = this._R14_0;
      var R15_0 = this._R15_0;
      var R16_0 = this._R16_0;
      var R17_0 = this._R17_0;
      var R18_0 = this._R18_0;
      var R19_0 = this._R19_0;

      var dline0 = this._dline0;
      var dline1 = this._dline1;
      var dline2 = this._dline2;
      var dline3 = this._dline3;
      var dline4 = this._dline4;
      var dline5 = this._dline5;
      var dline6 = this._dline6;
      var dline7 = this._dline7;
      var dline8 = this._dline8;
      var dline9 = this._dline9;
      var dline10 = this._dline10;
      var dline11 = this._dline11;

      for (var i = 0; i < inNumSamples; ++i) {
        var ftemp2 = inIn[i];
        var ftemp4 = 1.500000e-2 * ftemp2;
        if (++iota0 === 225) {
          iota0 = 0;
        }
        var T0 = dline0[iota0];
        if (++iota1 === 341) {
          iota1 = 0;
        }
        var T1 = dline1[iota1];
        if (++iota2 === 441) {
          iota2 = 0;
        }
        var T2 = dline2[iota2];
        if (++iota3 === 556) {
          iota3 = 0;
        }
        var T3 = dline3[iota3];
        if (++iota4 === 1617) {
          iota4 = 0;
        }
        var T4 = dline4[iota4];
        R5_0 = (ftemp7 * R4_0) + (ftemp6 * R5_0);
        dline4[iota4] = ftemp4 + (ftemp5 * R5_0);
        R4_0 = T4;
        if (++iota5 === 1557) {
          iota5 = 0;
        }
        var T5 = dline5[iota5];
        R7_0 = (ftemp7 * R6_0) + (ftemp6 * R7_0);
        dline5[iota5] = ftemp4 + (ftemp5 * R7_0);
        R6_0 = T5;
        if (++iota6 === 1491) {
          iota6 = 0;
        }
        var T6 = dline6[iota6];
        R9_0 = (ftemp7 * R8_0) + (ftemp6 * R9_0);
        dline6[iota6] = ftemp4 + (ftemp5 * R9_0);
        R8_0 = T6;
        if (++iota7 === 1422) {
          iota7 = 0;
        }
        var T7 = dline7[iota7];
        R11_0 = (ftemp7 * R10_0) + (ftemp6 * R11_0);
        dline7[iota7] = ftemp4 + (ftemp5 * R11_0);
        R10_0 = T7;
        if (++iota8 === 1277) {
          iota8 = 0;
        }
        var T8 = dline8[iota8];
        R13_0 = (ftemp7 * R12_0) + (ftemp6 * R13_0);
        dline8[iota8] = ftemp4 + (ftemp5 * R13_0);
        R12_0 = T8;
        if (++iota9 === 1116) {
          iota9 = 0;
        }
        var T9 = dline9[iota9];
        R15_0 = (ftemp7 * R14_0) + (ftemp6 * R15_0);
        dline9[iota9] = ftemp4 + (ftemp5 * R15_0);
        R14_0 = T9;
        if (++iota10 === 1188) {
          iota10 = 0;
        }
        var T10 = dline10[iota10];
        R17_0 = (ftemp7 * R16_0) + (ftemp6 * R17_0);
        dline10[iota10] = ftemp4 + (ftemp5 * R17_0);
        R16_0 = T10;
        if (++iota11 === 1356) {
          iota11 = 0;
        }
        var T11 = dline11[iota11];
        R19_0 = (ftemp7 * R18_0) + (ftemp6 * R19_0);
        dline11[iota11] = ftemp4 + (ftemp5 * R19_0);
        R18_0 = T11;
        var ftemp8 = R16_0 + R18_0;
        dline3[iota3] = (((0.5 * R3_0) + R4_0) + (R6_0 + R8_0)) + ((R10_0 + R12_0) + (R14_0 + ftemp8));
        R3_0 = T3;
        R3_1 = R3_0 - (((R4_0 + R6_0) + (R8_0 + R10_0)) + ((R12_0 + R14_0) + ftemp8));
        dline2[iota2] = (0.5 * R2_0) + R3_1;
        R2_0 = T2;
        R2_1 = (R2_0 - R3_1);
        dline1[iota1] = (0.5 * R1_0) + R2_1;
        R1_0 = T1;
        R1_1 = (R1_0 - R2_1);
        dline0[iota0] = (0.5 * R0_0) + R1_1;
        R0_0 = T0;
        R0_1 = R0_0 - R1_1;
        out[i] = (ftemp1 * ftemp2) + (ftemp0 * R0_1);
      }
      
      this._iota0 = iota0;
      this._iota1 = iota1;
      this._iota2 = iota2;
      this._iota3 = iota3;
      this._iota4 = iota4;
      this._iota5 = iota5;
      this._iota6 = iota6;
      this._iota7 = iota7;
      this._iota8 = iota8;
      this._iota9 = iota9;
      this._iota10 = iota10;
      this._iota11 = iota11;

      this._R0_1 = R0_1;
      this._R1_1 = R1_1;
      this._R2_1 = R2_1;
      this._R3_1 = R3_1;

      this._R0_0 = R0_0;
      this._R1_0 = R1_0;
      this._R2_0 = R2_0;
      this._R3_0 = R3_0;
      this._R4_0 = R4_0;
      this._R5_0 = R5_0;
      this._R6_0 = R6_0;
      this._R7_0 = R7_0;
      this._R8_0 = R8_0;
      this._R9_0 = R9_0;
      this._R10_0 = R10_0;
      this._R11_0 = R11_0;
      this._R12_0 = R12_0;
      this._R13_0 = R13_0;
      this._R14_0 = R14_0;
      this._R15_0 = R15_0;
      this._R16_0 = R16_0;
      this._R17_0 = R17_0;
      this._R18_0 = R18_0;
      this._R19_0 = R19_0;
    };
    return ctor;
  })();
  
  module.exports = {};

});
