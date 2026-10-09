// Shopee list endpoints (orders, returns) reject time ranges longer than 15 days.
const MAX_LIST_RANGE_DAYS = 15;

export function buildTimeRanges({ timeFrom, timeTo, maxRangeDays = MAX_LIST_RANGE_DAYS }) {
  const maxRangeSeconds = maxRangeDays * 24 * 60 * 60;
  const ranges = [];
  let rangeTo = timeTo;

  while (rangeTo >= timeFrom) {
    const rangeFrom = Math.max(timeFrom, rangeTo - maxRangeSeconds + 1);

    ranges.push({
      timeFrom: rangeFrom,
      timeTo: rangeTo
    });

    rangeTo = rangeFrom - 1;
  }

  return ranges;
}

export function chunkArray(array, size) {
  const chunks = [];

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
}
