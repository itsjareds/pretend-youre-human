var express = require('express');
var app = express()
    , http = require('http')
    , server = http.createServer(app)
    , io = require('socket.io').listen(server, { log: true });

var S = require('string');

server.listen(3000);

app.get('/', function (req, res) {
    res.sendfile(__dirname + '/index.html');
});

var topic;

io.sockets.on('connection', function (socket) {
    var nick = "guest"+Math.floor((Math.random()*1000)+1);
    var parseCmd = function(str) {
        if (str.s.charAt(0) != '/') return false;

        var ret = false;
        str = str.substring(1).trimLeft();
        var idx = str.indexOf(' ');
        var cmd = str.substr(0,idx);
        var param = str.substring(idx+1).trimLeft();
        switch (cmd.s) {
            case "topic":
                ret = true;
                if (param.isEmpty()) break;
                
                topic = param.substring(0,50).s;
                console.log("Topic changed to "+topic.s+" by "+nick+".");
                io.sockets.emit("notify", {
                    type:"topic",
                    content:S(topic).escapeHTML().s,
                    who:nick
                });
                break;
            case "nick":
                ret = true;
                if (param.isEmpty()) break;

                var oldnick = nick;
                nick = param.stripTags().replace(/[^a-z0-9]/gi,'').s;
                var idx = param.indexOf(' ');
                if (idx>-1) nick = nick.substring(0,idx);

                if (nick != oldnick) {
                    console.log(oldnick+" -> "+nick);
                    io.sockets.emit("notify", { type:"nick", who:oldnick, nick:nick });
                }
                break;
            default: break;
        }
        return ret;
    }
    if (topic == null) topic = "This is a sample topic";
    socket.emit("notify", {
        type:"topic",
        content:topic,
        who:null
    });
    io.sockets.emit("notify", { type:"connect", who:nick });
    socket.on('chat', function (content) {
        content = S(content).trim();
        if (content.isEmpty()) return;
        console.log(nick+": "+content.s);
        if (parseCmd(content) == false)
            io.sockets.emit("chat", { "nick": nick, "content": content.escapeHTML().s });
    });
    socket.on('disconnect', function() {
        io.sockets.emit("notify", { type:"disconnect", who:nick });
    });

});
