# CloudLab: Kế hoạch hệ thống khoá học và hoàn thiện web

> Phiên bản 1 · 2026-11-20 · Bổ sung cho [PLAN.md](PLAN.md).
> Mục tiêu: **một khoá Core** gom các kiến thức và "block" AWS dùng nhiều nhất, sau đó là **các khoá chuyên sâu theo từng mảng**, cho tới khi học hết lộ trình. Đồng thời **hoàn thiện web** cho mô hình nhiều khoá học.
> **Ngoài phạm vi đợt này** (bạn đã chọn để sau): IAM Policy Lab, VPC Network Lab, Mini-AWS CLI, AI tutor, flashcards.

---

## 1. Lộ trình tổng thể

```
Giai đoạn 1        Giai đoạn 2                 Giai đoạn 3                 Giai đoạn 4          Giai đoạn 5
(nền tảng)         (chuyên sâu theo mảng)      (kết hợp nhiều mảng)        (vận hành & dữ liệu) (tổng hợp)

               ┌─► Bảo mật & Danh tính ──────────────────────────────┐
               ├─► Mạng chuyên sâu ─────────┐                        ├─► IaC & DevOps ─┐
AWS Core ──────┼─► Compute & Container ─────┼─► Độ tin cậy & Observ. │                 │
               │                            ├─► Serverless & Event ──┼─► Dữ liệu &     ├─► System Design
               └─► Lưu trữ & Database ──────┘                        │   Analytics ────┤   trên AWS
               └──────────────────────────────► Chi phí & FinOps ────────────────────────┘
```

| # | Khoá học (slug) | Giai đoạn | Cấp độ | Học trước | Số bài | Giờ học | Thử thách Lab |
|---|---|---|---|---|---|---|---|
| 0 | **AWS Core** (`aws`) | 1 | Nền tảng | — | 21 | ~12 | 10 |
| 1 | Bảo mật & Danh tính (`aws-security`) | 2 | Trung cấp | Core | 7 | ~8 | 1 |
| 2 | Mạng chuyên sâu (`aws-networking`) | 2 | Trung cấp | Core | 7 | ~8 | 1 |
| 3 | Compute & Container (`aws-compute`) | 2 | Trung cấp | Core | 6 | ~8 | 2 |
| 4 | Lưu trữ & Database (`aws-data`) | 2 | Trung cấp | Core | 6 | ~10 | 2 |
| 5 | Serverless & Event-driven (`aws-serverless`) | 3 | Nâng cao | Compute, Data | 6 | ~8 | 2 |
| 6 | Độ tin cậy & Observability (`aws-reliability`) | 3 | Nâng cao | Compute, Mạng | 6 | ~8 | 2 |
| 7 | Chi phí & FinOps (`aws-cost`) | 3 | Trung cấp | Core | 5 | ~6 | 1 |
| 8 | IaC & DevOps (`aws-devops`) | 4 | Nâng cao | Bảo mật, Compute | 6 | ~8 | — |
| 9 | Dữ liệu & Analytics (`aws-analytics`) | 4 | Nâng cao | Data, Serverless | 5 | ~7 | 1 |
| 10 | System Design trên AWS (`aws-system-design`) | 5 | Nâng cao | Serverless, Độ tin cậy, Chi phí | 7 | ~12 | 6 |
| | **Tổng** | | | | **82 bài** | **~95 giờ** | **28** |

**Nguyên tắc chia nội dung**
- **Core** chỉ chứa thứ dùng hằng ngày: đủ để thiết kế được một hệ thống production cơ bản. Mỗi chủ đề ở Core có "phiên bản sâu" nằm trong khoá chuyên sâu tương ứng, không lặp lại nội dung.
- **Khoá chuyên sâu** đi vào cơ chế bên trong, giới hạn, bẫy chi phí và các mẫu thiết kế nâng cao của từng mảng.
- **Điều kiện tiên quyết là "khuyến nghị"**, không khoá cứng: vẫn mở được mọi khoá, chỉ hiện cảnh báo nếu chưa học khoá trước đó.

