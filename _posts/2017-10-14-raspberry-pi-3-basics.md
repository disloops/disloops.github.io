---
id: 1747
title: 'Raspberry Pi 3 Basics'
date: '2017-10-14T02:13:25+00:00'
author: matt
guid: '/?p=1747'
permalink: /raspberry-pi-3-basics/
categories:
    - 'Raspberry Pi'
tags:
    - 'Raspberry Pi'
---

There are plenty of articles online about the different things you can do with a Raspberry Pi. I recently bought a [new one from Adafruit](https://www.adafruit.com/product/3055) and I wanted to write down the steps I took to create a baseline configuration for future projects.

<!--more-->

# Setting Up Rasbian

I downloaded the latest version of [Raspbian](https://www.raspberrypi.org/downloads/raspbian/) and burned it to a new micro SD card. I plugged that in along with some peripherals I bought:

- [Wireless keyboard and mouse](https://www.amazon.com/Perixx-PERIDUO-710B-Wireless-Keyboard-Built/dp/B009ZNIIKW)
- [USB WiFi module with antenna](https://www.adafruit.com/product/1030)

The Raspberry Pi 3 actually has built-in WiFi but I thought I'd have a stronger connection using an external USB adapter.

After booting for the first time, I wanted to get rid of the default `pi` user. To do this, go to the start menu, open "Raspberry Pi Configuration" under "Preferences" and turn off the "Auto-Login" option. Then open a terminal and create a password for the root user:

```bash
sudo passwd root
```
Once that's done, reboot, log back in as `root` and run the following command:

```bash
usermod -l <user> -d /home/<user> -m pi
```
...replacing `<user>` with your desired username. This will transfer all of the `pi` user's existing settings to the user that you create. Now remove the root user's password:

```bash
sudo passwd -d root 
```
...and log back in as the new user. Next I ran the `raspi-config` command to change some settings:

- `sudo raspi-config` → Change User Password
- `sudo raspi-config` → Change Hostname
- `sudo raspi-config` → Localization (time zone, keyboard, etc.)
- `sudo raspi-config` → Advanced → Expand Filesystem

That last option will ensure that the whole micro SD card is available to Raspbian. Save the settings and reboot again.

# Getting Online

In order to automatically connect to WiFi, the network information should be added to the following file: `/etc/wpa_supplicant/wpa_supplicant.conf`

A single command can be used to generate the appropriate information and add it to the file. This will also store the password as an encrypted 32-byte hexadecimal number rather than in plaintext. Run the following:

```bash
sudo wpa_passphrase "SSID" "password" >> /etc/wpa_supplicant/wpa_supplicant.conf
```
...replacing `SSID` and `password` with the information about your wireless network. It will add a block of code to the `wpa_supplicant.conf` file that looks like this:

```text
network={
	ssid="SSID"
	#psk="password"
	psk=2f6a0beddf2f0588ee426b0c3a0e3d9a523bb07a05cb857f85d826da80fa75c4
}
```
You can then open the `wpa_supplicant.conf` file and remove the line with the plaintext password, which is not necessary. If you are using a network that does not broadcast its SSID, there is one more line you will need to add between the `ssid` and `psk` lines: `scan_ssid=1`

The resulting section will look like this:

```text
network={
	ssid="SSID"
	scan_ssid=1
	psk=2f6a0beddf2f0588ee426b0c3a0e3d9a523bb07a05cb857f85d826da80fa75c4
}
```
You can find more information on Raspberry Pi wireless configuration [here](https://www.raspberrypi.org/documentation/configuration/wireless/wireless-cli.md).

{: .notice--warning}
**Note:** Any command you run will be stored in the `~/.bash_history` file once your session ends. This means that the password for your wireless network will be stored there since it was part of the `wpa_passphrase` command. During your next session, remember to edit this file and remove the password information from it.

At this point I had two wireless interfaces running because I was using the external USB WiFi adapter. I wanted to turn off the Raspberry Pi's native WiFi adapter, which meant I had to blacklist the drivers for it. This can be done by adding the following lines to `/etc/modprobe.d/raspi-blacklist.conf`:

```text
blacklist brcmfmac
blacklist brcmutil
```
Additionally, if you want to disable Bluetooth, these lines can be added:

```text
blacklist btbcm
blacklist hci_uart
```
Obviously not everyone will need to take these steps.

# Patching and Security

You should now be connected to your wireless network after rebooting. Make sure to apply all the available updates once you're online:

```bash
sudo apt-get update
sudo apt-get dist-upgrade
```
Reboot once the patches have been applied and then upgrade the firmware:

```bash
sudo rpi-update
```
After another reboot, all the necessary patches should be in place. The next thing I set up was the SSH service:

- Backup the `/etc/ssh/sshd_config` file
- Edit the config file and add lines for the `Port` and `AllowUsers` keywords
- Save it and enable SSH by running `sudo systemctl enable ssh`

Now SSH should be listening and only users specified by `AllowUsers` can connect. I also set up [UFW](https://wiki.ubuntu.com/UncomplicatedFirewall) – it's a simple way to block unwanted incoming traffic. In order to accept only SSH requests, run the following commands:

```bash
sudo apt-get install ufw
sudo ufw allow <port>/tcp
sudo ufw enable
```
...replacing `<port>` with the SSH port being used. Don't forget to whitelist new ports in UFW as you set up more services going forward.

The last step I took was to configure automatic upgrades. The following commands can be used:

```bash
sudo apt-get install unattended-upgrades apt-listchanges
sudo dpkg-reconfigure -plow unattended-upgrades
```
Then edit the following file:

```text
/etc/apt/apt.conf.d/50unattended-upgrades
```
I made sure to uncomment and change the following settings:

```text
// Do automatic removal of new unused dependencies after the upgrade
// (equivalent to apt-get autoremove)
Unattended-Upgrade::Remove-Unused-Dependencies "true";

// Automatically reboot *WITHOUT CONFIRMATION* if 
// the file /var/run/reboot-required is found after the upgrade
Unattended-Upgrade::Automatic-Reboot "true";

// Automatically reboot even if there are users currently logged in.
Unattended-Upgrade::Automatic-Reboot-WithUsers "true";
```
Once that's done, make sure the `/etc/apt/apt.conf.d/20auto-upgrades` file contains the following lines:

```text
APT::Periodic::Enable "1";
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Verbose "2";
```
Now patches and upgrades should be applied automatically.

{: .notice--info}
**Note:** I've also been uninstalling `avahi-daemon` from internet-facing systems. Avahi is a package that broadcasts hosts and services on a local network. To uninstall:

```bash
sudo apt-get --auto-remove purge avahi-daemon
```
# Other Features

I wanted a shortcut to a File Manager on the Raspbian desktop. That can be done by creating a file in the `~/Desktop` directory called `filemanager.desktop` and adding the following lines:

```ini
[Desktop Entry]
Name=File Manager
Comment=File Manager
Icon=/usr/share/icons/Adwaita/32x32/actions/document-open.png
Exec=/usr/bin/pcmanfm
Type=Application
Encoding=UTF-8
Terminal=false
Cateogries=None;
```
The `Icon` there is a random thumbnail; you can use any one you want. I also wanted to install [Kodi](https://kodi.tv/) to watch videos. This was as simple as:

```bash
sudo apt-get install kodi
```
The only other setting I needed to change was the amount of memory allotted to the GPU. I found 256 MB to be the "sweet spot" for running Kodi, streaming online video, etc. Go to the start menu, open "Raspberry Pi Configuration" under "Preferences" and find the "GPU Memory" option under "Performance". Change this to `256` and video should work correctly after a reboot.

Lastly, I installed [BleachBit](https://www.bleachbit.org/) and cleaned everything up. Here's a list of the options I do NOT enable when running BleachBit:

- APT → Package lists
- Bash → History
- System → Free disk space
- System → Memory
- System → Rotated logs

# Next Steps

I will write about some security tools and projects that can be used with the Raspberry Pi but I wanted to get this baseline configuration down on paper. Let me know if you run into any issues while setting one up!
