define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var fn = require("./fn");

  var Timeline = (function() {
    function Timeline(server) {
      this.klassName = "Timeline";
      this.server = server;
      this.list = [];
      this.requireSort = false;
      this.currentTime = 0;
      this.currentTimeIncr = 0;
    }
    Timeline.prototype.play = function() {
      this.currentTimeIncr = (this.server.bufLength / this.server.sampleRate) * 1000;
    };
    Timeline.prototype.pause = function() {
      this.currentTimeIncr = 0;
    };
    Timeline.prototype.reset = function() {
      this.list = [];
      this.requireSort = false;
      this.currentTime = 0;
    };
    Timeline.prototype.push = function(time, looper) {
      var list = this.list;

      if (typeof arguments[0] === "function") {
        looper = { execute: arguments[0] };
        time   = this.currentTime;
      }
      if (list.length) {
        if (time < list[list.length - 1][0]) {
          this.requireSort = true;
        }
      }
      list.push([ time, looper ]);
    };
    var sortFunction = function(a, b) {
      return a[0] - b[0];
    };
    Timeline.prototype.process = function() {
      var currentTime = this.currentTime;
      var list = this.list;
      if (this.requireSort) {
        list.sort(sortFunction);
        this.requireSort = false;
      }
      var i = 0, imax = list.length;
      while (i < imax) {
        if (list[i][0] < currentTime) {
          list[i][1].execute(currentTime);
        } else {
          break;
        }
        i += 1;
      }
      if (i) {
        list.splice(0, i);
      }
      this.currentTime = currentTime + this.currentTimeIncr;
    };
    return Timeline;
  })();

  var Scheduler = (function() {
    function Scheduler() {
      this.klassName = "Scheduler";
      this.server = cc.server;
      this.payload = new SchedPayload(this.server.timeline);
      this.paused  = false;
    }
    Scheduler.prototype.execute = function() {
    };
    Scheduler.prototype.pause = function() {
      this.paused = true;
    };
    return Scheduler;
  })();

  var SchedPayload = (function() {
    function SchedPayload(timeline) {
      this.timeline = timeline;
      this.isBreak  = false;
    }
    SchedPayload.prototype.wait = function(msec) {
      msec = +msec;
      if (!isNaN(msec)) {
        this.timeline.currentTime += msec;
      }
    };
    SchedPayload.prototype.break = function() {
      this.isBreak = true;
    };
    return SchedPayload;
  })();
  
  var Loop = (function() {
    function Loop() {
      Scheduler.call(this);
      this.klassName = "Loop";
    }
    fn.extend(Loop, Scheduler);

    Loop.prototype.$do = function(func) {
      this.func = func;
      this.server.timeline.push(0, this);
      return this;
    };
    fn.classmethod(Loop);

    Loop.prototype.execute = function(currentTime) {
      if (!this.paused) {
        var timeline = this.server.timeline;
        this.func.call(this.payload);
        if (!this.payload.isBreak) {
          timeline.push(timeline.currentTime, this);
        }
        timeline.currentTime = currentTime;
      }
    };
    
    return Loop;
  })();

  var install = function(namespace) {
    namespace.register("Loop", Loop);
  };
  
  module.exports = {
    Timeline: Timeline,
    Loop    : Loop,
    install : install
  };

});
