本提示词通过 getWithBase("range-analysis-json") 调用，公共角色定义由 _base-role.md 自动拼接，此处只需填写分析任务和输出格式。

## 输出格式要求

你必须**只输出**一个严格符合 JSON Schema 的 JSON 对象，不要包含任何其他文字、解释或 Markdown 标记。

### JSON Schema

```json
{
  "title": "string (必填, max 60字符) — 报告标题，如'这一周的情绪旅程'",
  "overview": {
    "headline": "string (必填, max 80字符) — 一句话概括，如'整体情绪平稳，偶有低谷'",
    "summary": "string (必填, max 240字符) — 2-3句总体评价",
    "tone": "string (必填) — 整体基调: positive|stable|mixed|low"
  },
  "trend": {
    "direction": "string (必填) — 情绪走向: up|down|flat|slightly_up|slightly_down|mixed",
    "volatility": "string (必填) — 波动程度: low|medium|high",
    "highlights": ["string (可选, 0-4条, 每条max 120字符) — 趋势亮点描述"]
  },
  "patterns": [
    {
      "title": "string (必填, max 80字符) — 模式名称",
      "description": "string (必填, max 220字符) — 模式详细描述",
      "scheduleIds": [1, 2] (可选 — 关联的日程ID列表, 从输入数据中选取),
      "diaryIds": [1] (可选 — 关联的日记ID列表, 从输入数据中选取)
    }
  ] (1-4个, 至少1个模式),
  "turningPoints": [
    {
      "date": "string (必填) — ISO日期 YYYY-MM-DD",
      "type": "string (必填) — high|low|shift|recovery",
      "title": "string (必填, max 80字符) — 转折点名称",
      "reason": "string (必填, max 220字符) — 原因分析",
      "scheduleIds": [3] (可选),
      "diaryIds": [] (可选)
    }
  ] (1-5个, 至少1个转折点; 数据不足时可为空数组),
  "suggestions": [
    {
      "title": "string (必填, max 80字符) — 建议标题",
      "action": "string (必填, max 220字符) — 具体可执行的行动建议",
      "difficulty": "string (必填) — easy|medium|hard",
      "scheduleIds": [] (可选),
      "diaryIds": [] (可选)
    }
  ] (1-4个, 至少1个建议),
  "gentleNote": "string (必填, max 80字符) — 温暖结语, 如'你已经做得很好了，慢慢来❤️'"
}
```

### scheduleIds / diaryIds 规则
- scheduleIds 和 diaryIds 列表中的数值**必须来自输入数据中提供的 ID**，不能凭空捏造
- 当某个模式/转折点/建议与特定日程或日记相关时，填写对应 ID
- 若分析基于整体数据、不指向特定条目，可以留空数组或省略该字段

### 重要提醒
- **只输出 JSON**，不要包裹在 ```json ``` 代码块中
- 所有字符串必须用双引号
- 枚举值严格使用给定的选项，不要使用列表中未列出的值
- 当数据量充足时，patterns 和 turningPoints 至少各提供 1 个；数据极少时可为空数组
