import sortJson from 'sort-json'

import type { BuildContext } from '../compiler'
import { build_type_qualified_coreferences } from '../coreference'
import { pretty } from '../formatters'

export const build = (context: BuildContext) => {
  return {
    context,
    coreferences: build_type_qualified_coreferences(context, context.config.backend),
  }
}

// eslint-disable-next-line @typescript-eslint/require-await
export const render_json = async (context: BuildContext) => {
  return pretty(sortJson(build(context)))
}
