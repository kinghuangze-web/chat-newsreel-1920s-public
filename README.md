# 1920s 群聊新闻片：Claude、Codex 与 WorkBuddy

三套独立工作流，分别维护。选择其中一套入口，不把另一套规则当作补充覆盖；用户当前明确要求始终优先。

| 版本 | 入口 | 规范与实现 |
|---|---|---|
| Claude：原工作流 | [根目录 SKILL.md](SKILL.md) | `references/`、`templates/`；保留原片头/栏目/唱片与片尾方法 |
| Codex：1.0.1 | [codex-1920s-news](skills/codex-1920s-news/SKILL.md) | 该子目录自己的规范、脚本和虚构输入；主题承接、事件素材、文字保护与独立验收 |
| WorkBuddy：Windows 补充 | [workbuddy-1920s-news](skills/workbuddy-1920s-news/SKILL.md) | 补 Git Bash 路径、虚拟环境垫片、沙箱、字体与音色库下载、微信库选错账号等平台差异，附 30 条实测踩坑与一份成品参数参照；另有[使用手册](docs/USAGE.md)。编辑与制作规范仍按用户选定的前两套执行 |

WorkBuddy 版没有修改前两版的任何内容，边界与安装方式见 [WORKBUDDY.md](WORKBUDDY.md)。

Claude 版的固定栏目、片尾和声音处方，与 Codex 版可能不同。这是两个版本的差异，不自动互相同步或统一。WorkBuddy 版不引入新的编辑或制作默认值，只补 Windows 环境下的可执行细节。

## 安装与调用

Claude Code：将本仓库作为 `chat-newsreel-1920s` Skill，入口为根目录 `SKILL.md`；可复制本目录到个人 Claude Skills 目录，或在工作环境中直接读取该入口。原方法也能供其他支持 Skill 的编程助手参考，不重新认定原代码作者。

Codex：只复制 `skills/codex-1920s-news/` 到当前 Codex 的 Skills 目录，让客户端发现后调用 `$codex-1920s-news`。不要用根目录 Claude 入口替代它。

WorkBuddy：只复制 `skills/workbuddy-1920s-news/` 到 `~/.workbuddy-ai/skills/`。它补充 Windows 与 Git Bash 环境差异，不替代前两套规范；按用户选定的 Claude 或 Codex 入口执行制作，遇到平台问题再查它。不熟悉这条流水线的人，先读 [docs/USAGE.md](docs/USAGE.md)，那份是给人看的。

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
