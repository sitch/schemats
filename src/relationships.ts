import { Config } from "./config";
import {
  ForeignKey,
  TableName,
  TableDefinition,
  TableDefinitionMap,
} from "./adapters/types";

//------------------------------------------------------------------------------

export interface Relationship {
  primary: TableDefinition;
  foreign: TableDefinition;
  type: RelationshipType;
}

export type RelationshipType = string;
export type RelationshipMap = Record<TableName, Relationship[]>;

//------------------------------------------------------------------------------

export const buildRelationships = (
  config: Config,
  tables: TableDefinitionMap,
  foreignKeys: ForeignKey[]
): Relationship[] => {
  return [];
};

// Multi-column foreign keys are harder to model.
// To get consistent outputs, just ignore them for now.
//
// const countKey = (fk: ForeignKey) => `${fk.table_name},${fk.conname}`;
// const colCounts = countBy(result.rows, countKey);
export const transformCompoundForeignKeys = (
  foreignKeys: ForeignKey[]
): ForeignKey[] => {
  // TODO: implement
  throw "not implemented";
};
