# Changelog

All notable changes to dancing-pet are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.2.1] - 2026-11-03

### Added

- A plugin icon (`.claude-plugin/icon.png`, 1024x1024): the Sock-hopping pet, for the Claude Code plugin directory listing.
  `render_gifs.py` now renders it along with the README GIFs.

## [0.2.0] - 2026-11-03

### Added

- `/pet` slash command to turn the pet off and on. `/pet` switches it, `/pet on` and `/pet off` set it.
  It works mid-response too, and the choice is remembered in later sessions.

## [0.1.0] - 2026-11-03

### Added

- A pixel Claude pet that dances in the band above the prompt while Claude is working, and hides when the turn ends.
- 187 animated poses, one per spinner word; the pet acts out the word the spinner is showing.
- The spinner word under the pet, as `Baking ...`, updating when the word changes.
- `convert.py` to rebuild the frames from a folder of GIF stickers.
- An animated showcase in the README, rendered by `render_gifs.py`.

[Unreleased]: https://github.com/hussein-001/dancing-pet/compare/dancing-pet--v0.2.1...HEAD
[0.2.1]: https://github.com/hussein-001/dancing-pet/compare/dancing-pet--v0.2.0...dancing-pet--v0.2.1
[0.2.0]: https://github.com/hussein-001/dancing-pet/compare/dancing-pet--v0.1.0...dancing-pet--v0.2.0
[0.1.0]: https://github.com/hussein-001/dancing-pet/releases/tag/dancing-pet--v0.1.0
