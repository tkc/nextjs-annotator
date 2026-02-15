# TODO App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Next.js App Router + DynamoDB + shadcn/ui でフル機能の TODO アプリを構築する

**Architecture:** App Router の Server Actions で DynamoDB Local と直接通信。クライアントコンポーネントで UI 操作、Server Actions で CRUD 処理。DynamoDB Local は Docker で起動。

**Tech Stack:** Next.js (App Router), shadcn/ui, Tailwind CSS, AWS SDK v3, DynamoDB Local (Docker)

---

### Task 1: Next.js プロジェクト初期化

**Files:**
- Create: プロジェクト全体 (`create-next-app`)

**Step 1: Next.js プロジェクトを作成**

```bash
cd /Users/tkc/github/next-js-2026
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

プロンプトが出たら:
- Would you like to use Turbopack? → Yes

**Step 2: 動作確認**

```bash
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスし、Next.js のデフォルトページが表示されることを確認。Ctrl+C で停止。

**Step 3: コミット**

```bash
git add -A
git commit -m "feat: initialize Next.js project with TypeScript, Tailwind, App Router"
```

---

### Task 2: shadcn/ui セットアップとコンポーネント追加

**Files:**
- Modify: `components.json` (自動生成)
- Create: `src/components/ui/*` (自動生成)

**Step 1: shadcn/ui を初期化**

```bash
npx shadcn@latest init -d
```

**Step 2: 必要なコンポーネントを追加**

```bash
npx shadcn@latest add button input checkbox badge select dialog label
```

**Step 3: コミット**

```bash
git add -A
git commit -m "feat: add shadcn/ui with button, input, checkbox, badge, select, dialog, label"
```

---

### Task 3: Docker Compose で DynamoDB Local セットアップ

**Files:**
- Create: `docker-compose.yml`
- Create: `scripts/init-dynamodb.sh`

**Step 1: docker-compose.yml を作成**

```yaml
services:
  dynamodb-local:
    image: amazon/dynamodb-local:latest
    container_name: todo-dynamodb
    ports:
      - "8000:8000"
    command: "-jar DynamoDBLocal.jar -sharedDb -inMemory"
```

**Step 2: テーブル初期化スクリプトを作成**

`scripts/init-dynamodb.sh`:

```bash
#!/bin/bash
aws dynamodb create-table \
  --table-name Todos \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000 \
  --region ap-northeast-1 \
  --no-cli-pager

echo "Table 'Todos' created successfully."
```

**Step 3: DynamoDB Local を起動してテーブルを作成**

```bash
docker compose up -d
chmod +x scripts/init-dynamodb.sh
bash scripts/init-dynamodb.sh
```

期待結果: テーブルが作成される

**Step 4: テーブルが存在することを確認**

```bash
aws dynamodb list-tables --endpoint-url http://localhost:8000 --region ap-northeast-1
```

期待結果: `{"TableNames": ["Todos"]}`

**Step 5: コミット**

```bash
git add docker-compose.yml scripts/init-dynamodb.sh
git commit -m "feat: add DynamoDB Local with Docker Compose and init script"
```

---

### Task 4: 型定義と DynamoDB クライアント

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/dynamodb.ts`

**Step 1: AWS SDK をインストール**

```bash
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

**Step 2: 型定義ファイルを作成**

`src/lib/types.ts`:

```typescript
export type Priority = "high" | "medium" | "low";

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  category: string;
  priority: Priority;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTodoInput {
  title: string;
  category: string;
  priority: Priority;
  dueDate: string | null;
}

export interface UpdateTodoInput {
  id: string;
  title?: string;
  completed?: boolean;
  category?: string;
  priority?: Priority;
  dueDate?: string | null;
}
```

**Step 3: DynamoDB クライアントを作成**

`src/lib/dynamodb.ts`:

```typescript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-northeast-1",
  endpoint: process.env.DYNAMODB_ENDPOINT || "http://localhost:8000",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "local",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "local",
  },
});

export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

export const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "Todos";
```

**Step 4: コミット**

```bash
git add src/lib/types.ts src/lib/dynamodb.ts package.json package-lock.json
git commit -m "feat: add Todo types and DynamoDB client configuration"
```

---

### Task 5: TODO リポジトリ (CRUD 操作)

