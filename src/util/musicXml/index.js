import xmldoc from 'xmldoc';
import { instrumentNameMappings } from './instrumentNames';

const instrumentsFromMusicXml = partList => {
  return partList.children.map(part => {
    if(part.childNamed('midi-instrument')) {
      const midiProgram = part.childNamed('midi-instrument').childNamed('midi-program');
      return instrumentNameMappings[parseInt(midiProgram.val)];
    }
    return 'acoustic_guitar_steel';
  });
};

const getTuning = (part, maker) => {
  const staff = part.childNamed('measure').childNamed('attributes').childNamed('staff-details');

  return staff.children.slice(1).map(string => {
    const note = string.children[0].val;
    const octave = parseInt(string.children[1].val);
    return (`${note}${maker === 'TuxGuitar' ? octave - 1 : octave}`).toLowerCase();
  });
};

const getBpmForMeasure = (measures, measure, index) => {
  const direction = measure.childNamed('direction');
  if(direction) {
    return parseInt(direction.childNamed('sound').attr.tempo);
  } else {
    return measures[index - 1].bpm ? measures[index - 1].bpm : 120;
  }
};

const getTimeSignatureForMeasure = (measures, measure, index) => {
  const attributes = measure.childNamed('attributes');
  if(attributes) {
    const time = attributes.childNamed('time');
    if(time) {
      return {
        beats: time.childNamed('beats').val,
        beatType: time.childNamed('beat-type').val
      };
    }
  }

  return measures[index - 1].timeSignature ? measures[index - 1].timeSignature : { beats: 4, beatType: 4 };
};

const durationFromType = type => {
  const typeChar = type.substring(0, 1);
  if(typeChar === '1') {
    return 's';
  } else if(typeChar === '3') {
    return 't';
  }
  return typeChar;
};

const getNotesForMeasure = (notes, stringCount) => {
  return notes.reduce((finalNotes, note) => {
    const duration = durationFromType(note.childNamed('type').val);
    const dotted = note.childNamed('dot') ? true : false;
    const isChord = note.childNamed('chord') ? true : false;

    if(note.childNamed('rest')) {
      return finalNotes.concat({
        duration,
        dotted,
        string: ['rest'],
        fret: ['rest']
      });
    }
    const fret = parseInt(note.childNamed('notations').childNamed('technical').childNamed('fret').val);
    const string = stringCount - parseInt(note.childNamed('notations').childNamed('technical').childNamed('string').val);

    let frets, strings;
    if(isChord) {
      frets = finalNotes[finalNotes.length - 1].fret.concat(fret);
      strings = finalNotes[finalNotes.length - 1].string.concat(string);

      return finalNotes.slice(0, finalNotes.length - 1).concat({
        duration,
        fret: frets,
        string: strings,
        dotted
      });
    }

    frets = [fret];
    strings = [string];

    return finalNotes.concat({
      duration,
      fret: frets,
      string: strings,
      dotted
    });
  }, []);
};

const measuresFromMusicXml = (measures, stringCount) => {
  return measures.reduce((finalMeasures, measure, i) => {
    const bpm = getBpmForMeasure(finalMeasures, measure, i);
    const timeSignature = getTimeSignatureForMeasure(finalMeasures, measure, i);
    const notes = getNotesForMeasure(measure.childrenNamed('note'), stringCount);

    return finalMeasures.concat({
      bpm,
      timeSignature,
      notes
    });
  }, []);
};

export function importMusicXml(xmlString) {
  const xml = new xmldoc.XmlDocument(xmlString);
  const parts = xml.childrenNamed('part');

  const instruments = instrumentsFromMusicXml(xml.childNamed('part-list'));
  const maker = xml.childNamed('identification').childNamed('encoding').childNamed('software').val;

  return parts.reduce((finalParts, part, i) => {
    const instrument = instruments[i];
    const tuning = getTuning(part, maker);
    const measures = measuresFromMusicXml(part.childrenNamed('measure'), tuning.length);

    return finalParts.concat({
      instrument,
      tuning,
      measures
    });
  }, []);
}