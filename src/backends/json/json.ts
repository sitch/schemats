import { pretty } from "../../formatters";
import { BuildContext } from "../../schema-interfaces";

export const build = (context: BuildContext) => ({
  // schema: context.config.schema,
  // version: context.config.version,
  // generated_on: new Date(),

  // enums: context.enums,
  // tables: context.tables,
  // relationships: context.relationships,
  // coreferences: context.coreferences,
  ...context
});

export const jsonOfSchema = async (context: BuildContext) => {
  return pretty(build(context));
};
