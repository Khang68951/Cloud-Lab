import { tx } from '@cloudlab/catalog';
import { defineCourse } from '../../define.ts';
import { lesson, mod } from '../../helpers.ts';

export const course = defineCourse({
  slug: 'aws-data',
  icon: 'database',
  hue: 255,
  level: 'intermediate',
  stage: 2,
  prerequisites: ['aws'],
  estHours: 10,
  title: tx('Storage & Databases', 'Lưu trữ & Database'),
  tagline: tx('Store data in the right place, model it for your queries, and keep it fast.', 'Lưu dữ liệu đúng chỗ, mô hình hoá theo truy vấn, và giữ nó luôn nhanh.'),
  description: tx('S3 in depth, EBS/EFS/FSx, RDS and Aurora internals, DynamoDB data modelling, purpose-built databases and caching patterns.', 'S3 chuyên sâu, EBS/EFS/FSx, cơ chế bên trong RDS và Aurora, mô hình dữ liệu DynamoDB, các database chuyên dụng và các mẫu caching.'),
  outcomes: [
    tx('Choose object, block or file storage and the right tier', 'Chọn lưu trữ object, block hay file và đúng tầng lưu trữ'),
    tx('Run relational databases with high availability and read scaling', 'Vận hành database quan hệ với độ sẵn sàng cao và khả năng scale đọc'),
    tx('Model a DynamoDB table from access patterns', 'Mô hình hoá bảng DynamoDB từ các mẫu truy cập'),
    tx('Pick a purpose-built database and a caching pattern', 'Chọn database chuyên dụng và mẫu caching phù hợp'),
  ],
  modules: [
    mod('storage', 'hard-drive', tx('Storage', 'Lưu trữ'), tx('Objects, blocks and files.', 'Object, block và file.'), [
      lesson('s3-deep', tx('S3 in depth', 'S3 chuyên sâu'), tx('Consistency, performance, replication, Object Lock, presigned URLs, events.', 'Tính nhất quán, hiệu năng, replication, Object Lock, presigned URL, sự kiện.'), 12),
      lesson('block-file', tx('Block and file storage', 'Lưu trữ block và file'), tx('EBS volume types, IOPS, snapshots; EFS and FSx.', 'Loại ổ EBS, IOPS, snapshot; EFS và FSx.'), 10),
    ]),
    mod('relational', 'database', tx('Relational', 'Quan hệ'), tx('RDS and Aurora beyond the basics.', 'RDS và Aurora vượt qua mức cơ bản.'), [
      lesson('rds-aurora-deep', tx('RDS and Aurora in depth', 'RDS và Aurora chuyên sâu'), tx('Replicas, Aurora storage, Serverless v2, Global Database, RDS Proxy, PITR.', 'Replica, storage của Aurora, Serverless v2, Global Database, RDS Proxy, PITR.'), 15),
    ]),
    mod('nosql', 'table', tx('NoSQL & purpose-built', 'NoSQL & chuyên dụng'), tx('Key-value modelling and specialised engines.', 'Mô hình key-value và các engine chuyên biệt.'), [
      lesson('dynamodb-modeling', tx('DynamoDB data modelling', 'Mô hình dữ liệu DynamoDB'), tx('Keys, GSIs, single-table design, capacity modes, hot partitions.', 'Key, GSI, single-table design, chế độ capacity, hot partition.'), 15),
      lesson('purpose-built', tx('Purpose-built databases', 'Database chuyên dụng'), tx('Document, graph, time-series, search, wide-column, warehouse.', 'Document, graph, time-series, search, wide-column, warehouse.'), 10),
    ]),
    mod('caching', 'zap', tx('Caching', 'Caching'), tx('Patterns that keep data fast and correct.', 'Các mẫu giữ dữ liệu vừa nhanh vừa đúng.'), [
      lesson('caching-patterns', tx('Caching patterns', 'Các mẫu caching'), tx('Cache-aside, write-through, TTLs, eviction, Redis data structures.', 'Cache-aside, write-through, TTL, eviction, cấu trúc dữ liệu Redis.'), 10),
    ]),
  ],
});
