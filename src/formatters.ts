import inflection from "inflection";
import camelCase from "camelcase";

export const inflect = (name: string, format: string | undefined): string => {
  if (!format) {
    return name;
  }
  if (["camel", "camelcase"].includes(format)) {
    return camelCase(name, { pascalCase: false });
  }
  if (["pascal"].includes(format)) {
    return camelCase(name, { pascalCase: true });
  }
  if (["snakecase", "underscore"].includes(format)) {
    return inflection.underscore(name);
  }
  if (["lower", "lowercase", "downcase"].includes(format)) {
    return name.toLowerCase();
  }
  throw `Unsupported formatter: ${format}`;
};

export const pretty = (data: any) => JSON.stringify(data, null, 2);
