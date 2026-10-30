# Micro prototypes: sound effects

Generated with ElevenLabs sound effects (`eleven_text_to_sound_v2`) by [`source/build_audio.py`](source/build_audio.py); edit the data there and rerun it. Loops are generated as loops and crossfaded tail-to-head so they repeat seamlessly; everything is loudness-matched (loops at -20 LUFS, one-shots at -17). The prototypes play them through `micro/prototypes/shared/audio.js`.

Nothing makes a sound we could hear at these scales, so this is nature-documentary foley, as a wildlife film of these scenes would score them: each sound is what the action would feel like if you could hear it, scaled to the creature. The deeper the zoom, the more abstract it gets: bog and moss sounds for the springtail and mite, wet and viscous sounds for the water film and the pool, fizzing and rotary motor sounds for the bacterium.

## Springtail (bog surface)

| Id | Kind | Length | Files | Used for |
| --- | --- | --- | --- | --- |
| `springtail/amb-bog` | loop | 12 s | 1 | Ambience: the bog pool surface at springtail height. |
| `springtail/jump` | oneshot | 0.6 s | 3 | A (dash): the furcula jump. |
| `springtail/land-water` | oneshot | 0.5 s | 3 | Landing on the water film. |
| `springtail/land-sticky` | oneshot | 1.0 s | 1 | Landing on a sundew leaf: stuck. |
| `springtail/eat` | oneshot | 0.6 s | 2 | X (eat): grazing pollen and spores. |
| `springtail/raindrop` | oneshot | 1.5 s | 1 | A raindrop cratering the pool next to you. |
| `springtail/stenus-skim` | oneshot | 1.2 s | 1 | The rove beetle skimming across the water. |
| `springtail/stenus-strike` | oneshot | 0.5 s | 1 | The rove beetle's harpoon strike. |

## Mite (moss canopy, SEM)

| Id | Kind | Length | Files | Used for |
| --- | --- | --- | --- | --- |
| `mite/amb-moss` | loop | 12 s | 1 | Ambience: inside the moss cushion. |
| `mite/step` | oneshot | 0.5 s | 4 | Footfalls (rate follows the gait). |
| `mite/dash` | oneshot | 1.0 s | 1 | A (dash): the scramble. |
| `mite/close` | oneshot | 0.8 s | 1 | B: closing into the armoured capsule. |
| `mite/open` | oneshot | 0.8 s | 1 | Opening up again. |
| `mite/bite` | oneshot | 0.5 s | 2 | X: chelicerae bite. |
| `mite/blade` | oneshot | 0.8 s | 3 | Pushing past a moss blade, which springs back. |
| `mite/predator` | oneshot | 1.5 s | 1 | The predatory mite closing in. |

## Tardigrade (water film)

| Id | Kind | Length | Files | Used for |
| --- | --- | --- | --- | --- |
| `tardigrade/amb-film` | loop | 12 s | 1 | Ambience: inside the water film on a moss leaf. |
| `tardigrade/step` | oneshot | 0.5 s | 4 | Footfalls: a padded squish with a claw tick. |
| `tardigrade/dash` | oneshot | 1.0 s | 1 | A (dash): the scramble. |
| `tardigrade/bite` | oneshot | 0.6 s | 2 | X: stylets pierce a cell. |
| `tardigrade/tun` | oneshot | 2.5 s | 1 | Y: drying into a tun. |
| `tardigrade/revive` | oneshot | 2.5 s | 1 | Rehydrating out of the tun. |
| `tardigrade/rain` | oneshot | 4.0 s | 1 | Rain arriving on the moss. |
| `tardigrade/milnesium` | oneshot | 1.5 s | 1 | The predatory tardigrade lunging. |

## Amoeba (pool)