**Files:**
- Create: `src/lib/todo-repository.ts`

**Step 1: リポジトリを作成**

`src/lib/todo-repository.ts`:

```typescript
import { randomUUID } from "crypto";
import {
  PutCommand,
  GetCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME } from "./dynamodb";
import { Todo, CreateTodoInput, UpdateTodoInput } from "./types";

export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const now = new Date().toISOString();
  const todo: Todo = {
    id: randomUUID(),
    title: input.title,
    completed: false,
    category: input.category,
    priority: input.priority,
    dueDate: input.dueDate || null,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: todo,
    })
  );

  return todo;
}

export async function getAllTodos(): Promise<Todo[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
    })
  );

  return (result.Items as Todo[]) || [];
}

export async function getTodo(id: string): Promise<Todo | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { id },
    })
  );

  return (result.Item as Todo) || null;
}

export async function updateTodo(input: UpdateTodoInput): Promise<Todo | null> {
  const expressions: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  if (input.title !== undefined) {
    expressions.push("#title = :title");
    names["#title"] = "title";
    values[":title"] = input.title;
  }
  if (input.completed !== undefined) {
    expressions.push("#completed = :completed");
    names["#completed"] = "completed";
    values[":completed"] = input.completed;
  }
  if (input.category !== undefined) {
    expressions.push("#category = :category");
    names["#category"] = "category";
    values[":category"] = input.category;
  }
  if (input.priority !== undefined) {
    expressions.push("#priority = :priority");
    names["#priority"] = "priority";
    values[":priority"] = input.priority;
  }
  if (input.dueDate !== undefined) {
    expressions.push("#dueDate = :dueDate");
    names["#dueDate"] = "dueDate";
    values[":dueDate"] = input.dueDate;
  }

  expressions.push("#updatedAt = :updatedAt");
  names["#updatedAt"] = "updatedAt";
  values[":updatedAt"] = new Date().toISOString();

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id: input.id },
      UpdateExpression: `SET ${expressions.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: "ALL_NEW",
    })
  );

  return (result.Attributes as Todo) || null;
}

export async function deleteTodo(id: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { id },
    })
  );
}
```

**Step 2: コミット**

```bash
git add src/lib/todo-repository.ts
git commit -m "feat: add todo repository with DynamoDB CRUD operations"
```

---

### Task 6: Server Actions

**Files:**
- Create: `src/app/actions.ts`

**Step 1: Server Actions を作成**

`src/app/actions.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import {
  createTodo,
  updateTodo,
  deleteTodo,
} from "@/lib/todo-repository";
import { Priority } from "@/lib/types";

export async function addTodoAction(formData: FormData) {
  const title = formData.get("title") as string;
  const category = formData.get("category") as string;
  const priority = (formData.get("priority") as Priority) || "medium";
  const dueDate = (formData.get("dueDate") as string) || null;

  if (!title?.trim()) return;

  await createTodo({
    title: title.trim(),
    category: category || "未分類",
    priority,
    dueDate: dueDate || null,
  });

  revalidatePath("/");
}

export async function toggleTodoAction(id: string, completed: boolean) {
  await updateTodo({ id, completed });
  revalidatePath("/");
}

export async function updateTodoAction(
  id: string,
  data: {
    title?: string;
    category?: string;
    priority?: Priority;
    dueDate?: string | null;
  }
) {
  await updateTodo({ id, ...data });
  revalidatePath("/");
}

export async function deleteTodoAction(id: string) {
  await deleteTodo(id);
  revalidatePath("/");
}
```

**Step 2: コミット**

```bash
git add src/app/actions.ts
git commit -m "feat: add server actions for todo CRUD"
```

---

### Task 7: TODO フォームコンポーネント

**Files:**
- Create: `src/components/todo-form.tsx`

**Step 1: フォームコンポーネントを作成**

`src/components/todo-form.tsx`:

```tsx
"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addTodoAction } from "@/app/actions";

const CATEGORIES = ["仕事", "プライベート", "買い物", "勉強", "その他"];

