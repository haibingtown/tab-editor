import { range } from 'lodash';
import { getBpmForNote, getPercentageOfNote, getDurationFromPercentage } from '../util/audioMath';

export const getReplaySpeed = (measure, noteIndex, lastNoteIndex) => {
  if(noteIndex === lastNoteIndex) {
    const speeds = measure[noteIndex].map(note => getBpmForNote(getDurationFromPercentage(1 - note.position, note.timeSignature), note.bpm));
    return Math.max(...speeds);
  }

  const nextPosition = Math.min(...measure[noteIndex + 1].map(note => note.position));
  const positionDiff = nextPosition - measure[noteIndex][0].position;

  const speeds = measure[noteIndex].map(note => getBpmForNote(getDurationFromPercentage(positionDiff, note.timeSignature), note.bpm));
  return Math.max(...speeds);
};

export const createScheduleForSong = (tracks, metronome) => {
  return tracks[0].measures.map((_, i) => {
    return createScheduleForMeasure(tracks, i, metronome);
  });
};

const measureWithTimeslots = (tracks, measureIndex) => {
  return tracks.reduce((accum, track, trackIndex) => {
    const measure = track.measures[measureIndex];

    const noteBuckets = measure.notes.reduce((bucket, note, noteIndex) => {
      const percentage = getPercentageOfNote(note.duration, measure.timeSignature, note.dotted, note.tuplet);

      const noteToUse = {
        ...note,
        originalMeasureIndex: measure.measureIndex,
        originalNoteIndex: noteIndex,
        instrument: track.instrument,
        tuning: track.tuning,
        bpm: measure.bpm,
        timeSignature: measure.timeSignature,
        trackIndex,
        position: bucket.totalDuration,
        percentage
      };

      if(bucket.totalDuration + percentage > 1.0) {
        if(bucket.totalDuration < 1.0) { // Shorten the note
          const newPercentage = 1.0 - bucket.totalDuration;
          return {
            ...bucket,
            [(bucket.totalDuration).toString()]: {
              ...noteToUse,
              percentage: newPercentage
            },
            totalDuration: bucket.totalDuration + newPercentage
          };
        } else {
          return bucket;
        }
      }

      return {
        ...bucket,
        [(bucket.totalDuration).toString()]: noteToUse,
        totalDuration: bucket.totalDuration + percentage
      };
    }, { totalDuration: 0 });
    return accum.concat(noteBuckets);
  }, []);
};

const trackWithTimeslots = (measures) => {
  return measures.reduce((accum, measure) => {
    Object.keys(measure).forEach(bucket => {
      if(bucket === 'totalDuration') {
        return accum;
      }
      if(accum[bucket]) {
        accum[bucket] = accum[bucket].concat(measure[bucket]);
      } else {
        accum[bucket] = [measure[bucket]];
      }
    });
    return accum;
  }, {});
};

const scheduledMeasureArray = (measure) => {
  return Object.keys(measure).sort().map(timeSlot => {
    return measure[timeSlot];
  });
};

const metronomeTrackForMeasure = (tracks, measureIndex) => {
  const measure = tracks[0].measures[measureIndex];
  const { beats, beatType } = measure.timeSignature;

  return range(beats).reduce((bucket, index) => {
    const percentage = (1 / beatType) / (beats / beatType);

    const noteToUse = {
      originalMeasureIndex: measure.measureIndex,
      originalNoteIndex: index,
      trackIndex: tracks.length,
      instrument: 'woodblock',
      tuning: tracks[0].tuning,
      bpm: measure.bpm,
      timeSignature: measure.timeSignature,
      position: bucket.totalDuration,
      percentage,
      metronome: true // triggers custom playback method
    };

    return {
      ...bucket,
      [(bucket.totalDuration).toString()]: noteToUse,
      totalDuration: bucket.totalDuration + percentage
    };
  }, { totalDuration: 0 });
};

export const createScheduleForMeasure = (tracks, measureIndex, metronome) => {
  const annotatedMeasures = measureWithTimeslots(tracks, measureIndex);
  const scheduledMeasure = metronome ?
    trackWithTimeslots(annotatedMeasures.concat(metronomeTrackForMeasure(tracks, measureIndex))) :
    trackWithTimeslots(annotatedMeasures);

  return scheduledMeasureArray(scheduledMeasure);
};
