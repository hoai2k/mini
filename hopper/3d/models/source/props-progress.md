# Props M-068–M-082 progress

- Read `BUILD-CONTRACT.md`, the prop request table, all five prop plate JSON files,
  modelling notes, `standins/src/props.js`, and extracted numeric stand-in contracts.
- Inspected all five generated reference plates at native preview resolution.
- Implemented all 15 dispatch targets in `props.py`. The module uses only the
  common helper contract and needs no API extension.
- Validated with `ast.parse`, `py_compile` using a writable cache, and
  `git diff --check`.

## Authored behavior

| Request | Asset | Clips | Sockets | Notes |
| --- | --- | --- | --- | --- |
| M-068 | Spring pad | `Idle`, `Active` | `Launch [0,2,0]` | Cyan plate and white ring share a compression pivot. |
| M-069 | Signal | `Spin` | `Pickup [0,1.8,0]` | Twin gold crystals and halo orbit as one collectible assembly. |
| M-070 | Signal cage | `Open` | `Prize [0,3,0]`, `Lock [0,9.2,0]` | Ten cyan energy bars retract; the violet crown flares and vanishes. No captive mesh is baked in. |
| M-071 | Lockdown emitter | `Active` | `FieldAnchor [0,15.5,0]` | Faceted pylon, four claw feet, paired gold rails, pulsing orb. |
| M-072 | Lockdown dome | `Active`, `Open` | none | 520 x 260 x 520 half-dome mesh with sparse ground anchors. |
| M-073 | Checkpoint totem | `Idle`, `Active` | `Respawn [0,0,6]` | Ivory lamp pulses behind a six-bar brass cage. |
| M-074 | Recovery capsule | `Spin` | `Pickup [0,2,0]` | Entire cream/red capsule rotates through one pivot. |
| M-075 | Thermal vent | `Flow` | `LiftBase [0,2,0]`, `LiftTop [0,160,0]` | Grated hardware with four sparse 160 m heat ribbons. |
| M-076 | Wind lane | `Flow` | `FlowStart [-100,0,0]`, `FlowEnd [100,0,0]` | Paired field pylons, low-cost boundary hoops, seven flowing ribbons. |
| M-077 | Gravity gate | `Active` | `FlipPlane [0,20,0]` | Obsidian frame, violet slatted curtain, five alternating arrows. |
| M-078 | Launch gate | `Active` | `Entry [0,99,10]` | 203 m rust ring with clamps, struts, star portal, and radial energy detail. |
| M-079 | Eye laser bolt | `Pulse` | none | Forward-axis hex capsule and bright core; no Hopper mesh. |
| M-080 | Kick arc | `Active` | none | Two low-poly gold arc strips; no Hopper leg mesh. |
| M-081 | Guard shield | `Active` | `Anchor [0,0,-1.8]` | Front-facing faceted teal half-dome with white rim and nodes. |
| M-082 | Shadow dissolve | `Dissolve` | none | Fourteen deterministic charcoal/violet shards and one pale flash. |

## Deliberate interpretation

- Field materials are opaque under the current common API, so the lockdown dome,
  thermal column, and wind lane use sparse geometry instead of full solid volumes.
- The signal cage follows the modelling-note reconciliation: cyan machinery and
  bars, a violet breakable crown, and no captive enemy or collectible.
- Static effect requests receive short presentation clips where motion conveys
  intended gameplay; the source geometry remains rooted and contains no character.
