---
title: 使用 SSH Host 别名 + Git URL 重写实现 GitHub 多账号管理
date: 2026-03-17 17:00:00
tags:
  - git
  - SSH
  - GitHub
---

当你需要用不同的 GitHub 账号访问不同组织的仓库时（比如个人号 + 公司小号），最干净的方案是 **SSH Host 别名 + Git `insteadOf` URL 重写**。配置完成后日常使用完全无感，不需要每个仓库手动改 remote。

<!--more-->

## 问题场景

- 你有多个 GitHub 账号（个人号、公司小号等）
- 不同组织的仓库需要用不同的 SSH Key 认证
- 你希望 `git clone` / `git push` 时不用手动切换身份

## 方案概览

```
┌─────────────────────────────────┐
│  git clone / push / pull        │
│  (HTTPS or SSH URL)             │
└──────────────┬──────────────────┘
               │ git insteadOf 重写
               ▼
┌─────────────────────────────────┐
│  git@<host-alias>:org/repo.git  │
└──────────────┬──────────────────┘
               │ SSH config 匹配 Host
               ▼
┌─────────────────────────────────┐
│  使用指定的 IdentityFile 连接   │
│  github.com (或 ssh.github.com) │
└─────────────────────────────────┘
```

## 第一步：生成或准备 SSH Key

如果你使用 1Password 管理 SSH Key，在 1Password 中创建一把新的 SSH Key，然后导出公钥：

```bash
# 1Password 会自动管理私钥，你只需要导出公钥
# 将公钥保存到 ~/.ssh/your-alias.pub
```

如果不用 1Password，直接生成一对新 key：

```bash
ssh-keygen -t ed25519 -C "your-alt@email.com" -f ~/.ssh/your-alias
```

