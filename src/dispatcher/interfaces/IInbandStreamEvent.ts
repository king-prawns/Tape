import EEvent from '../enum/EEvent';

interface IInbandStreamEvent {
  name: EEvent.INBAND_STREAM;
  id: number;
  eventDuration: number;
  timescale: number;
  presentationTimeDelta: number;
  schemeIdUri: string;
  value: string;
  messageData: Uint8Array;
}

export default IInbandStreamEvent;
