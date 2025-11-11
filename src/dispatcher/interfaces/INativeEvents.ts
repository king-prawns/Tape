import ENativeEvent from '../enum/ENativeEvent';

interface INativeEvents {
  [ENativeEvent.CAN_PLAY_THROUGH]: Event;
  [ENativeEvent.ENCRYPTED]: MediaEncryptedEvent;
  [ENativeEvent.ENDED]: Event;
  [ENativeEvent.PAUSE]: Event;
  [ENativeEvent.PICTURE_IN_PICTURE_ENTER]: Event;
  [ENativeEvent.PICTURE_IN_PICTURE_LEAVE]: Event;
  [ENativeEvent.PLAY]: Event;
  [ENativeEvent.RATE_CHANGE]: Event;
  [ENativeEvent.SEEKING]: Event;
  [ENativeEvent.TIME_UPDATE]: Event;
  [ENativeEvent.VOLUME_CHANGE]: Event;
  [ENativeEvent.WAITING]: Event;
}

export default INativeEvents;
