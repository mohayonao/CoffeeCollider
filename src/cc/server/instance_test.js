define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  
  var cc = require("./cc");
  var instance = require("./instance");

  describe("server/instance.js", function() {
    var ins, actual, expected;
    
    testTools.mock("server");

    describe("InstanceManager", function() {
      it("create", function() {
        ins = cc.createInstanceManager();
        assert.instanceOf(ins, instance.InstanceManager);
      });
      it("append/remove", function() {
        ins = cc.createInstanceManager();
        assert.equal(ins.list.length, 0);
        ins.append(0);
        assert.equal(ins.list.length, 1);
        ins.append(1);
        assert.equal(ins.list.length, 2);
        ins.append(1);
        assert.equal(ins.list.length, 2);
        ins.append(2);
        assert.equal(ins.list.length, 3);
        ins.remove(3);
        assert.equal(ins.list.length, 3);
        ins.remove(2);
        assert.equal(ins.list.length, 2);
        ins.remove(1);
        assert.equal(ins.list.length, 1);
        ins.remove(0);
        assert.equal(ins.list.length, 0);
      });
      it("play/pause", function() {
        ins = cc.createInstanceManager();
        assert.isFalse(ins.isRunning());
        
        ins.append(0);
        ins.play(0);
        ins.play(1);
        assert.isTrue(ins.isRunning());
        
        ins.reset(0);
        ins.reset(1);
        
        ins.pause(1);
        ins.pause(0);
        assert.isFalse(ins.isRunning());
      });
      it("pushToTimeline", function() {
        ins = cc.createInstanceManager();
        ins.append(0);
        
        ins.pushToTimeline(["test"], 0);
        assert.deepEqual(ins.list[0].timeline, ["test"]);
        
        ins.pushToTimeline(["test"], 1);
        assert.isUndefined(ins.list[1]);
      });
    });
    
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
