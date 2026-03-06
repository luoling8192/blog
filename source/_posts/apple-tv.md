---
title: Apple TV + HomePod 串流卡顿？AWDL 信道跳变在作怪
date: 2025-01-26 23:24:12
tags:
  - AppleTV
  - Moonlight
  - AWDL
---

## 问题描述

Apple TV 连接 HomePod Mini 作为默认音频输出后，使用 Moonlight 进行游戏串流时出现严重丢包，表现为画面周期性卡顿（micro-stuttering）、延迟飙升，体验极差。

断开 HomePod 连接后问题立即消失。

## 根因分析：AWDL 信道跳变

罪魁祸首是 **AWDL（Apple Wireless Direct Link）**——Apple 的私有无线点对点协议，用于支持 AirDrop、AirPlay、Sidecar 等设备间直连功能。

### AWDL 是什么

AWDL 是 Apple 从 iOS 7 / macOS Yosemite 开始引入的无线直连技术，允许 Apple 设备不经过路由器，直接通过 Wi-Fi 射频进行点对点通信。它后来被 Wi-Fi 联盟采纳，成为 NAN（Neighbor Awareness Networking）标准的基础。

每个 AWDL 节点会广播一系列 **Availability Windows（AW）**，表示自己可以与其他 AWDL 节点通信的时间窗口。节点间通过选举产生一个 master 节点来同步这些时间窗口。

### 为什么会导致丢包

AWDL **只使用三个固定信道**：

| 频段 | 信道 | 备注 |
|------|------|------|
| 2.4 GHz | Ch 6 | — |
| 5 GHz | Ch 44 | 欧洲/亚太优先 |
| 5 GHz | Ch 149 | 美国优先 |

当 Apple TV 通过 AirPlay 连接 HomePod Mini 时，AWDL 被激活以维持这条点对点音频链路。**关键问题在于：如果你的 Wi-Fi 网络不在 AWDL 使用的信道上，Wi-Fi 射频模块就必须在两个信道之间反复跳变**——先切到 AWDL 信道处理 AirPlay 数据，再切回基础设施信道处理正常网络流量。

这种信道跳变会造成：

- **周期性延迟尖峰**：Bonjour 发现过程每秒产生约 50-100ms 的延迟尖峰
- **丢包**：射频模块在 AWDL 信道上工作时，正常 Wi-Fi 信道上的数据包无法被接收
- **节律性卡顿**：因为跳变是周期性的，表现为非常有规律的 stuttering

正常情况下 ping 延迟在 2-10ms，AWDL 活跃时可飙升至 **200ms**。对于 Moonlight 这种对延迟极度敏感的游戏串流应用，这是灾难性的。

### 为什么断开 HomePod 就好了

断开 HomePod 音频连接后，Apple TV 不再需要维持 AirPlay 点对点链路，AWDL 回到低功耗的被动监听状态，信道跳变频率大幅降低，丢包问题随之消失。

但注意：**即使没有连接 HomePod，AWDL 也不会完全安静**。只要隔空投送开启且附近存在 Apple 设备，AWDL 会周期性进行 Bonjour 发现扫描，每次扫描都会短暂锁定 Wi-Fi 射频并切换信道。虽然频率远低于活跃 AirPlay 连接，但对延迟敏感的串流应用仍然可能感知到偶发的延迟尖峰。关闭隔空投送可以抑制这部分扫描。

## 解决方法

### 方法一：断开 HomePod 连接（最简单）

在 Apple TV 设置中将音频输出切回 Apple TV 内置扬声器或改用有线/蓝牙音频设备，避免 AirPlay 音频链路触发 AWDL 高频信道跳变。

### 方法二：将 Wi-Fi 信道调整为 AWDL 信道（推荐）

在路由器设置中，将 5 GHz Wi-Fi 信道手动设置为 **Ch 44**（亚太/欧洲）或 **Ch 149**（美国）。当 Wi-Fi 基础设施信道与 AWDL 信道一致时，射频模块无需跳变，延迟尖峰消失。

### 方法三：关闭隔空投送

关闭隔空投送（AirDrop）可以阻止 AWDL 的周期性 Bonjour 发现扫描，减少无 AirPlay 连接时的偶发延迟尖峰。在 Apple TV 上进入「设置 > 隔空投送与接力」关闭即可。

### 方法四：使用有线连接（最终方案）

Apple TV 使用以太网连接是最稳定的方案。有线连接完全绕过 Wi-Fi 射频争用问题，串流数据走有线网络，AWDL 的周期性扫描和 AirPlay 音频链路只影响无线射频，两者互不干扰。HomePod 音频也能正常使用。

实测这是唯一能彻底解决问题的方案——即使调整了信道，Bonjour 周期性扫描仍可能带来偶发抖动，有线连接则完全不受影响。

## 参考资料

- [Fixes for Low-Latency Desktop Streaming stuttering on macOS](https://gist.github.com/kouwei32/c101be682fc2e433e153ea131798caec)
- [AppleTV, AirPlay and AWDL protocol with Wi-Fi](https://community.fortinet.com/t5/Blogs/AppleTV-AirPlay-and-AWDL-protocol-with-Wi-Fi-hard-to-diagnose/ba-p/238440)
- [The impact of AWDL on Mac Wi-Fi performances](https://gabriel-toubeau.medium.com/the-impact-of-awdl-on-mac-wi-fi-performances-d783ca019553)
- [Open Wireless Link - AWDL Wiki](https://owlink.org/wiki/)
- [AWDL Symphonizer - Fix macOS Wi-Fi stuttering](https://github.com/tbraun96/awdl-symphonizer)