| Id | Kind | Length | Files | Used for |
| --- | --- | --- | --- | --- |
| `amoeba/amb-pool` | loop | 12 s | 1 | Ambience: the pool, very viscous and slow. |
| `amoeba/stretch` | oneshot | 1.5 s | 3 | A pseudopod flowing out. |
| `amoeba/boost` | oneshot | 1.0 s | 1 | A (dash): the surge. |
| `amoeba/engulf` | oneshot | 1.5 s | 1 | X: the food cup closing round prey. |
| `amoeba/vacuole` | oneshot | 0.5 s | 2 | The contractile vacuole emptying. |
| `amoeba/digest` | oneshot | 2.0 s | 1 | Digesting a food vacuole. |

## Paramecium (pool)

| Id | Kind | Length | Files | Used for |
| --- | --- | --- | --- | --- |
| `paramecium/amb-pool` | loop | 12 s | 1 | Ambience: open pond water. |
| `paramecium/swim` | loop | 6 s | 1 | The cilia beating (volume and rate follow the swim speed). |
| `paramecium/dash` | oneshot | 0.8 s | 1 | A (dash): the sprint. |
| `paramecium/gulp` | oneshot | 0.6 s | 2 | X: a feeding gulp. |
| `paramecium/trichocysts` | oneshot | 0.8 s | 1 | X when touched: trichocyst discharge. |
| `paramecium/reverse` | oneshot | 0.8 s | 1 | B: the avoidance reaction. |
| `paramecium/didinium` | oneshot | 1.5 s | 1 | Didinium closing in. |
| `paramecium/held` | oneshot | 1.5 s | 1 | Held by Didinium's proboscis. |

## Bacterium (sediment)

| Id | Kind | Length | Files | Used for |
| --- | --- | --- | --- | --- |
| `bacterium/amb-sediment` | loop | 12 s | 1 | Ambience: Brownian motion in the sediment. |
| `bacterium/run` | loop | 4 s | 1 | The flagellar motor during a run (rate follows speed). |
| `bacterium/tumble` | oneshot | 0.6 s | 2 | B: a tumble. |
| `bacterium/sprint` | oneshot | 1.0 s | 1 | A (dash): the sprint run. |
| `bacterium/eat` | oneshot | 0.6 s | 2 | X: absorbing nutrients. |
| `bacterium/phage` | oneshot | 0.5 s | 1 | A phage latching on. |
| `bacterium/graze` | oneshot | 2.0 s | 1 | A grazer's feeding current pulling at you. |

## Prompts

### springtail/amb-bog

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. Calm outdoor ambience at the edge of a still bog pool on a mild day: a soft breeze over moss, faint water lapping, a distant insect hum, very sparse faraway birdsong. Even level, continuous, seamless. No music, no narration, no voices, no speech.
```

### springtail/jump

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tiny sharp springy snap-click followed by a very short airy whoosh, like a miniature catapult releasing. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### springtail/land-water

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tiny soft plip of something very light landing on a still water surface, delicate, almost no splash. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### springtail/land-sticky

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A small wet sticky squelch and a stretchy tacky pull, like a fingertip pressed into honey. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### springtail/eat

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. Tiny dry crunchy nibbling, a few quick crisp bites on a grain. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### springtail/raindrop

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A single big heavy raindrop plunking into a calm pond right beside the microphone, deep resonant bloop and a ring of ripples. No music, no narration, no voices, no speech.
```

### springtail/stenus-skim

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A fast thin hissing zip across a water surface, like a tiny speedboat streaking past, fading quickly. No music, no narration, no voices, no speech.
```

### springtail/stenus-strike

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. An instant sharp sticky thwip, a tiny elastic tongue shooting out and snapping back. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### mite/amb-moss

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. Muffled, close, damp ambience deep inside a cushion of moss: very soft rustling, faint creaks of stems, a distant muted breeze overhead. Low and even, continuous, seamless. No music, no narration, no voices, no speech.
```

