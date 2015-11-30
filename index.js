import http from 'http';
import https from 'https';
import path from 'path';
import express from 'express';
import socketio from 'socket.io';
import tweetStream from 'node-tweet-stream';
import dbg from 'debug';
import cfg from './config.json';
import PerMessageDeflate from 'socket.io/node_modules/engine.io/node_modules/ws/lib/PerMessageDeflate';

const PORT = process.env.PORT || 3000;

let debug = dbg('socket.io-compression-demo');
let app = express();
let server = http.createServer(app);
let io = socketio(server);
let tw = tweetStream(cfg);
let tweets = [];
let stats = {
  transmitted: 0,
  sent: 0,
  sentCompressed: 0
};

app.use(express.static(path.join(__dirname, 'public')));

let compress = PerMessageDeflate.prototype.compress;

// patch to get compressed sizes
PerMessageDeflate.prototype.compress = function(data, fin, callback) {
  compress.call(this, data, fin, (err, compressed) => {
    if (!err) {
      stats.transmitted++;
      stats.sent += data.length;
      stats.sentCompressed += compressed.length;
      debug('connection stats updated %j', stats);
    }

    callback(err, compressed);
  });
};

io.on('connection', (socket) => {
  socket.emit('tweets', tweets, stats);
});

tw.track('socket.io');
tw.track('javascrtipt');
tw.on('tweet', (tweet) => {
  debug('a new tweet: %s %s', tweet.user.name, tweet.text);

  if (/socket\.io/i.test(tweet.text)) {
    tweets.unshift(tweet);
    tweets = tweets.slice(0, 10);
  }
  io.emit('tweet', tweet, stats);
});

server.listen(PORT, () => {
  console.log('Server listening at port %d', PORT);
});

