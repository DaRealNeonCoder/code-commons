import matter from "gray-matter";
import yaml from "js-yaml";

const options = {
  engines: {
    yaml: {
      parse: (s) => yaml.load(s),
      stringify: (o) => yaml.dump(o),
    },
  },
};

export function parseFrontmatter(source) {
  return matter(source, options);
}

export function stringifyFrontmatter(content, data) {
  return matter.stringify(content, data, options);
}
