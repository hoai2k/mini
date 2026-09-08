#!/bin/sh
# Run from the repository root. TOKTX points to an installed or portable KTX-Software encoder.
set -eu
for region in fields city mountains foundry harbor launchworks red blue violet; do
 "${TOKTX:-toktx}" --t2 --lower_left_maps_to_s0t0 --encode etc1s --qlevel 180 --genmipmap --assign_oetf srgb "hopper/3d/textures/sky/$region.ktx2" "local/hopper-3d-textures/$region-sky-8k.png"
done
