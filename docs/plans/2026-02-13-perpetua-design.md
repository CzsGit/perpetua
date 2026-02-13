# Perpetua - 无限播客内容生成平台

## Context

口播博主在录制播客时需要提前写好完整的台词稿，这个过程非常耗时。Perpetua 旨在解决这个问题：博主只需输入一个主题，AI 就自动扩展出子话题和演讲稿内容，形成一棵无限延伸的内容树。博主可以在录制过程中实时选择方向、生成内容、边读边录，实现从几分钟到几个小时甚至十几个小时的播客，而无需提前准备任何台词。

关键挑战在于**连贯性**：所有生成的内容必须像一篇完整的稿子，有统一的主线、自然的过渡、不能让听众感觉是碎片拼接。

---

## 技术栈

| 层级 | 技术选择 | 说明 |
|------|---------|------|
| 前端框架 | Next.js 14+ (App Router) | 全栈框架，SSR + API Routes |
| UI 库 | React + Tailwind CSS | 快速开发，响应式 |
| 无限画布 | React Flow | 轻量、高性能、文档完善 |
| 状态管理 | Zustand | 轻量、简单、适合画布状态 |
| 数据库 | Supabase (PostgreSQL) | 关系型数据库 + 免费套餐 |
| 认证 | Supabase Auth | 内置认证系统 |
| AI | OpenRouter + Gemini 2.0 Flash | 高性价比，速度快 |
| 流式输出 | SSE (Server-Sent Events) | Next.js 原生支持 |
| 部署 | Vercel | 与 Next.js 深度集成 |

---

## 数据库设计

### podcasts 表
```sql
CREATE TABLE podcasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  root_topic TEXT NOT NULL,
  status TEXT CHECK (status IN ('draft', 'completed')) DEFAULT 'draft',
  canvas_state JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_autosave_at TIMESTAMPTZ
);
```

### nodes 表
```sql
CREATE TABLE nodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  podcast_id UUID REFERENCES podcasts(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES nodes(id),
  node_type TEXT CHECK (node_type IN ('root', 'topic', 'content', 'ending')) NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  position_x FLOAT DEFAULT 0,
  position_y FLOAT DEFAULT 0,
  is_expanded BOOLEAN DEFAULT false,
  is_selected BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);
```

### generation_history 表
```sql
CREATE TABLE generation_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  podcast_id UUID REFERENCES podcasts(id) ON DELETE CASCADE NOT NULL,
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_used INTEGER,
  generation_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### saved_podcasts 表
```sql
CREATE TABLE saved_podcasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  podcast_id UUID REFERENCES podcasts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  markdown_content TEXT NOT NULL,
  path_node_ids UUID[] NOT NULL,
  word_count INTEGER,
  estimated_duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 索引与 RLS
- `idx_nodes_podcast_id`, `idx_nodes_parent_id`, `idx_podcasts_user_id`
- 所有表启用 RLS，用户只能访问自己的数据

---

## 页面路由

```
app/
├── page.tsx                      # 首页（登录/注册入口）
├── auth/login/page.tsx           # 登录
├── auth/register/page.tsx        # 注册
├── dashboard/page.tsx            # 播客列表
├── studio/page.tsx               # 新建播客（主题输入对话框）
└── studio/[podcastId]/page.tsx   # 播客工作台（无限画布）
```

---

## 前端核心组件

### 组件树
```
Studio（播客工作台）
├── TopBar - 顶部工具栏
│   ├── PodcastTitle - 播客标题
│   ├── AutoSaveIndicator - 自动保存状态
│   ├── SaveButton - 手动保存（导出MD）
│   └── ZoomControls - 缩放控制
├── InfiniteCanvas - 无限画布（React Flow）
│   ├── RootNode - 根节点（蓝色，最大）
│   ├── TopicNode - 子话题节点（绿色，中等）
│   │   └── ActionButtons: 生成演讲稿 / 展开子话题
│   ├── ContentNode - 内容节点（橙色，可折叠/展开）
│   │   └── StreamingContent: 流式内容显示
│   ├── EndingNode - 结束语节点（红色）
│   ├── MoreButton - 「更多」按钮（灰色虚线）
│   └── ConnectionEdge - 节点连接线
```

### 无限画布交互
- 子话题 → 父节点下方垂直排列，间距 80px
- 内容节点 → 父话题右侧展开
- "更多"按钮 → 倒数第二个位置
- "结束语" → 始终最后一个
- 新节点生成后 → 画布自动平移聚焦
- 内容展开时 → 节点自动放大便于阅读
- 内容折叠时 → 缩小为紧凑标题卡片

