# CloudLab: Kế hoạch xây dựng web học AWS / Cloud System Design (thực hành là chính)

> App đã đổi tên thành **Learning Lab**; CloudLab giờ là mảng (domain) Cloud bên trong nó. Tài liệu này mô tả mảng Cloud. Đây là tài liệu tham chiếu chính khi build. Khi đổi quyết định thì cập nhật ở đây.
> **Hệ thống khoá học và hoàn thiện web: xem [COURSE-PLAN.md](COURSE-PLAN.md).**
> Phiên bản 2 (2026-11-18): chuyển sang **100% local, $0, không cài thêm gì, thực hành > lý thuyết**.

---

## 0. Các quyết định đã chốt

| # | Quyết định | Hệ quả cho thiết kế |
|---|-----------|---------------------|
| 1 | **AWS** là phần học chính | Catalog, CLI, giá đều theo AWS. Azure/GCP chỉ có một dòng "tương đương" để tham khảo |
| 2 | **Chỉ chạy local**, một người dùng, chưa public | Không cần đăng nhập, không cần hardening cho multi-user, không deploy |
| 3 | **$0 tuyệt đối**, không trả tiền cho bất kỳ dịch vụ nào | Không VPS, không cloud, không API trả phí. Toàn bộ chạy bằng `npm run dev` trên máy |
| 4 | **AI tutor**: dùng Claude Code có sẵn, hoặc model free | Gọi `claude -p` (headless) bằng login hiện có. Có thể đổi sang provider free. AI là **tuỳ chọn**, tắt đi thì app vẫn chạy đầy đủ |
| 5 | **Claude soạn nội dung** song ngữ EN/VI | Lý thuyết ngắn gọn, phần lớn công sức dồn vào bài tập |
| 6 | **Thực hành > lý thuyết** | Mục tiêu ≥ 70% thời gian là làm bài tập có chấm tự động |
| 7 | **Sandbox nằm trong web UI**, không cài Docker hay emulator | Mọi sandbox là code TypeScript chạy trong trình duyệt và được chấm điểm ngay tại chỗ |

**Môi trường hiện có trên máy** (đã kiểm tra): Node.js v22.14, npm 10.9, git 2.55, Claude Code CLI (đi kèm extension VS Code). Như vậy là đủ, **không cần cài thêm pnpm, Docker hay database server**.

---

## 1. Mục tiêu học

Học xong, bạn phải **tự làm được** 4 việc:
1. **Chọn đúng dịch vụ AWS** cho từng bài toán: EC2, Fargate hay Lambda; RDS, Aurora hay DynamoDB; SQS, SNS, EventBridge hay Kinesis...
2. **Giải thích trade-off**: ưu/nhược, giới hạn, khi nào **không** nên dùng.
3. **Ước tính và tối ưu chi phí**: biết tiền nằm ở đâu (compute, storage, request, data transfer, NAT...).
4. **Nối thành hệ thống tối ưu**: đạt yêu cầu latency, availability, budget, và sống sót khi có sự cố.

Ngoài ra là các **kỹ năng thao tác**: AWS CLI, IAM policy, cấu hình VPC/Security Group, data modeling DynamoDB, IaC.

### Nguyên tắc
- **Practice-first**: mỗi bài lý thuyết tối đa ~5 phút đọc, sau đó là bài tập ngay. Có chế độ "Practice only": chỉ làm bài, gặp chỗ không biết thì mới mở lý thuyết.
- **Mọi bài tập đều được chấm**: điểm số, giải thích vì sao đúng hay sai, gợi ý theo 3 cấp.
- **Phản hồi bằng con số**: USD/tháng, p95 ms, % availability, Allow/Deny kèm lý do, gói tin bị chặn ở bước nào.
- **Learn → Try → Break → Fix**: nhiều bài cố tình đưa hệ thống đang hỏng để bạn sửa.
- **Mở rộng được** sang track khác sau này (Kubernetes, Database, DevOps...) mà không phải sửa core.
- **Song ngữ và dark/light ngay từ ngày 1.**

---

## 2. Các loại sandbox (tất cả chạy trong trình duyệt)

