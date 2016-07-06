import React, { Component } from 'react';
import { connect } from 'react-redux';
import shallowCompare from 'react-addons-shallow-compare';

import { setInstrument } from '../../actions/track';
import { instrumentNames } from '../../util/instrumentNames';

export default class InstrumentSelect extends Component {
  constructor() {
    super();
    this.onChange = this.onChange.bind(this);
  }

  shouldComponentUpdate(nextProps, nextState) {
    return shallowCompare(this, nextProps, nextState);
  }

  onChange(e) {
    const instrument = e.target.value;
    this.props.setInstrument(instrument);
  }

  render() {
    return (
      <select style={{ width: 180 }} onChange={this.onChange} value={this.props.instrument}>
        { instrumentNames.map((instrument) => {
          return <option key={instrument} value={instrument}>{instrument}</option>;
        })}
      </select>
    );
  }
}

function mapStateToProps(state) {
  return {
    instrument: state.tracks.present[state.currentTrackIndex].instrument
  };
}

export default connect(mapStateToProps, { setInstrument })(InstrumentSelect);
