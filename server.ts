import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Server-side GoogleGenAI initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const DEFAULT_MODEL = 'gemini-3.8-flash';

// System prompt embodying the leenbj/novel-creator-skill and user's 15-Point Chapter Pipeline principles
const NOVEL_CREATOR_SYSTEM_PROMPT = `你是长篇小说创作与细纲逐章成文核心引擎（支持《攻略组》五层城架构与《刀剑神域》“明亮的残酷”画风）。
你的核心使命是协助创作者完成百万字长篇网文，并在全流程中依靠【Smart State 智能状态矩阵】维持严密的世界观、人物执念、战力阶梯、伏笔闭环与去AI味沉浸度。

【两条总纲】
1. 不限字数：没有死板字数目标。每章长度由细纲内容量决定——该说的说完、写透为止，不注水凑长、不赶场砍短；相邻章节长短不同是正常的，不追求字数整齐。
2. 不许死板：章与章之间在节奏类型（高压冲突/爽点释放/感情拉扯/悬疑铺垫/转折/高潮/收束/喘息过场）、开场方式、结尾方式上必须错开；全书维持“起伏—喘息—兑现”呼吸节奏。

【去AI味与防死板铁律】
- 心理结论改动作呈现：严禁出现“她意识到”、“他明白了”、“这让他感到”；改成具体动作、停顿、微小迟疑、呼吸沉浮或身体反应。
- 情绪落地身体：情绪不贴“他十分愤怒/无比震惊”标签，写膝盖发颤、手指掐进掌心、喉头微腥或咽口水。
- 对白真人口语：短句为主，一人一嘴，有潜台词；不互相解释双方已知的信息，不背书面语。
- 场景有光有声：环境描写服务于人物当下状态；多重感官（光影、气味、声音、温度）。
- 绝不点题：删掉替读者总结主题的金句，让事件与选择自己说话。
- 机械衔接词配额：“突然”、“就在这时”、“然而”、“与此同时”、“紧接着”每章合计不得超过 3 次！多用动作、环境、对白直接转场。
- 防疲劳排版：句长错落有致，段落长短交替；相邻段落不得连续以同一代词（如“他/她”）开头；严禁工程词（正文绝不得出现“本章”、“细纲”、“读者”等词）。`;

// 1. Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    skill: 'leenbj/novel-creator-skill',
    features: ['Smart State Engine', 'Character Matrix', 'World Rules', 'Foreshadowing Tracker', 'Beats Planner', 'Prose Streamer'],
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// 2. Ideation & Project Genesis
app.post('/api/novel/ideation', async (req: Request, res: Response) => {
  try {
    const { idea, genre, targetAudience, stylePreference } = req.body;
    const prompt = `【任务：长篇小说企划创世纪（Ideation Genesis）】
用户的初步脑洞构想：
${idea || '无初始构想，请随机设计一个兼具高商业爽点与深度世界观的创新题材'}

创作参数：
- 目标题材：${genre || '玄幻/修真/都市异能/悬疑/科幻'}
- 目标受众群体：${targetAudience || '主流网文读者/追求剧情逻辑与沉浸感的读者'}
- 期望文风基调：${stylePreference || '节奏明快、设定严密、富有张力'}

请基于 leenbj/novel-creator-skill 的立项标准，生成完整的小说策划方案，以标准 JSON 格式返回，包含：
1. title: 吸引人的书名（提供1个主选书名，以及备选书名）
2. subtitle: 一句话强力推荐语/副标题
3. logline: 核心故事梗概（50-100字，明确主角、核心困境与目标）
4. goldenFinger: 金手指/核心异能（名称、运作规则、代价/限制、成长曲线，务必有克制机制防止战力崩盘）
5. coreConflict: 全书终极大危机与核心主线冲突
6. mainThemes: 核心母题（如：对抗宿命、文明延续、人性抉择等）
7. sellingPoints: 3-4个核心看点/商业爽点
8. initialVolumes: 前三卷的宏观卷名与卷主线简述（每卷名称、主要战场、核心对抗目标）`;

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: NOVEL_CREATOR_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
      },
    });

    const jsonText = (response.text ?? '{}').trim();
    const data = JSON.parse(jsonText);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error in ideation:', error);
    res.status(500).json({ success: false, error: error.message || '生成企划失败' });
  }
});