| # | Sandbox | Bạn thực hành gì | Logic thật bên trong |
|---|---------|------------------|----------------------|
| 1 | **Architecture Simulator** ⭐ | Kéo thả dịch vụ AWS, nối lại, đặt traffic; xem cost, latency, availability, bottleneck; Chaos (tắt AZ, traffic ×10) | Lan truyền traffic, mô hình hàng đợi, Monte Carlo availability, tính giá theo bảng giá AWS |
| 2 | **Mini-AWS** (CLI + Console giả lập) ⭐ | Gõ `aws s3 mb`, `aws iam create-role`, `aws sqs send-message`... trong terminal web, hoặc thao tác trên Console giả. Lab kiểm tra state | Emulator viết bằng TS, giữ state các resource, trả lỗi giống AWS thật (`AccessDenied`, `BucketAlreadyExists`...) |
| 3 | **IAM Policy Lab** | Viết policy JSON, test request ("user X có `s3:GetObject` được trên `arn:...` không?") | Policy evaluator thật: explicit Deny > Allow > implicit Deny, wildcard, Condition cơ bản, giao giữa identity policy, resource policy và permission boundary. Có **trace giải thích từng bước** |
| 4 | **VPC Network Lab** | Dựng VPC/subnet/route table/IGW/NAT/SG/NACL, hỏi "EC2 A có kết nối được RDS B cổng 5432 không?" | Reachability analyzer: đi qua route table → NACL (stateless, cả chiều vào và ra) → SG (stateful), chỉ ra **gói tin bị chặn ở đâu** |
| 5 | **DynamoDB Modeling Lab** | Thiết kế PK/SK/GSI cho các access pattern, chạy Query/Scan, xem RCU/WCU và chi phí | Engine key-value có sort key, `begins_with`, GSI. Đếm capacity unit. Phát hiện hot partition |
| 6 | **Cost Detective** | Đưa sẵn một hoá đơn AWS hàng tháng, tìm chỗ lãng phí và áp dụng cách sửa | Dùng chung engine cost với Simulator |
| 7 | **Incident Drills** | Hệ thống đang lỗi (5xx tăng, latency cao, hoá đơn tăng vọt). Bạn xem metrics/logs giả lập, chẩn đoán và sửa | Kịch bản có state machine, metrics sinh ra từ Simulator |
| 8 | **IaC Lab** | Viết template YAML (subset CloudFormation), chạy `plan` để xem diff, `apply` vào Mini-AWS | Parser YAML + diff engine. Thêm subset HCL/Terraform ở phase sau |
| 9 | **Widgets & Drills nhanh** | Slider so sánh chi phí Lambda vs Fargate vs EC2, bài ước tính nhanh (back-of-envelope), quiz tình huống | Hàm tính thuần |

Hai công cụ tra cứu đi kèm:
- **Service Explorer**: thẻ cho từng dịch vụ AWS, có use case, ưu/nhược, mô hình giá, giới hạn, khi nào KHÔNG nên dùng, sai lầm thường gặp, và tên tương đương bên Azure/GCP.
- **Service Chooser**: wizard dạng decision tree, trả ra dịch vụ gợi ý kèm lý do và link sang bài tập liên quan.

### Vòng lặp một bài học (practice-first)
```
Mục tiêu (1 câu) → Lý thuyết ngắn (≤ 5 phút, có diagram + bảng so sánh)
  → Bài tập 1: dễ, có hướng dẫn
  → Bài tập 2: tự làm
  → Bài tập 3: Break & Fix
  → Quiz tình huống (3 câu)
  → Flashcards đưa vào lịch ôn
```

---

## 3. Kiến trúc tổng thể (local)

```
┌──────────────────────── Máy của bạn ─────────────────────────┐
│                                                               │
│  Browser  http://localhost:5173                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ apps/web (Vite + React)                                 │  │
│  │  - Lesson / Exercise player, MDX, i18n, theme           │  │
│  │  - Web Workers: sim-engine, mini-aws, iam-eval, vpc...  │  │
│  └──────────────┬──────────────────────────────────────────┘  │
│                 │ REST (fetch, typed client)                   │
│  ┌──────────────▼──────────────────────────┐                  │
│  │ apps/api (Hono on Node)  :8787          │──▶ data/cloudlab.db (SQLite file)
│  │  progress, attempts, designs, SRS,      │                  │
│  │  lab state, settings, AI proxy          │──▶ spawn `claude -p` (tuỳ chọn)
│  └─────────────────────────────────────────┘     hoặc Ollama / API free (tuỳ chọn)
└───────────────────────────────────────────────────────────────┘
```

**Vì sao vẫn tách FE và BE dù chạy local?**
- Bạn muốn học build đầy đủ cả FE lẫn BE, nên BE thật sẽ đóng vai trò lưu dữ liệu, chấm điểm và proxy AI.
- Trình duyệt không tự chạy `claude` CLI được, nên phải có BE gọi giúp.
- Sau này nếu muốn public thì chỉ cần thay SQLite bằng Postgres và thêm auth. Cấu trúc giữ nguyên.

**Chạy**: `npm install` một lần, sau đó `npm run dev` sẽ bật cả web và api. Dữ liệu nằm trong một file SQLite; muốn backup thì copy file đó ra.

---

## 4. Tech stack (toàn bộ free, open-source, không cần cài thêm)

| Lớp | Chọn | Lý do |
|-----|------|-------|
| Monorepo | **npm workspaces** | Có sẵn trong npm, không phải cài pnpm hay Turborepo |
| Ngôn ngữ | **TypeScript** (strict) cho tất cả | Các engine dùng chung giữa FE, BE và test |
| FE build | **Vite** | Dev server nhanh. Chạy local nên không cần SSR/SEO (Next.js là thừa) |
| UI | **React 19 + React Router** | Hệ sinh thái lớn |
| Styling | **Tailwind CSS v4 + shadcn/ui** (Radix) | Dark mode bằng CSS variables, accessible, tự sở hữu code |
| i18n | **i18next + react-i18next** | Chuẩn, có plural, interpolation, lazy load namespace |
| Theme | ThemeProvider tự viết (~40 dòng): light / dark / system | Không phụ thuộc framework |
| Nội dung | **MDX** (`@mdx-js/rollup`) + frontmatter validate bằng Zod | Bài học là file trong git, nhúng được component bài tập |
| Canvas | **React Flow (@xyflow/react)** | Kéo thả node/edge, hỗ trợ dark mode |
| Terminal | **xterm.js** | Terminal cho Mini-AWS CLI |
| Code editor | **Monaco** (load **local**, không qua CDN, để dùng được offline) | Viết IAM policy JSON và YAML IaC, có schema validation |
| Chart | **Recharts** | Cost breakdown, metrics trong incident drill |
| State | **Zustand** (canvas, lab) + **TanStack Query** (server state) | Đơn giản |
| Validation | **Zod** | Schema dùng chung cho content, API và exercise |
| BE | **Hono** + `@hono/node-server` | Nhẹ, nhanh, có typed RPC client (`hc`) để FE gọi API type-safe |
| DB | **SQLite** (better-sqlite3) + **Drizzle ORM** | Database chỉ là một file, không phải cài server. Drizzle gần SQL nên học được SQL luôn |
| Test | **Vitest** (+ fast-check) cho engine, **Playwright** cho e2e | Free, chạy local |
| Lint | ESLint + Prettier | — |

