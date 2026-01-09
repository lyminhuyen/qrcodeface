# QRCode Face Gallery

## Communication Style

- **Ngôn ngữ**: Tiếng Việt (code/tech terms giữ tiếng Anh)
- **Tone**: Casual, ngắn gọn
- **Format**: Bullet points, tables khi cần
- **Ghi chú**: Không cần giải thích dài dòng
- When presenting options, comparisons, or UI concepts, use ASCII diagrams and box-drawing characters (┌─┐│└┘├┬┤┴┼) instead of bullet lists.
- When asking questions that need multi-word answers , use AskUserQuestion tool. For yes/no or single-word answers, just ask directly.
---

## Project Context

Gallery hiển thị QRCode Face từ game Naraka: Bladepoint.
- **Tech**: Next.js 16 + Tailwind CSS
- **Data**: JSON files (no database)
- **Deploy**: Vercel (static)
- **Workflow**: Local-first + Git sync

---

## Key Locations

```
docs/                  # Documentation (local only)
journal/YYYY/MM_DD.txt # Daily work logs (local only)
src/data/qrcodes.json  # Crawled data (local only)
src/data/characters.json # Character definitions
src/app/admin/         # Admin panel (local only)
scripts/crawler.ts     # Puppeteer crawler
```

---

## Quick Commands

```bash
# Dev
npm run dev

# Crawl from USER profile
DS163_USER_ID=xxx npx ts-node scripts/crawler.ts

# Crawl from TOPIC (recommended - more data)
DS163_TOPIC=刘炼捏脸 npx ts-node scripts/crawler.ts

# Admin (local only)
http://localhost:3000/admin
```

---

## Docs Update Workflow

**Option C: Batch cuối session**

```
User hỏi → Thảo luận → Accept → Claude code → ... → Cuối session
                                                         ↓
                                          User: "tổng kết hôm nay đi"
                                                         ↓
                                          Claude update journal + changelog
```

- Không tự động update sau mỗi task
- Cuối session user kêu "tổng kết" → Claude ghi 1 lần
- Files cần update: `journal/YYYY/MM_DD.txt` + `docs/CHANGELOG.txt`

---

## Rules

1. **Docs**: Chỉ update khi user kêu "tổng kết"
2. **Journal**: Ghi vào `journal/YYYY/MM_DD.txt` khi tổng kết
3. **Data**: `qrcodes.json` là local only - không commit
4. **Admin**: Chỉ hoạt động local (Vercel không write file)

---

## Gitignored (Local Only)

```
.claude/
CLAUDE.md
journal/
docs/
```

---

## Agent Efficiency

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TOOL              │ KHI NÀO DÙNG                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  TodoWrite         │ Task phức tạp, nhiều bước                             │
│                    │ Track progress để user thấy                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  AskUserQuestion   │ Câu hỏi cần multi-word answer                         │
│                    │ Chọn giữa nhiều options                               │
│                    │ (yes/no thì hỏi trực tiếp)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  Task (Agent)      │ Explore codebase lớn                                  │
│                    │ Research trước khi implement                          │
│                    │ Chạy song song nhiều việc                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  EnterPlanMode     │ Feature phức tạp, nhiều cách implement                │
│                    │ Cần user approve trước khi code                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  WebSearch         │ Tìm docs, best practices                              │
│                    │ Giải quyết lỗi lạ, tìm giải pháp                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  WebFetch          │ Đọc nội dung docs online                              │
│                    │ Check API docs, examples                              │
└─────────────────────────────────────────────────────────────────────────────┘
```