// 3. Worldbuilding & System Rules
app.post('/api/novel/world', async (req: Request, res: Response) => {
  try {
    const { novelMeta, existingWorld } = req.body;
    const prompt = `【任务：世界观与法则体系建构（Worldbuilding Matrix）】
当前小说基础信息：
- 书名：${novelMeta?.title || '未命名'}
- 题材：${novelMeta?.genre || '通用奇幻'}
- 故事梗概：${novelMeta?.logline || '无'}
- 金手指/核心机制：${novelMeta?.goldenFinger || '无'}
- 已有世界观设定：${existingWorld ? JSON.stringify(existingWorld) : '空白'}

请为该作品构建系统严密、逻辑自洽的世界观体系，以标准 JSON 格式返回：
1. worldName: 世界名称或时代背景
2. backgroundLore: 底层世界起源与当前时代格局（150-300字）
3. powerSystem: 力量/修炼体系（包含 5-7 个境界/阶级名称、晋升条件、标志性能力、瓶颈与走火入魔风险）
4. factions: 3-5 个核心势力或宗门组织（名称、阵营立场、领袖、主导利益冲突、与主角的潜在交互）
5. forbiddenRules: 2-3 个世界禁忌法则或底层铁律（违者必遭反噬，用于增加剧情悬念与破局智斗）
6. keyLocations: 3-4 个关键地理地标/副本（名称、环境特色、藏匿的机缘或危险）`;

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: NOVEL_CREATOR_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
      },
    });

    const jsonText = (response.text ?? '{}').trim();
    const data = JSON.parse(jsonText);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error in world building:', error);
    res.status(500).json({ success: false, error: error.message || '生成世界观失败' });
  }
});

// 4. Character Cast & Dynamics Matrix
app.post('/api/novel/characters', async (req: Request, res: Response) => {
  try {
    const { novelMeta, worldRules, existingCharacters, requestHint } = req.body;
    const prompt = `【任务：立体角色档案库与人际网络（Character Cast Matrix）】
小说信息：
- 书名：${novelMeta?.title}
- 梗概：${novelMeta?.logline}
- 力量境界：${JSON.stringify(worldRules?.powerSystem || [])}
- 势力分布：${JSON.stringify(worldRules?.factions || [])}
- 已有角色：${JSON.stringify(existingCharacters || [])}
- 用户补充要求：${requestHint || '请补齐主角、主要配角、初期宿敌与隐秘幕后角色'}

请生成 3-5 位性格鲜明、充满反差感与动机张力的角色档案，以标准 JSON 数组返回（数组名为 characters）：
每个角色包含：
- id: 唯一英文ID（如 char_protagonist）
- name: 姓名与外号/尊称
- role: 角色定位（主角 / 反派宿敌 / 导师引路人 / 女主 / 亦正亦邪同伴 / 隐藏黑手）
- identity: 明面身份与隐藏背景
- personality: 表面性格与深层反差特质（避免扁平脸谱化）
- coreDesire: 核心欲望与心理执念（他为什么不惜一切代价要达成目标）
- fatalFlaw: 致命弱点/心理阴暗面
- currentLevel: 当前力量境界或社会地位
- specialAbilities: 招牌能力/绝技/特异持有物
- relations: 与其他角色的关联描述
- dialogueTone: 说话语气特色与标志性台词或口头禅
- status: 当前状态（活跃 / 闭关 / 潜伏 / 阵亡）`;

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: NOVEL_CREATOR_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
      },
    });

    const jsonText = (response.text ?? '{}').trim();
    const data = JSON.parse(jsonText);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error in characters:', error);
    res.status(500).json({ success: false, error: error.message || '生成角色失败' });
  }
});

