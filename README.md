# 1920s 群聊新闻片：Claude、Codex 与 WorkBuddy

三套独立工作流，分别维护。选择其中一套入口，不把另一套规则当作补充覆盖；用户当前明确要求始终优先。

| 版本 | 入口 | 规范与实现 |
|---|---|---|
| Claude：原工作流 | [根目录 SKILL.md](SKILL.md) | `references/`、`templates/`；保留原片头/栏目/唱片与片尾方法 |
| Codex：1.0.1 | [codex-1920s-news](skills/codex-1920s-news/SKILL.md) | 该子目录自己的规范、脚本和虚构输入；主题承接、事件素材、文字保护与独立验收 |
| WorkBuddy：Windows 实测 | [workbuddy-1920s-news](skills/workbuddy-1920s-news/SKILL.md) | 一份可独立执行的作业规范：执行序列、必问用户的六个节点、硬参数、31 条踩坑、验收判定；另含 Git Bash 与微信选库的平台差异 |

WorkBuddy 版没有修改前两版的任何内容。它把这条流水线在 Windows 上完整跑通过一次，把过程中的判断、卡点和参数固定下来，使接手者不必重走。

**第一次用、或者不想碰技术细节的话，先读 [docs/TUTORIAL.md](docs/TUTORIAL.md)。** 那份是给人看的：每一步该跟 AI 说什么（可直接复制）、哪一步必须你自己拍板、怎么验收 AI 交出来的东西。上面那个 Skill 是给 Agent 查的命令与参数，两者内容一致，读者不同。

Claude 版的固定栏目、片尾和声音处方，与 Codex 版可能不同。这是两个版本的差异，不自动互相同步或统一。WorkBuddy 版按 Claude 版的编辑口径制作，环境与操作细节以自己那份为准。

## 安装与调用

Claude Code：将本仓库作为 `chat-newsreel-1920s` Skill，入口为根目录 `SKILL.md`；可复制本目录到个人 Claude Skills 目录，或在工作环境中直接读取该入口。原方法也能供其他支持 Skill 的编程助手参考，不重新认定原代码作者。

Codex：只复制 `skills/codex-1920s-news/` 到当前 Codex 的 Skills 目录，让客户端发现后调用 `$codex-1920s-news`。不要用根目录 Claude 入口替代它。

WorkBuddy：只复制 `skills/workbuddy-1920s-news/` 到 `~/.workbuddy-ai/skills/`。它自带执行序列、必问用户的节点、硬参数与验收判定，可以独立跑完一期；规范细则与根目录 `references/` 一致，遇到冲突以用户当前要求为准。

三版均依赖 [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar) 的渲染与相关运行时，以及用户授权的输入、字体和媒体。Codex 子包不自带微信导出器、AI模型、IP、音乐或独立一键渲染器；运行契约见其 `references/runtime.md`。

## 虚构模板与检查

Claude 的虚构工程位于 `templates/project/`，具体运行方式见 `references/production.md`。模板的栏目只是该版本的原始设计；实际制作仍以用户要求为准。

```sh
python -m unittest discover -s tests -v
```

这里的回归检查针对 Codex 辅助工具。既有检查范围见 [VALIDATION.md](docs/VALIDATION.md)，不能当作两版都已用新素材出片或完成完整听审。

## 来源与公开范围

Claude 版恢复原始工作流，Codex 的后续经验只在自己的 Skill 内维护。二者借用的 Lemo-Opuscar 实现按 MIT 保留归属；本仓库 MIT 许可证及依赖许可继续适用。

公开发行只包含方法、通用代码与虚构模板，不分发真实聊天、成员身份、原话案例、个人形象、音轨或成片。版权许可中的必要署名予以保留。公开仓库从干净快照建立，不携带原私有仓库的旧提交。
