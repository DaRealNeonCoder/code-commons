import matter from "gray-matter";
import yaml from "js-yaml";

const options = {
  engines: {
    yaml: {
      parse: (s: string) => yaml.load(s) as object,
      stringify: (o: object) => yaml.dump(o),
    },
  },
};

export function parseFrontmatter(source: string) {
  return matter(source, options);
}

export function stringifyFrontmatter(content: string, data: object) {
  return matter.stringify(content, data, options);
}