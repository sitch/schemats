import { pretty } from "../formatters";
import { BuildContext } from "../generator";

export const build = ({
  config: { timestamp, config },
  ...context
}: BuildContext) => ({
  timestamp,
  ...context,
});

export const jsonOfSchema = async (context: BuildContext) => {
  return pretty(build(context));
};
