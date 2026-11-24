import { cookies } from "next/headers";
import { ApplicationForm, ProfileForm, SignedIn } from "@/components/dashboard";
import { readDataset } from "@/lib/data";
import { repoUrl } from "@/lib/github-writer";
import { missingOAuth, readSession, SESSION_COOKIE } from "@/lib/x-oauth";

export const metadata = { title: "本人工作台" };
const authMessages: Record<string, string> = {
  configuration: "X 登录尚未配置，当前可预览申请。",
  failed: "X 登录未完成或校验已过期，请重新登录。",
  scope: "X 拒绝了仅含 users.read 的身份查询。本次未建立登录会话，可在下方预览申请。",
};
export default async function Dashboard({ searchParams }: { searchParams: Promise<{ auth?: string }> }) {
  const owner = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  const profile = owner ? readDataset().creators.find(c => c.x_user_id === owner.id) : undefined;
  const oauth = missingOAuth();
  const missing = [...oauth, ...(!process.env.GITHUB_TOKEN ? ["GITHUB_TOKEN"] : [])];
  const { auth } = await searchParams;
  const repo = repoUrl();
  return <div className="reading"><header className="page-intro"><h1>本人工作台</h1>
    <p>使用 X 登录，按账号的永久数字 ID 认领、维护或隐藏档案，也可以提交新的入库申请。</p></header>
    {auth && Object.hasOwn(authMessages, auth) && <p className="notice" role="status">{authMessages[auth]}</p>}
    {missing.length > 0 && <aside className="notice"><h3>当前可预览 JSON 补丁</h3><p>待配置或补全 <code>{missing.join("、")}</code>。</p>
      <a className="text-link" href={repo}>前往 GitHub 提 PR</a></aside>}
    {owner ? <><SignedIn owner={owner} />{profile ? <ProfileForm c={profile} repo={repo} /> : <ApplicationForm previewOnly={false} repo={repo} />}</>
      : <><section className="login-box"><h2>使用 X 核实本人身份</h2><p>本站只申请 <code>users.read</code> 只读权限。</p>
        {oauth.length ? <button className="btn primary" disabled>X 登录待配置</button> : <a className="btn primary" href="/api/auth/x/login">使用 X 登录</a>}</section>
        {(missing.length > 0 || auth === "scope") && <ApplicationForm previewOnly repo={repo} />}</>}
  </div>;
}
