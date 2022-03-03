import { difference, size, uniqWith } from 'lodash'

import { EnumDefinition, TableDefinition } from './adapters/types'
import { BuildContext } from './compiler'
import { Backend, Config } from './config'
import { pretty } from './formatters'
import { jsonEq } from './utils'

const enumEq = (left: EnumDefinition, right: EnumDefinition): boolean => {
  if (
    left.table !== right.table ||
    left.column !== right.column ||
    left.name !== right.name
  ) {
    return false
  }
  return jsonEq(left.values, right.values)
}

export const validateEnums = (config: Config, enums: EnumDefinition[]): boolean => {
  const enumsUniq = uniqWith(enums, enumEq)
  const enumsCollision = difference(enums, enumsUniq)

  if (enumsCollision.length > 0) {
    console.error('Enum collisions found:', pretty(enumsCollision))
    return false
  }
  return true
}

export const validateTables = (config: Config, tables: TableDefinition[]): boolean => {
  if (size(tables) <= 0) {
    console.error(`[tableNames] No tables found: ${config.schema}`)
    return false
  }
  return true
}

export const validateCoreferences = (
  _context: BuildContext,
  _backend: Backend,
): boolean => {
  return true
}
