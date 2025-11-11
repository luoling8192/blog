---
title: Golang 重采样库 Benchmark
date: 2025-11-11 21:37:40
tags:
  - Go
  - Benchmark
---

# Intro

对比 `zaf/resample` 和 `zeozeozeo/gomplerate` 两个库的性能表现。

前者基于 CGO 和 `libsoxr` C 库，后者为纯 Go 实现。

# 测试结果

```Plain
> CGO_ENABLED=1 go test -tags soxr -bench=. -benchmem
goos: darwin
goarch: arm64
pkg: github.com/luoling8192/benchmark
cpu: Apple M4 Pro
BenchmarkResample_48k_to_16k_mono/purego/frames=240-12            592992              1911 ns/op        1004.65 MB/s        6768 B/op         18 allocs/op
BenchmarkResample_48k_to_16k_mono/purego/frames=480-12            294157              3782 ns/op        1015.24 MB/s       13552 B/op         20 allocs/op
BenchmarkResample_48k_to_16k_mono/purego/frames=960-12            152620              8024 ns/op         957.14 MB/s       36080 B/op         23 allocs/op
BenchmarkResample_48k_to_16k_mono/purego/frames=1920-12            72862             16160 ns/op         950.49 MB/s       80369 B/op         26 allocs/op
BenchmarkResample_48k_to_16k_mono/purego/frames=48000-12            2707            438796 ns/op         875.12 MB/s     2574854 B/op         46 allocs/op
BenchmarkResample_48k_to_16k_mono/soxr/frames=240-12               93116             12589 ns/op         152.51 MB/s        3352 B/op          5 allocs/op
BenchmarkResample_48k_to_16k_mono/soxr/frames=480-12               90708             12963 ns/op         296.22 MB/s        6680 B/op          5 allocs/op
BenchmarkResample_48k_to_16k_mono/soxr/frames=960-12               76482             13896 ns/op         552.69 MB/s       13592 B/op          5 allocs/op
BenchmarkResample_48k_to_16k_mono/soxr/frames=1920-12              56086             21418 ns/op         717.15 MB/s       27160 B/op          6 allocs/op
BenchmarkResample_48k_to_16k_mono/soxr/frames=48000-12              3708            295917 ns/op        1297.66 MB/s      650306 B/op          6 allocs/op
PASS
ok      github.com/luoling8192/benchmark        12.594s
```

# 分析

## 小批量数据（240-1920 frames）

- purego 完胜: 1.9-16 μs/op，吞吐量 950-1004 MB/s
    
- soxr 较慢: 12-21 μs/op，吞吐量 152-717 MB/s
    
- 原因: CGO 调用开销 + C 库初始化成本在小数据量时占主导
    

## 大批量数据（48000 frames，1秒音频）

- soxr 反超: 295 μs/op，1297 MB/s
    
- purego: 438 μs/op，875 MB/s
    
- 提升: ~48% 性能提升，这才是 C 库该有的表现
    

## 内存分配对比

```Plain
小批量 (240 frames):
  purego: 6768 B/op, 18 allocs/op
  soxr:   3352 B/op,  5 allocs/op  ← 更少分配

大批量 (48000 frames):
  purego: 2.57 MB/op, 46 allocs/op
  soxr:   0.65 MB/op,  6 allocs/op  ← 内存效率高 4 倍
```

# 结论

对于语音通话场景，可以选择纯 Go 实现，关闭 CGO 之后工程更易维护且性能不会太差。

可以使用 Tag 来控制切换使用 CGO 版本还是 Pure Go 版本。
