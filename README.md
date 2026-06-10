# NoSoloChat

Web messenger for small audiences (up to 100 concurrent users).

## Stack

- **Frontend:** React, Vite, TypeScript, React Router, Socket.IO Client
- **Backend:** Node.js, Express, TypeScript, Socket.IO
- **Database:** SQLite, Prisma ORM

## Prerequisites

- Node.js 20+
- npm 10+

## Setup

```bash
npm install
```

Copy environment variables for the backend (already provided as `.env` in development):

```bash
cp backend/.env.example backend/.env
```

Initialize the SQLite database:

```bash
npm run prisma:migrate --workspace=backend
```

When prompted for a migration name, enter `init`.

## Development

Start backend and frontend in separate terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Build

```bash
npm run build
```

## Manual verification (Phase 10 — Polish & Features)

1. App title shows **NoSoloChat** on login and home screen.
2. **Private chat request:** User A sends request → User B sees notification → Accept creates chat for both; Reject shows toast to A.
3. **Group invites:** Organizer creates group → invitees get notification → Accept joins group; Decline creates group without them.
4. **Group messages** show sender username above incoming messages.
5. **Group members:** Click participant count or menu → see member list.
6. **Leave group:** Menu → Выйти из группы — chat disappears from list.
7. **Delete chat:** Menu → Удалить чат — hidden only for current user.
8. **Block:** In private chat menu → Заблокировать — partner cannot send; blocked user sees red banner.
9. Apply migration: `npm run prisma:migrate --workspace=backend` (name: `phase10_features`).

## Manual verification (Phase 9 — Online Presence)

1. Start backend and frontend, log in as two users (`alice` and `bob`) in different browsers.
2. Create a private chat between them.
3. With both online — green dot appears on the private chat in the list; chat header shows **В сети**.
4. Close `bob`'s browser/tab — `alice` sees the dot disappear; header updates to **Был(а) недавно** or **Не в сети**.
5. Reopen `bob` — status returns to **В сети** without page refresh.
6. API (with JWT): `GET /api/users/:id/status` returns `{ isOnline, lastSeen }`.

## Manual verification (Phase 8 — Group Chats)

1. Log in, click **Создать группу**.
2. Enter group name and add 2+ participants via search (min 2 chars).
3. Group appears in chat list with the chosen name.
4. Open group chat — all members can send and receive messages in real time.
5. Other invited users see the new group in their list without refresh.
6. API: `POST /api/chats/group` body `{"name":"Team","members":[2,3]}`

## Manual verification (Phase 7 — Socket.IO)

1. Start backend and frontend, log in as two users in different browsers.
2. Open the same chat in both windows.
3. Send a message from user A — it appears instantly for user B without refresh.
4. Return to chat list — last message preview updates in real time.
5. Unread badge updates when receiving messages in another chat.

## Manual verification (Phase 6 — Messaging)

1. Start backend and frontend, create a chat between two users.
2. Open the chat, send messages — they appear instantly in the thread.
3. Reload the page — messages remain.
4. Return to chat list — last message preview and time are updated.
5. API checks (with JWT):
   - `GET /api/chats/:chatId/messages?page=1&limit=50`
   - `POST /api/chats/:chatId/messages` body `{"content":"Привет"}`
   - `POST /api/chats/:chatId/read`

## Manual verification (Phase 5 — Chat List)

1. Start backend and frontend, log in as `admin`.
2. Create private chats with 2+ users via **Новый чат**.
3. Chat list shows usernames, preview `Нет сообщений`, sorted by creation time.
4. Empty state shows `У вас пока нет чатов` when no chats exist.
5. API: `GET /api/chats` with JWT returns chat array with `unreadCount` (0 until Phase 6 messages).

## Manual verification (Phase 4 — User Search)

1. Start backend and frontend.
2. Register two users (e.g. `alice` and `bob`) in separate browsers or incognito windows.
3. Log in as `alice`, click **Новый чат**, search `bo` — `bob` should appear.
4. Click **Начать чат** — message shows created chat ID.
5. Repeat with the same user — same chat ID returned (no duplicate).
6. Search with 1 character — hint to enter at least 2 characters.
7. API checks (with JWT):
   - `GET /api/users/search?q=bo`
   - `POST /api/chats/private` body `{"userId":2}`

## Manual verification (Phase 3 — Database)

1. Apply migrations:
   ```bash
   npm run prisma:migrate --workspace=backend
   ```
   Migration name: `add_messenger_tables`

2. Verify all tables and persistence:
   ```bash
   npm run db:verify --workspace=backend
   ```
   Expected output: `Database verification passed`

3. Restart the backend, then log in as `admin` / `admin` — user data must still be present.

4. Optional: inspect data in Prisma Studio:
   ```bash
   npx prisma studio --schema backend/prisma/schema.prisma
   ```

## Project structure

```
backend/     Express API, Socket.IO, Prisma
frontend/    React SPA
```
