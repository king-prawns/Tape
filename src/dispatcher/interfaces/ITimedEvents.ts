import IEvents from './IEvents';

type ITimedEvents = {
  [key in keyof IEvents]: CustomEvent<IEvents[key] & {currentTime: number}>;
};

export default ITimedEvents;
