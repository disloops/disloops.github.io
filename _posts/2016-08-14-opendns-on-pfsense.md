---
id: 1020
title: 'OpenDNS on pfSense'
date: '2016-08-14T21:17:24+00:00'
author: matt
guid: '/?p=1020'
permalink: /opendns-on-pfsense/
categories:
    - OpenDNS
    - pfSense
tags:
    - OpenDNS
    - pfSense
---

I recently saw an article by [@dnlongen](https://twitter.com/dnlongen) on potential uses for OpenDNS:

- [Detecting Malware Through DNS Queries](http://www.securityforrealpeople.com/2015/01/detecting-malware-through-dns-queries.html)

It made me want to take advantage of OpenDNS on my home network. OpenDNS allows users to configure DNS servers that block requests for many types of content, including known malicious domains.

<!--more-->

Because OpenDNS is owned by Cisco, you may want to consider if it offers the level of privacy you need. It's safe to assume that they log every request and provide the information to others. But does a real [internet super-villain](https://lists.torproject.org/pipermail/tor-dev/2014-November/007731.html) rely on their DNS server? At least we know who owns OpenDNS – who owns your VPN?

# Setting It Up

{: .notice--info}
**EDIT:** Originally I used [this](https://forum.pfsense.org/index.php?topic=112288.0) blog post to set up OpenDNS on pfSense. The author recommends using the DNS Forwarder and disabling the DNS Resolver. However, it's possible to use either one and I've updated my instructions below to use the DNS Resolver. This comes as a result of a [discussion](https://forum.pfsense.org/index.php?topic=120431.0) in the pfSense forums. Here are the steps I took:

First create an account at [OpenDNS](https://www.opendns.com/) and set it up. You have to identify your network and create a profile before the DNS servers will respond.

After that, go to System → General Setup → DNS Server Settings in the pfSense console. Add the DNS servers there:

```text
208.67.222.222
208.67.220.220
2620:0:ccc::2
2620:0:ccd::2
```

{: .notice--info}
**Note:** You may not want to use the IPv6 DNS servers depending on your own settings. They appear to work for me.

Make sure "DNS Server Override" is unchecked and "Disable DNS Forwarder" is checked. Then go to Services → DNS Forwarder and make sure the "Enable" box is unchecked, then click "Save".

Then in Services → DNS Resolver:

- Uncheck the "DNSSEC" box (OpenDNS does not support DNSSEC)
- Select "All" for the "Network Interfaces" and "Outgoing Network Interfaces" options
- Check the "DNS Query Forwarding" box
- Make sure the "Enable" box is checked and click "Save"

# Dynamic DNS

After that, go to Services → Dynamic DNS and click "Add". Set the options as follows:

- Service Type: OpenDNS
- Interface to Monitor: WAN
- Hostname: opendns.com

Then enter your OpenDNS username and password in the correct fields and click "Save". That should complete the setup! If the "Cached IP" turns green you know it's working correctly.

# Blocking Requests to Other DNS Servers

When I updated this guide to use the DNS Resolver, I followed the instructions [here](https://doc.pfsense.org/index.php/Redirecting_all_DNS_Requests_to_pfSense) to redirect all DNS requests to pfSense. This prevents any host on the network from manually using another DNS server. An easy way to test this is to change your OpenDNS "Web Content Filtering" settings to block a certain category of sites such as "Sports". Then you can attempt to resolve the address of some such site using a third-party DNS server:

```bash
nslookup espn.com 8.8.8.8
```
This command tries to look up the IP address for the ESPN domain using one of Google's DNS servers. If the firewall rule is working correctly, the request will be redirected to the OpenDNS servers via the firewall. The response should be the IP address for one of the OpenDNS blocking pages:

```text
Non-authoritative answer:
Name: espn.com
Address: 146.112.61.106
```

{: .notice--warning}
**EDIT:** An unforeseen consequence of this is that port 53 appears to be open on any remote host! So don't let this confuse you if you're running Nmap against some server and it says that port 53 is open. Your traffic is being redirected to OpenDNS and a valid response comes back no matter what host you're trying to send DNS traffic to.
