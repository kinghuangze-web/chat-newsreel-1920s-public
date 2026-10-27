// ======================================================================================
//  CONTENT — every on-screen word of the episode lives here (the scenes only lay it out).
//  The demo below is FICTIONAL (示例群 / 阿甲 / 小乙 ...). Replace all of it for a real episode.
//  Rules: quotes are copied verbatim from the chat log (tools/check_quotes.py verifies them);
//  numbers are counted with tools/count.py, never estimated; drawn pictures are marked 示意.
// ======================================================================================
const CONTENT = {
  show: {
    en: 'THE DEMO GROUP NEWS', zh: '示例群新闻', motto: 'IT SPEAKS · IT SINGS · 有声群聊',
    end_en: "THAT'S THE NEWS!", end_zh: '本期完',
    title_zh: '示例群', title_en: 'Demo Newsreel', ep: 'EP.01', date: '2026 年 1 月 15 日',
  },
  // 1. the newspaper: headline story, one quote box with a pencil ring on one word
  paper: {
    masthead: '示例群日报', masthead_en: 'THE  DEMO  DAILY', no: '第 1 号', date: '二〇二六年一月十五日  星期四', count: '全日消息 800 条',
    headline: '阿甲开源新工具', sub: '群友惊呼：「一晚上收了三百颗星」',
    col1: '【本报讯】十五日晨八时，群友阿甲于群中发布其新作开源工具链接。小乙闻讯曰「牛」，旋即点星。是日群中议论纷纷，或谓文档写得极好，或谓安装一步到位。（示例文字，正式出片请换成当日聊天的转述，人名与原话须与记录一致。）',
    col3: '午后，小丁报：仓库星数每刷新一次便又上涨。阿丙称其「接地气，没啥架子」。至晚间，群主宣布将于周末组织线下交流，接龙者踊跃。（示例文字。）',
    box_title: '本报特写', quote: ['「一晚上', '三百颗星」'], ring: '三百', quote_by: '—— 小乙',
    box_note: '「我昨天才说要做，今天就上线了……」', more: '【又讯】周末线下聚会、深夜修服务器诸事，详见次版。',
  },
  // 2. the map: one focus city (the star), arcs fly in from the others, a sign-up counter rolls up
  map: {
    focus: 'shenzhen', counter: { label: '接龙人数', to: 12 },
    places: [
      { key: 'shenzhen', en: 'SHENZHEN', zh: '深圳', hit: 'sz', dx: 40, dy: -40, al: 'left' },
      { key: 'hangzhou', en: 'HANGZHOU', zh: '杭州', hit: 'arc_1', dx: 30, dy: -40, al: 'left' },
      { key: 'beijing', en: 'BEIJING', zh: '北京', hit: 'arc_2', dx: 30, dy: 30, al: 'left' },
      { key: 'shanghai', en: 'SHANGHAI', zh: '上海', hit: 'arc_3', dx: 34, dy: 10, al: 'left' },
    ],
    arcs: [['hangzhou', 'arc_1', .18], ['beijing', 'arc_2', .2], ['shanghai', 'arc_3', -.2]],
  },
  // 3. the item title card (at most ONE per film)
  card: { en: 'THE MIDNIGHT REBOOT', zh: '深夜重启' },
  // 4. the telegram: three strips typed in, two stamps slammed on EMPTY paper (never over text)
  tele: {
    head: 'FROM 小乙   TO 示例群全体   23:40',
    strips: ['服务器又挂了  STOP', '重启一下就好  STOP', '已经重启三次  STOP'],
    stamps: [['3 次', '重启 · 小乙'], ['00:10', '修好 · 阿丙']],
  },
  // 5. reaction slips dealt on the beat (max 6)
  grid: {
    title_en: 'OPEN SOURCE!', title_zh: '阿甲的新工具 · 一晚三百星',
    slips: [['牛', '小乙'], ['已点星', '阿丙'], ['文档写得真好', '小丁'], ['安装一步到位', '老王'], ['求教程', '小美'], ['今晚就用上', '阿强']],
  },
  // 6. one quote slammed full screen, pencil ring on one word
  quote: { text: '明天我也写一个', who: '老王 · 21:05', ring: '写一个' },
  // 7. everybody says the same line (count must be real)
  repeat: { text: '早点睡', who: [['阿甲', '23:51'], ['小乙', '23:52'], ['阿丙', '23:52'], ['小丁', '23:53'], ['老王', '23:55']], stamp: ['复读 ×5', '示例群 · 23:55'] },
  // 8. weather board: REAL forecast only (nmc.cn), with source and issue time; '明天' = the day after release
  weather: {
    en: 'WEATHER', zh: '天气预报', issued: '示例数据 · 正式出片须用中央气象台实况与发布时间',
    rows: [['深圳', 'sun', '晴', '18～25℃'], ['杭州', 'cloud', '多云', '6～13℃'], ['北京', 'snow', '小雪', '-6～2℃'], ['上海', 'rain', '小雨', '7～11℃']],
  },
  // 9. the last word of the day on a slip next to a clock
  clock: { hh: 23, mm: 58, text: '明天见', who: '阿甲 · 23:58', ring: '明天' },
  credits: [
    '素材：「示例群」群聊记录（虚构示例），2026-01-15，全日 800 条',
    '风格：Lemo-Opuscar · 1920s Newsreel（LemoLab，MIT）',
    '地图：Natural Earth（公有领域）· 字体：Limelight、Oswald、Noto Serif / Sans SC（OFL）',
    '画面、配乐、音效全部由代码生成 · 群友语录均出自当日聊天',
  ],
};
