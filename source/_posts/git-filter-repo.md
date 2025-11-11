---
title: 如何进行 Git 仓库瘦身
date: 2025-11-11 21:15:59
tags:
  - git
---

## git-filter-repo

安装 `git-filter-repo` 

```sh
brew install git-filter-repo
```

克隆一个新的仓库，之后可以先查看 `.git` 文件夹的大小：

```sh
> du -sh .git
512M    .git
```

可以通过下面的命令来查看都有哪些 blobs

```sh
git filter-repo --analyze
```

发现大多数都是二进制文件

```sh
> head .git/filter-repo/analysis/path-all-sizes.txt 
=== All paths by reverse accumulated size ===
Format: unpacked size, packed size, date deleted, path name
   470130748  178598150 2025-11-10 platform
   243521416  113247661 2025-10-23 console
    46809010   21775586 2025-08-20 c_app
    54705026   20429606 2025-06-13 cmd/realtime/__debug_bin913888059
    42808594   15271725 2025-07-04 hack/custom-gcl
    54721890   10697777 2025-06-13 cmd/realtime/__debug_bin2869633227
    54718178   10581905 2025-06-13 cmd/realtime/__debug_bin2562572020
    54705026    7964676 2025-06-13 cmd/realtime/__debug_bin1245928177
```

那我们使用下面的命令来清理大于 10MB 的 blobs 文件

```sh
git filter-repo --strip-blobs-bigger-than 10M
```

清理完成之后，运行下面的命令来移除掉未引用的对象：

```sh
git gc --prune=now --aggressive
```

再次运行 `analyze` 命令查看

```sh
> git filter-repo --analyze
> head .git/filter-repo/analysis/path-all-sizes.txt
=== All paths by reverse accumulated size ===
Format: unpacked size, packed size, date deleted, path name
      632173     625888 <present>  misc/test.png
     6723898     181368 <present>  api/generated/platform/v1/character.pb.go
      186702     166919 <present>  misc/test.wav
    21519778     116651 <present>  ent/mutation.go
     3185297      81278 <present>  go.sum
     1850619      53671 <present>  api/generated/realtime/v1/realtime.pb.go
    14689422      38565 <present>  api/generated/v1.swagger.json
      744797      36489 <present>  api/generated/console/v1/task.pb.go
```

发现刚刚显示的二进制文件已经没有了

再次查看 `.git` 大小

```sh
> du -sh .git
6.6M    .git
```

这个时候推送到远端，应该使用 `--force-with-lease` 防止覆盖新的提交

```sh
git push --force-with-lease --all
```

最后要注意的是，所有的人应该拉取新的仓库，否则可能会把之前的记录再次推送上来导致清理无效。
