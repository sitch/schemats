import inflection from 'inflection'
import { flatMap, size } from 'lodash'

import type {
  ForeignKeyDefinition,
  PropertyDefinition,
  TableDefinition,
} from '../adapters/types'
import type { BuildContext } from '../compiler'
import { build_type_qualified_coreferences } from '../coreference'
import { banner, lines, pad_lines } from '../formatters'
import { renderer_context } from '../lang/julia'
import { cast_julia_type } from '../typemaps/julia-typemap'
import type { BackendContext } from './base'
import { header } from './base'

//------------------------------------------------------------------------------

const imports = (_context: BuildContext): string => `
using AlgebraicRelations.DB
using SQLite
`

const normalize_name = (name: string): string => {
  return name
  // return is_reserved_word(name) ? `${name}_` : name;
}

// const prefix = (context: BuildContext) => {
//   return `${context.config.database.toLowerCase()}-`
// }

//------------------------------------------------------------------------------

const JuliaAttribute = {
  comment: (_context: BuildContext, _column: PropertyDefinition): string => {
    return ''
  },
  name: ({ config }: BuildContext, { name }: PropertyDefinition): string => {
    return normalize_name(config.formatAttributeName(name))
  },
  type: (context: BuildContext, column: PropertyDefinition): string => {
    // return translate_type(context, column)
    return cast_julia_type(context, column)
  },
}

const JuliaEntity = {
  comment: (_context: BuildContext, { name }: TableDefinition): string => {
    return `# Table: ${name}`
  },
  name: ({ config }: BuildContext, { name }: TableDefinition): string => {
    name = inflection.singularize(name)
    return normalize_name(config.formatEntityName(name))
  },
}

const JuliaRelation = {
  comment: (
    _context: BuildContext,
    {
      source_table,
      source_column,
      target_table,
      target_column,
      constraint,
    }: ForeignKeyDefinition,
  ): string => {
    return lines([
      constraint && `# Constraint: ${constraint}`,
      `# Relation: ${source_table}.${source_column} => ${target_table}.${target_column}`,
    ])
  },
  name: ({ config }: BuildContext, { source_column }: ForeignKeyDefinition): string => {
    // TODO: improve global suffix handling
    const relation = source_column.replace(/_id$/, '').replace(/_?I[Dd]$/, '')
    return normalize_name(config.formatRelationName(relation))
  },
  type: (context: BuildContext, foreign_key: ForeignKeyDefinition): string => {
    const column = { name: foreign_key.target_table, columns: [] }
    const name = JuliaEntity.name(context, column)
    return `Nullable{${name}}`
  },
  relation: (context: BuildContext, foreign_key: ForeignKeyDefinition): string => {
    const column = { name: foreign_key.target_table, columns: [] }
    const name = JuliaEntity.name(context, column)
    return `Nullable{${name}}`
  },
}

//------------------------------------------------------------------------------

const cast_attribute =
  (context: BuildContext, record: TableDefinition) =>
  (column: PropertyDefinition): string => {
    const ob = JuliaEntity.name(context, record)
    const name = JuliaAttribute.name(context, column)
    const type = JuliaAttribute.type(context, column)
    const comment = JuliaAttribute.comment(context, column)

    const line = `${ob}_${name}::Attr(${ob}, ${type})`
    return lines([comment, line])
  }

//------------------------------------------------------------------------------

const cast_ob = (context: BuildContext) => {
  // const relations_map = groupBy(context.foreign_keys, 'source_table')

  return (record: TableDefinition) => {
    const name = JuliaEntity.name(context, record)
    const comment = JuliaEntity.comment(context, record)

    const fields = record.columns.map(cast_attribute(context, record)).sort()

    return lines([comment, `${name}::Ob`, lines(fields)])
  }
}

//------------------------------------------------------------------------------

const cast_relation = (context: BuildContext) => (record: ForeignKeyDefinition) => {
  const ob = JuliaRelation.name(context, record)
  // const name = JuliaRelation.name(context, record)
  // const relation = JuliaRelation.relation(context, record)
  const comment = JuliaRelation.comment(context, record)
  const ob1 = record.source_table
  const ob2 = record.target_table

  return lines([
    comment,
    `${ob}::Ob`,
    // line,
    `${ob}_${ob1}::Hom(${ob}, ${ob2})`,
    `${ob}_${ob2}::Hom(${ob}, ${ob1})`,

    // primary, foreign
  ])
}

// const cast_ob_and_types = (context: BuildContext) => {
//   const relations_map = groupBy(context.foreign_keys, 'source_table')

//   return (record: TableDefinition) => {
//     const name = JuliaEntity.name(context, record)
//     const comment = JuliaEntity.comment(context, record)

//     const foreign_keys = get(relations_map, record.name, [])

//     const fields = record.columns.map(cast_attribute(context)).sort()
//     const relations = foreign_keys.map(cast_relation(context)).sort()

//     return lines([
//       comment,
//       `mutable struct ${name} {`,
//       pad_lines('iid:DbId', '  '),
//       pad_lines(lines(fields), '  '),
//       pad_lines(lines(relations), '  '),
//       '}',
//     ])
//   }
// }

// const cast_data_table = () => {
//   return `
//   employee::Ob
//   emp_data::Attr(employee, Int)

//   name::Ob
//   name_data::Attr(name, String)

//   salary::Ob
//   sal_data::Attr(salary, Real)
//   `
// }

// const cast_relation_table = () => {
//   return `
//   manager::Ob
//   emplm::Hom(manager, employee)
//   manag::Hom(manager, employee)

//   full_name::Ob
//   empln::Hom(full_name, employee)
//   namen::Hom(full_name, name)

//   income::Ob
//   empli::Hom(income, employee)
//   sali::Hom(income, salary)
//   `
// }

// const cast_presentation = (context: BuildContext) => (record: ForeignKeyDefinition) => {
//   const schema = 'AACTSchema'

//   const tables = tables.map(cast_data_table)
//   const relations = tables.map(cast_data_table)

//   return `
// using AlgebraicRelations.DB
// using SQLite

// @present ${schema} <: TheorySQL begin
//   # Data tables
//   ${tables}

//   # Relation tables
//   ${relations}
//   end;
//   `
// }

//------------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/require-await
export const render_algebraic_julia = async (context: BuildContext) => {
  const tables = context.tables
  const foreign_keys = context.foreign_keys.flat()

  const obs = flatMap(tables, cast_ob(context))
  const relations = flatMap(foreign_keys, cast_relation(context))

  const backend: BackendContext = {
    ...renderer_context,
    coreferences: build_type_qualified_coreferences(context, 'julia'),
  }

  return lines([
    header(context, backend),
    // pragma(context),
    imports(context),

    // coreference_banner(context, backend),
    banner(backend.comment, `Entities (${size(tables)})`),
    banner(backend.comment, `Relations (${size(foreign_keys)})`),

    '@present ${schema} <: TheorySQL begin',
    '  # Data tables',
    lines(
      obs.map(value => pad_lines(value, '  ')),
      '\n\n',
    ),
    '\n',
    '  # Relations',
    lines(
      relations.map(value => pad_lines(value, '  ')),
      '\n\n',
    ),
    'end;',
  ])
}
