import io from 'socket.io-client';
import React from 'react';
import { render } from 'react-dom';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      events: [],
      stats: {
        transmitted: 0,
        sent: 0,
        sentCompressed: 0
      }
    };
  }

  componentWillMount() {
    let socket = io();
    socket.on('events', (events, stats) => {
      this.setState({ events, stats });
    });
  }

  render() {
    return <div className="container">
      <div className="row">
        <div className="col-xs-7">
          <GitHubEvents events={this.state.events} />
        </div>
        <div className="col-xs-5">
          <Stats stats={this.state.stats} />
        </div>
      </div>
    </div>;
  }
}

class GitHubEvents extends React.Component {
  render() {
    return <ul className="github-events">
      {this.props.events.map((event) => {
        let action = this.getAction(event);
        if (!action) return;

        let repo = event.repo.name.split('/')[1];
        let type = this.getType(event);

        return <li className="event" key={event.id}>
          <span className="avatar">
            <img src={event.actor.avatar_url}/>
          </span>
          <span className="event-type badge">{type}</span>
          <span className="desc">{event.actor.login} {action} {repo}</span>
        </li>;
      }).filter(v => !!v)}
    </ul>;
  }

  getType(event) {
    let type;
    switch (event.type) {
      case 'CommitCommentEvent':
      case 'IssueCommentEvent':
      case 'PullRequestReviewCommentEvent':
        type = 'Comment';
        break;
      case 'WatchEvent':
        type = 'Follow';
        break;
      default:
        type = event.type.replace(/Event$/, '');
        break;
    }
    return type.toUpperCase();
  }

  getAction(event) {
    switch (event.type) {
      case 'CommitCommentEvent':
      case 'IssueCommentEvent':
      case 'PullRequestReviewCommentEvent':
        return 'commented to';
      case 'CreateEvent':
        let refType = event.payload.ref_type;
        switch (refType) {
          case 'repository':
            return 'created';
          case 'branch':
          case 'tag':
            return `created a ${refType} on`;
        }
      case 'DeleteEvent':
        return `deleted a ${event.payload.ref_type}`;
      case 'FollowEvent':
        return 'followed';
      case 'ForkEvent':
        return 'forked';
      case 'GollumEvent':
        return 'edited wiki on';
      case 'PushEvent':
        return 'pushed to';
      case 'ReleaseEvent':
        return 'released';
      case 'WatchEvent':
        return 'watched';
      case 'IssuesEvent':
        return `${event.payload.action} an issue on`;
      case 'PullRequestEvent':
        return `${event.payload.action} a pull request on`;
    }
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
