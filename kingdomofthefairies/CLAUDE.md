# Kingdom of the Fairies: development direction

- The default edition follows Georges Méliès’s 1903 silent-film direction.
  Read `design/film-story.md`, `design/acts.md` and `design/image-requests.md`.
  Aurora, the water fairy and the hostile witch are distinct characters.
- Preserve gameplay unless a requested update explicitly changes it. Existing
  adaptation mechanics must not be described as canonical film events.
- Three editions (README.md): the film edition by default, `?widowsbay=partial`
  (the original five acts with no band, song or guitar) and `?widowsbay` (the
  preserved original). Run the original acts' suites under both
  `KOTF_EDITION=widowsbay` and `KOTF_EDITION=partial`.
- Only delivered period music plays by default. The modern song and band art
  are reserved for `?widowsbay`; preserve that edition and its source assets.
- Generate new sound effects through `design/source/build_sfx.py` in the same
  period-stage-foley style. Read `ELEVENLABS_API_KEY` from the environment;
  never commit secrets. Retain the existing tuning and processing.
- New artwork uses theatrical painted sets, front-on cut-outs and hand-tinted
  film texture. Treat generated references as interpretations, not film stills.
