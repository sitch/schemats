import type { InferredPType } from './enums'

export interface EntityStatistics {
  cardinality: number
  statistics?: PropertyStatistics[]
}

export interface CategoricalStatistics<T> {
  label: string
  value: T | null
  frequency: number
  relative_frequency: number
}

interface PType<T> {
  inferred_ptype: InferredPType
  anomalous_values: InferredPType[]
  missing_values: InferredPType[]
  normal_values: T[]
}
interface DefaultColumnStatistics<T> {
  cardinality: number
  is_null_present: boolean
  categories: CategoricalStatistics<T>[]
  ptype: PType<T>
}

export interface NumericalColumnStatistics extends DefaultColumnStatistics<number> {
  mean: number
  median: number
  minimum: number
  maximum: number
  range: number
  standard_deviation: number
  variance: number
  q1: number
  q3: number
  iqr: number
  skewness: number
  mode: number
}

export interface TextColumnStatistics extends DefaultColumnStatistics<string> {
  minimum_length: number
  maximum_length: number
  range: number
  standard_deviation: number
  variance: number
  q1: number
  q3: number
  iqr: number
  skewness: number
  mode: number
}

type BooleanColumnStatistics = DefaultColumnStatistics<boolean>

export type PropertyStatistics =
  | NumericalColumnStatistics
  | TextColumnStatistics
  | BooleanColumnStatistics
