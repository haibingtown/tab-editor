import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import * as TracksActions from '../actions/tracks';
import * as TrackActions from '../actions/track';
import * as MeasureActions from '../actions/measure';
import * as PlayingIndexActions from '../actions/playingIndex';
import * as CursorActions from '../actions/cursor';
import * as CopyPasteActions from '../actions/cutCopyPaste';

import Soundfont from 'soundfont-player';
import audioContext from '../util/audioContext';
import { getNextNote } from '../util/cursor';

import Score from '../components/Score';
import EditorArea from '../components/editor/EditorArea';
import TimeSignatureModal from '../components/editor/TimeSignatureModal';
import TuningModal from '../components/editor/TuningModal';
import BpmModal from '../components/editor/BpmModal';
import Playback from '../components/Playback';
import Metronome from '../components/Metronome';

// Fix for Safari/Edge, which can't play .ogg files
if(!!navigator.userAgent.match(/Version\/[\d\.]+.*Safari/) || !!navigator.userAgent.match(/Edge\/\d+/)) {
  Soundfont.nameToUrl = function(name) {
    return `https://cdn.rawgit.com/gleitz/midi-js-Soundfonts/master/FluidR3_GM/${name}-mp3.js`;
  };
}

const Actions = Object.assign(TracksActions, TrackActions, MeasureActions, PlayingIndexActions, CursorActions, CopyPasteActions);

const style = { width: '100%', height: '100%' };

