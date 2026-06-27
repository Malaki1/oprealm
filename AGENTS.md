# OPRealm Repository Instructions

## OPREALM Content Machine source of truth

Before implementing OPREALM content-machine features, read:

- docs/oprealm-content-machine/00-source-of-truth.md
- docs/oprealm-content-machine/03-master-workflow.md
- docs/oprealm-content-machine/09-agency-quality-layer.md
- docs/oprealm-content-machine/11-pre-video-qa-gates.md
- docs/oprealm-content-machine/22-data-models.md
- docs/oprealm-content-machine/23-api-surface.md
- docs/oprealm-content-machine/24-worker-architecture.md
- docs/oprealm-content-machine/25-state-machines.md
- docs/oprealm-content-machine/29-implementation-roadmap.md

GitHub docs are canonical. Notion-ready docs under `docs/notion/oprealm-action-plan/` are execution planning documents only.

Do not introduce new workflow states, database entities, token rules, QA gates, worker behavior, publishing behavior, scheduling behavior, or analytics behavior without updating the source-of-truth docs, schemas, diagrams, and ADRs.

No high-cost video-generation workflow may be implemented without the documented Agency QA and Pre-Video Gate sequence.
