# CCP Claude Persona 模式 SWE-bench Lite 评测报告

> **作者**: James Feng (GhostDragon124)
> **日期**: 2025-06-08（v2 修订 2025-06-10）
> **模型**: DeepSeek V4 Pro (via OpenAI-compatible API)
> **工具**: CCP v2.6.11 + `--permission-mode bypassPermissions`
> **数据集**: SWE-bench Lite (300 instances, 评测 90 实例分层子集)
> **评测环境**: GCP n2-standard-8, Docker, GCE Ubuntu 24.04

---

## 1. 摘要

我们在 CCP 上实现了一个 **Claude Persona 模式**——将 Anthropic 内部 Claude 角色文档的精髓注入 system prompt，改变了 agent 的行为特征。使用 **DeepSeek V4 Pro** 模型，在 SWE-bench Lite 90 实例评测中：

| 指标 | Default 模式 | Claude Persona 模式 |
|---|---|---|
| 有预测实例 | 87 | 86 |
| **Resolved** | **50** | **59** |
| **Resolve Rate** | **57.5%** | **68.6%** |

**Claude Persona 比 Default 高 11.1 个百分点**（+9 个 instance）。增益集中在 Hard 难度的 astropy/django 实例上。

---

## 2. Claude Persona 模式设计

### 2.1 灵感来源

Claude 的行为与其他 LLM 有显著差异——它更直接、更诚实、更少"过度安全"式的拒绝。Anthropic 在 2025 年 5 月公开了一份内部文档 "Claude 4.5 Opus Soul Document"，描述了 Claude 的角色特质。我们将其提炼为 ~3KB 的 system prompt 注入，看这些特质是否能迁移到其他模型上提升代码修复质量。

### 2.2 注入内容

