import io from 'socket.io-client';
import React from 'react';
import { render } from 'react-dom';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      animation: false,
      tweets: [],
      stats: {
        transmitted: 0,
        sent: 0,
        sentCompressed: 0
      }
    };
  }

  componentWillMount() {
    let socket = io();
    socket.on('tweets', (tweets) => {
      this.setState({ tweets, animation: false });
    });
    socket.on('tweet', (tweet) => {
      let tweets = [tweet].concat(this.state.tweets).slice(0, 20);
      this.setState({ tweets, animation: true });
    });
    socket.on('stats', (stats) => {
      this.setState({ stats });
    });
  }

  render() {
    return <div className="tweets-container">
      { this.state.stats.transmitted ?
        <div>
          <div>
            <Stats stats={this.state.stats} />
          </div>
          <div>
            <Tweets tweets={this.state.tweets} animation={this.state.animation} />
          </div>
        </div>
      : <p className="waiting">Waiting for tweets…</p>
      }
    </div>;
  }
}

class Tweets extends React.Component {
  render() {
    let { tweets, animation } = this.props;

    return <ul className="tweets">
      {tweets.map((tweet) => {
        let url = `https:///twitter.com/${encodeURIComponent(tweet.user.screen_name)}/status/${encodeURIComponent(tweet.id_str)}`;

        return <ReactCSSTransitionGroup
            key={tweet.id}
            component="li"
            className="tweet"
            transitionName="new"
            transitionAppear={animation}
            transitionAppearTimeout={0}
            transitionEnterTimeout={0}
            transitionLeaveTimeout={0}>
          <a key={'wrapper' + tweet.id} className="wrapper" href={url} target="_blank">
            <div className="profile-image">
              <img src={tweet.user.profile_image_url}/>
            </div>
            <div className="content">
              <h3 className="name">{tweet.user.name}</h3>
              <p className="text">{tweet.text}</p>
            </div>
          </a>
        </ReactCSSTransitionGroup>
      })}
    </ul>;
  }
}

class Stats extends React.Component {
  render() {
    let { stats: { transmitted, sent, sentCompressed} } = this.props;
    let savings = sent - sentCompressed;

    return <div className="stats">
      <h2>CONNECTION STATS</h2>
      <div className="transmitted">
        <h3>Events transmitted:</h3>
        <span className="data">{transmitted}</span>
      </div>
      <div className="sent">
        <h3>Data sent:</h3>
        <span className="data">{formatSize(sent)}</span>
        <div className="bar">&nbsp;</div>
      </div>
      <div className="sent-compressed">
        <h3>Data sent compressed:</h3>
        <span className="data">{formatSize(sentCompressed)}</span>
        <div className="bar" style={{ width: Math.floor(sentCompressed / (sent || 1) * 100) + '%' }}>&nbsp;</div>
      </div>
      <div className="savings">
        <h3>Total savings:</h3>
        <span className="data">{formatSize(savings)} ({Math.floor(savings / (sent || 1) * 100) + '%'})</span>
      </div>
    </div>
  }
}

function formatSize(size) {
  let kb = Math.floor(size / 1024 * 10) / 10;

  // http://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
  let parts = kb.toString().split('.');
  parts[0] = parts[0].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.') + 'kb';
}

render(<App />, document.getElementById('app'));
