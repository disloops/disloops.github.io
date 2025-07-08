---
id: 22
title: 'Secure Ubuntu 14.04 Configuration'
date: '2015-07-23T00:51:50+00:00'
author: matt
guid: '/?p=22'
permalink: /secure-ubuntu-14-04-configuration/
categories:
    - Ubuntu
tags:
    - Ubuntu
---

I'm still using Ubuntu as my preferred Linux distro on personal machines. These are some of the settings that I configure each time I have to install it. Starting from the beginning:

<!--more-->

# Installation

Download the [ISO image](http://www.ubuntu.com/download/desktop) for the latest Long-Term Support (LTS) version and burn it to a disc. Boot from the disc to reach the installation menus and configure according to your needs. My own preference:

- Plan to erase the entire disc to install Ubuntu
- Do not download updates during installation
- Do not encrypt the OS or home directory
- Do not use Logical Volume Management (LVM)

Most importantly:
- Do not allow automatic login
- Do not allow login without a password

Finish the installation and restart when prompted.

# Settings

Welcome to Ubuntu's latest interface, probably Unity. Don't worry, we're rolling back to basic GNOME after running updates. Click the "Search" icon (top left in Unity) and search for "Software Updater". Install all available updates and restart again.

Press `CTRL+ALT+T` to bring up the terminal. Then install GNOME:

```bash
sudo apt-get install gnome-session-fallback
```
Now log off, chose "GNOME (Compiz)" from the foot-shaped dropdown, and login again.

{: .notice--warning}
**Note:** I recently encountered [an error](https://bugs.launchpad.net/ubuntu/+source/gnome-session/+bug/1251281) that prevented me from launching a Compiz desktop session, casued by a failed attempt at hardware acceleration. This occurred after [upgrading](/nvidia-drivers-on-ubuntu/) to a proprietary NVIDIA driver. The solution is just to use "GNOME (Metacity)" instead.

Next we'll remove the drum sound and make the login screen black. Create a file as follows:

```bash
sudo vi /usr/share/glib-2.0/schemas/com.canonical.unity-greeter.gschema.override
```
Add these lines and save it:

```ini
[com.canonical.unity-greeter]
draw-user-backgrounds=false
draw-grid=false
background='#000000'
background-color='#000000'
play-ready-sound=false
```
Apply the settings:

```bash
sudo glib-compile-schemas /usr/share/glib-2.0/schemas/
```
We'll also make the boot screens black. Make a backup copy of the configuration file:

```bash
sudo cp /lib/plymouth/themes/ubuntu-logo/ubuntu-logo.script /lib/plymouth/themes/ubuntu-logo/ubuntu-logo.script.old
```
Then edit the file:

```bash
sudo vi /lib/plymouth/themes/ubuntu-logo/ubuntu-logo.script
```
Change the color values in these lines so that they're all zero:

```javascript
Window.SetBackgroundTopColor (0.0, 0.00, 0.0);
Window.SetBackgroundBottomColor (0.0, 0.00, 0.0);
```
Apply the settings:

```bash
sudo update-initramfs -u
```
{: .notice--info}
**Note:** In Ubuntu 16.04 the path for this file has changed. It is now as follows:

```bash
/usr/share/plymouth/themes/ubuntu-logo/ubuntu-logo.script
```
# Security

Ubuntu's guest account is a decent way to share access to your machine if necessary. However, it's better to turn it off by default.

Edit the file:

```bash
sudo vi /usr/share/lightdm/lightdm.conf.d/50-ubuntu.conf
```
Add a line at the bottom and save:

```ini
allow-guest=false
```
Ubuntu has a "Security &amp; Privacy" menu that should be modified. Open it from the Settings menu and do the following:

- Turn off the data retention for file and application usage
- Clear any existing history data
- Turn off the ability to include online search results on the "Search" menu
- Uncheck the boxes for usage data and error reports

You can also uninstall `whoopsie` which only exists to submit error reports to Canonical. You have to delete one part manually:

```bash
sudo apt-get remove --purge whoopsie
sudo rm -rf /var/lib/whoopsie
```
Ubuntu bundles in the ability to pull web results into desktop searches. This should only occur when using the Unity interface, and supposedly we just turned it off, but let's finish the job. The site [fixubuntu.com](https://fixubuntu.com/) was created to help solve this problem. Their current guidance is to use an application that removes the offending packages. I'm sure this works but I prefer to use the scripts they had available until recently. I have two versions of the script:

[fixubuntu_old.sh](../assets/scripts/fixubuntu_old.sh) (old) and [fixubuntu_new.sh](../assets/scripts/fixubuntu_new.sh) (newer)

Use this command to run the script locally:

```bash
wget -q -O - https://disloops.com/assets/scripts/fixubuntu_new.sh | bash
```
Then just get rid of the remaining Amazon icon in the "Applications" menu. The icons are controlled by files in the `/usr/share/applications` directory. Run the following to remove it:

```bash
sudo rm /usr/share/applications/ubuntu-amazon-default.desktop
```
Next set the DNS settings to point at Google's DNS servers. Otherwise you're just using your ISP's servers:

- System Tools → Preferences → Network Connections
- Select your ethernet connection and click the IPv4 tab
- Set the method to "Automatic (DHCP) addresses only"
- Set the DNS servers to `8.8.8.8, 8.8.4.4`
- Click the IPv6 tab. Set the method to "Automatic, addresses only"
- Set the DNS servers to `2001:4860:4860::8888, 2001:4860:4860::8844`

# Applications

After setting up the platform, there are a couple applications that should be configured. First make sure Ubuntu's "Uncomplicated Firewall" (UFW) is running. UFW is a layer over iptables that makes it easy to filter network traffic. Install it and enable:

```bash
sudo apt-get install ufw
sudo ufw enable
```
All incoming requests are blocked by default. As you open ports for different services, you will need to add UFW rules to allow the incoming traffic. Check the current UFW rules with the following command:

```bash
sudo ufw status verbose
```
Next install [Chrome](http://www.google.com/chrome/) and drag the icon to the toolbar. Right-click, select properties, and set the "command" field as follows:

```bash
/usr/bin/google-chrome-stable --incognito %U
```
Now Chrome will start in Incognito Mode by default. [Firefox](https://www.mozilla.org/en-US/firefox/new/) has a similar option:

```bash
/usr/lib/firefox/firefox -private %U
```
I use the same two plugins for Chrome: [uBlock Origin](https://chrome.google.com/webstore/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm) and [Ghostery](https://chrome.google.com/webstore/detail/ghostery/mlomiejdfkolichcflejclcbmpeaniij). Chrome must be configured to "Allow extensions in Incognito Mode" for them to work. This is disabled to prevent plugins from caching data that Chrome would otherwise purge after it's closed. Firefox also has an "about:config" menu that can be used to control its behavior and minimize its footprint on disk.

Lastly install [BleachBit](http://bleachbit.sourceforge.net/). Make sure it's set to "Overwrite files to hide contents" during the installation. Run it now to clean up any data created during the setup process.

*Update: I have also been installing the* `unattended-upgrades` *package and configuring automatic upgrades. Readers should decide if that's right for their own environment. In my own case it was as follows:*

```bash
sudo apt-get install unattended-upgrades apt-listchanges
sudo vi /etc/apt/apt.conf.d/50unattended-upgrades
sudo vi /etc/apt/apt.conf.d/20auto-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```
In the file "/etc/apt/apt.conf.d/50unattended-upgrades" you must specify the origins that you want to pull updates from automatically. I used the most permissive settings. You can also dictate whether reboots occur immediately when required, along with some other settings.

After that I put these two lines in "/etc/apt.conf.d/20auto-upgrade":

```text
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
```
Your installation settings may vary but now updates will be applied automatically.
