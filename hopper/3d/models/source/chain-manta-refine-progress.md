# M-011 Chain Manta canonical art pass

Candidate only: `local/hopper-chain-manta-refine/`. Root handles commits and production integration.
Source: `chain_manta_refine.py`, imports scaffold `chain_manta.py`, surface helpers
from `wasp_refine.py`/`phase_skate_refine.py`, and reusable studio/render from
`window_ray_refine.py` (its module globals point to this candidate).

Reference inspected: `design/references/enemies/chainManta-turnaround-preview.jpg`.
Rebuild: `/Applications/Blender.app/Contents/MacOS/Blender --background --python hopper/3d/models/source/chain_manta_refine.py -- --qa`
Blender requires existing authorized sandbox escalation (sandbox startup crashes).
Log: `/tmp/chain-manta-refine.log`.

Initial art pass: 4,674 / 1,940 authored triangles, exact 14.2 × 7.3 × 7.6 bounds.
Both LODs preserve 18 joints, ten actual interlocking links per chain, all seven
clips, and six uniquely named sockets. Wing rotation axes corrected to bend rather
than twist. Dissolve scale now occurs once at Body instead of compounding through
all child joints. Socket world matrices are refreshed before bone parenting.

Status: initial renders/animation QA being reviewed; materials/armor seating and
hook silhouettes still receiving refinement. Not yet recommended for integration.
