import { defineCourse } from '../../define.ts';
import { L, lesson, mod } from '../../helpers.ts';

export const course = defineCourse({
  slug: 'aws-devops',
  icon: 'git-branch',
  hue: 20,
  level: 'advanced',
  stage: 4,
  prerequisites: ['aws-security', 'aws-compute'],
  estHours: 8,
  title: L(['Infrastructure as Code & DevOps', 'Infrastructure as Code & DevOps']),
  tagline: L(['Ship infrastructure and code safely, repeatably and often.', 'Đưa hạ tầng và code lên production an toàn, lặp lại được và thường xuyên.']),
  description: L([
    'CloudFormation and CDK, Terraform/OpenTofu, CI/CD pipelines with OIDC, deployment strategies, multi-account environments and GitOps for containers.',
    'CloudFormation và CDK, Terraform/OpenTofu, pipeline CI/CD dùng OIDC, các chiến lược deploy, môi trường nhiều account và GitOps cho container.',
  ]),
  outcomes: [
    L(['Read and review CloudFormation, CDK and Terraform changes', 'Đọc và review thay đổi CloudFormation, CDK và Terraform']),
    L(['Build a CI/CD pipeline without long-lived AWS keys', 'Xây pipeline CI/CD không dùng AWS key dài hạn']),
    L(['Choose rolling, blue/green or canary deployments', 'Chọn deploy kiểu rolling, blue/green hay canary']),
    L(['Organise dev, staging and prod across accounts', 'Tổ chức dev, staging và prod trên nhiều account']),
  ],
  modules: [
    mod('iac', 'file-code', ['Infrastructure as Code', 'Infrastructure as Code'], ['Templates, state and drift.', 'Template, state và drift.'], ['scenario-quiz'], [
      lesson('cloudformation-cdk', ['CloudFormation and CDK', 'CloudFormation và CDK'], ['Stacks, change sets, drift and constructs.', 'Stack, change set, drift và construct.'], 12, 'available'),
      lesson('terraform', ['Terraform and OpenTofu', 'Terraform và OpenTofu'], ['State, modules, plan/apply and locking.', 'State, module, plan/apply và khoá state.'], 12, 'available'),
    ]),
    mod('delivery', 'rocket', ['Delivery', 'Delivery'], ['From commit to production.', 'Từ commit tới production.'], ['scenario-quiz', 'estimation'], [
      lesson('cicd', ['CI/CD on AWS', 'CI/CD trên AWS'], ['CodePipeline, CodeBuild, GitHub Actions and OIDC.', 'CodePipeline, CodeBuild, GitHub Actions và OIDC.'], 12, 'available'),
      lesson('deployment-strategies', ['Deployment strategies', 'Các chiến lược deploy'], ['Rolling, blue/green, canary, feature flags and rollback.', 'Rolling, blue/green, canary, feature flag và rollback.'], 12, 'available'),
    ]),
    mod('operations', 'building', ['Environments & operations', 'Môi trường & vận hành'], ['Accounts, environments and GitOps.', 'Account, môi trường và GitOps.'], ['scenario-quiz'], [
      lesson('environments', ['Environments and accounts', 'Môi trường và account'], ['Dev/stage/prod, Control Tower and landing zones.', 'Dev/stage/prod, Control Tower và landing zone.'], 10, 'available'),
      lesson('gitops-containers', ['GitOps for containers', 'GitOps cho container'], ['ECR to ECS/EKS, Argo CD and image scanning.', 'ECR tới ECS/EKS, Argo CD và quét image.'], 10, 'available'),
    ]),
  ],
});