class App extends Component {
  constructor(props) {
    super(props);

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyPress);
      window.addEventListener('resize', this.handleResize);
    }

    this.state = {
      openModal: null
    };
  }

  componentWillMount() {
    this.loadSoundfont(this.props.instrument);
  }

  componentWillReceiveProps(nextProps) {
    const { playingIndex } = nextProps;

    if(this.props.playingIndex && playingIndex) {
      if(playingIndex.noteIndex !== this.props.playingIndex.noteIndex
          || playingIndex.measureIndex !== this.props.playingIndex.measureIndex) {
        this.updateScrollPosition(nextProps.playingIndex, nextProps.measures);
      }
    } else if(this.props.instrument !== nextProps.instrument) {
      this.setState({
        buffers: undefined
      }, () => {
        this.loadSoundfont(nextProps.instrument);
      });
    }
  }

  loadSoundfont = (instrument) => {
    Soundfont.loadBuffers(audioContext, instrument).then((buffers) => {
      this.setState({
        buffers: Object.assign({}, this.state.buffers, { [instrument]: buffers })
      });
    });

    if(!this.state.woodblockBuffers) {
      Soundfont.loadBuffers(audioContext, 'woodblock').then((woodblockBuffers) => {
        this.setState({ woodblockBuffers });
      });
    }
  };

  handleResize = () => {
    this.props.actions.resize();
  };

  getXOfCurrentNote = (playingIndex, measures) => {
    const { measureIndex, noteIndex } = playingIndex;
    const xOfMeasures = measures.reduce((acc, curr, i) => {
      if(i >= measureIndex) {
        return acc;
      }
      return acc + curr.width;
    }, 0);

    return xOfMeasures + 55 * noteIndex;
  };

  getYOfCurrentNote = (playingIndex, measures) => {
    const position = measures[playingIndex.measureIndex];
    return (position.rowIndex) * (27 * this.props.tuning.length) + 50;
  };

  updateScrollPosition = (playingIndex, measures) => {
    if(this.props.layout === 'linear') {
      const x = this.getXOfCurrentNote(playingIndex, measures);
      const { scrollX, innerWidth } = window;

      if(x > innerWidth + scrollX - 200) {
        window.scroll(x - 200, 0);
      }
    } else {
      const y = this.getYOfCurrentNote(playingIndex, measures);
      const { innerHeight, scrollY } = window;

      if(y > innerHeight + scrollY - 270) {
        window.scroll(0, y - 100);
      }
    }
  };

  handleStop = () => {
    this.props.actions.setCursor({
      measureIndex: this.props.playingIndex.measureIndex,
      noteIndex: this.props.playingIndex.noteIndex,
      stringIndex: this.props.cursor.stringIndex
    });
    this.props.actions.setPlayingIndex(null);
  };

  handlePlay = () => {
    if(!this.props.playingIndex && this.state.buffers) {
      this.props.actions.setPlayingIndex(this.props.cursor);
    }
  };

  getCurrentNote = (cursor, selectRange) => {
    const { measures } = this.props;
    const { measureIndex, noteIndex } = cursor;

    if(selectRange) {
      if(Object.keys(selectRange).length === 1) {
        const measureIndex = Object.keys(selectRange)[0];
        const measure = measures[measureIndex];
        const notes = measure.notes.filter((_, i) => {
          if(selectRange[measureIndex].indexOf(i) !== -1) {
            return true;
          }
          return false;
        });
        return { notes };
      }

      return measures.reduce((accum, measure, i) => {
        if(Array.isArray(selectRange[i])) {
          const range = selectRange[i];
          const notes = measure.notes.filter((_, j) => {
            return range.indexOf(j) !== -1;
          });
          accum.push({ ...measure, notes });
          return accum;
        } else if(selectRange[i] === 'all') {
          accum.push(measure);
          return accum;
        }
        return accum;
      }, []);
    } else {
      return measures[measureIndex].notes[noteIndex];
    }
  };

  navigateCursor = (event) => {
    event.preventDefault();
    if(event.keyCode === 39) { // right arrow
      const { measures } = this.props;
      const { measureIndex, noteIndex } = this.props.cursor;
      if(measureIndex === measures.length - 1 &&
        (noteIndex === measures[measureIndex].notes.length - 1 || measures[measureIndex].notes.length === 0)
      ) {
        this.props.actions.insertMeasure();
      }
      this.props.actions.moveCursorRight();
    } else if(event.keyCode === 37) { // left arrow
      this.props.actions.moveCursorLeft();
    } else if(event.keyCode === 38) { // up arrow
      this.props.actions.moveCursorUp();
    } else if(event.keyCode === 40) { // down arrow
      this.props.actions.moveCursorDown();
    }
  };

  deleteNote = () => {
    const { measureIndex } = this.props.cursor;
    let notes = this.props.measures[measureIndex].notes;

    if(notes.length > 0) {
      this.props.actions.deleteNote(this.props.cursor);
    } else if(notes.length === 0) {
      this.props.actions.deleteMeasure(measureIndex);
    }
  };

  pasteNote = (event) => {
    const { cursor, clipboard, actions, measures } = this.props;

    if(!clipboard) {
      return;
    }
    event.preventDefault();

    actions.pasteNote(cursor, clipboard);
    if(clipboard.notes) {
      actions.setCursor({
        ...cursor,
        noteIndex: cursor.noteIndex + clipboard.notes.length
      });
    } else if(!Array.isArray(clipboard)) {
      if(cursor.noteIndex === measures[cursor.measureIndex].notes.length - 1) {
        actions.setCursor({
          ...cursor,
          noteIndex: cursor.noteIndex + 1
        });
      } else {
        actions.setCursor(getNextNote(measures, cursor));
      }
    } else {
      actions.setCursor({
        ...cursor,
        measureIndex: cursor.measureIndex + clipboard.length,
        noteIndex: 0
      });
    }
  };

  cutNote = () => {
    const { selectRange, cursor, actions } = this.props;

    if(selectRange) {
      const measureIndex = parseInt(Object.keys(selectRange)[0]);
      const noteIndex = Object.keys(selectRange).length > 1 ? 0 : selectRange[measureIndex][0];
      const newCursor = {
        ...cursor,
        noteIndex: noteIndex === 0 ? 0 : noteIndex - 1,
        measureIndex
      };
      actions.setCursor(newCursor);
      actions.setSelectRange(undefined);
      actions.cutNote(newCursor, this.getCurrentNote(cursor, selectRange), selectRange);
    } else {
      const newCursor = {
        ...cursor,
        noteIndex: cursor.noteIndex === 0 ? 0 : cursor.noteIndex - 1
      };
      actions.setCursor(newCursor);
      actions.cutNote(cursor, this.getCurrentNote(cursor, selectRange), selectRange);
    }
  };

  handleKeyPress = (event) => {
    if(this.state.openModal || (this.props.playingIndex && event.keyCode !== 32)) {
      return;
    }

    if((event.metaKey || event.ctrlKey) && event.keyCode === 67) { // cmd/ctrl+c
      event.preventDefault();
      return this.props.actions.copyNote(this.getCurrentNote(this.props.cursor, this.props.selectRange));
    }
    if((event.metaKey || event.ctrlKey) && event.keyCode === 86) { // cmd/ctrl+v
      return this.pasteNote(event);
    }
    if((event.metaKey || event.ctrlKey) && event.keyCode === 88) { // cmd/ctrl+x
      event.preventDefault();
      return this.cutNote();
    }

    if(event.keyCode <= 57 && event.keyCode >= 48 && !event.metaKey) {
      return this.props.actions.changeNote(this.props.cursor, event.keyCode - 48);
    } else if(event.keyCode === 82 && !event.metaKey && !event.ctrlKey) {
      this.props.actions.changeNote(this.props.cursor, 'rest');
    } else if(event.keyCode === 8) { // delete
      event.preventDefault();
      this.deleteNote();
    } else if(event.keyCode === 73 && !event.metaKey) { // i
      return this.props.actions.insertNote(this.props.cursor);
    } else if(event.keyCode === 32) { // spacebar
      event.preventDefault();
      return this.props.playingIndex ? this.handleStop() : this.handlePlay();
    } else if(event.keyCode === 190) { // period
      this.props.actions.toggleNoteDotted(this.props.cursor);
    } else if(event.shiftKey && event.keyCode === 187) { // plus
      return this.props.actions.increaseNoteLength(this.props.cursor);
    } else if(event.keyCode === 189) { // minus
      return this.props.actions.decreaseNoteLength(this.props.cursor);
    } else if(event.shiftKey && event.keyCode === 222) { // "
      this.props.actions.toggleNoteTremolo(this.props.cursor);
    } else if(event.keyCode === 86) { // v
      this.props.actions.toggleNoteVibrato(this.props.cursor);
    } else if(event.shiftKey && event.keyCode === 78) { // N
      this.props.actions.toggleNoteTrill(this.props.cursor);
    } else if(event.keyCode >= 37 && event.keyCode <= 40) {
      return this.navigateCursor(event);
    }
  };

  openModal = (openModal) => {
    this.setState({ openModal });
  };

  closeModal = () => {
    this.setState({ openModal: null });
  };

  render() {
    const { openModal, buffers, woodblockBuffers } = this.state;

    return (
      <div style={style}>
        { this.props.playingIndex ? <Playback buffers={buffers} /> : null}
        { this.props.playingIndex && this.props.metronome ? <Metronome buffers={woodblockBuffers} /> : null}
        <EditorArea canPlay={buffers && woodblockBuffers} handlePlay={this.handlePlay} openModal={this.openModal} />
        <Score />
        <TimeSignatureModal isOpen={openModal === 'timeSig'} closeModal={this.closeModal} />
        <TuningModal isOpen={openModal === 'tuning'} closeModal={this.closeModal} />
        <BpmModal isOpen={openModal === 'bpm'} closeModal={this.closeModal} />
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    measures: state.tracks[state.currentTrackIndex].measures,
    clipboard: state.clipboard,
    layout: state.layout,
    playingIndex: state.playingIndex,
    cursor: state.cursor,
    selectRange: state.selectRange,
    tuning: state.tracks[state.currentTrackIndex].tuning,
    instrument: state.tracks[state.currentTrackIndex].instrument,
    metronome: state.metronome
  };
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(Actions, dispatch)
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(App);
