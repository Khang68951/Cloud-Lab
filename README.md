# Learning Lab

Web học theo hướng **thực hành là chính**, gồm nhiều mảng (domain). Mảng đầu tiên là **CloudLab**: học AWS / Cloud System Design. Chạy 100% trên máy, miễn phí, song ngữ Việt/Anh, có theme sáng/tối.
Kế hoạch đầy đủ nằm trong [PLAN.md](PLAN.md).

## Chạy app

Yêu cầu: Node.js ≥ 22.13 (đã có sẵn npm). Không cần cài database, Docker hay dịch vụ trả phí nào.

```bash
npm install        # chỉ cần chạy lần đầu
npm run dev        # API :8787 + web :5173
```

Mở http://localhost:5173: trang chủ **Learning Lab** liệt kê các mảng học, bấm **CloudLab** để vào mảng Cloud (`/cloud`).

**Nội dung hiện có (CloudLab)**: 12 khoá (Core + 9 khoá chuyên sâu + Lab Practice + System Design), 89 bài học song ngữ, 296 bài tập, trong đó có 47 thử thách trong Lab. Xem chương trình học đầy đủ trong [COURSE-PLAN.md](COURSE-PLAN.md).

## Học gì, ở đâu

| Trang | Dùng để |
|---|---|
| **Learning Lab** (`/`) | Trang chủ chung: các mảng học, tiến độ tổng, học tiếp bài gần nhất |
| **Cài đặt** (`/settings`) | Ngôn ngữ, theme, tên hiển thị trên chứng nhận, xuất/nhập/đặt lại dữ liệu (dùng chung mọi mảng) |
| **Tìm kiếm** (Ctrl+K) | Tìm khoá, bài, thuật ngữ của mọi mảng, cộng thêm thứ riêng của từng mảng (dịch vụ AWS, thử thách Lab) |

Trang **dùng chung cho mọi mảng** (`/<mảng>/...`, ví dụ `/cloud/...`):

| Trang | Dùng để |
|---|---|
| **Tổng quan** (`/cloud`) | Trang chủ riêng của mảng |
| **Lộ trình** (`/cloud/roadmap`) | Khoá xếp theo giai đoạn, kèm khoá cần học trước, tiến độ và gợi ý khoá nên học tiếp |
| **Khoá học** (`/cloud/learn`) | Danh mục khoá; mỗi khoá có module, bài học, bài tập và chứng nhận khi hoàn thành |
| **Luyện tập** (`/cloud/practice`) | Chỉ làm bài, lọc theo khoá và loại bài tập |
| **Glossary** (`/cloud/glossary`) | Thuật ngữ song ngữ của mảng |

Trang **riêng của CloudLab**:

| Trang | Dùng để |
|---|---|
| **Lab kiến trúc** (`/cloud/lab`) | Canvas kiểu draw.io: kéo dịch vụ AWS vào, nối lại; bảng giá, độ trễ, availability, điểm nghẽn và đánh giá Well-Architected hiện ở bên phải; menu Chaos để phá thử |
| **Thử thách** (`/cloud/lab/challenge/<id>`) | 47 challenge thiết kế trên canvas, chấm tự động |
| **Service Explorer** (`/cloud/explore`) | Tra cứu và so sánh 201 dịch vụ AWS |

Link cũ (`/learn/...`, `/lab`, `/glossary#...`) tự chuyển sang `/cloud/...`, giữ nguyên query và `#anchor`.

| Lệnh | Tác dụng |
|------|----------|
| `npm run dev` | Chạy chế độ phát triển (tự reload khi sửa code) |
| `npm run build && npm start` | Chạy bản build bằng một tiến trình duy nhất tại http://localhost:8787 |
| `npm run check` | Chạy typecheck, lint, unit test và kiểm tra i18n |
| `npm run e2e` | Chạy test end-to-end bằng Microsoft Edge có sẵn trên máy (dùng DB riêng `data/e2e.db`) |
| `npm run db:generate -- --name <tên>` | Sinh migration sau khi sửa `apps/api/src/db/schema.ts` |
| `npm run sim:report` | In số liệu mô phỏng của các template (kiểm tra sau khi sửa giá hoặc engine) |
| `npm run challenges:report` | Hiệu chỉnh challenge: xem starter và lời giải đạt hay trượt từng yêu cầu |

