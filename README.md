# CloudLab

Web học **AWS / Cloud System Design** theo hướng **thực hành là chính**. Chạy 100% trên máy, miễn phí, song ngữ Việt/Anh, có theme sáng/tối.
Kế hoạch đầy đủ nằm trong [PLAN.md](PLAN.md).

## Chạy app

Yêu cầu: Node.js ≥ 22.13 (đã có sẵn npm). Không cần cài database, Docker hay dịch vụ trả phí nào.

```bash
npm install        # chỉ cần chạy lần đầu
npm run dev        # API :8787 + web :5173
```

Mở http://localhost:5173

**Nội dung hiện có**: 11 khoá (Core + 9 khoá chuyên sâu + System Design), 82 bài học song ngữ, 272 bài tập và 28 thử thách trong Lab. Xem chương trình học đầy đủ trong [COURSE-PLAN.md](COURSE-PLAN.md).

## Học gì, ở đâu

| Trang | Dùng để |
|---|---|
| **Lộ trình** (`/roadmap`) | 11 khoá xếp theo 5 giai đoạn, kèm khoá cần học trước, tiến độ và gợi ý khoá nên học tiếp |
| **Khoá học** (`/learn`) | Danh mục khoá; mỗi khoá có module, bài học, bài tập và chứng nhận khi hoàn thành |
| **Lab kiến trúc** (`/lab`) | Canvas kiểu draw.io: kéo dịch vụ AWS vào, nối lại; bảng giá, độ trễ, availability, điểm nghẽn và đánh giá Well-Architected hiện ở bên phải; menu Chaos để phá thử |
| **Luyện tập** (`/practice`) | Chỉ làm bài, lọc được theo khoá: 189 quiz tình huống, 55 bài ước tính, 28 challenge thiết kế trong Lab |
| **Service Explorer** (`/explore`) | Tra cứu và so sánh 28 dịch vụ AWS |
| **Glossary** (`/glossary`) | Thuật ngữ cloud song ngữ |
| **Tìm kiếm** (Ctrl+K) | Tìm khoá, bài, dịch vụ, thuật ngữ, thử thách |
| **Cài đặt** | Ngôn ngữ, theme, tên hiển thị trên chứng nhận, xuất/nhập/đặt lại dữ liệu |

| Lệnh | Tác dụng |
|------|----------|
| `npm run dev` | Chạy chế độ phát triển (tự reload khi sửa code) |
| `npm run build && npm start` | Chạy bản build bằng một tiến trình duy nhất tại http://localhost:8787 |
| `npm run check` | Chạy typecheck, lint, unit test và kiểm tra i18n |
| `npm run e2e` | Chạy test end-to-end bằng Microsoft Edge có sẵn trên máy (dùng DB riêng `data/e2e.db`) |
| `npm run db:generate -- --name <tên>` | Sinh migration sau khi sửa `apps/api/src/db/schema.ts` |
| `npm run sim:report` | In số liệu mô phỏng của các template (kiểm tra sau khi sửa giá hoặc engine) |
| `npm run challenges:report` | Hiệu chỉnh challenge: xem starter và lời giải đạt hay trượt từng yêu cầu |

**Dữ liệu học** nằm trong `data/cloudlab.db`. Để backup, dùng **Cài đặt → Xuất dữ liệu** (một file JSON, nhập lại được trên máy khác), hoặc copy file `.db`.

## Cấu trúc

```
apps/
  web/        Vite + React 19 + Tailwind v4 + shadcn-style UI + i18next
  api/        Hono + SQLite (better-sqlite3) + Drizzle ORM
packages/
  shared/        Type và Zod schema dùng chung (i18n, settings, content model, exercise kinds)
  catalog/       28 dịch vụ AWS: cấu hình, giá tham khảo, capacity, SLA, tài liệu song ngữ, template
  sim-engine/    Mô phỏng: traffic, chi phí, độ trễ, availability, chaos, linter Well-Architected
  exercise-kit/  Kiểu bài tập + hàm chấm điểm thuần (quiz, ước tính, challenge trên canvas)
  content/       Track, bài học (MDX vi/en), bài tập và challenge
scripts/      Công cụ như check-i18n
e2e/          Test Playwright
```

FE gọi BE qua typed client của Hono (`hc<AppType>`). Đổi API ở `apps/api` thì TypeScript sẽ báo ngay những chỗ cần sửa ở `apps/web`.

## Mở rộng

**Thêm khoá học mới**:
1. Tạo thư mục `packages/content/src/tracks/<slug>/` gồm `track.ts` (dùng `defineCourse`, `mod()`, `lesson()`), `exercises.ts` và `index.ts`.
2. Đăng ký khoá trong `COURSES` ở `packages/content/src/index.ts`, đặt `stage` và `prerequisites` để khoá xuất hiện đúng chỗ trên lộ trình.
3. Bài mới tạo có trạng thái "Đang soạn"; viết xong cả 2 file MDX và ≥ 3 bài tập thì chạy `python scripts/mark-ready.py <slug>` để đổi sang `'available'`. Test nội dung sẽ kiểm tra việc này.
   Thử thách trên canvas: chạy `npm run challenges:report -- <slug>` để hiệu chỉnh (starter phải trượt, lời giải phải qua).
4. Nếu khoá dùng icon mới thì thêm icon đó vào `apps/web/src/components/icon.tsx`.

Thêm khoá không cần sửa route hay giao diện, vì lộ trình, danh mục, tìm kiếm và chứng nhận đều tự sinh từ dữ liệu.

**Thêm bài học**: thêm metadata vào `packages/content/src/tracks/aws/lessons.ts`, viết `lessons/<module>/<bài>.vi.mdx` và `.en.mdx`, rồi thêm bài tập vào `exercises.ts`. Trong MDX dùng được `<Callout>`, `<TryLab>`, `<ServiceCompare ids="...">`, `<CostCrossover />`, `<AvailabilityCalculator />`.

**Thêm dịch vụ AWS vào Lab**: viết `ServiceDef` trong `packages/catalog/src/services/*.ts` (gồm config, hàm `model` tính capacity/giá/SLA, và tài liệu), đăng ký trong `registry.ts`, rồi thêm icon trong `apps/web/src/features/lab/visuals.tsx`.

**Thêm loại bài tập**: thêm vào `EXERCISE_KINDS` (`packages/shared`), định nghĩa type và `grade()` trong `packages/exercise-kit`, viết player trong `apps/web/src/features/exercises/` và đăng ký trong `ExercisePlayer.tsx`.

**Thêm ngôn ngữ**: thêm mã ngôn ngữ vào `LOCALES` và `localizedTextSchema` (`packages/shared/src/i18n.ts`), tạo `apps/web/src/locales/<mã>/`, rồi chạy `npm run i18n:check`. Script sẽ liệt kê mọi key còn thiếu.

**Thêm tính năng hoặc trang**: thêm route trong `apps/web/src/app/router.tsx`, mục menu trong `apps/web/src/app/navigation.ts`, namespace i18n trong `src/locales/*/` và `src/i18n/resources.ts`. Phía API thì thêm module route trong `apps/api/src/routes/` và gắn vào `createApp()`.
