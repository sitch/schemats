import sortJson from 'sort-json'

import type { TableDefinition } from '../adapters/types'
import type { BuildContext } from '../compiler'
import { cast_typedb_coreferences } from '../coreference'
import { inflect, pretty } from '../formatters'
import type {
  Configuration,
  GeneratorEntity,
  GeneratorRelation,
} from '../lang/typedb-loader-config'
import type { BackendContext } from './base'
import { normalize_name } from './typedb'

//-----------------------------------------------------------------------

// export const cast_attributes = ({ tables }: BuildContext) => {
//   const attributes: Record<string, GeneratorAttribute> = {}

//   for (const { name: table, columns } of tables) {
//     for (const { name: column } of columns) {
//       attributes[column] = {
//         data: [],
//         insert: {
//           attribute: column,
//           column: column,
//         },
//       }
//     }
//   }
//   return attributes
// }

export function data_paths(
  { config: { database, csvDir, overrideCsvPath } }: BuildContext,
  { name }: TableDefinition,
): string[] {
  if (overrideCsvPath) {
    return [overrideCsvPath]
  }
  return [`${csvDir}/${database}/${name}.csv`]
}

export const cast_entities = (
  context: BuildContext,
  { coreferences: { error } }: BackendContext,
) => {
  const entities: Record<string, GeneratorEntity> = {}
  for (const table of context.tables) {
    entities[table.name] = {
      data: data_paths(context, table),
      insert: {
        entity: inflect(table.name, 'pascal'),
        ownerships: table.columns
          .filter(({ name }) => !(name in error))
          .map(({ name, is_nullable }) => ({
            attribute: normalize_name(name),
            column: name,
            required: !is_nullable,
          })),
      },
    }
  }
  return entities
}

export const cast_relations = (
  context: BuildContext,
  { coreferences: { error } }: BackendContext,
) => {
  const entities: Record<string, GeneratorRelation> = {}
  for (const table of context.tables) {
    entities[table.name] = {
      data: data_paths(context, table),
      insert: {
        relation: inflect(table.name, 'pascal'),
        ownerships: table.columns
          .filter(({ name }) => !(name in error))
          .map(({ name, is_nullable }) => ({
            attribute: normalize_name(name),
            column: name,
            required: !is_nullable,
          })),
        players: [],
      },
    }
  }
  return entities
}

export const build = (context: BuildContext): Configuration => {
  const backend: BackendContext = {
    backend: 'typedb',
    comment: '#',
    indent: '  ',
    character_line_limit: 80,
    coreferences: cast_typedb_coreferences(context),
  }

  return {
    globalConfig: {
      separator: ',',
      rowsPerCommit: 50,
      parallelisation: 24,
      schema: context.schema,
    },
    // attributes: cast_attributes(context, backend),
    entities: cast_entities(context, backend),
    // relations: cast_relations(context, backend),
  }
}

// eslint-disable-next-line @typescript-eslint/require-await
export const render_typedb_loader_config = async (context: BuildContext) => {
  return pretty(sortJson(build(context)))
}
