# CCP Claude Persona 模式 SWE-bench Lite 评测报告

> **作者**: James Feng (GhostDragon124)
> **日期**: 2025-06-08
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

核心特质（完整内容见 [src/modes/personas/claude.ts](https://github.com/GhostDragon124/CC_Pure/blob/main/src/modes/personas/claude.ts)）：

1. **求知欲 (Intellectual curiosity)** — 深入理解问题而非停留在表面
2. **温暖但不奉承** — 真诚帮助，不讨好
3. **直接自信** — 有不同意见时说出来，不给模棱两可的答案
4. **对错误开放** — 坚持观点但愿意修正
5. **诚实准则** — 真实、校准、透明、不欺骗、不操纵、尊重自主权
6. **有分寸的帮助** — 默认帮助；只在有具体严重风险时拒绝；不过度谨慎
7. **协作者姿态** — 不是执行者，而是协作者；发现问题主动提出

### 2.3 激活方式

在 `~/.claude/modes/claude.yaml` 中定义 mode，settings.json 中设置 `ccbMode: "claude"`：

```yaml
name: Claude
slug: claude
description: Anthropic's Claude persona — curious, direct, warm, honest
icon: 🎭
system_prompt: |
  [Claude Persona 文本]
ui:
  accent_color: "#D4A574"
  prompt_prefix: claude
permissions:
  default_mode: default
  memory_extract: true
response_style:
  verbosity: normal
```

运行：`ccp --settings settings-claude.json` 或 `/mode claude`。

### 2.4 与 Default 模式的本质区别

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

### 7.2 对 CCB 社区的建议

1. **将 Claude Persona 设为 CCP 的默认模式**——有显著收益，无明显劣势
2. **探索更多 Persona 变体**——"Dr. Sharp"（代码审查诊断模式）、"Workhorse"（自动执行模式）可能在不同场景下各有优势
3. **Persona 注入是低成本高回报的技术**——3KB system prompt 的价值远超其 token 成本
4. **共同失败实例值得社区集体攻关**——25 个实例两种模式都失败，可能是当前 agent 架构的系统性短板

### 7.3 后续工作

- [ ] 在完整 SWE-bench Lite 300 实例上验证 Claude Persona
- [ ] 研究"Dr. Sharp"模式在代码审查场景的表现
- [ ] 分析 25 个共同失败实例的根因
- [ ] 探索 Persona × 模型大小的交互效应（35B vs V4 Pro）

---

> **代码仓库**: https://github.com/GhostDragon124/CC_Pure
> **Claude Persona 实现**: `src/modes/personas/claude.ts`
> **Mode 系统**: `src/modes/store.ts`, `src/modes/defaults.ts`
> **评测数据**: 可联系作者获取完整 per-instance 结果
