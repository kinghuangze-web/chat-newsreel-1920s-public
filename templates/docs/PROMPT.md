# 一键提示词（给 Codex / 任何编程 agent）

```txt
你是这部片子的导演兼剪辑。用仓库 chat-newsreel-1920s 这个 skill，把我的微信群「【群名】」从【YYYY-MM-DD HH:MM】到【YYYY-MM-DD HH:MM】的聊天（文件：【chat.json】），拍成一期【60 秒 / 2 分钟以内】的 1920 年代黑白新闻片，这是第【N】期。

开始前按顺序读：SKILL.md、references/pitfalls.md、references/editorial.md、references/production.md、references/audio.md、references/qc-checklist.md、references/history.md（上几期的反馈）。Lemo-Opuscar 在【~/lemo-opuscar】，没有就 git clone https://github.com/lemomo-ai/lemo-opuscar。

【定制区 · 不填就按默认】
- 主持人：我（群昵称【示例主持人】，记录里显示为 me）；形象图：【文件 / 不用】
- 必须报道：
- 禁区（不出镜的人、不碰的话题）：
- 配乐：原创乐队（默认）/ 点播曲目【曲名 + 文件或链接】
- 天气：必须有【东南沿海台风、合肥】
- 模式：全自动 ｜ 先给我看分镜单再开拍

【硬规则】风格固定 1920s 新闻片，「不同质化」只改内容和结构；原话一字不改（check_quotes 必须 ALL FOUND）；数字用 count.py 数；不做谐音梗、通缉令；致谢一次；天气用 nmc.cn 当天最新发布；地图不画国界；渲染全片前必须看静帧联系表并按 qc-checklist 修完。

【交付】1280 宽 mp4 + 按 templates/docs/DELIVERY.md 写的说明（含需要我确认的点、已知瑕疵）；工程提交 git（不含聊天记录、音乐、字体、渲染产物）。
```
