# WorkBuddy 入口

2026-10-27，在 WorkBuddy（Windows 11 + Git Bash）上把本工作流完整跑通一次，从拉仓库到出片，中间卡了三十处。这个目录记录的就是那些卡点和解决方式，外加一份已完成片子的实测参数。

| 项目 | 位置 |
|---|---|
| Skill 入口 | [skills/workbuddy-1920s-news/SKILL.md](skills/workbuddy-1920s-news/SKILL.md) |
| 环境搭建 | [skills/workbuddy-1920s-news/references/setup-windows.md](skills/workbuddy-1920s-news/references/setup-windows.md) |
| 微信导出 | [skills/workbuddy-1920s-news/references/export-windows.md](skills/workbuddy-1920s-news/references/export-windows.md) |
| 踩坑记录 | [skills/workbuddy-1920s-news/references/pitfalls.md](skills/workbuddy-1920s-news/references/pitfalls.md) |
| 实测参照 | [skills/workbuddy-1920s-news/references/case-ep01.md](skills/workbuddy-1920s-news/references/case-ep01.md) |
| 验收清单 | [skills/workbuddy-1920s-news/references/acceptance.md](skills/workbuddy-1920s-news/references/acceptance.md) |

## 边界

- 本版**只补 Windows / WorkBuddy 环境的差异**，不重写编辑、制作、声音、验收规范。那部分仍以 Claude 版（根目录 `SKILL.md`）或 Codex 版（`skills/codex-1920s-news/`）为准，按用户选择的那一套执行。
- 三套互不覆盖。用户当前明确要求始终优先。
- 本次提交**没有修改** `AGENTS.md`、`CLAUDE.md`、根目录 `SKILL.md`、`skills/codex-1920s-news/`。新增内容全部在 `WORKBUDDY.md` 和 `skills/workbuddy-1920s-news/` 内。
- 踩坑记录里不含真实群名、成员昵称、原话、账号标识和绝对路径，只保留通用的问题与解法。这与 [PUBLIC_RELEASE.md](docs/PUBLIC_RELEASE.md) 的公开范围一致。

## 安装

把 `skills/workbuddy-1920s-news/` 整个复制到 WorkBuddy 的技能目录：

```sh
cp -r skills/workbuddy-1920s-news ~/.workbuddy-ai/skills/
```

重启会话后可用。也可以不安装，直接让 Agent 读这个目录里的文件。

## 这版补了什么

原版的两套工作流都是在 macOS / Linux 上写的，脚本里写死 POSIX 路径和 `.venv/bin/python`。在 Windows 上直接跑会在第一个 `sh build.sh` 就断掉。

本版记录了这些具体的差异：

- `.venv/bin/python` 垫片怎么写
- `wechat-cli` 为什么在 Windows 上挑错账号库，怎么判断
- `build.sh stills` 为什么在 Git Bash 里找不到 `timeline.json`
- 字体从哪下（GitHub 网页不通，`raw.*` 通）
- 音色采样库下不来时怎么绕过
- 沙箱对工作区外路径的限制
- 长命令怎么放后台

另外记了一批与平台无关、但在这次制作里真实踩到的画面问题：报纸推近切栏、片门标题溢出、表盘文字被指针穿过、投影段开头空画面。这些不是 WorkBuddy 特有的，写在这里只是因为这次是在 WorkBuddy 上遇到的。

[case-ep01.md](skills/workbuddy-1920s-news/references/case-ep01.md) 是另一种东西：不含问题，只有一条已完成片子的实测参数。12 段的时长分配、画布与安全区、6 处转场、6 个道具的构图坐标、人声与配乐的比例。照着填自己的内容，成品形态能对上。
