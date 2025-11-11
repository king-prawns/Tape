import EEvent from '../enum/EEvent';

interface IBuffersUpdateEvent {
  name: EEvent.BUFFERS_UPDATE;
  audioBuffered: TimeRanges;
  videoBuffered: TimeRanges;
}

export default IBuffersUpdateEvent;