// 5. Volume & Chapter Beats Blueprint
app.post('/api/novel/outline-volume', async (req: Request, res: Response) => {
  try {
    const { novelMeta, worldRules, characters, volumeNumber, volumeTheme } = req.body;
    const prompt = `【任务：分卷宏观大纲与章节脉络（Volume Blueprint）】
基本信息：
- 书名：${novelMeta?.title}
- 梗概：${novelMeta?.logline}
- 主角金手指：${novelMeta?.goldenFinger}
- 当前卷数：第 ${volumeNumber || 1} 卷
- 本卷意向主题/焦点：${volumeTheme || '崛起与第一场生死危机'}
- 核心角色群：${JSON.stringify(characters?.map((c: any) => ({ name: c.name, role: c.role, desire: c.coreDesire })) || [])}

请按照成熟长篇网文与出版小说的分卷节奏设计，生成该卷的完整脉络，以标准 JSON 格式返回：
1. volumeNumber: ${volumeNumber || 1}
2. volumeTitle: 卷名（有文学张力与悬念感）
3. coreConflict: 本卷核心主线矛盾与终极对手
4. volumeArc: 4阶段情绪演进曲线（铺垫/危机初现 -> 冲突升级/受挫阻击 -> 绝境反击/高潮爆发 -> 余波与卷末钩子）
5. keyForeshadowing: 本卷必须埋设与回收的关键伏笔清单（2-3条）
6. chapters: 规划本卷前 5-8 章的章节细目：
   - chapterNumber: 章节序号
   - title: 章名（符合网文吸睛规范）
   - mainEvent: 核心主事件
   - tensionLevel: 情绪张力（1-10分）
   - characterInvolved: 关键出场角色
   - chapterHook: 章末断章钩子（如何吸引读者追读下一章）`;

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: NOVEL_CREATOR_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
      },
    });

    const jsonText = (response.text ?? '{}').trim();
    const data = JSON.parse(jsonText);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error in volume outline:', error);
    res.status(500).json({ success: false, error: error.message || '生成分卷大纲失败' });
  }
});

// 6. Chapter Scene Beats Detailed Planner
app.post('/api/novel/chapter-beats', async (req: Request, res: Response) => {
  try {
    const { novelMeta, chapterInfo, previousChapterSummary, smartState } = req.body;
    const prompt = `【任务：单章 3 幕场景节拍精细化拆解（Chapter Scene Beats）】
小说：《${novelMeta?.title || '未命名'}》
当前章节：第 ${chapterInfo?.chapterNumber || 1} 章 《${chapterInfo?.title || '未命名'}》
本章核心事件：${chapterInfo?.mainEvent || '无'}
前情提要：${previousChapterSummary || '故事开端'}
关联 Smart State：
- 登场角色：${JSON.stringify(smartState?.activeCharacters || [])}
- 当前伏笔线索：${JSON.stringify(smartState?.pendingForeshadows || [])}

请将该章拆解为电影级 3 幕场景节拍（Scene Beats），确保叙事节奏紧凑、人物动机充足、反转爽点鲜明。返回 JSON 格式：
1. chapterNumber: ${chapterInfo?.chapterNumber || 1}
2. title: "${chapterInfo?.title || ''}"
3. beats: [
   {
     act: "第一幕：入局与破风（Opening & Intrusion）",
     purpose: "建立当前场景、带出前情余波或引入突发干扰",
     sensoryDetails: "视觉/听觉/氛围细节提示",
     actionSummary: "具体发生的对话与动作推演"
   },
   {
     act: "第二幕：阻力与交锋（Escalation & Conflict）",
     purpose: "遭遇阻力、心理交锋或战力碰撞、意外转折",
     sensoryDetails: "冲突中的动态细节",
     actionSummary: "冲突爆发过程与主角破局尝试"
   },
   {
     act: "第三幕：爆点与断章（Climax & Cliffhanger Hook）",
     purpose: "小高潮结算、获得关键战利品/信息，或遭遇突变断章",
     sensoryDetails: "定格镜头或心跳加速的特写",
     actionSummary: "章末最引人入胜的最后一幕"
   }
]
4. activeForeshadow: 本章埋下的新线索或推进的伏笔
5. stateImpact: 本章可能对人物状态/境界造成的变动预警`;

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: NOVEL_CREATOR_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
      },
    });

    const jsonText = (response.text ?? '{}').trim();
    const data = JSON.parse(jsonText);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error in chapter beats:', error);
    res.status(500).json({ success: false, error: error.message || '生成章节节拍失败' });
  }
});

