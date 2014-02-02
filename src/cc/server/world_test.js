define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  
  var cc = require("./cc");
  var world = require("./world");

  describe("server/world.js", function() {
    var w, actual, expected;
    var rootNode;
    
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
        run: function(flag) {
          rootNode.running = !!flag;
        },
        process: function(bufLength) {
          rootNode.process.result = [ bufLength ];
        }
      };
    });
    
    describe("World", function() {
      it("create", function() {
        w = cc.createWorld(0);
        assert.instanceOf(w, world.World);
      });
      it("play/pause/reset", function() {
        w = cc.createWorld(0);
        
        w.run(true);
        assert.isTrue(w.isRunning());
        
        w.run(false);
        assert.isFalse(w.isRunning());
        
        w.reset();
      });
      it("isRunning", function() {
        w = cc.createWorld(0);
        assert.isFalse(w.isRunning());
      });
      it("pushToTimeline", function() {
        w = cc.createWorld(0);
        w.pushToTimeline(["test"]);
        assert.deepEqual(w.timeline, ["test"]);
      });
      it("doBinayCommand", function() {
        w = cc.createWorld(0);
        assert.doesNotThrow(function() {
          w.doBinayCommand(new Uint8Array([255, 255]));
        });
      });
      it("getFixNum", function() {
        w = cc.createWorld(0);
        actual   = w.getFixNum(10);
        expected = { outputs:[new Float32Array([10])] };
        assert.deepEqual(actual, expected);

        expected = actual;
        actual   = w.getFixNum(10);
        assert.equal(actual, expected);
      });
      it("process", function() {
        var passed = 0;
        w = cc.createWorld(0);
        w.pushToTimeline([["/none"], ["/test", 100], 0, ["/test", 200]]);
        world.commands["/test"] = function(world, args) {
          passed += args[1];
        };
        w.process(64);
        assert.deepEqual(rootNode.process.result, [ 64 ]);
        assert.equal(passed, 100);
      });
      describe("commands", function() {
        it("/n_run", function() {
          w = cc.createWorld(0);
          w.nodes[1] = { running:false, run:function(flag) {w.nodes[1].running = !!flag;} };
          
          world.commands["/n_run"](w, ["/n_run", 1, 0]);
          assert.isFalse(w.nodes[1].running);

          world.commands["/n_run"](w, ["/n_run", 1, 1]);
          assert.isTrue(w.nodes[1].running);

          world.commands["/n_run"](w, ["/n_run", 2, 0]);
          assert.isTrue(w.nodes[1].running);
          assert.isUndefined(w.nodes[2]);
        });
        it("/n_free", function() {
          var doneAction = null;
          w = cc.createWorld(0);
          w.nodes[1] = {
            doneAction: function(action) {
              if (doneAction === null) {
                doneAction = action;
              } else {
                throw "once";
              }
            }
          };

          world.commands["/n_free"](w, ["/n_free", 1]);
          assert.equal(doneAction, 2);
          
          world.commands["/n_free"](w, ["/n_free", 2]);
        });
        it("/n_set", function() {
          var controls = null;
          w = cc.createWorld(0);
          w.nodes[1] = {
            set: function(_controls) {
              if (controls === null) {
                controls = _controls;
              } else {
                throw "once";
              }
            }
          };

          world.commands["/n_set"](w, ["/n_set", 1, [0,1,2,3]]);
          assert.deepEqual(controls, [0,1,2,3]);
          
          world.commands["/n_set"](w, ["/n_set", 2, [0,1,2,3]]);
        });
        it("/g_new", function() {
          w = cc.createWorld(0);
          w.nodes[1] = "target";
          world.commands["/g_new"](w, ["/g_new", 2, 3, 1]);
          assert.deepEqual(w.nodes[2], [ w, 2, "target", 3 ]);
        });
        it("/g_new (failed)", function() {
          w = cc.createWorld(0);
          world.commands["/g_new"](w, ["/g_new", 2, 3, 1]);
          assert.isUndefined(w.nodes[2]);
        });
        it("/s_def", function() {
          w = cc.createWorld(0);
          world.commands["/s_def"](w, ["/s_def", 1, {spec:"spec"}]);
          assert.deepEqual(w.defs[1], {spec:"spec"});
        });
        it("/s_new", function() {
          w = cc.createWorld(0);
          w.nodes[1] = "target";
          world.commands["/s_new"](w, ["/s_new", 2, 3, 1, 4, ["controls"]]);
          assert.deepEqual(w.nodes[2], [ w, 2, "target", 3, 4, ["controls"] ]);
        });
        it("/s_new (failed)", function() {
          w = cc.createWorld(0);
          world.commands["/s_new"](w, ["/s_new", 2, 3, 1, 4, ["controls"]]);
          assert.isUndefined(w.nodes[2]);
        });
        describe("buffer", function() {
          describe("/b_new", function() {
            it("normal", function() {
              w = cc.createWorld(0);
              world.commands["/b_new"](w, ["/b_new", 0, 1, 2]);
              assert.deepEqual(w.buffers[0], [ 0, 1, 2 ]);
            });
          });
          describe("/b_free", function() {
            it("normal", function() {
              w = cc.createWorld(0);
              w.buffers[0] = "buffer1";
              w.buffers[1] = "buffer2";
              world.commands["/b_free"](w, ["/b_free", 0]);
              assert.deepEqual(w.buffers, [ null, "buffer2" ]);
            });
          });
          describe("/b_zero", function() {
            it("normal", function() {
              var passed = false;
              w = cc.createWorld(0);
              w.buffers[0] = {
                zero: function() { passed = true; }
              };
              world.commands["/b_zero"](w, ["/b_zero", 0]);
              assert.isTrue(passed);
            });
            it("missing", function() {
              w = cc.createWorld(0);
              assert.doesNotThrow(function() {
                world.commands["/b_zero"](w, ["/b_zero", 10]);
              });
            });
          });
          describe("/b_set", function() {
            it("normal", function() {
              var params = null;
              w = cc.createWorld(0);
              w.buffers[0] = {
                set: function() { params = [].slice.call(arguments); }
              };
              world.commands["/b_set"](w, ["/b_set", 0, [ 1, 2, 3 ]]);
              assert.deepEqual(params, [[ 1, 2, 3 ]]);
            });
            it("missing", function() {
              w = cc.createWorld(0);
              assert.doesNotThrow(function() {
                world.commands["/b_set"](w, ["/b_set", 10]);
              });
            });
          });
          describe("/b_get", function() {
            it("normal", function() {
              var params = null;
              w = cc.createWorld(0);
              w.buffers[0] = {
                get: function() { params = [].slice.call(arguments); }
              };
              world.commands["/b_get"](w, ["/b_get", 0, 1, 2 ]);
              assert.deepEqual(params, [ 1, 2 ]);
            });
            it("missing", function() {
              w = cc.createWorld(0);
              assert.doesNotThrow(function() {
                world.commands["/b_get"](w, ["/b_get", 10]);
              });
            });
          });
          describe("/b_getn", function() {
            it("normal", function() {
              var params = null;
              w = cc.createWorld(0);
              w.buffers[0] = {
                getn: function() { params = [].slice.call(arguments); }
              };
              world.commands["/b_getn"](w, ["/b_getn", 0, 1, 2, 3 ]);
              assert.deepEqual(params, [ 1, 2, 3 ]);
            });
            it("missing", function() {
              w = cc.createWorld(0);
              assert.doesNotThrow(function() {
                world.commands["/b_getn"](w, ["/b_getn", 10]);
              });
            });
          });
          describe("/b_fill", function() {
            it("normal", function() {
              var params = null;
              w = cc.createWorld(0);
              w.buffers[0] = {
                fill: function() { params = [].slice.call(arguments); }
              };
              world.commands["/b_fill"](w, ["/b_fill", 0, [1, 2, 3] ]);
              assert.deepEqual(params, [[ 1, 2, 3 ]]);
            });
            it("missing", function() {
              w = cc.createWorld(0);
              assert.doesNotThrow(function() {
                world.commands["/b_fill"](w, ["/b_fill", 10]);
              });
            });
          });
          describe("/b_gen", function() {
            it("normal", function() {
              var params = null;
              w = cc.createWorld(0);
              w.buffers[0] = {
                gen: function() { params = [].slice.call(arguments); }
              };
              world.commands["/b_gen"](w, ["/b_gen", 0, "cmd", 7, 1, 2, 3 ]);
              assert.deepEqual(params, [ "cmd", 7, [ 1, 2, 3 ] ]);
            });
            it("missing", function() {
              w = cc.createWorld(0);
              assert.doesNotThrow(function() {
                world.commands["/b_gen"](w, ["/b_gen", 10]);
              });
            });
          });
          describe("BINARY_CMD_SET_SYNC", function() {
            it("normal", function() {
              var uint8 = new Uint8Array(C.SYNC_ITEM_LEN);
              var int16 = new Uint16Array(uint8.buffer);
              var int32 = new Uint32Array(uint8.buffer);
              var f32   = new Float32Array(uint8.buffer);
              int16[0] = C.BINARY_CMD_SET_SYNC;
              int32[C.SYNC_COUNT] = 1;
              f32[C.POS_X]        = 2;
              f32[C.POS_Y]        = 3;
              f32[C.BUTTON]       = 4;
              
              w = cc.createWorld(0);
              
              cc.server.sysSyncCount = 0;
              w.doBinayCommand(uint8);
              
              assert.deepEqual(w.syncItems, uint8);
              assert.equal(cc.server.sysSyncCount, int32[C.SYNC_COUNT]);
            });
            it("not update", function() {
              var uint8 = new Uint8Array(C.SYNC_ITEM_LEN);
              var int16 = new Uint16Array(uint8.buffer);
              var int32 = new Uint32Array(uint8.buffer);
              var f32   = new Float32Array(uint8.buffer);
              int16[0] = C.BINARY_CMD_SET_SYNC;
              int32[C.SYNC_COUNT] = 1;
              f32[C.POS_X]        = 2;
              f32[C.POS_Y]        = 3;
              f32[C.BUTTON]       = 4;
              
              w = cc.createWorld(0);
              
              cc.server.sysSyncCount = 10;
              w.doBinayCommand(uint8);
              
              assert.deepEqual(w.syncItems, uint8);
              assert.equal(cc.server.sysSyncCount, 10);
            });
          });
          describe("BINARY_CMD_SET_BUFFER", function() {
            it("normal", function() {
              var params = null;
              w = cc.createWorld(0);
              w.buffers[0] = {
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
              w.doBinayCommand(uint8);
              assert.deepEqual(params, [ 44100, 2, 16, new Float32Array([ 1, 2 ]) ]);
            });
            it("missing", function() {
              w = cc.createWorld(0);
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
                w.doBinayCommand(uint8);
              });
            });
          });
        });
      });
    });
  });

});
