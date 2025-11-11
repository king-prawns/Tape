interface IBuffer {
  feedBuffer(time: number): void;
  clearBuffer(startTime?: number, endTime?: number): boolean;
  getBufferRange(time: number): [number, number];
  destroy(): void;
}

export default IBuffer;
