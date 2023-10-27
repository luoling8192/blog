---
title: 黑苹果关闭SIP导致Steam闪退
date: 2023-10-21 02:10:19
tags:
    - macOS
    - SIP
    - Hackintosh
    - Steam
    - Postman
---

## 起因
在`OpenCore`中把 SIP 关了，本来想获得性能的提升，但是 Steam 和 Postman 打开以后闪退，调试信息显示显卡相关的问题。

Steam 会先启动更新器，更新完成后，登录窗口打不开，而 Postman 是直接闪退，而且没有崩溃提示。

## 解决
再把 SIP 打开就好了。
