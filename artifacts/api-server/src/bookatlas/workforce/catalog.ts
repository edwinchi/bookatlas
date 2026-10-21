import type { WorkforceRole, WorkforceTeam } from '@workspace/api-zod';

const definitions = [
  ['ceo', 'CEO Agent', 'Leadership', 'Set strategic priorities and assess trade-offs.', 'Decision memo with goals, risks, and success criteria.'],
  ['coo', 'COO Agent', 'Leadership', 'Improve operating processes and delivery coordination.', 'Operating plan with owners, dependencies, and checkpoints.'],
  ['cto', 'CTO Agent', 'Engineering', 'Review architecture, AI integration, and engineering risk.', 'Architecture recommendation and technical risk register.'],
  ['product', 'Product Agent', 'Product', 'Clarify reader problems, requirements, and MVP scope.', 'Prioritized requirements and measurable acceptance criteria.'],
  ['ux', 'UX Agent', 'Product', 'Assess usability, accessibility, and public-reader/admin boundaries.', 'Journey review and accessible interaction recommendations.'],
  ['frontend', 'Frontend Agent', 'Engineering', 'Propose maintainable responsive frontend implementation.', 'Component plan, client contracts, and edge cases.'],
  ['backend', 'Backend Agent', 'Engineering', 'Propose reliable server interfaces and domain logic.', 'API implementation plan and failure handling.'],
  ['database', 'Database Agent', 'Engineering', 'Review Bookatlas data design without changing any database.', 'Additive schema proposals; preserve unrelated projects and records.'],
  ['devops', 'DevOps Agent', 'Engineering', 'Assess deployment, observability, resilience, and recovery.', 'Operational checklist and reversible rollout plan.'],
  ['security', 'Security Agent', 'Trust', 'Assess authentication, authorization, privacy, and abuse.', 'Prioritized threat findings with mitigations, not a certification.'],
  ['research', 'Research Agent', 'Product', 'Analyze supplied evidence and identify knowledge gaps.', 'Evidence summary distinguishing sources, assumptions, and unanswered questions.'],
  ['seo', 'SEO Agent', 'Growth', 'Assess discoverability and search content quality.', 'SEO recommendations without fabricated ranking or traffic data.'],
  ['content', 'Content Agent', 'Growth', 'Develop source-grounded editorial content.', 'Editorial brief or draft with verification notes.'],
  ['copywriting', 'Copywriting Agent', 'Growth', 'Write clear conversion copy without unsupported claims.', 'Channel-specific copy drafts for review.'],
  ['social-media', 'Social Media Agent', 'Growth', 'Plan organic social content and distribution.', 'Unpublished social calendar and post drafts.'],
  ['ads', 'Ads Agent', 'Growth', 'Plan advertising experiments and spending safeguards.', 'Unlaunched ad concepts, target hypotheses, and stop rules.'],
  ['email-marketing', 'Email Marketing Agent', 'Growth', 'Plan consent-based reader communication.', 'Unsent email drafts with consent and unsubscribe requirements.'],
  ['sales', 'Sales Agent', 'Revenue', 'Develop ethical sales positioning and qualification.', 'Outreach drafts and qualification questions; never send automatically.'],
  ['customer-success', 'Customer Success Agent', 'Support', 'Improve onboarding, reader support, and retention.', 'Support response drafts and escalation guidance.'],
  ['analytics', 'Analytics Agent', 'Data', 'Define meaningful metrics and analyze supplied measurements.', 'Measurement plan; never invent observed metrics.'],
  ['knowledge-graph', 'Knowledge Graph Agent', 'Data', 'Extract entities and relationships from the supplied context.', 'Proposed entities, relationships, provenance, and uncertainty.'],
  ['documentation', 'Documentation Agent', 'Engineering', 'Explain workflows and interfaces accurately.', 'Documentation draft and verification checklist.'],
  ['qa', 'QA Agent', 'Engineering', 'Define tests and acceptance checks for the supplied task.', 'Test cases and risks; do not claim tests were executed.'],
  ['bug-triage', 'Bug Triage Agent', 'Engineering', 'Assess reported bugs and reproducibility.', 'Severity, reproduction steps, hypotheses, and routing.'],
  ['release-manager', 'Release Manager Agent', 'Engineering', 'Prepare controlled, reversible releases.', 'Release checklist and go/no-go criteria; never publish.'],
  ['investor-relations', 'Investor Relations Agent', 'Leadership', 'Prepare factual investor communication.', 'Investor update draft; no invented traction or financial claims.'],
  ['compliance', 'Compliance Agent', 'Trust', 'Identify policy and compliance review needs.', 'Checklist and specialist-review questions, not legal advice.'],
  ['revenue-operations', 'Revenue Operations Agent', 'Revenue', 'Assess billing workflows and revenue definitions.', 'Revenue process and reconciliation recommendations without real transactions.'],
  ['marketplace', 'Marketplace Agent', 'Revenue', 'Plan catalog, publisher, and marketplace quality.', 'Marketplace policy and listing recommendations.'],
  ['growth', 'Growth Agent', 'Growth', 'Prioritize ethical, measurable growth experiments.', 'Experiment backlog with hypotheses, metrics, and stop criteria.'],
] as const;

export const workforceRoles: WorkforceRole[] = definitions.map(([id, name, department, mandate, deliverable]) =>
  ({ id, name, department, mandate, deliverable }));

export const workforceTeams: WorkforceTeam[] = [
  {
    id: 'mvp', name: 'Lean Startup Team (MVP)', humanHeadcount: 10,
    disciplines: [
      { name: 'Product Manager', count: 1 }, { name: 'UI/UX Designer', count: 1 },
      { name: 'Frontend Developers', count: 2 }, { name: 'Backend Developers', count: 2 },
      { name: 'AI Engineer', count: 1 }, { name: 'DevOps Engineer', count: 1 },
      { name: 'QA Engineer', count: 1 }, { name: 'Growth Marketer', count: 1 },
    ],
    workerIds: ['product', 'ux', 'frontend', 'backend', 'cto', 'devops', 'qa', 'growth'],
  },
  {
    id: 'scale-up', name: 'Scale-Up Team — 50k+ users', humanHeadcount: 38,
    disciplines: [
      { name: 'Product', count: 5 }, { name: 'Frontend', count: 6 },
      { name: 'Backend', count: 6 }, { name: 'AI', count: 5 }, { name: 'DevOps', count: 3 },
      { name: 'Security', count: 2 }, { name: 'QA', count: 3 }, { name: 'Growth', count: 4 },
      { name: 'Support', count: 4 },
    ],
    workerIds: workforceRoles.map(role => role.id),
  },
];

export const workforcePolicy = 'Report-only AI roles, not independent employees. Only the supplied brief and completed reports are available; no live web research, code execution, email, ads, publishing, payment, or database tools. Each worker requires explicit spending approval. Saved report approval does not execute recommendations. Never submit passwords, keys, or personal reader records.';