然后把公钥添加到对应 GitHub 账号的 [SSH Keys 设置](https://github.com/settings/keys) 中。

## 第二步：配置 SSH Host 别名

编辑 `~/.ssh/config`，为小号创建一个 Host 别名：

```ssh-config
# 小号 - 用于访问特定组织
Host gh-alt
  HostName ssh.github.com
  User git
  Port 443
  IdentityFile ~/.ssh/your-alias.pub   # 如果用 1Password，指向公钥即可
  IdentitiesOnly yes
```

几个关键点：

- **`HostName ssh.github.com` + `Port 443`**：走 HTTPS 端口连接 GitHub SSH，可以绕过某些网络环境对 22 端口的限制。如果你的网络没有这个问题，也可以直接用 `HostName github.com`（不需要指定 Port）。
- **`IdentitiesOnly yes`**：**必须加**。SSH agent（尤其是 1Password）里可能存了多把 key，不加这个配置 SSH 会把所有 key 都试一遍，可能用错身份。加上后只会使用 `IdentityFile` 指定的那把 key。
- **`IdentityFile` 指向 `.pub`**：这是 1Password SSH Agent 的用法。agent 会用公钥来匹配对应的私钥进行签名。如果你不用 1Password，这里应该指向私钥文件（不带 `.pub`）。

如果你使用 1Password SSH Agent，还需要确保全局配置了 agent：

```ssh-config
Host *
  IdentityAgent "~/Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock"
```

## 第三步：Git URL 重写

编辑 `~/.gitconfig`，添加 `insteadOf` 规则：

```gitconfig
[url "git@gh-alt:target-org/"]
    insteadof = https://github.com/target-org/
    insteadof = git@github.com:target-org/
```

这条配置会把所有指向 `target-org` 组织的 Git URL（不管是 HTTPS 还是 SSH）都重写为使用 `gh-alt` 这个 SSH Host 别名。

**两条 `insteadof` 缺一不可**：
- 第一条覆盖 HTTPS URL（浏览器复制的 clone 地址通常是这种）
- 第二条覆盖 SSH URL（`git@github.com:...` 格式）

如果你只配了其中一条，用另一种格式 clone 时就不会走小号的 key。

## 第四步：验证

```bash
# 验证 SSH 连接身份
ssh -T gh-alt
# 应输出: Hi your-alt-username! You've successfully authenticated...

# 验证 URL 重写（HTTPS）
git ls-remote --get-url https://github.com/target-org/some-repo.git
# 应输出: git@gh-alt:target-org/some-repo.git

# 验证 URL 重写（SSH）
git ls-remote --get-url git@github.com:target-org/some-repo.git
# 应输出: git@gh-alt:target-org/some-repo.git
```

三条都通过，配置就完成了。之后正常 `git clone`、`git push` 即可，身份切换完全透明。

## 完整配置参考

### ~/.ssh/config

```ssh-config
# 默认 GitHub 账号（个人号）
Host github.com
  HostName ssh.github.com
  User git
  Port 443

# 小号 - 用于特定组织
Host gh-alt
  HostName ssh.github.com
  User git
  Port 443
  IdentityFile ~/.ssh/your-alias.pub
  IdentitiesOnly yes

# 全局 - 1Password SSH Agent
Host *
  IdentityAgent "~/Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock"
```

### ~/.gitconfig（相关部分）

```gitconfig
[url "git@gh-alt:target-org/"]
    insteadof = https://github.com/target-org/
    insteadof = git@github.com:target-org/
```

## Go 私有模块配置

如果你用 Go 开发，`go get` / `go mod tidy` 拉私有仓库还需要额外一步配置。

### 问题

Go 默认通过 `proxy.golang.org` 代理拉取模块，通过 `sum.golang.org` 校验 checksum。私有仓库在这两个服务上都不存在，直接 `go get` 会报错：

```
go: module github.com/target-org/private-repo: reading https://proxy.golang.org/...: 410 Gone
```

### 解决

设置 `GOPRIVATE` 环境变量：

```bash
go env -w GOPRIVATE=github.com/target-org
```

这一条就够了。`GOPRIVATE` 设置后，`GONOPROXY` 和 `GONOSUMDB` 会自动继承相同的值，效果等同于同时设了三个变量。

如果有多个私有组织，用逗号分隔：

```bash
go env -w GOPRIVATE=github.com/org-a,github.com/org-b
```

### 原理

设了 `GOPRIVATE` 之后，`go get` 对匹配的模块路径会：

1. **跳过 module proxy**，直接通过 Git clone 拉取源码
2. **跳过 checksum 校验**，不查 `sum.golang.org`
3. Git clone 时触发 `~/.gitconfig` 里的 `insteadOf` 规则，自动走对应的 SSH Host 别名

整条链路：

```
go get github.com/target-org/private-repo
  → GOPRIVATE 匹配，跳过 proxy，直接 git clone
  → git clone https://github.com/target-org/private-repo
  → insteadOf 重写为 git@gh-alt:target-org/private-repo
  → SSH config 匹配 gh-alt，使用小号的 key
  → 认证成功，拉取完成
```

### 验证

```bash
# 确认 GOPRIVATE 生效
go env GOPRIVATE
# 应输出: github.com/target-org

# 测试拉取私有模块
go get github.com/target-org/private-repo@latest
```

## 常见问题

### Q: `git push` 时报权限错误？

先确认 SSH 身份是否正确：

```bash
ssh -T gh-alt
```

如果返回的不是预期的用户名，检查 `IdentityFile` 路径和 1Password 中是否已添加对应的 key。

### Q: 多个组织需要不同账号怎么办？

每个组织重复第二步和第三步，创建不同的 Host 别名和 `insteadOf` 规则即可：

```ssh-config
Host gh-org-a
  HostName ssh.github.com
  User git
  Port 443
  IdentityFile ~/.ssh/key-a.pub
  IdentitiesOnly yes

Host gh-org-b
  HostName ssh.github.com
  User git
  Port 443
  IdentityFile ~/.ssh/key-b.pub
  IdentitiesOnly yes
```

```gitconfig
[url "git@gh-org-a:org-a/"]
    insteadof = https://github.com/org-a/
    insteadof = git@github.com:org-a/

[url "git@gh-org-b:org-b/"]
    insteadof = https://github.com/org-b/
    insteadof = git@github.com:org-b/
```

### Q: 为什么用 `ssh.github.com:443` 而不是 `github.com:22`？

部分企业网络或地区网络会封锁 22 端口。GitHub 在 `ssh.github.com` 的 443 端口提供了完全相同的 SSH 服务，走 HTTPS 端口更通用。
