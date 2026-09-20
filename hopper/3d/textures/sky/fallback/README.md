# Round-three horizon fallback panoramas

These are the permitted fallback deliverables for T-083 through T-085. They
are native 1774 × 887 ImageGen paintings, sized for a narrow horizon band over
the existing procedural/dome sky rather than as a replacement equirectangular
4K dome texture.

| Request | Asset | Intended scene |
| --- | --- | --- |
| T-083 | `fields-horizon-detail.png` | Sunseed Fields: honey clouds, wheat ridges and distant farm silhouettes. |
| T-084 | `city-horizon-detail.png` | Crownline City: warm cloud streaks and an ivory/teal retro-futurist skyline. |
| T-085 | `mountains-horizon-detail.png` | Thunderhead Range: slate alpine ridges, apricot storm light and a small eclipse. |

They deliberately remain separate from `*-hd.jpg`: those files are reserved
for a future true 4096 × 2048 equirectangular repaint that passes
`design/source/verify_native_detail.py`. Do not upscale these assets and label
them as native 4K detail.
