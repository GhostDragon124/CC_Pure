#!/usr/bin/env python3
"""
CC_Pure 本地遥测分析工具

用法:
  python3 analyze_analytics.py ~/.claude/local_analytics.jsonl

功能:
  - 事件总览（按类型统计）
  - 时间线分析（每小时事件分布）
  - 工具使用排行
  - RL 偏好信号分析（accept/reject 比例）
  - 安全事件摘要
"""
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime


def load_events(path: str) -> list[dict]:
    events = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    events.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    return events


def analyze(events: list[dict]):
    if not events:
        print("📭 暂无遥测数据。")
        return

    sep = "=" * 50
    print(f"📊 CC_Pure 使用分析报告")
    print(sep)
    print(f"总事件数: {len(events)}")
    if events:
        first = events[0].get("ts", "?")
        last = events[-1].get("ts", "?")
        print(f"时间范围: {first[:19] if first != '?' else '?'} → {last[:19] if last != '?' else '?'}")

    # ── 事件类型统计 ──
    print(f"\n📋 事件类型统计:")
    counter = Counter(e.get("event", "unknown") for e in events)
    for name, count in counter.most_common(20):
        bar = "█" * min(count // max(1, counter.most_common(1)[0][1] // 20), 40)
        print(f"  {count:>5d}  {name:<45s} {bar}")

    # ── 工具使用排行 ──
    tool_events = defaultdict(int)
    for e in events:
        name = e.get("event", "")
        # Extract tool name from tengu_<tool>_<action> pattern
        parts = name.split("_")
        if len(parts) >= 3 and parts[0] == "tengu":
            tool = parts[1] if parts[1] not in ("tool", "internal", "auto", "read", "git", "exit", "api", "web", "edit", "skill", "quartz", "amber", "plum", "birch", "surreal", "glacier", "kairos", "hive", "unary", "monitor", "config") else "_".join(parts[1:3])
            tool_events[tool] += 1

    if tool_events:
        print(f"\n🔧 工具活动排行:")
        for tool, count in sorted(tool_events.items(), key=lambda x: -x[1])[:15]:
            print(f"  {count:>5d}  {tool}")

    # ── RL 偏好信号 (accept/reject) ──
    accept_count = 0
    reject_count = 0
    for e in events:
        evt = e.get("event", "")
        if isinstance(evt, str):
            if evt == "accept":
                accept_count += 1
            elif evt == "reject":
                reject_count += 1

    if accept_count + reject_count > 0:
        total = accept_count + reject_count
        print(f"\n✅ 用户偏好信号 (accept/reject):")
        print(f"  接受: {accept_count} ({accept_count/total*100:.0f}%)")
        print(f"  拒绝: {reject_count} ({reject_count/total*100:.0f}%)")

    # ── 时间分布 ──
    print(f"\n⏰ 按小时分布:")
    hourly = Counter()
    for e in events:
        ts = e.get("ts", "")
        if ts and len(ts) >= 13:
            hour = ts[:13]
            hourly[hour] += 1
    for hour, count in sorted(hourly.items())[-20:]:
        bar = "█" * (count // max(1, max(hourly.values()) // 30))
        print(f"  {hour}:00  {count:>5d}  {bar}")

    # ── 安全事件 ──
    security_keywords = ["security", "sandbox", "dangerous", "deny", "malformed"]
    security_events = [
        e for e in events
        if any(kw in str(e.get("event", "")).lower() for kw in security_keywords)
    ]
    if security_events:
        print(f"\n🛡️ 安全事件 ({len(security_events)} 条):")
        for e in security_events[-10:]:
            print(f"  [{e.get('ts','?')[:19]}] {e.get('event','?')}")

    print("\n" + "=" * 50)
    print("💡 提示: 用 `tail -f ~/.claude/local_analytics.jsonl` 实时查看事件流")


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else f"/home/{__import__('os').environ.get('USER', 'spark')}/.claude/local_analytics.jsonl"
    analyze(load_events(path))