Bỏ so với bản 1: Next.js, NestJS, PostgreSQL, Redis, BullMQ, Better Auth, Docker, Moto, VPS, Vercel. Không còn cần đến.

---

## 5. Cấu trúc thư mục

```
cloudlab/
├─ apps/
│  ├─ web/                         # Vite + React
│  │  ├─ src/routes/               # /learn, /practice, /simulator, /labs, /explore, /review, /settings
│  │  ├─ src/exercises/            # registry các loại bài tập (player + UI)
│  │  ├─ src/components/
│  │  ├─ src/i18n/{en,vi}/*.json   # chuỗi UI
│  │  └─ src/theme/
│  └─ api/                         # Hono
│     ├─ src/routes/               # progress, attempts, designs, labs, review, ai, settings
│     ├─ src/db/schema.ts          # Drizzle
│     ├─ src/ai/                   # providers: claude-code, ollama, openai-compatible
│     └─ drizzle/                  # migrations
├─ packages/
│  ├─ sim-engine/                  # ⭐ simulator: traffic, latency, availability, cost, linter
│  ├─ mini-aws/                    # ⭐ emulator: state + CLI parser + các service
│  ├─ iam-eval/                    # IAM policy evaluator + trace
│  ├─ vpc-net/                     # reachability analyzer
│  ├─ catalog/                     # metadata dịch vụ AWS (i18n, giá, capacity, map Azure/GCP)
│  ├─ pricing/                     # bảng giá seed (JSON) + script cập nhật
│  ├─ exercise-kit/                # interface Exercise, hàm chấm, scoring
│  ├─ content/                     # tracks/aws/... (MDX + YAML bài tập), Claude soạn
│  └─ shared/                      # types, Zod schemas
├─ data/                           # cloudlab.db (gitignore)
├─ PLAN.md
└─ package.json                    # workspaces + scripts dev/test/build
```

Mọi package engine (`sim-engine`, `mini-aws`, `iam-eval`, `vpc-net`) đều là **TypeScript thuần, không phụ thuộc DOM**. Nhờ vậy chạy được cả trong Web Worker, trong BE và trong test.

---

## 6. ⭐ Exercise Kit: xương sống của phần thực hành

Mọi bài tập đều tuân theo cùng một interface, nên thêm loại bài mới hay thêm track mới rất dễ:

```ts
interface ExerciseType<Spec, Answer> {
  kind: string;                         // "canvas-design" | "cli-lab" | "iam-policy" | ...
  specSchema: ZodType<Spec>;            // validate file YAML của bài
  Player: React.FC<{ spec: Spec; onSubmit(a: Answer): void }>;
  grade(spec: Spec, answer: Answer): GradeResult;   // hàm thuần, deterministic
}
interface GradeResult {
  passed: boolean;
  score: number;                        // 0–100
  checks: { id: string; passed: boolean; message: I18nText; hint?: I18nText }[];
  metrics?: Record<string, number>;     // cost, p95...
}
```

| kind | Mô tả |
|------|-------|
| `scenario-quiz` | Câu hỏi tình huống: chọn dịch vụ hoặc kiến trúc, có giải thích cho từng phương án |
| `estimation` | Ước tính nhanh (RPS, storage, băng thông, chi phí); chấp nhận sai số ±X% |
| `canvas-design` | Thiết kế từ đầu theo yêu cầu (SLO, budget, chaos) |
| `canvas-fix` | Cho sẵn thiết kế hỏng hoặc đắt, sửa cho đạt yêu cầu |
| `cli-lab` | Làm các bước trên Mini-AWS bằng CLI, chấm dựa trên state cuối |
| `console-lab` | Như `cli-lab` nhưng thao tác bằng Console UI giả |
| `iam-policy` | Viết hoặc sửa policy sao cho thoả bộ test case (allow/deny) với quyền tối thiểu |
| `vpc-reachability` | Cấu hình mạng sao cho A→B thông và C→B bị chặn |
| `dynamo-model` | Thiết kế bảng/GSI phục vụ N access pattern, không được Scan, chi phí ≤ X |
| `cost-detective` | Giảm hoá đơn ≥ X% mà không vi phạm SLO |
| `incident` | Chẩn đoán và sửa sự cố |
| `iac` | Viết template để `apply` ra đúng state mong muốn |

**Gợi ý 3 cấp**: hướng suy nghĩ → chỉ ra phần cần sửa → gần như đáp án. Mỗi lần mở gợi ý bị trừ điểm nhẹ.
**Mastery**: mỗi bài gắn tag kỹ năng (vd `networking.sg`, `cost.data-transfer`). Dashboard hiển thị độ thành thạo từng kỹ năng và gợi ý bài nên làm tiếp.

