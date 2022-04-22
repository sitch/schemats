import { difference, size, uniqWith } from 'lodash'

import type { EnumDefinition, TableDefinition } from './adapters/types'
import type { BuildContext } from './compiler'
import type { Backend, Config } from './config'
import { pretty } from './formatters'
import { json_equal } from './utils'

const enum_equal = (left: EnumDefinition, right: EnumDefinition): boolean => {
  if (
    left.table !== right.table ||
    left.column !== right.column ||
    left.name !== right.name
  ) {
    return false
  }
  return json_equal(left.values, right.values)
}

export const validate_enums = (config: Config, enums: EnumDefinition[]): boolean => {
  const enums_uniq = uniqWith(enums, enum_equal)
  const enums_collision = difference(enums, enums_uniq)

  if (enums_collision.length > 0) {
    console.error('Enum collisions found:', pretty(enums_collision))
    return false
  }
  return true
}

export const validate_tables = (config: Config, tables: TableDefinition[]): boolean => {
  if (size(tables) <= 0) {
    console.error(`[table_names] No tables found: ${config.schema}`)
    return false
  }
  return true
}

export const validate_coreferences = (
  _context: BuildContext,
  _backend: Backend,
): boolean => {
  return true
}
