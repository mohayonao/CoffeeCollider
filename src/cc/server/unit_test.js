define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var cc = require("./cc");
  var unit = require("./unit");
  
  describe("server/unit.js", function() {
    var parent, _getRateInstance;
    before(function() {
      parent = {
        doneAction: function(action, tag) {
          parent.doneAction.result = action;
        }
      };
      _getRateInstance = cc.getRateInstance;
      cc.getRateInstance = function(rate) {
        return { bufLength: 64 };
      };
      cc.unit.specs.TestUnit = function() {
        cc.unit.specs.TestUnit.called = true;
      };
    });
    after(function() {
      cc.getRateInstance = _getRateInstance;
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
      assert.equal(u.numOfInputs , 2);
      assert.equal(u.numOfOutputs, 1);
      assert.isArray(u.inputs);
      assert.isArray(u.outputs);
      assert.equal(u.numOfInputs, u.inputs.length);
      assert.equal(u.numOfOutputs, u.outputs.length);
      assert.equal(u.bufLength   , 64);
      assert.isFalse(u.done);
    });
    it("init", function() {
      var specs = [
        "TestUnit", C.AUDIO, 0, [ 0, 0, 0, 1 ], [ 2 ], ""
      ];
      cc.unit.specs.TestUnit.called = false;
      var u = cc.createUnit(parent, specs).init("tag");
      assert.isTrue(cc.unit.specs.TestUnit.called);
      assert.equal(u.tag, "tag");
    });
    it("init(not exist)", function() {
      var specs = [
        "TestUnit(not exist)", C.AUDIO, 0, [ 0, 0, 0, 1 ], [ 2 ], ""
      ];
      assert.throws(function() {
        cc.createUnit(parent, specs).init("tag");
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
      
      parent.doneAction.result = null;
      u.doneAction(2);
      assert.isNull(parent.doneAction.result);
    });
  });

});
