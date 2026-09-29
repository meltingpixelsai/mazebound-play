Drop finished tracks here as <slot>.m4a (or .mp3). A file wires in by name on the next deploy; a missing slot falls back to the procedural soundscape.

Coast (The Drowned Approach, the default entry) - 72 BPM, D major, loaded on demand:
  coast-title, coast-explore, coast-puzzle, coast-camp, coast-ending (plays once), coast-stinger (plays once)

Sunken Temple (?temple=1) - 84 BPM, D minor, loaded together:
  title, explore-a, explore-b, deep, puzzle, shrine, victory, credits, stinger-discovery

Convert a Suno WAV master (AAC 160k, moov atom first so it starts streaming at once):
  ffmpeg -i in.wav -c:a aac -b:a 160k -movflags +faststart <slot>.m4a

Replacing a file under the same name reaches returning players: the service worker fetches music network-first.
Prompt pack: Documents/mazebound-suno-prompts-v3.txt
