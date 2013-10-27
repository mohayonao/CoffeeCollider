window.onload = function() {
  "use strict";
  
  var srcFragment = "try:";
  var $code = document.getElementById("code");
  var $exec = document.getElementById("exec");
  var $link = document.getElementById("link");
  var $play = document.getElementById("play");
  
  var config = {};
  location.search.substr(1).split("&").forEach(function(kv) {
    var items = kv.split("=");
    if (items[0] != "") {
      var key   = items[0];
      var value = items[1];
      if (value == "false") {
        value = false;
      } else if (value == "true" || value == undefined) {
        value = true;
      } else if (!isNaN(+value)) {
        value = +value;
      }
      config[key] = value;
    }
  });
  
  var cc = window.cc = new CoffeeCollider(config);
  var viewer = new WaveViewer(cc, document.getElementById("canvas"), {
    fillStyle:"#ecf0f1", strokeStyle:"#2980b9", lineWidth:8
  });
  var isPlaying = false;
  var prevCode  = null;
  
  $exec.addEventListener("click", function(e) {
    var code = $code.value.trim();
    if (e.shiftKey) {
      console.log(cc.compiler.toString(code));
    } else {
      cc.execute(code, function(res) {
        if (res !== undefined) {
          console.log(res);
        }
      });
      prevCode = code;
    }
  }, false);

  $link.addEventListener("click", function() {
    var code = $code.value.trim();
    window.location = "#" + srcFragment + encodeURIComponent(code);
  }, false);
  
  $play.addEventListener("click", function() {
    isPlaying = !isPlaying;
    if (isPlaying) {
      if (prevCode !== $code.value.trim()) {
        $exec.click();
      }
      cc.play();
      viewer.start();
      $play.className = "btn btn-danger";
    } else {
      cc.pause();
      viewer.stop();
      $play.className = "btn";
    }
  }, false);
  
  var hash = decodeURIComponent(location.hash.replace(/^#/, ""));
  if (hash.indexOf(srcFragment) === 0) {
    $code.value = hash.substr(srcFragment.length);
  }

};