**Dữ liệu học** nằm trong `data/learninglab.db` (nếu còn `data/cloudlab.db` từ trước khi đổi tên, API tự đổi tên file đó ở lần chạy đầu, không ghi đè). Để backup, dùng **Cài đặt → Xuất dữ liệu** (một file JSON, nhập lại được trên máy khác), hoặc copy file `.db`.

## Cấu trúc

App chia thành **phần lõi dùng chung** và các **mảng học (domain)**. Mỗi domain có khoá học (định dạng chung) cùng trang, công cụ và loại bài tập riêng.

```
apps/
  api/                  Hono + SQLite (better-sqlite3) + Drizzle ORM
  web/src/
    app/                shell, router (/, /settings, /<domain>/...), sidebar, paths.ts
    pages/              trang dùng chung: Hub, khoá học, bài học, lộ trình, luyện tập, glossary, chứng nhận, cài đặt
    features/           progress, search, exercises (quiz, ước tính), settings, learn
    domains/
      index.ts          DOMAINS: danh sách mảng học
      types.ts          DomainDefinition: tên, màu, trang chủ, menu, route, player, MDX, tìm kiếm
      cloud/            CloudLab: lab/, pages/ (Home, Lab, Challenge, Explore), exercises/, mdx/, search.ts
packages/
  shared/               Type và Zod schema dùng chung (i18n, settings, course model có `domain`)
  exercise-kit/         Loại bài tập dùng chung: quiz tình huống, ước tính + hàm chấm
  course-kit/           Bộ soạn khoá học: defineCourse, lesson(), mod(), buildDomain(), DomainContent
  content/              Registry: gộp nội dung mọi domain (tracksOf, exercisesOf, glossaryOf, roadmapStages...)
  cloud/
    catalog/            @learninglab/cloud-catalog: 201 dịch vụ AWS, giá tham khảo, template
    sim-engine/         @learninglab/cloud-sim: mô phỏng traffic, chi phí, độ trễ, availability, chaos, linter
    challenges/         @learninglab/cloud-challenges: thử thách canvas, kiểm tra flow, chấm điểm
    content/            @learninglab/cloud-content: 12 khoá AWS (MDX vi/en, bài tập), glossary, giai đoạn lộ trình
scripts/                check-i18n, sim-report, challenges-report
e2e/                    Test Playwright
```

FE gọi BE qua typed client của Hono (`hc<AppType>`). Đổi API ở `apps/api` thì TypeScript sẽ báo ngay những chỗ cần sửa ở `apps/web`.

Tiến độ lưu theo `<khoá>/<module>/<bài>` và id bài tập, nên slug khoá phải là duy nhất giữa mọi domain (test của `packages/content` kiểm tra điều này).

## Mở rộng

**Thêm khoá học mới**:
1. Tạo thư mục `packages/cloud/content/src/tracks/<slug>/` gồm `track.ts` (dùng `defineCourse`, `mod()`, `lesson()`), `exercises.ts` (dùng `exerciseBuilders('<slug>')`) và `index.ts`. Chép một khoá có sẵn, ví dụ `aws-compute`, là nhanh nhất: mọi khoá, kể cả Core, đều viết theo cùng một khuôn.
2. Đăng ký khoá trong `COURSES` ở `packages/cloud/content/src/index.ts`, đặt `stage` và `prerequisites` để khoá xuất hiện đúng chỗ trên lộ trình.
3. Trạng thái tự tính, không phải sửa tay: bài có ≥ 3 bài tập thì là "available", chưa đủ thì hiện "Đang soạn". Badge loại bài tập của module cũng tự sinh từ bài tập thật. Test nội dung kiểm tra bài "available" phải có đủ 2 file MDX.
   Thử thách trên canvas: chạy `npm run challenges:report -- <slug>` để hiệu chỉnh (starter phải trượt, lời giải phải qua).
4. Nếu khoá dùng icon mới thì thêm icon đó vào `apps/web/src/components/icon.tsx`.

Thêm khoá không cần sửa route hay giao diện, vì lộ trình, danh mục, tìm kiếm và chứng nhận đều tự sinh từ dữ liệu.

**Thêm bài học** (mọi khoá giống nhau):
1. Thêm 1 dòng `lesson('<slug>', tx(...), tx(...), <phút>)` vào module trong `track.ts`.
2. Viết `lessons/<module>/<slug>.vi.mdx` và `.en.mdx`.
3. Thêm ≥ 3 bài tập vào `exercises.ts` dưới key `<module>: { '<slug>': [...] }`. Dùng `quiz()`, `estimate()` và `challenge()`. Với challenge, dùng thêm `scenario()`, `usersOnly()` và `R.cost()`, `R.p95()`, `R.errors()`, `R.survivesAz()`... trong `helpers.ts`.

