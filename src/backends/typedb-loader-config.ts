import sortJson from 'sort-json'

import type { BuildContext } from '../compiler'
import { cast_typedb_coreferences } from '../coreference'
import { inflect, pretty } from '../formatters'
import type {
  Configuration,
  // GeneratorAttribute,
  GeneratorEntity,
} from '../lang/typedb-loader-config'
import type { BackendContext } from './base'

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

export const cast_entities = (
  { config, tables }: BuildContext,
  { comment, indent, coreferences: { all, error, warning } }: BackendContext,
) => {
  const entities: Record<string, GeneratorEntity> = {}
  for (const { name: table, columns } of tables) {
    entities[table] = {
      data: [
        `/home/sitch/sites/fortress/SelfAssemble.jl/data/dumps/${config.database}/${table}.csv`,
      ],
      insert: {
        entity: inflect(table, 'pascal'),
        ownerships: columns
          .filter(({ name }) => !(name in error))
          .map(({ name, is_nullable }) => ({
            attribute: name,
            column: name,
            required: !is_nullable,
          })),
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
      // schema: '/home/sitch/sites/fortress/SelfAssemble.jl/typedb/schema.tql',
      schema: `/home/sitch/sites/fortress/SelfAssemble.jl/@generated/db/typedb/${context.config.database}.tql`,
    },
    // attributes: cast_attributes(context, backend),
    entities: cast_entities(context, backend),
  }
}

// eslint-disable-next-line @typescript-eslint/require-await
export const render_typedb_loader_config = async (context: BuildContext) => {
  return pretty(sortJson(build(context)))
}