---

## 2. Chương trình học chi tiết

Ký hiệu bài tập: **Q** = quiz tình huống, **E** = bài ước tính, **⚑** = thử thách trên canvas Lab.
Mỗi bài có **ít nhất 3 bài tập**.

### Khoá 0: AWS Core (đã có 19 bài, thêm 2 bài, rà soát lại toàn bộ)

| Module | Bài | Bài tập |
|---|---|---|
| Nền tảng | Bắt đầu: Lab kiến trúc · Region, AZ và trách nhiệm chia sẻ · AWS tính tiền thế nào · **(mới) AWS Well-Architected: 6 trụ cột** | ⚑ website tĩnh · Q · Q+E |
| IAM | User, role và policy | Q×4 |
| VPC | VPC căn bản · Bẫy chi phí NAT | Q×3 · E+⚑ |
| Compute | EC2, Fargate hay Lambda · Auto Scaling và multi-AZ | Q×3+E+⚑ · Q+⚑ |
| Lưu trữ | Storage class và lifecycle của S3 | Q×2+E |
| Database | RDS, Aurora hay DynamoDB · Scale việc đọc | Q×3+E · E+Q+⚑ |
| Cache & CDN | CloudFront và các tầng cache | Q×2+⚑ |
| Load balancing | ALB, NLB hay API Gateway | Q×3 |
| Messaging | Queue, topic và stream | Q×3+⚑ |
| Observability | SLI, SLO và error budget | E×2+Q |
| Độ tin cậy | Phép tính availability và DR | E×2+⚑ |
| Chi phí | Các đòn bẩy chi phí | Q×2+⚑ |
| IaC | Infrastructure as Code | Q×3 |
| Tổng hợp | **(mới) Quy trình thiết kế hệ thống** · Dự án: rút gọn URL | Q×3 · ⚑ |

Việc thêm cho Core: bổ sung bài tập để **bài nào cũng có ≥ 3 bài tập** (hiện vài bài chỉ có 1).

### Khoá 1: Bảo mật & Danh tính

| Module | Bài | Nội dung chính | Bài tập |
|---|---|---|---|
| Danh tính | Đánh giá policy IAM | Identity / resource policy, permission boundary, SCP, session policy; thứ tự đánh giá; điều kiện (`aws:SourceIp`, MFA, tag) | Q×3 + E (đếm quyền) |
| | Nhiều account | AWS Organizations, OU, SCP, IAM Identity Center, role chéo account, Control Tower | Q×3 |
| Danh tính cho ứng dụng | Cognito và xác thực | User pool và identity pool, JWT, authorizer của API Gateway, OAuth/OIDC | Q×3 |
| Bảo vệ dữ liệu | Mã hoá và KMS | At-rest và in-transit, envelope encryption, key policy, SSE-S3 / SSE-KMS, giá KMS | Q×2 + E |
| | Quản lý secret | Secrets Manager và Parameter Store, xoay vòng, không để secret trong code/AMI | Q×3 |
| Bảo vệ ở biên | WAF, Shield, khoá origin | Managed rule, rate limit, Shield Standard/Advanced, CloudFront OAC, chặn truy cập ALB trực tiếp | Q×2 + ⚑ **Khoá chặt API public** |
| Phát hiện & phản ứng | Phát hiện và xử lý sự cố | CloudTrail, Config, GuardDuty, Security Hub, Inspector; quy trình incident response | Q×3 |

### Khoá 2: Mạng chuyên sâu

