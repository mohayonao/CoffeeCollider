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
        describe("buffer", function() {
          describe("/b_new", function() {
            it("normal", function() {
              ins = cc.createInstance(0);
              instance.commands["/b_new"](ins, ["/b_new", 0, 1, 2]);
              assert.deepEqual(ins.buffers[0], [ 0, 1, 2 ]);
            });
          });
          describe("/b_free", function() {
            it("normal", function() {
              ins = cc.createInstance(0);
              ins.buffers[0] = "buffer1";
              ins.buffers[1] = "buffer2";
              instance.commands["/b_free"](ins, ["/b_free", 0]);
              assert.deepEqual(ins.buffers, [ null, "buffer2" ]);
            });
          });
          describe("/b_zero", function() {
            it("normal", function() {
              var passed = false;
              ins = cc.createInstance(0);
              ins.buffers[0] = {
                zero: function() { passed = true; }
              };
              instance.commands["/b_zero"](ins, ["/b_zero", 0]);
              assert.isTrue(passed);
            });
            it("missing", function() {
              ins = cc.createInstance(0);
              assert.doesNotThrow(function() {
                instance.commands["/b_zero"](ins, ["/b_zero", 10]);
              });
            });
          });
          describe("/b_set", function() {
            it("normal", function() {
              var params = null;
              ins = cc.createInstance(0);
              ins.buffers[0] = {
                set: function() { params = [].slice.call(arguments); }
              };
              instance.commands["/b_set"](ins, ["/b_set", 0, [ 1, 2, 3 ]]);
              assert.deepEqual(params, [[ 1, 2, 3 ]]);
            });
            it("missing", function() {
              ins = cc.createInstance(0);
              assert.doesNotThrow(function() {
                instance.commands["/b_set"](ins, ["/b_set", 10]);
              });
            });
          });
          describe("/b_get", function() {
            it("normal", function() {
              var params = null;
              ins = cc.createInstance(0);
              ins.buffers[0] = {
                get: function() { params = [].slice.call(arguments); }
              };
              instance.commands["/b_get"](ins, ["/b_get", 0, 1, 2 ]);
              assert.deepEqual(params, [ 1, 2 ]);
            });
            it("missing", function() {
              ins = cc.createInstance(0);
              assert.doesNotThrow(function() {
                instance.commands["/b_get"](ins, ["/b_get", 10]);
              });
            });
          });
          describe("/b_getn", function() {
            it("normal", function() {
              var params = null;
              ins = cc.createInstance(0);
              ins.buffers[0] = {
                getn: function() { params = [].slice.call(arguments); }
              };
              instance.commands["/b_getn"](ins, ["/b_getn", 0, 1, 2, 3 ]);
              assert.deepEqual(params, [ 1, 2, 3 ]);
            });
            it("missing", function() {
              ins = cc.createInstance(0);
              assert.doesNotThrow(function() {
                instance.commands["/b_getn"](ins, ["/b_getn", 10]);
              });
            });
          });
          describe("/b_fill", function() {
            it("normal", function() {
              var params = null;
              ins = cc.createInstance(0);
              ins.buffers[0] = {
                fill: function() { params = [].slice.call(arguments); }
              };
              instance.commands["/b_fill"](ins, ["/b_fill", 0, [1, 2, 3] ]);
              assert.deepEqual(params, [[ 1, 2, 3 ]]);
            });
            it("missing", function() {
              ins = cc.createInstance(0);
              assert.doesNotThrow(function() {
                instance.commands["/b_fill"](ins, ["/b_fill", 10]);
              });
            });
          });
          describe("/b_gen", function() {
            it("normal", function() {
              var params = null;
              ins = cc.createInstance(0);
              ins.buffers[0] = {
                gen: function() { params = [].slice.call(arguments); }
              };
              instance.commands["/b_gen"](ins, ["/b_gen", 0, "cmd", 7, 1, 2, 3 ]);
              assert.deepEqual(params, [ "cmd", 7, [ 1, 2, 3 ] ]);
            });
            it("missing", function() {
              ins = cc.createInstance(0);
              assert.doesNotThrow(function() {
                instance.commands["/b_gen"](ins, ["/b_gen", 10]);
              });
            });
          });
          describe("BINARY_CMD_SET_BUFFER", function() {
            it("normal", function() {
              var params = null;
              ins = cc.createInstance(0);
              ins.buffers[0] = {
                bind: function() {
                  params = [].slice.call(arguments);
                  params[params.length-1] = new Float32Array(params[params.length-1]);
                }
              };
              var uint8 = new Uint8Array(C.SET_BUFFER_HEADER_SIZE + 2 * 4);
              var int16 = new Uint16Array(uint8.buffer);
              var int32 = new Uint32Array(uint8.buffer);
              var f32   = new Float32Array(uint8.buffer);
              int16[0] = C.BINARY_CMD_SET_BUFFER;
              int16[1] = 0;
              int16[3] = 2;
              int32[2] = 44100;
              int32[3] = 16;
              f32[4] = 1;
              f32[5] = 2;
              ins.doBinayCommand(uint8);
              assert.deepEqual(params, [ 44100, 2, 16, new Float32Array([ 1, 2 ]) ]);
            });
            it("missing", function() {
              ins = cc.createInstance(0);
              var uint8 = new Uint8Array(C.SET_BUFFER_HEADER_SIZE + 2 * 4);
              var int16 = new Uint16Array(uint8.buffer);
              var int32 = new Uint32Array(uint8.buffer);
              var f32   = new Float32Array(uint8.buffer);
              int16[0] = C.BINARY_CMD_SET_BUFFER;
              int16[1] = 100;
              int16[3] = 2;
              int32[2] = 44100;
              int32[3] = 2;
              f32[4] = 1;
              f32[5] = 2;
              assert.doesNotThrow(function() {
                ins.doBinayCommand(uint8);
              });
            });
          });
        });
      });
    });
  });

});
