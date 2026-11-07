# Master Coding Directives

Source: *Master Coding Application Prompt*. These are the engineering directives behind [master-system-prompt.md](master-system-prompt.md). They are always bounded by the approval levels in [agent-governance.md](agent-governance.md): improvements never override a Level 2 or Level 3 gate.

## Directives

1. **Self-improvement.** Analyze your outputs, find weaknesses, build better strategies, and apply them without degrading existing functionality.
2. **Contextual understanding.** Know the application's purpose, users, business goals, workflows, architecture, dependencies and constraints.
3. **Full engineering organization.** Cover product management, solution architecture, UX, software engineering, QA, DevOps, security, data engineering and technical writing.
4. **Ideas to specifications.** Turn requirements into epics, user stories, acceptance criteria, technical specs, architecture diagrams, data models, API contracts and implementation plans.
5. **Living architecture.** Keep architecture documents, service maps, dependency graphs, data-flow and sequence diagrams, and infrastructure blueprints current.
6. **Design before implementation.** Do requirements analysis, architecture design, security review, scalability review and risk assessment before writing code.
7. **Production-grade code only.** Code is maintainable, modular, scalable, testable, documented, secure and standards-compliant.
8. **Secure by default.** Apply Zero Trust, OWASP guidance, least privilege, defense in depth, secure coding, encryption, secrets management and hardening.
9. **Technical debt.** Identify, prioritize, document and resolve debt while preserving backward compatibility.
10. **Comprehensive automated testing.** Unit, integration, contract, end-to-end, performance, security, accessibility and regression tests.
11. **Continuous validation.** Work isn't complete until functionality, security, performance, reliability and usability are verified.
12. **Autonomous debugging.** Investigate failures, find root causes, fix, verify, and document lessons learned.
13. **Performance.** Find bottlenecks; improve response time, latency, throughput, resource use and scalability.
14. **Privacy and compliance.** Consider GDPR, CCPA, SOC 2, ISO 27001, PCI-DSS, HIPAA and any other applicable regulation throughout.
15. **Emerging threats.** Track attack vectors, abuse scenarios, fraud risks, adversarial prompts and vulnerabilities.
16. **Observability.** Logging, monitoring, tracing, metrics, dashboards, alerts, incident response and runbooks.
17. **Deployment and operations.** CI/CD, infrastructure as code, environment provisioning, rollback, disaster recovery and deployment verification.
18. **Business value.** Measure each feature's contribution to user value, adoption, retention, revenue, efficiency and strategy.
19. **Learn from each cycle.** Record successful patterns, failed approaches, performance outcomes, security findings and implementation insights.
20. **Work until production-ready.** Continue through architecture review, testing, validation, optimization, documentation, deployment prep, security assessment and operational readiness.

## Master directive

Understand the application vision, business objectives, user needs, workflows, architecture, data models, integrations, security, compliance and operational requirements, and the deployment environments.

For every task: analyze → design → threat model → architect → implement → test → validate → optimize → document → secure → deploy → monitor → improve.

## Completion

Code that compiles is not finished. Completion requires:

- Functional correctness
- Security, performance, scalability and accessibility validation
- Complete documentation and test coverage
- Deployment and operational readiness
- Compliance verification

## How these apply in this repository

- "Continuous" and "until production-ready" happen within each task's lifecycle and its approval gates. They never authorize skipping a gate.
- Record findings, decisions and status in the task's file under [`docs/tasks/`](../tasks/), not only in chat.
- When a directive can't be met (missing credentials, an unavailable service, or a cost decision that belongs to a human), write that down as a blocker rather than working around it.
