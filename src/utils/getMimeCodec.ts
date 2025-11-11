import EMimeType from '@parser/manifest/enum/EMimeType';

const getMimeCodec = (mimeType: EMimeType, codecs: string): string => {
  return `${mimeType}; codecs="${codecs}"`;
};

export default getMimeCodec;
