define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  
  var cc = require("./cc");
  var unit = require("./unit");
  
  describe("server/unit.js", function() {
    var parent;
    
    testTools.mock("server");
    
    before(function() {
      parent = {
        heap: new Float32Array(256),
        heapIndex: 0,
        doneAction: function(action) {
          parent.doneAction.result = action;
        }
      };
      cc.unit.specs.TestUnit = function() {
        cc.unit.specs.TestUnit.called = true;
      };
    });
    
    it("create", function() {
      var specs = [
        "TestUnit", C.AUDIO, 1, [ 0, 0, 0, 0 ], [ 2 ], ""
      ];
      var u = cc.createUnit(parent, specs);
      assert.instanceOf(u, unit.Unit);
      assert.equal(u.name, "TestUnit");
      assert.equal(u.calcRate, C.AUDIO);
      assert.equal(u.specialIndex, 1);
      assert.equal(u.numInputs , 2);
      assert.equal(u.numOutputs, 1);
      assert.isArray(u.inputs);
      assert.isArray(u.outputs);
      assert.equal(u.numInputs , u.inputs.length);
      assert.equal(u.numOutputs, u.outputs.length);
      assert.equal(u.bufLength , cc.server.rates[C.AUDIO].bufLength);
    });
    it("init", function() {
      var specs = [
        "TestUnit", C.AUDIO, 0, [ 0, 0, 0, 1 ], [ 2 ], ""
      ];
      cc.unit.specs.TestUnit.called = false;
      var u = cc.createUnit(parent, specs).init();
      assert.isTrue(cc.unit.specs.TestUnit.called);
    });
    it("init(not exist)", function() {
      var specs = [
        "TestUnit(not exist)", C.AUDIO, 0, [ 0, 0, 0, 1 ], [ 2 ], ""
      ];
      assert.throws(function() {
        cc.createUnit(parent, specs).init();
      }, "TestUnit(not exist)'s ctor is not found.");
    });
    it("doneAction", function() {
      var specs = [
        "TestUnit", 0, 0, [ 0, 0, 0, 0 ], [ 2 ], ""
      ];
      var u = cc.createUnit(parent, specs);
      parent.doneAction.result = null;
      u.doneAction(2);
      assert.equal(parent.doneAction.result, 2);

    });
  });

});