| Module | Bài | Nội dung chính | Bài tập |
|---|---|---|---|
| Thiết kế VPC | CIDR và chia subnet | Tính CIDR, 5 IP AWS giữ lại, kích thước subnet theo AZ, dư địa cho tương lai, IPv6 | E×3 + Q |
| | Định tuyến và endpoint | Route table, IGW, NAT, egress-only IGW, endpoint Gateway và Interface | Q×2 + E |
| Kết nối | Nối nhiều VPC | Peering, Transit Gateway, PrivateLink: khi nào dùng cái nào, chi phí | Q×3 |
| | Hybrid | Site-to-Site VPN, Direct Connect, Client VPN; dự phòng | Q×2 + E |
| DNS & biên | Route 53 chuyên sâu | Private hosted zone, routing policy, health check, Resolver | Q×3 |
| | Tăng tốc toàn cầu | CloudFront nâng cao, Global Accelerator, anycast, latency | Q×2 |
| Chi phí mạng | Bản đồ chi phí data transfer | Internet, cross-AZ, cross-region, NAT, endpoint, CloudFront | E×2 + ⚑ **Egress private đúng cách** |

### Khoá 3: Compute & Container

| Module | Bài | Nội dung chính | Bài tập |
|---|---|---|---|
| EC2 chuyên sâu | Họ instance | General / compute / memory / storage / GPU, Graviton, burstable credit | Q×2 + E |
| | Chiến lược mua | Kết hợp On-Demand, Savings Plans, RI và Spot; Spot best practices | E×2 + ⚑ **Worker batch trên Spot** |
| Scaling | Auto Scaling chuyên sâu | Target tracking, step, scheduled, predictive, warm pool, lifecycle hook, health check | Q×3 |
| Container | ECS hay EKS | ECS, EKS, Fargate và EC2 launch type, App Runner | Q×3 |
| | Đưa container lên production | ECR, image scanning, task role, service discovery, sidecar | Q×3 |
| Lambda | Lambda chuyên sâu | Concurrency, cold start, provisioned concurrency, SnapStart, tinh chỉnh bộ nhớ, giới hạn | E + Q + ⚑ **2.000 rps với chi phí thấp nhất** |

### Khoá 4: Lưu trữ & Database

| Module | Bài | Nội dung chính | Bài tập |
|---|---|---|---|
| Lưu trữ | S3 chuyên sâu | Tính nhất quán, hiệu năng/prefix, replication, Object Lock, presigned URL, event | Q×3 + E |
| | Block và file | EBS gp3/io2/st1, IOPS, snapshot; EFS, FSx | Q×2 + E |
| Quan hệ | RDS và Aurora chuyên sâu | Multi-AZ, replica, storage của Aurora, Serverless v2, Global Database, RDS Proxy, PITR | Q×2 + ⚑ **Aurora cho tải đọc lớn** |
| NoSQL | Mô hình dữ liệu DynamoDB | PK/SK, GSI/LSI, single-table, chế độ capacity, hot partition, TTL, Streams, DAX | E×2 + Q + ⚑ **Provisioned cho tải đều** |
| | Database chuyên dụng | DocumentDB, Neptune, Timestream, OpenSearch, Keyspaces, MemoryDB, Redshift | Q×3 |
| Cache | Các mẫu caching | Cache-aside, write-through, TTL, eviction, cấu trúc dữ liệu Redis, session | Q×2 + E |

### Khoá 5: Serverless & Event-driven

| Module | Bài | Nội dung chính | Bài tập |
|---|---|---|---|
| API | API Gateway chuyên sâu | REST / HTTP / WebSocket, authorizer, throttling, cache, integration | Q×2 + E |
| Sự kiện | SQS, SNS và EventBridge chuyên sâu | FIFO, visibility, DLQ, batching, SNS filter, EventBridge rule/Pipes/Scheduler | Q×2 + ⚑ **Fan-out sự kiện đơn hàng** |
| | Stream | Kinesis shard, enhanced fan-out, MSK, thứ tự, phát lại | E + Q×2 |
| Điều phối | Step Functions | Standard và Express, retry/catch, saga | Q×3 |
| Mẫu thiết kế | Các mẫu event-driven | Outbox, idempotency, choreography và orchestration, eventual consistency | Q×3 |
| | Khi nào serverless đắt | Điểm hoà vốn, phí ẩn, cách giảm | E + Q + ⚑ **API tải cao: serverless hay container?** |

