"""Single source for the 3D asset requests.

Emits ../model-requests.md, ../image-requests.md and ../standin-manifest.json
so the request documents, the stand-in manifest and the stand-in tests can
never disagree about an asset's id, rig, stand-in or status.

Run: python3 build_requests.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Rig vocabulary used throughout. Every model request names one of these.
RIGS = {
    'skeletal': 'Skeletal, skinned. Joints listed, clips authored, sockets as named empties. Delivered as GLB with KHR_mesh_quantization + EXT_meshopt_compression, +Y up, +Z forward, metres, like the Hopper GLBs.',
    'rigid': 'Rigid hierarchy. Separate parts parented to named pivots, animated by transforms only (no skinning). Same GLB conventions.',
    'spline': 'Spline chain. A run of bones along a curve that the game drives at runtime (follow-the-leader or IK). Deliver the bone chain, one rest curve and any head/tail clips.',
    'static': 'Static mesh. No rig; collision comes from the game (see landings). Optional UV scroll for belts.',
    'blend': 'Blend shapes added to a skeletal rig for organic tells (throat inflate, bell pulse, wing fold).',
}

# ---------------------------------------------------------------------------
# Models (M-###). size is metres [x, y, z]. tris are LOD0 / LOD1 budgets.
# ---------------------------------------------------------------------------
M = []
def model(id, name, category, rig, size, tris, standIn, final, status, summary, joints='', clips='', sockets='', textures='2K hand-painted albedo, 1K emissive mask', region=None, landings=None, notes='', existing=None, needs=None):
    M.append(dict(request=id, name=name, category=category, rig=rig, size=size, tris=tris, standIn=standIn, final=final, status=status, summary=summary, joints=joints, clips=clips, sockets=sockets, textures=textures, region=region, landings=landings, notes=notes, existing=existing or [], needs=needs or []))

model('M-000', 'Hopper and rider (combined GLB)', 'hopper', 'skeletal', [23, 19, 29], '94,925 delivered', 'hopper.proxy', 'models/hopper-rider.glb', 'delivered',
      'The delivered insect rig (51 joints) with the boy parented under Hopper.Seat. The 3D game loads this file as-is; the proxy exists for engine tests and for scale in stand-in scenes.',
      joints='thorax, abdomen, head, 3 antenna joints per side, 3 joints per leg × 6, wing.L/R, saddle', clips='25 delivered (see models/manifest.json)', sockets='18 Hopper + 8 rider sockets (see models/manifest.json)', textures='delivered 4K colour + normal')
model('M-001', 'Hopper: traversal and air-combat clips', 'hopper', 'skeletal', [23, 19, 29], 'existing mesh', 'hopper.proxy', 'models/hopper-rider.glb (new clips)', 'open',
      'New clips on the existing HopperRig. No mesh or joint changes. Walk/Run stay in place; every airborne clip is physics-driven (no root motion). Wings open from the folded rest pose.',
      clips='Wing_Open (0.25 s), Glide_Loop (wings spread, hind legs trailing), Wing_Close (0.2 s), Dive_Loop (legs tucked, head down), Stomp_Land (deep compression + shockwave pose, 0.6 s), Air_Kick (Spin_Kick timed for 0.6 s with the body level), Wall_Kick (plant + push, 0.35 s), Ledge_Mantle (front legs hook, haul, 0.7 s), Hop_Back (0.45 s), Crouch_Charge_Loop (femurs compressing progressively, 0.8 s, sampled by charge), Super_Leap_Start (0.3 s), Lock_Strafe_L/R (sidestep loops), Hit_Air (0.5 s), Land_Heavy (from a dive, 0.8 s)',
      sockets='existing; add Hopper.Wing.L/R tip sockets for glide trails', textures='existing')
model('M-002', 'Rider: reaction clips', 'rider', 'skeletal', [2.6, 5.6, 1.4], 'existing mesh', 'hopper.proxy', 'models/hopper-rider.glb (new rider clips)', 'open',
      'Additional seated reactions layered over Riding_Idle: Glide_Lean (arms back, scarf streaming), Dive_Tuck, Stomp_Brace, Point_Forward (used by Horizon View), Look_Up_Long (watching a flyer), Cheer_Short. All local to the seat; never leave the couch.',
      clips='6 listed', sockets='existing', textures='existing')

ENEMY_DATA = [
    # id, name, region, rig, size, tris, joints, clips, sockets, summary
    ('shadeHound', 'Shade Hound', 'fields', 'skeletal', [3, 3, 9], '6k / 2k', 'spine ×3, neck, head, jaw, tail ×3, 4 legs × 3', 'Idle, Prowl, Run, Crouch_Tell, Pounce (root motion), Land, Bite, Hit, Dissolve', 'Core (belly ribs), Mouth, Hitbox.Body',
     'Low angular quadruped with luminous ivory ribs. Pounces at Hopper from cover and from rooftops; the ribs open when it lands.'),
    ('seedSpitter', 'Seed Spitter', 'fields', 'blend', [5.3, 5.8, 5.5], '5k / 1.5k', 'stalk ×3, bulb, 6 petals, throat; blend: ThroatInflate', 'Idle, Root_Sway, Inflate_Tell, Spit ×3, Stagger, Dissolve', 'Core (stalk base), Mouth, Hitbox.Body',
     'Rooted ink flower. Inflates its throat, then lobs three arcing seeds. Rooted on terraces and roof gardens; cannot move, so it is the sniper the route bends around.'),
    ('windowRay', 'Window Ray', 'city', 'skeletal', [11, 0.9, 6.3], '4k / 1.2k', 'body, wing.L/R ×2, tail ×2, eye', 'Hover, Bank_L/R, Dive_Tell (pause, wings fold), Dive (root motion), Recover, Hit, Dissolve', 'Core (back), Mouth (eye), Hitbox.Body, Landing (stomp target)',
     'Flat winged silhouette that hangs between towers, pauses, then dives in a straight line. Its back is a stomp platform: the first flyer the player learns to bounce off.'),
    ('spireLeech', 'Spire Leech', 'city', 'spline', [1.3, 1.3, 8.2], '5k / 1.5k', '7 chain bones, head, jaw', 'Cling_Idle, Crawl (surface-relative), Charge_Tell (eye glow), Beam_Hold, Retract, Hit, Dissolve', 'Core (mid segment), Emitter (mouth), Hitbox.Body',
     'Segmented wall-clinger. Crawls on any tower face, charges a visible eye, then projects a horizontal beam across a gap. Killed from the flank or with a reflected shot.'),
    ('cragTortoise', 'Crag Tortoise', 'mountains', 'skeletal', [7.1, 4.7, 8.6], '7k / 2k', 'spine ×2, shell (rigid child), head, jaw, 4 legs × 3', 'Idle, Walk, Lunge_Tell (rear up), Lunge (root motion), Belly_Open_Hold, Withdraw, Hit, Dissolve', 'Core (belly), Mouth, Hitbox.Shell (rejects stomps), Hitbox.Body',
     'Armoured dome with a pale belly shown only during its uphill lunge. Stomping the spikes bounces Hopper off harmlessly; the belly is the only target.'),
    ('riftCondor', 'Rift Condor', 'mountains', 'skeletal', [18, 0.9, 5.1], '5k / 1.5k', 'body, wing.L/R ×3 (crescent), tail, head', 'Soar, Mark_Corridor (feather trail), Swoop (root motion), Climb_Out, Hit, Dissolve', 'Core (sternum), Mouth, Hitbox.Body, Landing',
     'Skeletal crescent-winged soarer that rides the same thermals Hopper does. Marks a dive corridor, swoops, climbs out. Sharing thermals makes it a mid-air duel.'),
    ('furnaceHound', 'Furnace Hound', 'foundry', 'skeletal', [3.8, 4.1, 11.2], '7k / 2k', 'as Shade Hound + 2 shoulder vents', 'Idle, Vent_Tell, Charge (root motion, straight line), Skid, Bite, Hit, Dissolve', 'Core (ribs, hot), Mouth, Vent.L/R (emitters), Hitbox.Body',
     'Broad-shouldered hound with ember seams. Vents, then charges in a straight line along conveyors and decks. Jumped over and struck from behind, or stomped mid-skid.'),
    ('slagCaster', 'Slag Caster', 'foundry', 'skeletal', [9.9, 6.8, 5.4], '8k / 2.5k', 'spine ×2, head, 2 arms × 3 with ladles, 2 legs × 2', 'Idle, Waddle, Scoop_Tell, Lob (both arms), Core_Open_Hold, Close, Hit, Dissolve', 'Core (furnace belly), Emitter.L/R (ladles), Mouth, Hitbox.Body',
     'Pot-bellied soot silhouette with ladle forelimbs. Lobs slag that cools into temporary stepping stones; its core opens briefly after each throw.'),
    ('chainManta', 'Chain Manta', 'harbor', 'skeletal', [14.2, 7.3, 7.6], '6k / 2k', 'body, wing.L/R ×3, hook.L/R, tail ×3, tether (spline, 6 bones)', 'Soar, Tether_Tell, Tether_Pull (wings brace), Release, Bank, Hit, Dissolve', 'Core (back), TetherNode (weak point at the tether end), Hook.L/R, Hitbox.Body, Landing',
     'Hook-winged flyer that drops a tether onto a container or crane load and drags it sideways. Shooting the tether node frees the platform; stomping its back is a big bounce.'),
    ('ballastCrab', 'Ballast Crab', 'harbor', 'skeletal', [9.5, 4.1, 5.6], '8k / 2.5k', 'body, 2 claws × 3, 6 legs × 3', 'Idle, Scuttle (sideways), Rear_Tell, Slam (root motion), Core_Exposed_Hold, Settle, Hit, Dissolve', 'Core (rear vent), Claw.L/R, Hitbox.Body, Hitbox.Claws (block)',
     'Wide anchor-clawed heavy. Rears up and slams a deck, sending a shockwave along the surface; the rear core is exposed while it settles. Fought by circling, or from above.'),
    ('coilWraith', 'Coil Wraith', 'launchworks', 'spline', [1.6, 13.8, 1.5], '4k / 1k', '9 ribbon bones between two node anchors', 'Ribbon_Idle, Charge_Tell (nodes brighten), Beam_Hold (lane beam), Break (a node destroyed), Dissolve', 'Node.Top.Core, Node.Bottom.Core, Hitbox.Body',
     'Tall ribbon of shadow strung between two electrical nodes. Fills a lane between scaffolds with a beam until a node is shot out. A gate, not a chaser.'),
    ('turbineWasp', 'Turbine Wasp', 'launchworks', 'rigid', [7.7, 3.4, 6.1], '6k / 2k', 'body, 3 fan pivots (spin), intake ring, stinger, 2 legs', 'Hover, Intake_Tell (ring contracts), Dash (root motion), Guard_Break (fans stall), Hit, Dissolve', 'Core (intake ring), Fan.L/R/Tail, Hitbox.Body, Landing (after guard break)',
     'Three blunt fan lobes and a pointed tail. Contracts its intake ring, then dashes. Kicking it stalls the fans and turns it into a platform for a follow-up stomp.'),
    ('basaltBurrower', 'Basalt Burrower', 'red', 'skeletal', [7.7, 4.1, 11.4], '7k / 2k', 'spine ×3, drill (spin pivot), 4 legs × 3', 'Buried_Idle, Tunnel (surface crack trail), Erupt_Tell, Erupt (root motion up), Land, Withdraw, Hit, Dissolve', 'Core (unarmoured back), Drill, Hitbox.Body',
     'Drilling snout and broken dorsal plates. Tunnels under the ground Hopper is about to land on, cracks trace its path, then it erupts. The back is soft as it emerges.'),
    ('thornChoir', 'Thorn Choir', 'red', 'blend', [6.6, 7.2, 6.9], '6k / 2k', 'base, 3 stems × 3, 3 heads; blend: Sing_Open per head', 'Idle, Sing_Tell (heads open in sequence), Fan_Volley, Stagger (kicked), Dissolve', 'Core (base), Mouth0..2, Hitbox.Body',
     'Stationary fan of three pointed masks that sing a spreading projectile fan. Kicking one head staggers the whole choir; lasers between pulses.'),
    ('veilMedusa', 'Veil Medusa', 'blue', 'blend', [7, 8.4, 7], '6k / 2k', 'bell (blend: Pulse), 10 tendril chains × 4', 'Drift, Flash_Tell, Radial_Pulse, Stomped_Rebound (bell compresses), Hit, Dissolve', 'Core (bell core), Hitbox.Bell (stomp target: high rebound), Hitbox.Tendrils',
     'Umbrella of shadow with long soft tendrils, drifting in low gravity. Flashes, then pulses radially. Its bell is the springiest stomp in the game and the way up through the reef towers.'),
    ('phaseSkate', 'Phase Skate', 'blue', 'rigid', [8.7, 0.9, 6.1], '3k / 1k', 'body, 2 wing pivots, 3 tail shards', 'Glide, Fade_Out, Silhouette_Hold (destination ghost), Fade_In, Dash (root motion), Hit, Dissolve', 'Core (eye), Hitbox.Body (inactive while faded)',
     'Thin diamond ray with a broken tail. Fades, leaves a destination silhouette, becomes solid, dashes. Untouchable while faded; a free stomp for the 0.4 s after it solidifies.'),
    ('mirrorStalker', 'Mirror Stalker', 'violet', 'skeletal', [4.1, 6.2, 12.6], '8k / 2.5k', 'spine ×3, neck, mask head, 2 horns, 4 legs × 3 (digitigrade), crescent tail', 'Stance_Floor, Stance_Ceiling, Stalk, Lunge_Tell (mask tilts), Lunge (root motion), Land, Hit, Dissolve', 'Core (exposed ribs), Mouth, Hitbox.Body, SurfaceNormal (which way is down for it)',
     'Forked ivory mask and long crescent limbs. Walks floors and ceilings and lunges at a mirrored angle. Its stance always shows which surface it stands on.'),
    ('gravityCantor', 'Gravity Cantor', 'violet', 'rigid', [8.9, 4.7, 8.9], '5k / 1.5k', 'ring (spin), core, 4 prong pivots', 'Ring_Idle, Count_In (prongs rise ×3), Gate_Activate, Gate_Hold, Core_Exposed, Dissolve', 'Core (ring centre), Emitter0..3 (prong tips), Hitbox.Ring',
     'Floating ring organ with four hanging prongs. Counts in, then flips local gravity in a marked volume beneath it. Shot in the core, or simply flown around.'),
]
for i, (key, name, region, rig, size, tris, joints, clips, sockets, summary) in enumerate(ENEMY_DATA):
    model(f'M-{3 + i:03d}', name, 'enemy', rig, size, tris, f'enemy.{key}', f'models/enemies/{key}.glb', 'stand-in', summary, joints=joints, clips=clips, sockets=sockets, region=region)

BOSS_DATA = [
    ('nightRook', 'Night Rook', 'mountains', 'skeletal', [65, 41, 16], '40k / 12k', 'spine ×4, neck ×2, head, beak, 2 wings × 5 (blade feathers as rigid children), 2 arms × 3 with talons, 2 legs × 3', 'Perch_Idle, Take_Off, Soar, Mark_Corridor, Sweep (root motion), Land, Feather_Fan, Channel_Tell, Channel_Hold, Wing_Guard_Break, Core_Open, Stagger, Defeat_Dissolve', 'Core (sternum), WingJoint.L/R (kick targets), Mouth, Hitbox.Body, Landing (back, after wings fold)',
     'Skeletal raven of folded night, 3 H tall with a 6 H span. Fights around the transmitter mast: dives past the summit shelves, fans feathers from the mast top, lands to channel through its wing joints.'),
    ('smelterLeviathan', 'Smelter Leviathan', 'launchworks', 'spline', [17, 12, 149], '60k / 18k', '16-segment spline chain, head with maw, 2 tail blades; each segment has a rigid ring and 2 leg pivots', 'Coil_Idle, Climb_Gantry, Tail_Sweep, Breath_Tell, Breath_Hold, Core_Crack (segment), Uncoil, Defeat_Dissolve', 'Core0..4 (every third segment), Mouth (furnace maw), Hitbox.Segment0..15, Landing.Segment (cracked segments)',
     'Segmented shadow centipede in stolen foundry rings, 8–10 H long, coiled around the gantry elevator tower. The fight climbs the tower while its cores open in sequence.'),
    ('eclipseRegent', 'Eclipse Regent', 'violet', 'skeletal', [45, 69, 21], '45k / 14k', 'spine ×5, neck, head, crown (rigid), 4 arms × 3 with claws, 2 legs × 3, mantle (cloth sim or 6 chain bones), black sun halo (rigid spin)', 'Idle_Hover, Descend, Ring_Crawl_Summon, Hands_Lower_Tell, Hands_Slam, Heart_Open_Hold, Lance_Call, Inversion_Count_In (1.5 s), Phase_Shift ×2, Stagger, Defeat_Dissolve', 'Core (heart), Hand0..3 (kick targets when lowered), Mouth, Hitbox.Body, Halo',
     'Crowned ring of black space over a four-armed body, 5 H tall. Three phases over the eclipse dais: heavy gravity crawling rings, low gravity lances, then alternating floor and ceiling gravity.'),
]
for i, (key, name, region, rig, size, tris, joints, clips, sockets, summary) in enumerate(BOSS_DATA):
    model(f'M-{21 + i:03d}', name, 'boss', rig, size, tris, f'boss.{key}', f'models/bosses/{key}.glb', 'stand-in', summary, joints=joints, clips=clips, sockets=sockets, region=region, textures='4K hand-painted albedo, 2K emissive mask')

STRUCTURE_DATA = [
    # region, key, name, rig, size, tris, landings, summary
    ('fields', 'terraceStep', 'Terrace step', 'static', [62, 19, 41], '3k', 'one per tier', 'Three-tier planted terrace with irrigation lips. The first thing Hopper climbs; the tiers are one hop apart.'),
    ('fields', 'farmhouse', 'Farmhouse', 'static', [35, 12, 35], '2k', 'ridge', 'Ivory farmhouse with a red tile roof and chimney. Barely reaches Hopper\'s knees; a scale prop first, a ridge landing second.'),
    ('fields', 'silo', 'Grain silo', 'static', [11, 32, 11], '1.5k', 'cap', 'Concrete drum with a conical cap. The first tall thing in the fields; the cap is a one-Hopper landing.'),
    ('fields', 'windbreak', 'Windbreak row', 'static', [52, 24, 6], '3k', 'none', 'Row of six poplars. Lines the routes and shows wind direction; not landable (canopy is soft collision that slows a fall).'),
    ('fields', 'seedPod', 'Fallen seed vessel', 'rigid', [25, 34, 29], '4k', 'none', 'Crashed shadow vessel, half-buried, spines glowing violet. Spawns hounds when Hopper passes; the pod cracks open (rigid lid pivot).'),
    ('city', 'ivoryTower', 'Ivory tower', 'static', [31, 133, 31], '6k', 'roof + ledge per band', 'Stepped ivory tower with teal glass bands, 90–150 m. The roof is the prize; each band ledge is a wall-kick rest.'),
    ('city', 'roofDeck', 'Roof deck block', 'static', [44, 44, 28], '3k', 'roof', 'Low mid-rise with a parapet and vents. The rooftop-run floor of Crownline City; decks sit a tap-jump apart.'),
    ('city', 'railSpan', 'Elevated rail span', 'static', [166, 32, 10], '4k', 'deck', 'Elevated line on ivory piers. The train runs along it (M-036 moves on TrackStart→TrackEnd). Landing on the deck is safe; the train pushes, never hurts.'),
    ('city', 'trainCar', 'Train car', 'rigid', [23, 5, 5], '2k', 'roof', 'Cream and red carriage, teal windows. A moving platform whose roof carries Hopper along the span.'),
    ('city', 'constructionCrown', 'Construction crown', 'rigid', [62, 132, 35], '8k', 'one per floor + jib', 'Open-frame tower under construction, six slabs and a tower crane. The jib is a rigid pivot that slews slowly; the classic ladder climb.'),
    ('city', 'billboard', 'Rooftop billboard', 'rigid', [25, 43, 2], '1.5k', 'board top', 'Painted billboard on a post. Its top is a thin landing; it tilts (rigid pivot) when landed on, dropping Hopper onto the deck below. Never hurts.'),
    ('city', 'observatoryDome', 'Highline observatory', 'static', [55, 53, 55], '5k', 'crown, ring', 'Ivory drum and teal glass dome at the top of the city. The region\'s exit landmark; the crown is the checkpoint.'),
    ('mountains', 'cragColumn', 'Crag column', 'static', [57, 94, 57], '4k', 'top', 'Tilted stack of slate blocks with a turf cap. The gorge\'s stepping stones, 60–130 m tall.'),
    ('mountains', 'ledgeShelf', 'Ledge shelf', 'static', [52, 9, 19], '1.5k', 'shelf', 'Turf-topped rock shelf that bolts onto a cliff face. The unit every climbing route is built from.'),
    ('mountains', 'ravineBridge', 'Ravine bridge', 'static', [124, 42, 10], '3k', 'deck', 'Timber deck on slate pylons across a gorge. Wide enough to fight on, narrow enough to be knocked off.'),
    ('mountains', 'transmitterMast', 'Summit transmitter', 'rigid', [50, 217, 50], '8k', 'plinth', 'The mast on the summit: plinth, three mast sections, red rings, beacon. Region and mission landmark; the Night Rook\'s perch. Rings rotate (rigid).'),
    ('mountains', 'windsock', 'Windsock', 'rigid', [7, 14, 3], '0.5k', 'none', 'Orange sock on a pole, aligned to the nearest wind lane. Rigid pivot; a wind signal, not a platform.'),
    ('foundry', 'furnaceTower', 'Furnace tower', 'static', [39, 112, 39], '6k', 'roof, catwalk', 'Iron drum with rust bands, a stack and a glowing furnace door. The door is a thermal source: heat lifts Hopper.'),
    ('foundry', 'conveyorSpan', 'Conveyor span', 'static', [93, 23, 8], '3k', 'belt', 'Rollered belt on legs, UV-scrolled. Adds its velocity to Hopper; belts running against the route are the foundry\'s treadmill fights.'),
    ('foundry', 'chimney', 'Chimney', 'static', [12, 114, 12], '1.5k', 'lip', 'Tall rust stack. A one-Hopper lip 110 m up and a thermal above it.'),
    ('foundry', 'slagBarge', 'Slag barge', 'rigid', [41, 6, 17], '2k', 'gunwales', 'Iron barge of glowing slag on the casting channel. Moves along a path; the slag surface is a hot updraft, the gunwales are the walkway.'),
    ('foundry', 'stampingPress', 'Stamping press', 'rigid', [31, 44, 21], '4k', 'anvil, head', 'Two columns, a ram and an anvil. The ram (rigid) cycles with a long warning stroke; it flings Hopper aside, it never crushes.'),
    ('harbor', 'craneBoom', 'Crane boom', 'rigid', [85, 96, 10], '5k', 'boom, hooked container', 'Dock crane on a green-steel mast. The boom slews (rigid pivot) and carries a container on a cable; both are landings that move.'),
    ('harbor', 'containerStack', 'Container stack', 'static', [48, 18, 10], '3k', 'one per row', 'Stepped stack of coloured containers. The dock\'s stairs; the top row is a tap-jump above the quay.'),
    ('harbor', 'freighter', 'Freighter', 'static', [228, 65, 41], '10k', 'deck, cargo tops, bridge roof', 'Green-steel freighter on the storm channel: deck, four cargo blocks, bridge and funnel. The chapter\'s long crossing lands on it.'),
    ('harbor', 'gantryTower', 'Gantry tower', 'static', [62, 135, 25], '6k', 'four decks + bridge', 'Four-legged steel tower with decks every 32 m and a bridge on top. The upper gantry the crane forest climbs to.'),
    ('harbor', 'breakwater', 'Breakwater', 'static', [207, 14, 25], '2k', 'top', 'Concrete breakwater with bollards. The region floor at the water\'s edge; the sea beside it is a soft landing that pushes Hopper back ashore.'),
    ('launchworks', 'launchRing', 'Launch ring', 'static', [137, 211, 137], '8k', 'eight ring pads', 'Rust ring on four struts, 200 m up, eight lit pads. The launch spine\'s crown and the Leviathan arena\'s upper tier.'),
    ('launchworks', 'rocket', 'Rocket on the pad', 'static', [31, 163, 20], '5k', 'four umbilical arms', 'Ivory rocket with red fins beside an umbilical mast. Its arms are the climb; the nose is a vista point.'),
    ('launchworks', 'pistonStair', 'Piston stair', 'rigid', [58, 76, 10], '3k', 'one per piston head', 'Five pistons whose heads rise and fall out of phase (rigid). A stair that changes shape; dwell times are generous.'),
    ('launchworks', 'exhaustShaft', 'Exhaust shaft', 'static', [75, 124, 75], '5k', 'four baffles', 'Open iron shaft 120 m deep with staggered baffles. The descent chapter; the vent at the bottom is a thermal back to the top.'),
    ('launchworks', 'gantryElevator', 'Gantry elevator', 'rigid', [20, 155, 17], '3k', 'cage', 'Two rails and a cage (rigid) that rides 140 m. The Leviathan coils around this tower.'),
    ('red', 'ivoryRibArch', 'Ivory rib arch', 'static', [93, 89, 5], '4k', 'crown', 'Bone ribs in a half ring, 45 m high. The basin\'s bridges and the choir\'s perches.'),
    ('red', 'coralSpire', 'Coral spire', 'static', [23, 71, 25], '3k', 'tier', 'Stacked red coral cones with glowing fronds. Vertical cover in heavy gravity.'),
    ('red', 'basinTerrace', 'Ivory-topped terrace', 'static', [72, 13, 41], '1.5k', 'ivory top', 'Coral block with an ivory top. Wide landing shelves that make the short heavy-gravity arcs readable.'),
    ('red', 'coralBridge', 'Staged coral bridge', 'rigid', [140, 31, 12], '3k', 'three stages', 'Three-stage bridge on bone piers that breaks in sequence (rigid stages drop) after Hopper crosses each. Falling lands on the basin floor.'),
    ('blue', 'floatingReef', 'Floating reef', 'rigid', [61, 44, 60], '4k', 'top', 'Reef island with glowing roots and crystals. Drifts slowly on a path (rigid root); the archipelago the whole region is made of.'),
    ('blue', 'rootPillar', 'Root pillar', 'static', [50, 166, 50], '4k', 'four shelves', 'Three twisted reef strands rising 160 m with shelves. The way up when a reef drifts out of reach.'),
    ('blue', 'dustCurrent', 'Dust current', 'static', [120, 23, 24], '0.5k', 'none', 'Luminous dust flow volume (translucent). Marks a moving-island path and lifts a gliding Hopper.'),
    ('violet', 'obsidianArch', 'Obsidian arch', 'static', [93, 72, 17], '3k', 'lintel top', 'Obsidian piers and lintel with a glowing ceiling seam underneath: an inverted lane runs along the seam.'),
    ('violet', 'ringShard', 'Ring shard', 'rigid', [124, 13, 21], '2k', 'face', 'Fragment of a broken planetary ring, orbiting slowly (rigid). Landings that rotate through the sky.'),
    ('violet', 'cathedralFacade', 'Gravity cathedral facade', 'static', [166, 193, 124], '12k', 'roof, steps', 'Obsidian facade with the black sun above the door, twin spires and steps. The final landmark; the Regent\'s arena sits before it.'),
    ('violet', 'gravitySeam', 'Gravity seam', 'static', [100, 4, 2], '0.5k', 'none', 'Glowing seam with animated arrows marking where local gravity changes. Purely a signal; attached to arches and gates.'),
    ('violet', 'eclipseDais', 'Eclipse dais', 'static', [100, 23, 99], '5k', 'dais + six shelves', 'Obsidian dais with a glowing circle and six mirrored shelves at two heights. The Regent arena.'),
]
n = 24
for region, key, name, rig, size, tris, landings, summary in STRUCTURE_DATA:
    model(f'M-{n:03d}', name, 'structure', rig, size, tris, f'structure.{region}.{key}', f'models/structures/{region}/{key}.glb', 'stand-in', summary, landings=landings, region=region, textures='trim sheet (see T-028..T-036) + 1K unique details')
    n += 1

PROP_DATA = [
    ('springPad', 'Spring pad', 'rigid', [11, 3, 11], '1k', 'Cyan plate on an iron base with four chevrons. Plate compresses (rigid) and launches Hopper to 12 H. Regional recolours as in the 2D game.'),
    ('signalBeacon', 'Signal', 'rigid', [3, 5, 3], '0.5k', 'Twin gold crystals and a halo, spinning. The optional collectible; nine per region.'),
    ('signalCage', 'Signal cage', 'rigid', [14, 10, 14], '1.5k', 'Ten shadow bars on a pedestal with a violet crown. Only a reflected shot opens it (crown breaks, bars drop: rigid).'),
    ('lockdownEmitter', 'Lockdown emitter', 'rigid', [10, 18, 10], '1k', 'Obsidian pylon with a violet emitter. Pairs raise the lockdown dome around a knot or boss arena.'),
    ('lockdownDome', 'Lockdown dome', 'static', [520, 260, 520], '1k', 'Translucent violet field (shader). Blocks Hopper, never hurts; drops when the arena is cleared.'),
    ('checkpointTotem', 'Checkpoint totem', 'rigid', [3, 15, 3], '0.8k', 'Ivory post with red bands and a lamp. Lights when reached (emissive swap); Hopper respawns beside it.'),
    ('recoveryCapsule', 'Recovery capsule', 'rigid', [2, 4, 2], '0.5k', 'Cream capsule with a red band and white cross, spinning. Restores two armour pips.'),
    ('thermalVent', 'Thermal vent', 'static', [20, 162, 20], '1k', 'Grate with a translucent rising column. An updraft volume that carries a gliding Hopper up to 160 m.'),
    ('windLane', 'Wind lane', 'static', [202, 40, 40], '0.5k', 'Translucent crosswind volume with streaks. Pushes airborne Hopper sideways; never carries a committed jump past its landing.'),
    ('gravityGate', 'Gravity gate', 'rigid', [62, 40, 5], '1.5k', 'Obsidian sill and lintel with a violet curtain and five arrows (animated). Flips local gravity for whatever passes through.'),
    ('launchGate', 'Launch gate', 'rigid', [203, 203, 16], '4k', 'Rust ring on struts with a glowing portal. The mission-two exit; the star tunnel transition begins at Entry.'),
    ('laserBolt', 'Eye laser bolt', 'static', [0.6, 0.6, 6], '0.1k', 'Red-white capsule with a bright core. Spawned in pairs from Hopper.Laser.L/R.'),
    ('kickArc', 'Kick arc', 'static', [20, 1, 20], '0.2k', 'Translucent gold arc that sweeps with the spin kick. Reads the kick radius (7 m) on screen.'),
    ('shieldDome', 'Guard shield', 'static', [18, 18, 9], '0.5k', 'Translucent teal half-dome at Hopper.Shield with a white rim. Shown while B is held.'),
    ('dissolveBurst', 'Shadow dissolve', 'rigid', [12, 12, 12], '0.5k', 'Fourteen charcoal and violet shards around a pale flash. Every shadow dies into this (scale-up over 0.5 s).'),
]
for i, (key, name, rig, size, tris, summary) in enumerate(PROP_DATA):
    model(f'M-{n + i:03d}', name, 'prop', rig, size, tris, f'prop.{key}', f'models/props/{key}.glb', 'stand-in', summary, textures='1K hand-painted albedo, emissive mask')
n += len(PROP_DATA)

LANDMARKS = [
    ('fields', 'Crownline skyline', 'The city\'s ivory towers seen from the fields, 3 km off. Grows from a haze silhouette to real towers over the region.'),
    ('city', 'Thunderhead summit', 'The mountain and its mast above the city. The observatory at the top of the city looks straight at it.'),
    ('mountains', 'Transmitter mast', 'The mast itself, seen from the gorge floor as a beacon, reached at the summit.'),
    ('foundry', 'Crane forest', 'The dock cranes beyond the foundry smoke.'),
    ('harbor', 'Launch spine', 'The launchworks\' vertical spine and ring above the storm channel.'),
    ('launchworks', 'Star gate', 'The captured launch gate, lit, at the top of the spine.'),
    ('red', 'Black sun', 'The eclipse hanging over the basin; the route climbs toward it.'),
    ('blue', 'Drift moon', 'The huge moon the reefs drift toward.'),
    ('violet', 'Eclipse cathedral', 'The gravity cathedral with its corona, the campaign\'s last landmark.'),
]
for i, (region, name, summary) in enumerate(LANDMARKS):
    model(f'M-{n + i:03d}', f'Landmark: {name}', 'landmark', 'static', [400, 600, 400], '3k (silhouette LOD) / full model reused from the region kit at approach', 'terrain.landmark', f'models/landmarks/{region}.glb', 'stand-in', summary, region=region, textures='painted silhouette colour only; detail arrives with the kit model')
n += len(LANDMARKS)
model(f'M-{n:03d}', 'Region terrain sculpts (×9)', 'terrain', 'static', [2400, 300, 2400], '60k per region (heightfield + cliff meshes)', 'terrain.heightfield', 'models/terrain/<region>.glb + heightmap PNG', 'stand-in',
      'One sculpted heightfield per region with the route\'s plateaus, valleys and floor levels authored in, plus separate cliff meshes where slopes exceed 60°. The game keeps sampling the heightmap for collision, so the sculpt and the heightmap are delivered together. Vertex-painted four-tone colour bands.', textures='terrain set per region (T-019..T-027)')

# ---------------------------------------------------------------------------
# Images and textures (T-###)
# ---------------------------------------------------------------------------
T = []
def image(id, name, category, spec, standIn, final, status, summary, prompt='', region=None):
    T.append(dict(request=id, name=name, category=category, spec=spec, standIn=standIn, final=final, status=status, summary=summary, prompt=prompt, region=region, round=2 if category == 'reference' else 1))

REGION_NAMES = {'fields': 'Sunseed Fields', 'city': 'Crownline City', 'mountains': 'Thunderhead Range', 'foundry': 'Cinder Foundries', 'harbor': 'Tempest Docks', 'launchworks': 'Skyhook Works', 'red': 'Vermilion Basin', 'blue': 'Cobalt Drift', 'violet': 'Violet Inversion'}
SKY_NOTES = {
    'fields': 'honey morning light, huge cumulus, sun low in the east, apricot haze band',
    'city': 'golden sunset, long cloud streaks, warm pink haze',
    'mountains': 'slate grey storm sky, apricot clouds, an eclipse beginning above the summit',
    'foundry': 'ochre smoke sky, orange furnace underglow on the clouds',
    'harbor': 'rain, sea-green overcast, white spray haze',
    'launchworks': 'pale gold above the clouds, rust-red rings, a sea of cloud below the horizon',
    'red': 'red sky under a black sun with a thin corona, dense heat haze',
    'blue': 'ultramarine void, stars, a huge pale moon, luminous dust',
    'violet': 'dark purple nebula sky, broken planetary rings, glowing gravity seams',
}
t = 1
for region, notes in SKY_NOTES.items():
    image(f'T-{t:03d}', f'Sky: {REGION_NAMES[region]}', 'sky', '8192×4096 equirectangular, painted, no lens effects; horizon at the vertical centre; sun or eclipse placed 100° right of +Z', 'terrain.sky', f'textures/sky/{region}.ktx2', 'stand-in',
          f'Painted gouache sky dome for {REGION_NAMES[region]}: {notes}. The lower half is a matching ground haze, never seen directly.', prompt=f'Use case: environment. 1970s anime gouache painted sky, equirectangular panorama, {notes}, dense brushed cloud texture, flat colour fields, no photographic gradients, no text.', region=region)
    t += 1
for region in SKY_NOTES:
    image(f'T-{t:03d}', f'Horizon cards: {REGION_NAMES[region]}', 'horizon', 'two rings of 8 cards, 4096×1024 each, alpha, painted silhouettes at two haze depths', 'terrain.horizon', f'textures/horizon/{region}-<ring>-<n>.png', 'stand-in',
          f'Distant mountains, skylines or structures around {REGION_NAMES[region]}, painted flat in the region\'s haze colours. Placed on a ring 5 km out; never reachable.', prompt=f'Use case: environment. Painted distant {"skyline" if region in ("city","foundry","harbor","launchworks") else "mountain range"} silhouette strip for {REGION_NAMES[region]}, two flat haze tones, gouache texture, transparent above the ridge line, no text.', region=region)
    t += 1
TERRAIN_SETS = {
    'fields': ('grass', 'meadow grass, ploughed terrace soil, dirt road'), 'city': ('ivory', 'ivory paving, teal glass, rooftop gravel'), 'mountains': ('rock', 'slate, alpine turf, scree'),
    'foundry': ('iron', 'iron plate, slag crust, soot ground'), 'harbor': ('wetSteel', 'wet green steel, concrete quay, rain-dark timber'), 'launchworks': ('rust', 'rust plate, pale concrete, cloud-lit steel'),
    'red': ('coral', 'red coral, ivory bone, hot sand'), 'blue': ('reef', 'luminous reef rock, cyan root, blue dust'), 'violet': ('obsidian', 'obsidian, violet seam glass, ring stone'),
}
for region, (texname, desc) in TERRAIN_SETS.items():
    image(f'T-{t:03d}', f'Terrain set: {REGION_NAMES[region]}', 'terrain', 'three 2048² tileable albedo textures (ground, cliff, path) + one 512² splat mask template', f'texture.{texname}', f'textures/terrain/{region}/', 'stand-in',
          f'Hand-painted tileable ground textures for {REGION_NAMES[region]}: {desc}. Two or three flat tones each, visible brush direction, no photo detail. The procedural "{texname}" painter is the placeholder.', prompt=f'Use case: texture. Seamless tileable hand-painted gouache texture, {desc.split(",")[0]}, 1970s anime background style, three flat cel tones, brushed edges, no lighting baked in, no text.', region=region)
    t += 1
TRIM = {'fields': 'ivory plaster, red tile, timber, concrete', 'city': 'ivory panels, teal glass bands, rail concrete, billboard paper', 'mountains': 'slate blocks, timber deck, iron mast', 'foundry': 'iron plate with rivets, rust bands, furnace brick', 'harbor': 'wet green steel, container ribs, crane yellow', 'launchworks': 'rust plate, pale rocket skin, piston brass', 'red': 'red coral, ivory bone', 'blue': 'reef rock, cyan crystal', 'violet': 'obsidian, violet seam, ring stone'}
for region, desc in TRIM.items():
    image(f'T-{t:03d}', f'Structure trim sheet: {REGION_NAMES[region]}', 'trim', '4096² albedo trim sheet + 4096² emissive/mask, 8–12 horizontal strips', f'texture.{TERRAIN_SETS[region][0]}', f'textures/trim/{region}.png', 'stand-in',
          f'Shared trim sheet for the {REGION_NAMES[region]} structure kit: {desc}. Every kit model maps onto this sheet so the region reads as one painting.', prompt=f'Use case: texture. Hand-painted trim sheet strips, {desc}, 1970s anime cel style, flat tones with ink edges, no text.', region=region)
    t += 1
image(f'T-{t:03d}', 'Shadow hide sheet', 'creature', '2048² albedo + emissive, tileable charcoal hide with violet flecks', 'texture.shadow', 'textures/creatures/shadow-hide.png', 'stand-in', 'The base skin every shadow species shares: charcoal interior, violet contour flecks. Species get unique 2K sheets on top (listed with each model).', prompt='Use case: texture. Seamless hand-painted charcoal creature hide with sparse violet flecks, ink texture, 1970s anime cel style, no text.'); t += 1
image(f'T-{t:03d}', 'Toon ramps', 'shading', '3 ramps, 8×1 px: characters (3 tones), structures (3 tones), terrain (4 tones)', None, 'procedural (final)', 'procedural-final', 'The cel gradient maps are generated in code and are final; listed so nobody paints them.'); t += 1
image(f'T-{t:03d}', 'Landing guide decal', 'ui', '512² alpha, ring + centre mark, white with a dark rim', None, 'textures/ui/landing-guide.png', 'open', 'Projected under Hopper while airborne, scaled by height. The single most important 3D readability aid; ships as a vector-clean ring.'); t += 1
image(f'T-{t:03d}', 'Lock-on reticle', 'ui', '256² alpha, four brackets that close on lock', None, 'textures/ui/lock-on.png', 'open', 'Drawn at the locked target\'s Core socket; brackets close when the core is exposed.'); t += 1
image(f'T-{t:03d}', 'HUD icons: dive, glide, lock-on, horizon view, crouch charge', 'ui', '5 icons, 128² alpha, ivory on transparent, matching the existing HUD line weight', None, 'textures/ui/icons-3d.png', 'open', 'New verbs need prompts. Same family as the 2D HUD icons.'); t += 1
image(f'T-{t:03d}', 'Controller diagram (3D controls)', 'ui', 'SVG 1440×580, same style as the 2D diagram', None, 'design/source/controller-3d.svg', 'delivered', 'Authored here from the 2D SVG with the 3D mapping. Used by the instructions screen and this document.'); t += 1
image(f'T-{t:03d}', 'Title poster and logo', 'ui', 'existing inspiration.png and hopper-logo.png', None, 'game/public/assets/inspiration.png, hopper-logo.png', 'delivered', 'The title screen is unchanged. Optional later: a 3D-rendered poster in the same composition once the world is dressed.'); t += 1
image(f'T-{t:03d}', 'Episode cards and transitions', 'ui', 'existing level boards and the four transition illustrations from the 2D design', None, 'design/assets/level-*.png', 'delivered', 'Reused for the play-select screen and mission transitions.'); t += 1
image(f'T-{t:03d}', 'Effect sprites: laser impact, kick spark, stomp shockwave ring, thermal motes, wind streaks', 'effects', '5 atlases, 512² frames, 6–8 frames each, alpha', None, 'textures/effects/', 'open', 'Billboard effects in the painted style; the 2D explosion and emergence atlases are reused for shadow deaths and eruptions.'); t += 1
image(f'T-{t:03d}', 'Gravity seam and gate arrows', 'effects', '256² alpha arrow + 1024×128 seam strip, animated by UV scroll', None, 'textures/effects/gravity.png', 'open', 'The inversion warning graphics; must read at 200 m.'); t += 1
image(f'T-{t:03d}', 'Signal glyphs', 'ui', '9 glyphs, 256² alpha, one per region', None, 'textures/ui/signals.png', 'open', 'Shown on the results screen and the gallery; reused from the 2D signals where they exist.'); t += 1

# ---------------------------------------------------------------------------
# Reference sheets: generated BEFORE the models they describe. A modeller
# works from a turnaround or a kit sheet, not from a single side-view sprite.
# ---------------------------------------------------------------------------
REF_STYLE = 'Same canonical identity as the attached reference. 1970s hand-painted anime cel style, hard ink outlines, flat cel shading, obsidian black armour with restrained violet edge highlights and pale ivory cores where the reference has them. Neutral pose, no scenery, no text, cream paper background.'
ref_by_model = {}
for key, name, region, rig, size, tris, joints, clips, sockets, summary in ENEMY_DATA:
    tid = f'T-{t:03d}'
    image(tid, f'Turnaround: {name}', 'reference', '4096×2048 sheet: side, front, back, top and three-quarter views on one row, plus the open-core pose and the attack tell pose beneath; consistent scale bar', None, f'design/references/enemies/{key}-turnaround.png', 'open',
          f'Model reference for {name} (M-{3 + ENEMY_DATA.index((key, name, region, rig, size, tris, joints, clips, sockets, summary)):03d}). Generated from the existing canonical sprite game/public/assets/enemies/{key}.png (and the -leap or -dive cel where one exists). Must exist before modelling starts.',
          prompt=f'Use case: identity-preserve turnaround. The attached sprite is the canonical {name}; preserve its anatomy, limb count, armour pattern, colours and proportions exactly. Draw a model turnaround sheet: side, front, back, top and three-quarter views in a row at one scale, then the core-exposed pose and the attack tell ({next((c.strip() for c in clips.split(",") if "Tell" in c), "attack tell")}) beneath. {REF_STYLE}', region=region)
    ref_by_model[f'enemy.{key}'] = tid
    t += 1
for key, name, region, rig, size, tris, joints, clips, sockets, summary in BOSS_DATA:
    tid = f'T-{t:03d}'
    image(tid, f'Turnaround: {name}', 'reference', '8192×4096 sheet: side, front, back, top and three-quarter views, the exposed-core state, and one pose per major attack listed in the model request', None, f'design/references/bosses/{key}-turnaround.png', 'open',
          f'Model reference for {name}. Generated from game/public/assets/bosses/{key}.png and design/assets/boss-canonical-lineup.png. Must exist before modelling starts.',
          prompt=f'Use case: identity-preserve turnaround. The attached art is the canonical {name}; preserve silhouette, appendage count, core placement and colours. Draw a boss turnaround sheet: side, front, back, top and three-quarter views at one scale, the core-exposed state, and one pose for each attack: {clips}. {REF_STYLE}', region=region)
    ref_by_model[f'boss.{key}'] = tid
    t += 1
KIT_SHEET_NOTES = {
    'fields': 'planted terraces with irrigation lips, ivory farmhouse with red tile roof, concrete grain silo, poplar windbreak row, half-buried shadow seed vessel with violet spines',
    'city': 'stepped ivory tower with teal glass bands, low roof-deck block with parapet, elevated rail on ivory piers with a cream and red train car, open-frame construction crown with a tower crane, rooftop billboard, ivory observatory with a teal glass dome',
    'mountains': 'tilted slate crag column with a turf cap, turf-topped ledge shelf, timber ravine bridge on slate pylons, summit transmitter mast with red rings and a beacon, orange windsock',
    'foundry': 'iron furnace tower with a glowing door and stack, rollered conveyor span, tall rust chimney, iron slag barge with glowing slag, two-column stamping press',
    'harbor': 'green-steel dock crane with a container on a cable, stepped container stack in five colours, green-steel freighter with an ivory bridge, four-legged gantry tower, concrete breakwater with bollards',
    'launchworks': 'rust launch ring on four struts with lit pads, ivory rocket with red fins beside an umbilical mast, five-piston stair, open iron exhaust shaft with baffles, two-rail gantry elevator cage',
    'red': 'ivory bone rib arch, stacked red coral spire with glowing fronds, coral block with an ivory top, three-stage coral bridge on bone piers',
    'blue': 'floating reef island with glowing roots and crystals, three-strand root pillar with shelves, luminous dust current',
    'violet': 'obsidian arch with a glowing ceiling seam, orbiting planetary ring shard, obsidian cathedral facade with a black sun and twin spires, glowing gravity seam with arrows, obsidian eclipse dais with mirrored shelves',
}
for region, notes in KIT_SHEET_NOTES.items():
    tid = f'T-{t:03d}'
    image(tid, f'Kit sheet: {REGION_NAMES[region]}', 'reference', '8192×4096 sheet: every kit piece drawn in the same painted style at a shared scale with Hopper (14 m) beside one of them, front and three-quarter views, callouts for the flat landing tops', None, f'design/references/kits/{region}.png', 'open',
          f'Model reference for the {REGION_NAMES[region]} structure kit ({", ".join(m["request"] for m in M if m["category"] == "structure" and m["region"] == region)}). Based on the region board design/assets/level-{"1-earth" if region in ("fields","city","mountains") else "2-industry" if region in ("foundry","harbor","launchworks") else "3-alien"}.png and the stand-in contact sheets in hopper/3d/design/assets. Must exist before the kit is modelled.',
          prompt=f'Use case: environment concept sheet. Draw a structure kit sheet for {REGION_NAMES[region]} in the attached region board\'s painted 1970s anime style: {notes}. Every piece at one shared scale with Hopper the Grasshopper (14 m tall, from the attached canonical sheet) standing beside one piece, each piece in front and three-quarter views, flat landing tops clearly readable as lighter planes with dark lips. Flat gouache colour fields, ink edges, no text.', region=region)
    for m in M:
        if m['category'] == 'structure' and m['region'] == region: ref_by_model[m['standIn']] = tid
    t += 1
tid = f'T-{t:03d}'
image(tid, 'Props sheet', 'reference', '8192×4096 sheet: every prop in front and three-quarter views at a shared scale, with the active state beside the idle state', None, 'design/references/props.png', 'open',
      'Model reference for the fifteen props and effects (' + ', '.join(m['request'] for m in M if m['category'] == 'prop') + '). Spring pad, lockdown gate, signal cage and signal keep the identity of the 2D art in game/public/assets/upgrades/props and game/public/assets/upgrades/reference/props; the rest are new. Must exist before the props are modelled.',
      prompt='Use case: prop concept sheet. Draw a prop sheet in the 1970s hand-painted anime cel style of the attached 2D props: cyan spring pad with chevrons, twin-crystal gold signal with a halo, shadow-bar signal cage on a pedestal with a violet crown, obsidian lockdown pylon with a violet emitter and the translucent dome it raises, ivory checkpoint totem with red bands and a lamp, cream recovery capsule with a red band and white cross, grated thermal vent with a rising translucent column, translucent crosswind lane with streaks, obsidian gravity gate with a violet curtain and arrows, rust launch gate ring with a glowing portal, red-white eye laser bolt, gold kick arc, teal guard half-dome, shadow dissolve shards. Each in idle and active state, front and three-quarter views, shared scale with a 14 m Hopper silhouette. No text.')
for m in M:
    if m['category'] == 'prop': ref_by_model[m['standIn']] = tid
t += 1
tid = f'T-{t:03d}'
image(tid, 'Hopper pose sheet for the new clips', 'reference', '8192×4096 sheet: key poses for each requested clip, side and three-quarter views, on the canonical model', None, 'design/references/hopper-new-clips.png', 'open',
      'Animation reference for M-001 and M-002: wings open in a glide, dive with legs tucked, the stomp landing, air kick, wall kick plant, ledge mantle, hop back, the crouch charge at three compression levels, the super-leap launch, lock-on strafe, and the rider\'s glide lean, dive tuck, brace and point. Generated from design/assets/hopper-canonical-v1.png and the action study design/assets/hopper-action-study.png. Must exist before the clips are animated.',
      prompt='Use case: identity-preserve animation key poses. The attached sheets are the canonical Hopper the Grasshopper and rider; preserve them exactly. Draw key poses, side and three-quarter views: wings spread wide in a glide with hind legs trailing; a head-down dive with all legs tucked; a deep stomp landing with the suspension compressed; a mid-air spin kick with the body level; planting the hind legs against a wall to kick off; front legs hooking a ledge to haul up; a short hop backward; the crouch charge at three compression levels; the super-leap launch; sidestepping while facing forward; and the boy leaning back in a glide, tucked in a dive, braced for a stomp, and pointing ahead. 1970s cel anime style, ink outlines, flat shading, no text.')
ref_by_model['hopper.proxy'] = tid
t += 1
for m in M:
    key = m['standIn']
    if m['category'] in ('hopper', 'rider'):
        m['existing'] = ['design/assets/hopper-canonical-v1.png', 'design/assets/hopper-action-study.png', 'models/hopper-rider.glb']
        if m['status'] != 'delivered': m['needs'] = [ref_by_model['hopper.proxy']]
    elif m['category'] == 'enemy':
        k = key.split('.')[1]
        m['existing'] = [f'game/public/assets/enemies/{k}.png', 'design/assets/enemy-silhouettes.png']
        m['needs'] = [ref_by_model[key]]
    elif m['category'] == 'boss':
        k = key.split('.')[1]
        m['existing'] = [f'game/public/assets/bosses/{k}.png', 'design/assets/boss-canonical-lineup.png']
        m['needs'] = [ref_by_model[key]]
    elif m['category'] == 'structure':
        board = 'level-1-earth' if m['region'] in ('fields', 'city', 'mountains') else 'level-2-industry' if m['region'] in ('foundry', 'harbor', 'launchworks') else 'level-3-alien'
        m['existing'] = [f'design/assets/{board}.png', f'game/public/assets/backgrounds/{ {"fields":"fields","city":"city","mountains":"mountains","foundry":"foundry","harbor":"harbor","launchworks":"launchworks","red":"red","blue":"blue","violet":"purple"}[m["region"]] }.webp']
        m['needs'] = [ref_by_model[key]]
    elif m['category'] == 'prop':
        m['existing'] = ['game/public/assets/upgrades/props/spring-pad.png', 'game/public/assets/upgrades/reference/props/signal-cage-intact.png', 'game/public/assets/upgrades/reference/props/lockdown-wall.png']
        m['needs'] = [ref_by_model[key]]
    elif m['category'] == 'landmark':
        m['existing'] = ['the region board and horizon cards (T-010..T-018)']
        m['needs'] = [ref_by_model.get(f'structure.{m["region"]}.' + {'fields': 'silo', 'city': 'ivoryTower', 'mountains': 'transmitterMast', 'foundry': 'furnaceTower', 'harbor': 'craneBoom', 'launchworks': 'launchRing', 'red': 'coralSpire', 'blue': 'floatingReef', 'violet': 'cathedralFacade'}[m['region']], '')]
    elif m['category'] == 'terrain':
        m['existing'] = ['design/assets/level-1-earth.png', 'design/assets/level-2-industry.png', 'design/assets/level-3-alien.png']

# ---------------------------------------------------------------------------
# Round three: found while integrating the round-one pack into the game.
# ---------------------------------------------------------------------------
ROUND3_START = t
image(f'T-{t:03d}', 'Soft-landing surfaces: sea, drift dust, slag', 'surface', 'three 2048² tileable albedos with matching 512² flow/normal-free detail maps: storm-channel sea (Tempest Docks), luminous blue dust (Cobalt Drift), glowing slag (Cinder Foundries); plus a 1024×256 shoreline foam strip with alpha', None, 'textures/surface/{sea,dust,slag}.png', 'open',
      'The design makes every district floor a return to play: water and dust push Hopper back ashore, slag lifts him out. Round one has no painted surface for any of them, so the game draws flat colour. Needed before the docks, drift and foundry districts are built.',
      prompt='Use case: texture. Seamless tileable hand-painted gouache surface, 1970s anime background style, three flat cel tones with brushed edges: (1) storm-grey sea with white spray streaks, (2) luminous ultramarine dust with cyan motes, (3) black slag crust with glowing orange seams. No lighting baked in, no text.'); t += 1
image(f'T-{t:03d}', 'Landing guide, light variant', 'ui', '512² alpha ring and centre mark in ivory with a dark rim, same geometry as ui/landing-guide.png', None, 'textures/ui/landing-guide-light.png', 'open',
      'The delivered guide is dark navy, right for the fields and the city; on the obsidian, slag and reef floors of later regions it disappears. The game picks the variant by region floor luminance.',
      prompt='Use case: interface decal. The attached landing guide, redrawn in ivory #f6edcc lines with a thin dark rim, identical geometry and transparent background, no text.'); t += 1
image(f'T-{t:03d}', 'Hopper effect sprites: laser bolt, eye muzzle glow, guard shield face, glide wing trail', 'effects', 'one 2048² sheet, four 512² alpha elements plus an 8-frame 512² strip for the muzzle glow', None, 'textures/effects/hopper.png', 'open',
      'Round one covered impacts and sparks; Hopper\'s own attacks still use flat shapes: the laser bolt is a red capsule, the shield a translucent dome, the glide has no trail. This sheet gives them paint in the same style as the delivered atlases.',
      prompt='Use case: effect sprites. 1970s anime cel effects on transparent background: a red-white eye laser bolt with a bright core and ink edge, an eight-frame eye muzzle glow, a teal hexagon-patterned shield face with a white rim, and a soft cream glide wing trail. Flat tones, no text.'); t += 1
for region, notes in [('fields', SKY_NOTES['fields']), ('city', SKY_NOTES['city']), ('mountains', SKY_NOTES['mountains'])]:
    image(f'T-{t:03d}', f'Sky repaint at native 4K: {REGION_NAMES[region]}', 'sky-hd', '4096×2048 native (not upscaled) equirectangular painting, same composition and sun position as the delivered sky', None, f'textures/sky/{region}-hd.jpg', 'open',
          f'Optional. The delivered {REGION_NAMES[region]} sky is painted at 1774×887 and upscaled; it reads well at 1080p but softens when the camera looks up at 4K. Only worth doing for the three mission-one skies the player sees most, and only if the softness shows in review.',
          prompt=f'Use case: environment. Repaint the attached sky at the highest native resolution available, keeping its composition, cloud shapes and sun position exactly: {notes}. 1970s anime gouache, brushed clouds, flat colour fields, no text.', region=region); t += 1
image(f'T-{t:03d}', 'Checkpoint totem and spring pad decals', 'ui', '512² alpha sheet: lit and unlit totem lamp faces, a chevron ring for the spring pad plate, a signal-cage crown glyph', None, 'textures/ui/props.png', 'open',
      'Small painted faces for the props the player reads at a glance. The stand-ins draw them as flat emissive shapes; the delivered models (M-071 onward) will carry these as decals.',
      prompt='Use case: prop decals. Hand-painted anime cel decals on transparent background: a glowing ivory lamp face and its dark unlit twin, a ring of four white chevrons on cyan, a violet crown glyph. Flat tones with ink edges, no text.'); t += 1
for x in T:
    if int(x['request'][2:]) >= ROUND3_START: x['round'] = 3

# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------
# Painted pack delivered September 2026; see image-history.md for provenance.
for texture in T:
    if texture['request'] in {f'T-{n:03}' for n in [*range(1, 38), 39, 40, 41, 45, 46, 47]}:
        texture['status'] = 'delivered'

# Round-two artwork is delivered for review; model approval remains pending.
for texture in T:
    if texture['round'] == 2:
        texture['status'] = 'delivered'
        texture['approval'] = 'pending-user-review'

# Round-three artwork (initial delivery, textures/round3/manifest.json): the
# surfaces, the light landing guide, the Hopper effect sheet and the prop decals
# are in the game; the optional 4K sky repaints stay open (native 4K was not met).
ROUND3_DELIVERED = {'surface', 'effects', 'ui'}
for texture in T:
    if texture['round'] == 3 and texture['category'] in ROUND3_DELIVERED:
        texture['status'] = 'delivered'
        texture['approval'] = 'awaiting-verification'
        texture['integration'] = {
            'surface': 'paintTerrain paints the low floor of the harbor (sea), blue (dust) and foundry (slag) districts with the surface and scrolls its detail mask; paintKit puts slag on the barge deck and dust on the drift volumes. The foam strip waits for a district with a shoreline.',
            'ui': 'guideVariant picks the ivory guide on dark floors; the prop decals sit on every totem lamp (lit/unlit), spring pad plate and cage crown.',
            'effects': 'Hopper\'s laser bolts, eye muzzle glow (8 frames), guard shield face and glide wing trails come from the sheet; the flat shapes remain as fallbacks.',
        }[texture['category']]

# Authored high-confidence batch; source, exports and QA live in ../models/.
DELIVERED_HIGH_MODELS = {f'M-{n:03d}' for n in [25, 26, 28, *range(29, 36), 38, 39, 40, *range(41, 56), *range(68, 83)]}
for asset in M:
    if asset['request'] in DELIVERED_HIGH_MODELS:
        asset['status'] = 'delivered'

# Code-built models: three.js geometry painted with the delivered trim and terrain
# sheets, exported by hopper/game/scripts/code-models.mjs to the same GLB contract
# (LOD0/LOD1, sockets, landings, meshopt). The game loads them as delivered; each
# manifest entry says authoring: 'code-built', so painted art can still replace them.
CODE_BUILT_MODELS = {'M-024', 'M-027', 'M-036', 'M-037', *(f'M-{n:03d}' for n in range(56, 68)), *(f'M-{n:03d}' for n in range(83, 93))}
CODE_BUILT_NOTE = {
    'authored': 'Code-built: authored three.js geometry (terrace lips, poplar canopies, slate courses, turf, bolts) painted with the region trim and terrain sheets. In the game; a painted model may still replace it.',
    'standin': 'Code-built from the stand-in geometry, painted with the region trim and terrain sheets and exported with LOD1, sockets and landings. In the game; a painted model may still replace it.',
    'landmark': 'Code-built silhouette from the stand-in, in the region haze colour; keeps the size it is placed at. The region kit model replaces it at approach.',
    'terrain': 'Code-built for the three episode-one districts: the game\'s heightfield generator exported as a 60k-triangle mesh plus a 16-bit heightmap PNG per region (models/terrain/<region>.glb, <region>-height.png). The runtime still samples the generator.',
}
for asset in M:
    if asset['request'] in CODE_BUILT_MODELS:
        asset['status'] = 'delivered'
        asset['authoring'] = 'code-built'
        kind = 'authored' if asset['request'] in ('M-024', 'M-027', 'M-036', 'M-037') else 'landmark' if asset['category'] == 'landmark' else 'terrain' if asset['category'] == 'terrain' else 'standin'
        asset['notes'] = (asset['notes'] + ' ' if asset['notes'] else '') + CODE_BUILT_NOTE[kind]

manifest = {
    'generated_by': 'hopper/3d/design/source/build_requests.py',
    'notes': 'standIn ids resolve through hopper/3d/standins/src/index.js (createStandIn). texture.* ids name procedural painters in textures.js. status: delivered | stand-in | open | procedural-final.',
    'rigs': RIGS,
    'requests': [
        {k: v for k, v in dict(request=m['request'], kind='model', name=m['name'], category=m['category'], region=m['region'], rig=m['rig'], size_m=m['size'], standIn=m['standIn'], final=m['final'], status=m['status'], authoring=m.get('authoring'), references=m['existing'] or None, needs=m['needs'] or None).items() if v is not None}
        for m in M
    ] + [
        {k: v for k, v in dict(request=i['request'], kind='image', name=i['name'], category=i['category'], region=i['region'], standIn=i['standIn'], final=i['final'], status=i['status'], round=i['round']).items() if v is not None}
        for i in T
    ],
}
(ROOT / 'standin-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')

def size(s):
    return ' × '.join(f'{v:g}' for v in s) + ' m'

md = []
md.append('# 3D model requests\n')
md.append('Every model the 3D edition needs, with the rig it must have. Ids are stable: the stand-in manifest, the stand-in registry and the game code use them. `Stand-in` names the procedural placeholder from `hopper/3d/standins/` that is in use until the model arrives; `Final` is where the delivered GLB goes. Generated from `source/build_requests.py`; edit the data there, not this file.\n')
md.append('**Round two references.** Before any model here is started, its reference sheet from `image-requests-round-2.md` is generated and approved: a turnaround per species and commander, a kit sheet per region, a props sheet and a Hopper pose sheet for the new clips. That document maps every sheet to the models that wait on it. A single side-view sprite is not enough to model from; a turnaround is.\n')
md.append('**Code-built entries need a clean-up pass.** They are exported straight from three.js primitives: one mesh per part, no welding between parts, faceted duplicates, full 1024² trim and terrain sheets embedded in every file. `models/CODE-BUILT-CLEANUP.md` lists the Blender processing that turns them into shippable meshes (merge by material, weld and remove hidden faces, retopologise the rock and canopy shells, unwrap to one atlas per model, bake the trim and terrain paint into it, author LOD1 by hand, re-export through the same validator). Until then they cost about 4 MB each, mostly texture.\n')
md.append('**Code-built entries.** Requests marked `delivered` with the note *Code-built* were exported by `hopper/game/scripts/code-models.mjs` (three.js geometry painted with the delivered trim and terrain sheets, same GLB contract, `authoring: code-built` in `models/manifest.json`). They are in the game so episode one plays end to end, and they remain replaceable by painted models without any code change: drop the new GLB at the same path and rerun the validator.\n')
md.append('Conventions for every delivery: glTF binary, metres, +Y up, +Z forward, `KHR_mesh_quantization` and `EXT_meshopt_compression` like the delivered Hopper GLBs, hand-painted albedo (no photographic PBR), emissive masks for cores and lights, LOD0 and LOD1 in the same file, and named sockets as empties. Root motion only where a clip says so.\n')
md.append('## Rig types\n')
for k, v in RIGS.items():
    md.append(f'- **{k}** — {v}')
md.append('\n## Summary\n')
md.append('| Category | Requests | Delivered | Stand-in | Open |\n| --- | ---: | ---: | ---: | ---: |')
for cat in ['hopper', 'rider', 'enemy', 'boss', 'structure', 'prop', 'landmark', 'terrain']:
    rows = [m for m in M if m['category'] == cat]
    md.append(f"| {cat} | {len(rows)} | {sum(r['status']=='delivered' for r in rows)} | {sum(r['status']=='stand-in' for r in rows)} | {sum(r['status']=='open' for r in rows)} |")
md.append(f"| **total** | **{len(M)}** | **{sum(m['status']=='delivered' for m in M)}** | **{sum(m['status']=='stand-in' for m in M)}** | **{sum(m['status']=='open' for m in M)}** |")

md.append('\n## Hopper and the rider\n')
for m in [x for x in M if x['category'] in ('hopper', 'rider')]:
    md.append(f"### {m['request']} · {m['name']}\n")
    md.append(f"{m['summary']}\n")
    md.append(f"- **Rig:** {m['rig']} · **Status:** {m['status']} · **Final:** `{m['final']}` · **Stand-in:** `{m['standIn']}`")
    if m['clips']: md.append(f"- **Clips:** {m['clips']}")
    if m['sockets']: md.append(f"- **Sockets:** {m['sockets']}")
    md.append(f"- **Textures:** {m['textures']}\n")

md.append('## Shadow species (18)\n')
md.append('Sizes are the stand-in\'s measured bounds and the model\'s target. Every species needs: a `Core` socket at its weak point, a `Hitbox.Body` socket, a `Mouth` or `Emitter` socket where it attacks from, the listed clips, a 2K painted sheet over the shared shadow hide (T-037), and a `Dissolve` that hands over to the shared shadow-dissolve effect. Flyers and anything stompable add a `Landing` socket on the surface Hopper bounces from.\n')
for m in [x for x in M if x['category'] == 'enemy']:
    md.append(f"### {m['request']} · {m['name']} ({REGION_NAMES[m['region']]})\n")
    md.append(f"{m['summary']}\n")
    md.append(f"- **Rig:** {m['rig']} — {m['joints']}")
    md.append(f"- **Size:** {size(m['size'])} · **Triangles:** {m['tris']} · **Stand-in:** `{m['standIn']}` · **Final:** `{m['final']}`")
    md.append(f"- **Clips:** {m['clips']}")
    md.append(f"- **Sockets:** {m['sockets']}\n")

md.append('## Shadow commanders (3)\n')
for m in [x for x in M if x['category'] == 'boss']:
    md.append(f"### {m['request']} · {m['name']} ({REGION_NAMES[m['region']]})\n")
    md.append(f"{m['summary']}\n")
    md.append(f"- **Rig:** {m['rig']} — {m['joints']}")
    md.append(f"- **Size:** {size(m['size'])} · **Triangles:** {m['tris']} · **Stand-in:** `{m['standIn']}` · **Final:** `{m['final']}`")
    md.append(f"- **Clips:** {m['clips']}")
    md.append(f"- **Sockets:** {m['sockets']}")
    md.append(f"- **Textures:** {m['textures']}\n")

md.append('## Structure kits (44)\n')
md.append('Each region has a kit that maps onto one trim sheet (T-028..T-036). `Landings` are the flat tops the route tools may use; the stand-in publishes them as `userData.landings` and the final model must keep the same surfaces within 0.5 m. Rigid pieces list the pivot that moves.\n')
for region in REGION_NAMES:
    rows = [m for m in M if m['category'] == 'structure' and m['region'] == region]
    md.append(f'### {REGION_NAMES[region]}\n')
    md.append('| Id | Piece | Rig | Size | Tris | Landings | Stand-in |\n| --- | --- | --- | --- | ---: | --- | --- |')
    for m in rows:
        md.append(f"| {m['request']} | {m['name']} | {m['rig']} | {size(m['size'])} | {m['tris']} | {m['landings']} | `{m['standIn']}` |")
    md.append('')
    for m in rows:
        md.append(f"- **{m['request']} {m['name']}.** {m['summary']}")
    md.append('')

md.append('## Props and effects (15)\n')
md.append('| Id | Prop | Rig | Size | Tris | Stand-in | Final |\n| --- | --- | --- | --- | ---: | --- | --- |')
for m in [x for x in M if x['category'] == 'prop']:
    md.append(f"| {m['request']} | {m['name']} | {m['rig']} | {size(m['size'])} | {m['tris']} | `{m['standIn']}` | `{m['final']}` |")
md.append('')
for m in [x for x in M if x['category'] == 'prop']:
    md.append(f"- **{m['request']} {m['name']}.** {m['summary']}")

md.append('\n## Landmarks and terrain\n')
md.append('Landmarks are the far things: each region shows its exit from its entrance, so each needs a silhouette LOD that reads from 3 km and hands over to the kit model on approach.\n')
md.append('| Id | Landmark | Region | Stand-in | Final |\n| --- | --- | --- | --- | --- |')
for m in [x for x in M if x['category'] == 'landmark']:
    md.append(f"| {m['request']} | {m['name'].replace('Landmark: ', '')} | {REGION_NAMES[m['region']]} | `{m['standIn']}` | `{m['final']}` |")
md.append('')
for m in [x for x in M if x['category'] == 'landmark']:
    md.append(f"- **{m['request']} {m['name'].replace('Landmark: ', '')}.** {m['summary']}")
tm = [x for x in M if x['category'] == 'terrain'][0]
md.append(f"\n### {tm['request']} · {tm['name']}\n\n{tm['summary']}\n\n- **Rig:** {tm['rig']} · **Size:** {size(tm['size'])} per region · **Triangles:** {tm['tris']} · **Stand-in:** `{tm['standIn']}` · **Final:** `{tm['final']}`\n")
md.append('## Generation order\n')
md.append('1. Round one images (`image-requests.md`): skies, horizon cards, terrain sets and trim sheets for the region being built, UI and effects at any time.\n2. Round two reference sheets (`image-requests-round-2.md`): the Hopper pose sheet, the four mission-one species turnarounds, the Sunseed and Crownline kit sheets, the props sheet; then the rest by mission.\n3. Models, each only after its reference sheet is approved: Hopper clips, mission-one species, mission-one kits, props, the Night Rook; then missions two and three.\n')
md.append('## Delivery checks\n')
md.append('- Load through the same glTF loader and meshopt decoder as the Hopper GLBs; `hopper/3d/standins/test` has the socket and size checks each model must pass when its manifest entry flips from `stand-in` to `delivered`.\n- Sockets and clip names exactly as listed; the game code binds by name.\n- Check silhouettes at gameplay distance (35 m camera) against the darkest and brightest region sky.\n- Keep the painted style: flat tones, ink edges, no specular, no normal-map micro detail.\n')
(ROOT / 'model-requests.md').write_text('\n'.join(md) + '\n')

im = []
im.append('# Image and texture requests (3D edition)\n')
im.append('Round one: skies, horizon cards, terrain sets, trim sheets, creature hide, UI and effects for the 3D game. Round two, the model reference sheets, is in [image-requests-round-2.md](image-requests-round-2.md) and was added after round one had begun, so this file is unchanged apart from this note. Everything marked `stand-in` has a procedural placeholder in `hopper/3d/standins/src/textures.js` or `terrain.js` that the game renders until the painting arrives. Generated from `source/build_requests.py`; edit the data there.\n')
im.append('Style for every painted request: the 2D game\'s 1970s cel-and-gouache look. Flat colour fields, two or three tones per surface, visible brush direction, dark ink edges where the 2D sprites have them, no photographic gradients, no lens flare, no text. Region palettes are the exact hex values in `hopper/3d/standins/src/palette.js` (the same ones the 2D game uses).\n')
im.append('## Summary\n')
im.append('| Category | Requests | Delivered | Stand-in | Open | Procedural final |\n| --- | ---: | ---: | ---: | ---: | ---: |')
for cat in ['sky', 'horizon', 'terrain', 'trim', 'creature', 'shading', 'ui', 'effects']:
    rows = [x for x in T if x['category'] == cat]
    im.append(f"| {cat} | {len(rows)} | {sum(r['status']=='delivered' for r in rows)} | {sum(r['status']=='stand-in' for r in rows)} | {sum(r['status']=='open' for r in rows)} | {sum(r['status']=='procedural-final' for r in rows)} |")
R1 = [x for x in T if x['round'] == 1]
im.append(f"| **total** | **{len(R1)}** | **{sum(x['status']=='delivered' for x in R1)}** | **{sum(x['status']=='stand-in' for x in R1)}** | **{sum(x['status']=='open' for x in R1)}** | **{sum(x['status']=='procedural-final' for x in R1)}** |")
for cat, title, intro in [
    ('sky', 'Painted skies (9)', 'One equirectangular dome per region, drawn from inside a 9 km sphere. The stand-in is the procedural gradient-plus-sun in `paintSky`.'),
    ('horizon', 'Horizon cards (9 sets)', 'Two rings of painted silhouettes 5 km and 6.75 km out, in the region\'s haze colours. The stand-in is the cone ring in `makeHorizon`. Each set leaves a gap where the region\'s exit landmark stands.'),
    ('terrain', 'Terrain sets (9)', 'Tileable ground, cliff and path textures blended by a splat mask. The procedural painters named in `Stand-in` are what the game shows meanwhile.'),
    ('trim', 'Structure trim sheets (9)', 'One trim sheet per region kit so every piece shares a palette and a brush.'),
    ('creature', 'Creature', ''), ('shading', 'Shading', ''), ('ui', 'Interface', ''), ('effects', 'Effects', ''),
]:
    rows = [x for x in T if x['category'] == cat]
    im.append(f'\n## {title}\n')
    if intro: im.append(intro + '\n')
    for x in rows:
        im.append(f"### {x['request']} · {x['name']}\n")
        im.append(f"{x['summary']}\n")
        im.append(f"- **Spec:** {x['spec']}")
        im.append(f"- **Status:** {x['status']} · **Stand-in:** `{x['standIn'] or 'none'}` · **Final:** `{x['final']}`")
        if x['prompt']: im.append(f"- **Prompt:** {x['prompt']}")
        im.append('')
im.append('## Delivery history\n\nSee [image-history.md](image-history.md) and [texture pack notes](../textures/README.md) for delivered files, native resolutions, processing and review.\n')
im.append('## Acceptance\n')
im.append('- Inspect every painting at gameplay distance in the viewer (`hopper/3d/viewer/`) against the stand-in it replaces before it is committed.\n- Skies must tile at the seam and keep the sun where `paintSky` puts it, because the directional light is aimed there.\n- Terrain and trim textures must tile; check repeated features at 6× repeat over a 200 m surface.\n- Record prompts, references and acceptance notes in this file\'s history, as the 2D `image-history.md` does.\n')
(ROOT / 'image-requests.md').write_text('\n'.join(im) + '\n')

# Round two: reference sheets, each with the models that wait on it.
r2 = []
r2.append('# Image requests · round two: model reference sheets\n')
r2.append('Added after round one (`image-requests.md`) had begun; nothing in round one changed. These are the references a modeller works from: a turnaround per shadow species and commander, a kit sheet per region drawn at a shared scale with Hopper, a props sheet, and a pose sheet for Hopper\'s new clips. No model in `model-requests.md` should be started before its sheet here is generated and approved. Generated from `source/build_requests.py`.\n')
r2.append('Every prompt attaches the existing canonical art named in its description so identity is preserved. Accept a sheet only after checking limb counts, core placement, colours and scale against that art. Same style as round one: 1970s hand-painted anime cel, ink outlines, flat tones, no text on the sheets.\n')
r2.append('## Delivery and review\n\nAll 32 requested sheets are delivered, with ten larger supporting plates. [Open the review gallery](references/index.html) and read the [modelling notes](references/MODELLING-NOTES.md). Artwork approval is pending; delivered does not mean approved for modelling. Prompts, native resolutions and model contracts accompany each PNG as JSON.\n')
r2.append('## Which models wait on which sheet\n')
r2.append('| Sheet | Models |\n| --- | --- |')
for x in [x for x in T if x['round'] == 2]:
    waiting = [m['request'] for m in M if x['request'] in m['needs']]
    r2.append(f"| {x['request']} {x['name']} | {', '.join(waiting) if waiting else '(reference for animation)'} |")
r2.append('\n## Order\n')
r2.append('Hopper pose sheet first, then the four mission-one species (Shade Hound, Seed Spitter, Window Ray, Spire Leech), the Sunseed Fields and Crownline City kit sheets and the props sheet; then the remaining species, kits and commanders by mission.\n')
r2.append('## Existing art each sheet starts from\n')
r2.append('| Sheet | Attach as identity reference |\n| --- | --- |')
for x in [x for x in T if x['round'] == 2]:
    owner = next((m for m in M if x['request'] in m['needs']), None)
    r2.append(f"| {x['request']} | {', '.join('`' + e + '`' for e in (owner['existing'] if owner else ['design/assets/hopper-canonical-v1.png', 'design/assets/hopper-action-study.png']))} |")
r2.append('\n## The sheets\n')
for x in [x for x in T if x['round'] == 2]:
    r2.append(f"### {x['request']} · {x['name']}\n")
    r2.append(f"{x['summary']}\n")
    r2.append(f"- **Spec:** {x['spec']}")
    r2.append(f"- **Status:** {x['status']} · **Final:** `{x['final']}`")
    r2.append(f"- **Prompt:** {x['prompt']}")
    r2.append('')
(ROOT / 'image-requests-round-2.md').write_text('\n'.join(r2) + '\n')

r3 = []
r3.append('# Image requests · round three: after integrating round one\n')
r3.append('Round one is delivered and in the game (painted skies, horizon cards, terrain sets, trim sheets, shadow hide, reticles, landing guide, effect atlases). Integrating it showed a few things the game still draws flat, and one optional quality pass. Nothing here replaces a delivered file except the optional sky repaints, which sit beside the originals. Generated from `source/build_requests.py`.\n')
r3.append('**Initial delivery integrated.** The surfaces (T-080), the light landing guide (T-081), the Hopper effect sheet (T-082) and the prop decals (T-086) landed in `textures/` (see `textures/round3/manifest.json`, status awaiting-verification: tiling, atlas padding and alpha checks are still due) and the game uses them as each entry below says. The sky repaints (T-083..085) stay open because the generator could not reach native 4K.\n')
r3.append('| Request | Why | Priority |\n| --- | --- | --- |')
for x in [x for x in T if x['round'] == 3]:
    pri = 'optional' if x['category'] == 'sky-hd' else 'before the region that needs it' if x['category'] == 'surface' else 'any time'
    r3.append(f"| {x['request']} {x['name']} | {x['summary'].split('.')[0]}. | {pri} |")
r3.append('\n## The requests\n')
for x in [x for x in T if x['round'] == 3]:
    r3.append(f"### {x['request']} · {x['name']}\n")
    r3.append(f"{x['summary']}\n")
    r3.append(f"- **Spec:** {x['spec']}")
    r3.append(f"- **Status:** {x['status']}{' (' + x['approval'] + ')' if x.get('approval') else ''} · **Final:** `{x['final']}`")
    if x.get('integration'): r3.append(f"- **In the game:** {x['integration']}")
    r3.append(f"- **Prompt:** {x['prompt']}")
    r3.append('')
(ROOT / 'image-requests-round-3.md').write_text('\n'.join(r3) + '\n')
print(f'{len(M)} model requests, {len([x for x in T if x["round"]==1])} round-one images, {len([x for x in T if x["round"]==2])} round-two reference sheets, {len([x for x in T if x["round"]==3])} round-three images, manifest {len(manifest["requests"])} entries')
