---
title: 关于在 Vue 中 onClick 导致 ESLint 报错的问题
date: 2024-07-30 02:00:25
tags:
    - Vue
    - 踩坑
---

## TL;DR

创建一个 `vue.d.ts` 的文件，内容如下：

```typescript
import Vue from 'vue'

declare module 'vue' {
  export interface AllowedComponentProps extends HTMLAttributes {
    onClick?: ((payload: MouseEvent) => void) | undefined
  }

  export default Vue
}
```