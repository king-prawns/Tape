interface IStreamConfig {
  autoplay?: boolean;
  preferredAudioLanguage?: string;
  preferredTextLanguage?: string | null;
  preferredVideoQuality?: number | null;
  startingPosition?: number | null;
}

export default IStreamConfig;
