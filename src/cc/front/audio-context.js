define(function(require, exports, module) {
  "use strict";

  var AudioContext = (function() {
    function AudioContext() {
      var SoundAPI    = getAPI();
      this.sampleRate = 44100;
      this.channels   = 2;
      if (SoundAPI) {
        this.driver = new SoundAPI(this);
        this.sampleRate = this.driver.sampleRate;
        this.channels   = this.driver.channels;
      }
      this.colliders  = [];
      this.process    = process1;
      this.strmLength = 1024;
      this.bufLength  = 64;
      this.strm  = new Float32Array(this.strmLength * this.channels);
      this.clear = new Float32Array(this.strmLength * this.channels);
      this.isPlaying = false;
    }
    AudioContext.prototype.append = function(cc) {
      this.colliders.push(cc);
    };
    AudioContext.prototype.play = function() {
      if (!this.isPlaying) {
        this.isPlaying = true;
        this.driver.play();
      }
    };
    AudioContext.prototype.pause = function() {
      if (this.isPlaying) {
        var flag = this.colliders.every(function(cc) {
          return !cc.isPlaying;
        });
        if (flag) {
          this.isPlaying = false;
          this.driver.pause();
        }
      }
    };

    var process1 = function() {
      var cc = this.colliders[0];
      cc.process();
      this.strm.set(cc.strm);
    };
    
    return AudioContext;
  })();

  var getAPI = function() {
    return require("./web-audio-api").getAPI();
  };

  module.exports = {
    AudioContext: AudioContext
  };

});
