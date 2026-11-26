import { buildDesign, tx } from '@learninglab/catalog';
import type { CourseExercises } from '../../define.ts';
import { exerciseBuilders, R, scenario } from '../../helpers.ts';

const { quiz, estimate, challenge } = exerciseBuilders('aws-analytics');

const clickScenario = scenario({ rps: 1000, peakMultiplier: 3, readRatio: 0, payloadKB: 1 });

export const clickstream = challenge({
  id: 'clickstream',
  kind: 'canvas-design',
  skills: ['aws.analytics.streaming', 'aws.analytics.data-lake'],
  title: tx('Clickstream into the data lake', 'Đưa clickstream vào data lake'),
  brief: tx(
    'A web app emits click events: 1,000 per second on average, 3× during campaigns, 1 KB each. Analysts want them in the S3 data lake to query with Athena, and the data science team will later add real-time consumers.\n\nDesign an ingestion pipeline that never drops events at peak and does not use a relational database.',
    'Một web app phát ra sự kiện click: trung bình 1.000 mỗi giây, gấp 3 lần khi chạy chiến dịch, mỗi sự kiện 1 KB. Đội phân tích muốn chúng nằm trong data lake S3 để truy vấn bằng Athena, và đội data science sau này sẽ thêm các consumer realtime.\n\nHãy thiết kế pipeline nạp dữ liệu không bao giờ làm rơi sự kiện lúc cao điểm và không dùng database quan hệ.',
  ),
  scenario: clickScenario,
  starter: buildDesign([['users', 'users', 0, 1]], [], clickScenario),
  requirements: [
    { type: 'flow', steps: ['entry', ['kinesis'], ['firehose'], ['s3']] },
    R.errors(),
    { type: 'uses', services: ['kinesis'], label: tx('A replayable stream for many consumers', 'Một stream phát lại được cho nhiều consumer') },
    { type: 'uses', services: ['firehose'], label: tx('Buffered delivery to the lake (Firehose)', 'Đẩy vào lake có bộ đệm (Firehose)') },
    { type: 'uses', services: ['s3'], label: tx('Lands in S3', 'Dữ liệu nằm trên S3') },
    { type: 'not-uses', services: ['rds', 'aurora'], label: tx('No relational database', 'Không dùng database quan hệ') },
    R.cost(3500),
  ],
  hints: [
    tx('Clients need an HTTPS endpoint that writes into a stream — API Gateway can put records into Kinesis directly.', 'Client cần một endpoint HTTPS ghi vào stream — API Gateway có thể đưa record thẳng vào Kinesis.'),
    tx('Size the stream for the PEAK: 3,000 records/s of 1 KB, and each shard takes 1,000 records/s.', 'Định cỡ stream theo CAO ĐIỂM: 3.000 record/giây, mỗi record 1 KB, và mỗi shard nhận 1.000 record/giây.'),
    tx('Users → API Gateway (HTTP) → Kinesis (≥ 3 shards, some headroom) → Firehose → S3.', 'Users → API Gateway (HTTP) → Kinesis (≥ 3 shard, có dư địa) → Firehose → S3.'),
  ],
  debrief: tx(
    'Kinesis gives you an ordered, replayable buffer that several consumers can read independently; Firehose batches records (by size or time), converts them to Parquet and writes partitioned files to S3 for Athena. In production, clients would batch events (PutRecords) to cut request costs, and you could switch the stream to on-demand mode for unpredictable campaigns.',
    'Kinesis cho bạn một bộ đệm có thứ tự, phát lại được, mà nhiều consumer có thể đọc độc lập; Firehose gom record theo lô (theo dung lượng hoặc thời gian), chuyển sang Parquet và ghi file đã partition vào S3 cho Athena. Trong thực tế, client sẽ gom sự kiện theo lô (PutRecords) để giảm chi phí request, và bạn có thể chuyển stream sang chế độ on-demand cho các chiến dịch khó đoán.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['api', 'apigw', 1, 1, { type: 'http' }],
      ['stream', 'kinesis', 2, 1, { shards: 4 }],
      ['fh', 'firehose', 3, 1],
      ['lake', 's3', 4, 1, { storageClass: 'standard' }],
    ],
    ['users>api', 'api>stream', 'stream>fh', 'fh>lake'],
    clickScenario,
  ),
});