### mite/step

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. One tiny dry hard tap, like the tip of a beetle's leg clicking on a dry leaf. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### mite/dash

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A quick flurry of tiny dry clicking scrabbles, many little hard legs scurrying fast over dry leaves. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### mite/close

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A small hollow hard clack-thunk of an armoured shell snapping shut, like a tiny seed pod closing. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### mite/open

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A small hollow creak and soft click of a hard little shell hinging open. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### mite/bite

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tiny crisp pinching crunch, like snipping a thin dry fibre. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### mite/blade

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A soft swish and springy rustle of a thin green blade bending and flicking back. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### mite/predator

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. Fast, light, menacing skittering of long thin legs approaching quickly over dry leaves. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### tardigrade/amb-film

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. Close underwater ambience in a very thin layer of water: soft muffled bubbling, slow gentle gurgles, faint fizz, a dull distant pressure. Even, continuous, seamless. No music, no narration, no voices, no speech.
```

### tardigrade/step

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A soft small squishy padded step with a tiny click of a claw at the end, underwater. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### tardigrade/dash

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A hurried patter of soft squishy little steps underwater, clumsy and quick. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### tardigrade/bite

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tiny wet pop and a short sucking slurp, like piercing a grape skin with a needle and sipping. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### tardigrade/tun

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A slow shrinking dry crinkle and a soft deflating sigh, like a damp leaf curling up as it dries. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### tardigrade/revive

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A slow gentle watery swelling gurgle, like a sponge soaking up water and plumping out. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### tardigrade/rain

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. Rain beginning to fall on a moss cushion, heard muffled from inside: soft pattering building up, water trickling down. No music, no narration, no voices, no speech.
```

### tardigrade/milnesium

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A heavy wet lunge and a deep sucking gulp underwater, ominous and close. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### amoeba/amb-pool

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. Deep, slow, thick underwater ambience: a low rumbling murmur, occasional very slow viscous bubbles, muffled and calm. Even, continuous, seamless. No music, no narration, no voices, no speech.
```

### amoeba/stretch

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A slow soft gooey stretching sound, thick slime being pulled and flowing, wet and elastic. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### amoeba/boost

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A quick gooey surging whoosh, thick liquid rushing forward inside something soft. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### amoeba/engulf

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A wet enveloping squelch and a soft closing gulp, slime folding around something and sealing. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### amoeba/vacuole

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. One soft round watery bubble pop. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### amoeba/digest

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A slow low gentle stomach-like gurgle, muffled. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### paramecium/amb-pool

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. Faint underwater ambience in clear pond water: a very soft airy hiss, tiny distant ticks and fizzes, calm. Even, continuous, seamless. No music, no narration, no voices, no speech.
```

### paramecium/swim

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A soft continuous rhythmic shimmering rustle, like thousands of tiny feathers fluttering in water, steady. Continuous, seamless. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### paramecium/dash

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A quick rushing underwater swish, a fast swimmer darting forward. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### paramecium/gulp

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A small quick watery suction gulp. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### paramecium/trichocysts

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A sharp burst of many tiny needle-like snaps fired all at once, a crackling spray. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### paramecium/reverse

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A quick swirling reversing whoosh underwater, a sudden back-pedal and turn. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### paramecium/didinium

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. An ominous fast fluttering whirr approaching underwater, a spinning hunter getting closer, tense. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### paramecium/held

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tense squeezing creak and a wet struggling stretch underwater. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### bacterium/amb-sediment

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A dense soft crackling fizz of a busy microbial world in pond mud, like tiny bubbles and grains jostling, constant tiny random pops, even and continuous, seamless. No music, no narration, no voices, no speech.
```

### bacterium/run

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A fine soft continuous whirring hum, like a tiny insect wing or a spinning seed heard very close, organic and steady. Continuous, seamless. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### bacterium/tumble

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A short fluttering stutter, a tiny whirl faltering and flicking round in a new direction. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### bacterium/sprint

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A quick rising whirr, a tiny organism surging forward with a soft high rush, then easing. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### bacterium/eat

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tiny soft fizzy absorbing sip, bubbles dissolving. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### bacterium/phage

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tiny sharp sticky click, something minute latching firmly onto a soft surface. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### bacterium/graze

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A deep slow sucking current whoosh, a big drain pulling water in. No music, no narration, no voices, no speech.
```
