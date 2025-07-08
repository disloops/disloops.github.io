---
id: 873
title: 'Snort DGA Rule with Chrome'
date: '2016-01-02T03:07:49+00:00'
author: matt
guid: '/?p=873'
permalink: /snort-dga-rule-with-chrome/
categories:
    - Snort
tags:
    - IDS
    - malware
    - Snort
---

I had to investigate this Snort alert (3:31738):

```text
PROTOCOL-DNS domain not found containing random-looking hostname - possible DGA detected
```
DGA here means "domain generation algorithm" – malware will often find its command and control servers using dynamically-generated domain names. It makes it harder for an infected victim to sinkhole the domains, and a malware author can spin up new ones according to the algorithm as necessary.

The DNS requests causing the alerts looked innocuous to me. It turns out that Chrome purposely issues invalid DNS requests every time it starts in order to root out malicious DNS servers. Discussed here:

<https://isc.sans.edu/forums/diary/10312>

These invalid requests occur independently of Chrome's prefetching behavior. This is a good Snort rule but it might be incompatible with Chrome.