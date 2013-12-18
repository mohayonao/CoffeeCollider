define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  
  var cc = require("./cc");
  var instance = require("./instance");

  describe("server/instance.js", function() {
    var ins, actual, expected;
    var rootNode = {
      running: false,
      process: function(bufLength, instance) {
        rootNode.process.result = [bufLength, instance];
      }
    };
    
    testTools.mock("server");
    testTools.mock("createServerRootNode", function() {
      return rootNode;
    });
    testTools.mock("createServerGroup");
    testTools.mock("createServerSynth");
    testTools.mock("createServerBuffer");
    
    beforeEach(function() {
      rootNode = {
        running: false,
        process: function(bufLength, instance) {
          rootNode.process.result = [bufLength, instance];
        }
      };
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
      it("process", function() {
        var passed = 0;
        ins = cc.createInstance(0);
        ins.pushToTimeline([["/none"], ["/test", 100], 0, ["/test", 200]]);
        instance.commands["/test"] = function(instance, args) {
          passed += args[1];
        };
        ins.process(64);
        assert.deepEqual(rootNode.process.result, [64, ins]);
      });
      describe("commands", function() {
        it("/n_run", function() {
          ins = cc.createInstance(0);
          ins.nodes[1] = { running:false };
          
          instance.commands["/n_run"](ins, ["/n_run", 1, 0]);
          assert.isFalse(ins.nodes[1].running);

          instance.commands["/n_run"](ins, ["/n_run", 1, 1]);
          assert.isTrue(ins.nodes[1].running);

          instance.commands["/n_run"](ins, ["/n_run", 2, 0]);
          assert.isTrue(ins.nodes[1].running);
          assert.isUndefined(ins.nodes[2]);
        });
        it("/n_free", function() {
          var doneAction = null;
          ins = cc.createInstance(0);
          ins.nodes[1] = {
            doneAction: function(action) {
              if (doneAction === null) {
                doneAction = action;
              } else {
                throw "once";
              }
            }
          };

          instance.commands["/n_free"](ins, ["/n_free", 1]);
          assert.equal(doneAction, 2);
          
          instance.commands["/n_free"](ins, ["/n_free", 2]);
        });
        it("/n_set", function() {
          var controls = null;
          ins = cc.createInstance(0);
          ins.nodes[1] = {
            set: function(_controls) {
              if (controls === null) {
                controls = _controls;
              } else {
                throw "once";
              }
            }
          };

          instance.commands["/n_set"](ins, ["/n_set", 1, [0,1,2,3]]);
          assert.deepEqual(controls, [0,1,2,3]);
          
          instance.commands["/n_set"](ins, ["/n_set", 2, [0,1,2,3]]);
        });
        it.skip("/g_new", function() {
          ins = cc.createInstance(0);
          ins.nodes[1] = "target";
          instance.commands["/g_new"](ins, ["/g_new", 2, 3, 1]);
          assert.deepEqual(ins.nodes[2], [2, "target", 3, ins]);
        });
        it("/s_def", function() {
          ins = cc.createInstance(0);
          instance.commands["/s_def"](ins, ["/s_def", 1, {spec:"spec"}]);
          assert.deepEqual(ins.defs[1], {spec:"spec"});
        });
        it("/s_new", function() {
          ins = cc.createInstance(0);
          ins.nodes[1] = "target";
          instance.commands["/s_new"](ins, ["/s_new", 2, 3, 1, 4, ["controls"]]);
          assert.deepEqual(ins.nodes[2], [2, "target", 3, 4, ["controls"], ins]);
        });
        it("/b_new", function() {
          ins = cc.createInstance(0);
          instance.commands["/b_new"](ins, ["/b_new", 0, 1, 2]);
          assert.deepEqual(ins.buffers[0], [0, 1, 2]);
        });
        it.skip("/b_bind", function() {
        });
        it("/b_free", function() {
          ins = cc.createInstance(0);
          ins.buffers[1] = "buffer1";
          ins.buffers[2] = "buffer2";
          instance.commands["/b_free"](ins, ["/b_free", 1]);
          assert.deepEqual(ins.buffers, {2:"buffer2"});
        });
        it.skip("/b_zero", function() {
        });
        it.skip("/b_set", function() {
        });
        it.skip("/b_gen", function() {
        });
      });
    });
  });

});