---

## 7. ⭐ Architecture Simulator

### 7.1 Catalog (`packages/catalog`)
Mỗi dịch vụ AWS là **dữ liệu + hàm thuần**:
```ts
defineService({
  id: "ec2",
  category: "compute",
  name: { en: "Amazon EC2", vi: "Amazon EC2" },
  equivalents: { azure: "Virtual Machines", gcp: "Compute Engine" },
  config: z.object({ instanceType, count, autoscaling, placement: z.enum(["single-az","multi-az"]),
                     purchase: z.enum(["on-demand","savings-plan-1y","spot"]) }),
  capacity: (cfg) => ({ rpsPerUnit, baseLatencyMs }),
  availability: (cfg) => ...,
  cost: (cfg, usage, prices) => ({ compute, storage, requests, transfer }),
  behavior: "service",                  // client | dns | cdn | waf | lb | apigw | service | function | cache | db | nosql | queue | pubsub | stream | storage | nat
  connects: ["rds","dynamodb","elasticache","sqs","s3", ...],
  docs: { pros, cons, whenToUse, whenNotTo, pitfalls }   // song ngữ
})
```
**Bộ dịch vụ cho MVP (~20)**: Users, Route 53, CloudFront, WAF, ALB, NLB, API Gateway, EC2 (+ Auto Scaling), ECS Fargate, Lambda, S3, EBS, RDS, Aurora, DynamoDB, ElastiCache, SQS, SNS, EventBridge, Kinesis, NAT Gateway, VPC Endpoint.

### 7.2 Engine (chạy trong Web Worker, deterministic theo seed)
1. **Validate graph**: cycle đồng bộ, kết nối không hợp lệ, node mồ côi.
2. **Lan truyền traffic** theo thứ tự topo: CDN/cache chỉ forward phần miss; LB chia đều cho target; DB tách read sang replica và write sang primary; queue tách đồng bộ khỏi bất đồng bộ và tính backlog.
3. **Capacity & autoscaling**: `instances = clamp(ceil(load/(cap×targetUtil)), min, max)`, `ρ = load/capacity`.
4. **Latency**: `base/(1−ρ)` (xấp xỉ M/M/1, có giới hạn trên). `ρ ≥ 1` nghĩa là bão hoà và bắt đầu có error. p95 được ước lượng từ tổng trên đường đi.
5. **Availability**: **Monte Carlo** 10.000 vòng, mỗi vòng random up/down cho các node theo SLA và AZ, đếm tỉ lệ request đi tới đích thành công.
6. **Cost/tháng**: compute + storage + request + **data transfer** (internet egress, cross-AZ, NAT processing) theo bảng giá AWS.
7. **Linter Well-Architected**: chỉ chạy ở 1 AZ, DB ở public subnet, không backup, workload đọc nhiều mà không có cache, đẩy traffic S3 qua NAT (nên dùng VPC endpoint), không có WAF... Mỗi cảnh báo có giải thích song ngữ và link tới bài học.
8. **Chaos**: tắt một AZ, tắt một node, traffic ×10, DB chậm. Hiển thị so sánh **trước/sau**.

### 7.3 UI
Palette (search, lọc theo category) | Canvas (heatmap theo utilization, độ dày edge theo RPS) | Panel config (form sinh từ Zod) | Panel kết quả (thẻ số liệu, biểu đồ chi phí, cảnh báo). Có undo/redo, autosave vào SQLite, export PNG/JSON, và 4 template mẫu.

### 7.4 Test bắt buộc
Golden tests (design mẫu → kết quả cố định). Property tests (thêm replica thì availability không giảm, thêm cache thì tải DB không tăng). Đối chiếu chi phí của 5 design mẫu với AWS Pricing Calculator (làm tay trên web của AWS, miễn phí).

---

## 8. ⭐ Mini-AWS (emulator chạy trong trình duyệt)

### 8.1 Phạm vi
| Service | Lệnh/thao tác hỗ trợ (MVP) |
|---------|---------------------------|
| S3 | `mb, rb, ls, cp, rm`, `s3api put-bucket-versioning / put-bucket-policy / put-public-access-block / put-bucket-lifecycle-configuration` |
| IAM | user/group/role, `create-policy`, `attach-*-policy`, `put-role-policy`, trust policy, `sts assume-role`, `sts get-caller-identity` |
| EC2/VPC | `create-vpc / subnet / internet-gateway / nat-gateway / route-table / route`, `create-security-group`, `authorize-security-group-ingress`, NACL, `run-instances` (instance trừu tượng) |
| SQS | `create-queue`, `send / receive / delete-message`, visibility timeout, DLQ (redrive policy) |
| SNS | `create-topic`, `subscribe` (SQS/Lambda), `publish` (fan-out) |
| DynamoDB | `create-table` (PK/SK/GSI), `put / get / query / scan / update / delete-item`, đếm capacity |
| Lambda | `create-function`: **handler JavaScript chạy thật trong Web Worker** (sandbox, có timeout), `invoke`, trigger từ SQS/SNS/S3 |
| CloudWatch | xem log của Lambda, metrics cơ bản |

