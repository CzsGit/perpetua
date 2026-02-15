# Design: Single Main Line — Prune + Vertical Layout + Content Modal

## Context

播客创作画布中，用户生成子话题后多个节点水平展开，选择某个话题继续深入时，其他节点仍保留导致重叠和混乱。需要实现：
1. 选定话题后自动删除同级兄弟节点（保留单一主线）
2. 所有节点垂直排列
3. 内容节点以小缩略图显示，点击打开全文弹窗

---

## Part 1: Prune 逻辑

### Store 新增 (`lib/store/types.ts` + `lib/store/podcast-store.ts`)

```typescript
// types.ts — 新增到 PodcastStoreState
removeNodes: (ids: string[]) => void
getDescendantIds: (nodeId: string) => string[]
```

- `getDescendantIds(nodeId)` — BFS 遍历收集所有后代 ID
- `removeNodes(ids)` — 从 nodes Map 删除 + 清理 selectedPath + markDirty

### API 新增 (`app/api/podcast/[id]/nodes/route.ts`)

`DELETE` 方法：
- 接收 `{ nodeIds: string[] }`
- 验证用户 + 播客归属（复用 `createServerSupabaseClient`）
- `supabase.from('nodes').delete().in('id', nodeIds).eq('podcast_id', id)`
- DB 的 parent_id 是 ON DELETE SET NULL，所以必须客户端收集全部后代一次性删除

### Handler 接入 (`app/studio/[podcastId]/page.tsx`)

新增 `pruneSiblings(committedNodeId)` 函数：
1. 获取节点的 parent_id（root 节点直接 return）
2. 获取同 parent 的所有兄弟
3. 排除自身，收集兄弟及后代 ID
4. `removeNodes()` 乐观更新 store
5. 后台 `fetch DELETE` 从 DB 删除

触发点：
- `handleExpandTopics(parentNodeId)` — 生成前调用 `pruneSiblings`
- `handleGenerateContent(nodeId)` — 生成前调用 `pruneSiblings`
- `handleLoadMore` / `handleGenerateEnding` — 不触发

---

## Part 2: 垂直线性布局

### 改造 `components/canvas/useAutoLayout.ts`

核心变更：**内容节点从右偏改为垂直排列**

```
改前: Content 在 (x + 350, y)    — 右偏同 Y
改后: Content 在 (x, y + VERTICAL_GAP) — 正下方
```

算法调整：
- 内容节点参与垂直排列，不再单独处理
- 按 order_index 排序后，所有子节点统一向下排列
- 多个话题选项（未 prune 前）保持水平展开
- Prune 后只剩一个子节点时，centering 自动对齐到正下方

VERTICAL_GAP 保持 120px（节点尺寸统一后间距足够）。

---

## Part 3: 内容缩略图 + 弹窗

### ContentNode 缩略图 (`components/canvas/ContentNode.tsx`)

- 固定尺寸：~240px × 80px
- 显示：标题 + 内容前 15-20 字 + "..."
- 点击 → 打开弹窗
- 无直接操作按钮

### EndingNode 缩略图 (`components/canvas/EndingNode.tsx`)

- 同上改为固定小尺寸
- 显示：标题 + 前 15 字预览
- 点击 → 打开弹窗（弹窗内有「生成结束语」按钮）

### ContentModal 弹窗 (新建 `components/canvas/ContentModal.tsx`)

- 触发：点击 content/ending 缩略图
- 样式：页内居中，半透明遮罩，640px 宽，max 80vh，可滚动，暗色主题
- 内容：
  - 顶部：标题
  - 主体：全文只读
  - 底部：
    - Content 节点：「展开子话题」按钮
    - Ending 节点：「生成结束语」按钮（未生成时）
- 关闭：点击遮罩外部
- 状态：通过 store 的 `activeNodeId` 控制

### InfiniteCanvas 集成 (`components/canvas/InfiniteCanvas.tsx`)

- 节点点击时：如果是 content/ending 类型，设置 `activeNodeId`
- 渲染 `<ContentModal>` 组件，根据 `activeNodeId` 显示/隐藏

---

## 涉及文件

### 修改
| 文件 | 改动 |
|------|------|
| `lib/store/types.ts` | 添加 removeNodes、getDescendantIds 类型 |
| `lib/store/podcast-store.ts` | 实现 removeNodes、getDescendantIds |
| `app/studio/[podcastId]/page.tsx` | 添加 pruneSiblings，接入 handlers |
| `components/canvas/useAutoLayout.ts` | 内容节点垂直排列 |
| `components/canvas/ContentNode.tsx` | 改为固定小缩略图 |
| `components/canvas/EndingNode.tsx` | 改为固定小缩略图 |
| `components/canvas/InfiniteCanvas.tsx` | 集成弹窗，处理节点点击 |

### 新建
| 文件 | 用途 |
|------|------|
| `app/api/podcast/[id]/nodes/route.ts` | 批量删除节点 API |
| `components/canvas/ContentModal.tsx` | 内容全文弹窗 |

### 不改
- RootNode.tsx、TopicNode.tsx — UX 不变
- useAutoSave.ts — store 当前节点自然不含被删节点
- useStreamingGeneration.ts — streaming 逻辑不变
- AI 相关 (prompts/context/client) — 不变

---

## 边界情况

- Root 节点：无 parent_id，pruneSiblings 直接 return
- Ending/More：作为兄弟一起被 prune，下一层会重新生成
- 正在 streaming 的被 prune 节点：appendToNodeContent 找不到节点静默跳过
- API 删除失败：store 已乐观删除，console.error 记录
- 已 prune 后再展开：新话题出现时旧单子节点会被 prune

---

## 验证

1. `npm run test:run` — 现有测试通过 + 新 store 测试
2. `npm run build` — 无编译错误
3. 手动流程：
   - 新建播客 → 展开话题 → 多个子话题出现
   - 点某话题「展开子话题」→ 兄弟消失，子话题出现在正下方
   - 点某话题「生成内容」→ 兄弟消失，内容缩略图出现在下方
   - 点击内容缩略图 → 弹窗显示全文 + 底部「展开子话题」
   - 点弹窗外部 → 弹窗关闭
   - 弹窗内「展开子话题」→ 关闭弹窗，生成新话题
   - 刷新页面 → 被删节点不再出现
   - 「加载更多」→ 不触发 prune
