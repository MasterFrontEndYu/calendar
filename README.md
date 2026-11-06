# Vite+ Monorepo Starter

A starter for creating a Vite+ monorepo.

## Development

- Check everything is ready:

```bash
vp run ready
```

- Run the tests:

```bash
vp run -r test
```

- Build the monorepo:

```bash
vp run -r build
```

- Run the development server:

```bash
vp run dev
```

## Release

三个包都会发布到 npm：

- `@sanguogege/calendar`
- `@sanguogege/calendar-ui`
- `@sanguogege/calendar-ui-lunar`

发布流程：

```bash
# 1. 创建 changeset
bun changeset

# 2. 手动更新版本号和 changelog
bun changeset version

# 3. 更新 lockfile
bun install

# 4. 提交并 push
git add .
git commit -m "release: version packages"
git push origin master
```

push 后 GitHub Actions 的 `Release` workflow 会：

1. `vp run -r build` + `vp check` + `vp run -r test`；
2. 依次检查三个包的本地版本是否已存在于 npm，只发布还不存在的版本；
3. 每确认一个版本已发布，就立刻打 tag（`@sanguogege/xxx@1.2.3`）并创建同名 GitHub Release；
4. Release 正文取该包 `CHANGELOG.md` 对应版本的段落；已存在的 Release 不会被改写。

触发条件是三个 `package.json` 之一发生变化，普通代码 push 不会发布；也可以手动 Run workflow。

### 依赖版本（workspace:）

包之间继续用 `workspace:*` 开发，仓库里不写死版本号。`npm publish` 不会替换 `workspace:` 协议，直接把这种 manifest 发出去，用户安装时会解析失败，所以 workflow 在 publish 期间把 `workspace:*` 临时改写成真实版本再打包，发完立即还原：

```text
@sanguogege/calendar-ui-lunar
  @sanguogege/calendar      workspace:* → 2.0.0
  @sanguogege/calendar-ui   workspace:* → 0.0.1
```

### 认证

发布走 npm 的 Trusted Publishing（OIDC），不需要 `NPM_TOKEN`，也不需要 `.npmrc`：

- workflow 已声明 `id-token: write`，并移除了所有 token 相关配置；
- 发布前执行 `npm install -g npm@^11.5.1`，Trusted Publishing 要求这个版本以上；
- npm 侧需要为三个包分别配置 Trusted Publisher：仓库 `sanguogege/calendar`、workflow 文件名 `Release.yml`（文件名要完全一致）。

注意：新包第一次发布时还没有包设置页，必须先手动发一个版本（或用 token 发一次），之后才能配置 Trusted Publisher 走 OIDC。

`GH_TOKEN` 用 Actions 自带的 `GITHUB_TOKEN`，已配在 workflow 的 job env 里，不需要额外 secret。
