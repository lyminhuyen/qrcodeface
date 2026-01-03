# QRCode Face Gallery - Project Idea

---

## Communication Style

<!-- User tự điền -->

- **Ngôn ngữ**:
- **Tone**:
- **Format ưu thích**:
- **Ghi chú khác**:

---

## Project Logs & Journal

### Log files structure
```
logs/
├── dev.log           # Log chung khi dev
├── crawler.log       # Log khi chạy crawler
└── error.log         # Log lỗi
```

### Journal file
```
journal/
└── work_journal.md   # Ghi lại tiến độ công việc
```

**Format journal entry:**
```markdown
## [YYYY-MM-DD HH:mm] - Session #X

### Đã làm:
- Task 1
- Task 2

### Đang làm dở:
- Task đang pending

### Cần làm tiếp:
- Next steps

### Notes:
- Ghi chú thêm
```

---

## Hook: Token Warning

Khi gần hết token trong conversation, Claude sẽ tự động:
1. Thông báo cho user
2. Ghi lại progress vào `journal/work_journal.md`

**Hook script** (`.claude/hooks/pre-exit.sh`):
```bash
#!/bin/bash
# Hook chạy khi session sắp kết thúc

JOURNAL_FILE="journal/work_journal.md"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M")

# Append entry to journal
cat >> "$JOURNAL_FILE" << EOF

## [$TIMESTAMP] - Session End (Token limit)

### Progress saved automatically
- Check conversation history for details

---
EOF

echo "📝 Progress saved to $JOURNAL_FILE"
```

---

## Tổng quan

Xây dựng web gallery hiển thị các ảnh QRCode Face từ game **Naraka: Bladepoint (永劫无间)**, cho phép người dùng dễ dàng tìm và sử dụng mã để tạo khuôn mặt nhân vật trong game.

## Nguồn dữ liệu

- **Source**: Trang 大神 (ds.163.com) - cộng đồng game của NetEase
- **Cấu trúc dữ liệu có sẵn**:
  - `importQrCodeData`: Chứa thông tin QRCode
  - `imgLocalName`: Tên file ảnh (timestamp-based)
  - `createTime`: Unix timestamp (ms) - dùng để filter theo thời gian
  - `appRole`: Thông tin nhân vật/người chơi
  - 2 loại QRCode: **捏脸码** (mã khuôn mặt) và **发型码** (mã kiểu tóc)

## Đánh giá ý tưởng

### Điểm mạnh
1. **Nhu cầu thực tế**: Cộng đồng Naraka khá lớn, nhiều người muốn tìm QRCode face đẹp
2. **Dữ liệu có sẵn**: Đã có cấu trúc JSON rõ ràng, dễ parse
3. **Tính năng hữu ích**: Filter theo nhân vật + thời gian giúp tìm kiếm nhanh
4. **Deploy đơn giản**: Vercel hỗ trợ tốt cho static site hoặc Next.js

### Thách thức cần lưu ý
1. **Bản quyền ảnh**: Cần xem xét việc crawl và re-host ảnh từ nguồn gốc
2. **Cập nhật dữ liệu**: Cần có cơ chế sync data mới từ source
3. **Phân loại nhân vật**: Cần xác định danh sách nhân vật để tag ảnh

## Đề xuất Tech Stack

```
Frontend:  Next.js 14+ (App Router)
Styling:   Tailwind CSS
Database:  JSON files / Supabase (nếu cần dynamic)
Hosting:   Vercel
Image:     Cloudinary hoặc Vercel Image Optimization
```

## Tính năng đề xuất

### MVP (Minimum Viable Product)
- [ ] Hiển thị gallery ảnh QRCode dạng grid
- [ ] Filter theo nhân vật (dropdown/tabs)
- [ ] Filter theo tháng/năm (date picker hoặc range)
- [ ] Lightbox xem ảnh lớn
- [ ] Download ảnh (ảnh gốc)
- [ ] Category "Chưa phân loại" cho post không có hashtag

### Admin Features
- [ ] Trang admin đơn giản (protected route)
- [ ] Xem danh sách ảnh "Chưa phân loại"
- [ ] Dropdown chọn nhân vật để tag
- [ ] Option "+ Thêm nhân vật mới" trong dropdown
  - Popup form: ID, tên EN, tên CN, topicTag
  - Tạo xong -> tự động tag luôn ảnh đang chọn
  - Cập nhật characters.json
- [ ] Sau khi tag -> ảnh tự động chuyển qua category nhân vật đó
- [ ] Bulk tag (chọn nhiều ảnh, tag 1 lần)

### Nice-to-have
- [ ] Search theo tên/tag
- [ ] Favorite/Bookmark ảnh
- [ ] Copy QRCode link nhanh
- [ ] Dark/Light mode
- [ ] Responsive (mobile-friendly)
- [ ] Infinite scroll hoặc pagination
- [ ] User upload ảnh QRCode (cần duyệt trước khi public)

## Cấu trúc thư mục đề xuất