### 8.2 Thiết kế
- **State store** dạng tree (`account → region → service → resources`), immutable. Có snapshot và reset theo từng lab.
- **CLI parser**: `aws <service> <command> --flag value`, hỗ trợ `--query` (dùng JMESPath, thư viện `jmespath`) và `--output json|table|text`. Thông báo lỗi giống AWS.
- **Mọi lệnh đều đi qua `iam-eval`**: lab có thể đặt bạn vào vai một role bị giới hạn quyền, khi đó sẽ gặp `AccessDenied` thật và phải sửa policy.
- **Console UI giả**: giao diện đơn giản cho S3, IAM, VPC, DynamoDB, đọc chung một state với CLI.
- Lab đặt trong YAML: `setup` (state ban đầu), `steps` (mục tiêu), `checks` (assert trên state, vd `s3.bucket('logs').versioning == 'Enabled'`).
- Ghi rõ trên UI: "mô phỏng giáo dục, chỉ hỗ trợ một subset của AWS".

---

## 9. AI Tutor (tuỳ chọn, $0)

Thiết kế dạng **provider interface**. Chọn provider trong trang Settings:

| Provider | Cách hoạt động | Chi phí | Ghi chú |
|----------|----------------|---------|---------|
| **Claude Code (mặc định)** | BE chạy `claude -p --output-format json --json-schema ...`, không cấp tool nào. Tự dò đường dẫn binary trong extension VS Code hoặc lấy từ biến môi trường `CLAUDE_BIN` | Không mất thêm tiền, dùng gói Claude bạn đang có. **Có tính vào giới hạn sử dụng** của gói | Chất lượng tốt nhất. Mỗi lần gọi mất vài giây |
| Ollama (local) | HTTP `localhost:11434` | Free, offline | Phải cài Ollama và tải model; cần RAM/GPU đủ mạnh |
| OpenAI-compatible | Base URL + key (vd: Gemini API free tier, Groq, OpenRouter model free) | Free tier có giới hạn | Free tier có thể dùng dữ liệu của bạn để huấn luyện. Không gửi thông tin cá nhân |
| Off | — | — | App vẫn chạy đầy đủ. Gợi ý tĩnh có sẵn trong bài tập |

**AI dùng vào việc gì** (luôn kèm context: đề bài, bài làm, kết quả chấm của engine):
- **Review thiết kế**: nhận xét theo 6 pillar Well-Architected và đặt câu hỏi gợi mở, **không đưa đáp án ngay**.
- **"Tại sao tôi sai?"**: giải thích dựa trên kết quả chấm.
- **Hỏi đáp trong bài học**: dựa trên nội dung bài hiện tại.
- **Sinh biến thể bài tập**: ví dụ đổi traffic/budget. Kết quả vẫn **do engine chấm**, không để AI chấm.

**Quy tắc**: engine là nguồn sự thật về điểm số, AI chỉ giải thích và gợi ý. Có cache câu trả lời trong SQLite (theo hash của prompt) để không gọi lặp lại. Có rate limit mềm để tiết kiệm quota.

---

## 10. Nội dung (Claude soạn, song ngữ)

```
packages/content/tracks/aws/
  track.yaml
  modules/04-databases/
    module.yaml
    lessons/01-rds-vs-dynamodb/
      en.mdx, vi.mdx            # lý thuyết ngắn
      exercises.yaml            # 3–6 bài tập, text song ngữ { en, vi }
      flashcards.yaml
  challenges/*.yaml              # bài lớn tổng hợp
  incidents/*.yaml
```
- Quy ước: **giữ nguyên thuật ngữ AWS bằng tiếng Anh**. Lần đầu xuất hiện thì giải thích bằng tiếng Việt và có tooltip glossary.
- Cấu trúc mỗi bài lý thuyết: Mục tiêu → Ý chính (bullet) → Bảng so sánh (khi nào dùng / ưu / nhược / giá) → **Khi nào KHÔNG nên dùng** → **Sai lầm thường gặp** → link sang bài tập.
- Chỉ dùng giá tham khảo khi soạn, ghi rõ region và ngày lấy giá.
- Validate lúc build: thiếu bản dịch, sai schema hoặc bài tập không có lời giải hợp lệ thì **fail**. Mỗi bài tập phải kèm một `referenceSolution`, và CI chạy `grade(referenceSolution)` để chắc chắn bài đó giải được.

---

## 11. Song ngữ EN/VI

- Đổi ngôn ngữ ngay trên header, lưu vào settings (SQLite), không reload trang.
- UI strings nằm trong `i18n/{en,vi}/*.json`, chia theo namespace. **Script kiểm tra key 2 bên khớp nhau** (`npm run i18n:check`).
- Nội dung bài học: `en.mdx` / `vi.mdx`. Text trong YAML luôn có dạng `{ en, vi }`. Thiếu bản `vi` thì fallback sang `en` kèm banner.
- Lỗi và kết quả chấm từ engine trả về **i18n key + params**, không trả chuỗi cứng.
- Số và tiền format qua `Intl.NumberFormat`. Giá luôn tính bằng USD (vì AWS tính USD), có tuỳ chọn hiển thị thêm giá quy đổi VND theo tỉ giá nhập tay.
- Có glossary song ngữ (~150 thuật ngữ) và trang `/glossary`.

## 12. Dark/Light theme

