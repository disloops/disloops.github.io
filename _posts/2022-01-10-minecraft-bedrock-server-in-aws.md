---
id: 2750
title: 'Minecraft Bedrock Server in AWS'
date: '2022-01-10T14:10:57+00:00'
author: matt
guid: '/?p=2750'
permalink: /minecraft-bedrock-server-in-aws/
categories:
    - Minecraft
tags:
    - Minecraft
---

I am interested in any kind of open-world server that I can host and allow others to join. It was just a matter of time before I got into Minecraft. This article details the steps I took to do the following:

- Create a new EC2 instance and install the Minecraft Bedrock server
- Allow remote access and configure logging through CloudWatch
- Create an alert that generates SMS messages when users connect
- Connect to the instance from the PS4 console

Come play on `<redacted>` if you just want to see the finished product. It's a vanilla Bedrock server on survival mode.

<!--more-->

# Initial Setup

Go into the AWS EC2 console and launch a new instance. I used a `t3.small` Ubuntu Server 20.04 instance with a 30 GB EBS volume. I also added a tag to the EBS volume that's configured within the AWS [Lifecycle Manager](https://aws.amazon.com/blogs/storage/automating-amazon-ebs-snapshot-and-ami-management-using-amazon-dlm/) to conduct periodic snapshots of the volume. This is a great way to perform automatic backups of EC2 instances.

I use a single "bastion" server to SSH into EC2 instances with RSA keys, so launching a new one requires me to change the SSH port and correct the security groups. Hopefully you're already familiar with this and have your own process for it.

We will need to attach an additional security group that allows inbound traffic for Minecraft. By default, Minecraft requires ports `19132` and `19133` to accept both `TCP` and `UDP` traffic. I originally had problems because I failed to allow `UDP` traffic. I believe port `19132` is used for IPv4 and `19133` is for IPv6.

Next, create an Elastic IP address and associate it with the instance. You may want to create a DNS entry for your host in Route 53 at this time. Once completed, log in to the EC2, update the operating system and reboot. You can also configure automatic updates as follows:

```bash
sudo apt-get install unattended-upgrades apt-listchanges
sudo dpkg-reconfigure -plow unattended-upgrades
```
Once installed, edit the following file:

```bash
/etc/apt/apt.conf.d/50unattended-upgrades 
```
Uncomment and change the following settings where necessary:

```text
// Do automatic removal of new unused dependencies after the upgrade
// (equivalent to apt-get autoremove)<br></br>Unattended-Upgrade::Remove-Unused-Dependencies "true";
// Automatically reboot *WITHOUT CONFIRMATION* if 
// the file /var/run/reboot-required is found after the upgrade
Unattended-Upgrade::Automatic-Reboot "true";
// Automatically reboot even if there are users currently logged in.<br></br>Unattended-Upgrade::Automatic-Reboot-WithUsers "true";
```
Once that's done, make sure the `/etc/apt/apt.conf.d/20auto-upgrades` file contains the following lines:

```text
APT::Periodic::Enable "1";
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Verbose "2";
```
Now patches and upgrades should be applied automatically.

# Installing the Minecraft Server

