---
name: workbuddy-1920s-news
description: 在 WorkBuddy 的 Windows 环境下运行 1920s 群聊新闻片工作流时使用。补充 Git Bash 路径、虚拟环境垫片、沙箱提权、字体与音色库下载失败、静帧检查工具链等平台差异，以及本轮实测的踩坑与解法。编辑、制作与声音规范仍以仓库 Claude 或 Codex 入口为准。
metadata:
  short-description: Windows 上跑通这条流水线要改的地方
  version: "0.1.0"
  host: WorkBuddy
  os: Windows 11
  verified: "2026-10-27"
---

# WorkBuddy 版：Windows 环境补充

这份 Skill 不重写工作流。它补的是「同一套方法在 Windows + WorkBuddy 上跑，会在哪里断」。

编辑规范、栏目设计、声音处方、验收标准，按用户选定的那一套走——Claude 版读根目录 `SKILL.md`，Codex 版读 `skills/codex-1920s-news/SKILL.md`。本文件只处理环境差异，不改动上述两版的任何默认值。

## 什么时候用

- 在 Windows 上第一次搭这套环境
- 导出的聊天记录是空的，或报 `file is not a database`
- `sh build.sh` 报了找不到 Python、找不到 timeline.json、字体下载失败
- 渲染或合成卡住、超时、内存吃满
- 需要判断「这个报错是环境问题还是内容问题」

## 执行顺序

1. 先读 [references/setup-windows.md](references/setup-windows.md)，把环境一次搭对。这一步没做完，后面所有报错都是噪音。
2. 用 [references/export-windows.md](references/export-windows.md) 把聊天记录导出来。`wechat-cli` 在 Windows 上会挑错账号库，这份文件给了判断方法和兜底解密。
3. 按用户选定的入口读编辑与制作规范。
4. 制作过程中遇到卡点，查 [references/pitfalls.md](references/pitfalls.md)。按「现象」检索，每条都有原因和解法。
5. 需要对齐成品效果时，读 [references/case-ep01.md](references/case-ep01.md)。那是一条已完成片子的全部实测参数：12 段时长分配、画布与安全区、6 处转场、6 个道具的构图骨架、人声与配乐比例。按它填自己的内容，形态就能对上。
6. 交付前过 [references/acceptance.md](references/acceptance.md)。

## 平台差异速览

Windows 上真正会断的只有五处，其余步骤和 POSIX 环境一样。

| 断点 | 现象 | 解法 |
|---|---|---|
| 虚拟环境路径 | `build.sh` 找 `$LIB/.venv/bin/python`，Windows 在 `.venv/Scripts/` | 建一个 `sh` 垫片转发 |
| MSYS 路径 | Git Bash 的 `/d/...` 传给 Windows 版 Python，读不到文件 | 用 `cygpath -w` 转 |
| 字体下载 | `curl` 报 `schannel: failed to receive handshake` | 直连 `raw.githubusercontent.com` |
| 采样音色库 | GitHub release 不可达，镜像也不通 | 用合成音源替代 |
| 沙箱 | 写工作区以外的文件被拦 | 显式提权，或先把数据复制进工作区 |

## 三条不能省的检查

这三条与平台无关，但 Windows 上更容易被跳过。

- **静帧要人眼看。** 联系表生成完，逐帧过一遍。本次制作中所有画面硬伤都是在这一步发现的，代码检查一个都没抓到。
- **读字时长要跑。** `core/render/readcheck.mjs` 会算出每块字需要停留多久。不合格就调时间线，别靠感觉。
- **数字要能回溯。** 屏幕上出现的每个数字，都要能在统计结果或原始记录里指出来。估出来的数字最容易被抓。

## 边界

- 本 Skill 不含微信导出器、AI 模型、素材、音轨。这些需要用户自备并授权。
- 不宣称 Lemo-Opuscar 的实现为本版原创，许可与署名按其 MIT 保留。
- 踩坑记录中的问题与解法均为通用描述，不含真实群名、成员昵称、原话、账号或绝对路径。
