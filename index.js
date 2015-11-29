import http from 'http';
import https from 'https';
import path from 'path';
import express from 'express';
import socketio from 'socket.io';
import dbg from 'debug';
import PerMessageDeflate from 'socket.io/node_modules/engine.io/node_modules/ws/lib/PerMessageDeflate';

const GITHUB_ACCESS_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
const PORT = process.env.PORT || 3000;

let debug = dbg('socket.io-compression-demo');
let app = express();
let server = http.createServer(app);
let io = socketio(server);
let lastEvents = [];
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
  socket.emit('events', lastEvents, stats);
});

server.listen(PORT, () => {
  console.log('Server listening at port %d', PORT);
  poll();
});

function poll(etag) {
  fetchEvents(etag, (err, res, events) => {
    if (err) {
      console.error(err);
    } else if (events) {
      lastEvents = events;
      io.emit('events', events, stats);
    }

    let etag = res ? res.headers.etag : null;
    let pollInterval = res ? parseInt(res.headers['x-poll-interval'], 10) || 1 : 1;

    debug('poll after %d second(s)', pollInterval);

    setTimeout(() => {
      poll(etag);
    }, pollInterval * 1000);
  });
}

function fetchEvents(etag, cb) {
  let headers = { 'User-Agent': 'Socket.IO-Compression-Demo' }
  if (GITHUB_ACCESS_TOKEN) {
    headers.Authorization = 'token ' + GITHUB_ACCESS_TOKEN;
  }
  if (etag) {
    headers['If-None-Match'] = etag;
  }

  https.get({
    host: 'api.github.com',
    path: '/orgs/socketio/events',
    headers: headers
  }, (res) => {
    let body = '';
    res.on('data', (data) => {
      body += data;
    }).on('end', () => {
      debug('polling got response %d %j', res.statusCode, {
        etag: res.headers.etag,
        'x-ratelimit-limit': res.headers['x-ratelimit-limit'],
        'x-ratelimit-remaining': res.headers['x-ratelimit-remaining'],
        'x-ratelimit-reset': res.headers['x-ratelimit-reset'],
        'x-poll-interval': res.headers['x-poll-interval']
      });

      if (res.statusCode !== 200) {
        if (res.statusCode === 304) {
          cb(null, res);
        } else {
          cb(new Error(`Error: ${res.statusCode} ${body}`), res);
        }
        return;
      }

      let events;
      try {
        events = JSON.parse(body);
      } catch (err) {
        cb(err, res);
        return;
      }

      cb(null, res, events);
    });
  }).on('error', cb);

  debug('polling sent request');
}