Visit the [Minecraft Bedrock server homepage](https://www.minecraft.net/en-us/download/server/bedrock) and right-click the Ubuntu download link to copy the path to the installation package. From the EC2 instance, download the package as follows:

```bash
wget https://minecraft.azureedge.net/bin-linux/bedrock-server-1.18.2.03.zip
```
Once downloaded, create a directory and expanded the archive:

```bash
mkdir -p /home/ubuntu/Tech/minecraft/server
unzip bedrock-server-1.18.2.03.zip -d /home/ubuntu/Tech/minecraft/server
```
Now you can configure the Minecraft server to your liking. I am not going to explain this in-depth, but my process was as follows:

- Added my Xbox Live Minecraft user as an operator in `permissions.json`
- Added my user in `whitelist.json` (despite not enabling the whitelist)
- Changed the following settings in `server.properties`: 
    - `server-name`
    - `difficulty`
    - `view-distance`
    - `tick-distance`
    - `player-idle-timeout`
    - `level-name`

# Creating a Service

Next we'll set up Minecraft as a persistent service using the `systemd` daemon. First create a unit file:

```bash
sudo vi /etc/systemd/system/minecraft.service
```
The file should have the following contents:

```ini
[Unit]
Description=Minecraft Service
After=network.target

[Service]
User=ubuntu
Type=simple
WorkingDirectory=/home/ubuntu/Tech/minecraft/server
ExecStart=/bin/bash -c "LD_LIBRARY_PATH=. ./bedrock_server 2>&1 | grep --line-buffered -v AutoCompaction | tee -a ./custom_log.txt"
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
```
Looking at the `ExecStart` line, you'll see that we're redirecting output from the running process to a custom log file. That's because Minecraft does not keep a running log file by default, but rather writes the output to a file called `Dedicated_Server.txt` once the Minecraft server is stopped. Creating a live log file will allow CloudWatch to send us custom alerts when someone logs in (more on this later).

Next we'll run the following three commands to enable and start the Minecraft service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable /etc/systemd/system/minecraft.service
sudo systemctl start minecraft
```
This should now run on startup.

# Setting up Logging

AWS has a newer agent for collecting logs called the Unified CloudWatch Agent. Instructions for installing it can be found here:

<https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Install-CloudWatch-Agent.html>

While running the configuration wizard, I chose not to monitor any system metrics. Enter the path to the custom Minecraft server log when asked what logs to monitor:

```bash
/home/ubuntu/Tech/minecraft/server/custom_log.txt
```
The resulting configuration file will be stored here:

```bash
/opt/aws/amazon-cloudwatch-agent/bin/config.json
```
Remember to associate the correct IAM Policy with the EC2 instance in order for the CloudWatch agent to operate. At the time of writing this, it requires the `CloudWatchAgentServerPolicy` policy. Lastly, start the agent with the following command:

```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/bin/config.json
```
# Setting up Alerting

Now we're going to use the CloudWatch log data to generate a text message any time someone logs in. First, go to AWS SNS and create a new topic that sends a text message when invoked. Copy the ARN of this topic.

Next, go to Lambda and create a new Python 3.8 function with the following contents:

```python
# Filter pattern:
# ?"] Player connected: "

# Taken from:
# https://awsfeed.com/whats-new/management-tools/how-to-get-notified-on-specific-lambda-function-error-patterns-using-cloudwatch

import base64
import boto3
import gzip
import json
import logging
import os
from botocore.exceptions import ClientError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def log_payload(event):

    logger.setLevel(logging.DEBUG)
    compressed_payload = base64.b64decode(event['awslogs']['data'])
    uncompressed_payload = gzip.decompress(compressed_payload)
    payload = json.loads(uncompressed_payload)

    log_msg = payload['logEvents'][0]['message']
    log_stream = payload['logStream']

    return log_msg, log_stream

def publish_message(log_msg):

    # Get the SNS Topic ARN in the Lambda environment variables
    sns_arn = os.environ['SNS_ARN']

    snsclient = boto3.client('sns')

    try:
        message = 'Minecraft: ' + log_msg.rsplit(']',1)[1]
        snsclient.publish( TargetArn=sns_arn, Subject=f'Minecraft Login Alert - AWS Lambda', Message=message )
    except ClientError as e:
    	logger.error("An error occured: %s" % e)

def handler(event, context):
    log_msg, log_stream = log_payload(event)

    if log_stream == 'custom_log.txt':
        publish_message(log_msg)
    else:
        logger.debug(f'Exiting due to log_stream: {log_stream}')
```
During creation, create a new "Execution Role" and attach a policy that will allow it to publish to the SNS topic you just created. Here is one such policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": "sns:Publish",
            "Resource": "<SNS ARN HERE>"
        }
    ]
}
```
It should also have the AWS-managed policy called `AWSLambdaBasicExecutionRole` attached.

Save this Lambda function and click "Configuration" then "Environment variables". Add a new variable with a key of `SNS_ARN` and assign the ARN of your SNS topic as the value.

Now navigate back to the CloudWatch log group for Minecraft logs in the AWS console. It should show up if you've started the Minecraft server and the CloudWatch agent correctly. Click on the "Subscription filters" tab and create a new Lambda subscription filter for this log group. Associate it with the Lambda function we just created. The "Subscription filter pattern" field should read as follows:

```text
?"] Player connected: "
```
Once saved, this filter should now watch the log file for logins and use the Lambda function to send you a text message when someone connects.

# Connecting from PS4

The only thing left to do is play Minecraft. Sadly, connecting to this server from a console requires one more configuration change.

Minecraft does not allow console players to connect to remote servers except for a number of "featured" servers that are explicitly listed. However, by modifying our local DNS settings, we can redirect Minecraft to our own server when it attempts to connect to one of the featured servers.

My own DNS provider makes it easy to set up custom DNS entries. Most home routers also have an option for static DNS entries. We just need to redirect requests for the featured servers to the hostname or IP of our own server. At the time of writing this, my DNS entries are as follows:

- `*.play.inpvp.net` → `<server address>`
- `*.mco.cubecraft.net` → `<server address>`
- `*.geo.hivebedrock.network` → `<server address>`
- `*.play.galaxite.net` → `<server address>`
- `*.mineplex.com` → `<server address>`
- `*.lbsg.net` → `<server address>`
- `*.pixelparadise.gg` → `<server address>`

Now connecting to any featured server will instead connect you to my own server.

I hope you do connect to `<redacted>` and check out whatever I'm building – all are welcome. Leave me a note if these steps were useful to you or you have any questions and I'll help if I can!

{: .notice--info}
**Note:** I eventually took down my public server since it got no players. I'll re-list the address if it ever goes public again.