### Khoá 6: Độ tin cậy & Observability

| Module | Bài | Nội dung chính | Bài tập |
|---|---|---|---|
| Khả năng chống chịu | Các kiểu lỗi và cách phòng | Timeout, retry + backoff + jitter, circuit breaker, bulkhead, giảm cấp chức năng | Q×3 |
| | Static stability | Dư địa, cell-based, giới hạn bán kính ảnh hưởng | Q + E + ⚑ **Sống sót khi mất cache và AZ** |
| DR | Các chiến lược DR | Backup/restore → active/active, RTO/RPO, AWS Backup, Elastic Disaster Recovery | Q×2 + E |
| | Multi-region | Active-passive và active-active, nhân bản dữ liệu, failover bằng Route 53 | Q×2 + ⚑ **Thanh toán 99,99%** |
| Observability | Metrics, logs, traces | CloudWatch, X-Ray/OpenTelemetry, dashboard, alarm theo burn rate | Q×2 + E |
| | Quản lý sự cố | Runbook, on-call, postmortem không đổ lỗi | Q×3 |

### Khoá 7: Chi phí & FinOps

| Module | Bài | Nội dung chính | Bài tập |
|---|---|---|---|
| Hiểu hoá đơn | Giá AWS chuyên sâu | Các chiều tính giá, free tier, Pricing Calculator, Cost Explorer, CUR | Q×2 + E |
| Tối ưu | Cam kết: Savings Plans và RI | Toán coverage/utilization, chọn thời hạn | E×2 + Q |
| | Rightsizing, Spot, Graviton | Compute Optimizer, đo trước khi cắt | Q + E + ⚑ **Giảm 50% mà giữ nguyên SLO** |
| | Chi phí lưu trữ và truyền dữ liệu | Các tầng S3, EBS gp3, egress, NAT, cross-AZ | E×2 + Q |
| Quản trị | FinOps trong thực tế | Tagging, budget, phát hiện bất thường, showback/chargeback, unit economics | Q×3 |

### Khoá 8: IaC & DevOps

| Module | Bài | Nội dung chính | Bài tập |
|---|---|---|---|
| IaC | CloudFormation và CDK | Stack, change set, drift, construct, nested stack | Q×3 (đọc template) |
| | Terraform/OpenTofu | State, module, plan/apply, remote state + khoá | Q×3 |
| Delivery | CI/CD trên AWS | CodePipeline/CodeBuild, GitHub Actions + OIDC | Q×3 |
| | Chiến lược deploy | Rolling, blue/green, canary, feature flag, rollback | Q×2 + E |
| Vận hành | Nhiều môi trường và account | Dev/stage/prod, Control Tower, landing zone | Q×3 |
| | GitOps cho container | ECR → ECS/EKS, Argo CD, quét image | Q×3 |

### Khoá 9: Dữ liệu & Analytics

| Module | Bài | Nội dung chính | Bài tập |
|---|---|---|---|
| Data lake | Data lake trên S3 | Các vùng raw/clean/curated, Parquet, partition, Glue Catalog, Lake Formation | Q×2 + E |
| | Truy vấn | Athena và Redshift: khi nào dùng cái nào, giá theo TB quét | E×2 + Q |
| Pipeline | ETL | Glue job, EMR, điều phối bằng Step Functions | Q×3 |
| | Streaming analytics | Kinesis Data Streams/Firehose, MSK, Managed Flink | Q + ⚑ **Đưa clickstream vào data lake** |
| Khai thác | BI, tìm kiếm và ML | QuickSight, OpenSearch, tổng quan SageMaker/Bedrock | Q×3 |

### Khoá 10: System Design trên AWS (tổng hợp)

