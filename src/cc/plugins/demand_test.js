define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  var ugenTestSuite = testTools.ugenTestSuite;
  var unitTestSuite = testTools.unitTestSuite;

  var cc = require("../cc")
  var ugen = require("../lang/ugen");
  var unit = require("../server/unit");
  var demand = require("./demand");

  describe("plugins/demand.js", function() {
    unitTestSuite("Dgeom", [
      {
        rate: C.DEMAND,
        inputs: [
          { name:"length", value:20 },
          { name:"start" , value:1 },
          { name:"grow"  , value:1.05 },
        ],
        checker: function(statistics) {
          // console.log(statistics);
          assert.isTrue(statistics.hasNaN);
          assert.equal(statistics.min, 1);
          assert.closeTo(statistics.max, Math.pow(1.05, 19), 1e-4);
        }
      },
      {
        rate: C.DEMAND,
        inputs: [
          { name:"length", value:Infinity },
          { name:"start" , value:1 },
          { name:"grow"  , value:1.05 },
        ],
        checker: function(statistics) {
          // console.log(statistics);
          assert.isFalse(statistics.hasNaN);
        }
      }
    ]);
    
    unitTestSuite("Dseries", [
      {
        rate: C.DEMAND,
        inputs: [
          { name:"length", value: 20 },
          { name:"start" , value:1 },
          { name:"step"  , value:2 },
        ],
        checker: function(statistics) {
          // console.log(statistics);
          assert.isTrue(statistics.hasNaN);
          assert.equal(statistics.min, 1);
          assert.equal(statistics.max, 1 + (19 * 2));
        }
      },
      {
        rate: C.DEMAND,
        inputs: [
          { name:"length", value:Infinity },
          { name:"start" , value:1 },
          { name:"step"  , value:2 },
        ],
        checker: function(statistics) {
          // console.log(statistics);
          assert.isFalse(statistics.hasNaN);
        }
      }
    ]);
    
    unitTestSuite(["Dwhite", "Diwhite"], [
      {
        rate: C.DEMAND,
        inputs: [
          { name:"length", value:20 },
          { name:"lo"    , value:50  },
          { name:"hi"    , value:100 },
        ],
        checker: function(statistics) {
          // console.log(statistics);
          assert.isTrue(statistics.hasNaN);
          assert.isTrue(50 <= statistics.min);
          assert.isTrue(statistics.max < 100);
        }
      },
      {
        rate: C.DEMAND,
        inputs: [
          { name:"length", value:Infinity },
          { name:"lo"    , value:50  },
          { name:"hi"    , value:100 },
        ],
        checker: function(statistics) {
          // console.log(statistics);
          assert.isFalse(statistics.hasNaN);
        }
      }
    ]);
    
    unitTestSuite(["Dser", "Dseq", "Dshuf"], [
      {
        rate: C.DEMAND,
        inputs: [
          { name:"repeats", value:20 },
          { name:"in0", value:0 }, { name:"in1", value:1 }, { name:"in2", value:2 },
          { name:"in3", value:3 }, { name:"in4", value:4 }, { name:"in5", value:5 },
          { name:"in6", value:6 }, { name:"in7", value:7 }, { name:"in8", value:8 },
        ],
        checker: function(statistics) {
          // console.log(statistics);
          assert.isTrue(statistics.hasNaN);
          assert.equal(statistics.min, 0);
          assert.equal(statistics.max, 8);
        }
      },
      {
        rate: C.DEMAND,
        inputs: [
          { name:"repeats", value:Infinity },
          { name:"in0", value:0 }, { name:"in1", value:1 }, { name:"in2", value:2 },
          { name:"in3", value:3 }, { name:"in4", value:4 }, { name:"in5", value:5 },
          { name:"in6", value:6 }, { name:"in7", value:7 }, { name:"in8", value:8 },
        ],
        checker: function(statistics) {
          // console.log(statistics);
          assert.isFalse(statistics.hasNaN);
        }
      }
    ]);

    unitTestSuite(["Drand"], [
      {
        rate: C.DEMAND,
        inputs: [
          { name:"repeats", value:20 },
          { name:"in0", value:0 }, { name:"in1", value:1 }, { name:"in2", value:2 },
          { name:"in3", value:3 }, { name:"in4", value:4 }, { name:"in5", value:5 },
          { name:"in6", value:6 }, { name:"in7", value:7 }, { name:"in8", value:8 },
        ],
        checker: function(statistics) {
          // console.log(statistics);
          assert.isTrue(statistics.hasNaN);
        }
      },
      {
        rate: C.DEMAND,
        inputs: [
          { name:"repeats", value:Infinity },
          { name:"in0", value:0 }, { name:"in1", value:1 }, { name:"in2", value:2 },
          { name:"in3", value:3 }, { name:"in4", value:4 }, { name:"in5", value:5 },
          { name:"in6", value:6 }, { name:"in7", value:7 }, { name:"in8", value:8 },
        ],
        checker: function(statistics) {
          // console.log(statistics);
          assert.isFalse(statistics.hasNaN);
        }
      }
    ]);
    
  });

});