- 3 chế độ: light / dark / system. Lưu vào localStorage và settings. Chống flash bằng một script inline nhỏ trong `index.html`.
- Design token đặt trong CSS variables, `@theme` của Tailwind v4 và shadcn dùng chung một bộ token.
- **Đồng bộ theme cho mọi thành phần**: React Flow (`colorMode`), Monaco (`vs` / `vs-dark`), xterm.js (theme object), Recharts, code block (Shiki dual theme), diagram SVG (dùng `currentColor`).
- Màu heatmap, pass/fail, Allow/Deny phải đạt contrast WCAG AA ở cả 2 theme, và **không chỉ dựa vào màu** (luôn có kèm icon hoặc chữ).

---

## 13. Database (SQLite + Drizzle)

```
settings(key, value)                                   -- locale, theme, ai_provider, ...
lesson_progress(lesson_id, status, completed_at)
exercise_attempts(id, exercise_id, answer json, score, passed, checks json, hints_used, duration_s, created_at)
skill_mastery(skill_tag, score, attempts, updated_at)
designs(id, title, graph json, scenario json, engine_version, created_at, updated_at)
design_snapshots(id, design_id, graph json, created_at)
lab_states(lab_id, state json, updated_at)             -- lưu tiến độ Mini-AWS để làm tiếp
flashcards_review(card_id, due_at, stability, difficulty, reps, lapses, last_review)   -- FSRS
ai_cache(prompt_hash, provider, response json, created_at)
```
Chỉ có một người dùng nên không cần bảng `users`. Nếu sau này public thì thêm `user_id` vào các bảng.

## 14. API (Hono, `localhost:8787/api`)

| Nhóm | Endpoint |
|------|----------|
| Settings | `GET/PUT /settings` |
| Progress | `GET /progress`, `POST /lessons/:id/complete` |
| Exercises | `POST /exercises/:id/attempts` (BE chạy `grade()` lại để xác nhận), `GET /exercises/:id/attempts` |
| Mastery | `GET /mastery`, `GET /recommendations` |
| Designs | CRUD `/designs`, `POST /designs/:id/snapshot` |
| Labs | `GET/PUT /labs/:id/state`, `POST /labs/:id/reset` |
| Review | `GET /review/due`, `POST /review/:cardId` |
| AI | `GET /ai/status` (provider nào đang sẵn sàng), `POST /ai/review`, `POST /ai/explain`, `POST /ai/ask` |
| Data | `GET /export` (backup JSON), `POST /import` |

FE gọi BE qua typed client `hc` của Hono, nên type được bảo đảm từ đầu đến cuối.

## 15. Dữ liệu giá (free)

- `packages/pricing/aws.json`: giá seed cho các SKU dùng trong catalog, ở 2 region `us-east-1` và `ap-southeast-1`. Ghi ngày lấy giá.
- Script tuỳ chọn `npm run pricing:update`: tải từ **AWS Price List Bulk API** (public, miễn phí, không cần tài khoản), lọc chỉ giữ SKU cần dùng và ghi lại file JSON.
- UI luôn ghi "giá tham khảo, cập nhật ngày X, chưa gồm thuế/discount/free tier".

---

## 16. Curriculum AWS (practice-first)

Ước lượng số bài tập cho mỗi module. Lý thuyết chiếm khoảng 25%, bài tập khoảng 75%.

| Module | Chủ đề chính | Bài tập tiêu biểu | Số bài tập |
|--------|-------------|-------------------|-----------|
| 0. Nền tảng | Region/AZ/Edge, shared responsibility, mô hình giá (on-demand / savings plan / reserved / spot), free tier | Estimation drills, quiz chọn mô hình giá | ~8 |
| 1. IAM & bảo mật cơ bản | User/Role/Policy, least privilege, trust policy, assume role, resource policy | **IAM Policy Lab** (sửa `AccessDenied`, cắt bớt quyền thừa), CLI lab | ~12 |
| 2. Networking | VPC, subnet public/private, route table, IGW, NAT, SG vs NACL, VPC endpoint | **VPC Network Lab** (tìm chỗ bị chặn), bài **bẫy chi phí NAT** | ~12 |
| 3. Compute | EC2 (instance family, ASG), ECS Fargate, Lambda (cold start, concurrency) | Slider cost crossover, canvas autoscaling, Lambda chạy thật trong Mini-AWS | ~10 |
| 4. Storage | S3 (storage class, lifecycle, versioning, policy, public access), EBS, EFS | CLI lab S3, bài tối ưu chi phí lifecycle | ~10 |
| 5. Databases | RDS vs Aurora vs DynamoDB, read replica, Multi-AZ, connection pooling | **DynamoDB Modeling Lab**, wizard chọn DB | ~12 |
| 6. Caching & CDN | ElastiCache, CloudFront, TTL, invalidation | Canvas: thêm cache để đạt p95 | ~8 |
| 7. Load balancing & DNS | ALB vs NLB vs API Gateway, các routing policy của Route 53, health check | `canvas-fix`, quiz tình huống | ~8 |
| 8. Messaging & Event-driven | SQS (DLQ, visibility timeout), SNS fan-out, EventBridge, Kinesis | CLI lab SQS + DLQ + Lambda, mô phỏng backlog | ~10 |
| 9. Observability | CloudWatch metrics/logs/alarm, SLI/SLO/error budget | **Incident drills** | ~6 |
| 10. Reliability & DR | Multi-AZ, multi-region, backup, RTO/RPO, 4 chiến lược DR | **Chaos challenges**, so sánh chi phí các chiến lược DR | ~8 |
| 11. Cost Optimization | Rightsizing, savings plan, spot, data transfer, tagging, budget | **Cost Detective** | ~8 |
| 12. IaC | CloudFormation-lite: plan/apply, drift | IaC Lab | ~6 |
| 13. Capstones | URL shortener, e-commerce, chat realtime, video streaming, social feed, data pipeline | Challenge lớn: thiết kế + chaos + cost. Có 2–3 lời giải tham khảo | ~6 |

