---
name: chat-newsreel-1920s
description: Turn one day (or one window) of a group chat export (微信群聊天记录 JSON/TXT) into a 1–2 minute 1920s black-and-white newsreel (群聊新闻联播 / 1920s 新闻片) made entirely in code on top of the Lemo-Opuscar library — story selection from the log, period announcer voice + bilingual subtitles, beat-synced cuts, paper props, film look, band score or a requested record, and a delivery note. Use when the user hands over a chat log and asks for a news broadcast / newsreel / 新闻片 / 播报 of it, a new episode of an existing series, or a revision of an episode.
---

# 群聊 1920s 新闻片（Chat Newsreel 1920s）

把一段群聊记录拍成 1–2 分钟的 1920 年代黑白新闻片：片头 ident → 6～9 条新闻（每条一个道具）→ 天气 → 结束 ident → 片尾字幕卡。
画面、配乐、音效全部由代码生成，在 **Lemo-Opuscar**（https://github.com/lemomo-ai/lemo-opuscar）的渲染/配音/音频工具上运行。
本 skill 保留原三期实践形成的方法；公开版省略原始群名、身份和案例原话，方法见 `references/`。

## 先读这些（按顺序，不要跳）
1. `references/pitfalls.md` —— **不能犯的错误**。每一条都是真实返工过的。
2. `references/editorial.md` —— 选题、写稿、玩梗尺度、事实核查、每期「不同质化」的正确含义。
3. `references/production.md` —— 工程结构、时间线/拍点、场景写法、渲染命令、耗时。
4. `references/audio.md` —— 乐队配乐 / 点播唱片两种配乐模式、配音、混音、响度。
5. `references/qc-checklist.md` —— 出片前逐项自查。
6. 需要时再看：`references/scene-library.md`（道具与转场清单）、`references/history.md`（三期的用户原话反馈）、`references/chat-export.md`（怎么导出微信记录）。
7. Lemo-Opuscar 本身：`$LIB/AGENTS.md`、`$LIB/DIRECTOR.md`、`$LIB/TECHNIQUE.md`、`$LIB/styles/newsreel/STYLE.md`。

## 红线（违反任何一条 = 返工）
1. **风格固定是 1920s 黑白新闻片。** 用户说「别同质化」指的是**内容和结构**不要重复，**不是换风格**（EP.02 曾被误做成现代电视新闻，整期重做）。
2. **群友原话一字不改**；纸条、引语框、电报条上的字必须能在记录里逐字找到（`tools/check_quotes.py` 必须 ALL FOUND）。
3. **数字靠数，不靠估**（`tools/count.py`）。人数、条数、时间、金额，屏幕上和配音里都要和记录一致。
4. **不碰**：黄段子/低俗梗、政治与地域敏感话题、对群友的指控（如「倒卖账号」）、私事隐私、已经报道过的旧故事。用户说过的禁区永远不碰。
5. **不硬凹梗**：不做谐音梗、不做通缉令/悬赏令式「烂梗」；致谢全片只说一次；回扣上一期最多一句。
6. **天气必须是真的**：中央气象台（nmc.cn）数据，屏幕上写发布时间；「明天」按**发布当天**算。
7. **画出来的不是真的**：代码画的示意画面标「示意」；AI 依形象图生成的姿势要在交付说明里说明。
8. **地图只画陆地和海岸线，不画国界**（Natural Earth 国界与我国标准地图不符）。
9. **配乐**：点播曲目要注明点播人和来源，版本不确定就问用户；音频文件不进仓库。片子在音乐自己的终止和弦上结束，片尾卡在其后。
10. **每一帧的字都看得清**：交付前出静帧联系表逐帧检查（字体回退、遮挡、出画、深色压深色、印章盖字），不看联系表不许渲染全片。

## 工作流程（每期）
```
0 环境   git clone lemo-opuscar → $LIB；sh setup.sh deps（+ music）；cp -r templates/project <ep-name>
1 读料   python3 tools/clean_chat.py chat.json --start … --end … → work/chat.txt + stats.md；通读全部记录，不只看热门
2 选题   列候选（≥12 条）→ 选 6～9 条 → 写 RUNDOWN.md（templates/docs/RUNDOWN.md）：幕次/时长/原话/道具/旁白/来源时间
         用户要求「先看分镜单」时在这里停下等确认；用户点名必报的内容一定要上
3 核实   count.py 数每个数字；check_quotes.py 核每句原话；查天气（nmc.cn）；不确定的事实问用户
4 写稿   voice/lines.json（每句 12～22 字，一行能放下；英文字幕 ≤ 64 字符）；parts/a_content.js（屏幕上所有字）
5 配音   python3 voice/make.py && tts（edge-tts 云健 +22% +6Hz）→ voice/out/dur.json
6 时间线 tools/timeline.py：分段、拍点、台词起点、地点卡 → 报告必须 OK（无重叠、无溢出、无超长字幕）
7 画面   parts/b_scenes.js 写本期场景（每条新闻一个道具；本期新结构，见 editorial §不同质化）
8 静帧   sh build.sh stills → 看 stills/_sheet.jpg → 按 qc-checklist 修 → 重出，直到干净
9 渲染   sh build.sh video；sh build.sh mix（MIX=band|record）；sh build.sh mux；sh build.sh small
10 自查  听全片：配音与画面对齐、切点卡拍、音乐结尾、响度 −14 LUFS；抽查成片帧
11 交付  1280 宽 mp4（10–20MB）+ 交付说明（templates/docs/DELIVERY.md）：选了什么、为什么、数据来源、需要用户确认的点
```
修改轮：一次只改用户点名的一两处，先只出那一幕的静帧确认，再出全片；其他幕、时间线、配音不动（见 `templates/docs/REVISION.md`）。

## 目录
```
SKILL.md / AGENTS.md / README.md
references/   pitfalls · editorial · production · audio · qc-checklist · scene-library · history · chat-export
templates/project/   可直接运行的一期工程（虚构示例内容，已实测出片）
templates/docs/      RUNDOWN（分镜单）· DELIVERY（交付说明）· REVISION（修改单）· PROMPT（一键提示词）
```
