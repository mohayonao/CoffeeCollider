define(function(require, exports, module) {
  "use strict";

  var fs = require("fs");
  var assert = require("chai").assert;
  var Compiler = require("../exports/compiler").Compiler;
  var object = require("../client/object");
  var uop = require("../client/uop");
  var bop = require("../client/bop");
  
  assert.deepCloseTo = function(expected, actual, delta) {
    expected.forEach(function(x, i) {
      assert.closeTo(x, actual[i], delta);
    });
  };
  
  describe("eval.js", function() {
    var calc;
    before(function() {
      var compiler = new Compiler();
      object.install();
      uop.install();
      bop.install();
      calc = function(code) {
        code = compiler.compile(code);
        return eval.call(null, code);
      };
    });
    var list = fs.readdirSync(__dirname + "/eval_case").filter(function(name) {
      return /\.coffee$/.test(name);
    }).map(function(name) {
      return name.replace(/\.coffee$/, "");
    });
    list.forEach(function(name) {
      var codepath = __dirname + "/eval_case/" + name + ".coffee";
      var jsonpath = __dirname + "/eval_case/" + name + ".json";
      if (!fs.existsSync(jsonpath)) {
        return;
      }
      var code = fs.readFileSync(codepath).toString();
      var desc = /^#[^!]\s*(.+)(?=\n)/.exec(code);
      desc = desc ? name + " " + desc[1] : name;
      it(desc, function() {
        var actual = calc(code);
        var expected = JSON.parse(fs.readFileSync(jsonpath).toString());
        var protocol = /^#!\s*(deepEqual|closeTo|deepCloseTo)\s*\n/m.exec(code);
        protocol = protocol ? protocol[1] : "equal";
        switch (protocol) {
        case "deepEqual":
          assert.deepEqual(actual, expected);
          break;
        case "closeTo":
          assert.closeTo(actual, expected, 1e-6);
          break;
        case "deepCloseTo":
          assert.deepCloseTo(actual, expected, 1e-6);
          break;
        default:
          assert.equal(actual, expected);
          break;
        }
      });
    });
  });

});
