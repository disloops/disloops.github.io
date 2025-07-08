---
id: 2921
title: 'VSFTPD Log Parser'
date: '2022-09-28T18:21:04+00:00'
author: matt
guid: '/?p=2921'
permalink: /vsftpd-log-parser/
categories:
    - FTP
tags:
    - FTP
---

I've had [ftp.disloops.com](ftp://ftp.disloops.com) running for about ten years. It's an FTP host that's configured to allow anonymous connections and uploads. This creates some security risks that I wrote about when I deployed it. A previous [article](/notes-on-anonymous-ftp/) explored some of those risks in depth.

<!--more-->

I recently wanted to extract all the username/password combinations I'd seen since deploying the server. Only two usernames are accepted by anonymous VSFTPD servers: `Anonymous` and `FTP`. Clients using these usernames receive a prompt for an arbitrary password. Sessions initiated with any other username are immediately ended.

To extract the authentication data, I created a script that accepts a VSFTPD log file as input. It pulls all username/password combinations from the file and exports them as text or CSV.

The script can be downloaded here: [https://github.com/disloops/vsftpd\_parse](https://github.com/disloops/vsftpd_parse)  
You can see sample output from my own server here: [vsftpd-results.txt](/assets/documents/2022/09/vsftpd-results.txt)

{: .notice--info}
**Note:** The script is currently designed for a server that only allows anonymous connections. This VSFTPD configuration results in a specific log format since passwords are not accepted for non-anonymous usernames. The script could easily be modified to handle non-anonymous logins instead.
