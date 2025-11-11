import IAdaptationSet from './IAdaptationSet';

interface IPeriod {
  id: string;
  start: number;
  duration: number;
  video: Array<IAdaptationSet>;
  audio: Array<IAdaptationSet>;
  text: Array<IAdaptationSet>;
}

export default IPeriod;
