import { get, groupBy, map, mapValues, pickBy, sortBy, uniq } from 'lodash'

import type {
  ColumnName,
  EdgeDefinition,
  NodeDefinition,
  TableDefinition,
  UDTName,
} from './adapters/types'
import type { BuildContext } from './compiler'
import type { BackendName } from './enums'
import { DATA_SOURCE_JULIA_TYPEMAP } from './typemaps/julia-typemap'
import { DATA_SOURCE_TYPEDB_TYPEMAP } from './typemaps/typedb-typemap'

//------------------------------------------------------------------------------

export type AbstractTypeMap = Record<UDTName, string>
export type UDTTypeMap<T> = Record<UDTName, T>

//------------------------------------------------------------------------------

export interface CoreferenceType {
  table_name: string
  column_name: string
  source_type: string
  dest_type: string | undefined
}

export type CoreferenceMap = Record<ColumnName, CoreferenceType[]>

export interface Coreferences {
  all: CoreferenceMap
  user: CoreferenceMap
}

export interface TypeQualifiedCoreferences {
  all: CoreferenceMap
  error: CoreferenceMap
  warning: CoreferenceMap
}

//------------------------------------------------------------------------------

export function key(coreference_name: string) {
  return coreference_name.toLowerCase()
}

export function maybe_key(coreference_name: string | undefined) {
  return coreference_name ? key(coreference_name) : undefined
}

function get_typemap(
  { data_source }: BuildContext,
  backend_name?: BackendName,
): AbstractTypeMap {
  if (backend_name === 'typedb') {
    return DATA_SOURCE_TYPEDB_TYPEMAP[data_source]
  }
  if (backend_name === 'julia') {
    return DATA_SOURCE_JULIA_TYPEMAP[data_source]
  }
  return {}
}

function lookup_typemap(source_type: string, typemap?: AbstractTypeMap) {
  return get(typemap, key(source_type))
}

//------------------------------------------------------------------------------

function entity_parts(
  entity: TableDefinition | NodeDefinition | EdgeDefinition,
  typemap?: Record<string, string>,
): CoreferenceType[] {
  return entity.columns.map(column => ({
    table_name: entity.name,
    column_name: column.name,
    source_type: column.udt_name,
    source_type_key: key(column.udt_name),
    dest_type: lookup_typemap(column.udt_name, typemap),
    dest_type_key: maybe_key(lookup_typemap(column.udt_name, typemap)),
  }))
}

const coreference_sorter = (records: CoreferenceType[]) => sortBy(records)
const attribute_filter = (records: CoreferenceType[]) => records.length > 1
const source_type_filter = (records: CoreferenceType[]) =>
  uniq(map(records, 'source_type_key')).length > 1
const dest_type_filter = (records: CoreferenceType[]) =>
  uniq(map(records, 'dest_type_key')).length > 1

function build_mapping(context: BuildContext, backend?: BackendName) {
  const typemap = get_typemap(context, backend)
  const records = [...context.tables, ...context.nodes, ...context.edges].flatMap(
    entity => entity_parts(entity, typemap),
  )
  return groupBy(records, record => key(record.column_name))
}

const attribute_overlaps = (mapping: CoreferenceMap): CoreferenceMap => {
  return pickBy(mapping, attribute_filter)
}

const source_type_overlaps = (mapping: CoreferenceMap): CoreferenceMap => {
  return pickBy(mapping, source_type_filter)
}

const dest_type_overlaps = (mapping: CoreferenceMap): CoreferenceMap => {
  return pickBy(mapping, dest_type_filter)
}

function sorter(mapping: CoreferenceMap): CoreferenceMap {
  return mapValues(mapping, coreference_sorter)
}

export function build_coreferences(
  context: BuildContext,
  backend?: BackendName,
): Coreferences {
  const mapping = build_mapping(context, backend)
  return {
    all: sorter(attribute_overlaps(mapping)),
    user: {},
  }
}

export const build_type_qualified_coreferences = (
  context: BuildContext,
  backend: BackendName,
): TypeQualifiedCoreferences => {
  const mapping = build_mapping(context, backend)
  return {
    all: sorter(attribute_overlaps(mapping)),
    error: sorter(dest_type_overlaps(mapping)),
    warning: sorter(source_type_overlaps(mapping)),
  }
}
