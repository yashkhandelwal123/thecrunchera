import { useLocation } from "wouter";
import BlogContent from "@shared/BlogContent";
import { articleForPath } from "@shared/blog";
import NotFound from "./not-found";
export default function BlogPage() {
  const [location] = useLocation();
  const path = location.replace(/\/$/, "");
  const article = articleForPath(path);
  if (path !== "/blog" && !article) return <NotFound />;
  return <BlogContent article={article} />;
}
