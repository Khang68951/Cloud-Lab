import { defineCourse } from '../../define.ts';
import { L, lesson, mod } from '../../helpers.ts';

export const course = defineCourse({
  slug: 'aws-analytics',
  icon: 'chart-column',
  hue: 185,
  level: 'advanced',
  stage: 4,
  prerequisites: ['aws-data', 'aws-serverless'],
  estHours: 7,
  title: L(['Data & Analytics', 'Dữ liệu & Analytics']),
  tagline: L(['Turn raw events into answers: lakes, queries, pipelines and streams.', 'Biến sự kiện thô thành câu trả lời: data lake, truy vấn, pipeline và stream.']),
  description: L([
    'Building a data lake on S3, querying with Athena and Redshift, ETL with Glue and EMR, streaming analytics with Kinesis and Flink, and serving data to BI, search and ML.',
    'Xây data lake trên S3, truy vấn với Athena và Redshift, ETL với Glue và EMR, phân tích streaming với Kinesis và Flink, và đưa dữ liệu tới BI, tìm kiếm và ML.',
  ]),
  outcomes: [
    L(['Lay out a data lake that is cheap to query', 'Bố trí data lake truy vấn rẻ']),
    L(['Choose Athena, Redshift or OpenSearch for a question', 'Chọn Athena, Redshift hay OpenSearch cho từng câu hỏi']),
    L(['Build batch and streaming pipelines', 'Xây pipeline batch và streaming']),
    L(['Estimate analytics costs per TB scanned', 'Ước tính chi phí analytics theo TB quét']),
  ],
  modules: [
    mod('lake', 'archive', ['Data lake', 'Data lake'], ['Storing data so it can be queried.', 'Lưu dữ liệu sao cho truy vấn được.'], ['scenario-quiz', 'estimation'], [
      lesson('data-lake', ['A data lake on S3', 'Data lake trên S3'], ['Zones, Parquet, partitioning, Glue Catalog, Lake Formation.', 'Các vùng, Parquet, partition, Glue Catalog, Lake Formation.'], 12, 'available'),
      lesson('query-engines', ['Athena or Redshift', 'Athena hay Redshift'], ['Serverless queries vs a warehouse, and what each costs.', 'Truy vấn serverless so với data warehouse, và chi phí của mỗi bên.'], 12, 'available'),
    ]),
    mod('pipelines', 'waves', ['Pipelines', 'Pipeline'], ['Batch and streaming.', 'Batch và streaming.'], ['scenario-quiz', 'canvas-design'], [
      lesson('etl', ['ETL with Glue and EMR', 'ETL với Glue và EMR'], ['Jobs, crawlers, Spark and orchestration.', 'Job, crawler, Spark và điều phối.'], 10, 'available'),
      lesson('streaming-analytics', ['Streaming analytics', 'Phân tích streaming'], ['Kinesis Data Streams and Firehose, MSK, Managed Flink.', 'Kinesis Data Streams và Firehose, MSK, Managed Flink.'], 12, 'available'),
    ]),
    mod('serving', 'brain', ['Serving data', 'Khai thác dữ liệu'], ['BI, search and ML.', 'BI, tìm kiếm và ML.'], ['scenario-quiz'], [
      lesson('bi-search-ml', ['BI, search and ML', 'BI, tìm kiếm và ML'], ['QuickSight, OpenSearch, SageMaker and Bedrock at a glance.', 'Tổng quan QuickSight, OpenSearch, SageMaker và Bedrock.'], 10, 'available'),
    ]),
  ],
});
