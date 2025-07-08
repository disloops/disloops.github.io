---
id: 2950
title: 'MUSH GPT: The Oracle'
date: '2023-08-09T05:38:56+00:00'
author: matt
guid: '/?p=2950'
permalink: /mush-gpt-the-oracle/
categories:
    - OpenAI
    - MUSH
tags:
    - OpenAI
    - MUSH
---

I recently set out to learn the security implications of generative AI. While harassing the ChatGPT bot through the OpenAI interface it occurred to me to integrate its features into my existing [text-based MUSH](/mush/) game. So today I bring you instructions for powering an in-game NPC with the OpenAI API.

<!--more-->

# Background

OpenAI has been first to market with a language model that can understand and generate text far beyond existing offerings. ChatGPT is the more popular implementation of this service but OpenAI also offers an API by which users can power their own applications. For a reasonable fee you can generate an API key and start making requests.

I've maintained an original text-based game since early 2019. [Parlor City](/mush/) is a multi-user shared hallucination (MUSH) hosted on an Amazon Linux EC2 instance and powered by PennMUSH. Conveniently, this is a great use case for the features of generative AI.

# OpenAI API Service

After creating an OpenAI account, I created a Python script to interact with the API endpoint. The script uses Flask, a rudimentary web server that operates on `localhost`. The script can be found here:  
[https://github.com/disloops/mushcode/blob/master/scripts/mush\_gpt.py](https://github.com/disloops/mushcode/blob/master/scripts/mush_gpt.py)

It serves as a middleman between the limited functionality of the MUSH game and the remote API. OpenAI offers a quickstart tutorial that covers all the necessary implementation details. I deployed this as a makeshift service on the same host as the MUSH:

```bash
sudo vi /etc/systemd/system/mushgpt.service
```
Here are the contents of the service:

```ini
[Unit]
Description=MUSH GPT Server
After=network.target

[Service]
User=ec2-user
Type=simple
WorkingDirectory=/home/ec2-user/Tech/openai
ExecStart=/usr/bin/python3 /home/ec2-user/Tech/openai/mush_gpt.py
Restart=always

[Install]
WantedBy=multi-user.target
```
Once saved, just reload the daemon, enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable /etc/systemd/system/mushgpt.service
sudo systemctl start mushgpt
```
# Configuring PennMUSH

PennMUSH offers an `@http` command that allows objects to issue basic HTTP requests. However, using it required me to recompile PennMUSH after having installed the `libcurl-devel.x86_64` library. Luckily it was as simple as:

```bash
sudo yum install libcurl-devel.x86_64
sh configure
make update
make install
```
Once complete, I could create an in-game object that utilized the `localhost` server:  
<https://github.com/disloops/mushcode/blob/master/oracle.txt>

This is the Oracle. It essentially listens for user input, sanitizes it, and passes it to the Flask server. The server combines it with a strict "pre-prompt" and passes it to the OpenAI API endpoint for queries. The response is then returned to the Oracle by way of the intermediary server and echoed to the player after being validated. See it in action:

```text
> look
The Sanctum
It is balmy inside the mausoleum, and the great stone walls belie the waves that still beat at the shores below. The hall is covered with carpets; a low couch is among them where the Oracle is seated, a pitcher of wine beside her. She waits for you to speak.
Contents:
The Oracle
Obvious exits:
Home (h)

> look The Oracle
The Oracle
An older woman with a tan complexion and an orange Kashmir shawl. Her jewelry is made of small gold coins strung together like charms on delicate chain.

> say Hello, Oracle.
You say, "Hello, Oracle."
The Oracle says, "Greetings, seeker of wisdom. What is it that brings you to the island mausoleum today?"

> say Can I have a hot dog?
You say, "Can I have a hot dog?"
The Oracle says, "A hotdog? At this hour? No, my dear. This isn't some greasy spoon diner where they serve up questionable meat in unnatural casings. I suggest you seek more nutritious fare, something that won't leave you regretting your choices later on."
```
# Looking Forward

Please visit us at [Parlor City](/mush/) and burn up my API credits with absurd requests to the Oracle character. Very soon you can expect a few other features, including a ChatGPT Bot that you can speak with via the public chat channels. Hope to see you there.
