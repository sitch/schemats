import { pretty } from "../formatters";
import { BuildContext } from "../generator";

export const build = ({
  config: { version, timestamp, config },
  ...context
}: BuildContext) => ({
  version,
  timestamp,
  ...context,
});

export const jsonOfSchema = async (context: BuildContext) => {
  return pretty(build(context));
};