| Bài | Nội dung | Bài tập |
|---|---|---|
| Phương pháp phỏng vấn thiết kế | Làm rõ yêu cầu → ước lượng → API → dữ liệu → kiến trúc → đào sâu → trade-off | Q×2 + E×2 |
| News feed | Fan-out khi ghi và khi đọc, cache timeline | Q + ⚑ |
| Video streaming | Upload, chuyển mã, CDN, chi phí egress | E + ⚑ |
| Cửa hàng flash sale | Hàng đợi, giữ chỗ tồn kho, chống quá tải | Q + ⚑ |
| Ứng dụng chat | WebSocket, fan-out, lưu tin nhắn | Q + ⚑ |
| Gọi xe: vị trí realtime | Luồng vị trí, Kinesis, geo-index | E + ⚑ |
| Thanh toán / sổ cái | Idempotency, độ bền, 99,99%, kiểm toán | Q + ⚑ |

---

## 3. Chuẩn nội dung

**Khuôn mẫu một bài học** (MDX, có bản vi và en, mỗi bản khoảng 300–700 từ)
1. Một câu nêu mục tiêu: học xong làm được gì.
2. Ý chính, ưu tiên dùng **bảng so sánh** thay vì đoạn văn dài.
3. **Khi nào KHÔNG nên dùng** và **Sai lầm thường gặp**.
4. Một `<Callout type="key">` tóm tắt điều quan trọng nhất.
5. Liên kết tới Lab (`<TryLab>`) hoặc widget nếu có.
6. Bài tập đặt ngay sau phần lý thuyết.

**Độ chính xác**
- Giá ghi là giá tham khảo us-east-1, mốc 2026-11, và **không đặt những con số hay thay đổi vào đáp án** trừ khi đề bài cho sẵn con số đó.
- Các chi tiết dễ lỗi thời (giới hạn, tên tính năng mới) được viết theo nguyên lý, không phụ thuộc phiên bản.
- Nếu bạn thấy chỗ nào sai, báo để mình sửa; mỗi lần sửa đều chạy lại test nội dung.

**Bài tập**
- Quiz: mọi phương án đều có giải thích song ngữ.
- Bài ước tính: đề bài cho sẵn đủ số liệu để tính.
- Thử thách Lab: hiệu chỉnh bằng `npm run challenges:report`; **sơ đồ ban đầu phải trượt, lời giải tham khảo phải qua**, và còn dư địa cho cách giải khác.

**Test tự động cho nội dung** (thêm mới)
- Bài nào ở trạng thái "Sẵn sàng" thì phải có đủ **cả hai file** `.vi.mdx` và `.en.mdx`.
- Bài nào cũng có ≥ 3 bài tập; id bài tập không trùng nhau.
- Mọi khoá học trong danh sách "Học trước" đều phải tồn tại, và lộ trình không có vòng lặp.

---

## 4. Hoàn thiện web

| # | Tính năng | Chi tiết |
|---|---|---|
| W1 | **Trang Lộ trình** `/roadmap` | Các khoá xếp theo giai đoạn, đường nối thể hiện "học trước", tiến độ từng khoá, gợi ý khoá nên học tiếp |
| W2 | **Danh mục khoá học** `/learn` | Thẻ khoá gồm cấp độ, số giờ, số bài, tiến độ, trạng thái (Sẵn sàng / Đang soạn) |
| W3 | **Trang khoá học** | Kết quả đầu ra, khoá cần học trước (cảnh báo nếu chưa xong), module và bài, nút Học tiếp |
| W4 | **Bài chưa soạn** | Hiện trong danh sách là "Đang soạn" (không bấm được), để thấy toàn bộ chương trình ngay từ đầu |
| W5 | **Mục lục bên cạnh bài học** | Trên màn hình rộng, hiện danh sách bài của khoá và đánh dấu bài đã học |
| W6 | **Hoàn thành khoá và chứng nhận** | Xong mọi bài và mọi thử thách thì khoá được đánh dấu hoàn thành; có trang chứng nhận in được, dùng tên trong Cài đặt |
| W7 | **Tìm kiếm** (Ctrl+K) | Tìm khoá học, bài học, dịch vụ AWS, thuật ngữ, thử thách |
| W8 | **Glossary** `/glossary` | ~70 thuật ngữ song ngữ, tìm kiếm được, liên kết tới dịch vụ |
| W9 | **Dữ liệu cá nhân** | Cài đặt: tên hiển thị, xuất/nhập toàn bộ tiến độ (JSON), đặt lại tiến độ (có xác nhận) |
| W10 | **Dọn giao diện** | Bỏ khỏi menu và trang chủ các mục chưa làm (Labs nâng cao, Ôn tập) và thẻ "tiến độ xây dựng"; trang chủ thành dashboard cá nhân |
| W11 | **Luyện tập theo khoá** | Thêm bộ lọc theo khoá học trên trang Luyện tập |
| W12 | **Rà soát chất lượng** | Responsive, bàn phím, contrast cả hai theme, trạng thái loading/lỗi, trang 404 |

