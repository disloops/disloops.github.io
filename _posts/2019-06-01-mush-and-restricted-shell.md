---
id: 2233
title: 'MUSH and Restricted Shell'
date: '2019-06-01T00:17:46+00:00'
author: matt
guid: '/?p=2233'
permalink: /mush-and-restricted-shell/
categories:
    - MUSH
    - SSH
    - TELNET
tags:
    - MUSH
    - SSH
    - TELNET
---

I have slowly been working on a MUSH, which is an online, multi-player, text-based social game. The game [Zork](https://www.youtube.com/watch?v=NiAFTe76iwg) (1977) is probably the most popular game in this style, although it is not multi-player. I decided to use [PennMUSH](https://www.pennmush.org/) as the server distro since it seems to have the widest support.

MUSH servers open a raw TCP socket for incoming connections and most sessions occur over plaintext. There are a handful of MUSH clients that players can use but a simple TELNET connection also works. MUSH servers understand enough of the TELNET [protocol](https://www.sciencedirect.com/topics/computer-science/telnet-protocol) to refuse option negotiation.

At one time I decided to create restricted shell accounts for users and have them connect to the MUSH via `localhost` rather than expose the MUSH server to the open internet. I have since walked that back and just opened it to the internet but shell accounts are still an option. See [this page](/mush) for some details.

<!--more-->

{: .notice--warning}
**Update:** The configuration that follows has been deprecated in a couple places due to the diligence of [@unix-ninja](https://twitter.com/unix_ninja) and his testing. Essentially, the use of an `rbash` restricted shell still allowed for a "history" file to be written to disk. Its location could then be passed as an argument to the TinyFugue client and loaded as a more permissive configuration file, which gave way to an unrestricted shell. Excellent work! The solution is to just use TinyFugue as the shell and scrap `rbash` altogether. Read his article here: [MUDding Around: Hacking for gold in text-based games](https://www.unix-ninja.com/p/mudding_around_hacking_for_gold_in_text-based_games)

# Setting Up Restricted Shell

The premise for setting up restricted accounts is as follows:

- Use [rbash](https://www.gnu.org/software/bash/manual/html_node/The-Restricted-Shell.html) as a restricted shell
- Limit `$PATH` to a custom `/bin` directory
- Add symbolic links in custom `/bin` directory to a limited set of commands

If `bash` is started with the name `rbash`, the shell becomes restricted, meaning that a number of commands are prohibited. We'll enable that now with a symlink:

```bash
cd /bin
sudo ln -s bash rbash
```
We'll also add a `group` for the restricted users:

```bash
sudo groupadd mushusers
```
# Creating Users

Now let's go through the process of creating a restricted user account:

```bash
sudo useradd -m -d /home/mushusers/basic_user -s /bin/rbash -N -g mushusers -c "Testing the restricted access shell" basic_user
```
The options above are as follows:

- `-m` → creates a home directory
- `-d` → specifies a non-default location for the home directory
- `-s` → specifies the login shell to use
- `-N` → do not create a group with the same name as the user but add the user to the group specified by the `-g` option
- `-c` → comment field

{: .notice--warning}
**Note:** As stated above this is deprecated. We're now using `/usr/bin/tf` as the login shell. A lot of the configuration is still the same in either case.

Linux systems use a few different files to configure a user's session in different scenarios:

- `.bashrc`
- `.bash_profile`
- `.profile`

This is where the `PATH` environment variable is located, which defines where to find executables. So we want to wipe any existing config files and create our own with a custom `PATH`:

```bash
sudo rm -rf /home/mushusers/basic_user/.bash*
sudo rm -rf /home/mushusers/basic_user/.profile
sudo vi /home/mushusers/basic_user/.bashrc
```
Here's the full text of the `.bashrc` file I created for restricted users:

```bash
PATH=$HOME/bin
export PATH
echo
echo "  Welcome! This is a restricted shell. Type 'mush' to visit Parlor City."
echo "  You can also type 'passwd' to change your password. Type 'exit' to leave."
echo
```
This same file can be used as `.bash_profile` too:

```bash
sudo cp /home/mushusers/basic_user/.bashrc /home/mushusers/basic_user/.bash_profile
```
You can see that we define and export the `PATH` variable above, which is limited to a single `/bin` directory that we'll create now:

```bash
sudo mkdir /home/mushusers/basic_user/bin
sudo ln -s /usr/bin/tf /home/mushusers/basic_user/bin/mush
sudo ln -s /bin/passwd /home/mushusers/basic_user/bin/passwd
```
Within this directory we've created symlinks for only two commands:

- `passwd` to allow users to change their password
- `mush` to allow them to connect to the MUSH (explained below)

Now we'll correct the owner and permissions and use `chattr` to make the files immutable with the `+i` attribute:

```bash
sudo chmod -R 750 /home/mushusers/basic_user
sudo chown -R basic_user:mushusers /home/mushusers/basic_user
sudo chattr +i /home/mushusers/basic_user/.bashrc
sudo chattr +i /home/mushusers/basic_user/.bash_profile
```
That completes the configuration for the restricted shell user. The only thing left is to create a password for the account:

```bash
sudo passwd basic_user
```
I also had to modify `/etc/ssh/sshd_config` and to enable password authentication. Set `PasswordAuthentication` to yes then restart the SSH service.

# Last Configuration Items

The `mush` command above is symlinked to the [TinyFugue](https://tinyfugue.sourceforge.net/) client for restricted shell users. By default, TinyFugue will pull from `/usr/share/tf5/tf-lib/local.tf` for configuration data. There are two custom lines needed here:

```text
/addworld -T"tiny" ParlorCity localhost 4201
/restrict WORLD
```
- The [addworld](http://flaprider.dyndns.org/~hair/tf/commands/addworld.html) command defines a shortcut for a known world. TinyFugue will connect here by default.
- The [restrict](http://josh.flagrancy.net/manuals/tf_old/commands/restrict.html) command prevents users from defining new worlds, writing files, etc. This appropriately locks down TinyFugue for general use.

One note regarding TinyFugue for my own sake, it was necessary to install `libncurses` to get TinyFugue working correctly:

```bash
sudo apt-get install libncurses5-dev libncursesw5-dev
```
Before TinyFugue was in place, restricted shell users used the `telnet` command to connect to the MUSH server locally. We needed to prevent these users from making connections to remote servers, though. The solution was to use `iptables` to prevent users in the "mushusers" group from establishing outbound connections. The resulting command looked like this:

```bash
iptables -A OUTPUT -o eth0 -m owner --gid-owner 1001 -j REJECT
```
...where "1001" is the ID for the "mushusers" group we added the users to.

Because `iptables` rules don't persist across reboots, I added this command to `/etc/rc.d/rc.local` so that it will always run on startup. I also had to make this file executable:

```bash
sudo chmod +x /etc/rc.d/rc.local
```
This configuration is still in place.

That's it! The commands in the "Creating Users" section above can now be repeated to add more users. I will keep this article updated if I come across any further best practices for configuring restricted shell accounts.