export function TodoForm() {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    await addTodoAction(formData);
    formRef.current?.reset();
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <Input
          name="title"
          placeholder="新しいTODOを入力..."
          required
          className="flex-1"
        />
        <Button type="submit">追加</Button>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Select name="category" defaultValue="未分類">
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="カテゴリ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="未分類">未分類</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select name="priority" defaultValue="medium">
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="優先度" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high">高</SelectItem>
            <SelectItem value="medium">中</SelectItem>
            <SelectItem value="low">低</SelectItem>
          </SelectContent>
        </Select>
        <Input name="dueDate" type="date" className="w-[160px]" />
      </div>
    </form>
  );
}
```

**Step 2: コミット**

```bash
git add src/components/todo-form.tsx
git commit -m "feat: add todo form component"
```

---

### Task 8: TODO アイテムコンポーネント

**Files:**
- Create: `src/components/todo-item.tsx`

**Step 1: アイテムコンポーネントを作成**

`src/components/todo-item.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  toggleTodoAction,
  updateTodoAction,
  deleteTodoAction,
} from "@/app/actions";
import { Todo, Priority } from "@/lib/types";

const CATEGORIES = ["未分類", "仕事", "プライベート", "買い物", "勉強", "その他"];

const priorityColors: Record<Priority, string> = {
  high: "destructive",
  medium: "default",
  low: "secondary",
} as const;

const priorityLabels: Record<Priority, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export function TodoItem({ todo }: { todo: Todo }) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(todo.title);
  const [category, setCategory] = useState(todo.category);
  const [priority, setPriority] = useState<Priority>(todo.priority);
  const [dueDate, setDueDate] = useState(todo.dueDate || "");

  async function handleToggle() {
    await toggleTodoAction(todo.id, !todo.completed);
  }

  async function handleSave() {
    await updateTodoAction(todo.id, {
      title,
      category,
      priority,
      dueDate: dueDate || null,
    });
    setIsEditing(false);
  }

  async function handleDelete() {
    await deleteTodoAction(todo.id);
  }

  function handleCancel() {
    setTitle(todo.title);
    setCategory(todo.category);
    setPriority(todo.priority);
    setDueDate(todo.dueDate || "");
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 p-4 border rounded-lg bg-muted/50">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトル"
        />
        <div className="flex gap-2 flex-wrap">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">高</SelectItem>
              <SelectItem value="medium">中</SelectItem>
              <SelectItem value="low">低</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-[160px]"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            キャンセル
          </Button>
          <Button size="sm" onClick={handleSave}>
            保存
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <Checkbox
        checked={todo.completed}
        onCheckedChange={handleToggle}
      />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            todo.completed ? "line-through text-muted-foreground" : ""
          }`}
        >
          {todo.title}
        </p>
        <div className="flex gap-2 mt-1 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {todo.category}
          </Badge>
          <Badge
            variant={priorityColors[todo.priority] as "destructive" | "default" | "secondary"}
            className="text-xs"
          >
            {priorityLabels[todo.priority]}
          </Badge>
          {todo.dueDate && (
            <span className="text-xs text-muted-foreground">
              期限: {todo.dueDate}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
          編集
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDelete}>
          削除
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: コミット**

```bash
git add src/components/todo-item.tsx
git commit -m "feat: add todo item component with edit/delete/toggle"
```

---

### Task 9: フィルターコンポーネント

**Files:**
- Create: `src/components/todo-filter.tsx`

**Step 1: フィルターコンポーネントを作成**

`src/components/todo-filter.tsx`:

```tsx
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = ["未分類", "仕事", "プライベート", "買い物", "勉強", "その他"];