```
qrcodeface/
├── .claude/
│   └── hooks/
│       └── pre-exit.sh   # Hook khi gần hết token
├── logs/
│   ├── dev.log           # Log dev chung
│   ├── crawler.log       # Log crawler
│   └── error.log         # Log lỗi
├── journal/
│   └── work_journal.md   # Nhật ký công việc
├── public/
│   └── images/           # Ảnh QRCode đã crawl
├── src/
│   ├── app/
│   │   ├── page.tsx      # Trang chủ gallery
│   │   ├── [character]/  # Dynamic route theo nhân vật
│   │   └── admin/        # Admin panel (protected)
│   │       ├── page.tsx  # Dashboard
│   │       └── untagged/ # Quản lý ảnh chưa phân loại
│   ├── components/
│   │   ├── Gallery.tsx
│   │   ├── FilterBar.tsx
│   │   ├── ImageCard.tsx
│   │   ├── Lightbox.tsx
│   │   └── admin/
│   │       └── TagSelector.tsx
│   └── data/
│       ├── qrcodes.json  # Data đã parse từ source
│       └── characters.json # Danh sách nhân vật
├── scripts/
│   └── crawler.ts        # Script crawl data
└── ...
```

## Danh sách nhân vật Naraka (để phân loại)

Cần xác định danh sách nhân vật chính trong game:
- Viper Ning
- Temulch
- Matari
- Tarka Ji
- Kurumi
- Tianhai
- Yoto Hime
- ...và các nhân vật khác

## Crawl Data

### User target
- **URL**: `https://ds.163.com/user/abe6cbb14ebd4cba9ff2aa0c7af97734/`
- **UID**: `abe6cbb14ebd4cba9ff2aa0c7af97734`

### Cấu trúc API Response

```json
{
  "result": {
    "nextRangeParam": { "maxTime": 1730804532448, "minTime": 0 },
    "feeds": [
      {
        "id": "67583726c6bb1a6d893299af",
        "uid": "abe6cbb14ebd4cba9ff2aa0c7af97734",
        "createTime": 1733834532201,
        "content": "{\"body\":{\"text\":\"...\",\"media\":[{\"url\":\"https://ok.166.net/...\"}]}}",
        "topicInfoList": [
          { "topicName": "永劫无间捏脸站" },
          { "topicName": "魏轻捏脸" }  // <-- Tên nhân vật!
        ],
        "attributeInfoList": [{
          "type": "QR_CODE",
          "externalData": {
            "importQrCodeData": {
              "imgList": [
                { "imgLocalName": "1733394002.jpg", "url": "https://q.ds.163.com/..." }
              ]
            }
          }
        }]
      }
    ]
  }
}
```

### Mapping nhân vật từ topicInfoList

| Topic (Tiếng Trung) | Character |
|---------------------|-----------|
| 魏轻捏脸 | Wei Qing |
| 玉玲珑捏脸 | Viper Ning |
| 胡桃捏脸 | Tarka Ji |
| 妖刀姬捏脸 | Yoto Hime |
| 天海捏脸 | Tianhai |
| 迦南捏脸 | Kurumi |
| ...cần bổ sung thêm... | |

### Cách crawl

**Option 1: Dùng Puppeteer/Playwright (Recommended)**
- Trang là SPA, cần render JS để lấy data
- Intercept network request để bắt API response
- Hoặc extract từ `window.__INITIAL_STATE__`

**Option 2: Reverse API (nếu tìm được endpoint)**
- Cần tìm đúng API endpoint + headers
- Có thể cần cookie/auth từ browser

### Script Crawl (Puppeteer)

```typescript
// scripts/crawler.ts
import puppeteer from 'puppeteer';
import fs from 'fs';

const USER_ID = 'abe6cbb14ebd4cba9ff2aa0c7af97734';
const URL = `https://ds.163.com/user/${USER_ID}/`;

async function crawl() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  let feedsData: any[] = [];

  // Intercept API responses
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/feed/') && response.status() === 200) {
      try {
        const json = await response.json();
        if (json.result?.feeds) {
          feedsData.push(...json.result.feeds);
        }
      } catch {}
    }
  });

  await page.goto(URL, { waitUntil: 'networkidle0' });

  // Scroll để load thêm posts
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);
  }

  await browser.close();

  // Parse và lưu data
  const parsed = feedsData.map(feed => ({
    id: feed.id,
    createTime: feed.createTime,
    character: extractCharacter(feed.topicInfoList),
    images: extractImages(feed.content),
    qrCodes: extractQRCodes(feed.attributeInfoList)
  }));

  fs.writeFileSync('data/qrcodes.json', JSON.stringify(parsed, null, 2));
}

function extractCharacter(topics: any[]) {
  const charTopic = topics?.find(t => t.topicName.includes('捏脸'));
  return charTopic?.topicName.replace('捏脸', '') || 'Unknown';
}

function extractImages(content: string) {
  const parsed = JSON.parse(content);
  return parsed.body?.media?.map((m: any) => m.url) || [];
}

function extractQRCodes(attrs: any[]) {
  const qrAttr = attrs?.find(a => a.type === 'QR_CODE');
  return qrAttr?.externalData?.importQrCodeData?.imgList || [];
}

crawl();
```

## Bước tiếp theo

1. **Phase 1**: Setup project + cài Puppeteer
2. **Phase 2**: Chạy crawler, lưu JSON
3. **Phase 3**: Setup Next.js + Tailwind
4. **Phase 4**: Build gallery components
5. **Phase 5**: Deploy Vercel

---

**Kết luận**: Crawl tiếng Trung hoàn toàn OK - data là JSON thuần. Recommend dùng Puppeteer để crawl vì trang là SPA.
