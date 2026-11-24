import { cookies } from "next/headers";
import Link from "next/link";
import { CreatorCard } from "@/components/creator-card";
import { ApplicationForm, ProfileForm, SignedIn } from "@/components/dashboard";
import { directory, readDataset } from "@/lib/data";
import { repoUrl } from "@/lib/github-writer";
import { missingOAuth, readSession, SESSION_COOKIE } from "@/lib/x-oauth";

export const metadata = { title: "我的名片" };
const authMessages: Record<string, string> = {
  configuration: "现在可以先填写申请，预览一下你的资料。",
  failed: "这次没能登录。点下方按钮，再用 X 账号试一次。",
  scope: "还没能读取你的账号资料。你可以再试一次，也可以先填写下面的申请。",
};
export default async function Dashboard({ searchParams }: { searchParams: Promise<{ auth?: string; application?: string }> }) {
  const owner = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  const creators = readDataset().creators;
  const profile = owner ? creators.find(c => c.x_user_id === owner.id) : undefined;
  const examples = owner ? [] : directory(creators).items.slice(0, 4);
  const oauth = missingOAuth();
  const missing = [...oauth, ...(!process.env.GITHUB_TOKEN ? ["GITHUB_TOKEN"] : [])];
  const { auth, application } = await searchParams;
  const repo = repoUrl();
  return <div className={owner ? "reading" : "dashboard-guest"}><header className="page-intro dashboard-intro"><h1>我的名片</h1>
    {!owner && <p>已经在黄皮书里看到自己？来认领你的名片。还没收录？带上一件代表作，申请加入。</p>}</header>
    {auth && Object.hasOwn(authMessages, auth) && <p className="notice" role="status">{authMessages[auth]}</p>}
    {missing.length > 0 && <aside className="notice"><h3>可以先预览资料</h3><p>在线提交暂未开放。你可以先填写，也可以通过 GitHub 把资料交给编辑。</p>
      <a className="text-link" href={repo}>在 GitHub 上提交资料</a>
      <details><summary>站点配置说明</summary><p>待配置 <code>{missing.join("、")}</code>。</p></details></aside>}
    {owner ? <><SignedIn owner={owner} />{profile ? <ProfileForm c={profile} repo={repo} /> : <ApplicationForm key={owner.id} previewOnly={false} repo={repo}
      ownerId={owner.id} suggestions={owner.application} canWrite={Boolean(process.env.GITHUB_TOKEN)} attempt={application} authFailed={Boolean(auth)} />}</>
      : <><section className="login-box guest-login" aria-label="登录 XWho"><p>我们只读取你的 X 账号资料。申请加入时，可以用你的公开简介和置顶帖起草，改好再提交。</p>
        {oauth.length ? <button className="btn primary" disabled>X 登录暂未开放</button> : <a className="btn primary" href="/api/auth/x/login">用 X 账号登录</a>}</section>
        {(missing.length > 0 || auth === "scope") && <ApplicationForm previewOnly repo={repo} />}
        {examples.length > 0 && <section className="card-examples" aria-labelledby="examples-heading">
          <div className="section-head"><h2 id="examples-heading">看看大家的名片</h2><Link className="text-link" href="/">浏览全部创作者</Link></div>
          <div className="card-grid">{examples.map(c => <CreatorCard key={c.x_user_id} c={c} />)}</div>
        </section>}</>}
  </div>;
}
