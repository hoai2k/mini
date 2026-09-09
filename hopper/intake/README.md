# Intake

A drop box for files handed to Claude. Put anything here that should end up in
the game or its documentation — generated artwork, audio, models, exported data,
notes from another agent — and ask for it to be processed. Nothing in this
directory is read by the game or the build; it is a staging area, and it is
emptied once its contents are integrated.

## How a drop is processed

1. **Mirror the destination, or don't.** A drop may mirror the repository tree
   (`intake/hopper/design/tripo/...` lands at `hopper/design/tripo/...`), which
   says where the files are meant to go. Loose files are fine too; the
   destination is worked out during integration.
2. **Everything is verified before it lands.** Images are opened and checked
   against what they claim to be, data is parsed, numbers are recompared against
   the files they describe, and anything that ships is built and tested. A drop
   that disagrees with the repository does not silently overwrite it.
3. **Artwork and data are taken as delivered; prose is rewritten.** Images,
   audio, models and machine-readable data are the delivery. Accompanying
   write-ups are read as intent, then the repository's own documentation is
   written from what the files actually show — so it carries no absolute paths
   from another machine, no dead local links, and no status that has since
   moved on.
4. **Claims are checked, not copied.** A drop saying work is finished or
   verified is treated as a claim to test. Where a check can be run, it is run,
   and the result is recorded in the repository whichever way it comes out.
5. **The folder is emptied.** After integration only this README remains, and
   the commit says what landed where and what was rejected.

## What does not land

Files are left out when they duplicate something the repository already holds
(the delivered copy stays the single one), when they would overwrite newer work
with older, or when they assert a status the evidence does not support. Anything
dropped is reported either way, so nothing disappears silently.
