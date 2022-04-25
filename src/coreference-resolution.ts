import { partition } from 'lodash'

import type {
  EdgeDefinition,
  EntityDefinition,
  ForeignKeyDefinition,
  PropertyDefinition,
} from './adapters/types'
import type { BackendContext } from './backends/base'
import type { BuildContext } from './compiler'
import { key } from './coreference'

// TODO: eliminate this
// Filter out error coreference values
export function is_valid_attribute({ coreferences: { error } }: BackendContext) {
  return ({ name }: PropertyDefinition) => !(key(name) in error)
}

export function is_valid_foreign_key({ coreferences: { error } }: BackendContext) {
  return ({ source_column, target_column }: ForeignKeyDefinition) =>
    !(key(source_column) in error) && !(key(target_column) in error)
}

export function postprocess_foreign_key(backend: BackendContext) {
  const validator = is_valid_foreign_key(backend)

  return (foreign_key: ForeignKeyDefinition) => {
    if (validator(foreign_key)) {
      return [foreign_key]
    }
    console.error('Skipping table foreign_key', foreign_key)
    return []
  }
}

export function postprocess_entity(backend: BackendContext) {
  const validator = is_valid_attribute(backend)

  return (entity: EntityDefinition) => {
    const [columns, skipped] = partition(entity.columns, validator)
    for (const column of skipped) {
      console.error(`Skipping entity: ${entity.name}`, column)
    }
    return [{ ...entity, columns }]
  }
}

export function postprocess_edge(backend: BackendContext) {
  const validator = is_valid_attribute(backend)

  return (edge: EdgeDefinition) => {
    const [columns, skipped] = partition(edge.columns, validator)
    for (const column of skipped) {
      console.error(`Skipping edge: ${edge.name}`, column)
    }
    return [{ ...edge, columns }]
  }
}

export function postprocess_context(
  { nodes, edges, tables, foreign_keys, ...context }: BuildContext,
  backend: BackendContext,
): BuildContext {
  return {
    ...context,
    nodes: nodes.flatMap(postprocess_entity(backend)),
    edges: edges.flatMap(postprocess_edge(backend)),
    tables: tables.flatMap(postprocess_entity(backend)),
    foreign_keys: foreign_keys.flatMap(postprocess_foreign_key(backend)),
  }
}
