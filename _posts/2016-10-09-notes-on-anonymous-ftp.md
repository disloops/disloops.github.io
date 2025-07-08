---
id: 1134
title: 'Notes on Anonymous FTP'
date: '2016-10-09T10:20:59+00:00'
author: matt
guid: '/?p=1134'
permalink: /notes-on-anonymous-ftp/
categories:
    - FTP
tags:
    - FTP
---

I've had [ftp.disloops.com](ftp://ftp.disloops.com) running since December of last year. It's an FTP host that's configured to allow anonymous connections and uploads. This creates some security risks that I wrote about when I deployed it. See the original article [here](/hosting-anonymous-ftp/).

I wanted to report back on what I've seen since deploying it. Congrats to [188.162.248.28](http://www.whois.com/whois/188.162.248.28) for being the first one to try to log in as admin.

<!--more-->

# Malicious Uploads

The first attempt to upload a file came from [14.99.43.70](http://www.whois.com/whois/14.99.43.70):

```text
FTP command: Client "14.99.43.70", "USER ftp"
[ftp] FTP response: Client "14.99.43.70", "331 Please specify the password."
[ftp] FTP command: Client "14.99.43.70", "PASS <password>"
[anon_ftp] OK LOGIN: Client "14.99.43.70", anon password "111"
[anon_ftp] FTP response: Client "14.99.43.70", "230 Login successful."
[anon_ftp] FTP command: Client "14.99.43.70", "TYPE I"
[anon_ftp] FTP response: Client "14.99.43.70", "200 Switching to Binary mode."
[anon_ftp] FTP command: Client "14.99.43.70", "PASV"
[anon_ftp] FTP response: Client "14.99.43.70", "227 Entering Passive Mode."
[anon_ftp] FTP command: Client "14.99.43.70", "STOR /info.zip"
[anon_ftp] FTP response: Client "14.99.43.70", "553 Could not create file."
[anon_ftp] FAIL UPLOAD: Client "14.99.43.70", "/info.zip"
```
I was concerned because this was also the first time anyone had logged in with the `ftp` username. I though `anonymous` was the only username enabled. It turns out that `ftp` is also a valid username for anonymous logins according to the [manual](http://vsftpd.beasts.org/vsftpd_conf.html) for VSFTPD:

```text
anonymous_enable
Controls whether anonymous logins are permitted or not. If enabled, both the 
usernames ftp and anonymous are recognized as anonymous logins.
Default: YES
```
Also note that VSFTPD will accept any password for anonymous logins. Good netizens are supposed to use their email address as a courtesy but I've seen "fuckyou" used 47 times so far. Thank you [1.39.40.46](http://www.whois.com/whois/1.39.40.46).

The above attempt to upload `info.zip` above didn't work because only the `uploads` directory is writable. Most connections come from bots that blindly crawl the site tree looking for writable directories.

The first real upload came from [49.50.77.195](http://www.whois.com/whois/49.50.77.195):

```text
FTP command: Client "49.50.77.195", "USER anonymous"
[anonymous] FTP response: Client "49.50.77.195", "331 Please specify the password."
[anonymous] FTP command: Client "49.50.77.195", "PASS <password>"
[anon_ftp] OK LOGIN: Client "49.50.77.195", anon password "kingdom"
[anon_ftp] FTP response: Client "49.50.77.195", "230 Login successful."
[anon_ftp] FTP command: Client "49.50.77.195", "TYPE I"
[anon_ftp] FTP response: Client "49.50.77.195", "200 Switching to Binary mode."
[anon_ftp] FTP command: Client "49.50.77.195", "PASV"
[anon_ftp] FTP response: Client "49.50.77.195", "227 Entering Passive Mode."
[anon_ftp] FTP command: Client "49.50.77.195", "STOR info.zip"
[anon_ftp] FTP response: Client "49.50.77.195", "553 Could not create file."
[anon_ftp] FAIL UPLOAD: Client "49.50.77.195", "/info.zip"
[anon_ftp] FTP command: Client "49.50.77.195", "STOR .htaccess"
[anon_ftp] FTP response: Client "49.50.77.195", "553 Could not create file."
[anon_ftp] FAIL UPLOAD: Client "49.50.77.195", "/.htaccess"
[anon_ftp] FTP command: Client "49.50.77.195", "STOR IMG001.exe"
[anon_ftp] FTP response: Client "49.50.77.195", "553 Could not create file."
[anon_ftp] FAIL UPLOAD: Client "49.50.77.195", "/IMG001.exe"
[anon_ftp] FTP command: Client "49.50.77.195", "TYPE A"
[anon_ftp] FTP response: Client "49.50.77.195", "200 Switching to ASCII mode."
[anon_ftp] FTP command: Client "49.50.77.195", "LIST"
[anon_ftp] FTP response: Client "49.50.77.195", "150 Here comes the directory list."
[anon_ftp] FTP response: Client "49.50.77.195", "226 Directory send OK."
[anon_ftp] FTP command: Client "49.50.77.195", "CWD /downloads"
[anon_ftp] FTP response: Client "49.50.77.195", "250 Directory change successful."
[anon_ftp] FTP command: Client "49.50.77.195", "TYPE I"
[anon_ftp] FTP response: Client "49.50.77.195", "200 Switching to Binary mode."
[anon_ftp] FTP command: Client "49.50.77.195", "STOR IMG001.exe"
[anon_ftp] FTP response: Client "49.50.77.195", "553 Could not create file."
[anon_ftp] FAIL UPLOAD: Client "49.50.77.195", "/downloads/IMG001.exe"
[anon_ftp] FTP command: Client "49.50.77.195", "CWD /uploads"
[anon_ftp] FTP response: Client "49.50.77.195", "250 Directory change successful."
[anon_ftp] FTP command: Client "49.50.77.195", "STOR IMG001.exe"
[anon_ftp] FTP response: Client "49.50.77.195", "150 Ok to send data."
[anon_ftp] OK UPLOAD: Client "49.50.77.195", "/uploads/IMG001.exe", 3627461 bytes
[anon_ftp] FTP response: Client "49.50.77.195", "226 Transfer complete."
```
Had the `.htaccess` file had been uploaded, it probably would have tried to direct web users to another site. This wouldn't have worked because I don't have Apache installed. Web-based visitors are using their browser as an FTP client.

The `IMG001.exe` file that was uploaded is one [variant](https://www.virustotal.com/en/file/edc049f43e49ebc789a64818b7a1c52e37dd248e735d86606d92162dce599130/analysis/) of the CoinMiner malware family. There are a lot of versions with different names (EvilMiner, PhotoMiner, etc.) but they all have the same basic mechanism:

- A web user opens a malicious download somewhere
- Malware establishes persistence and starts mining crypto-currency
- Malware then pivots to local servers and looks for new remote FTP servers
- It makes a weak attempt at brute-forcing any FTP servers found
- If successful, it uploads the payload file
- It downloads any HTML/PHP files found on the server, adds an iframe that links to the payload, then re-uploads them

Now those pages will serve the malicious download and propagation continues.

All the other successful uploads were just different versions of CoinMiner. One [variant](https://www.virustotal.com/en/file/0e59486b00572d110d5496ced0ff9bc58c5fad5521039adf6b9de6be91a7e1fb/analysis/) was unique to VirusTotal, which came from [219.134.1.151](http://www.whois.com/whois/219.134.1.151). There was only one other interesting upload attempted:

```text
FTP command: Client "59.151.127.231", "USER ftp"
[ftp] FTP response: Client "59.151.127.231", "331 Please specify the password."
[ftp] FTP command: Client "59.151.127.231", "PASS <password>"
[anon_ftp] OK LOGIN: Client "59.151.127.231", anon password "ftp"
[anon_ftp] FTP response: Client "59.151.127.231", "230 Login successful."
[anon_ftp] FTP command: Client "59.151.127.231", "STOR Melody.txt"
[anon_ftp] FTP response: Client "59.151.127.231", "425 Use PORT or PASV first."
```
After trying a number of different usernames, the client at [59.151.127.231](http://www.whois.com/whois/59.151.127.231) logged in and attempted to upload the `Melody.txt` file. I searched other FTP servers for this file and only found copies that were blank. Maybe it's just used to test whether directories are writable.

# Other Attacks

There's been some other malicious activity aside from uploads. Some clients were smart enough to incorporate the username `disloops` into their unauthorized login attempts. I believe these are just bots that can grab the domain name to guess more intelligently at the credentials.

The most interesting attack came from [106.187.92.228](http://www.whois.com/whois/106.187.92.228):

```text
FTP command: Client "106.187.92.228", "SITE CPFR /proc/self/cmdline"
FTP response: Client "106.187.92.228", "530 Please login with USER and PASS."
```
This is the first part of an attack against ProFTPD v1.3.5 that takes advantage of [CVE-2015-3306](https://web.nvd.nist.gov/view/vuln/detail?vulnId=CVE-2015-3306). Here is a description of the exploit from [Offensive-Security](https://github.com/offensive-security/exploit-database/blob/master/platforms/linux/remote/37262.rb):

```text
This module exploits the SITE CPFR/CPTO commands in ProFTPD version 1.3.5.
Any unauthenticated client can leverage these commands to copy files from any
part of the filesystem to a chosen destination. The copy commands are executed with
the rights of the ProFTPD service, which by default runs under the privileges of the
'nobody' user. By using /proc/self/cmdline to copy a PHP payload to the website
directory, PHP remote code execution is made possible.
```
If successful, the exploit creates a PHP page that accepts systems-level commands as GET parameters. This didn't work because I'm using a patched version of VSFTPD as the server.

# Conclusion

I've enjoyed maintaining a writable FTP server. As usual, the incoming attacks are a great learning tool. After watching the logs, I think that FTP is underutilized as an attack vector. The routines that most bots follow are primitive and wasteful.

Still, the majority of attackers are profiteers who have no interest in hunting through open directories for things of value. Maybe I'll upload a "canary" file to see who's putting the time in. At least the folks at [Jiaotong University](https://www.youtube.com/watch?v=qlk4JDOiivM&t=6m38s) will get to weed through some skateboard videos while they look.

# Sources

Here are a few articles that I read while researching the malicious uploads:

- <https://gist.github.com/Daxda/e9dbcb8d39e38d62c3bb>
- <https://www.guardicore.com/2016/06/the-photominer-campaign/>
- <https://www.fireeye.com/blog/threat-research/2016/06/resurrection-of-the-evil-miner.html>
