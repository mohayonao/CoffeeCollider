define(function(require, exports, module) {
  "use strict";

  var UNARY_OP_UGEN_MAP = "neg not isNil notNil bitNot abs asFloat asInt ceil floor frac sign squared cubed sqrt exp reciprocal midicps cpsmidi midiratio ratiomidi dbamp ampdb octcps cpsoct log log2 log10 sin cos tan asin acos atan sinh cosh tanh rand rand2 linrand bilinrand sum3rand distort softclip coin digitvalue silence thru rectWindow hanWindow welWindow triWindow ramp scurve numunaryselectors num tilde pi to_i".split(" ");
  var BINARY_OP_UGEN_MAP = "+ - * / / % eq ne lt gt le ge min max bitAnd bitOr bitXor lcm gcd round roundUp trunc atan2 hypot hypotApx pow leftShift rightShift unsignedRightShift fill ring1 ring2 ring3 ring4 difsqr sumsqr sqrsum sqrdif absdif thresh amclip scaleneg clip2 excess fold2 wrap2 firstarg randrange exprandrange numbinaryselectors roundDown".split(" ");

  var UGEN_OP_ALIASES = {
    __plus__ : "num",
    __minus__: "neg",
    __add__  : "+",
    __sub__  : "-",
    __mul__  : "*",
    __div__  : "/",
    __mod__  : "%",
  };

  var COMMON_FUNCTIONS = {
    madd: "mul=1,add=0",
    range: "lo=0,hi=1",
    unipolar: "mul=1",
    bipolar : "mul=1",
    lag   : "t1=0.1,t2",
    lag2  : "t1=0.1,t2",
    lag3  : "t1=0.1,t2",
    lagud : "lagTimeU=0.1,lagTimeD=0.1",
    lag2ud: "lagTimeU=0.1,lagTimeD=0.1",
    lag3ud: "lagTimeU=0.1,lagTimeD=0.1",
    linlin: "inMin=0,inMax=1,outMin=1,outMax=2,clip=\"minmax\"",
    linexp: "inMin=0,inMax=1,outMin=1,outMax=2,clip=\"minmax\"",
    explin: "inMin=0,inMax=1,outMin=1,outMax=2,clip=\"minmax\"",
    expexp: "inMin=0,inMax=1,outMin=1,outMax=2,clip=\"minmax\"",
  };
  
  module.exports = {
    UNARY_OP_UGEN_MAP : UNARY_OP_UGEN_MAP,
    BINARY_OP_UGEN_MAP: BINARY_OP_UGEN_MAP,
    UGEN_OP_ALIASES   : UGEN_OP_ALIASES,
    COMMON_FUNCTIONS  : COMMON_FUNCTIONS,
  };

});
