---
id: 1709
title: 'Fixing the Barnyard2 PID File Problem'
date: '2017-06-04T21:02:14+00:00'
author: matt
guid: '/?p=1709'
permalink: /fixing-the-barnyard2-pid-file-problem/
categories:
    - Snort
tags:
    - Snort
---

For the longest time I've gotten the following error from Snort's `barnyard2` spooler process:

```text
barnyard2: Could not remove pid file /var/run//barnyard2_NULL.pid: Permission denied
```

On Ubuntu 16.04, the `barnyard2` process is created in this systemd unit file:

```bash
/lib/systemd/system/barnyard2.service
```
This process creates the pid file in the `/var/run` directory before the user permissions drop to the level provided by the `-u` option. Then when exiting, the process attempts to delete the pid file that was created with elevated privileges.

<!--more-->

To fix this, I modified the process's systemd file:

```ini
[Unit]
Description=Barnyard2 Daemon
After=syslog.target network.target

[Service]
Type=simple
User=snort
Group=snort
PermissionsStartOnly=true
ExecStartPre=-/bin/mkdir /var/run/snort
ExecStartPre=/bin/chown -R snort:snort /var/run/snort/
ExecStart=/usr/local/bin/barnyard2 -c /etc/snort/barnyard2.conf -d /var/log/snort -f snort.u2 -q -w /var/log/snort/barnyard2.waldo -g snort -u snort -D -a /var/log/snort/archived_logs --pid-path=/var/run/snort

[Install]
WantedBy=multi-user.target
```
The `ExecStartPre` directive specifies commands to be run before the daemon is started. We're using it to create a new directory for the pid file that is owned by the `snort` user. This needs to be created each time, otherwise it will get [wiped out](https://blog.hqcodeshop.fi/archives/93-Handling-varrun-with-systemd.html) after a reboot. The minus sign in the command means any errors (such as the directory already existing) will be ignored.

The `User` and `Group` directives ensure that the process will run as the `snort` user, which includes creating the pid file. However, in order to create the `/var/run/snort` directory, the `ExecStartPre` directives still need to be run with elevated permissions. The `PermissionsStartOnly` accomplishes this – it only switches to the `snort` user to start the actual daemon. Here is the entry from the [systemd](https://www.freedesktop.org/software/systemd/man/systemd.service.html) manual page:

```text
<b>PermissionsStartOnly</b>
Takes a boolean argument. If true, the permission-related execution options, as configured with User= and similar options are only applied to the process started with ExecStart=, and not to the various other ExecStartPre=, ExecStartPost=, ExecReload=, ExecStop=, and ExecStopPost= commands. If false, the setting is applied to all configured commands the same way. Defaults to false.
```
The last thing necessary is to provide the non-default pid file location to the `barnyard2` process. This is done by appending the following option to the end of the `ExecStart` command:

```bash
--pid-path=/var/run/snort
```
Now `barnyard2` should run without errors! Let me know if you had the same issue.

# Troubleshooting

{: .notice--primary}
**Note:** The following item was added after I originally posted this article.

I still had one more error after making the above changes. It is as follows:

```text
barnyard2: Parsing config file "/etc/snort/barnyard2.conf"
barnyard2: FATAL ERROR: Unable to open config file "/etc/snort/barnyard2.conf": Permission denied.
```
The `barnyard2` process could no longer read the `barnyard2` config file. On my system, the config file was owned by `root` with permissions of `640`.

Originally, the `barnyard2` process started with elevated privileges, so it could read the config file without issue. This was changed by adding the `User` and `Group` directives to the systemd unit file to ensure that the pid file would be owned by `snort`.

Because the `barnyard2` config file contains database credentials, it should not be readable by all users. So I changed its group owner to be `snort`:

```bash
cd /etc/snort
sudo chgrp snort barnyard2.conf
ls -la barnyard2.conf
-rw-r----- 1 root snort 12123 Aug 12  2016 barnyard2.conf
```
Now the less privileged `barnyard2` process can still read it on startup.

# Sources

Here are a few articles that were helpful when coming up with these solutions:

- <http://seclists.org/snort/2014/q4/237>
- <https://bugs.launchpad.net/ubuntu/+source/snort/+bug/1006982>
- <https://blog.hqcodeshop.fi/archives/93-Handling-varrun-with-systemd.html>
