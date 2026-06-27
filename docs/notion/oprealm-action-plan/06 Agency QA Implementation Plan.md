# Agency QA Implementation Plan

1. Add CreativeReviewJob, CreativeScorecard, QAFeedback, RevisionRequest, and AssetVersion schemas.
2. Add creative QA state machine docs.
3. Add Agency QA ADR.
4. Add pre-video gate rule to AGENTS.md.
5. Build low-cost generation stages first: concepts, copy, storyboard, static keyframes.
6. Build Creative Review Job creation.
7. Build QA scorecard generation.
8. Build Revision Planner.
9. Build revision loop.
10. Add token rules so video tokens are reserved only after approved_for_video.
11. Add post-render QA.
12. Add campaign coherence review.
13. Add admin/human review fallback after max revision loops.
