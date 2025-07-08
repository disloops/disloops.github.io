---
id: 2379
title: 'Parlor City MUSH'
date: '2020-05-28T01:19:28+00:00'
permalink: /mush/
guid: 'https://disloops.com/?page_id=2379'
---

**Parlor City** is a multi-user shared hallucination (MUSH) – a text-based game hosted on Linux and powered by [PennMUSH](https://www.pennmush.org/).

- [About](#anchor_about)
- [Connecting](#anchor_connecting)
- [Commands](#anchor_commands)
- [Example](#anchor_example)
- [Troubleshooting](#anchor_troubleshooting)

<a class="anchor" id="anchor_about"></a>
## About

> "There are conceptions of the world which are entirely based on the idea that we live in a house in which there is some secret, some buried treasure, some hidden store of precious things, which somebody at some time may find and which occasionally has in fact been found."
> 
> \- P.D. Ouspensky, A New Model of the Universe

Parlor City is one such world, with much of the story yet to be written. Hopefully it takes shape as an immersive adventure that derives its character from each of its travelers.

For comparison, much of my own gaming experience has just been trying to recapture the feeling of hearing the old *Final Fantasy* theme music again. *King's Quest VI* was another early game many of us played through, which was an open-world adventure with hidden areas, multiple endings, and myth and fairy tale themes. *Dragon Warrior* and *Myst* were two others that made lasting impressions – maybe that shines through in the world of Parlor City.

<a class="anchor" id="anchor_connecting"></a>
## Connecting

Parlor City is hosted at `mush.disloops.com` on port `4201`. There are a few ways to connect:

1. You can use the existing third-party online portals. Both [Mudverse](https://www.mudverse.com/game/528) and [Grapevine](https://grapevine.haus/games/ParlorCity) have simple "Play Now" links you can use. This is the easiest option for new users.

2. You can connect directly to port `4201` where the MUSH is listening. This allows you to use the MUSH client of your choice.

3. A restricted shell account can be set up so you can connect with a pre-configurated client from localhost. You can connect using SSH as follows: `ssh -p 18222 <username>@mush.disloops.com`

Contact me at [disloops@gmail.com](mailto:disloops@gmail.com) if you want the shell access.

<a class="anchor" id="anchor_commands"></a>
## Commands

Note that many commands can be shortened. For example, instead of using:

```
> go North
> say Greetings, northerners!
> talk Bartender
> inventory
```

...you can use these commands to the same effect (as long as the shortcuts are not ambiguous based on the circumstance):

```
> n
> "Greetings, northerners!
> talk b
> i
```

The following are built-in commands and actions. Help using any of these can be found by entering `help <command>` at the prompt.

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;"><div>
<ul>
<li>@channel</li>
<li>@chat</li>
<li>@doing</li>
<li>@list</li>
<li>@mail</li>
<li>@name</li>
<li>@password</li>
<li>@version</li>
<li>@whereis</li>
<li>brief</li>
<li>doing</li>
<li>drop</li>
<li>empty</li>
<li>enter</li>
<li>examine</li>
<li>get</li>
<li>give</li>
<li>goto</li>
</ul>
</div><div>
<ul>
<li>help</li>
<li>home</li>
<li>inventory</li>
<li>leave</li>
<li>look</li>
<li>news</li>
<li>page</li>
<li>pose</li>
<li>say</li>
<li>semipose</li>
<li>take</li>
<li>teach</li>
<li>use</li>
<li>whisper</li>
<li>who</li>
</ul>
</div></div>

The following are custom (or modified) actions and commands that have custom help entries. Many can be accessed with `+help`:

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;"><div>
<ul>
<li>buy</li>
<li>gold</li>
<li>pick</li>
<li>score</li>
<li>search</li>
<li>sell</li>
</ul>
</div><div>
<ul>
<li>steal</li>
<li>talk</li>
<li>@email</li>
<li>+news</li>
<li>+staff</li>
<li>+today</li>
</ul>
</div></div>

<a class="anchor" id="anchor_example"></a>
## Example

Here is an example session to show how a few commands work:

```
% Trying to connect to ParlorCity: 127.0.0.1 4201.
% Connected to ParlorCity.

.oO Parlor City Oo.
Version: PennMUSH 1.8.8p0
Client: TinyFugue 5.0 beta 8
Sysop: disloops

Use create <name> <password> to create a character.
Use connect <name> <password> to connect to your existing character.
Use quit to logout.

> create Tarquin password123
The Dark
Late at night, you awake with the sense that something outside requires your attention. A screened window carries the warm summer night to you and it feels alive with activity. As if in a dream, the mere thought of being outside seems to place you there. Something both strange and familiar beckons you onward.
Obvious exits:
Outside (o)

> @desc me = A wiry man with a laurel wreath crown.
Tarquin/DESCRIBE - Set.

> @sex me = male
Tarquin/SEX - Set.

> @email me = tarquin@netscape.com
Tarquin/EMAIL - Set.

> look o
The way glistens before you.

> o
Outside the Pub
You find yourself in a light fog. A street winds downhill to the northeast and a harbor is barely discernible beyond some rooftops. A public house is just in front of you.
Obvious exits:
Pub Door (p) and Northeast (ne)

> "Anybody here?
You say, "Anybody here?"

> :looks around a bit.
Tarquin looks around a bit.

> p
Cavanaugh's Pub
An ancient-looking tavern with heavy wooden tables and a bar in the center. The room is brightly lit by oil-lamps and a fireplace burning peat. Many adventures have been recounted here over a pint of ale. Type menu to see what's on tap.
Contents:
Bartender
Obvious exits:
Upstairs (u) and Front Door (f)

> look bar
Bartender
A non-descript man wearing an apron.
To see what drinks are available, type menu.

> talk bar
He's not much for small talk. To see the menu, type menu.

> search pub
Nothing was found.

> i
You are carrying:
Satchel of Gold
You have 50 pieces of gold.
```

<a class="anchor" id="anchor_troubleshooting"></a>
## Troubleshooting

Q: *Why do I keep getting the "I can't tell which one you mean" errors?*

A: The help entry for `matching` explains this:

```
> help matching
MATCHING
Matching is the process the MUSH uses to determine which object you mean when you try to do something with an object. Different commands and functions do matching in different ways, but most will allow you to specify an object as:
   * its dbref (#7) or objid (#7:123456789)
   * the string "me" (yourself)
   * the string "here" (the room you're in)
   * a '*' followed by a playername (*javelin)
   * its full name (Box of chocolates)
   * part of any word in its name, if nothing else shares that part (Box)

Using the object's name only works if the object is near you.

You can usually qualify an object with an adjective (English matching) to help the MUSH determine which object you mean. Adjectives include:
   * my <obj> - an object you're carrying
   * this <obj> - an object in your location (also: this here <obj>)
   * toward <exit> - an exit in your location
   * 1st, 2nd, etc. <obj> - one of a set of objects with the same names. Objects are ordered in the order in which they're listed in your inventory, room contents, and exit list (in that order). If there aren't enough objects, this will fail. You can use an adjective with an ordinal (my 1st <obj>, this 2nd <obj>, etc).

In commands that take a list of space-separated names (like page), you'll need to enclose names with spaces in "double quotes". The same is true on the login screen. For example:
   > page "Leeroy Jenkins" = Stop doing that.
```