define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  
  var cc = require("./cc");
  var instance = require("./instance");

  describe("server/instance.js", function() {
    var ins, actual, expected;
    
    testTools.mock("server");
    
    describe("Instance", function() {
      it("create", function() {
        ins = cc.createInstance(0);
        assert.instanceOf(ins, instance.Instance);
      });
      it("play/pause/reset", function() {
        ins = cc.createInstance(0);
        
        ins.play();
        assert.isTrue(ins.isRunning());
        
        ins.pause();
        assert.isFalse(ins.isRunning());
        
        ins.reset();
      });
      it("pushToTimeline", function() {
        ins = cc.createInstance(0);
        ins.pushToTimeline(["test"]);
        assert.deepEqual(ins.timeline, ["test"]);
      });
      it("getFixNum", function() {
        ins = cc.createInstance(0);
        actual   = ins.getFixNum(10);
        expected = { outputs:[new Float32Array([10])] };
        assert.deepEqual(actual, expected);

        expected = actual;
        actual   = ins.getFixNum(10);
        assert.equal(actual, expected);
      });
    });
  });

});
