$(function() {
  "use strict";
  
  var isEdge = /extras\/edge/.test(location.href);
  
  var srcFragment = "try:";
  var $code = $("#code");
  var $boot = $("#boot");
  
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
  var status = "pause";
  
  var changeFavicon;
  if (isEdge) {
    changeFavicon = function(mode) {
      $("#favicon").attr({href:"../img/" + mode + ".gif"});
    };
  } else {
    changeFavicon = function(mode) {
      $("#favicon").attr({href:"./extras/img/" + mode + ".gif"});
    };
  }
  
  $boot.on("click", function(e) {
    if (status === "pause") {
      cc.play();
      viewer.start();
      $boot.addClass("btn-danger");
      status = "play";
      changeFavicon("play");
    } else {
      cc.pause();
      viewer.stop();
      $boot.removeClass("btn-danger");
      status = "pause";
      changeFavicon("pause");
    }
  });
  
  $("#run").on("click", function() {
    var code = $code.val().trim();
    cc.execute(code, function(res) {
      if (res !== undefined) {
        console.log(res);
      }
    });
    window.location = "#" + srcFragment + encodeURIComponent(code);
  });

  $("#reset").on("click", function() {
    cc.reset();
  });
  
  $("a", "#example-list").each(function(i, a) {
    var $a = $(a);
    $a.on("click", function() {
      var path = "./extras/examples/";
      if (isEdge) {
        path = "../examples/";
      }
      $.get(path + $(this).attr("data-path")).then(function(res) {
        $code.val(res);
      });
      return false;
    });
  });
  
  $("#version").text(cc.version);
  var devMode = function() {
    $("#compile-coffee").on("click", function() {
      var code = cc.impl.compiler.toString($code.val().trim());
      console.log(code);
    }).show();
    $("#compile-js").on("click", function() {
      var code = cc.impl.compiler.toString($code.val().trim());
      code = CoffeeScript.compile(code, {bare:true});
      console.log(code);
    }).show();
  };
  
  if (isEdge) {
    devMode();
  }
  
  var hash = decodeURIComponent(location.hash.replace(/^#/, ""));
  if (hash.indexOf(srcFragment) === 0) {
    $code.val(hash.substr(srcFragment.length));
  }

  cc.dev = devMode;

});