---

## 5. Các phase thực hiện

Mỗi phase kết thúc khi `npm run check` và `npm run e2e` đều xanh, kèm ảnh chụp màn hình để kiểm tra giao diện. Sau mỗi phase web đều dùng được.

### Phase A: Khung đa khoá học ✅ (xong 2026-11-20)
- Hoàn tất mô hình khoá học (cấp độ, giai đoạn, học trước, số giờ, kết quả đầu ra) và registry theo thư mục.
- Tạo đủ **11 khoá** với **toàn bộ module và danh sách bài** (bài chưa soạn để trạng thái "Đang soạn").
- Test nội dung mới (file MDX phải có đủ, lộ trình không có vòng lặp, khoá học trước phải tồn tại).
- **Xong khi**: build xanh; lộ trình hiện đủ 11 khoá với toàn bộ chương trình.
- **Kết quả**: `defineCourse` tự tính trạng thái module/khoá từ trạng thái bài; 11 khoá, 82 bài trong chương trình (19 bài đã có nội dung, 63 bài "Đang soạn"); glossary 70 thuật ngữ; test nội dung mới; 41 unit test và 19 e2e test pass.

### Phase B: Hoàn thiện web (W1–W12) ✅ (xong 2026-11-20)
- Lộ trình, danh mục khoá, trang khoá, mục lục bài, hoàn thành khoá + chứng nhận, tìm kiếm Ctrl+K, glossary, xuất/nhập/đặt lại dữ liệu (API mới `/api/data`), dọn menu, trang chủ dạng dashboard, lọc luyện tập theo khoá.
- E2E cho: lộ trình, tìm kiếm, chứng nhận, xuất/nhập dữ liệu.
- **Xong khi**: mọi trang trong bảng mục 4 chạy được ở cả hai ngôn ngữ và hai theme.
- **Kết quả**: `/roadmap`, danh mục khoá theo giai đoạn, trang khoá (kết quả đầu ra, cảnh báo học trước, banner hoàn thành), mục lục cạnh bài học, `/learn/<khoá>/certificate` in được, tìm kiếm Ctrl+K (bỏ dấu tiếng Việt), `/glossary`, Cài đặt có tên hiển thị + xuất/nhập/đặt lại dữ liệu (`/api/data`), menu chỉ còn tính năng đã có, trang chủ dạng dashboard, lọc luyện tập theo khoá. 49 unit test và 28 e2e test pass; đã chụp màn hình kiểm tra giao diện desktop và mobile, cả hai theme.

### Phase C: Hoàn thiện Core + mở rộng catalog Lab ✅ (xong 2026-11-21)
- 2 bài mới (Well-Architected, Quy trình thiết kế hệ thống); bổ sung bài tập để bài nào cũng có ≥ 3.
- Thêm vào Lab các dịch vụ mà các khoá sau cần: **Cognito, Step Functions, Kinesis Data Firehose, OpenSearch, Global Accelerator, Transit Gateway**, cùng chế độ **WebSocket** cho API Gateway. Mỗi dịch vụ có mô hình giá, SLA, tài liệu song ngữ và test engine.
- **Xong khi**: Core có 21 bài; Lab có 28 dịch vụ.
- **Kết quả**: Core 21 bài, 69 bài tập, 10 thử thách; 6 dịch vụ mới cùng chế độ WebSocket đã có mô hình giá và test.