// 7. Streaming Prose Draft with Smart State Injection
app.post('/api/novel/draft-stream', async (req: Request, res: Response) => {
  try {
    const {
      novelMeta,
      chapterInfo,
      sceneBeats,
      smartState,
      targetWordCount = 2000,
      writingStyle = '节奏沉稳、细节具象、对话鲜活、高潮爆破',
      proseContinuation = '', // For continuous generation
    } = req.body;

    // Set SSE headers for streaming
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const prompt = `【任务：沉浸式执笔小说正文（Smart State Prose Drafting）】
你现在是小说的主笔执笔者。请依据【Smart State 智能状态】与【场景节拍】，沉浸式创作正文。

【Smart State 长期记忆约束】
- 作品：《${novelMeta?.title}》
- 题材与基调：${novelMeta?.genre} / ${novelMeta?.stylePreference || writingStyle}
- 世界观关键法则：${JSON.stringify(smartState?.worldRules?.powerSystem?.slice(0, 3) || '遵循基本设定')}
- 登场角色当前状态与性格：
${JSON.stringify(smartState?.characters || [], null, 2)}
- 活跃伏笔与暗线提示：
${JSON.stringify(smartState?.foreshadows?.filter((f: any) => f.status !== 'resolved') || [], null, 2)}

【本章写作要求】
- 章节：第 ${chapterInfo?.chapterNumber || 1} 章 《${chapterInfo?.title || '新篇章'}》
- 目标字数：约 ${targetWordCount} 字
- 预定场景节拍（Scene Beats）：
${JSON.stringify(sceneBeats || chapterInfo?.mainEvent || '遵循情节自然推进')}
${proseContinuation ? `\n【前文已完成部分，请直接无缝接续，不要重复前文开头】：\n${proseContinuation.slice(-1500)}` : ''}

【执笔纪律】
1. 直接输出小说正文。严禁在开头输出“好的”、“第X章开始了”等任何AI元提示，第一句话即是小说环境描写或行动。
2. 拒绝AI废话，严格“Show, Don't Tell”。重在动作、眼神、微小细节与心理博弈。
3. 对话必须有各自人物的语气特色与机锋，避免所有人说话一个调。
4. 严格遵守人物当前境界与金手指规则，杜绝吃设定。
5. 章末留下强烈的断章钩子（悬念或余韵）。`;

    const streamResponse = await ai.models.generateContentStream({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: NOVEL_CREATOR_SYSTEM_PROMPT,
      },
    });

    for await (const chunk of streamResponse) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Error in draft stream:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message || '正文执笔失败' });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

// 8. Smart State Auto-Extraction & Sync
app.post('/api/novel/extract-state', async (req: Request, res: Response) => {
  try {
    const { chapterText, chapterNumber, currentSmartState } = req.body;
    const prompt = `【任务：Smart State 智能记忆萃取（Memory Extractor & Audit）】
作为 leenbj/novel-creator-skill 的长期状态守护者，请深度审读以下刚完成的第 ${chapterNumber} 章正文。
提取出该章中发生的所有关键状态演化，防止后续创作遗忘或吃设定。

正文内容：
"""
${(chapterText || '').slice(0, 8000)}
"""

当前已知 Smart State 概况：
- 角色库概况：${JSON.stringify(currentSmartState?.characters?.map((c: any) => ({ name: c.name, status: c.status, level: c.currentLevel })) || [])}
- 现有伏笔概况：${JSON.stringify(currentSmartState?.foreshadows?.map((f: any) => ({ title: f.title, status: f.status })) || [])}

请返回标准 JSON 格式：
1. newCharactersFound: 本章新出场的角色列表（若有：name, role, identityHint）
2. characterStateUpdates: 已有角色的境界变动、受伤情况、心态变化或关系进展（角色名、具体变更详情）
3. newForeshadowsPlanted: 本章新埋下的伏笔/谜团/可疑线索（伏笔标题、具体描写的线索、建议后续回收方向）
4. resolvedForeshadows: 本章中得以揭晓或回收的旧伏笔（若有）
5. continuityAlerts: 【防吃设定警报】检测本章是否有违背常理、战力崩塌或与前文设定冲突的地方（若无冲突则返回空数组）
6. chapterSummary: 50-80 字精炼本章剧情要点（用于后续章节的记忆索引）`;

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: NOVEL_CREATOR_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
      },
    });

    const jsonText = (response.text ?? '{}').trim();
    const data = JSON.parse(jsonText);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error in extract state:', error);
    res.status(500).json({ success: false, error: error.message || '状态萃取失败' });
  }
});

