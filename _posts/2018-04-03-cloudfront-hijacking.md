---
id: 1858
title: 'CloudFront Hijacking'
date: '2018-04-03T04:00:14+00:00'
author: matt
guid: '/?p=1858'
permalink: /cloudfront-hijacking/
categories:
    - AWS
    - CloudFront
tags:
    - AWS
    - CloudFront
---

I recently spent some time exploring the issue of CloudFront domain hijacking. This is not a new issue but I think it has gone mostly unnoticed for a few reasons:

- CloudFront's default behavior is not intuitive. Some standard DNS configurations can mislead users into thinking that their vulnerable domains are configured correctly.
- In the past year, [misconfigured S3 buckets](https://www.google.com/search?q=AWS+S3+hacked) have been everyone's priority. Other AWS security issues have played second banana.
- Because a misconfigured domain presents an obvious error message, one would assume there is no "low-hanging fruit" for attackers.

There are a couple [reports on HackerOne](https://hackerone.com/reports/145224) but I'd say that this issue is still relatively unexplored. So I devoted some time to finding the right targets and scripting the testing process. The results are below.

<!--more-->

# Background

CloudFront is a Content Delivery Network (CDN) provided by Amazon Web Services (AWS). CloudFront users create "distributions" that serve content from specific sources (an S3 bucket, for example).

Each CloudFront distribution has a unique endpoint for users to point their DNS records to (ex. d111111abcdef8.cloudfront.net). All of the domains using a specific distribution need to be listed in the "Alternate Domain Names (CNAMEs)" field in the options for that distribution.

When a CloudFront endpoint receives a request, it does NOT automatically serve content from the corresponding distribution. Instead, CloudFront uses the `HOST` header of the request to determine which distribution to use. This means two things:

- If the `HOST` header does not match a domain in the "Alternate Domain Names (CNAMEs)" field of the intended distribution, the request will fail.
- Any other CloudFront distribution that contains the specific domain in the `HOST` header will receive the request and respond to it normally.

This is what allows the domains to be hijacked. There are many cases where a CloudFront user fails to list all the necessary domains that might be received in the `HOST` header.

# Example

- The domain `test.disloops.com` is a CNAME record that points to `disloops.com`.
- The `disloops.com` domain is set up to use a CloudFront distribution.
- Because `test.disloops.com` was not added to the "Alternate Domain Names (CNAMEs)" field for the distribution, requests to `test.disloops.com` will fail.
- Another user can create a CloudFront distribution and add `test.disloops.com` to the "Alternate Domain Names (CNAMEs)" field to hijack the domain.

This means that the unique endpoint that CloudFront binds to a single distribution is effectively meaningless. A request to one specific CloudFront subdomain is not limited to the distribution it is associated with.

# Research

Without going into a ton of detail, I wanted to script the process of finding vulnerable domains. I created a Python script called [CloudFrunt](https://github.com/disloops/cloudfrunt) that:

- Accepts a list of domains
- Runs the domains through [dnsrecon](https://github.com/darkoperator/dnsrecon) to find more domains
- Selects the domains that actually point to [CloudFront IP space](http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/LocationsOfEdgeServers.html)
- Tests them for configuration issues
- (Optionally) adds them to a new CloudFront distribution

The script itself is here: <https://github.com/disloops/cloudfrunt>

```text
$ python cloudfrunt.py -l list.txt

 CloudFrunt v1.0.3

 [+] Enumerating DNS entries for google.com
 [-] No issues found for google.com

 [+] Enumerating DNS entries for disloops.com
 [+] Found CloudFront domain --> cdn.disloops.com
 [+] Found CloudFront domain --> test.disloops.com
 [-] Potentially misconfigured CloudFront domains:
 [#] --> test.disloops.com
```
The next step was to create a list of promising targets. Ultimately, the best solution was just to scrape [Robtex](https://www.robtex.com/) for a premium report on every IP in the CloudFront address space.

That yielded 90,500 unique domains attached to about a million IP addresses. So I created an EC2 instance to test from, split up the list and ran CloudFrunt against it in parallel.

# Results

After a few days of allowing the script to run, I found that I had added almost 2,000 new domains to CloudFront distributions of my own. Each of them were automatically configured to point to the following page, which has undergone some revisions: [CloudFront Hijacking Demo](/cloudfront_hijacking_demo/)

It was immediately clear that this project had a bigger impact than anticipated. Among the affected domains were some owned by:

- Two distinct US Federal "dot gov" organizations
- Amazon
- Bloomberg Businessweek
- Cisco
- Commonwealth Bank of Australia
- Dow Jones
- Harvard University
- The League of Conservation Voters
- Red Cross
- Reuters
- University of Maryland
- ...and others

{: .notice--warning}
**Update 4/23/18:** We're up to nine subdomains on five different US "dot gov" sites that have been parked and reported.

The surprising effectiveness of this exercise meant that the reporting timeline was about to be expedited. I was in touch with an engineer from the AWS CloudFront team to discuss the findings about one week after the first tests began.

- Dec 29, 2017 – Initial investigation
- Jan 2, 2018 – Automated testing begins with increased capacity
- Jan 5, 2018 – Large number of domains have been found and squatted 
    - Initial contact with AWS CloudFront engineers to discuss findings
    - Full incident report is created and submitted to AWS Security team
    - Federal domains are reported separately to US-CERT at [NCCIC](https://www.us-cert.gov/nccic)
    - AWS engineers are given access to the [CloudFrunt](https://github.com/disloops/cloudfrunt) scanning tool
- Jan 8, 2018 – Control of the vulnerable domains is transitioned to the AWS CloudFront team

At this point the AWS CloudFront team had created their own distribution to host the vulnerable domains, which points at a [landing page](https://www.google.com/search?q="CloudFront+has+blocked+this+domain+name+from+being+used"&filter=0) of their own creation. As of writing this, many of the domains are still parked there.

A number of discussions with both the AWS Security team and the CloudFront engineers have followed. However, while they accept that the nuances of CloudFront's routing mechanism leave room for improvement, at no time have they decided to treat this issue as a vulnerability.

So after coordination with the appropriate parties at Amazon, this article and the [CloudFrunt](https://github.com/disloops/cloudfrunt) testing tool itself are being released.

# Conclusion

These issues are part of the growing pains of cloud adoption. For CloudFront in particular, most AWS customers with a single distribution can protect themselves by adding a wildcard domain (such as `*.disloops.com`) to the "Alternate Domain Names (CNAMEs)" field.

After this year's S3 bucket exposures, Amazon rolled out changes to the console and began alerting users with open buckets. They provided a similar service to users that uploaded their [API keys to Github](https://www.infoworld.com/article/3155904/security/git-hound-truffle-hog-root-out-github-leaks.html) once the issue became pervasive. Depending on the impact of CloudFront domain hijacking, certain safeguards could appear in the near future.

{: .notice--info}
**Update 4/25/18:** As predicted, AWS has published an article describing some new security measures that have been rolled out to combat this issue: [Enhanced Domain Protections for Amazon CloudFront Requests](https://aws.amazon.com/blogs/security/enhanced-domain-protections-for-amazon-cloudfront-requests/)

Please use [CloudFrunt](https://github.com/disloops/cloudfrunt) to test your own organization for misconfigurations. It is simple to generate a list of domains in every Route 53 hosted zone to test against. Let me know if you have any issues or improvements to suggest!
