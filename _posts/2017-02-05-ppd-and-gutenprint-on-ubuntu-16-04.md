---
id: 1648
title: 'PPD and Gutenprint on Ubuntu 16.04'
date: '2017-02-05T21:54:55+00:00'
author: matt
guid: '/?p=1648'
permalink: /ppd-and-gutenprint-on-ubuntu-16-04/
categories:
    - Ubuntu
tags:
    - Ubuntu
---

When trying to print with a Canon iP2702 printer on Ubuntu 16.04 recently, every job was being created with a "Stopped" status. Nothing was printing and there were no error messages.

After investigating, I found the issue by expanding the job attributes for one job: (System Settings → Printer → View Print Queue → Right-click job → View Attributes)

```text
job-printer-state-message: The PPD version (5.2.10-pre2) is not compatible with Gutenprint 5.2.11.
```
...which lead me to a [thread](https://bbs.archlinux.org/viewtopic.php?id=102892) that had a solution. In order to fix the issue, I had to run the following:

```bash
sudo /usr/sbin/cups-genppdupdate
sudo service cups restart
```