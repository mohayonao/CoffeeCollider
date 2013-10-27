$(function() {
  "use strict";
  
  var srcFragment = "try:";
  var $code = $("#code");
  var $exec = $("#exec");
  var $link = $("#link");
  var $play = $("#play");
  
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
    width:200, height:100, fillStyle:"#2c3e50", strokeStyle:"#f1c40f", lineWidth:2
  });
  var isPlaying = false;
  var prevCode  = null;
  
  $exec.on("click", function(e) {
    var code = $code.val().trim();
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
  });

  $link.on("click", function() {
    var code = $code.val().trim();
    window.location = "#" + srcFragment + encodeURIComponent(code);
  });

  $("a", "#example-list").each(function(i, a) {
    var $a = $(a);
    $a.on("click", function() {
      $.get("./documents/examples/" + $(this).attr("data-path")).then(function(res) {
        $code.val(res);
      });
      return false;
    });
  });
  
  $play.on("click", function() {
    isPlaying = !isPlaying;
    if (isPlaying) {
      if (prevCode !== $code.val().trim()) {
        $exec.click();
      }
      cc.play();
      viewer.start();
      $play.addClass("btn-danger");
    } else {
      cc.pause();
      viewer.stop();
      $play.removeClass("btn-danger");
    }
  });
  
  var hash = decodeURIComponent(location.hash.replace(/^#/, ""));
  if (hash.indexOf(srcFragment) === 0) {
    $code.val(hash.substr(srcFragment.length));
  }

});
