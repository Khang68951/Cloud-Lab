import { tx } from '@learninglab/catalog';
import { defineCourse } from '../../define.ts';
import { lesson, mod } from '../../helpers.ts';

export const course = defineCourse({
  slug: 'aws-devops',
  icon: 'git-branch',
  hue: 20,
  level: 'advanced',
  stage: 4,
  prerequisites: ['aws-security', 'aws-compute'],
  estHours: 8,
  title: tx('Infrastructure as Code & DevOps', 'Infrastructure as Code & DevOps'),
  tagline: tx('Ship infrastructure and code safely, repeatably and often.', 'Đưa hạ tầng và code lên production an toàn, lặp lại được và thường xuyên.'),
  description: tx('CloudFormation and CDK, Terraform/OpenTofu, CI/CD pipelines with OIDC, deployment strategies, multi-account environments and GitOps for containers.', 'CloudFormation và CDK, Terraform/OpenTofu, pipeline CI/CD dùng OIDC, các chiến lược deploy, môi trường nhiều account và GitOps cho container.'),
  outcomes: [
    tx('Read and review CloudFormation, CDK and Terraform changes', 'Đọc và review thay đổi CloudFormation, CDK và Terraform'),
    tx('Build a CI/CD pipeline without long-lived AWS keys', 'Xây pipeline CI/CD không dùng AWS key dài hạn'),
    tx('Choose rolling, blue/green or canary deployments', 'Chọn deploy kiểu rolling, blue/green hay canary'),
    tx('Organise dev, staging and prod across accounts', 'Tổ chức dev, staging và prod trên nhiều account'),
  ],
  modules: [
    mod('iac', 'file-code', tx('Infrastructure as Code', 'Infrastructure as Code'), tx('Templates, state and drift.', 'Template, state và drift.'), [
      lesson('cloudformation-cdk', tx('CloudFormation and CDK', 'CloudFormation và CDK'), tx('Stacks, change sets, drift and constructs.', 'Stack, change set, drift và construct.'), 12),
      lesson('terraform', tx('Terraform and OpenTofu', 'Terraform và OpenTofu'), tx('State, modules, plan/apply and locking.', 'State, module, plan/apply và khoá state.'), 12),
    ]),
    mod('delivery', 'rocket', tx('Delivery', 'Delivery'), tx('From commit to production.', 'Từ commit tới production.'), [
      lesson('cicd', tx('CI/CD on AWS', 'CI/CD trên AWS'), tx('CodePipeline, CodeBuild, GitHub Actions and OIDC.', 'CodePipeline, CodeBuild, GitHub Actions và OIDC.'), 12),
      lesson('deployment-strategies', tx('Deployment strategies', 'Các chiến lược deploy'), tx('Rolling, blue/green, canary, feature flags and rollback.', 'Rolling, blue/green, canary, feature flag và rollback.'), 12),
    ]),
    mod('operations', 'building', tx('Environments & operations', 'Môi trường & vận hành'), tx('Accounts, environments and GitOps.', 'Account, môi trường và GitOps.'), [
      lesson('environments', tx('Environments and accounts', 'Môi trường và account'), tx('Dev/stage/prod, Control Tower and landing zones.', 'Dev/stage/prod, Control Tower và landing zone.'), 10),
      lesson('gitops-containers', tx('GitOps for containers', 'GitOps cho container'), tx('ECR to ECS/EKS, Argo CD and image scanning.', 'ECR tới ECS/EKS, Argo CD và quét image.'), 10),
    ]),
  ],
});
