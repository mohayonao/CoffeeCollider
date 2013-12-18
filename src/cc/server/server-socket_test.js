define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  
  var cc = require("./cc");
  if (!cc.NodeJSSynthServer) {
    cc.NodeJSSynthServer = function() {};
  }
  
  var server = require("./server-socket");
  
  describe("server/server-socket.js", function() {
    var ins, actual, expected;
    
    testTools.mock("server");
    testTools.mock("createInstance");

    describe("InstanceManager", function() {
      it("append/remove", function() {
        ins = new server.InstanceManager();
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
        ins = new server.InstanceManager();
        assert.isFalse(ins.isRunning());
        
        ins.append(0);
        
        ins.play(0);
        assert.deepEqual(cc.createInstance.called, ["play"]);
        
        ins.play(1);
        assert.deepEqual(cc.createInstance.called, ["play"]);
        
        ins.reset(0);
        assert.deepEqual(cc.createInstance.called, ["play", "reset"]);
        
        ins.reset(1);
        assert.deepEqual(cc.createInstance.called, ["play", "reset"]);
        
        ins.pause(0);
        assert.deepEqual(cc.createInstance.called, ["play", "reset", "pause"]);
        
        ins.pause(1);
        assert.deepEqual(cc.createInstance.called, ["play", "reset", "pause"]);
      });
      it("isRunning", function() {
        ins = new server.InstanceManager();
        ins.append(0);
        assert.isFalse(ins.isRunning());
      });
      it("pushToTimeline", function() {
        ins = new server.InstanceManager();
        ins.append(0);
        
        ins.pushToTimeline(["test"], 0);
        assert.deepEqual(cc.createInstance.called, ["pushToTimeline"]);
        
        ins.pushToTimeline(["test"], 1);
        assert.deepEqual(cc.createInstance.called, ["pushToTimeline"]);
      });
    });
    
  });

});
