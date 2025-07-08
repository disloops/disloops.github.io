---
id: 895
title: 'Snort 2.9.8.0 on Ubuntu 14.04 and VirtualBox'
date: '2016-01-09T16:46:41+00:00'
author: matt
guid: '/?p=895'
permalink: /snort-2-9-8-0-on-ubuntu-14-04-and-virtualbox/
categories:
    - Snort
    - Ubuntu
tags:
    - IDS
    - Snort
    - Ubuntu
    - VirtualBox
---

{: .notice--warning}
**Note:** This article is outdated now. I published a new one for the latest versions of Snort (2.9.8.3) and Ubuntu (16.04). You can also probably visit [sublimerobots.com](http://sublimerobots.com/) for the most up-to-date information on this process.

I've been playing with Snort a lot lately. I installed it on my home network using a switch that does port mirroring. I also created a Snort virtual machine that I can use with a laptop and a network tap to diagnose other people's problems. I picked up a [SharkTap Gigabit Network Tap](http://www.amazon.com/midBit-Technologies-LLC-100-1000/dp/B0175EODCE) for that. It's really just a hub though, and I had to make sure I wasn't sending any traffic back into a tapped network with it.

First I'll explain how I installed Snort at home.

<!--more-->

# Snort on Ubuntu

I used a [guide](https://cdn.disloops.com/files/tech/snort_on_ubuntu.pdf) on Snort's website for installation on Ubuntu 14.04 LTS. I had some issues with it, which I will describe below.

{: .notice--info}
**Note:** The author's [website](http://sublimerobots.com/) makes some of these corrections and may have the most recent information.

On page 2, the guide instructs users to turn off `GRO` and `LRO`. However, the commands listed will not create settings that will survive a reboot. Adding the commands to the `/etc/rc.local` file will ensure that they are executed every time the machine starts. Make sure to add them above the `exit 0` line:

```bash
ethtool -K eth0 gro off
ethtool -K eth0 lro off
```
On page 4, there are newer versions of both DAQ and Snort that can be downloaded. As of writing this they are:

```bash
wget https://www.snort.org/downloads/snort/snort-2.9.8.0.tar.gz
wget https://www.snort.org/downloads/snort/daq-2.0.6.tar.gz
```
On page 6, users are instructed to set the `EXTERNAL_NET` variable to `!$HOME_NET` in the `/etc/snort/snort.conf` config file. Updated guidance says that this can cause Snort to miss alerts, so `EXTERNAL_NET` should remain set to `any`.

The next section is on installing Barnyard2, which processes the packets that Snort collects and saves them in a database. Downloading and using Barnyard2 from the master branch link, as the guide instructs, will eventually result in an error. The cause is discussed in detail [here](https://groups.google.com/forum/#!topic/barnyard2-users/1zKDmWhPTzs) and the solution is to directly download a more recent version:

```bash
wget https://github.com/firnsy/barnyard2/archive/v2-1.13.tar.gz -O barnyard2-2-1.13.tar.gz
```
The next section is about setting up PulledPork, which downloads the latest Snort rules automatically. The link in the guide is outdated – the Google Code project for PulledPork is no longer updated. The correct link is here on GitHub:

```bash
wget https://github.com/shirkdog/pulledpork/archive/master.zip
```
There are a couple changes to the settings that the guide recommends for the `/etc/snort/pulledpork.conf` file:

```text
Line 96: change to: sid_msg_version=2
Line 133: change to: distro=Ubuntu-12-04
```
At the end of this section, the guide sets up a cronjob that runs PulledPork each night. However, without restarting Snort after downloading new rules, the `/var/log/syslog` file will fill up with errors such as:

```text
Dynamic Rule [3:16533] was not initialized properly.
```
The solution is to restart Snort each time PulledPork downloads new rules. Use the following cronjob in place of what the guide recommends:

```bash
01 04 * * * /usr/sbin/service snort stop && /usr/local/bin/pulledpork.pl -c /etc/snort/pulledpork.conf -l && /usr/sbin/service snort start
```

The next section is on setting up services that will run Snort and Barnyard2 on startup. The guide recommends creating a couple config files in `/etc/init` and making them executable. I found that instead of making these files executable, it's actually necessary to create symlinks in the `/etc/init.d` folder to get the services to run. Create them as follows:

```bash
sudo chmod 644 /etc/init/snort.conf
sudo chmod 644 /etc/init/barnyard2.conf
sudo ln -s /etc/init/snort.conf /etc/init.d/snort
sudo ln -s /etc/init/barnyard2.conf /etc/init.d/barnyard2
```
I didn't have any issues with the last section on installing BASE, the web front-end for Snort alerts.

At some point it was necessary to follow the steps to delete and re-create the Snort database in Appendix B. This is sometimes necessary immediately after installing Barnyard2. The instructions in Appendix B are good, but one final command is missing which makes the `/var/log/snort/barnyard2.waldo` file accessible again:

```bash
sudo chown snort:snort /var/log/snort/barnyard2.waldo
```
The last thing I did was to edit `/etc/rc.local` again to make sure that `eth0` is started in promiscuous mode by default:

```bash
ip link set eth0 promisc on
```
This was everything required to monitor my home network from a physical machine running Snort.

# Snort on VirtualBox

The steps on VirtualBox were basically the same. I made the edits to `/etc/rc.local` on both the host and guest machine to enable promiscuous mode and turn off `LRO` and `GRO`.

I wanted to use the Snort virtual machine from a laptop to passively monitor traffic on other networks. It was important to make sure that I wasn't sending any traffic back to the network interface. On the host and guest machines, I edited the default connection in Network Manager to prevent them from connecting automatically. Still, just plugging in an ethernet cable generated some IPv6 traffic. I disabled that by adding the following line to the host and guest `/etc/sysctl.conf` files:

```bash
net.ipv6.conf.eth0.disable_ipv6 = 1
```
From the VirtualBox network settings, I used a bridged network adapter and set promiscuous mode to "Allow All". Now just plugging the laptop into a network will show passive Snort alerts on the virtual machine.

Ubuntu guest machines on VirtualBox require a couple general changes to work correctly. I had to run the following for the shared clipboard to work:

```bash
sudo apt-get install virtualbox-guest-dkms
```
And I had to do the following to increase the resolution:

```bash
sudo apt-get remove libcheese-gtk23
sudo apt-get install xserver-xorg-core
sudo apt-get install -f virtualbox-guest-x11
```
Afterward I got the following error:

```text
VBoxClient:Failed to connect to the VirtualBox kernel service, rc=VERR_ACCESS_DENIED
```
I was able to fix this by going to "Devices" from the menu, selecting "Insert Guest Additions CD image..." and allowing it to run, then restarting.

# Conclusion

You can likely visit [sublimerobots.com](http://sublimerobots.com/) for the most up-to-date information on installing and configuring Snort. Leave a comment if you have any feedback about the steps I took to get up and running.