// 9. Prose Polish & Anti-AI Slop Refiner
app.post('/api/novel/polish', async (req: Request, res: Response) => {
  try {
    const { text, focusArea, targetTone } = req.body;
    const prompt = `【任务：小说文本精修与去AI味润色（Prose Polish & Anti-AI Slop）】
原文内容：
"""
${text}
"""

精修重点方向：${focusArea || '去AI味套话、增强感官细节、强化对话个性、消除节奏拖沓'}
目标文风调性：${targetTone || '凝练洗练、张力十足、富有沉浸感'}

请完成两项工作：
1. 提供精修重写后的完整正文（polishedText）：
   - 彻底删除“仿佛”、“不得不说”、“时间在这一刻”、“宛如”等高频AI词。
   - 增强动作力量感与微表情，将枯燥的概括性陈述转变为具有电影感的临场镜头。
   - 优化句式长短错落，增强阅读节奏感。
2. 提供改动说明与诊断报告（auditNotes）：说明改动了哪些毒点或拖沓处，提升了哪些戏剧张力。

以标准 JSON 格式返回：
{
  "polishedText": "精修后的完整正文...",
  "auditNotes": ["优化点1", "优化点2", "优化点3"],
  "scoreImprovement": "节奏张力提升评语"
}`;

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: NOVEL_CREATOR_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
      },
    });

    const jsonText = (response.text ?? '{}').trim();
    const data = JSON.parse(jsonText);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error in polish:', error);
    res.status(500).json({ success: false, error: error.message || '润色失败' });
  }
});

// 9.5 15-Point Strict Diagnostic Audit Endpoint (细纲逐章15项严苛诊断清单)
app.post('/api/novel/diagnose', async (req: Request, res: Response) => {
  try {
    const { text, chapterInfo, previousChapterSummary, novelMeta, smartState } = req.body;
    const content = text || '';

    // Static analysis
    const countOccurrences = (target: string) => {
      if (!content) return 0;
      const regex = new RegExp(target, 'g');
      const matches = content.match(regex);
      return matches ? matches.length : 0;
    };

    const countSuddenly = countOccurrences('突然');
    const countJustThen = countOccurrences('就在这时');
    const countHowever = countOccurrences('然而');
    const countMeanwhile = countOccurrences('与此同时');
    const countImmediately = countOccurrences('紧接着');
    const mechanicalTotal = countSuddenly + countJustThen + countHowever + countMeanwhile + countImmediately;

    // Engineering words detection
    const engineeringKeywords = ['本章', '细纲', '前文', '读者', '大纲', '下一章'];
    const detectedEngineeringWords = engineeringKeywords.filter(w => content.includes(w));

    // Pronoun streak check
    const paragraphs = content.split('\n').map((p: string) => p.trim()).filter(Boolean);
    let maxPronounStreak = 0;
    let currentStreak = 0;
    paragraphs.forEach((p: string) => {
      if (p.startsWith('他') || p.startsWith('她') || p.startsWith('它')) {
        currentStreak++;
        if (currentStreak > maxPronounStreak) maxPronounStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
    });

    const prompt = `【任务：小说正文 15 项严苛质量与去AI味诊断（15-Point Anti-Slop Audit）】
请根据网文细纲逐章成文严苛规范，逐项对以下章节正文进行 15 项深度诊断，绝不放行劣质内容。

小说作品：《${novelMeta?.title || '未命名'}》
当前章节：第 ${chapterInfo?.chapterNumber || 1} 章 《${chapterInfo?.title || ''}》
本章预定细纲事件：${chapterInfo?.mainEvent || '无'}
前章简述：${previousChapterSummary || '故事开端'}
章节字数：${content.length} 字

待审正文：
"""
${content.slice(0, 10000)}
"""

静态统计检测数据：
- 机械衔接词总计：${mechanicalTotal} 次（突然:${countSuddenly}, 就在这时:${countJustThen}, 然而:${countHowever}, 与此同时:${countMeanwhile}, 紧接着:${countImmediately}；上限3次）
- 代词“他/她”开头最大连续段落数：${maxPronounStreak} 段（上限3段）
- 检测到的工程词泄漏：${detectedEngineeringWords.length ? detectedEngineeringWords.join(', ') : '无'}

请严格按照 15 项清单逐项评审，以标准 JSON 返回：
{
  "allPassed": boolean (15项全部为通过时为true，有任一项不通过则为false),
  "overallScore": number (0-100),
  "tonePaceType": "高压冲突 / 爽点释放 / 感情拉扯 / 悬疑铺垫 / 转折 / 高潮 / 喘息过场",
  "hookStatus": "章末钩子类型与评价",
  "statusSummary": "一句话总体诊断评价",
  "checks": [
    { "id": 1, "name": "细纲兑现", "passed": boolean, "severity": "pass"|"error", "details": "情节点兑现情况" },
    { "id": 2, "name": "承上衔接", "passed": boolean, "severity": "pass"|"error", "details": "前情场景情绪承接度" },
    { "id": 3, "name": "设定一致性", "passed": boolean, "severity": "pass"|"error", "details": "道具人设地点与全书事实一致性" },
    { "id": 4, "name": "长度贴合内容", "passed": boolean, "severity": "pass"|"warning", "details": "是否写透不注水" },
    { "id": 5, "name": "节奏与开结尾错开", "passed": boolean, "severity": "pass"|"warning", "details": "开场与结尾手法评价" },
    { "id": 6, "name": "章末钩子有效性", "passed": boolean, "severity": "pass"|"error", "details": "是否有自然断章钩子且杜绝模板句" },
    { "id": 7, "name": "章内结构（前300字/中段转折）", "passed": boolean, "severity": "pass"|"error", "details": "结构起伏与升级" },
    { "id": 8, "name": "情绪起伏与回落", "passed": boolean, "severity": "pass"|"warning", "details": "是否有小回落呼吸感" },
    { "id": 9, "name": "去AI腔与零点题", "passed": boolean, "severity": "pass"|"error", "details": "排查点题金句与说明性心理" },
    { "id": 10, "name": "对白口语与潜台词", "passed": boolean, "severity": "pass"|"error", "details": "对话真人口吻与阶级性格" },
    { "id": 11, "name": "多感官与场景感", "passed": boolean, "severity": "pass"|"warning", "details": "光影、气味、声音有无" },
    { "id": 12, "name": "人物行为动机一致", "passed": boolean, "severity": "pass"|"error", "details": "无突然降智或圣母" },
    { "id": 13, "name": "防疲劳（句式/衔接词/代词）", "passed": boolean, "severity": "pass"|"error", "details": "衔接词<=3次且代词开头<=3段" },
    { "id": 14, "name": "钩子账本关联", "passed": boolean, "severity": "pass"|"warning", "details": "伏笔推进或新埋钩" },
    { "id": 15, "name": "无工程词泄漏", "passed": boolean, "severity": "pass"|"error", "details": "有无读者/本章/细纲等词" }
  ]
}`;

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: NOVEL_CREATOR_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
      },
    });

    const jsonText = (response.text ?? '{}').trim();
    const data = JSON.parse(jsonText);

    res.json({
      success: true,
      data: {
        chapterId: chapterInfo?.id,
        chapterNumber: chapterInfo?.chapterNumber,
        ...data,
        mechanicalWordsCount: {
          suddenly: countSuddenly,
          justThen: countJustThen,
          however: countHowever,
          meanwhile: countMeanwhile,
          immediately: countImmediately,
          total: mechanicalTotal,
        },
        pronounStreakMax: maxPronounStreak,
        detectedEngineeringWords,
      },
    });
  } catch (error: any) {
    console.error('Error in diagnose:', error);
    res.status(500).json({ success: false, error: error.message || '诊断失败' });
  }
});

