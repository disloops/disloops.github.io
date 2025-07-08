---
id: 764
title: 'NVIDIA Drivers on Ubuntu'
date: '2015-12-19T19:26:10+00:00'
author: matt
guid: '/?p=764'
permalink: /nvidia-drivers-on-ubuntu/
categories:
    - Ubuntu
tags:
    - NVIDIA
    - Ubuntu
---

I'm using a desktop that I got from [System76](https://system76.com/) with an NVIDIA graphics card. Installing the NVIDIA drivers on Ubuntu wasn't simple, so here are the steps that I've gotten to work across multiple installations.

<!--more-->

First remove any existing NVIDIA packages:

```bash
sudo apt-get remove --purge nvidia*
sudo apt-get autoremove
```
Next blacklist the `nouveau` driver. Without this step, the driver can re-appear after an update and cause problems. Create the blacklist file:

```bash
sudo vi /etc/modprobe.d/blacklist-nouveau.conf
```
And add the following lines:

```text
blacklist nouveau
blacklist lbm-nouveau
options nouveau modeset=0
alias nouveau off
alias lbm-nouveau off
```
Next create a file to disable the `nouveau` kernel mode setting:

```bash
sudo vi /etc/modprobe.d/nouveau-kms.conf
```
And add the following line:

```text
options nouveau modeset=0
```
Then apply the settings:

```bash
sudo update-initramfs -u
```
Now download the driver from the [NVIDIA website](http://www.nvidia.com/download/index.aspx) for your specific graphics card. Afterward, reboot and press `CTRL+ALT+F1` at the login screen. That will bring up a true TTY terminal. Pressing `CTRL+ALT+F7` will return you to graphical mode.

From the terminal, enter the following commands, replacing the filename of the driver with the one you downloaded:

```bash
sudo apt-get install dkms build-essential
sudo service lightdm stop
cd ~/Downloads/
sudo chmod u+x NVIDIA-Linux-x86_64-352.63.run
sudo ./NVIDIA-Linux-x86_64-352.63.run
```
You'll be asked to accept the license, then shown the "distribution-provided pre-install script failed" warning. Ignore this and continue. Allow the script to register the kernel module sources with DKMS when prompted. The kernel modules will be built and another warning will appear about the 32-bit compatibility libraries. This can also be ignored.

The script presents a message about the `libvdpau` and `libvdpau_trace` libraries and then installs the drivers. The script will ask to run the `nvidia-xconfig` utility. Select "Yes" here (note that "No" is the default).

That completes the installation. Restart your system and the drivers should be working correctly:

```bash
sudo shutdown -r now
```
For more details after installation, check the log file at: `/var/log/nvidia-installer.log`
