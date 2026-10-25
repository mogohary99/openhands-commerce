#!/bin/sh
# Turn the raw scene recordings (npm run video:scenes) into H.264 MP4s for the video editor.
# Silent: narration and captions are added in editing (docs/submission/video-script.md).
set -eu
cd "$(dirname "$0")/../../docs/video/scenes"
for f in *.webm; do
  ffmpeg -v error -y -i "$f" -c:v libx264 -pix_fmt yuv420p -crf 18 -r 30 "${f%.webm}.mp4"
done
# Scene 5 is stills (see video-scenes.spec.ts): 3.5 s per step.
ffmpeg -v error -y -framerate 1/3.5 -i 5-zoom-400/%02d.png -c:v libx264 -pix_fmt yuv420p -r 30 5-zoom-400.mp4
for f in *.mp4; do echo "$f $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")s"; done
