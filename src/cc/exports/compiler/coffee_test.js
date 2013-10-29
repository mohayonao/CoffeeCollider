define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var compiler = require("./coffee");

  Array.prototype.erode = function() {
    return this.map(function(token) {
      return token.slice(0, 2);
    });
  };
  
  describe("coffee.js", function() {
    describe("splitCodeAndData", function() {
      it("__END__ does not exist", function() {
        var code = [
          "this is code",
          "this is too",
        ].join("\n");
        var expected = [
          "this is code\nthis is too",
          ""
        ];
        var actual = compiler.splitCodeAndData(code);
        assert.deepEqual(actual, expected);
      });
      it("__END__ exists", function() {
        var code = [
          "this is code",
          "this is too",
          "__END__",
          "this is data",
          "this is too",
        ].join("\n");
        var expected = [
          "this is code\nthis is too",
          "this is data\nthis is too"
        ];
        var actual = compiler.splitCodeAndData(code);
        assert.deepEqual(actual, expected);
      });
    });
    describe("findOperandHead", function() {
      it("Unary operator", function() {
        /*
          ( +Math.PI * 2 )
            ^------^
         */
        var tokens = [
          ["("           , "("     ],
          [  "+"         ,   "+"   ], // <-- head
          [  "IDENTIFIER",   "Math"],
          [  "."         ,   "."   ],
          [  "IDENTIFIER",   "PI"  ],
          [  "MATH"      ,   "*"   ], // <-- from
          [  "NUMBER"    ,   "10"  ],
          [")"           , ")"     ],
          ["TERMINATOR"  , "\n"    ],
        ];
        var expected = 1;
        var actual = compiler.findOperandHead(tokens, 5);
        assert.equal(actual, expected);
      });
      it("Assign", function() {
        /*
          ( a = Math.sin(10) * 10 )
                ^----------^
         */
        var tokens = [
          ["IDENTIFIER"  , "a"   ],
          ["="           , "="   ],
          ["IDENTIFIER"  , "Math"], // <-- head
          ["."           , "."   ],
          ["IDENTIFIER"  , "sin" ],
          ["CALL_START"  , "("   ],
          [  "NUMBER"    ,   "10"],
          ["CALL_END"    , ")"   ],
          ["MATH"        , "*"   ], // <-- from
          ["NUMBER"      , "10"  ],
          ["TERMINATOR"  , "\n"  ],
        ];
        var expected = 2;
        var actual = compiler.findOperandHead(tokens, 8);
        assert.equal(actual, expected);
      });
      it("Begin of parenthesis", function() {
        /*
          [ (Math.PI + 10) * 10 ]
            ^------------^
         */
        var tokens = [
          ["["             , "["       ],
          [  "("           ,   "("     ], // <-- head
          [    "IDENTIFIER",     "Math"],
          [    "."         ,     "."   ],
          [    "IDENTIFIER",     "PI"  ],
          [    "+"         ,     "+"   ],
          [    "NUMBER"    ,     "10"  ],
          [  ")"           ,   ")"     ],
          [  "MATH"        ,   "*"     ], // <-- from
          ["  NUMBER"      ,   "10"    ],
          ["]"             , "]"       ],
          ["TERMINATOR"    , "\n"      ],
        ];
        var expected = 1;
        var actual = compiler.findOperandHead(tokens, 8);
        assert.equal(actual, expected);
      });
      it("Begin of a function", function() {
        /*
          def (x=100)->
            x
          , 300
         */
        var tokens = [
          ["IDENTIFIER"    , "def"    ],
          ["CALL_START"    , "("      ],
          [  "PARAM_START" ,   "("    ], // <-- head
          [    "IDENTIFIER",     "x"  ],
          [    "="         ,     "="  ],
          [    "NUMBER"    ,     "100"],
          [  "PARAM_END"   ,   ")"    ],
          [  "->"          ,   "->"   ],
          [  "INDENT"      ,   2      ],
          [    "IDENTIFIER",     "x"  ],
          [    "TERMINATOR",     "\n" ],      
          [    "IDENTIFIER",     "x"  ],
          [  "OUTDENT"     ,   2      ],
          [  ","           ,   ","    ], // <-- from
          [  "NUMBER"      ,   "300"  ],
          ["CALL_END"      ,   ")"    ],
          ["TERMINATOR"    , "\n"     ],
        ];
        var expected = 2;
        var actual = compiler.findOperandHead(tokens, 13);
        assert.equal(actual, expected);
      });
    });
    describe("findOperandTail", function() {
      /*
        10 * Math.PI
             ^-----^
       */
      it("", function() {
        var tokens = [
          ["NUMBER"    , "10"  ],
          ["MATH"      , "*"   ], // <-- from
          ["IDENTIFIER", "Math"],
          ["."         , "."   ],
          ["IDENTIFIER", "PI"  ], // <-- tail
          ["TERMINATOR", "\n"  ],
        ];
        var expected = 4;
        var actual = compiler.findOperandTail(tokens, 1);
        assert.equal(actual, expected);
      });
      it("End of parenthesis", function() {
        /*
          10 * (Math.PI * 10)
               ^------------^
         */
        var tokens = [
          ["NUMBER"      , "10"    ],
          ["MATH"        , "*"     ], // <-- from
          ["("           , "("     ],
          [  "IDENTIFIER",   "Math"],
          [  "."         ,   "."   ],
          [  "IDENTIFIER",   "PI"  ],
          [  "MATH"      ,   "*"   ],
          [  "NUMBER"    ,   "10"  ],
          [")"           , ")"     ], // <-- tail
          ["TERMINATOR"  , "\n"    ],
        ];
        var expected = 8;
        var actual = compiler.findOperandTail(tokens, 1);
        assert.equal(actual, expected);
      });
      it("End of a function calling", function() {
        /*
          ( ~[].func() )
             ^-------^
         */
        var tokens = [
          ["("           , "("     ],
          [  "UNARY"     ,   "~"   ], // <-- from
          [  "["         ,   "["   ],
          [  "]"         ,   "]"   ],
          [  "."         ,   "."   ],
          [  "IDENTIFIER",   "func"],
          [  "CALL_START",   "("   ],
          [  "CALL_END"  ,   ")"   ], // <-- tail
          [")"           , ")"     ],
          ["TERMINATOR"  , "\n"    ],
        ];
        var expected = 7;
        var actual = compiler.findOperandTail(tokens, 1);
        assert.equal(actual, expected);
      });
      it("End of a function", function() {
        /*
          x = (x=100)->
            x
          x()
         */
        var tokens = [
          ["IDENTIFIER"  , "x"    ],
          ["="           , "="    ], // <-- from
          ["PARAM_START" , "("    ],
          [  "IDENTIFIER",   "x"  ],
          [  "="         ,   "="  ],
          [  "NUMBER"    ,   "100"],
          ["PARAM_END"   , ")"    ],
          ["->"          , "->"   ],
          ["INDENT"      , 2      ],
          [  "IDENTIFIER",   "x"  ],
          ["OUTDENT"     , 2      ],
          ["TERMINATOR"  , "\n"   ], // <-- tail
          ["IDENTIFIER"  , "x"    ],
          ["CALL_START"  , ")"    ],
          ["CALL_END"    , ")"    ],
          ["TERMINATOR"  , "\n"   ],      
        ];
        var expected = 10;
        var actual = compiler.findOperandTail(tokens, 1);
        assert.equal(actual, expected);
      });
    });
    describe("replacePi", function() {
      it("case 1", function() {
        /*
          source:
          pi

          replaced:
          Math.PI
        */
        var tokens = [
          ["IDENTIFIER", "pi"],
          ["TERMINATOR", "\n"],
        ];
        var expected = [
          ["IDENTIFIER", "Math"],
          ["."         , "."   ],
          ["IDENTIFIER", "PI"  ],
          ["TERMINATOR", "\n"  ],
        ];
        var actual = compiler.replacePi(tokens).erode();
        assert.deepEqual(actual, expected);
      });
      it("case 2", function() {
        /*
          source:
          [ 10pi ]

          replaced:
          [ (10 * Math.PI) ]
         */
        var tokens = [
          ["["           , "["   ],
          [  "NUMBER"    ,   "10"],
          [  "IDENTIFIER",   "pi"],
          ["]"           , "]"   ],
          ["TERMINATOR"  , "\n"  ],
        ];
        var expected = [
          ["["             , "["      ],
          [  "("           ,   "("     ],
          [    "NUMBER"    ,     "10"  ],
          [    "MATH"      ,     "*"   ],
          [    "IDENTIFIER",     "Math"],
          [    "."         ,     "."   ],
          [    "IDENTIFIER",     "PI"  ],
          [  ")"           ,   ")"     ],
          ["]"             , "]"       ],
          ["TERMINATOR"    , "\n"      ],
        ];
        var actual = compiler.replacePi(tokens).erode();
        assert.deepEqual(actual, expected);
      });
      it("case 3", function() {
        /*
          source:
          -10pi

          replaced:
          (-10 * Math.PI)
         */
        var tokens = [
          ["-"         , "-" ],
          ["NUMBER"    , "10"],
          ["IDENTIFIER", "pi"],
          ["TERMINATOR", "\n"],
        ];
        var expected = [
          ["("           , "("     ],
          [  "-"         ,   "-"   ],
          [  "NUMBER"    ,   "10"  ],
          [  "MATH"      ,   "*"   ],
          [  "IDENTIFIER",   "Math"],
          [  "."         ,   "."   ],
          [  "IDENTIFIER",   "PI"  ],
          [")"           , ")"     ],
          ["TERMINATOR"  , "\n"    ],
        ];
        var actual = compiler.replacePi(tokens).erode();
        assert.deepEqual(actual, expected);
      });
    });
    describe("replacePrecedence", function() {
      it("case 1", function() {
        /*
          source:
          a * b + c

          replaced:
          (a * b) + c
         */
        var tokens = [
          ["IDENTIFIER", "a" ],
          ["MATH"      , "*" ],
          ["IDENTIFIER", "b" ],
          ["+"         , "+" ],
          ["IDENTIFIER", "c" ],
          ["TERMINATOR", "\n"],
        ];
        var expected = [
          ["("           , "("   ],
          [  "IDENTIFIER",   "a" ],
          [  "MATH"      ,   "*" ],
          [  "IDENTIFIER",   "b" ],
          [")"           , ")"   ],
          ["+"           , "+"   ],
          ["IDENTIFIER"  , "c"   ],
          ["TERMINATOR"  , "\n"  ],
        ];
        var actual = compiler.replacePrecedence(tokens).erode();
        assert.deepEqual(actual, expected);
      });
    });
    describe("replaceBinaryOp", function() {
      it("case 1", function() {
        /*
          source:
          a + b

          replaced:
          a.__add__(b)
        */
        var tokens = [
          ["IDENTIFIER", "a" ],
          ["+"         , "+" ],
          ["IDENTIFIER", "b" ],
          ["TERMINATOR", "\n"],
        ];
        var expected = [
          ["IDENTIFIER", "a"      ],
          ["."         , "."      ],
          ["IDENTIFIER", "__add__"],
          ["CALL_START", "("      ],
          [  "IDENTIFIER",   "b"  ],
          ["CALL_END"  , ")"      ],
          ["TERMINATOR", "\n"     ],
        ];
        var actual = compiler.replaceBinaryOp(tokens).erode();
        assert.deepEqual(actual, expected);
      });
    });
    describe("replaceLogicOp", function() {
      it("case 1", function() {
        /*
          source:
          a || b

          replaced:
          a || b    (do nothing)
        */
        var tokens = [
          ["IDENTIFIER", "a" ],
          ["LOGIC"     , "||"],
          ["IDENTIFIER", "b" ],
          ["TERMINATOR", "\n"],
        ];
        var expected = tokens.slice(0);
        var actual = compiler.replaceLogicOp(tokens).erode();
        assert.deepEqual(actual, expected);
      });
      it("case 2", function() {
        /*
          source:
          @wait a && b

          replaced:
          @wait a.__and__(b)
        */
        var tokens = [
          ["@"           , "@"   ],
          ["IDENTIFIER"  , "wait"],
          ["CALL_START"  , "("   ],
          [  "IDENTIFIER",   "a" ],
          [  "LOGIC"     ,   "&&"],
          [  "IDENTIFIER",   "b" ],
          ["CALL_END"    , ")"   ],
          ["TERMINATOR"  , "\n"  ],
        ];
        var expected = [
          ["@"             , "@"        ],
          ["IDENTIFIER"    , "wait"     ],
          ["CALL_START"    , "("        ],
          [  "IDENTIFIER"  ,   "a"      ],
          [  "."           ,   "."      ],
          [  "IDENTIFIER"  ,   "__and__"],
          [  "CALL_START"  ,   "("      ],
          [    "IDENTIFIER",     "b"    ],
          [  "CALL_END"    ,   ")"      ],
          ["CALL_END"      , ")"        ],
          ["TERMINATOR"    , "\n"       ],
        ];
        var actual = compiler.replaceLogicOp(tokens).erode();
        assert.deepEqual(actual, expected);
      });
      it("case 3", function() {
        /*
          source:
          ->
            @wait a && b

          replaced:
          ->
            @wait a.__and__(b)
        */
        var tokens = [
          ["->"            , "->"    ],
          ["INDENT"        , 2       ],
          [  "@"           ,   "@"   ],
          [  "IDENTIFIER"  ,   "wait"],
          [  "CALL_START"  ,   "("   ],
          [    "IDENTIFIER",     "a" ],
          [    "LOGIC"     ,     "&&"],
          [    "IDENTIFIER",     "b" ],
          [  "CALL_END"    ,   ")"   ],
          ["OUTDENT"       , 2       ],
          ["TERMINATOR"    , "\n"    ],
        ];
        var expected = [
          ["->"              , "->"         ],
          ["INDENT"          , 2            ],
          [  "@"             ,   "@"        ],
          [  "IDENTIFIER"    ,   "wait"     ],
          [  "CALL_START"    ,   "("        ],
          [    "IDENTIFIER"  ,     "a"      ],
          [    "."           ,     "."      ],
          [    "IDENTIFIER"  ,     "__and__"],
          [    "CALL_START"  ,     "("      ],
          [      "IDENTIFIER",       "b"    ],
          [    "CALL_END"    ,     ")"      ],
          [  "CALL_END"      ,   ")"        ],
          ["OUTDENT"         , 2            ],
          ["TERMINATOR"      , "\n"         ],
        ];
        var actual = compiler.replaceLogicOp(tokens).erode();
        assert.deepEqual(actual, expected);
      });
      it("case 4", function() {
        /*
          source:
          @wait (a && b) || c

          replaced:
          @wait (a.__and__(b)).__or__(c)
        */
        var tokens = [
          ["@"             , "@"     ],
          ["IDENTIFIER"    , "wait"  ],
          ["CALL_START"    , "("     ],
          [  "("           ,   "("   ],
          [    "IDENTIFIER",     "a" ],
          [    "LOGIC"     ,     "&&"],
          [    "IDENTIFIER",     "b" ],
          [  ")"           ,   ")"   ],
          [  "LOGIC"       ,   "||"  ],
          [  "IDENTIFIER"  ,   "c"   ],
          ["CALL_END"      , ")"     ],
          ["TERMINATOR"    , "\n"    ],
        ];
        var expected = [
          ["@"               , "@"          ],
          ["IDENTIFIER"      , "wait"       ],
          ["CALL_START"      , "("          ],
          [  "("             ,   "("        ],
          [    "IDENTIFIER"  ,     "a"      ],
          [    "."           ,     "."      ],
          [    "IDENTIFIER"  ,     "__and__"],
          [    "CALL_START"  ,     "("      ],
          [      "IDENTIFIER",       "b"    ],
          [    "CALL_END"    ,     ")"      ],
          [  ")"             ,   ")"        ],
          [  "."             ,   "."        ],
          [  "IDENTIFIER"    ,   "__or__"   ],
          [  "CALL_START"    ,   "("        ],
          [    "IDENTIFIER"  ,     "c"      ],
          [  "CALL_END"      ,   ")"        ],
          ["CALL_END"        , ")"          ],
          ["TERMINATOR"      , "\n"         ],
        ];
        var actual = compiler.replaceLogicOp(tokens).erode();
        assert.deepEqual(actual, expected);
      });
      it("case 5", function() {
        /*
          source:
          @wait a && b, (x = a && b)->
            x

          replaced:
          @wait a.__and__(b), (x = a && b)->
            x
        */
        var tokens = [
          ["@"             , "@"     ],
          ["IDENTIFIER"    , "wait"  ],
          ["CALL_START"    , "("     ],
          [  "IDENTIFIER"  ,   "a"   ],
          [  "LOGIC"       ,   "&&"  ],
          [  "IDENTIFIER"  ,   "b"   ],
          [  ","           ,   ","   ],
          [  "PARAM_START" ,   "("   ],
          [    "IDENTIFIER",     "x" ],
          [    "="         ,     "=" ],
          [    "IDENTIFIER",     "a" ],
          [    "LOGIC"     ,     "&&"],
          [    "IDENTIFIER",     "b" ],
          [  "PARAM_END"   ,   ")"   ],
          [  "->"          ,   "->"  ],
          [  "INDENT"      ,   2     ],
          [    "IDENTIFIER",     "x" ],
          [  "OUTDENT"     ,   2     ],
          ["CALL_END"      , ")"     ],
          ["TERMINATOR"    , "\n"    ],
        ];
        var expected = [
          ["@"             , "@"        ],
          ["IDENTIFIER"    , "wait"     ],
          ["CALL_START"    , "("        ],
          [  "IDENTIFIER"  ,   "a"      ],
          [  "."           ,   "."      ],
          [  "IDENTIFIER"  ,   "__and__"],
          [  "CALL_START"  ,   "("      ],
          [    "IDENTIFIER",     "b"    ],
          [  "CALL_END"    ,   ")"      ],
          [  ","           ,   ","      ],
          [  "PARAM_START" ,   "("      ],
          [    "IDENTIFIER",     "x"    ],
          [    "="         ,     "="    ],
          [    "IDENTIFIER",     "a"    ],
          [    "LOGIC"     ,     "&&"   ],
          [    "IDENTIFIER",     "b"    ],
          [  "PARAM_END"   ,   ")"      ],
          [  "->"          ,   "->"     ],
          [  "INDENT"      ,   2        ],
          [    "IDENTIFIER",     "x"    ],
          [  "OUTDENT"     ,   2        ],
          ["CALL_END"      , ")"        ],
          ["TERMINATOR"    , "\n"       ],
        ];
        var actual = compiler.replaceLogicOp(tokens).erode();
        assert.deepEqual(actual, expected);
      });
      it("case 6", function() {
        /*
          source:
          @wait a && ((x=a&&b)->x) && b, (x = a && b)->
            x

          replaced:
          @wait a.__and__(((x=a&&b)->x)).__and__(b), (x = a && b)->
            x
        */
        var tokens = [
          ["@"               , "@"     ],
          ["IDENTIFIER"      , "wait"  ],
          ["CALL_START"      , "("     ],
          [  "IDENTIFIER"    ,   "a"   ],
          [  "LOGIC"         ,   "&&"  ],
          [  "("             ,   "("   ],
          [    "PARAM_START" ,     "(" ],
          [      "IDENTIFIER",     "x" ],
          [      "="         ,     "=" ],
          [      "IDENTIFIER",     "a" ],
          [      "LOGIC"     ,     "&&"],
          [      "IDENTIFIER",     "b" ],
          [    "PARAM_END"   ,   ")"   ],
          [    "->"          ,   "->"  ],
          [    "INDENT"      ,   2     ],
          [      "IDENTIFIER",     "x" ],
          [    "OUTDENT"     ,   2     ],
          [  ")"             ,   ")"   ],
          [  "LOGIC"         ,   "&&"  ],
          [  "IDENTIFIER"    ,   "b"   ],
          [  ","             ,   ","   ],
          [  "PARAM_START"   ,   "("   ],
          [    "IDENTIFIER"  ,     "x" ],
          [    "="           ,     "=" ],
          [    "IDENTIFIER"  ,     "a" ],
          [    "LOGIC"       ,     "&&"],
          [    "IDENTIFIER"  ,     "b" ],
          [  "PARAM_END"     ,   ")"   ],
          [  "->"            ,   "->"  ],
          [  "INDENT"        ,   2     ],
          [    "IDENTIFIER"  ,     "x" ],
          [  "OUTDENT"       ,   2     ],
          ["CALL_END"        , ")"     ],
          ["TERMINATOR"      , "\n"    ],
        ];
        var expected = [
          ["@"                 , "@"         ],
          ["IDENTIFIER"        , "wait"      ],
          ["CALL_START"        , "("         ],
          [  "IDENTIFIER"      ,   "a"       ],
          [  "."               ,   "."       ],
          [  "IDENTIFIER"      ,   "__and__" ],
          [  "CALL_START"      ,   "("       ],
          [    "("             ,     "("     ],
          [      "PARAM_START" ,       "("   ],
          [        "IDENTIFIER",         "x" ],
          [        "="         ,         "=" ],
          [        "IDENTIFIER",         "a" ],
          [        "LOGIC"     ,         "&&"],
          [        "IDENTIFIER",         "b" ],
          [      "PARAM_END"   ,       ")"   ],
          [      "->"          ,       "->"  ],
          [      "INDENT"      ,       2     ],
          [        "IDENTIFIER",         "x" ],
          [      "OUTDENT"     ,       2     ],
          [    ")"             ,     ")"     ],
          [  "CALL_END"        ,   ")"       ],
          [  "."               ,   "."       ],
          [  "IDENTIFIER"      ,   "__and__" ],
          [  "CALL_START"      ,   "("       ],
          [    "IDENTIFIER"    ,     "b"     ],
          [  "CALL_END"        ,   ")"       ],
          [  ","               ,   ","       ],
          [  "PARAM_START"     ,   "("       ],
          [    "IDENTIFIER"    ,     "x"     ],
          [    "="             ,     "="     ],
          [    "IDENTIFIER"    ,     "a"     ],
          [    "LOGIC"         ,     "&&"    ],
          [    "IDENTIFIER"    ,     "b"     ],
          [  "PARAM_END"       ,   ")"       ],
          [  "->"              ,   "->"      ],
          [  "INDENT"          ,   2         ],
          [    "IDENTIFIER"    ,     "x"     ],
          [  "OUTDENT"         ,   2         ],
          ["CALL_END"          , ")"         ],
          ["TERMINATOR"        , "\n"        ],
        ];
        var actual = compiler.replaceLogicOp(tokens).erode();
        assert.deepEqual(actual, expected);
      });
      it("case 7", function() {
        /*
          source:
          @wait a && [ b || c ]

          replaced:
          @wait a.__and__([b.__or__(c)])

        */
        var tokens = [
          ["@"               , "@"     ],
          ["IDENTIFIER"      , "wait"  ],
          ["CALL_START"      , "("     ],
          [  "IDENTIFIER"    ,   "a"   ], 
          [  "LOGIC"         ,   "&&"  ],
          [  "["             ,   "["   ],
          [    "IDENTIFIER"  ,     "b" ], 
          [    "LOGIC"       ,     "||"],
          [    "IDENTIFIER"  ,     "c" ], 
          [  "]"             ,   "]"   ],
          ["CALL_END"          , ")"   ],
          ["TERMINATOR"        , "\n"  ],
        ];
        var expected = [
          ["@"                 , "@"           ],
          ["IDENTIFIER"        , "wait"        ],
          ["CALL_START"        , "("           ],
          [  "IDENTIFIER"      ,   "a"         ], 
          [  "."               ,   "."         ],
          [  "IDENTIFIER"      ,   "__and__"   ],
          [  "CALL_START"      ,   "("         ],
          [    "["             ,     "["       ],
          [      "IDENTIFIER"  ,       "b"     ],
          [      "."           ,       "."     ],
          [      "IDENTIFIER"  ,       "__or__"],
          [      "CALL_START"  ,       "("     ],
          [        "IDENTIFIER",         "c"   ],
          [      "CALL_END"    ,       ")"     ],
          [    "]"             ,     "]"       ],
          [  "CALL_END"        ,   ")"         ],
          ["CALL_END"          , ")"           ],
          ["TERMINATOR"        , "\n"          ],
        ];
        var actual = compiler.replaceLogicOp(tokens).erode();
        assert.deepEqual(actual, expected);
      });
    });
    describe("replaceUnaryOp", function() {
      it("case 1", function() {
        /*
          source:
          +a + a

          replaced:
          a.__plus__() + a
         */
        var tokens = [
          ["+"         , "+" ],
          ["IDENTIFIER", "a" ],
          ["+"         , "+" ],
          ["IDENTIFIER", "a" ],
          ["TERMINATOR", "\n"],
        ];
        var expected = [
          ["IDENTIFIER", "a"       ],
          ["."         , "."       ],
          ["IDENTIFIER", "__plus__"],
          ["CALL_START", "("       ],
          ["CALL_END"  , ")"       ],
          ["+"         , "+"       ],
          ["IDENTIFIER", "a"       ],
          ["TERMINATOR", "\n"      ],
        ];
        var actual = compiler.replaceUnaryOp(tokens).erode();
        assert.deepEqual(actual, expected);
      });
      it("case 2", function() {
        /*
          source:
          -a + a

          replaced:
          a.__minus__() + a
         */
        var tokens = [
          ["-"         , "-" ],
          ["IDENTIFIER", "a" ],
          ["+"         , "+" ],
          ["IDENTIFIER", "a" ],
          ["TERMINATOR", "\n"],
        ];
        var expected = [
          ["IDENTIFIER", "a"        ],
          ["."         , "."        ],
          ["IDENTIFIER", "__minus__"],
          ["CALL_START", "("        ],
          ["CALL_END"  , ")"        ],
          ["+"         , "+"        ],
          ["IDENTIFIER", "a"        ],
          ["TERMINATOR", "\n"       ],
        ];
        var actual = compiler.replaceUnaryOp(tokens).erode();
        assert.deepEqual(actual, expected);
      });
      it("case 3", function() {
        /*
          source:
          { a: +100 }

          replaced:
          { a: 100.__plus__() }
         */
        var tokens = [
          ["{"           , "{"    ],
          [  "IDENTIFIER",   "a"  ],
          [  ":"         ,   ":"  ],
          [  "+"         ,   "+"  ],
          [  "NUMBER"    ,   "100"],
          ["}"           , "}"    ],
          ["TERMINATOR"  , "\n"   ],
        ];
        var expected = [
          ["{"           , "{"         ],
          [  "IDENTIFIER",   "a"       ],
          [  ":"         ,   ":"       ],
          [  "NUMBER"    ,   "100"     ],
          [  "."         ,   "."       ],
          [  "IDENTIFIER",   "__plus__"],
          [  "CALL_START",   "("       ],
          [  "CALL_END"  ,   ")"       ],
          ["}"           , "}"         ],
          ["TERMINATOR"  , "\n"        ],
        ];
        var actual = compiler.replaceUnaryOp(tokens).erode();
        assert.deepEqual(actual, expected);
      });
    });
    describe("replaceCompoundAssign", function() {
      it("case 1", function() {
        /*
          source:
          a.a += b.b => a.a

          replaced:
          a.a = a.a.__add__(b.b)
         */
        var tokens = [
          ["IDENTIFIER"     , "a" ],
          ["."              , "." ],
          ["IDENTIFIER"     , "a" ],
          ["COMPOUND_ASSIGN", "+="],
          ["IDENTIFIER"     , "b" ],
          ["."              , "." ],
          ["IDENTIFIER"     , "b" ],
          ["TERMINATOR"     , "\n"],
        ];
        var expected = [
          ["IDENTIFIER"  , "a"      ],
          ["."           , "."      ],
          ["IDENTIFIER"  , "a"      ],
          ["="           , "="      ],
          ["IDENTIFIER"  , "a"      ],
          ["."           , "."      ],
          ["IDENTIFIER"  , "a"      ],
          ["."           , "."      ],
          ["IDENTIFIER"  , "__add__"],
          ["CALL_START"  , "("      ],
          [  "IDENTIFIER",   "b"    ],
          [  "."         ,   "."    ],
          [  "IDENTIFIER",   "b"    ],
          ["CALL_END"    , ")"      ],
          ["TERMINATOR"  , "\n"     ],
        ];
        var actual = compiler.replaceCompoundAssign(tokens).erode();
        assert.deepEqual(actual, expected);
      });
    });
    describe("replaceSynthDef", function() {
      it("case 1", function() {
        /*
          source:
          Synth.def ->
            x
          
          replaced:
          Synth.def ->
            x
          , ""
         */
        var tokens = [
          ["IDENTIFIER"    , "Synth"],
          ["."             , "."    ],
          ["IDENTIFIER"    , "def"  ],
          ["CALL_START"    , "("    ],
          [  "->"          ,   "->" ],
          [  "INDENT"      ,   2    ],
          [    "IDENTIFIER",     "x"],
          [  "OUTDENT"     ,   2    ],
          ["CALL_END"      , ")"    ],
          ["TERMINATOR"    , "\n"   ],      
        ];
        var expected = [
          ["IDENTIFIER"    , "Synth"],
          ["."             , "."    ],
          ["IDENTIFIER"    , "def"  ],
          ["CALL_START"    , "("    ],
          [  "->"          ,   "->" ],
          [  "INDENT"      ,   2    ],
          [    "IDENTIFIER",     "x"],
          [  "OUTDENT"     ,   2    ],
          [  ","           ,   ","  ],
          [  "STRING"      ,   '""' ],
          ["CALL_END"      , ")"    ],
          ["TERMINATOR"    , "\n"   ],      
        ];
        var actual = compiler.replaceSynthDef(tokens).erode();
        assert.deepEqual(actual, expected);
      });
      it("case 2", function() {
        /*
          source:
          Synth.def (x=100, y=200)->
            x

          replaced:
          Synth.def (x=100, y=200)->
            x
          , "x=100,y=200"
         */
        var tokens = [
          ["IDENTIFIER"    , "Synth"  ],
          ["."             , "."      ],
          ["IDENTIFIER"    , "def"    ],
          ["CALL_START"    , "("      ],
          [  "PARAM_START" ,   "("    ],
          [    "IDENTIFIER",     "x"  ],
          [    "="         ,     "="  ],
          [    "NUMBER"    ,     "100"],
          [    ","         ,     ","  ],
          [    "IDENTIFIER",     "y"  ],
          [    "="         ,     "="  ],
          [    "NUMBER"    ,     "200"],
          [  "PARAM_END"   ,   ")"    ],
          [  "->"          ,   "->"   ],
          [  "INDENT"      ,   2      ],
          [    "IDENTIFIER",     "x"  ],
          [  "OUTDENT"     ,   2      ],
          ["CALL_END"      , ")"      ],
          ["TERMINATOR"    , "\n"     ],      
        ];
        var expected = [
          ["IDENTIFIER"    , "Synth"          ],
          ["."             , "."              ],
          ["IDENTIFIER"    , "def"            ],
          ["CALL_START"    , "("              ],
          [  "PARAM_START" ,   "("            ],
          [    "IDENTIFIER",     "x"          ],
          [    "="         ,     "="          ],
          [    "NUMBER"    ,     "100"        ],
          [    ","         ,     ","          ],
          [    "IDENTIFIER",     "y"          ],
          [    "="         ,     "="          ],
          [    "NUMBER"    ,     "200"        ],
          [  "PARAM_END"   ,   ")"            ],
          [  "->"          ,   "->"           ],
          [  "INDENT"      ,   2              ],
          [    "IDENTIFIER",     "x"          ],
          [  "OUTDENT"     ,   2              ],
          [  ","           ,   ","            ],
          [  "STRING"      ,   '"x=100,y=200"'],
          ["CALL_END"      , ")"              ],
          ["TERMINATOR"    , "\n"             ],      
        ];
        var actual = compiler.replaceSynthDef(tokens).erode();
        assert.deepEqual(actual, expected);
      });
      it("case 3", function() {
        /*
          source:
          Synth.def (x=100,y=200)->
            x
          , 300

          replaced:
          Synth.def (x=100,y=200)->
            x
          , "x=100,y=200", 300
         */
        var tokens = [
          ["IDENTIFIER"      , "Synth"    ],
          ["."               , "."        ],
          ["IDENTIFIER"      , "def"      ],
          ["CALL_START"      , "("        ],
          [  "("             ,   "("      ],
          [    "PARAM_START" ,     "("    ],
          [      "IDENTIFIER",       "x"  ],
          [      "="         ,       "="  ],
          [      "NUMBER"    ,       "100"],
          [      ","         ,       ","  ],
          [      "IDENTIFIER",       "y"  ],
          [      "="         ,       "="  ],
          [      "NUMBER"    ,       "200"],
          [    "PARAM_END"   ,     ")"    ],
          [    "->"          ,     "->"   ],
          [    "INDENT"      ,     2      ],
          [      "IDENTIFIER",       "x"  ],
          [    "OUTDENT"     ,     2      ],
          [  ")"             ,   ")"      ],
          [  ","             ,   ","      ],
          [  "NUMBER"        ,   "300"    ],
          ["CALL_END"        , ")"        ],
          ["TERMINATOR"      , "\n"       ],
        ];
        var expected = [
          ["IDENTIFIER"      , "Synth"          ],
          ["."               , "."              ],
          ["IDENTIFIER"      , "def"            ],
          ["CALL_START"      , "("              ],
          [  "("             ,   "("            ],
          [    "PARAM_START" ,     "("          ],
          [      "IDENTIFIER",     "x"          ],
          [      "="         ,     "="          ],
          [      "NUMBER"    ,     "100"        ],
          [      ","         ,     ","          ],
          [      "IDENTIFIER",     "y"          ],
          [      "="         ,     "="          ],
          [      "NUMBER"    ,     "200"        ],
          [    "PARAM_END"   ,   ")"            ],
          [    "->"          ,   "->"           ],
          [    "INDENT"      ,   2              ],
          [      "IDENTIFIER",     "x"          ],
          [    "OUTDENT"     ,   2              ],
          [  ")"             ,   ")"            ],
          [  ","             ,   ","            ],
          [  "STRING"        ,   '"x=100,y=200"'],
          [  ","             ,   ","            ],
          [  "NUMBER"        ,   "300"          ],
          ["CALL_END"        , ")"              ],
          ["TERMINATOR"      , "\n"             ],      
        ];
        var actual = compiler.replaceSynthDef(tokens).erode();
        assert.deepEqual(actual, expected);
      });
    });
    describe("replaceGlobal", function() {
      it("case 1", function() {
        /*
          source:
          $a = 10

          replaced:
          global.a = 10
         */
        var tokens = [
          ["IDENTIFIER", "$a"],
          ["="         , "=" ],
          ["NUMBER"    , "10"],
          ["TERMINATOR", "\n"],
        ];
        var expected = [
          ["IDENTIFIER", "global"],
          ["."         , "."     ],
          ["IDENTIFIER", "a"     ],
          ["="         , "="     ],
          ["NUMBER"    , "10"    ],
          ["TERMINATOR", "\n"    ],
        ];
        var actual = compiler.replaceGlobal(tokens).erode();
        assert.deepEqual(actual, expected);
      });
      it("case 2", function() {
        /*
          source:
          $ = 10

          replaced
          $ = 10    (do nothing)
         */
        var tokens = [
          ["IDENTIFIER", "$" ],
          ["="         , "=" ],
          ["NUMBER"    , "10"],
          ["TERMINATOR", "\n"],
        ];
        var expected = tokens;
        var actual = compiler.replaceGlobal(tokens).erode();
        assert.deepEqual(actual, expected);
      });
      it("case 3", function() {
        /*
          source:
          a.$b = 10

          replaced:
          a.$b = 10    (do nothing)
         */
        var tokens = [
          ["IDENTIFIER", "a" ],
          ["."         , "." ],
          ["IDENTIFIER", "$b"],
          ["="         , "=" ],
          ["NUMBER"    , "10"],
          ["TERMINATOR", "\n"],
        ];
        var expected = tokens;
        var actual = compiler.replaceGlobal(tokens).erode();
        assert.deepEqual(actual, expected);
      });
    });
    describe("cleanupParenthesis", function() {
      /*
        source:
        ((a + b)) => (a + b)

        replaced:
        ( a + b ) => (a + b)
       */
      it("case 1", function() {
        var tokens = [
          ["("             , "("    ],
          [  "("           ,   "("  ],
          [    "IDENTIFIER",     "a"],
          [    "+"         ,     "+"],
          [    "IDENTIFIER",     "b"],
          [  ")"           ,   ")"  ],
          [")"             , ")"    ],
          ["TERMINATOR"    , "\n"   ],
        ];
        var expected = [
          ["("           , "("  ],
          [  "IDENTIFIER",   "a"],
          [  "+"         ,   "+"],
          [  "IDENTIFIER",   "b"],
          [")"           , ")"  ],
          ["TERMINATOR"  , "\n" ],
        ];
        var actual = compiler.cleanupParenthesis(tokens).erode();
        assert.deepEqual(actual, expected);
      });
      it("case 2", function() {
        /*
          source:
          ((a + b) + c)

          replaced:
          ((a + b) + c)    (do nothing)
         */
        var tokens = [
          ["("             , "("    ],
          [  "("           ,   "("  ],
          [    "IDENTIFIER",     "a"],
          [    "+"         ,     "+"],
          [    "IDENTIFIER",     "b"],
          [  ")"           ,   ")"  ],
          [  "+"           ,   "+"  ],
          [  "IDENTIFIER"  ,   "c"  ],
          [")"             , ")"    ],
          ["TERMINATOR"    , "\n"   ],
        ];
        var expected = tokens;
        var actual = compiler.cleanupParenthesis(tokens).erode();
        assert.deepEqual(actual, expected);
      });
    });
    describe("insertReturn", function() {
      it("case 1", function() {
        /*
          source:
          a = 0

          replaced:
          ((global)->
          a = 0
          ).call(_gltc_, this.self||global)
        */
        var tokens = [
          ["IDENTIFIER", "a" ],
          ["="         , "=" ],
          ["NUMBER"    , "0" ],
          ["TERMINATOR", "\n"],
        ];
        var expected = [
          ["("             , "("         ],
          [  "PARAM_START" ,   "("       ],
          [    "IDENTIFIER",     "global"],
          [  "PARAM_END"   ,   ")"       ],
          [  "->"          ,   "->"      ],
          [  "INDENT"      ,   2         ],
          [    "IDENTIFIER",     "a"     ],
          [    "="         ,     "="     ],
          [    "NUMBER"    ,     "0"     ],
          [  "OUTDENT"     ,   2         ],
          [")"             , ")"         ],
          ["."             , "."         ],
          ["IDENTIFIER"    , "call"      ],
          ["CALL_START"    , "("         ],
          [  "IDENTIFIER"  ,   "_gltc_"  ],
          [  ","           ,   ","       ],
          [  "THIS"        ,   "this"    ],
          [  "."           ,   "."       ],
          [  "IDENTIFIER"  ,   "self"    ],
          [  "LOGIC"       ,   "||"      ],
          [  "IDENTIFIER"  ,   "global"  ],
          ["CALL_END"      , ")"         ],
          ["TERMINATOR"    , "\n"        ],
        ];
        var actual = compiler.insertReturn(tokens).erode();
        assert.deepEqual(actual, expected);
      });
    });
  });

});
