var http = require("http");
var fs = require("fs");
var cc = require("../../build/coffee-collider");

var app = http.createServer();
var speaker = true;

app.on("request", function(req, res) {
  switch (req.url) {
  case "/":
    res.writeHead(200, { "Content-Type": "text/html" });
    var html = fs.readFileSync(
      __dirname + "/websocket-demo-client.html", "utf-8"
    );
    if (!speaker) {
      html = html.replace("speaker:false", "speaker:true");
    }
    res.end(html, "utf-8");
    break;
  case "/coffee-script.js":
    res.writeHead(200, { "Content-Type": "application/javascript" });
    res.end(fs.readFileSync(
      __dirname + "/../vendor/coffee-script.js", "utf-8"
    ), "utf-8");
    break;
  case "/jquery.js":
    res.writeHead(200, { "Content-Type": "application/javascript" });
    res.end(fs.readFileSync(
      __dirname + "/../vendor/jquery-2.0.0.min.js", "utf-8"
    ), "utf-8");
    break;
  case "/coffee-collider.js":
    res.writeHead(200, { "Content-Type": "application/javascript" });
    res.end(fs.readFileSync(
      __dirname + "/../../build/coffee-collider.js", "utf-8"
    ), "utf-8");
    break;
  case "/waveviewer.js":
    res.writeHead(200, { "Content-Type": "application/javascript" });
    res.end(fs.readFileSync(
      __dirname + "/../js/waveviewer.js", "utf-8"
    ), "utf-8");
    break;
  default:
    if (/\.coffee$/.test(req.url)) {
      if (fs.existsSync(__dirname + "/../../examples/" + req.url)) {
        res.writeHead(200, { "Content-Type": "application/coffeescript" });
        res.end(fs.readFileSync(
          __dirname + "/../../examples/" + req.url, "utf-8"
        ), "utf-8");
        return;
      }
    }
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 NOT FOUND");
  }
}).listen(process.env.PORT||8888, function() {
  var sessions = {};
  
  var synthServer = new cc.SocketSynthServer({
    server:app, path:"/socket", speaker:speaker
  });
  synthServer.on("open", function(userId) {
    sessions[userId] = "";
    synthServer.send({
      type  : "init",
      userId: userId,
      list  : Object.keys(sessions).map(function(userId) {
        return [ userId, sessions[userId] ];
      })
    }, userId);
    synthServer.send({type:"open", userId:userId});
  }).on("close", function(userId) {
    synthServer.send({type:"close", userId:userId});
    delete sessions[userId];
  }).on("message", function(msg) {
    if (msg.type === "code") {
      sessions[msg.userId] = msg.payload;
    }
    synthServer.send(msg);
  }).on("error", function(items) {
    console.log("demo-server: onerror", items);
  });

});
