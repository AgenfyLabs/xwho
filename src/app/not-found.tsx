import Link from "next/link";

export default function NotFound() {
  return <section className="page-intro"><h1>档案未找到</h1><p>当前没有可展示的公开档案。</p><Link className="btn" href="/">返回创作者名录</Link></section>;
}
