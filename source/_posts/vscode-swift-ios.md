---
title: 告别 Xcode：用 VSCode 配置一个舒适的 iOS 开发环境
date: 2026-03-06 16:00:00
tags:
  - iOS
  - VSCode
  - Swift
---

## 起因

最近开始接触 iOS 开发，但是 XCode 是众所周知的难用。作为一个习惯了 VSCode 生态的开发者，我决定试试能不能在 VSCode 里写 iOS 项目。

然后第一步就困住了：怎么配环境呢？

VSCode 装上 Swift 官方插件后，发现 LSP 居然不工作，只有 VSCode 自带的高亮。一查才发现：**官方 Swift 插件只支持 SPM 项目（即有 `Package.swift` 的项目）**，而我手上的项目是 `.xcodeproj` + CocoaPods 的传统结构，这就导致 LSP 无法获取编译参数，自然也就没有智能功能了。

折腾了一圈，终于配出了一个能用的环境，记录一下过程，希望能帮到同样想逃离 Xcode 的人。

<!--more-->

## 为什么官方插件不工作？

VSCode 的 Swift 语言智能（补全、跳转、诊断等）底层是 [SourceKit-LSP](https://github.com/swiftlang/sourcekit-lsp)。这个 LSP 需要知道每个源文件的编译参数（头文件搜索路径、宏定义、SDK 路径等），才能正确分析代码。

SourceKit-LSP 能理解的项目格式只有两种：

1. **Swift Package Manager** — 有 `Package.swift`，LSP 原生支持
2. **Build Server Protocol** — 通过 `buildServer.json` 告诉 LSP 去哪拿编译参数

而 `.xcodeproj` / `.xcworkspace`？不在支持列表里。所以我们需要一个能把 Xcode 项目的编译信息翻译成 SourceKit-LSP 能理解的格式的工具。

## 配置过程

### 第一步：安装两个插件

在 VSCode 里装这两个插件：

- **[Swift](https://marketplace.visualstudio.com/items?itemName=swiftlang.swift-vscode)** (`swiftlang.swift-vscode`)
  官方 Swift 语言支持，提供 SourceKit-LSP，负责代码补全、跳转定义、实时诊断等语言智能功能。

- **[SweetPad](https://marketplace.visualstudio.com/items?itemName=sweetpad.sweetpad)** (`sweetpad.sweetpad`)
  Xcode 项目集成工具，负责构建、运行、调试，以及最关键的：生成 `buildServer.json` 让 SourceKit-LSP 能理解你的 Xcode 项目。

### 第二步：安装 xcode-build-server

SweetPad 底层依赖 [xcode-build-server](https://github.com/SolaWing/xcode-build-server) 来实现 Build Server Protocol。用 Homebrew 安装：

```bash
brew install xcode-build-server
```

### 第三步：生成 Build Server 配置

用 VSCode 打开你的项目根目录，然后打开命令面板（`Cmd+Shift+P`），执行：

```
SweetPad: Generate Build Server Config (buildServer.json)
```

这会在项目根目录生成一个 `buildServer.json`。

不过你也可以直接在命令行里面运行下面的命令得到该文件：

```bash
xcode-build-server config -workspace YourProject.xcworkspace -scheme YourScheme
```

### 第四步：构建一次项目

**这步很关键**，不构建的话 LSP 没有索引数据，补全还是不能用。

在 SweetPad 侧边栏选择你的 scheme 和目标设备（模拟器就行），然后点击 Build （或者用 XCode 编译）。也可以用命令面板：

```
SweetPad: Build
```

等构建完成后，重新加载一下 VSCode 窗口（`Cmd+Shift+P` → `Developer: Reload Window`），稍等几秒，你会发现：

- 代码补全 ✅
- 跳转定义 ✅
- 查找引用 ✅
- 实时错误诊断 ✅

### 第五步：运行和调试

SweetPad 也能直接在 VSCode 里运行和调试 App：

- **运行**：命令面板执行 `SweetPad: Launch`，选择模拟器或真机
- **调试**：通过 VSCode 的 Debug 面板启动，SweetPad 会自动生成 launch configuration

## 最终效果

配置完成后，VSCode 里的 iOS 开发体验：

- **代码智能**：补全、跳转、引用查找、重命名，和 Xcode 里基本一致
- **构建运行**：不用切换到 Xcode，直接在 VSCode 里构建、跑模拟器
- **还得回 Xcode 的场景**：Storyboard/XIB 可视化编辑、Instruments 性能分析、证书签名管理

总的来说，日常编码完全可以在 VSCode 里完成，需要 Xcode 特有功能时再切回去。对于像我这样刚入坑 iOS 开发的人来说，这套组合让上手门槛低了不少。

## 参考链接

- [SweetPad 官方文档](https://sweetpad.hyzyla.dev/docs/intro/)
- [SweetPad GitHub](https://github.com/sweetpad-dev/sweetpad)
- [Swift 官方 VSCode 插件](https://www.swift.org/blog/vscode-extension/)
- [xcode-build-server](https://github.com/SolaWing/xcode-build-server)
- [SourceKit-LSP](https://github.com/swiftlang/sourcekit-lsp)
