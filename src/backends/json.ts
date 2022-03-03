import { BuildContext } from '../compiler'
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
export const jsonOfSchema = async (context: BuildContext) => {
  return pretty(build(context))
}
