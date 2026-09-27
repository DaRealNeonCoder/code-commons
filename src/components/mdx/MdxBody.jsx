import { MDXRemote } from "next-mdx-remote/rsc";
import { mdxComponents, mdxOptions } from "@/lib/mdx-components";

export default function MdxBody({ source, className }) {
  if (!source) return null;
  return (
    <div className={className}>
      <MDXRemote source={source} components={mdxComponents} options={{ mdxOptions }} />
    </div>
  );
}