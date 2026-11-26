import { tx } from '@learninglab/catalog';
import { defineCourse } from '../../define.ts';
import { lesson, mod } from '../../helpers.ts';

export const course = defineCourse({
  slug: 'aws-analytics',
  icon: 'chart-column',
  hue: 185,
  level: 'advanced',
  stage: 4,
  prerequisites: ['aws-data', 'aws-serverless'],
  estHours: 7,
  title: tx('Data & Analytics', 'Dữ liệu & Analytics'),
  tagline: tx('Turn raw events into answers: lakes, queries, pipelines and streams.', 'Biến sự kiện thô thành câu trả lời: data lake, truy vấn, pipeline và stream.'),
  description: tx('Building a data lake on S3, querying with Athena and Redshift, ETL with Glue and EMR, streaming analytics with Kinesis and Flink, and serving data to BI, search and ML.', 'Xây data lake trên S3, truy vấn với Athena và Redshift, ETL với Glue và EMR, phân tích streaming với Kinesis và Flink, và đưa dữ liệu tới BI, tìm kiếm và ML.'),
  outcomes: [
    tx('Lay out a data lake that is cheap to query', 'Bố trí data lake truy vấn rẻ'),
    tx('Choose Athena, Redshift or OpenSearch for a question', 'Chọn Athena, Redshift hay OpenSearch cho từng câu hỏi'),
    tx('Build batch and streaming pipelines', 'Xây pipeline batch và streaming'),
    tx('Estimate analytics costs per TB scanned', 'Ước tính chi phí analytics theo TB quét'),
  ],
  modules: [
    mod('lake', 'archive', tx('Data lake', 'Data lake'), tx('Storing data so it can be queried.', 'Lưu dữ liệu sao cho truy vấn được.'), [
      lesson('data-lake', tx('A data lake on S3', 'Data lake trên S3'), tx('Zones, Parquet, partitioning, Glue Catalog, Lake Formation.', 'Các vùng, Parquet, partition, Glue Catalog, Lake Formation.'), 12),
      lesson('query-engines', tx('Athena or Redshift', 'Athena hay Redshift'), tx('Serverless queries vs a warehouse, and what each costs.', 'Truy vấn serverless so với data warehouse, và chi phí của mỗi bên.'), 12),
    ]),
    mod('pipelines', 'waves', tx('Pipelines', 'Pipeline'), tx('Batch and streaming.', 'Batch và streaming.'), [
      lesson('etl', tx('ETL with Glue and EMR', 'ETL với Glue và EMR'), tx('Jobs, crawlers, Spark and orchestration.', 'Job, crawler, Spark và điều phối.'), 10),
      lesson('streaming-analytics', tx('Streaming analytics', 'Phân tích streaming'), tx('Kinesis Data Streams and Firehose, MSK, Managed Flink.', 'Kinesis Data Streams và Firehose, MSK, Managed Flink.'), 12),
    ]),
    mod('serving', 'brain', tx('Serving data', 'Khai thác dữ liệu'), tx('BI, search and ML.', 'BI, tìm kiếm và ML.'), [
      lesson('bi-search-ml', tx('BI, search and ML', 'BI, tìm kiếm và ML'), tx('QuickSight, OpenSearch, SageMaker and Bedrock at a glance.', 'Tổng quan QuickSight, OpenSearch, SageMaker và Bedrock.'), 10),
    ]),
  ],
});
