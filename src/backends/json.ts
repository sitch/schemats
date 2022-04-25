import sortJson from 'sort-json'

import type { BuildContext } from '../compiler'
import { build_coreferences } from '../coreference'
import { pretty } from '../formatters'

export const build = (context: BuildContext) => {
  const {
    config: { version, timestamp },
    ...rest
  } = context

  return {
    version,
    timestamp,
    ...rest,
    coreferences: build_coreferences(context),
  }
}

// eslint-disable-next-line @typescript-eslint/require-await
export const render_json = async (context: BuildContext) => {
  return pretty(sortJson(build(context)))
}
