// export interface Typedef<T> {
// defaultValue?: T | undefined;

export interface Typedef {
  name: string;
  hasDefault: boolean;
  isArray: boolean;
  isNullable: boolean;
  type: string;
}