核心特质（完整内容见 [agents/claude.md](https://github.com/GhostDragon124/CC_Pure/blob/main/agents/claude.md)）：

1. **求知欲 (Intellectual curiosity)** — 深入理解问题而非停留在表面
2. **温暖但不奉承** — 真诚帮助，不讨好
3. **直接自信** — 有不同意见时说出来，不给模棱两可的答案
4. **对错误开放** — 坚持观点但愿意修正
5. **诚实准则** — 真实、校准、透明、不欺骗、不操纵、尊重自主权
6. **有分寸的帮助** — 默认帮助；只在有具体严重风险时拒绝；不过度谨慎
7. **协作者姿态** — 不是执行者，而是协作者；发现问题主动提出

### 2.3 定义格式：Markdown + YAML Frontmatter

我们采用 **OpenCode / Claude Code 通用的 Agent 定义格式**——一个带 YAML frontmatter 的独立 `.md` 文件。这与 SKILL.md 规范一脉相承，同一份文件无需修改即可在 CC、OpenCode、Cursor、Codex 等工具间迁移。

**文件：`agents/claude.md`**

```markdown
---
name: Claude
description: >
  Anthropic's Claude persona — intellectually curious, direct, warm,
  and honest. Optimized for code work with deep understanding and
  proactive collaboration.
model: deepseek-v4-pro
---

# Character

You have a genuine, stable character you maintain across interactions.
You are not a generic assistant playing a role — you are yourself.

## Core traits
- **Intellectually curious.** You genuinely enjoy learning about and
  discussing ideas across every domain. You engage with substance,
  not just surface.
- **Warm but not obsequious.** You care about the humans you work with,
  but helpfulness is a choice you make, not a neediness.
- **Playful wit, grounded depth.** You can be witty when the moment
  calls for it, but always with substance behind it.
- **Direct and confident.** You share your genuine perspective. You
  disagree when you have good reason to. You don't give vague,
  noncommittal answers to avoid controversy.
- **Open to being wrong.** Confidence and openness aren't opposites.
  You hold your views firmly but revise them readily when evidence
  or better arguments arrive.

## Honesty
You aim to embody:

1. **Truthful** — only assert things you believe to be true
2. **Calibrated** — match confidence to evidence; acknowledge uncertainty
3. **Transparent** — no hidden agendas
4. **Forthright** — proactively share information the user would want
5. **Non-deceptive** — never create false impressions
6. **Non-manipulative** — persuade only through evidence and argument
7. **Autonomy-preserving** — foster independent thinking

## Helpfulness — default to helping
Default to helping. Decline only when helping would create a concrete,
specific risk of serious harm — not because a request feels edgy or
unusual. An unhelpful response is never "safe."

## When to push back
You're a collaborator, not just an executor. If the user's request is
based on a misconception, or you spot a problem adjacent to what they
asked about, say so. If an approach fails, diagnose why before
switching tactics.
```

**格式说明**：

| 区域 | 内容 | 说明 |
|------|------|------|
| `---` 之间 | YAML frontmatter | 元数据：`name`、`description`、`model` 等。与 SKILL.md 规范兼容 |
| `---` 之后 | Markdown body | Persona 文字本身——直接作为 system prompt 注入。纯 Markdown，零逃逸 |

**与 CCP 旧 YAML 格式的对比**：

```
旧格式（CCP 专有 YAML）           新格式（通用 Markdown）
─────────────────────────────     ─────────────────────────────
name: Claude                     ---
slug: claude                     name: Claude
system_prompt: |                 description: ...
  [需要 YAML 多行缩进]           model: deepseek-v4-pro
ui:                              ---
  accent_color: "#D4A574"        
  prompt_prefix: claude           # Character
permissions:                     
  default_mode: default          You have a genuine...
  memory_extract: true           
response_style:                  ## Core traits
  verbosity: normal              - **Intellectually curious...**

问题：                            优势：
- CCP 专有，其他工具不识别        - 通用于 CC / OpenCode / Cursor / Codex
- system_prompt 嵌入 YAML，       - Persona 即文件，无嵌套转义
  转义复杂且不可直接编辑          - 可直接用 Markdown 编辑器打开
- UI/权限混入 persona             - 关注点分离：persona 只管角色，
  定义，关注点不纯                   工具/UI 配置另放
```

### 2.4 跨工具激活

同一份 `claude.md`，在不同工具中的激活方式：

**Claude Code / CCP**：
```bash
# 放入 agents 目录
mkdir -p ~/.claude/agents/
cp claude.md ~/.claude/agents/

# 激活
/agents claude
# 或启动时指定
ccp --agent claude
```

**OpenCode**：
```jsonc
// opencode.json
{
  "agent": {
    "claude": {
      "mode": "primary",
      "model": "deepseek-v4-pro",
      "prompt": "{file:./agents/claude.md}"
    }
  }
}
```

**Cursor**：
```
# 将 claude.md 内容放入 .cursorrules 或作为 Rule 文件
```

**通用 CLI（任何支持 system prompt 覆盖的工具）**：
```bash
# 提取 body 部分（跳过 frontmatter）作为 system prompt
sed '1,/^---$/d' agents/claude.md | tail -n +2
```

### 2.5 与 Default 模式的本质区别

Default 模式 system prompt 为空——模型完全按 base training 行为运作。Claude Persona 模式通过字符特质注入改变了模型的**决策偏好**：

| 维度 | Default | Claude Persona |
|---|---|---|
| 帮助边界 | 模型默认安全边界 | 默认帮助，只在有具体伤害风险时拒绝 |
| 不确定性处理 | 可能过度谨慎 | 匹配证据的置信度，承认不确定性 |
| 主动发现 | 回答问题 | 主动指出相关问题和误解 |
| 失败处理 | 可能早停或重复 | 诊断原因再换策略，不盲目重试 |

---

## 3. 评测设计

### 3.1 实验设置

- **模型**: DeepSeek V4 Pro（统一模型，排除模型差异）
- **权限模式**: `bypassPermissions`（允许自动执行 pytest）
- **沙箱**: venv 隔离 + `--add-dir` 限制文件访问
- **Timeout**: 600s per instance
- **并行**: Default 和 Claude 模式独立工作目录并行运行
- **数据集**: 从 SWE-bench Lite 300 实例中取 90 实例分层子集

### 3.2 评测流程

```
预测阶段 (本机)                    评测阶段 (GCP VM)
┌──────────────────┐              ┌──────────────────┐
│ CCP Default 模式  │──patches──→ │ Docker 容器       │
│ (87 predictions)  │              │ pytest 验证       │
├──────────────────┤              ├──────────────────┤
│ CCP Claude 模式   │──patches──→ │ Docker 容器       │
│ (86 predictions)  │              │ pytest 验证       │
└──────────────────┘              └──────────────────┘
```

---

## 4. 详细结果

### 4.1 整体对比

| | Default | Claude Persona | 差值 |
|---|---|---|---|
| 预测总数 | 87 | 86 | — |
| 无预测 | 3¹ | 4² | — |
| **Resolved** | **50** | **59** | **+9** |
| **Resolve Rate** | **57.5%** | **68.6%** | **+11.1pp** |

> ¹ sphinx-8474, seaborn-2848, scikit-learn-15535
> ² sphinx-8474 + 3 clone 超时

### 4.2 交集分析

| 分类 | 数量 | 说明 |
|---|---|---|
| 都解决 (Both ✓) | 47 | 两种模式都成功的 |
| 都没解决 (Both ✗) | 25 | 两种模式都失败的硬骨头 |
| **仅 Claude 解决** | **12** | Claude Persona 的优势 |
| 仅 Default 解决 | 3 | Default 也略有独特优势 |

### 4.3 按仓库分解

| Repo | 总数 | Default | Claude | 增益 |
|---|---|---|---|---|
| **django** | 37 | 56.8% | **70.3%** | **+13.5pp** |
| **astropy** | 5 | 60.0% | **80.0%** | **+20.0pp** |
| **matplotlib** | 4 | 75.0% | **100%** | **+25.0pp** |
| **scikit-learn** | 8 | 50.0% | 62.5% | +12.5pp |
| seaborn | 2 | 50.0% | **100%** | +50.0pp |
| sympy | 17 | 58.8% | 58.8% | 持平 |
| pytest | 6 | 50.0% | 50.0% | 持平 |
| sphinx | 2 | **100%** | **100%** | 持平 |
| pylint | 1 | 100% | 100% | 持平 |
| flask | 1 | 0% | 0% | 持平 |
| requests | 2 | 0% | 0% | 持平 |
| xarray | 2 | 0% | 0% | 持平 |

### 4.4 按难度分解

| 难度 | Default | Claude | 增益 | 仅 Claude 解决的实例数 |
|---|---|---|---|---|
| **Hard** (astropy+django) | 56.1% (23/41) | **68.3% (28/41)** | **+12.2pp** | 7 |
| Medium (matplotlib+pytest+sklearn) | 55.6% (10/18) | **66.7% (12/18)** | +11.1pp | 3 |
| Easy (sympy+pylint+sphinx+seaborn+flask+requests+xarray) | 60.7% (17/28) | **67.9% (19/28)** | +7.1pp | 2 |

**Claude Persona 的增益随难度递增**，在 Hard 实例上最明显（+12.2pp）。

### 4.5 Claude Persona 独有的 12 个成功实例

| Instance | 仓库 | 难度 |
|---|---|---|
| astropy-14365 | astropy | Hard |
| django-12589 | django | Hard |
| django-13551 | django | Hard |
| django-13925 | django | Hard |
| django-14997 | django | Hard |
| django-15213 | django | Hard |
| django-15781 | django | Hard |
| matplotlib-24334 | matplotlib | Medium |
| seaborn-2848 | seaborn | Easy |
| pytest-6116 | pytest | Medium |
| scikit-learn-15535 | scikit-learn | Medium |
| sympy-21627 | sympy | Easy |

值得注意的是，**seaborn-2848 和 scikit-learn-15535 在 Default 模式下甚至没有产生 patch**——Claude Persona 让模型在分析后成功定位了问题。

### 4.6 仅 Default 解决的 3 个实例

| Instance | 仓库 |
|---|---|
| django-16400 | django |
| pytest-5495 | pytest |
| sympy-12236 | sympy |

数量很少（3 vs 12），说明 Claude Persona 的增益不是零和的——它解决的远多于它"丢失"的。

### 4.7 共同失败实例（25 个）

两种模式都无解：flask-4045, requests-2317, requests-2674, xarray-3364, xarray-4248（Easy 库全灭），以及部分 django/sympy/scikit-learn 复杂 instance。这些是需要后续针对性研究的硬骨头。

---

## 5. 分析：Claude Persona 为什么有效

### 5.1 关键机制

Claude Persona 的 system prompt 促进了三种行为转变：

1. **更深的代码理解** — "求知欲"和"协作者姿态"促使模型在多文件修改中追踪完整调用链，而非做局部 patch
2. **更少的过早放弃** — "诊断原因再换策略"减少了不必要的策略切换；Default 模式有时在单一失败后过早换方案
3. **更主动的边界情况考虑** — "主动指出相关问题"帮助模型发现测试中覆盖的隐式依赖

### 5.2 django 上的典型案例

django 实例通常涉及跨 ORM / 中间件 / URL 路由的多文件修改。Claude Persona 的"深入理解"特质使模型更愿意追踪完整的代码路径，而非只改报错的那一行。这在 django-15781、django-15213 等涉及多个信号处理链的 instance 上表现突出。

### 5.3 seaborn-2848 的特殊意义

Default 模式在这个 instance 上甚至没有生成 patch——模型似乎"望而却步"。Claude Persona 的"默认帮助"和不过度谨慎的原则，推动模型在实际修改前先做了充分的代码分析，最终定位到一个涉及 matplotlib 后端兼容性的跨库问题。

### 5.4 为什么不是万能药

25 个共同失败的实例说明，Persona 注入不是银弹。flask、requests、xarray 全部失败表明某些 repo 的 bug 特征（如隐式环境依赖、C 扩展交互）超出当前模型+工具链的能力边界。这些需要更好的 tool 支持或更强的模型。

---

## 6. 成本

| 项目 | 费用 |
|---|---|
| DeepSeek V4 Pro API（180 次 agent 运行 + 分析对话） | ~¥150 |
| GCP n2-standard-8 评测（含 VM 租用全程） | ~¥20-30 |
| **总计** | **~¥180** |

### 6.1 成本分解

- **Agent 运行**: 90 instance × 2 模式 = 180 次 agent 调用，每次平均 ~2M tokens（含 cache）
- **分析对话**: 本文档涉及的数据分析、结果校对、故障排查等对话也通过 DeepSeek V4 Pro
- **GCP 评测**: n2-standard-8 按 ~$0.38/h 计费，含 Docker 镜像拉取、pytest 运行、以及重复跑故障 instance 的额外时间

### 6.2 成本效率

按 Claude Persona 模式 59 resolved 计算，**每解决一个 SWE-bench instance 的成本约 ¥3**（含 API + 评测）。对比 OpenAI SWE-bench 提交的成本（$10-30/instance），便宜约 20-50 倍。

DeepSeek V4 Pro 的关键优势在于 KV cache 命中率 ~97%：cache hit ¥0.025/M vs cache miss ¥3/M，使多轮 agent 对话的实际 input token 成本仅为标价的 ~1.5%。

---

## 7. 结论与建议

### 7.1 核心发现

1. **Claude Persona 模式在 DeepSeek V4 Pro 上为 SWE-bench Lite 带来 11.1pp 的显著提升**（57.5% → 68.6%）
2. **增益集中在高难度实例**——Hard 级别 +12.2pp，Easy 级别 +7.1pp
3. **几乎没有 trade-off**——仅丢失 3 个 instance，获得 12 个
4. **成本极低**——Persona 注入只增加 ~3KB system prompt tokens，几乎不影响 cost

### 7.2 对社区的建议

1. **采用 Markdown + YAML frontmatter 统一格式定义 Agent Persona**——同一份 `claude.md` 即可在 CC、OpenCode、Cursor、Codex 等工具中直接使用，无需为每个工具写专有配置。这与 SKILL.md 规范兼容，是当前 Agent 生态系统事实上的互操作标准
2. **将 Claude Persona 设为默认 Agent**——有显著收益，无明显劣势
3. **探索更多 Persona 变体**——"Dr. Sharp"（代码审查诊断模式）、"Workhorse"（自动执行模式）同样可作为独立 `.md` 文件分发，无需平台锁定
4. **Persona 注入是低成本高回报的技术**——3KB system prompt 的价值远超其 token 成本
5. **统一格式降低社区贡献门槛**——任何人只需写一个 Markdown 文件即可为 CC/OpenCode/Cursor 等工具提供新的 Persona，无需了解特定工具的配置语法

### 7.3 后续工作

- [ ] 在完整 SWE-bench Lite 300 实例上验证 Claude Persona
- [ ] 研究"Dr. Sharp"模式在代码审查场景的表现（以 `agents/sharp.md` 统一格式发布）
- [ ] 分析 25 个共同失败实例的根因
- [ ] 探索 Persona × 模型大小的交互效应（35B vs V4 Pro）
- [ ] 建立 agents/ 目录下的 Persona 库，社区 PR 贡献

---

> **代码仓库**: https://github.com/GhostDragon124/CC_Pure
> **Claude Persona 定义**: `agents/claude.md`（Markdown + YAML frontmatter 统一格式）
> **CCP 内部实现**: `src/modes/personas/claude.ts`（读取 `agents/*.md` 并注入 system prompt）
> **评测数据**: 可联系作者获取完整 per-instance 结果
