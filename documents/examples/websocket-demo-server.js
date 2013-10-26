var fs = require("fs");
var http = require("http");
var ccserver = require("../../coffee-collider");

var app = http.createServer();

app.on("request", function(req, res) {
  switch (req.url) {
  case "/":
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(fs.readFileSync(
      __dirname + "/websocket-demo-client.html", "utf-8"
    ), "utf-8");
    break;
  case "/coffee-script.js":
    res.writeHead(200, { "Content-Type": "application/javascript" });
    res.end(fs.readFileSync(
      __dirname + "/../vendor/coffee-script.js", "utf-8"
    ), "utf-8");
    break;
  case "/coffee-collider.js":
    res.writeHead(200, { "Content-Type": "application/javascript" });
    res.end(fs.readFileSync(
      __dirname + "/../../coffee-collider.js", "utf-8"
    ), "utf-8");
    break;
  default:
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 NOT FOUND");
  }
}).listen(process.env.PORT||8888, function() {
  var sessions = {};
  ccserver.connect({server:app, path:"/socket"});
  ccserver.on("open", function(userId) {
    sessions[userId] = "";
    ccserver.send({
      type  : "init",
      userId: userId,
      list  : Object.keys(sessions).map(function(userId) {
        return [ userId, sessions[userId] ];
      })
    }, userId);
    ccserver.send({type:"open", userId:userId});
  }).on("close", function(userId) {
    ccserver.send({type:"close", userId:userId});
    delete sessions[userId];
  }).on("message", function(msg) {
    if (msg.type === "code") {
      sessions[msg.userId] = msg.payload;
    }
    ccserver.send(msg);
  }).on("error", function(items) {
    console.log("demo-server: onerror", items);
  });
});
