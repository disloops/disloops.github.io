---
id: 2314
title: 'Streaming an Amcrest Camera to YouTube'
date: '2020-05-01T12:54:33+00:00'
author: matt
guid: '/?p=2314'
permalink: /streaming-an-amcrest-camera-to-youtube/
categories:
    - Amcrest
    - FFmpeg
    - webcam
tags:
    - Amcrest
    - FFmpeg
    - webcam
---

I've always liked having the ability to view public webcams around the world. During the last hurricane, for example, there was a camera streaming from an oil rig a mile or more out to sea that let us see the strength of the storm before it made landfall.

Now that I'm a homeowner, I wanted to put a camera on our roof and stream the view from up there. I bought a weatherproof [Amcrest IP8M-2597EW-28MM](https://www.amazon.com/Amcrest-UltraHD-Weatherproof-3840x2160-IP8M-2597EW-28MM/dp/B083KNBT3D) and dropped it through the soffit under our roof. The process of snaking the ethernet cord through an air duct up to the attic will not be covered here.

Amcrest cameras act as RTSP (real-time streaming protocol) servers that can be accessed on a specific port. This means that it's necessary to run an active RTSP client to consume the live feed.

<!--more-->

Unfortunately, YouTube and most other streaming sites do not do this. Instead, YouTube ingests video using RTMP (real-time messaging protocol). Further, they ingest video passively, which means that a service must pull the RTSP feed, convert to RTMP, and then push to YouTube.

{: .notice--info}
**Note:** A concise description of these protocols and devices can be found here: <https://www.red5pro.com/blog/5-ways-to-decide-between-rtmp-vs-rtsp/>

There are some third-party services that do this for a fee but I found them cost-prohibitive. It turned out that using `FFmpeg` on a local Linux host to push the stream to YouTube worked perfectly.

# Converting RTSP to RTMP with FFmpeg

I first set up the camera, changed the default settings, and assigned it a static IP. Then I updated my firewall to allow a local Linux host to send it traffic. Next I installed `FFmpeg` on that host:

```bash
sudo apt-get install ffmpeg
```
I had to figure out how to use `FFmpeg` correctly. For my particular camera, it was necessary to send a "blank" audio channel to YouTube since it requires one. For everything else, I just had `FFmpeg` copy the video settings from the source. You can see the command below and pull it apart.

I wanted `FFmpeg` to run continuously in the background, beginning at startup. Normally I would add some lines to `rc.local` but this has been deprecated in favor of `systemd` services on recent versions of Ubuntu. Further, `FFmpeg` will die infrequently while streaming so it needs to be restarted automatically.

So I created a script called `rtsp_stream.sh` to run `FFmpeg` continuously:

```bash
source_url="rtsp://<user>:<pass>@<IP>:<port>/cam/realmonitor?channel=1&subtype=0"
youtube_key="<key here>"

cmd="/usr/bin/ffmpeg -f lavfi -i anullsrc -rtsp_transport tcp -i ${source_url} \
    -tune zerolatency -vcodec libx264 -pix_fmt + -c:a aac -f flv \
    -strict -2 rtmp://a.rtmp.youtube.com/live2/${youtube_key}"

until $cmd ; do
    echo "Restarting ffmpeg..."
    sleep 2
done
```
You will need to replace the bracketed placeholders above and make the script executable:

```bash
sudo chmod +x /home/matt/rtsp_stream/rtsp_stream.sh
```
# Setting up systemd

Next I created a `systemd` service at `/etc/systemd/system/rtsp_stream.service` to run the script on startup:

```ini
[Unit]
Description=IP camera FFmpeg service

[Service]
StandardOutput=null
StandardError=null
ExecStart=/bin/sh /home/matt/rtsp_stream/rtsp_stream.sh

[Install]
WantedBy=multi-user.target
```
You can save this file as `/etc/systemd/system/rtsp_stream.service` and run the following to start the service:

```bash
sudo systemctl enable rtsp_stream.service
sudo systemctl start rtsp_stream.service
```
Assuming you've set up your YouTube stream correctly, that's all there is to it!

# Sources

- Restarting FFmpeg: <https://arstech.net/automatically-restart-ffmpeg/>
- Fixing YouTube audio: <https://gist.github.com/olasd/9841772#gistcomment-2565004>
