---
id: 2181
title: 'PSADify &#8211; Custom PSAD Output Tool'
date: '2018-10-28T23:01:53+00:00'
author: matt
guid: '/?p=2181'
permalink: /psadify-custom-psad-output-tool/
categories:
    - PSAD
    - 'Raspberry Pi'
tags:
    - PSAD
    - 'Raspberry Pi'
---

In a [previous article](/psad-on-raspberry-pi) I described how to install and run the Port Scan Attack Detector (PSAD) on a Raspberry Pi. It is the closest thing to a full IDS that works on the Raspberry Pi and it's extremely easy to set up.

None of the existing visualization tools for PSAD data really met my needs, so I created a custom Python script that generates an HTML page from the live PSAD data.

The PSADify script is available here: [PSADify on Github](https://github.com/disloops/psadify)  
You can see the actual data here: [Live PSAD Attack Data](http://psad.disloops.com)

On my own host running PSAD, there is a cronjob that runs this script every five minutes and uploads the output to an AWS S3 bucket. If the local configuration or the settings on the AWS side would be useful to anyone, let me know!

<!--more-->

# Update with Instructions

I wanted to add the directions for continually generating and publishing the PSAD output. First you'll want to create a static S3 site behind CloudFront in AWS to serve the page from. There are directions for doing that here:

<https://aws.amazon.com/premiumsupport/knowledge-center/cloudfront-serve-static-website/>

I think it is smart to use the configuration that includes an Origin Access Identity (OAI). It is also a best practice to name the S3 bucket using the URL that will be used to access it.

Once that's been set up, you'll need to create an IAM User that can be used to continually upload the PSAD output to S3. It is best to create a single IAM User, add it to a unique IAM Group, and attach an Inline Policy to that group as follows:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:PutObject*",
      "Resource": "arn:aws:s3:::your_bucket_name/status.html"
    }
  ]
}
```
...replacing `your_bucket_name` with the name of your bucket. Also ensure that `status.html` is set to be the index object in the S3 settings. Now you can create credentials for this IAM User that can be used on the host running PSAD.

Back on the PSAD host, run the following commands:

```bash
sudo apt-get install python-pip
sudo pip install awscli --upgrade
aws configure
sudo aws configure
```
I'm not sure if it's necessary to configure the AWS CLI client with `sudo` or not. I assume that using `sudo` sets it up for the root user. I had no problems just running it twice, once with `sudo` and once without.

Next create a bash script called something like `create_psad_status.sh` with `744` permissions and the following contents:

```bash
#!/bin/bash

python /path/to/psadify.py -o /any/path/status.html
chown your_user:your_user /path/to/status.html
aws s3api put-object --bucket your_bucket_name --key status.html --body /path/to/status.html --acl private --content-type text/html --cache-control no-cache
```
Obviously you'll need to change the names and paths above but this script will generate PSAD output and transfer it to your AWS S3 bucket correctly. Next, run `sudo crontab -e` to update the system cronjobs as follows:

```bash
PATH=/bin:/usr/bin:/usr/local/bin:/usr/sbin:/usr/local/bin/aws
*/5 * * * * /path/to/create_psad_status.sh 1> /dev/null 2>> /path/to/cron_errors.txt
0 0 * * * { fwsnort --update-rules && fwsnort && /var/lib/fwsnort/fwsnort.sh; } 1> /path/to/cron_info.txt
10 0 * * * psad -H
```
Again, update the names and paths according to your configuration. This builds on the instructions in the [initial setup](/psad-on-raspberry-pi/) article and ensures that the PSAD output is generated and pushed to AWS every five minutes.

This completes the setup that I'm using to have the PSADify output live at [psad.disloops.com](http://psad.disloops.com) - hopefully that is helpful!
