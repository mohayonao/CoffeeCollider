define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var compiler = require("./compiler");

  Array.prototype.erode = function() {
    return this.map(function(token) {
      return token.slice(0, 2);
    });
  };
  
  describe("compiler.js", function() {
    describe("splitCodeAndData", function() {
      it("Without __END__", function() {
        var code = [
          "this is code"
        ].join("\n");
        var expected = [
          "this is code",
          ""
        ];
        var actual = compiler.splitCodeAndData(code);
        assert.deepEqual(actual, expected);
      });
      it("With __END__", function() {
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
         */
        var tokens = [
          ["("         , "("   ],
          ["+"         , "+"   ], // <-- head
          ["IDENTIFIER", "Math"],
          ["."         , "."   ],
          ["IDENTIFIER", "PI"  ],
          ["MATH"      , "*"   ], // <-- from
          ["NUMBER"    , "10"  ],
          [")"         , ")"   ],
          ["TERMINATOR", "\n"  ],
        ];
        var expected = 1;
        var actual = compiler.findOperandHead(tokens, 5);
        assert.equal(actual, expected);
      });
      it("Assign", function() {
        /*
          ( a = Math.sin(10) * 10 )
         */
        var tokens = [
          ["IDENTIFIER", "a"   ],
          ["="         , "="   ],
          ["IDENTIFIER", "Math"], // <-- head
          ["."         , "."   ],
          ["IDENTIFIER", "sin" ],
          ["CALL_START" , "("  ],
          ["NUMBER"    , "10"  ],
          ["CALL_END"   , ")"  ],
          ["MATH"      , "*"   ], // <-- from
          ["NUMBER"    , "10"  ],
          ["TERMINATOR", "\n"  ],
        ];
        var expected = 2;
        var actual = compiler.findOperandHead(tokens, 8);
        assert.equal(actual, expected);
      });
      it("Begin of parenthesis", function() {
        /*
          [ (Math.PI + 10) * 10 ]
         */
        var tokens = [
          ["["         , "["   ],
          ["("         , "("   ], // <-- head
          ["IDENTIFIER", "Math"],
          ["."         , "."   ],
          ["IDENTIFIER", "PI"  ],
          ["+"         , "+"   ],
          ["NUMBER"    , "10"  ],
          [")"         , ")"   ],
          ["MATH"      , "*"   ], // <-- from
          ["NUMBER"    , "10"  ],
          ["]"         , "]"   ],
          ["TERMINATOR", "\n"  ],
        ];
        var expected = 1;
        var actual = compiler.findOperandHead(tokens, 8);
        assert.equal(actual, expected);
      });
      it("Begin of a function", function() {
        var tokens = [
          ["IDENTIFIER" , "def"],
          ["CALL_START" , "("  ],
          ["PARAM_START", "("  ], // <-- head
          ["IDENTIFIER" , "x"  ],
          ["="          , "="  ],
          ["NUMBER"     , "100"],
          ["PARAM_END"  , ")"  ],
          ["->"         , "->" ],
          ["INDENT"     , 2    ],
          ["IDENTIFIER" , "x"  ],
          ["TERMINATOR" , "\n" ],      
          ["IDENTIFIER" , "x"  ],
          ["OUTDENT"    , 2    ],
          [","          , ","  ], // <-- from
          ["NUMBER"     , "300"],
          ["CALL_END"   , ")"  ],
          ["TERMINATOR" , "\n" ],
        ];
        var expected = 2;
        var actual = compiler.findOperandHead(tokens, 13);
        assert.equal(actual, expected);
      });
    });
    describe("findOperandTail", function() {
      /*
        10 * Math.PI
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
         */
        var tokens = [
          ["NUMBER"    , "10"  ],
          ["MATH"      , "*"   ], // <-- from
          ["("         , "("   ],
          ["IDENTIFIER", "Math"],
          ["."         , "."   ],
          ["IDENTIFIER", "PI"  ],
          ["MATH"      , "*"   ],
          ["NUMBER"    , "10"  ],
          [")"         , ")"   ], // <-- tail
          ["TERMINATOR", "\n"  ],
        ];
        var expected = 8;
        var actual = compiler.findOperandTail(tokens, 1);
        assert.equal(actual, expected);
      });
      it("End of a function calling", function() {
        /*
          ( ~[].func() )
         */
        var tokens = [
          ["("         , "("   ],
          ["UNARY"     , "~"   ], // <-- from
          ["["         , "["   ],
          ["]"         , "]"   ],
          ["."         , "."   ],
          ["IDENTIFIER", "func"],
          ["CALL_START", "("   ],
          ["CALL_END"  , ")"   ], // <-- tail
          [")"         , ")"   ],
          ["TERMINATOR", "\n"  ],
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
          ["IDENTIFIER" , "x"  ],
          ["="          , "="  ], // <-- from
          ["PARAM_START", "("  ],
          ["IDENTIFIER" , "x"  ],
          ["="          , "="  ],
          ["NUMBER"     , "100"],
          ["PARAM_END"  , ")"  ],
          ["->"         , "->" ],
          ["INDENT"     , 2    ],
          ["IDENTIFIER" , "x"  ],
          ["OUTDENT"    , 2    ],
          ["TERMINATOR" , "\n" ], // <-- here
          ["IDENTIFIER" , "x"  ],
          ["CALL_START" , ")"  ],
          ["CALL_END"   , ")"  ],
          ["TERMINATOR" , "\n" ],      
        ];
        var expected = 10;
        var actual = compiler.findOperandTail(tokens, 1);
        assert.equal(actual, expected);
      });
    });
    describe("replacePi", function() {
      it("pi => Math.PI", function() {
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
      it("-10pi => (-10 * Math.PI)", function() {
        var tokens = [
          ["-"         , "-" ],
          ["NUMBER"    , "10"],
          ["IDENTIFIER", "pi"],
          ["TERMINATOR", "\n"],
        ];
        var expected = [
          ["("         , "("   ],
          ["-"         , "-"   ],
          ["NUMBER"    , "10"  ],
          ["MATH"      , "*"   ],
          ["IDENTIFIER", "Math"],
          ["."         , "."   ],
          ["IDENTIFIER", "PI"  ],
          [")"         , ")"   ],
          ["TERMINATOR", "\n"  ],
        ];
        var actual = compiler.replacePi(tokens).erode();
        assert.deepEqual(actual, expected);
      });
    });
    describe("replacePrecedence", function() {
      it("a * b + c => (a * b) + c", function() {
        var tokens = [
          ["IDENTIFIER", "a" ],
          ["MATH"      , "*" ],
          ["IDENTIFIER", "b" ],
          ["+"         , "+" ],
          ["IDENTIFIER", "c" ],
          ["TERMINATOR", "\n"],
        ];
        var expected = [
          ["("         , "(" ],
          ["IDENTIFIER", "a" ],
          ["MATH"      , "*" ],
          ["IDENTIFIER", "b" ],
          [")"         , ")" ],
          ["+"         , "+" ],
          ["IDENTIFIER", "c" ],
          ["TERMINATOR", "\n"],
        ];
        var actual = compiler.replacePrecedence(tokens).erode();
        assert.deepEqual(actual, expected);
      });
    });
    describe("replaceBinaryOp", function() {
      it("a + b => a.__add__(b)", function() {
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
          ["IDENTIFIER", "b"      ],
          ["CALL_END"  , ")"      ],
          ["TERMINATOR", "\n"     ],
        ];
        var actual = compiler.replaceBinaryOp(tokens).erode();
        assert.deepEqual(actual, expected);
      });
    });
    describe("replaceUnaryOp", function() {
      it("+a + a => a.num() + a", function() {
        var tokens = [
          ["+"         , "+" ],
          ["IDENTIFIER", "a" ],
          ["+"         , "+" ],
          ["IDENTIFIER", "a" ],
          ["TERMINATOR", "\n"],
        ];
        var expected = [
          ["IDENTIFIER", "a"  ],
          ["."         , "."  ],
          ["IDENTIFIER", "num"],
          ["CALL_START", "("  ],
          ["CALL_END"  , ")"  ],
          ["+"         , "+"  ],
          ["IDENTIFIER", "a"  ],
          ["TERMINATOR", "\n" ],
        ];
        var actual = compiler.replaceUnaryOp(tokens).erode();
        assert.deepEqual(actual, expected);
      });
      it("-a + a => a.neg() + a", function() {
        var tokens = [
          ["-"         , "-" ],
          ["IDENTIFIER", "a" ],
          ["+"         , "+" ],
          ["IDENTIFIER", "a" ],
          ["TERMINATOR", "\n"],
        ];
        var expected = [
          ["IDENTIFIER", "a"  ],
          ["."         , "."  ],
          ["IDENTIFIER", "neg"],
          ["CALL_START", "("  ],
          ["CALL_END"  , ")"  ],
          ["+"         , "+" ],
          ["IDENTIFIER", "a" ],
          ["TERMINATOR", "\n" ],
        ];
        var actual = compiler.replaceUnaryOp(tokens).erode();
        assert.deepEqual(actual, expected);
      });
      it("(~-[]) => ([].neg().tilde())", function() {
        var tokens = [
          ["("         , "(" ],
          ["UNARY"     , "~" ],
          ["UNARY"     , "-" ],
          ["["         , "[" ],
          ["]"         , "]" ],
          [")"         , ")" ],
          ["TERMINATOR", "\n"],
        ];
        var expected = [
          ["("         , "("    ],
          ["["         , "["    ],
          ["]"         , "]"    ],
          ["."         , "."    ],
          ["IDENTIFIER", "neg"  ],
          ["CALL_START", "("    ],
          ["CALL_END"  , ")"    ],
          ["."         , "."    ],
          ["IDENTIFIER", "tilde"],
          ["CALL_START", "("    ],
          ["CALL_END"  , ")"    ],
          [")"         , ")"    ],
          ["TERMINATOR", "\n"   ],
        ];
        var actual = compiler.replaceUnaryOp(tokens).erode();
        assert.deepEqual(actual, expected);
      });
    });
    describe("replaceCompoundAssign", function() {
      it("a.a += b.b => a.a = a.a.__add__(b.b)", function() {
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
          ["IDENTIFIER", "a"      ],
          ["."         , "."      ],
          ["IDENTIFIER", "a"      ],
          ["="         , "="      ],
          ["IDENTIFIER", "a"      ],
          ["."         , "."      ],
          ["IDENTIFIER", "a"      ],
          ["."         , "."      ],
          ["IDENTIFIER", "__add__"],
          ["CALL_START", "("      ],
          ["IDENTIFIER", "b"      ],
          ["."         , "."      ],
          ["IDENTIFIER", "b"      ],
          ["CALL_END"  , ")"      ],
          ["TERMINATOR", "\n"     ],
        ];
        var actual = compiler.replaceCompoundAssign(tokens).erode();
        assert.deepEqual(actual, expected);
      });
    });
    describe("replaceSynthDef", function() {
      it("None args", function() {
        var tokens = [
          ["IDENTIFIER", "Synth"],
          ["."         , "."    ],
          ["IDENTIFIER", "def"  ],
          ["CALL_START", "("    ],
          ["->"        , "->"   ],
          ["INDENT"    , 2      ],
          ["IDENTIFIER", "x"    ],
          ["OUTDENT"   , 2      ],
          ["CALL_END"  , ")"    ],
          ["TERMINATOR", "\n"   ],      
        ];
        var expected = [
          ["IDENTIFIER", "Synth"],
          ["."         , "."    ],
          ["IDENTIFIER", "def"  ],
          ["CALL_START", "("    ],
          ["->"        , "->"   ],
          ["INDENT"    , 2      ],
          ["IDENTIFIER", "x"    ],
          ["OUTDENT"   , 2      ],
          [","         , ","    ],
          ["STRING"    , '""'   ],
          ["CALL_END"  , ")"    ],
          ["TERMINATOR", "\n"   ],      
        ];
        var actual = compiler.replaceSynthDef(tokens).erode();
        assert.deepEqual(actual, expected);
      });
      it("x=100, y=200", function() {
        var tokens = [
          ["IDENTIFIER" , "Synth"],
          ["."          , "."    ],
          ["IDENTIFIER" , "def"  ],
          ["CALL_START" , "("    ],
          ["PARAM_START", "("    ],
          ["IDENTIFIER" , "x"    ],
          ["="          , "="    ],
          ["NUMBER"     , "100"  ],
          [","          , ","    ],
          ["IDENTIFIER" , "y"    ],
          ["="          , "="    ],
          ["NUMBER"     , "200"  ],
          ["PARAM_END"  , ")"    ],
          ["->"         , "->"   ],
          ["INDENT"     , 2      ],
          ["IDENTIFIER" , "x"    ],
          ["OUTDENT"    , 2      ],
          ["CALL_END"   , ")"    ],
          ["TERMINATOR" , "\n"   ],      
        ];
        var expected = [
          ["IDENTIFIER" , "Synth"        ],
          ["."          , "."            ],
          ["IDENTIFIER" , "def"          ],
          ["CALL_START" , "("            ],
          ["PARAM_START", "("            ],
          ["IDENTIFIER" , "x"            ],
          ["="          , "="            ],
          ["NUMBER"     , "100"          ],
          [","          , ","            ],
          ["IDENTIFIER" , "y"            ],
          ["="          , "="            ],
          ["NUMBER"     , "200"          ],
          ["PARAM_END"  , ")"            ],
          ["->"         , "->"           ],
          ["INDENT"     , 2              ],
          ["IDENTIFIER" , "x"            ],
          ["OUTDENT"    , 2              ],
          [","          , ","            ],
          ["STRING"     , '"x=100,y=200"'],
          ["CALL_END"   , ")"            ],
          ["TERMINATOR" , "\n"           ],      
        ];
        var actual = compiler.replaceSynthDef(tokens).erode();
        assert.deepEqual(actual, expected);
      });
      it("With other args", function() {
        var tokens = [
          ["IDENTIFIER" , "Synth"],
          ["."          , "."    ],
          ["IDENTIFIER" , "def"  ],
          ["CALL_START" , "("    ],
          ["("          , "("    ],
          ["PARAM_START", "("    ],
          ["IDENTIFIER" , "x"    ],
          ["="          , "="    ],
          ["NUMBER"     , "100"  ],
          [","          , ","    ],
          ["IDENTIFIER" , "y"    ],
          ["="          , "="    ],
          ["NUMBER"     , "200"  ],
          ["PARAM_END"  , ")"    ],
          ["->"         , "->"   ],
          ["INDENT"     , 2      ],
          ["IDENTIFIER" , "x"    ],
          ["OUTDENT"    , 2      ],
          [")"          , ")"    ],
          [","          , ","    ],
          ["NUMBER"     , "300"  ],
          ["CALL_END"   , ")"    ],
          ["TERMINATOR" , "\n"   ],      
        ];
        var expected = [
          ["IDENTIFIER" , "Synth"        ],
          ["."          , "."            ],
          ["IDENTIFIER" , "def"          ],
          ["CALL_START" , "("            ],
          ["("          , "("            ],
          ["PARAM_START", "("            ],
          ["IDENTIFIER" , "x"            ],
          ["="          , "="            ],
          ["NUMBER"     , "100"          ],
          [","          , ","            ],
          ["IDENTIFIER" , "y"            ],
          ["="          , "="            ],
          ["NUMBER"     , "200"          ],
          ["PARAM_END"  , ")"            ],
          ["->"         , "->"           ],
          ["INDENT"     , 2              ],
          ["IDENTIFIER" , "x"            ],
          ["OUTDENT"    , 2              ],
          [")"          , ")"            ],
          [","          , ","            ],
          ["STRING"     , '"x=100,y=200"'],
          [","          , ","            ],
          ["NUMBER"     , "300"          ],
          ["CALL_END"   , ")"            ],
          ["TERMINATOR" , "\n"           ],      
        ];
        var actual = compiler.replaceSynthDef(tokens).erode();
        assert.deepEqual(actual, expected);
      });
    });
    describe("cleanupParenthesis", function() {
      it("((a + b)) => (a + b)", function() {
        var tokens = [
          ["("         , "(" ],
          ["("         , "(" ],
          ["IDENTIFIER", "a" ],
          ["+"         , "+" ],
          ["IDENTIFIER", "b" ],
          [")"         , ")" ],
          [")"         , ")" ],
          ["TERMINATOR", "\n"],
        ];
        var expected = [
          ["("         , "(" ],
          ["IDENTIFIER", "a" ],
          ["+"         , "+" ],
          ["IDENTIFIER", "b" ],
          [")"         , ")" ],
          ["TERMINATOR", "\n"],
        ];
        var actual = compiler.cleanupParenthesis(tokens).erode();
        assert.deepEqual(actual, expected);
      });
      it("((a + b) + c) => ((a + b) + c)", function() {
        var tokens = [
          ["("         , "(" ],
          ["("         , "(" ],
          ["IDENTIFIER", "a" ],
          ["+"         , "+" ],
          ["IDENTIFIER", "b" ],
          [")"         , ")" ],
          ["+"         , "+" ],
          ["IDENTIFIER", "c" ],
          [")"         , ")" ],
          ["TERMINATOR", "\n"],
        ];
        var expected = tokens;
        var actual = compiler.cleanupParenthesis(tokens).erode();
        assert.deepEqual(actual, expected);
      });
    });
    describe("insertReturn", function() {
      it("BOD", function() {
        var tokens = [
          ["IDENTIFIER", "a" ],
          ["="         , "=" ],
          ["NUMBER"    , "0" ],
          ["TERMINATOR", "\n"],
        ];
        var expected = [
          ["RETURN"    , "return"], // <-- insert here
          ["IDENTIFIER", "a"     ],
          ["="         , "="     ],
          ["NUMBER"    , "0"     ],
          ["TERMINATOR", "\n"    ],
        ];
        var actual = compiler.insertReturn(tokens).erode();
        assert.deepEqual(actual, expected);
      });
      it("case 2", function() {
        var tokens = [
          ["IDENTIFIER", "a" ],
          ["="         , "=" ],
          ["NUMBER"    , "0" ],
          ["TERMINATOR", "\n"],
          ["IDENTIFIER", "a" ],
          ["="         , "=" ],
          ["NUMBER"    , "1" ],
          ["TERMINATOR", "\n"],
        ];
        var expected = [
          ["IDENTIFIER", "a"     ],
          ["="         , "="     ],
          ["NUMBER"    , "0"     ],
          ["TERMINATOR", "\n"    ],
          ["RETURN"    , "return"], // <-- insert here
          ["IDENTIFIER", "a"     ],
          ["="         , "="     ],
          ["NUMBER"    , "1"     ],
          ["TERMINATOR", "\n"    ],
        ];
        var actual = compiler.insertReturn(tokens).erode();
        assert.deepEqual(actual, expected);
      });
      it("With indent/outdent", function() {
        var tokens = [
          ["IDENTIFIER", "a" ],
          ["="         , "=" ],
          ["NUMBER"    , "0" ],
          ["TERMINATOR", "\n"],
          ["IDENTIFIER", "a" ],
          ["="         , "=" ],
          ["->"        , "->"],
          ["INDENT"    , 2   ],
          ["IDENTIFIER", "a" ],
          ["="         , "=" ],
          ["NUMBER"    , "1" ],
          ["TERMINATOR", "\n"],
          ["IDENTIFIER", "a" ],
          ["="         , "=" ],
          ["NUMBER"    , "2" ],
          ["OUTDENT"   , 2   ],
          ["TERMINATOR", "\n"],
        ];
        var expected = [
          ["IDENTIFIER", "a"     ],
          ["="         , "="     ],
          ["NUMBER"    , "0"     ],
          ["TERMINATOR", "\n"    ],
          ["RETURN"    , "return"], // <-- insert here
          ["IDENTIFIER", "a"     ],
          ["="         , "="     ],
          ["->"        , "->"    ],
          ["INDENT"    , 2       ],
          ["IDENTIFIER", "a"     ],
          ["="         , "="     ],
          ["NUMBER"    , "1"     ],
          ["TERMINATOR", "\n"    ],
          ["IDENTIFIER", "a"     ],
          ["="         , "="     ],
          ["NUMBER"    , "2"     ],
          ["OUTDENT"   , 2       ],
          ["TERMINATOR", "\n"    ],
        ];
        var actual = compiler.insertReturn(tokens).erode();
        assert.deepEqual(actual, expected);
      });
      it("RETURN exists already", function() {
        var tokens = [
          ["IDENTIFIER", "a"     ],
          ["="         , "="     ],
          ["NUMBER"    , "0"     ],
          ["TERMINATOR", "\n"    ],
          ["RETURN"    , "return"],
          ["IDENTIFIER", "a"     ],
          ["="         , "="     ],
          ["NUMBER"    , "1"     ],
          ["TERMINATOR", "\n"    ],
        ];
        var expected = [
          ["IDENTIFIER", "a"     ],
          ["="         , "="     ],
          ["NUMBER"    , "0"     ],
          ["TERMINATOR", "\n"    ],
          ["RETURN"    , "return"], // <-- not insert
          ["IDENTIFIER", "a"     ],
          ["="         , "="     ],
          ["NUMBER"    , "1"     ],
          ["TERMINATOR", "\n"    ],
        ];
        var actual = compiler.insertReturn(tokens).erode();
        assert.deepEqual(actual, expected);
      });
    });
  });

});
