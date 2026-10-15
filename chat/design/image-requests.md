# Games Chat: image requests

Artwork for Games Chat in `chat/`. Generated from `source/build_requests.py`; edit the data there and rerun it, which also rewrites `chat/js/asset-list.js` and `face-template.png`.

## How to use this list

1. Each prompt is complete on its own: paste it as it stands. The shared style text is already in every prompt.
2. For prompts marked **face template**, give the generator [`face-template.png`](face-template.png) as a reference image too. It marks the eyes, nose, mouth, chin and top of the head where the app pins the sticker. Only the sticker is wanted in the result: no face.
3. Save each image under the file name in its **File** line and drop it in `chat/intake/`. On integration it moves to that path under `chat/`, its status flips to `delivered` and the app loads it in place of its stand-in.
4. Stickers and sprites need transparency. If the generator cannot produce alpha, use a flat pure magenta `#FF00FF` background as the prompts say; it is keyed out on integration.
5. Opaque images are listed as `.webp`; PNG or JPEG is fine too, they are converted on integration.
6. Nothing here blocks the app: every image has a stand-in that the app draws itself.

## Face template

Face stickers share one 1024 x 1024 template, as the viewer sees the face:

| Point | x, y |
| --- | --- |
| eye (image left) | 392, 520 |
| eye (image right) | 632, 520 |
| nose tip | 512, 640 |
| mouth centre | 512, 740 |
| chin | 512, 880 |
| top of head | 512, 220 |

## Status

0 waiting to be made, 549 delivered (549 in total). Delivered requests move to [`image-requests-history.md`](image-requests-history.md), with the prompt each was made from.

Nothing is waiting: every requested image has been delivered.