### 节点视觉
| 节点类型 | 颜色 | 大小 | 形状 |
|---------|------|------|------|
| 根节点 | 蓝色/靛蓝 | 最大 | 圆角矩形，加粗边框 |
| 子话题 | 绿色/青色 | 中等 | 圆角矩形 |
| 内容节点 | 橙色/琥珀色 | 可变 | 卡片式 |
| 结束语 | 红色/深红 | 中等 | 圆角矩形，虚线边框 |
| "更多" | 灰色 | 小 | 虚线圆角矩形 |

---

## 状态管理（Zustand Store）

```
PodcastStore
├── podcast - 当前播客信息
├── nodes - Map<nodeId, Node> 所有节点
├── selectedPath - nodeId[] 用户选择的路径
├── activeNodeId - 当前操作的节点
├── streamingState - { isStreaming, targetNodeId, buffer }
├── canvasState - { zoom, position }
├── autoSaveState - { isDirty, lastSaveAt, saveStatus }
└── actions - generateTopics / generateContent / generateEnding / loadMoreTopics / toggleNodeExpand / selectNode / manualSave / autoSave
```

---

## API 设计

### 播客管理
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/podcast` | 创建新播客 |
| GET | `/api/podcast` | 获取播客列表 |
| GET | `/api/podcast/[id]` | 获取播客详情 |
| PUT | `/api/podcast/[id]/autosave` | 自动保存 |
| DELETE | `/api/podcast/[id]` | 删除播客 |

### AI 生成
| 方法 | 路径 | 响应方式 |
|------|------|----------|
| POST | `/api/generate/topics` | JSON（6-8个子话题） |
| POST | `/api/generate/content` | SSE 流式（演讲稿） |
| POST | `/api/generate/ending` | SSE 流式（结束语） |
| POST | `/api/generate/more-topics` | JSON（5个新子话题） |

### 导出
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/export/markdown` | 导出选中路径为 MD |

---

## AI 生成与上下文连贯性

### 上下文窗口构建
每次 AI 调用时构建上下文：
1. **System Prompt**：角色设定 + 风格要求（口语化、有情绪、有观点、有故事性）
2. **根节点主题**：始终保留
3. **已讨论路径**：按顺序列出所有已选择路径的标题和内容
4. **当前任务**：生成子话题 / 演讲稿 / 结束语

### 上下文压缩策略（路径过长时）
- 根节点主题 → 始终完整保留
- 最近 3-5 个节点 → 保留完整内容
- 更早的节点 → 压缩为标题 + 核心观点摘要
- 维护递进式全局摘要

### 内容风格要求
- 讲事实和脉络：围绕主题讲清来龙去脉、发展过程
- 有观点和思考：不是百科搬运，有独到见解和逻辑推理
- 讲得有意思：有故事性、叙事性，吸引人
- 有特点和个性：主播人设鲜明，情绪真实
- 能引发共鸣：让听者产生情感反应

### 子话题数量
- 初始生成：6-8 个
- 点击"更多"：追加 5 个
- "结束语"选项：固定在最后一个位置

---

## 自动保存机制

- 每 30 秒定时触发
- 仅在 `isDirty === true` 时执行保存
- 保存内容：画布状态 + 所有节点的批量 upsert
- 前端显示保存状态指示器

## 手动保存（导出 Markdown）

- 提取用户选中路径（`selectedPath`）的所有节点
- 按顺序拼接为完整的 Markdown 文档
- 保存到 `saved_podcasts` 表 + 提供下载

---

## 错误处理

| 场景 | 处理方式 |
|------|---------|
| AI 生成超时 | 保留已生成部分，显示重试按钮 |
| 网络断开 | 本地缓存状态，显示离线提示，恢复后自动保存 |
| AI 返回格式异常 | 重试一次，仍失败则显示错误和手动重试按钮 |
| 上下文过长 | 自动触发压缩策略，对用户透明 |
| 并发保存冲突 | 乐观更新 + 最后写入胜出 |

---

## 验证方式

1. **本地开发**：`npm run dev` 启动开发服务器
2. **数据库**：Supabase Dashboard 验证表结构和数据
3. **AI 生成**：手动测试子话题生成和流式演讲稿输出
4. **无限画布**：验证节点创建、展开/折叠、缩放平移
5. **自动保存**：开发者工具 Network 面板验证 30 秒定时保存
6. **导出**：导出 Markdown 验证内容完整性和格式
7. **认证**：测试注册、登录、登出流程
8. **RLS**：使用不同用户验证数据隔离