export const exercises: CourseExercises = {
  lake: {
    'data-lake': [
      quiz(
        'parquet',
        ['aws.analytics.data-lake'],
        tx('Why convert raw JSON logs to Parquet in the lake?', 'Vì sao nên chuyển log JSON thô sang Parquet trong data lake?'),
        [
          ['a', tx('Columnar + compressed: queries read only the needed columns, often 10× less data and cost', 'Dạng cột + nén: truy vấn chỉ đọc các cột cần thiết, thường ít hơn 10 lần dữ liệu và chi phí'), true, tx('Athena and Redshift Spectrum bill or perform by bytes scanned.', 'Athena và Redshift Spectrum tính tiền hoặc chạy nhanh chậm theo lượng byte phải quét.')],
          ['b', tx('Parquet is human-readable', 'Parquet đọc được bằng mắt'), false, tx('It is binary; its value is efficiency.', 'Nó là dạng nhị phân; giá trị của nó là hiệu quả.')],
        ],
      ),
      quiz(
        'partitioning',
        ['aws.analytics.data-lake'],
        tx('Most queries filter by day. How should you lay out the files?', 'Hầu hết truy vấn lọc theo ngày. Nên tổ chức file thế nào?'),
        [
          ['a', tx('Partition by date (e.g. s3://lake/events/dt=2026-11-21/) so queries skip other days', 'Partition theo ngày (vd s3://lake/events/dt=2026-11-21/) để truy vấn bỏ qua các ngày khác'), true, tx('Partition pruning means scanning one day instead of the whole history.', 'Partition pruning nghĩa là chỉ quét một ngày thay vì toàn bộ lịch sử.')],
          ['b', tx('One huge file', 'Một file thật lớn'), false, tx('Every query scans everything.', 'Mọi truy vấn đều phải quét tất cả.')],
          ['c', tx('Millions of tiny files', 'Hàng triệu file tí hon'), false, tx('Too many small files slow queries — aim for ~128 MB–1 GB per file.', 'Quá nhiều file nhỏ làm truy vấn chậm — nên nhắm khoảng 128 MB–1 GB mỗi file.')],
        ],
      ),
      quiz(
        'lake-formation',
        ['aws.analytics.governance'],
        tx('Analysts may see the "orders" table but not the customers\' email column. Use:', 'Analyst được xem bảng "orders" nhưng không được xem cột email của khách hàng. Dùng:'),
        [
          ['a', tx('Lake Formation column-level permissions on the Glue Data Catalog', 'Quyền ở mức cột của Lake Formation trên Glue Data Catalog'), true, tx('Fine-grained (table, column, row) access across Athena, Redshift Spectrum and EMR.', 'Kiểm soát truy cập chi tiết (bảng, cột, dòng) xuyên suốt Athena, Redshift Spectrum và EMR.')],
          ['b', tx('A separate bucket copy without the column', 'Một bản sao bucket riêng không có cột đó'), false, tx('Copies multiply data, cost and drift.', 'Bản sao làm nhân lên dữ liệu, chi phí và sự sai lệch.')],
        ],
      ),
    ],
    'query-engines': [
      estimate(
        'athena-cost',
        ['aws.analytics.athena', 'aws.cost.analytics'],
        tx('Athena costs $5 per TB scanned. A dashboard query scans 200 GB and runs 100 times a day. Monthly cost (30 days) in USD (1 TB = 1,000 GB)?', 'Athena tính $5 mỗi TB được quét. Một truy vấn dashboard quét 200 GB và chạy 100 lần mỗi ngày. Chi phí mỗi tháng (30 ngày) bằng USD (1 TB = 1.000 GB)?'),
        'USD',
        3000,
        0.02,
        tx('0.2 TB × $5 × 100 × 30 = $3,000. Parquet + partitions could cut the scan 10–100×, or a warehouse may now be cheaper.', '0,2 TB × $5 × 100 × 30 = $3.000. Parquet + partition có thể giảm lượng quét 10–100 lần, hoặc lúc này data warehouse có thể rẻ hơn.'),
      ),
      quiz(
        'athena-vs-redshift',
        ['aws.analytics.choosing'],
        tx('Ad-hoc questions a few times a week over S3 data, no infrastructure. Best fit?', 'Vài câu hỏi ad-hoc mỗi tuần trên dữ liệu S3, không muốn quản lý hạ tầng. Phù hợp nhất?'),
        [
          ['a', tx('Athena', 'Athena'), true, tx('Serverless, pay per query, nothing to run between queries.', 'Serverless, trả theo truy vấn, không có gì chạy giữa các lần truy vấn.')],
          ['b', tx('A provisioned Redshift cluster', 'Một cluster Redshift provisioned'), false, tx('A warehouse shines with heavy, frequent, concurrent BI workloads.', 'Data warehouse toả sáng với workload BI nặng, thường xuyên và đồng thời.')],
        ],
      ),
      quiz(
        'redshift-when',
        ['aws.analytics.redshift'],
        tx('200 analysts run complex joins on dashboards all day with sub-second targets. Best fit?', '200 analyst chạy các phép join phức tạp trên dashboard cả ngày, yêu cầu dưới một giây. Phù hợp nhất?'),
        [
          ['a', tx('Amazon Redshift (Serverless or provisioned), with materialised views', 'Amazon Redshift (Serverless hoặc provisioned), kèm materialized view'), true, tx('Columnar storage, MPP execution, result caching and concurrency scaling.', 'Lưu trữ dạng cột, thực thi MPP, cache kết quả và concurrency scaling.')],
          ['b', tx('The production OLTP database', 'Database OLTP đang chạy production'), false, tx('Analytics would slow the application down.', 'Phân tích sẽ làm chậm ứng dụng.')],
        ],
      ),
    ],
  },
  pipelines: {
    etl: [
      quiz(
        'glue-vs-emr',
        ['aws.analytics.etl'],
        tx('A nightly job transforms 50 GB of CSV into Parquet. The team does not want to manage clusters. Use:', 'Một job hằng đêm chuyển 50 GB CSV sang Parquet. Team không muốn quản lý cluster. Dùng:'),
        [
          ['a', tx('An AWS Glue (serverless Spark) job, scheduled by a trigger or Step Functions', 'Một job AWS Glue (Spark serverless), lên lịch bằng trigger hoặc Step Functions'), true, tx('Pay per DPU-second, no cluster to run.', 'Trả theo DPU-giây, không có cluster nào phải chạy.')],
          ['b', tx('A permanent EMR cluster', 'Một cluster EMR chạy thường trực'), false, tx('EMR suits big, custom or long-running Spark/Hadoop — overkill for a nightly 50 GB job.', 'EMR hợp với Spark/Hadoop lớn, tuỳ biến hoặc chạy lâu — quá mức cho một job 50 GB mỗi đêm.')],
        ],
      ),
      quiz(
        'crawler',
        ['aws.analytics.glue'],
        tx('New partitions land in S3 every hour, but Athena does not see them. Fix?', 'Partition mới đổ vào S3 mỗi giờ, nhưng Athena không thấy chúng. Sửa thế nào?'),
        [
          ['a', tx('Register partitions in the Glue Data Catalog (crawler, partition projection or the job itself)', 'Đăng ký partition vào Glue Data Catalog (crawler, partition projection, hoặc chính job đó)'), true, tx('Athena only queries what the catalog knows about; partition projection avoids crawling entirely.', 'Athena chỉ truy vấn những gì catalog biết; partition projection giúp không cần crawl.')],
          ['b', tx('Restart Athena', 'Khởi động lại Athena'), false, tx('Athena is serverless; the catalog is what is missing.', 'Athena là serverless; thứ còn thiếu là catalog.')],
        ],
      ),
      quiz(
        'elt',
        ['aws.analytics.etl'],
        tx('What does ELT mean, compared to ETL?', 'ELT nghĩa là gì so với ETL?'),
        [
          ['a', tx('Load raw data first, then transform inside the lake or warehouse', 'Nạp dữ liệu thô trước, sau đó biến đổi ngay trong lake hoặc warehouse'), true, tx('Keeps the raw zone for reprocessing; transformations are often SQL (e.g. dbt).', 'Giữ vùng dữ liệu thô để xử lý lại; việc biến đổi thường là SQL (vd dbt).')],
          ['b', tx('The same as ETL', 'Giống hệt ETL'), false, tx('The order of load and transform differs.', 'Thứ tự nạp và biến đổi khác nhau.')],
        ],
      ),
    ],
    'streaming-analytics': [
      quiz(
        'firehose',
        ['aws.analytics.firehose'],
        tx('Simplest way to land a stream of events in S3 as Parquet, with no code?', 'Cách đơn giản nhất để đưa một luồng sự kiện vào S3 dưới dạng Parquet mà không cần code?'),
        [
          ['a', tx('Amazon Data Firehose with format conversion and dynamic partitioning', 'Amazon Data Firehose với chuyển đổi định dạng và dynamic partitioning'), true, tx('Fully managed buffering, batching, conversion and delivery.', 'Được quản lý hoàn toàn: đệm, gom lô, chuyển đổi và phân phối.')],
          ['b', tx('A Lambda that writes one S3 object per event', 'Một Lambda ghi một object S3 cho mỗi sự kiện'), false, tx('Millions of tiny objects — expensive to write and slow to query.', 'Hàng triệu object tí hon — tốn tiền ghi và truy vấn chậm.')],
        ],
      ),
      quiz(
        'windows',
        ['aws.analytics.streaming'],
        tx('"Alert when a card is used in 3 countries within 10 minutes." Which service computes this on the stream?', '"Cảnh báo khi một thẻ được dùng ở 3 quốc gia trong 10 phút." Dịch vụ nào tính điều này trên stream?'),
        [
          ['a', tx('Amazon Managed Service for Apache Flink (stateful windowed processing)', 'Amazon Managed Service for Apache Flink (xử lý có trạng thái theo cửa sổ thời gian)'), true, tx('Flink keeps per-key state over time windows with exactly-once semantics.', 'Flink giữ trạng thái theo từng key trên các cửa sổ thời gian, với ngữ nghĩa exactly-once.')],
          ['b', tx('A nightly Athena query', 'Một truy vấn Athena hằng đêm'), false, tx('Hours too late for fraud.', 'Muộn hàng giờ đối với gian lận.')],
        ],
      ),
      estimate(
        'buffer-files',
        ['aws.analytics.firehose'],
        tx('Firehose buffers up to 5 minutes per delivery. With one partition, how many files per day land in S3 (max)?', 'Firehose đệm tối đa 5 phút mỗi lần phân phối. Với một partition, mỗi ngày tối đa có bao nhiêu file đổ vào S3?'),
        'files',
        288,
        0.001,
        tx('24 × 60 ÷ 5 = 288 files a day (fewer, larger files if the size buffer fills first — which is good for queries).', '24 × 60 ÷ 5 = 288 file mỗi ngày (ít hơn và lớn hơn nếu bộ đệm theo dung lượng đầy trước — điều này tốt cho truy vấn).'),
      ),
      clickstream,
    ],
  },
  serving: {
    'bi-search-ml': [
      quiz(
        'quicksight',
        ['aws.analytics.bi'],
        tx('Business users want interactive dashboards over Athena and Redshift data, with per-user pricing. Use:', 'Người dùng nghiệp vụ muốn dashboard tương tác trên dữ liệu Athena và Redshift, giá theo người dùng. Dùng:'),
        [
          ['a', tx('Amazon QuickSight', 'Amazon QuickSight'), true, tx('Serverless BI with SPICE in-memory caching and natural-language Q&A.', 'BI serverless với bộ nhớ đệm SPICE và hỏi đáp bằng ngôn ngữ tự nhiên.')],
          ['b', tx('OpenSearch Dashboards', 'OpenSearch Dashboards'), false, tx('Great for logs and search analytics, less for business BI.', 'Rất tốt cho log và phân tích tìm kiếm, kém hơn cho BI nghiệp vụ.')],
        ],
      ),
      quiz(
        'bedrock-sagemaker',
        ['aws.analytics.ml'],
        tx('You want to add a chatbot that answers from your documents using a foundation model, without training models. Start with:', 'Bạn muốn thêm chatbot trả lời dựa trên tài liệu của mình bằng foundation model, không cần tự huấn luyện model. Bắt đầu với:'),
        [
          ['a', tx('Amazon Bedrock with a knowledge base (RAG)', 'Amazon Bedrock với knowledge base (RAG)'), true, tx('Managed foundation models plus retrieval over your documents.', 'Foundation model được quản lý cộng truy xuất trên tài liệu của bạn.')],
          ['b', tx('Train a model from scratch in SageMaker', 'Tự huấn luyện model từ đầu trong SageMaker'), false, tx('SageMaker is for building, training and hosting your own models — far more effort.', 'SageMaker dành cho việc xây, huấn luyện và chạy model của riêng bạn — tốn công hơn nhiều.')],
        ],
      ),
      quiz(
        'search-logs',
        ['aws.analytics.search'],
        tx('Engineers need to search and visualise 2 TB/day of application logs with full-text queries. Best fit?', 'Kỹ sư cần tìm kiếm và trực quan hoá 2 TB log ứng dụng mỗi ngày bằng truy vấn toàn văn. Phù hợp nhất?'),
        [
          ['a', tx('Amazon OpenSearch Service (with UltraWarm/cold tiers for older data)', 'Amazon OpenSearch Service (với tầng UltraWarm/cold cho dữ liệu cũ)'), true, tx('Full-text search and dashboards; tiering keeps older logs affordable.', 'Tìm kiếm toàn văn và dashboard; phân tầng giúp log cũ có chi phí hợp lý.')],
          ['b', tx('Amazon RDS', 'Amazon RDS'), false, tx('Relational databases are a poor fit for full-text log search at this scale.', 'Database quan hệ không phù hợp để tìm kiếm toàn văn trên log ở quy mô này.')],
        ],
      ),
    ],
  },
};
