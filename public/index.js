import io from 'socket.io-client';
import React from 'react';
import { render } from 'react-dom';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
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
      this.setState({ tweets });
    });
    socket.on('tweet', (tweet) => {
      let tweets = [tweet].concat(this.state.tweets);
      this.setState({ tweets });
    });
    socket.on('stats', (stats) => {
      this.setState({ stats });
    });
  }

  render() {
    return <div className="container">
      <div className="row">
        <div className="col-xs-7">
          <Tweets tweets={this.state.tweets} />
        </div>
        <div className="col-xs-5">
          <Stats stats={this.state.stats} />
        </div>
      </div>
    </div>;
  }
}

class Tweets extends React.Component {
  render() {
    return <ul className="tweets">
      {this.props.tweets.map((tweet) => {
        return <li className="tweet" key={tweet.id}>
          <div className="profile-image">
            <img src={tweet.user.profile_image_url}/>
          </div>
          <div className="content">
            <h3 className="name">{tweet.user.name}</h3>
            <p className="text">{tweet.text}</p>
          </div>
        </li>;
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
  let kb = Math.floor(size / 1024);
  // http://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
  return kb.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + 'kb';
}

render(<App />, document.getElementById('app'));
