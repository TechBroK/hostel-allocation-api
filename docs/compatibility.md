# Compatibility & Allocation Algorithm

This document details the pairing model, similarity scoring, and allocation heuristics used by the Hostel Allocation API. The README only contains a short summary; full rationale and tunable parameters live here.

---
## Trait Schema
```json
{
  "sleepSchedule": "early|flexible|late",
  "studyHabits": "quiet|mixed|group",
  "cleanlinessLevel": 1,
  "socialPreference": "introvert|balanced|extrovert",
  "noisePreference": "quiet|tolerant|noisy",
  "hobbies": ["reading","basketball"],
  "musicPreference": "afrobeat",
  "visitorFrequency": "rarely|sometimes|often"
}
```

## Normalization
- Categorical traits mapped to [0,1] (e.g. `early -> 0`, `flexible -> 0.5`, `late -> 1`).
- `cleanlinessLevel` (1–5) scaled linearly to [0,1].
- Hobbies: Jaccard similarity.
- Music: exact match → 1, mismatch → 0, unspecified fallback → 0.5.

## Similarity Calculation
1. Base vector similarity: weighted cosine (default).
2. Affinity blend: (hobbies + music) at 25% combined weight.
3. Penalties: large distance (> 0.8) in core traits (sleep, cleanliness, noise) reduces final score.
4. Final score scaled to integer percentage 0–100.

## Ranges
| Range | Score | Meaning | Default Action |
|-------|-------|---------|----------------|
| veryHigh | 85–100 | Exceptional alignment | auto-pair (capacity permitting) |
| high | 70–84 | Strong match | suggest / fast-track |
| moderate | 55–69 | Viable but review | needs-admin |
| low | <55 | Poor fit | reject |

## Match Suggestions Endpoint
`GET /api/allocations/:studentId/match-suggestions` groups candidates into the ranges above.

## Adaptive Weighting
Every 25 approved pairings slightly increases weights for cleanliness & sleep (demo logic) to reinforce historically successful traits.

## Personality Updates
`PUT /api/students/:studentId/personality` updates traits and invalidates cached suggestions via a signature change.

## Caching Layer
In-memory TTL (5 min) keyed by `studentId|traitSignature` prevents recomputation when nothing changed.

## Auto Allocation Flow
1. Student submits allocation -> system searches pending opposite students for high/veryHigh match.
2. Scores candidate rooms by `(1 - occupied/capacity) + jitter` ensuring balanced utilization.
3. Executes transaction: create/approve allocations, update room occupancy, persist pairing.

## Reallocation
`PATCH /api/allocations/:allocationId/reallocate` attempts move if:
- Target room has space
- Compatibility with existing occupants ≥ moderate
- All updates succeed in a single transaction

## Safety & Constraints
- Transaction per submission & reallocation
- Compound unique index `(student, session)` prevents duplicate entries

## Future Enhancements
- Outcome-based learning (log satisfaction -> train logistic regression)
- Clustering for pre-grouping cohorts
- Feedback-driven negative weighting
- Move cache to Redis for multi-instance deployments

---
## Roadmap (High-Level)
- Notification system (email/webhooks)
- Admin dashboard analytics
- Soft deletes & audit trails
- CI + containerization
- Advanced search (capacity, gender, building proximity)
- ML-driven dynamic weighting

---
Questions or suggestions? Open an issue with the tag `compatibility`.
