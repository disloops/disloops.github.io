---
id: 2103
title: 'PSAD on Raspberry Pi'
date: '2018-10-28T23:00:11+00:00'
author: matt
guid: '/?p=2103'
permalink: /psad-on-raspberry-pi/
categories:
    - PSAD
    - 'Raspberry Pi'
tags:
    - PSAD
    - 'Raspberry Pi'
---

I have never gotten a full intrusion detection system (IDS) working correctly on a Raspberry Pi. The two most popular – Snort and Bro IDS – either have problems with their dependencies or the ARM architecture.

I recently came across [PSAD](https://github.com/mrash/psad) – the Port Scan Attack Detector. It is essentially a collection of daemons that analyze `iptables` logs to identify patterns of malicious traffic. When used in conjunction with [fwsnort](https://github.com/mrash/fwsnort), PSAD can also correlate blocked traffic with many of the "Emerging Threats" Snort rules.

PSAD was extremely easy to set up on a Raspberry Pi that's deployed as a catch-all DMZ host on my home network. Before diving into the details, you can see live data being collected by that host here: <https://psad.disloops.com>

<!--more-->

# Setting up PSAD and UFW

This setup relies on the base configuration for a Raspberry Pi that's described here: [Raspberry Pi 3 Basics](/raspberry-pi-3-basics/)

To begin, first install PSAD:

```bash
sudo apt-get install psad
```
In the tutorial above, UFW was set up as a wrapper over `iptables`. However, UFW logs do not have the level of detail that PSAD requires. Without modifying the logging capabilities, some messages may be discarded before PSAD can analyze them.

First back up the UFW configuration files:

```bash
cd /etc/ufw
sudo cp before.rules before.rules.old
sudo cp before6.rules before6.rules.old
```
Now edit the files above to add the following block just before the lines containing the final `COMMIT` directive:

```text
# Custom PSAD logging directives
-A INPUT -j LOG --log-tcp-options
-A FORWARD -j LOG --log-tcp-options
```
These lines will ensure that `iptables` events are logged properly. The `--log-tcp-options` argument adds additional data to the log files that can be used to detect certain attacks. The `EXPECT_TCP_OPTIONS` parameter in the PSAD configuration below corresponds to this setting.

Now PSAD can be configured:

```bash
cd /etc/psad
sudo cp psad.conf psad.conf.old
sudo vi psad.conf
```
Here are some of the parameters that should be modified:

```text
HOSTNAME                       your_host_here;
HOME_NET                       192.168.0.0/16;
ALERTING_METHODS               noemail;
```
The first two are self-explanatory. The `ALERTING_METHODS` setting accepts three values: `noemail`, `nosyslog`, and `ALL`. Here it's being set to suppress email alerts.

```text
IPT_SYSLOG_FILE                /var/log/ufw.log;
```
This just tells PSAD where to acquire `iptables` log data. The UFW configuration above was modified so that this data would be captured correctly.

```text
EXPECT_TCP_OPTIONS             Y;
```
Because some scanning tools don't set options in the TCP headers, using this setting allows PSAD to better identify those attacks. PSAD also uses this information to passively fingerprint remote operating systems. This setting depends on the `--log-tcp-options` argument provided in the UFW configuration files above.

```text
IMPORT_OLD_SCANS               Y;
```
This tells PSAD to re-import old scan data after a restart instead of moving it to the archive directory, which allows the statistics to remain persistent across reboots.

Lastly, have PSAD download the latest set of modified Snort signatures and reboot:

```bash
sudo psad --sig-update
sudo reboot
```
# Setting up fwsnort

The `fwsnort` tool parses Snort rules and builds an equivalent `iptables` ruleset for as many rules as possible. Currently, `fwsnort` downloads and processes the "Emerging Threats" Snort ruleset.

First download and unzip `fwsnort`:

```bash
cd; mkdir Downloads; cd Downloads
wget https://github.com/mrash/fwsnort/archive/master.zip
sudo unzip master.zip -d /usr/local/src
cd /usr/local/src/fwsnort-master
```
Then run the installation script:

```bash
sudo su
./install.pl
exit
```
Once installed, modify the `HOME_NET` parameter in `/etc/fwsnort/fwsnort.conf` so that it matches what was set up in `psad.conf` above.

Now the Snort rules need to be updated, parsed, and added to `iptables`:

```bash
sudo fwsnort --update-rules
sudo fwsnort --no-ipt-OUTPUT
sudo /var/lib/fwsnort/fwsnort.sh
```

{: .notice--info}
**Update:** The `--no-ipt-OUTPUT` option discards packets that are emitted by the host. This was suggested by [@cdeck3r](https://github.com/cdeck3r) in a honeypot project for the Raspberry Pi Zero W that uses PSADify. The project can be found [here](https://gist.github.com/cdeck3r/5151c53b282431158a59091c0e26f27d). Thanks Christian!

Unfortunately, the `iptables` rules won't persist across a reboot. To save them, simply add the above script to `rc.local` so that it's run each time the system starts:

```bash
sudo vi /etc/rc.local
```
Just add the following commands above the line containing the `exit` command.

```bash
sudo fwsnort --update-rules
sudo fwsnort --no-ipt-OUTPUT
/var/lib/fwsnort/fwsnort.sh
sudo psad -H
```

{: .notice--warning}
**Note:** Every other method of making `iptables` rules persistent did not work, including `iptables-persistent` and `netfilter-persistent`. You can ensure that the Snort rules have been added to `iptables` by running:

```bash
sudo fwsnort --ipt-list
```
The `psad -H` command just tells PSAD to grab the new rules. I also added a nightly cronjob to pull down the latest rules and load them into PSAD. Run `sudo crontab -e` and add the following lines:

```bash
PATH=/bin:/usr/bin:/usr/local/bin:/usr/sbin
0 0 * * * fwsnort --update-rules && fwsnort && /var/lib/fwsnort/fwsnort.sh
10 0 * * * psad -H
```
Then reboot!

# Next Steps

The `/var/log/psad` directory contains some output files that provide data and statistics on incoming traffic. Running the following command will produce a file called `status.out` that compiles the more interesting details into a presentable format:

```bash
sudo psad --Status
```
There are some visualization tools available for PSAD but nothing that met my needs. Instead, I created a script that generates an HTML page from the data contained in the PSAD output files. You can download it here: [PSADify on Github](https://github.com/disloops/psadify)

Take a look at the [output data](https://psad.disloops.com) and let me know if you have any observations!

# Sources

This article was helpful in getting PSAD to work with UFW:  
 - <https://gist.github.com/netson/c45b2dc4e835761fbccc>
