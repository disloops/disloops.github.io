---
id: 2666
title: 'Back-Alley Hacking: 8Bit MUSH (Part Three)'
date: '2021-05-10T14:35:08+00:00'
author: matt
guid: '/?p=2666'
permalink: /back-alley-hacking-8bit-mush-part-three/
categories:
    - MUSH
tags:
    - MUSH
---

In both prison and the military, there are some crimes that authorities turn a blind eye to. It helps to maintain control. Inmates aren't planning escape when they're busy extorting each other and trading cigarettes.

I think 8Bit is similar in some ways. There's enough to keep players busy. Unfortunately, I grew listless with some of 8Bit's greater villains absent from the MUSH, and my focus turned to crime.

But I think I would have done this anyway.

<!--more-->

# Kyol Hacked

Sometime toward the end of 2020, 8Bit citizen "Kyol" wrote this gem of a comment in chat:

```text
<Public> kyol says, "I wonder when TacoSal is going to use his HACKER SKILLS to TEACH US ALL A LESSON lol"
```
He would leave 8Bit shortly after, only logging back in to occasionally dart me and post his commercials to the poll.

I decided to visit his property recently, after the latest dart had worn off. He has two properties listed:

```text
430 Forest --> kyol's Home - ZZT (#44276)
540 Peach Street --> kyoltech (#45381)
```
The forest residence just hosts a labyrinth game. Oddly, the lot exit (#41370) is set `DARK` so only one exit appears, called "pkmn" (#46185). This links to "kyoltech Server Room" (#19436). Note that this is different than his "Server Room" (#22546).

This place is already set `VISUAL` along with most of the Pokemon objects inside. Looking through them, the "PokeMUSH Universal Functions" (#11988) object has one function that makes a bad mistake:

```text
FUN.SPAWN.CUSTOM [#7944]: [iter([lnum(200)],[if([eq([hasattr(#11944,pkmn.##)],0)],[ibreak()][set(#11988,var.generate.slot:##)])])][set(#11988,var.spawn.pkmn.id:%1)][set(#11944,pkmn.[get(#11988/var.generate.slot)]:[get(#11988/var.spawn.pkmn.id)]|[loc(%0)]|60|0)][u(#12188/fun.scan)]
```
This function sets the value of two separate attributes using a raw parameter value. That means anyone calling the function can turn these attributes into new commands with the right input. Let's try that now:

```text
> think u(#11988/FUN.SPAWN.CUSTOM,test,$shazam *\:@force me=%%0)
> shazam pemit(#30406,Gang gang!)
Gang gang!
Gang gang!
```
Uh oh! Our new "shazam" command allows us to `@force` Kyol's objects. Note that this fires twice because both (#11988) and (#11944) now have identical commands.

The Pokemon functionality will overwrite these values shortly so we don't have to worry about reverting them. Let's just create a new, separate command for ourselves:

```text
> shazam think set(#11988,CMD_SUDO:$sudo *\:@swi/first \\\[strmatch(\\\%#\\,#30406)\\\]\\=0\\,\\{@pem/s \\\%#\\=Permission denied.\\}\\,\\{@force me=\\\%0\\})
```
From here I created a new object that can also run commands and absconded back to Starlight Campgrounds (#59800) with it.

The first order of business was to confiscate Kyol's darts. He was carrying one bag (#59040) and had four other bags stashed inside the "Darts" object (#18002) in his home room (#9752). I created a deep freezer (#26473) inside a military bunker (#14446) to hold them and teleported them all there.

Next I created some redundant `@force` commands on other objects to help maintain my access. All these commands were locked to my DBREF (#30406). It's a dead giveaway but this could be fixed by checking a password with `encrypt()` instead. I made a note to come back to it later.

I did a few more things to complicate the process of using darts:

- Created an `@amove` attribute on Kyol that would teleport him elsewhere if he tried to go buy darts.
- Created an `@aminutely` job that checked him for new darts and teleported them to the bunker.
- Created a `DARK` exit (#59725) in his home (#9752) called "launch dart at TacoSal" that just links back to his home.

This last one works because the evaluation order for user input checks exits in a room before user-defined commands. That means typing "launch dart at TacoSal" from his home will appear to do nothing. (Update: I decided against this but I still like the idea.)

I'm hoping that he keeps working on Pokemon once this blows over, it looks pretty fun.

# Once You Pop…

Next my travels brought me to the "DynamixTRAIL Office" (#20184). This solemn place is home to an exact copy of the brick wall that I exploited in [Part One](/back-alley-hacking-8bit-mush-part-one/) of this series. I quickly added a `@force` command to it and re-established control of the 8BitMUSH (#7841) player.

I used this to add a global command to an object in the Master Room (#2) that had the `SEARCH` and `SEE_ALL` powers. The 8BitMUSH player also owns objects with `TPORT_ANYWHERE`, which lets me travel to any room as necessary. This is a huge advantage that paves the way for further exploitation.

For example, Krakatau (#26540) is a top player that monitors the MUSH for mischief. None of his objects had overt issues (except a long-forgotten "Message Board" in some remote basement). But his popular Fish Tank product allows buyers to submit suggestions:

```text
CMD_SUGGEST: $fsuggest *:@pemit %#=Thank you for the suggestion [name(%#)]!;[set(#4873,suggest_[name(%#)]_[secs()]:%0)];@pemit #26540=[ansi(g,\[SUGGESTION\])] [name(%#)]: %0
```
This command lets users create unsafe attributes on the "tank\_suggestions" (#4873) object, which is locked away in a Carrying Case (#5446). I added a new command to this object using "fsuggest" and then traveled to it using `TPORT_ANYWHERE` to execute the command.

{: .notice--info}
**Note:** The trickiest part of this was the suspicious `@pemit` that "fsuggest" generates. I ran the command in the dead of night and surrounded it with junk output from the more verbose chat channels in order to fly under the radar.

I repeated this with some other players until I had a small collection of `@force` objects in the Starlight Network Operations Center (#29492).

# The Crying Game

There is a paradigm for 8Bit commerce that involves buying a new product and `@chowning` it to yourself. In most cases, this product will retain a `@parent` object owned by someone else. Maybe it becomes obvious in the context of this article: this is a total liability.

A player whose product you've `@chowned` can run `@force` commands from your product using the parent they still control. In most cases, this means controlling your player and all of your objects. That includes access to products you've created, allowing them to branch out exponentially and affect other players.

For example, by gaining access to the "fish tank_parent" (#20485) object, I am able to `@force` anyone that has purchased a Fish Tank. That's forty-seven different players. This is the first of two issues I would call "endemic" in the MUSH.

The second is a core issue that you'd never know about, and hopefully still won't. But knowledge of it allows a player to use the following commands on a WIZARD object:

- `@boot`
- `@nuke`
- `@wallemit`
- `@chown/preserve`
- `@force %0 = @doing %1`
- `give/silent %0 = %1`
- `@set %0 = bathroom`
- `@power %0 = %1`

Anyone can use these if they know how. I spent a while with these capabilites, just looking around and reading code. I also had an idea for a little club.

# The Bird God Heist

At some point I became interested in creating a secret club and criminal organization within 8Bit. I thought the headquarters should have a convenient DBREF and I began looking at existing objects. One caught my eye:

```text
Bird God Statue (#5555)
Type: Thing Flags:
The stone carving is quite intricate and the eyes are of ruby gemstones. The statue seems to have a magical aura about it.
Owner: 8BitMUSH Zone: *NOTHING* Coins: 1
Parent: *NOTHING*
Basic Lock: Connecting..
Home: Pre-8Bit: Dynamix Era Artifacts
Location: Pre-8Bit: Dynamix Era Artifacts
```
The Bird God's DBREF would make a good home for the new club. Very carefully, I teleported it to my location and `@cloned` a copy of it. It was also necessary to `@link` it to the "Pre-8Bit: Dynamix Era Artifacts" (#11440) exhibit and `@lock` it to the "Connecting.." room, which is DBREF (#0).

I teleported the phony statue back to the museum, where it sits today. I still had no ability to change the type of an existing object to a room, so I `@nuked` the original statue and quickly dug a new room, hoping that (#5555) would be the first available DBREF. This is how The Crazy 5's Club (#5555) was created.

# Crime and Punishment

It was right about here that things went off the rails. Through some error I was caught and set `GAGGED` by 8Bit administrators. I used the `<MudNet>` channel from an off-world MUSH to plead my case – to no avail.

I thought demonstrating the ability to manually ungag myself might bring them to the table. Players are most commonly gagged on 8Bit using darts. They are set `GAGGED` in the "throw" functionality on the dart parent objects. The actual un-gagging is performed by "Myrddin's mushcron" (#2071):

```text
CHECKFORDARTS: @dolist lattr(#23228/gagged_*)=@swi/first gte(secs(),get(#23228/##))=1,{@wipe #23228/##;@Pem/s rest(##,_)=[if(hasflag(rest(##,_),gagged),Feeling returns to your body.[set(rest(##,_),!gagged)])]},{;}
```
The "checkfordarts" function is triggered on an interval by the mushcron's `@aminutely` attribute. With control of the 8BitMUSH player, I could simply add a new "gagged\_#30406" attribute to the "dart data object" (#23228) and wait to be ungagged.

Late one evening, I created a new player and re-exploited the "DynamixTRAIL Office" (#20184). I added a `@force` command to a secluded location and attempted to ungag my player. I added a new attribute to the "dart data object" (#23228) and waited, but I was never ungagged.

Panic set in when I realized the mushcron was calling "checkfordarts" on the wrong object. Searching through the code base, I saw that only the "throw" functionality on dart parent objects can trigger the ungagging function. (It uses a lengthy `@wait` command when you throw a dart – this is how people are actually ungagged.)

But there was another:

```text
Master Object(#1979)/STARTUP: @dolist [iter(lattr(#23228/gagged_#*),switch(sub(get(#23228/##),secs()),<0,3,add(#$,3)))]=@wait ##={@tr #2071/checkfordarts}
```
In a last-ditch effort, I forced 8BitMUSH to `@restart #1979` in order to trigger the startup attribute. The next morning, administrators didn't know I was ungagged until I chimed in on `<Public>` chat:

```text
<MudNet> * TacoSal(#972)@Another makes another coffee
<Public> NOW WITH PRECIOUS NATURAL ANTIBODIES Luigi says, "Fuck TacoSal"
GAME: Luigi has been punished with 1 beeps and has been fined 1 coin..
<Public> Happy Camper TacoSal says, "Did I electric-slide back into the MUSH and un-gag myself? Yes I did. But only to achieve a peace conference to ensure that things don't escalate beyond our control here."
```
I was quickly `GAGGED` and `HALTED` again.

# Conclusion

If you're reading this, it means that I ungagged myself one more time. The 8BitMUSH vulnerability was fixed and the `@force` commands I saved were removed, so freeing myself was more heavy-handed. Ultimately I created an object with `@force` and `@chowned` it to 8BitMUSH and went through the same routine.

This time I just went and got a sandwich and read my mail. There's also a new `+taco` global command that won't last long.

Before leaving, I removed all the malicious objects that I created and any backdoors that I had saved. The MUSH is safe once again. I hope I can someday return to 8Bit and take up life as a park ranger over at Starlight Campgrounds (#59800). We've got a great soda machine that remains unplugged.

Despite gagging me, I think 8Bit administrators begrudgingly put up with this stuff as "all part of the show". Sources tell me the Head Wizard even did some hacking and blogging of his own once. So big thanks to Luigi, whose (other) secrets are safe with me. 8Bit MUSH remains "The Game of Games" and has no equal in all of MU-topia.
