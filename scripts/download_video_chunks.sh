#!/bin/bash

BANDWIDTH=401000
# BANDWIDTH=751000
# BANDWIDTH=1001000
# BANDWIDTH=1501000
# BANDWIDTH=2200000

curl -O "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel-multi-lang.ism/.mpd/dash/tears-of-steel-multi-lang-video_eng=${BANDWIDTH}.dash"
TIME=0
for i in $(seq 1 184);
do
  curl -O "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel-multi-lang.ism/.mpd/dash/tears-of-steel-multi-lang-video_eng=${BANDWIDTH}-${TIME}.dash"
  TIME=`expr $TIME + 2400`
done