interface TodoFilterProps {
  categoryFilter: string;
  priorityFilter: string;
  statusFilter: string;
  onCategoryChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

export function TodoFilter({
  categoryFilter,
  priorityFilter,
  statusFilter,
  onCategoryChange,
  onPriorityChange,
  onStatusChange,
}: TodoFilterProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      <Select value={categoryFilter} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="カテゴリ" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全カテゴリ</SelectItem>
          {CATEGORIES.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={priorityFilter} onValueChange={onPriorityChange}>
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="優先度" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全優先度</SelectItem>
          <SelectItem value="high">高</SelectItem>
          <SelectItem value="medium">中</SelectItem>
          <SelectItem value="low">低</SelectItem>
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="状態" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべて</SelectItem>
          <SelectItem value="active">未完了</SelectItem>
          <SelectItem value="completed">完了</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
```

**Step 2: コミット**

```bash
git add src/components/todo-filter.tsx
git commit -m "feat: add todo filter component"
```

---

### Task 10: TODO リストコンポーネント

**Files:**
- Create: `src/components/todo-list.tsx`

**Step 1: リストコンポーネントを作成**

`src/components/todo-list.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Todo } from "@/lib/types";
import { TodoItem } from "./todo-item";
import { TodoFilter } from "./todo-filter";

export function TodoList({ todos }: { todos: Todo[] }) {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredTodos = todos
    .filter((todo) => {
      if (categoryFilter !== "all" && todo.category !== categoryFilter)
        return false;
      if (priorityFilter !== "all" && todo.priority !== priorityFilter)
        return false;
      if (statusFilter === "active" && todo.completed) return false;
      if (statusFilter === "completed" && !todo.completed) return false;
      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  return (
    <div className="space-y-4">
      <TodoFilter
        categoryFilter={categoryFilter}
        priorityFilter={priorityFilter}
        statusFilter={statusFilter}
        onCategoryChange={setCategoryFilter}
        onPriorityChange={setPriorityFilter}
        onStatusChange={setStatusFilter}
      />
      <div className="space-y-2">
        {filteredTodos.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            TODOがありません
          </p>
        ) : (
          filteredTodos.map((todo) => <TodoItem key={todo.id} todo={todo} />)
        )}
      </div>
      <p className="text-sm text-muted-foreground text-right">
        {filteredTodos.filter((t) => !t.completed).length} 件の未完了 / 全
        {filteredTodos.length} 件
      </p>
    </div>
  );
}
```

**Step 2: コミット**

```bash
git add src/components/todo-list.tsx
git commit -m "feat: add todo list component with filtering and sorting"
```

---

### Task 11: メインページ

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`

**Step 1: layout.tsx を更新 (タイトルとメタデータ)**

`src/app/layout.tsx` の metadata を以下に変更:

```typescript
export const metadata: Metadata = {
  title: "TODO App",
  description: "Next.js + DynamoDB TODO Application",
};
```

**Step 2: page.tsx を書き換え**

`src/app/page.tsx`:

```tsx
import { getAllTodos } from "@/lib/todo-repository";
import { TodoForm } from "@/components/todo-form";
import { TodoList } from "@/components/todo-list";

export const dynamic = "force-dynamic";

export default async function Home() {
  const todos = await getAllTodos();

  return (
    <main className="container mx-auto max-w-2xl py-10 px-4">
      <h1 className="text-3xl font-bold mb-8">TODO App</h1>
      <div className="space-y-8">
        <TodoForm />
        <TodoList todos={todos} />
      </div>
    </main>
  );
}
```

**Step 3: コミット**

```bash
git add src/app/page.tsx src/app/layout.tsx
git commit -m "feat: add main page with todo form and list"
```

---

### Task 12: 環境変数と .env ファイル

**Files:**
- Create: `.env.local`
- Create: `.env.example`

**Step 1: .env.local を作成**

```
DYNAMODB_ENDPOINT=http://localhost:8000
DYNAMODB_TABLE_NAME=Todos
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
```

**Step 2: .env.example を作成 (同じ内容)**

```
DYNAMODB_ENDPOINT=http://localhost:8000
DYNAMODB_TABLE_NAME=Todos
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
```

**Step 3: .gitignore に .env.local があることを確認**

Next.js の .gitignore にはデフォルトで `.env*.local` が含まれている。

**Step 4: コミット**

```bash
git add .env.example
git commit -m "feat: add environment variable example file"
```

---

### Task 13: 動作確認

**Step 1: DynamoDB Local を起動**

```bash
docker compose up -d
bash scripts/init-dynamodb.sh
```

**Step 2: アプリを起動**

```bash
npm run dev
```

**Step 3: ブラウザで動作確認**

`http://localhost:3000` にアクセスし、以下を確認:

1. TODO の追加ができる
2. カテゴリ・優先度・期日を設定できる
3. チェックボックスで完了/未完了を切り替えられる
4. 編集ボタンでインライン編集ができる
5. 削除ボタンで削除できる
6. フィルターで絞り込みができる

**Step 4: 問題があれば修正してコミット**