Tổng cộng khoảng **130+ bài tập**. Soạn dần theo từng phase, không cần đủ hết mới dùng được.

---

## 17. Lộ trình build

Phase nào xong cũng dùng ngay được để học.

### P0: Nền móng ✅ (xong 2026-11-18)
- [x] npm workspaces, TS strict, ESLint/Prettier, Vitest
- [x] `apps/web`: Vite + React + Router + Tailwind v4 + shadcn-style UI, **i18n (vi/en) + theme (light/dark/system)**, layout (sidebar, header, menu mobile, toggle ngôn ngữ và theme)
- [x] `apps/api`: Hono + Drizzle + SQLite + migration, `/api/health`, `/api/settings`; typed client `hc<AppType>` cho FE
- [x] Script `npm run dev` chạy cả 2 app song song; `npm run i18n:check`; `npm run check`
- [x] Content registry đa track (`defineTrack`), outline 14 module của AWS, một track placeholder `containers`
- [x] E2E bằng Playwright, chạy trên **Edge có sẵn** (không tải thêm trình duyệt), DB riêng `data/e2e.db`
- **DoD** ✅: mở `localhost:5173`, đổi ngôn ngữ và theme được, settings vẫn còn sau khi reload (có e2e test kiểm chứng).

### P1: Exercise Kit + bài học ✅ (xong 2026-11-20)
- [x] `exercise-kit`: types, `grade()` thuần cho quiz / ước tính / canvas challenge, gợi ý nhiều cấp
- [x] Loại bài: `scenario-quiz`, `estimation`, `canvas-design`, `canvas-fix`
- [x] Bài học MDX song ngữ (fallback EN), trang track → module → lesson, prev/next, đánh dấu đã học
- [x] Trang Luyện tập (practice-only, lọc theo loại và trạng thái), trang chủ hiển thị tiến độ
- [x] API: `progress` (attempts, lessons), `designs` (CRUD)
- [x] Nội dung: **19 bài học × 2 ngôn ngữ**, 36 quiz, 11 bài ước tính, 10 challenge trong Lab, phủ cả 14 module
- [x] Content test: mọi quiz đều có đáp án đúng, mọi bài ước tính chấp nhận đáp án của nó, mọi challenge có starter **trượt** và lời giải **qua**

### P2: Lab kiến trúc (simulator) ✅ (xong 2026-11-20) ⭐
- [x] `catalog`: 22 dịch vụ AWS, gồm config, giá tham khảo, capacity, SLA, tài liệu song ngữ (khi nào dùng / không nên / ưu / nhược / bẫy / giá)
- [x] `sim-engine`: lan truyền traffic, cache/CDN hit, autoscaling, load levelling qua queue, latency kiểu hàng đợi, availability (theo trạng thái AZ), chi phí (gồm egress và cross-AZ), linter Well-Architected, chaos
- [x] Canvas kiểu draw.io (React Flow): kéo thả, nối từ 4 phía, undo/redo, template, lưu/mở (DB), xuất PNG/JSON, nhập JSON, tự lưu nháp
- [x] Panel phải: tổng chi phí (+VND), p95, availability, đỉnh chịu được, tỉ lệ lỗi; tab Chi phí / Cấu hình / Kịch bản / Đánh giá / Đề bài
- [x] Chế độ challenge: kiểm tra yêu cầu trực tiếp, gợi ý, nộp bài, lời giải tham khảo
- [x] Service Explorer (so sánh tối đa 3 dịch vụ), widget trong bài: Cost crossover, Availability calculator
- [ ] (sau) Service Chooser dạng wizard

### Hệ thống khoá học ✅ (xong 2026-11-21)
- [x] Mô hình nhiều khoá: lộ trình 5 giai đoạn, 11 khoá, chứng nhận, tìm kiếm, glossary, xuất/nhập dữ liệu (chi tiết trong [COURSE-PLAN.md](COURSE-PLAN.md))
- [x] Nội dung: **82 bài × 2 ngôn ngữ**, 189 quiz, 55 bài ước tính, 28 thử thách Lab (tất cả đã hiệu chỉnh)
- [x] Catalog mở rộng lên 28 dịch vụ (Cognito, Step Functions, Firehose, OpenSearch, Global Accelerator, Transit Gateway, API Gateway WebSocket)

### P3: IAM + VPC Labs (≈ 2–3 tuần)
- [ ] `iam-eval` + trace giải thích; loại bài `iam-policy` (editor Monaco có JSON schema)
- [ ] `vpc-net` reachability; loại bài `vpc-reachability` (editor trực quan cho VPC)
- [ ] Nội dung Module 1, 2
- **DoD**: sửa được một policy đang trả `AccessDenied`; tìm được NACL đang chặn traffic.

