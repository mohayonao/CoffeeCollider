define(function(require, exports, module) {
  "use strict";
  
  var Random = (function() {
    function Random(seed) {
      if (typeof seed !== "number") {
        seed = Date.now();
      }
      seed = new Uint32Array([seed]);
      seed[0] += ~(seed[0] <<  15);
      seed[0] ^=   seed[0] >>> 10;
      seed[0] +=   seed[0] <<  3;
      seed[0] ^=   seed[0] >>> 6;
      seed[0] += ~(seed[0] <<  11);
      seed[0] ^=   seed[0] >>> 16;
      
      this.s1 = new Uint32Array([1243598713 ^ seed[0]]);
      this.s2 = new Uint32Array([3093459404 ^ seed[0]]);
      this.s3 = new Uint32Array([1821928721 ^ seed[0]]);
      
      if (this.s1[0] <  2) {
        this.s1[0] = 1243598713;
      }
      if (this.s2[0] <  8) {
        this.s2[0] = 3093459404;
      }
      if (this.s3[0] < 16) {
        this.s3[0] = 1821928721;
      }
    }
    
    Random.prototype.trand = function() {
      this.s1[0] = ((this.s1[0] & 4294967294) << 12) ^ (((this.s1[0] << 13) ^  this.s1[0]) >>> 19);
      this.s2[0] = ((this.s2[0] & 4294967288) <<  4) ^ (((this.s2[0] <<  2) ^  this.s2[0]) >>> 25);
      this.s3[0] = ((this.s3[0] & 4294967280) << 17) ^ (((this.s3[0] <<  3) ^  this.s3[0]) >>> 11);
      return this.s1[0] ^ this.s2[0] ^ this.s3[0];
    };
    
    var _i = new Uint32Array(1);
    var _f = new Float32Array(_i.buffer);
    
    Random.prototype.next = function() {
      _i[0] = 0x3F800000 | (this.trand() >>> 9);
      return _f[0] - 1;
    };
    
    return Random;
  })();
  
  module.exports = {
    Random: Random,
  };

});
