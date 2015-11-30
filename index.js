import http from 'http';
import https from 'https';
import path from 'path';
import express from 'express';
import socketio from 'socket.io';
import tweetStream from 'node-tweet-stream';
import dbg from 'debug';

const PORT = process.env.PORT || 3000;

let debug = dbg('socket.io-compression-demo');
let app = express();
let server = http.createServer(app);
let io = socketio(server);
let tw = tweetStream({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  token: process.env.TWITTER_TOKEN,
  token_secret: process.env.TWITTER_TOKEN_SECRET
});
let tweets = [];

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  let stats = socket.client.stats = {
    transmitted: 0,
    sent: 0,
    sentCompressed: 0
  };

  socket.conn.on('upgrade', (transport) => {
    let perMessageDeflate = transport.socket.extensions['permessage-deflate'];
    let { compress } = perMessageDeflate;

    // patch to get stats
    perMessageDeflate.compress = function(data, fin, callback) {
      compress.call(this, data, fin, (err, compressed) => {
        if (!err) {
          stats.transmitted++;
          stats.sent += data.length;
          stats.sentCompressed += compressed.length;
          debug('connection stats updated %s %j', socket.client.id, stats);
        }
        callback(err, compressed);
      });
    };
  });

  socket.conn.once('drain', () => {
    socket.emit('stats', stats);
  });
  socket.emit('tweets', tweets);
});

tw.track('socket.io');
tw.track('javascrtipt');
tw.on('tweet', (tweet) => {
  debug('a new tweet: %s %s', tweet.user.name, tweet.text);

  if (/socket\.io/i.test(tweet.text)) {
    tweets.unshift(tweet);
    tweets = tweets.slice(0, 10);
  }

  Object.keys(io.sockets.connected).forEach((sid) => {
    let socket = io.sockets.connected[sid];
    socket.conn.once('drain', () => {
      socket.emit('stats', socket.client.stats);
    });
  });

  io.emit('tweet', tweet);
});

server.listen(PORT, () => {
  console.log('Server listening at port %d', PORT);
});

