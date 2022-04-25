import { mapValues, size } from 'lodash'
import sortJson from 'sort-json'

import { version } from '../../package.json'
import type { BuildContext } from '../compiler'
import type { Backend } from '../config'
import type {
  CoreferenceMap,
  CoreferenceType,
  TypeQualifiedCoreferences,
} from '../coreference'
import { pad_lines, pretty } from '../formatters'

export type CommentDelimiter = string
export type IndentDelimiter = string

export interface BackendContext {
  backend: Backend
  comment: CommentDelimiter
  indent: IndentDelimiter
  character_line_limit: number
  coreferences: TypeQualifiedCoreferences
}

interface ConfigLike {
  version?: string
  timestamp?: string
  command_from_cli?: string
}

const render_header_body = (config: ConfigLike = {}) =>
  `###############################################################################

  AUTO-GENERATED FILE ${config.timestamp ? `@ ${config.timestamp} ` : ' '}- DO NOT EDIT!

  This file was automatically generated by schemats v.${config.version || version}
  ${config.command_from_cli ? `$ ${config.command_from_cli}\n` : ''}
###############################################################################`

export const render_autogenerated_banner = (comment: string, config?: ConfigLike) =>
  pad_lines(render_header_body(config), comment)

export const header = ({ config }: BuildContext, { comment }: BackendContext) => {
  if (!config.writeHeader) {
    return ''
  }
  return render_autogenerated_banner(comment, config)
}

function coreference_type_display({
  table_name,
  dest_type,
  source_type,
}: CoreferenceType) {
  return [dest_type, source_type, table_name].filter(Boolean).join('::')
}

function display(coreference: CoreferenceMap) {
  const content = mapValues(coreference, entries =>
    entries.map(entry => coreference_type_display(entry)),
  )
  return pretty(sortJson(content))
}

export const coreference_banner = (
  _context: BuildContext,
  { comment, indent, coreferences: { all, error, warning } }: BackendContext,
) => {
  if (size(all) === 0) {
    return ''
  }
  return pad_lines(
    `###############################################################################
  ⛔ ERROR ⛔ - (${size(error)}) - Attribute Conflicts
###############################################################################
${pad_lines(display(error), indent)}
===============================================================================
  ⚠️ WARNING ⚠️ - (${size(warning)}) - UDT Conflicts
===============================================================================
${pad_lines(display(warning), indent)}
-------------------------------------------------------------------------------
  ❎ ALL ❎ - (${size(all)}) - Attribute Overlaps
-------------------------------------------------------------------------------
${pad_lines(display(all), indent)}
###############################################################################`,
    comment,
  )
}
