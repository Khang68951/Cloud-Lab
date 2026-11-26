import { lite } from './lite.ts';

/** Long-tail infrastructure services: edge, network, compute, data, storage, integration, migration. */
export const MORE_INFRA = [
  // ───────── Edge ─────────
  lite({
    id: 'lambda-edge', name: 'Lambda@Edge', short: 'Lambda@Edge', cat: 'edge', icon: 'square-function', b: 'app',
    en: 'Run Lambda functions in CloudFront regional edge caches to rewrite requests, add headers or personalise responses.',
    vi: 'Chạy hàm Lambda tại regional edge cache của CloudFront để sửa request, thêm header hoặc cá nhân hoá response.',
    price: [{ req: 0.6 }], note: ['Plus $0.00005001 per GB-second', 'Cộng $0,00005001 mỗi GB-giây'], latency: 5,
    eq: ['Front Door Rules Engine', 'Cloud CDN + Service Extensions'],
  }),
  lite({
    id: 'cf-functions', name: 'CloudFront Functions', short: 'CF Functions', cat: 'edge', icon: 'code', b: 'router',
    en: 'Lightweight JavaScript at every CloudFront edge location for URL rewrites, redirects and header changes in under 1 ms.',
    vi: 'JavaScript siêu nhẹ chạy ở mọi edge location của CloudFront để rewrite URL, redirect, sửa header trong chưa tới 1 ms.',
    price: [{ req: 0.1, what: ['invocations', 'lần gọi'] }], latency: 1,
  }),
  lite({
    id: 'route53-resolver', name: 'Amazon Route 53 Resolver', short: 'R53 Resolver', cat: 'edge', icon: 'signpost-big', b: 'router',
    en: 'DNS inside your VPCs, with inbound/outbound endpoints to resolve names between AWS and on-premises, and DNS Firewall.',
    vi: 'DNS bên trong VPC, có endpoint inbound/outbound để phân giải tên giữa AWS và on-premises, kèm DNS Firewall.',
    price: [{ hour: 0.125 }, { req: 0.4, what: ['queries', 'truy vấn'] }], unit: ['endpoint ENI', 'ENI endpoint'], units: 2, latency: 1,
  }),
  lite({
    id: 'wavelength', name: 'AWS Wavelength', short: 'Wavelength', cat: 'edge', icon: 'signal', b: 'app',
    en: 'AWS compute embedded in 5G carrier networks for single-digit-millisecond latency to mobile devices.',
    vi: 'Compute AWS đặt ngay trong mạng 5G của nhà mạng, độ trễ vài mili-giây tới thiết bị di động.',
    price: [{ hour: 0.2 }], unit: ['instance', 'instance'], units: 2, capPerUnit: 400, latency: 5,
  }),
  lite({
    id: 'local-zones', name: 'AWS Local Zones', short: 'Local Zones', cat: 'edge', icon: 'map-pin', b: 'app',
    en: 'Extensions of a Region placed in large metro areas, so latency-sensitive apps run close to end users.',
    vi: 'Phần mở rộng của Region đặt tại các thành phố lớn, giúp app nhạy độ trễ chạy gần người dùng cuối.',
    price: [{ hour: 0.115 }], unit: ['instance', 'instance'], units: 2, capPerUnit: 500, latency: 8,
  }),

  // ───────── Network ─────────
  lite({
    id: 'igw', name: 'Internet Gateway', short: 'Internet GW', cat: 'network', icon: 'earth', b: 'endpoint', core: true,
    en: 'Connects a VPC to the internet. Free and highly available; public subnets route 0.0.0.0/0 to it.',
    vi: 'Kết nối VPC với internet. Miễn phí, sẵn sàng cao; subnet public route 0.0.0.0/0 tới nó.',
    price: [{ free: true }], note: ['Data transfer out is billed normally', 'Data transfer out vẫn tính phí như thường'], availability: 0.99999,
  }),
  lite({
    id: 'vpc-peering', name: 'VPC Peering', short: 'VPC Peering', cat: 'network', icon: 'link', b: 'endpoint',
    en: 'Private routing between two VPCs (same or different account/Region). No hourly fee, non-transitive.',
    vi: 'Định tuyến private giữa hai VPC (cùng hoặc khác account/Region). Không phí theo giờ, không bắc cầu.',
    price: [{ gb: 0.01, what: ['crossing AZs', 'đi qua AZ khác'] }],
  }),
  lite({
    id: 'client-vpn', name: 'AWS Client VPN', short: 'Client VPN', cat: 'network', icon: 'laptop', b: 'endpoint',
    en: 'Managed OpenVPN-based remote access so employees can reach VPC and on-premises resources securely.',
    vi: 'Truy cập từ xa dựa trên OpenVPN được quản lý, cho nhân viên vào tài nguyên trong VPC và on-premises an toàn.',
    price: [{ hour: 0.05 }], unit: ['connected user', 'user đang kết nối'], units: 20, note: ['Plus $0.10/hour per subnet association', 'Cộng $0,10/giờ mỗi subnet association'],
  }),
  lite({
    id: 'cloud-wan', name: 'AWS Cloud WAN', short: 'Cloud WAN', cat: 'network', icon: 'globe-lock', b: 'endpoint',
    en: 'Build and run a global network connecting VPCs, branches and data centres from one central policy.',
    vi: 'Dựng và vận hành mạng toàn cầu nối VPC, chi nhánh và data centre bằng một policy trung tâm.',
    price: [{ hour: 0.5 }, { gb: 0.02 }], unit: ['core network edge', 'core network edge'], units: 2,
  }),
  lite({
    id: 'network-firewall', name: 'AWS Network Firewall', short: 'Network FW', cat: 'network', icon: 'brick-wall', b: 'router',
    en: 'Managed stateful firewall and IPS for VPC traffic: domain filtering, Suricata rules, deep packet inspection.',
    vi: 'Firewall stateful và IPS được quản lý cho traffic VPC: lọc domain, rule Suricata, kiểm tra gói tin sâu.',
    price: [{ hour: 0.395 }, { gb: 0.065 }], unit: ['endpoint (per AZ)', 'endpoint (mỗi AZ)'], units: 2, latency: 2,
    eq: ['Azure Firewall', 'Cloud Next Generation Firewall'],
  }),
  lite({
    id: 'gwlb', name: 'Gateway Load Balancer', short: 'GWLB', cat: 'network', icon: 'list-filter', b: 'router',
    en: 'Inserts fleets of third-party virtual appliances (firewalls, IDS) transparently into the traffic path.',
    vi: 'Chèn dàn virtual appliance bên thứ ba (firewall, IDS) một cách trong suốt vào đường đi của traffic.',
    price: [{ hour: 0.0125 }, { gb: 0.004 }], latency: 1,
  }),
  lite({
    id: 'cloud-map', name: 'AWS Cloud Map', short: 'Cloud Map', cat: 'network', icon: 'map', b: 'service',
    en: 'Service discovery: register microservice instances and let callers find them by name via API or DNS.',
    vi: 'Service discovery: đăng ký instance của microservice để nơi gọi tìm chúng theo tên qua API hoặc DNS.',
    price: [{ req: 1, what: ['discovery calls', 'lần gọi discovery'] }], note: ['Plus $0.10 per registered resource per month', 'Cộng $0,10 mỗi resource đăng ký mỗi tháng'], latency: 3,
  }),
  lite({
    id: 'verified-access', name: 'AWS Verified Access', short: 'Verified Access', cat: 'network', icon: 'badge-check', b: 'router',
    en: 'Zero-trust access to internal apps without a VPN: every request is checked against identity and device posture.',
    vi: 'Truy cập zero-trust vào app nội bộ không cần VPN: mọi request được kiểm tra theo danh tính và tình trạng thiết bị.',
    price: [{ hour: 0.27 }, { gb: 0.02 }], unit: ['application', 'ứng dụng'],
  }),
  lite({
    id: 'elastic-ip', name: 'Public IPv4 / Elastic IP', short: 'Elastic IP', cat: 'network', icon: 'hash', b: 'endpoint',
    en: 'A static public IPv4 address. Since 2024 every public IPv4 address is billed per hour, in use or not.',
    vi: 'Địa chỉ IPv4 public tĩnh. Từ 2024 mọi IPv4 public đều tính phí theo giờ, dù có dùng hay không.',
    price: [{ hour: 0.005 }], unit: ['address', 'địa chỉ'],
  }),
  lite({
    id: 'privatelink', name: 'AWS PrivateLink (endpoint service)', short: 'PrivateLink', cat: 'network', icon: 'unplug', b: 'endpoint',
    en: 'Expose your own service privately to other VPCs/accounts behind an NLB, without peering or public IPs.',
    vi: 'Cung cấp service của bạn một cách private cho VPC/account khác qua NLB, không cần peering hay IP public.',
    price: [{ hour: 0.01 }, { gb: 0.01 }], unit: ['endpoint ENI', 'ENI endpoint'], units: 2,
  }),

  // ───────── Compute ─────────
  lite({
    id: 'ecs-ec2', name: 'Amazon ECS on EC2', short: 'ECS (EC2)', cat: 'compute', icon: 'container', b: 'app',
    en: 'Run containers with ECS on a cluster of EC2 instances you manage. ECS itself is free; you pay for the instances.',
    vi: 'Chạy container bằng ECS trên cluster EC2 bạn tự quản lý. ECS miễn phí; bạn trả tiền instance.',
    price: [{ hour: 0.096 }], unit: ['m6i.large instance', 'instance m6i.large'], units: 2, capPerUnit: 600,
    eq: ['Azure Container Apps / AKS', 'GKE / Cloud Run'],
  }),
  lite({
    id: 'ecr', name: 'Amazon ECR', short: 'ECR', cat: 'compute', icon: 'package', b: 'object',
    en: 'Private container image registry with vulnerability scanning and cross-Region replication.',
    vi: 'Registry image container private, có quét lỗ hổng và replicate qua Region.',
    price: [{ store: 0.1, defaultGB: 50 }], eq: ['Azure Container Registry', 'Artifact Registry'],
  }),
  lite({
    id: 'outposts', name: 'AWS Outposts', short: 'Outposts', cat: 'compute', icon: 'warehouse', b: 'app',
    en: 'AWS-managed racks/servers installed in your data centre, running EC2, EBS, ECS and RDS on-premises.',
    vi: 'Rack/server do AWS quản lý đặt tại data centre của bạn, chạy EC2, EBS, ECS và RDS ngay on-premises.',
    price: [{ month: 8000 }], unit: ['rack', 'rack'], capPerUnit: 20000, latency: 3, note: ['3-year term; price depends on configuration', 'Hợp đồng 3 năm; giá tuỳ cấu hình'],
  }),
  lite({
    id: 'rosa', name: 'Red Hat OpenShift Service on AWS', short: 'ROSA', cat: 'compute', icon: 'boxes', b: 'app',
    en: 'Fully managed OpenShift (Kubernetes) clusters jointly supported by Red Hat and AWS.',
    vi: 'Cluster OpenShift (Kubernetes) được quản lý hoàn toàn, Red Hat và AWS cùng hỗ trợ.',
    price: [{ hour: 0.267 }], unit: ['4-vCPU worker', 'worker 4 vCPU'], units: 3, capPerUnit: 800, note: ['Includes ~$0.171/h service fee + EC2', 'Gồm ~$0,171/h phí dịch vụ + EC2'],
  }),
  lite({
    id: 'parallelcluster', name: 'AWS ParallelCluster', short: 'ParallelCluster', cat: 'compute', icon: 'cpu', b: 'app',
    en: 'Open-source tool that builds HPC clusters (Slurm) on EC2 that scale with the job queue.',
    vi: 'Công cụ mã nguồn mở dựng cluster HPC (Slurm) trên EC2, tự scale theo hàng đợi job.',
    price: [{ hour: 1.53 }], unit: ['hpc6a node', 'node hpc6a'], units: 4, capPerUnit: 50, latency: 1000,
  }),
  lite({
    id: 'ec2-image-builder', name: 'EC2 Image Builder', short: 'Image Builder', cat: 'compute', icon: 'hammer', b: 'service',
    en: 'Automates building, testing and distributing patched AMIs and container images.',
    vi: 'Tự động build, test và phân phối AMI và image container đã vá lỗi.',
    price: [{ free: true }],
  }),

  // ───────── Database ─────────
  lite({
    id: 'aurora-serverless', name: 'Amazon Aurora Serverless v2', short: 'Aurora Svl v2', cat: 'database', icon: 'database-zap', b: 'db',
    en: 'Aurora that scales capacity (ACUs) up and down in fine steps with load — good for spiky or dev workloads.',
    vi: 'Aurora tự tăng giảm dung lượng (ACU) theo tải từng bước nhỏ — hợp với tải theo đợt hoặc môi trường dev.',
    price: [{ hour: 0.12 }, { store: 0.1 }], unit: ['ACU (average)', 'ACU (trung bình)'], units: 4, capPerUnit: 500, latency: 5,
  }),
  lite({
    id: 'aurora-dsql', name: 'Amazon Aurora DSQL', short: 'Aurora DSQL', cat: 'database', icon: 'database', b: 'db',
    en: 'Serverless, distributed PostgreSQL-compatible database with active-active multi-Region writes.',
    vi: 'Database phân tán serverless tương thích PostgreSQL, ghi active-active trên nhiều Region.',
    price: [{ req: 8, what: ['DPUs', 'DPU'] }, { store: 0.33, defaultGB: 50 }], latency: 6, availability: 0.9999,
  }),
  lite({
    id: 'rds-proxy', name: 'Amazon RDS Proxy', short: 'RDS Proxy', cat: 'database', icon: 'arrow-left-right', b: 'router',
    en: 'Managed connection pooler in front of RDS/Aurora: survives connection storms from Lambda and speeds up failover.',
    vi: 'Connection pooler được quản lý đứng trước RDS/Aurora: chịu được bão kết nối từ Lambda và failover nhanh hơn.',
    price: [{ hour: 0.015 }], unit: ['DB vCPU', 'vCPU của DB'], units: 2, latency: 1,
  }),
  lite({
    id: 'elasticache-serverless', name: 'Amazon ElastiCache Serverless', short: 'Cache Svl', cat: 'database', icon: 'zap', b: 'cache',
    en: 'Redis/Valkey/Memcached cache with no nodes to size; scales automatically and bills by data and requests.',
    vi: 'Cache Redis/Valkey/Memcached không cần chọn node; tự scale và tính tiền theo dữ liệu và request.',
    price: [{ req: 3.4, what: ['ECPUs', 'ECPU'] }, { month: 91 }], note: ['Monthly line ≈ 1 GB stored ($0.125/GB-hour)', 'Dòng hằng tháng ≈ lưu 1 GB ($0,125/GB-giờ)'], latency: 1,
  }),
  lite({
    id: 'timestream', name: 'Amazon Timestream', short: 'Timestream', cat: 'database', icon: 'chart-line', b: 'db',
    en: 'Time-series database for metrics, IoT and telemetry (LiveAnalytics, or managed InfluxDB).',
    vi: 'Database chuỗi thời gian cho metric, IoT và telemetry (LiveAnalytics hoặc InfluxDB được quản lý).',
    price: [{ req: 0.5, what: ['writes (1 KB)', 'lượt ghi (1 KB)'] }, { store: 0.03 }], latency: 10,
  }),

  // ───────── Storage ─────────
  lite({
    id: 'ebs', name: 'Amazon EBS', short: 'EBS', cat: 'storage', icon: 'hard-drive-download', b: 'object', core: true,
    en: 'Block storage volumes attached to one EC2 instance (gp3 SSD, io2, st1 HDD) with snapshots to S3.',
    vi: 'Ổ đĩa block gắn vào một instance EC2 (SSD gp3, io2, HDD st1), có snapshot lưu sang S3.',
    price: [{ store: 0.08 }], latency: 1, note: ['gp3; snapshots $0.05/GB-month', 'gp3; snapshot $0,05/GB-tháng'],
    eq: ['Managed Disks', 'Persistent Disk'],
  }),
  lite({
    id: 's3-express', name: 'Amazon S3 Express One Zone', short: 'S3 Express', cat: 'storage', icon: 'archive-restore', b: 'object',
    en: 'Single-AZ S3 storage class with single-digit-millisecond access for ML training and analytics.',
    vi: 'Lớp lưu trữ S3 trong một AZ, truy cập vài mili-giây, cho train ML và analytics.',
    price: [{ store: 0.11 }, { req: 1.13 }], latency: 3,
  }),
  lite({
    id: 's3-glacier-flexible', name: 'Amazon S3 Glacier Flexible Retrieval', short: 'Glacier Flexible', cat: 'storage', icon: 'snowflake', b: 'object',
    en: 'Archive storage retrieved in minutes to hours; cheaper than Instant Retrieval, pricier than Deep Archive.',
    vi: 'Lưu trữ archive, lấy lại trong vài phút tới vài giờ; rẻ hơn Instant Retrieval, đắt hơn Deep Archive.',
    price: [{ store: 0.0036, defaultGB: 10000 }, { gb: 0.01, what: ['retrieved', 'lấy lại'] }],
  }),
  lite({
    id: 's3-tables', name: 'Amazon S3 Tables', short: 'S3 Tables', cat: 'storage', icon: 'table-2', b: 'object',
    en: 'S3 buckets optimised for Apache Iceberg tables, with automatic compaction for analytics engines.',
    vi: 'Bucket S3 tối ưu cho bảng Apache Iceberg, tự compaction cho các engine analytics.',
    price: [{ store: 0.0265, defaultGB: 1000 }, { req: 5, what: ['PUT requests', 'request PUT'] }],
  }),
  lite({
    id: 'backup', name: 'AWS Backup', short: 'Backup', cat: 'storage', icon: 'history', b: 'service',
    en: 'Central backup policies across EBS, RDS, DynamoDB, EFS, S3 and more, with cross-account/Region copies.',
    vi: 'Chính sách backup tập trung cho EBS, RDS, DynamoDB, EFS, S3..., có copy sang account/Region khác.',
    price: [{ store: 0.05, defaultGB: 500 }], eq: ['Azure Backup', 'Backup and DR Service'],
  }),
  lite({
    id: 'storage-gateway', name: 'AWS Storage Gateway', short: 'Storage GW', cat: 'storage', icon: 'server-cog', b: 'endpoint',
    en: 'Hybrid appliance giving on-premises apps file, volume or tape interfaces backed by S3.',
    vi: 'Thiết bị hybrid cho app on-premises dùng giao diện file, volume hoặc tape, dữ liệu nằm trên S3.',
    price: [{ gb: 0.01, what: ['written', 'ghi'] }], note: ['Capped at $125/month per gateway', 'Tối đa $125/tháng mỗi gateway'],
  }),
  lite({
    id: 'fsx-windows', name: 'Amazon FSx for Windows File Server', short: 'FSx Windows', cat: 'storage', icon: 'folder-open', b: 'object',
    en: 'Managed Windows (SMB) file shares with Active Directory integration.',
    vi: 'File share Windows (SMB) được quản lý, tích hợp Active Directory.',
    price: [{ store: 0.13, defaultGB: 500 }, { month: 165 }], note: ['Monthly line ≈ 64 MB/s throughput', 'Dòng hằng tháng ≈ throughput 64 MB/s'], latency: 2,
  }),
  lite({
    id: 'fsx-ontap', name: 'Amazon FSx for NetApp ONTAP', short: 'FSx ONTAP', cat: 'storage', icon: 'folder-sync', b: 'object',
    en: 'Managed NetApp ONTAP: NFS, SMB and iSCSI with snapshots, cloning and tiering to capacity pool storage.',
    vi: 'NetApp ONTAP được quản lý: NFS, SMB và iSCSI, có snapshot, clone và tiering xuống capacity pool.',
    price: [{ store: 0.125, defaultGB: 1024 }, { month: 440 }], note: ['Monthly line ≈ 128 MB/s throughput', 'Dòng hằng tháng ≈ throughput 128 MB/s'], latency: 2,
  }),
  lite({
    id: 'fsx-openzfs', name: 'Amazon FSx for OpenZFS', short: 'FSx OpenZFS', cat: 'storage', icon: 'folder-git-2', b: 'object',
    en: 'Managed OpenZFS file systems over NFS with sub-millisecond latency, snapshots and clones.',
    vi: 'File system OpenZFS được quản lý qua NFS, độ trễ dưới mili-giây, có snapshot và clone.',
    price: [{ store: 0.09, defaultGB: 512 }, { month: 165 }], latency: 1,
  }),

  // ───────── Messaging & integration ─────────
  lite({
    id: 'ses', name: 'Amazon SES', short: 'SES', cat: 'messaging', icon: 'mail', b: 'service', core: true,
    en: 'Send transactional and marketing email at scale (and receive email) with deliverability tooling.',
    vi: 'Gửi email giao dịch và marketing quy mô lớn (và nhận email), có công cụ đảm bảo tỉ lệ vào inbox.',
    price: [{ req: 100, what: ['emails', 'email'] }], eq: ['Azure Communication Services Email', 'SendGrid (marketplace)'],
  }),
  lite({
    id: 'eventbridge-pipes', name: 'Amazon EventBridge Pipes', short: 'Pipes', cat: 'messaging', icon: 'pipette', b: 'queue',
    en: 'Point-to-point integration from a source (SQS, Kinesis, DynamoDB Streams) to a target with filtering and enrichment.',
    vi: 'Tích hợp điểm-điểm từ nguồn (SQS, Kinesis, DynamoDB Streams) tới đích, có lọc và làm giàu dữ liệu.',
    price: [{ req: 0.4, what: ['events', 'sự kiện'] }],
  }),
  lite({
    id: 'eventbridge-scheduler', name: 'Amazon EventBridge Scheduler', short: 'Scheduler', cat: 'messaging', icon: 'calendar-clock', b: 'pubsub',
    en: 'Serverless scheduler: millions of one-time or recurring (cron/rate) schedules that invoke 270+ AWS targets.',
    vi: 'Bộ lập lịch serverless: hàng triệu lịch một lần hoặc định kỳ (cron/rate) gọi tới 270+ đích AWS.',
    price: [{ req: 1, what: ['invocations', 'lần gọi'] }],
  }),
  lite({
    id: 'appflow', name: 'Amazon AppFlow', short: 'AppFlow', cat: 'messaging', icon: 'arrow-right-left', b: 'queue',
    en: 'No-code data flows between SaaS apps (Salesforce, SAP, Slack...) and S3/Redshift.',
    vi: 'Luồng dữ liệu không cần code giữa ứng dụng SaaS (Salesforce, SAP, Slack...) và S3/Redshift.',
    price: [{ gb: 0.02 }], note: ['Plus $0.001 per flow run', 'Cộng $0,001 mỗi lần chạy flow'],
  }),
  lite({
    id: 'mwaa', name: 'Amazon Managed Workflows for Apache Airflow', short: 'MWAA', cat: 'messaging', icon: 'git-branch', b: 'app',
    en: 'Managed Apache Airflow for orchestrating data pipelines written as Python DAGs.',
    vi: 'Apache Airflow được quản lý để điều phối data pipeline viết bằng DAG Python.',
    price: [{ hour: 0.49 }], note: ['Small environment; workers extra', 'Môi trường small; worker tính thêm'], capPerUnit: 20, unit: ['environment', 'môi trường'],
  }),
  lite({
    id: 'swf', name: 'Amazon SWF', short: 'SWF', cat: 'messaging', icon: 'workflow', b: 'app',
    en: 'Legacy workflow coordination service; new projects use Step Functions instead.',
    vi: 'Dịch vụ điều phối workflow đời cũ; dự án mới nên dùng Step Functions.',
    price: [{ req: 25, what: ['workflow executions', 'lần chạy workflow'] }],
  }),
  lite({
    id: 'sms-messaging', name: 'AWS End User Messaging (SMS)', short: 'SMS', cat: 'messaging', icon: 'message-square-text', b: 'service',
    en: 'Send SMS, MMS, voice and WhatsApp messages to customers (formerly Pinpoint SMS).',
    vi: 'Gửi SMS, MMS, voice và WhatsApp tới khách hàng (trước đây là Pinpoint SMS).',
    price: [{ req: 5810, what: ['SMS (US)', 'SMS (Mỹ)'] }], note: ['Varies a lot by country', 'Thay đổi nhiều theo quốc gia'],
  }),
  lite({
    id: 'msk-serverless', name: 'Amazon MSK Serverless', short: 'MSK Svl', cat: 'messaging', icon: 'activity', b: 'pubsub',
    en: 'Kafka without brokers to size: pay per cluster-hour, partition-hour and data in/out.',
    vi: 'Kafka không phải chọn broker: trả theo giờ cluster, giờ partition và dữ liệu vào/ra.',
    price: [{ hour: 0.75 }, { gb: 0.1, what: ['in', 'vào'] }], unit: ['cluster', 'cluster'],
  }),

  // ───────── Migration & transfer ─────────
  lite({
    id: 'dms', name: 'AWS Database Migration Service', short: 'DMS', cat: 'migration', icon: 'database-backup', b: 'app', core: true,
    en: 'Migrate and continuously replicate databases (homogeneous or e.g. Oracle → Aurora) with minimal downtime.',
    vi: 'Migrate và replicate liên tục database (cùng loại hoặc vd Oracle → Aurora) với downtime tối thiểu.',
    price: [{ hour: 0.154 }], unit: ['dms.c5.large instance', 'instance dms.c5.large'], capPerUnit: 5000,
    eq: ['Azure Database Migration Service', 'Database Migration Service'],
  }),
  lite({
    id: 'datasync', name: 'AWS DataSync', short: 'DataSync', cat: 'migration', icon: 'refresh-cw', b: 'endpoint', core: true,
    en: 'Fast online transfer of files/objects between on-premises storage, other clouds and AWS storage.',
    vi: 'Chuyển file/object online tốc độ cao giữa storage on-premises, cloud khác và storage AWS.',
    price: [{ gb: 0.0125, what: ['copied', 'được copy'] }],
  }),
  lite({
    id: 'transfer-family', name: 'AWS Transfer Family', short: 'Transfer Family', cat: 'migration', icon: 'file-up', b: 'router',
    en: 'Managed SFTP, FTPS, FTP and AS2 endpoints that read and write directly to S3 or EFS.',
    vi: 'Endpoint SFTP, FTPS, FTP và AS2 được quản lý, đọc ghi thẳng vào S3 hoặc EFS.',
    price: [{ hour: 0.3 }, { gb: 0.04, what: ['uploaded/downloaded', 'upload/download'] }], unit: ['protocol endpoint', 'endpoint giao thức'],
  }),
  lite({
    id: 'mgn', name: 'AWS Application Migration Service', short: 'MGN', cat: 'migration', icon: 'truck', b: 'service',
    en: 'Lift-and-shift servers to EC2 with continuous block-level replication and quick cutover.',
    vi: 'Lift-and-shift server sang EC2 bằng replicate block liên tục và chuyển đổi nhanh.',
    price: [{ hour: 0.042 }], unit: ['server (after 90 free days)', 'server (sau 90 ngày miễn phí)'], units: 10,
  }),
  lite({
    id: 'drs', name: 'AWS Elastic Disaster Recovery', short: 'Elastic DR', cat: 'migration', icon: 'life-buoy', b: 'service',
    en: 'Continuously replicates servers to a low-cost staging area and recovers them on AWS in minutes.',
    vi: 'Replicate liên tục server sang vùng staging giá rẻ và khôi phục chúng trên AWS trong vài phút.',
    price: [{ hour: 0.028 }], unit: ['source server', 'server nguồn'], units: 10,
  }),
  lite({
    id: 'snowball', name: 'AWS Snowball Edge', short: 'Snowball', cat: 'migration', icon: 'package-open', b: 'object',
    en: 'Rugged physical device shipped to you to move tens of TB offline when the network is too slow.',
    vi: 'Thiết bị vật lý chắc chắn gửi tới bạn để chuyển hàng chục TB offline khi mạng quá chậm.',
    price: [{ month: 1800 }], unit: ['device job', 'job thiết bị'], note: ['Per job incl. 15 days on-site', 'Mỗi job gồm 15 ngày tại chỗ'],
  }),
  lite({
    id: 'migration-hub', name: 'AWS Migration Hub', short: 'Migration Hub', cat: 'migration', icon: 'route', b: 'service',
    en: 'Discover on-premises servers, plan waves and track migration progress across tools.',
    vi: 'Khám phá server on-premises, lên kế hoạch từng đợt và theo dõi tiến độ migration trên nhiều công cụ.',
    price: [{ free: true }],
  }),
  lite({
    id: 'mainframe-modernization', name: 'AWS Mainframe Modernization', short: 'Mainframe Mod.', cat: 'migration', icon: 'monitor-cog', b: 'app',
    en: 'Refactor or replatform COBOL/PL1 mainframe applications to run on AWS managed runtimes.',
    vi: 'Refactor hoặc replatform ứng dụng mainframe COBOL/PL1 để chạy trên runtime được quản lý của AWS.',
    price: [{ hour: 0.71 }], unit: ['runtime instance', 'instance runtime'], capPerUnit: 300,
  }),
];