### Phase D: Các khoá giai đoạn 2 (Bảo mật, Mạng, Compute, Lưu trữ & Database) ✅ (xong 2026-11-21)
- 26 bài × 2 ngôn ngữ, khoảng 85 bài tập, 6 thử thách.
- **Xong khi**: 4 khoá chuyển sang "Sẵn sàng", thử thách đã hiệu chỉnh, test nội dung xanh.
- **Kết quả**: 26 bài, 84 bài tập, 6 thử thách. Engine có thêm `internetShare` cho NAT.

### Phase E: Các khoá giai đoạn 3 (Serverless, Độ tin cậy, Chi phí) ✅ (xong 2026-11-21)
- 17 bài, khoảng 55 bài tập, 5 thử thách.
- **Kết quả**: 17 bài, 57 bài tập, 5 thử thách (fan-out SNS→SQS, API tải đều, sống sót khi mất AZ, thanh toán bốn số 9 đa Region, cắt nửa hoá đơn).

### Phase F: Các khoá giai đoạn 4 (IaC & DevOps, Dữ liệu & Analytics) ✅ (xong 2026-11-21)
- 11 bài, khoảng 35 bài tập, 1 thử thách.
- **Kết quả**: 11 bài, 35 bài tập, 1 thử thách (clickstream vào data lake). Engine mô phỏng việc Firehose gom lô (~5 MB mỗi object).

### Phase G: System Design trên AWS ✅ (xong 2026-11-21)
- 7 bài, 6 thử thách lớn (thiết kế từ đầu, có lời giải tham khảo kèm giải thích trade-off).
- **Kết quả**: 7 bài, 27 bài tập, 6 thử thách: news feed, video streaming, flash sale, chat (WebSocket), gọi xe realtime, sổ cái thanh toán.

### Phase H: Rà soát cuối ✅ (xong 2026-11-21)
- Đọc lại toàn bộ nội dung để kiểm tra tính nhất quán thuật ngữ và liên kết giữa các khoá.
- Cập nhật README, PLAN và trang Giới thiệu; chạy toàn bộ e2e; chụp màn hình mọi trang ở cả hai theme.
- **Kết quả**: 11 khoá, 82 bài (164 file MDX), 272 bài tập, 28 thử thách Lab; mọi lời giải tham khảo đều pass và không starter nào pass. `npm run check` xanh (52 unit test, gồm test chặn loại Callout sai), 28/28 e2e pass, đã chụp màn hình.

**Ước lượng khối lượng**: khoảng 63 bài mới (126 file MDX), khoảng 190 bài tập mới, 18 thử thách mới. Phase A–C làm được trong 1–2 phiên; mỗi phase nội dung D–G mất khoảng 1–2 phiên.

---

## 6. Rủi ro và cách xử lý

| Rủi ro | Cách xử lý |
|---|---|
| Nội dung sai hoặc lỗi thời | Viết theo nguyên lý; giá luôn ghi là "tham khảo"; có test tự động; bạn báo lỗi thì sửa ngay |
| Mô phỏng chưa đủ cho một số thử thách (multi-region, WebSocket) | Phase C mở rộng catalog; những gì engine không mô phỏng được thì dạy bằng quiz/ước tính, không ép thành thử thách |
| Nội dung dài nhưng nông | Mỗi bài có ≥ 3 bài tập và phần "khi nào KHÔNG nên dùng"; khoá sâu không lặp lại Core |
| Khối lượng lớn | Làm theo phase, sau mỗi phase web vẫn chạy được; bài chưa soạn hiện "Đang soạn" |
