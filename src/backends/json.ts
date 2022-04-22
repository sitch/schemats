import type { BuildContext } from '../compiler'
import { pretty } from '../formatters'

export const build = ({
  config: { version, timestamp },
  ...context
}: BuildContext) => ({
  version,
  timestamp,
  ...context,
})

// eslint-disable-next-line @typescript-eslint/require-await
export const render_json = async (context: BuildContext) => {
  return pretty(build(context))
}
