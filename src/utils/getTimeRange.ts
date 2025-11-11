const getTimeRange = (timeRanges: TimeRanges, time: number): [number, number] => {
  for (let i: number = 0; i < timeRanges.length; i++) {
    const start: number = timeRanges.start(i);
    const end: number = timeRanges.end(i);
    if (start <= time && time <= end) {
      return [start, end];
    }
  }

  return [0, 0];
};

export default getTimeRange;
