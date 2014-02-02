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
    testTools.mock("createWorld");

    describe("WorldManager", function() {
      it("append/remove", function() {
        ins = new server.WorldManager();
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
        ins = new server.WorldManager();
        assert.isFalse(ins.isRunning());
        
        ins.append(0);
        
        ins.run(true, 0);
        assert.deepEqual(cc.createWorld.called, ["run:true"]);
        
        ins.run(true, 1);
        assert.deepEqual(cc.createWorld.called, ["run:true"]);
        
        ins.reset(0);
        assert.deepEqual(cc.createWorld.called, ["run:true", "reset"]);
        
        ins.reset(1);
        assert.deepEqual(cc.createWorld.called, ["run:true", "reset"]);
        
        ins.run(false, 0);
        assert.deepEqual(cc.createWorld.called, ["run:true", "reset", "run:false"]);
        
        ins.run(false, 1);
        assert.deepEqual(cc.createWorld.called, ["run:true", "reset", "run:false"]);
      });
      it("isRunning", function() {
        ins = new server.WorldManager();
        ins.append(0);
        assert.isFalse(ins.isRunning());
      });
      it("pushToTimeline", function() {
        ins = new server.WorldManager();
        ins.append(0);
        
        ins.pushToTimeline(["test"], 0);
        assert.deepEqual(cc.createWorld.called, ["pushToTimeline"]);
        
        ins.pushToTimeline(["test"], 1);
        assert.deepEqual(cc.createWorld.called, ["pushToTimeline"]);
      });
    });
    
  });

});
