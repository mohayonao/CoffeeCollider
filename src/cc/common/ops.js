define(function(require, exports, module) {
  "use strict";
  
  var UNARY_OPS = {};
  var UNARY_OPS_MAP = [];
  "neg not isNil notNil bitNot abs asFloat asInt ceil floor frac sign squared cubed sqrt exp reciprocal midicps cpsmidi midiratio ratiomidi dbamp ampdb octcps cpsoct log log2 log10 sin cos tan asin acos atan sinh cosh tanh rand rand2 linrand bilinrand sum3rand distort softclip coin digitvalue silence thru rectWindow hanWindow welWindow triWindow ramp scurve numunaryselectors num tilde pi to_i half twice".split(" ").forEach(function(selector, i) {
    UNARY_OPS[selector] = i;
    UNARY_OPS_MAP[i] = selector;
  });
  
  var BINARY_OPS = {};
  var BINARY_OPS_MAP = [];
  "+ - * / / % eq ne lt gt le ge min max bitAnd bitOr bitXor lcm gcd round roundUp trunc atan2 hypot hypotApx pow leftShift rightShift unsignedRightShift fill ring1 ring2 ring3 ring4 difsqr sumsqr sqrsum sqrdif absdif thresh amclip scaleneg clip2 excess fold2 wrap2 firstarg randrange exprandrange numbinaryselectors roundDown".split(" ").forEach(function(selector, i) {
    BINARY_OPS[selector] = i;
    BINARY_OPS_MAP[i] = selector;
  });
  
  var ARITY_OPS = {
    madd      : "mul=1,add=0",
    range     : "lo=0,hi=1",
    exprange  : "lo=0.01,hi=1",
    curverange: "lo=0.01,hi=1,curve=-4",
    unipolar  : "mul=1",
    bipolar   : "mul=1",
    clip      : "lo=1,hi=1",
    fold      : "lo=1,hi=1",
    wrap      : "lo=1,hi=1",
    blend     : "that=0,blendFrac=0.5",
    lag       : "t1=0.1,t2",
    lag2      : "t1=0.1,t2",
    lag3      : "t1=0.1,t2",
    lagud     : "lagTimeU=0.1,lagTimeD=0.1",
    lag2ud    : "lagTimeU=0.1,lagTimeD=0.1",
    lag3ud    : "lagTimeU=0.1,lagTimeD=0.1",
    varlag    : "time=0.1,curvature=0,warp=5,start=0",
    slew      : "up=1,down=1",
    linlin    : "inMin=0,inMax=1,outMin=1,outMax=2,clip=\"minmax\"",
    linexp    : "inMin=0,inMax=1,outMin=1,outMax=2,clip=\"minmax\"",
    explin    : "inMin=0,inMax=1,outMin=1,outMax=2,clip=\"minmax\"",
    expexp    : "inMin=0,inMax=1,outMin=1,outMax=2,clip=\"minmax\"",
    lincurve  : "inMin=0,inMax=1,outMin=0,outMax=1,curve=-4,clip=\"minmax\"",
    curvelin  : "inMin=0,inMax=1,outMin=0,outMax=1,curve=-4,clip=\"minmax\"",
    bilin     : "inCenter=0.5,inMin=0,inMax=1,outCenter=0.5,outMin=0,outMax=1,clip=\"minmax\"",
    rrand     : "num=1",
    exprand   : "num=1",
  };

  var COMMONS = {
    copy: "",
    dup : "n=2",
  };
  
  var ALIASES = {
    __plus__ : "num",
    __minus__: "neg",
    __add__  : "+",
    __sub__  : "-",
    __mul__  : "*",
    __div__  : "/",
    __mod__  : "%",
  };
  
  module.exports = {
    UNARY_OPS     : UNARY_OPS,
    UNARY_OPS_MAP : UNARY_OPS_MAP,
    BINARY_OPS    : BINARY_OPS,
    BINARY_OPS_MAP: BINARY_OPS_MAP,
    ARITY_OPS     : ARITY_OPS,
    ALIASES       : ALIASES,
    COMMONS       : COMMONS,
  };

});
