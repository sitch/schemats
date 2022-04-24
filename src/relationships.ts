import type {
  ColumnDefinition,
  ForeignKey,
  TableDefinition,
  TableName,
} from './adapters/types'
import type { Config } from './config'

//------------------------------------------------------------------------------

export interface Relationship {
  primary: TableDefinition
  foreign: TableDefinition
  type: RelationshipType
}

export interface RelationshipEdge {
  name: RelationshipEdgeName
  domain: TableDefinition
  codomain: TableDefinition
  properties: ColumnDefinition[]
}

export type RelationshipEdgeName = string
export type RelationshipType = string
export type RelationshipMap = Record<TableName, Relationship[]>

//------------------------------------------------------------------------------

export const build_relationships = (
  _config: Config,
  _tables: TableDefinition[],
): Relationship[] => {
  return []
}

// Multi-column foreign keys are harder to model.
// To get consistent outputs, just ignore them for now.
//
// const countKey = (fk: ForeignKey) => `${fk.table_name},${fk.conname}`;
// const colCounts = countBy(result.rows, countKey);
export const transform_compound_foreign_keys = (
  _config: Config,
  _tables: TableDefinition[],
): ForeignKey[] => {
  // TODO: implement
  throw new Error('not implemented')
}
