define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("../../testTools").unitTestSuite;
  var unit = require("../server/unit");
  var line = require("./line");
  
  unitTestSuite.desc = "plugins/line.js";
  
  unitTestSuite(["Line", "XLine"], [
    { rate  : C.CONTROL,
      inputs: [
        { name:"start"     , rate:C.SCALAR, value:0.01 },
        { name:"end"       , rate:C.SCALAR, value:1    },
        { name:"dur"       , rate:C.SCALAR, value:1    },
        { name:"doneAction", rate:C.SCALAR, value:0    },
      ]
    },
    { rate  : C.CONTROL,
      inputs: [
        { name:"start"     , rate:C.SCALAR, value:0.01 },
        { name:"end"       , rate:C.SCALAR, value:1    },
        { name:"dur"       , rate:C.SCALAR, value:0    },
        { name:"doneAction", rate:C.SCALAR, value:0    },
      ]
    }
  ]);

});
