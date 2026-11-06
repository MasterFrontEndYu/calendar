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

1. `vp run ready`：格式、测试、构建；
2. 依次检查三个包的本地版本是否已存在于 npm；
3. 只发布尚未发布的版本；
4. 为发布成功的包创建 git tag 和 GitHub Release。

触发条件是三个 `package.json` 之一发生变化，所以普通代码 push 不会发布；也可以手动 Run workflow。

需要在仓库的 `Settings → Secrets and variables → Actions` 配置：

```text
NPM_TOKEN
```

该 token 需要能发布 `@sanguogege` 作用域下的三个包。
