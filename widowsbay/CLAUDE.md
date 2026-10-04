# Widow's Bay: instructions for Claude

- **Sound effects come from ElevenLabs.** Generate every effect, now and for
  later acts, with `design/source/build_sfx.py`. Add new ones to its `SFX`
  table in the same period-stage-foley style, and keep the processing (F-major
  tuning, warm roll-off, common loudness) matched to the band's recording as
  described in `README.md` under "Sound". The API key is read from
  `ELEVENLABS_API_KEY` in the environment. Never write it into a file in this
  repository, a commit message or a published page. If the variable is
  missing, ask the user for it.
- **The score is the band's recording,** `assets/audio/widowsbay.mp3`, and
  nothing else: no stand-in or procedural music. While it loads, show a loading
  bar (the title screen and the act card already do). The band are the user's
  brother and friends, and the user has cleared its use.
- **The look is the priority.** Follow `design/image-requests.md` (stencil
  tint, toy theatre, the video's intertitle cards) and check new work against
  the frames in `design/references/`.
