# TODO App Design

## Overview

Next.js (App Router) + DynamoDB + shadcn/ui で構築するフル機能 TODO アプリ。
認証なし・単一ユーザー構成。ローカル開発は DynamoDB Local (Docker) を使用。

## Approach

App Router + Server Actions + DynamoDB。
API Routes を使わず、Server Actions で直接 DynamoDB と通信する。

## Data Model

DynamoDB テーブル `Todos`:

| 属性 | 型 | 説明 |
|---|---|---|
| `id` | String (PK) | UUID |
| `title` | String | TODO のタイトル |
| `completed` | Boolean | 完了フラグ |
| `category` | String | カテゴリ (例: 仕事, プライベート) |
| `priority` | String | 優先度 (high / medium / low) |
| `dueDate` | String (ISO) | 期日 (nullable) |
| `createdAt` | String (ISO) | 作成日時 |
| `updatedAt` | String (ISO) | 更新日時 |

## Directory Structure

```
src/
  app/
    layout.tsx          # Root layout
    page.tsx            # Main page (TODO list)
    actions.ts          # Server Actions (CRUD)
  components/
    todo-list.tsx       # TODO list display
    todo-item.tsx       # Individual TODO (edit/delete/toggle)
    todo-form.tsx       # TODO add form
    todo-filter.tsx     # Filter (category/priority/status)
  lib/
    dynamodb.ts         # DynamoDB client initialization
    todo-repository.ts  # DynamoDB CRUD operations
    types.ts            # Type definitions
docker-compose.yml      # DynamoDB Local
```

## Features

1. **Add** — Create TODO with title, category, priority, due date
2. **List** — Display all TODOs with filter and sort
3. **Toggle** — Checkbox to mark complete/incomplete
4. **Edit** — Inline edit for title, category, priority, due date
5. **Delete** — Delete TODO
6. **Filter** — Filter by category, priority, completion status

## Tech Stack

- Next.js (App Router, Server Actions)
- shadcn/ui + Tailwind CSS
- AWS SDK v3 (`@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`)
- DynamoDB Local (Docker)
