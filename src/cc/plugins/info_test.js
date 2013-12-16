define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  var ugenTestSuite = testTools.ugenTestSuite;
  var unitTestSuite = testTools.unitTestSuite;
  
  var cc = require("../cc")
  var ugen = require("../lang/ugen");
  var unit = require("../server/unit");
  var info = require("./info");
  
  describe("plugins/info.js", function() {
    ugenTestSuite(["SampleRate", "SampleDur", "RadiansPerSample", "ControlRate", "ControlDur"], {
      ir: [],
    }).unitTestSuite([{
      rate  : C.SCALAR,
      inputs: []
    }], {
      checker: function(statistics) {
        // console.log(statistics);
        assert.isFalse(statistics.hasNaN);
        assert.equal(statistics.variance, 0);
      }
    });
  });    

});
