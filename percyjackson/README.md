# Half-Blood Quests (Percy Jackson)

A co-op action dungeon crawler in the blocky 3D style of Minecraft Dungeons,
based on Rick Riordan's *Percy Jackson and the Olympians*, starting with
*The Lightning Thief*. It is being built; nothing in this folder is published
yet.

- [`design/game-design.md`](design/game-design.md): the game design: heroes,
  the Mist and True Sight, chapters, monsters, camp minigames, multiplayer and
  controls.

- [`reference/`](reference/README.md): how Percy, Annabeth and their world have
  been represented in books, comics, film, TV, stage and games, grouped into
  style families to choose an art direction. The images belong to their owners
  and are kept here as private reference only, never as game assets.

- [`design/image-requests.md`](design/image-requests.md): image requests. Round 1
  is concept art in the cartoon-heroes-in-an-ornamental-world direction; round 2
  is the 3D hero and monster sheets the models are built from, plus game art. It is generated
  from `design/source/build_requests.py`; edit the data there and rerun it
  (`--check` verifies it is up to date). Delivered images go in
  `design/concept/`.
- [`design/concept/README.md`](design/concept/README.md): 19 generated
  round-1 concept images and 27 round-2 images, with previews and generation records.
- [`intake/`](intake/README.md): drop generated images here for integration.

When the game itself starts, this folder gets the usual `publish.sh`, Pages
workflow step and library card.