### P4: Mini-AWS CLI/Console (≈ 3–4 tuần)
- [ ] State store, CLI parser, `--query`/`--output`, lỗi giống AWS, áp IAM lên mọi lệnh
- [ ] S3, SQS, SNS, DynamoDB, Lambda (Web Worker), CloudWatch logs
- [ ] Terminal xterm.js (lịch sử lệnh, tab-complete cơ bản), Console UI giả
- [ ] Loại bài `cli-lab`, `console-lab`, `dynamo-model`
- [ ] Nội dung Module 4, 5, 8
- **DoD**: làm hết lab "SQS + DLQ + Lambda" chỉ bằng CLI, chấm tự động.

### P5: Cost, Incident, IaC, AI, ôn tập (≈ 3 tuần)
- [ ] `cost-detective`, `incident`, `iac` (CloudFormation-lite)
- [ ] AI tutor: provider Claude Code, Ollama, OpenAI-compatible; trang Settings có nút "Test connection"
- [ ] Flashcards + FSRS (`ts-fsrs`)
- [ ] Nội dung Module 9–13
- **DoD**: AI review được một thiết kế; làm xong 1 capstone.

**Mốc đầu tiên dùng được để học thật**: hết P1 (khoảng 3 tuần). **Phần lõi thực hành mạnh nhất** có từ P2.

---

## 18. Chất lượng

- Engine (`sim-engine`, `iam-eval`, `vpc-net`, `mini-aws`): coverage ≥ 90%, có golden tests và property tests.
- **Content test**: mọi `referenceSolution` phải pass `grade()`, và mọi "đáp án sai cố ý" phải fail. Cách này bảo đảm bài tập không bị lỗi đề.
- E2E (Playwright, chạy local): đi hết flow chính cho **2 ngôn ngữ × 2 theme**.
- `npm run check` gom tất cả: lint, typecheck, test, i18n:check, content:validate.

## 19. Rủi ro

| Rủi ro | Giảm thiểu |
|--------|-----------|
| Mô phỏng khác AWS thật dẫn tới học sai | Ghi rõ giả định; đối chiếu với AWS Pricing Calculator và tài liệu AWS; có trang "How it works" |
| Mini-AWS quá lớn | Chỉ làm subset phục vụ đúng các lab đã soạn, mở rộng dần |
| Quota Claude bị dùng nhiều | AI chỉ chạy khi bấm nút, có cache, có thể tắt |
| Scope creep | Bám đúng thứ tự phase; ý tưởng mới ghi vào backlog ở cuối file |
| Nội dung sai | Mỗi bài ghi nguồn (link tài liệu AWS); bạn báo sai thì sửa ngay |

## 20. Nhật ký quyết định kỹ thuật

| Ngày | Quyết định | Lý do |
|------|-----------|-------|
| 2026-11-18 | React Router **7** (không phải 8), TypeScript **5.9** (không phải 7) | Router 8 cần Node ≥ 22.22, máy đang có 22.14. typescript-eslint chưa hỗ trợ TS 7 |
| 2026-11-18 | Metadata track/module viết bằng **TypeScript** (`defineTrack`) thay vì YAML | Có type-check và autocomplete khi soạn, không cần plugin YAML. Nội dung bài (MDX) và định dạng bài tập sẽ chốt ở P1 |
| 2026-11-18 | API dev chạy bằng `node --watch --import tsx` thay vì `tsx watch` | `tsx watch` bị treo trên Windows khi stdin là pipe (trường hợp chạy qua `concurrently`) |
| 2026-11-18 | Text trong dữ liệu có dạng `{ en, vi? }`: `en` bắt buộc, `vi` tuỳ chọn và fallback sang `en` | Content test bắt buộc phải có `vi` cho mọi tiêu đề và tóm tắt |
| 2026-11-18 | Theme và ngôn ngữ áp dụng từ localStorage trước khi paint, sau đó đồng bộ với DB | Không bị nháy giao diện, vẫn chạy được khi API tắt |
| 2026-11-20 | `@xyflow/react` 12.12 (không dùng 13.0) | Bản 13.0.0 mới ra 4 ngày; 12.x ổn định và vẫn được bảo trì |
| 2026-11-20 | Bài tập viết bằng TypeScript (`exercises.ts`, `challenges.ts`), bài học bằng MDX | Có type-check; ngưỡng challenge được hiệu chỉnh bằng engine (`npm run challenges:report`) |
| 2026-11-20 | Chấm điểm chạy trên trình duyệt, API chỉ lưu kết quả | App local một người dùng, không cần chống gian lận |
| 2026-11-20 | Egress ra internet hiển thị trên node Users ("data gửi tới người dùng"), ghi rõ đi qua dịch vụ nào | Tránh hiểu nhầm là ALB/EC2 đắt |
| 2026-11-20 | Chaos sập AZ: fleet có Auto Scaling phục hồi tới `maxCount`, fleet cố định mất một nửa | Sát thực tế hơn; khuyến khích dùng Auto Scaling |
| 2026-11-20 | Availability tính từ SLA của từng dịch vụ (cận dưới) + xác suất sập AZ | Đơn giản, giải thích được, đúng cách các kiến trúc sư lập luận |

## 21. Backlog (để sau)
Subset Terraform/HCL · thêm track Kubernetes/Docker · multi-region simulator · chế độ "interview system design" có tính giờ · public lên mạng (thêm auth + Postgres).
