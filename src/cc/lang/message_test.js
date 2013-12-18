define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;
  var testTools = require("../../testTools");

  var cc = require("./cc");
  var message = require("./message");
  
  describe("lang/message.js", function() {
    testTools.mock("lang");
    describe("Message", function() {
      it("send", function() {
        cc.global.Message.send("message", [1, 2, 3], 4);
        assert.deepEqual(cc.lang.sendToClient.result, [
          ["/send", ["message", [1, 2, 3], 4]]
        ]);
      });
    });
  });

});
