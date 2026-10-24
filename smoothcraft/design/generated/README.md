# Initial texture samples

The 85 PNGs directly under this directory are the first exploratory samples
for the static, opaque Tier 1 block requests. Each uses its request id as its
path and is a 256x256 RGB PNG. Their original prompts, checksums and atlas cell
positions remain in [manifest.json](manifest.json).

These samples have lighting and repeat-edge issues and are kept for comparison.
They are not accepted HD-pack artwork.

The full reference-guided run is documented in
[reference-guided/README.md](reference-guided/README.md). Its
[manifest](reference-guided/manifest.json) tracks all 2,024 requested textures,
including missing files, preparation state and hashes. Use that run for current
coverage and integration; do not substitute these earlier samples for reviewed
reference-guided results.
