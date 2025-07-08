---
id: 2077
title: 'pfSense State Table Maxed Out by Nmap'
date: '2018-05-12T03:40:13+00:00'
author: matt
guid: '/?p=2077'
permalink: /pfsense-state-table-maxed-out-by-nmap/
categories:
    - Nmap
    - pfSense
tags:
    - Nmap
    - pfSense
---

I recently needed to run Nmap against a ton of hosts at once but my internet connection died as soon as I launched all the concurrent threads. That had never happened before – turns out that I maxed out the “state table” on my [SG-2440](https://www.netgate.com/products/sg-2440.html) pfSense router.

The default settings allow it to hold 405,000 max connections in the firewall state table. Every million states take about a gig of RAM and the router has 4 gig total, so the default is to let the state table take up 10% of the total memory capacity at most. Apparently running around 50+ Nmap threads against all ports per host maxes that out immediately.

I had to SSH into the router and flush the state table (“pfctl -F states”) to get my connection working again. Then I bumped the max states up to 3M and I scaled back the number of Nmap threads I’m running. Now it works but I thought that was a funny problem to come across; I didn’t foresee my fancy router being the bottleneck.
