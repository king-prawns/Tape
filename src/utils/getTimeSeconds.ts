/**
 * @param {string} time Format: 01:15:23.500
 */

const getTimeSeconds = (time: string): number => {
  const tokens: Array<string> = time.split(':');
  const hours: number = Number(tokens[0]);
  const minutes: number = Number(tokens[1]);
  const seconds: number = Number(tokens[2]);

  return 60 * 60 * hours + 60 * minutes + seconds;
};

export default getTimeSeconds;
