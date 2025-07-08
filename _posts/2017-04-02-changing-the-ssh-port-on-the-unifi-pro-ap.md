---
id: 1665
title: 'Changing the SSH Port on the UniFi Pro AP'
date: '2017-04-02T03:59:24+00:00'
author: matt
guid: '/?p=1665'
permalink: /changing-the-ssh-port-on-the-unifi-pro-ap/
categories:
    - UniFi
tags:
    - UniFi
---

Because my router doesn't have WiFi built in, I bought a [Unifi Pro AP](https://www.ubnt.com/unifi/unifi-ap-ac-pro/) wireless access point for use at home. The device itself runs on a version of BusyBox, the preferred Linux distribution for embedded systems. A significant piece of software is required for administrative tasks, though – the UniFi Controller. Because it relies on MongoDB, I installed it on a virtual machine that I only spin up when necessary.

<!--more-->

After logging into the access point and changing the password, I wanted to change the SSH port to something non-default. BusyBox uses DropBear for SSH, but directly editing these settings on the device doesn't work. The firmware reverts to the default settings with every reboot. Instead, Unifi has a more complicated way to make these changes. (To their credit, this is probably a useful setup for people managing a significant number of access points.)

Administrators can make persistent changes to access points by creating a `config.properties` file on the machine hosting the Controller software. I used the following page to figure out how to set that up: [Unifi Persistent Changes](https://help.ubnt.com/hc/en-us/articles/205146040-OD-UniFi-What-is-the-config-properties-file-)

On my own virtual machine, I created a configuration file in the following location:

`/usr/lib/unifi/data/sites/default/config.properties`

I added the following two lines to that file in order to change the SSH port:

```properties
config.system_cfg.1=sshd.1.status=enabled
config.system_cfg.2=sshd.1.port=<port goes here>
```
For the changes to take effect, it is necessary to "trigger a provision" on the device. According to another help page: "it may be easiest to toggle a service like SNMP or syslog" in the UniFi Controller software to push the changes to the device. This should change the SSH port following a reboot.

Please leave a comment if you have any issues!
