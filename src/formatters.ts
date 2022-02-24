import camelCase from "camelcase";
import inflection from "inflection";
import sortJson from "sort-json";
import { VisitOptions } from "sort-json";

const DEFAULT_SORT_JSON_OPTIONS = {
  depth: Infinity,
};

export const pretty = (
  data: any,
  options: VisitOptions = DEFAULT_SORT_JSON_OPTIONS
) => {
  const sorted = sortJson(data, options);
  return JSON.stringify(sorted, null, 2);
};

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

export const commentLines = (comment: string, body: string): string => {
  return body
    .split("\n")
    .map((line) => `${comment} ${line}`)
    .join("\n");
};

export const divider = (
  comment: string,
  token: string = "-",
  width: number = 80
) => {
  const count = Math.floor((width - comment.length) / token.length);
  return `\n${comment}${token.repeat(count)}\n`;
};

export const banner = (comment: string, label: string) =>
  `${divider(comment)} ${label}${divider(comment)}`;
