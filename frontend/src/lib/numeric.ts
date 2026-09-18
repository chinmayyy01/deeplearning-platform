export const minOf = (values: readonly number[]): number =>
  values.reduce((min, value) => (value < min ? value : min), Infinity);

export const maxOf = (values: readonly number[]): number =>
  values.reduce((max, value) => (value > max ? value : max), -Infinity);

export const extent = (values: readonly number[]): [number, number] => [
  minOf(values),
  maxOf(values),
];