Security group trong challenge: ở các bài trước bài `aws-networking/vpc-design/security-groups`, mỗi node được mở sẵn port của nó cho cả VPC. Từ bài đó trở đi trong khoá Networking, và trong mọi khoá cần Networking làm tiền đề (Reliability, System Design...), SG bắt đầu trống và học viên phải tự thêm rule. Việc chọn chế độ diễn ra tự động (`SG_LESSON` trong `packages/cloud/content/src/index.ts`). Với các challenge đó, bọc lời giải bằng `withSecurityGroups(...)` để tự sinh rule theo quyền tối thiểu, và thêm `R.connected()` vào requirements.

Quy ước: text song ngữ luôn viết `tx('english', 'tiếng Việt')`. Id bài tập viết không kèm prefix khoá, prefix được thêm tự động. Nếu xếp bài tập vào một module hoặc bài học không tồn tại thì app báo lỗi ngay lúc khởi động. Trong MDX dùng được `<Callout>`, `<TryLab>`, `<ServiceCompare ids="...">`, `<CostCrossover />`, `<AvailabilityCalculator />`.

**Thêm dịch vụ AWS vào Lab**: viết `ServiceDef` trong `packages/cloud/catalog/src/services/*.ts` (gồm config, hàm `model` tính capacity/giá/SLA, và tài liệu), đăng ký trong `registry.ts`, rồi thêm icon trong `apps/web/src/domains/cloud/lab/visuals.tsx`.

**Thêm loại bài tập**:
- Dùng được ở mọi mảng (như quiz): thêm vào `EXERCISE_KINDS` (`packages/shared`), type và hàm chấm trong `packages/exercise-kit`, player trong `apps/web/src/features/exercises/` và một `case` trong `ExercisePlayer.tsx`.
- Riêng một mảng (như thử thách canvas của Cloud): thêm vào `EXERCISE_KINDS`, viết type và hàm chấm trong package của mảng (ví dụ `packages/cloud/challenges`), rồi khai báo player trong `players` của `DomainDefinition`. Không cần sửa `ExercisePlayer.tsx`. Bài tập loại này được tính là "thử thách" khi xét hoàn thành khoá.

**Thêm ngôn ngữ**: thêm mã ngôn ngữ vào `LOCALES` và `localizedTextSchema` (`packages/shared/src/i18n.ts`), tạo `apps/web/src/locales/<mã>/`, rồi chạy `npm run i18n:check`. Script sẽ liệt kê mọi key còn thiếu.

**Thêm một mảng học mới** (ví dụ `algo`):
1. Nội dung: tạo `packages/algo/content/` (làm theo `packages/cloud/content`), dựng khoá bằng `buildDomain('algo', COURSES, { glossary, stages })` từ `@learninglab/course-kit` và export một `DomainContent`. Thêm `"packages/algo/*"` vào `workspaces` ở `package.json` gốc.
2. Registry: thêm nội dung đó vào `DOMAINS` và type bài tập của mảng vào `Exercise` trong `packages/content/src/index.ts`.
3. Web: tạo `apps/web/src/domains/algo/index.ts` export một `DomainDefinition` (tên, màu `hue`, trang chủ, menu, route riêng, player, MDX, tìm kiếm), rồi thêm vào `DOMAINS` trong `apps/web/src/domains/index.ts`.

Router, sidebar, hub, tìm kiếm và các trang khoá học/lộ trình/luyện tập/glossary/chứng nhận tự có cho mảng mới. Mảng nào không cần Lab thì không khai báo route Lab; mảng nào cần công cụ khác (chạy code, flashcard...) thì khai báo trang đó trong `routes` và loại bài tập trong `players`.

**Thêm trang cấp app**: thêm route trong `apps/web/src/app/router.tsx`, mục menu trong `APP_NAV` (`apps/web/src/app/navigation.ts`), namespace i18n trong `src/locales/*/` và `src/i18n/resources.ts`. Trang riêng của một mảng thì khai báo trong `routes` và `nav` của mảng đó. Phía API thì thêm module route trong `apps/api/src/routes/` và gắn vào `createApp()`.