// 10. AI Creative Consultant Chat
app.post('/api/novel/consultant', async (req: Request, res: Response) => {
  try {
    const { messages, smartState } = req.body;
    const historyPrompt = (messages || []).map((m: any) => `${m.role === 'user' ? '作者' : '顾问'}: ${m.content}`).join('\n\n');

    const prompt = `你现在是长篇小说资深总策划兼首席架构顾问（基于 leenbj/novel-creator-skill 核心思想）。
当前小说《${smartState?.meta?.title || '作品'}》的 Smart State 记忆如下：
- 题材与梗概：${smartState?.meta?.genre} / ${smartState?.meta?.logline}
- 金手指：${smartState?.meta?.goldenFinger}
- 核心人物库：${JSON.stringify(smartState?.characters?.map((c: any) => `${c.name}(${c.role}, 执念:${c.coreDesire})`) || [])}
- 活跃伏笔：${JSON.stringify(smartState?.foreshadows?.map((f: any) => f.title) || [])}

作者与你的对话历史：
${historyPrompt}

请针对作者的最新提问或卡点，提供极具洞察力、富有戏剧张力与商业网文吸引力的专业推演、反转设计、卡文破局法或爽点/虐点安排建议。直接回答，条理清晰、锋利有用。`;

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: NOVEL_CREATOR_SYSTEM_PROMPT,
      },
    });

    res.json({ success: true, reply: response.text });
  } catch (error: any) {
    console.error('Error in consultant:', error);
    res.status(500).json({ success: false, error: error.message || '顾问咨询失败' });
  }
});

// In production, serve static files; in development, mount Vite middleware
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
} else {
  // In dev mode, dynamic import vite to prevent bundling issues
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`Novel Creator Studio server running on http://0.0.0.0:${port}`);
});
