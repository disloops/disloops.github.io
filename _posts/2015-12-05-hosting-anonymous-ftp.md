---
id: 560
title: 'Hosting Anonymous FTP'
date: '2015-12-05T21:31:20+00:00'
author: matt
guid: '/?p=560'
permalink: /hosting-anonymous-ftp/
categories:
    - AWS
    - FTP
    - Ubuntu
tags:
    - AWS
    - CloudWatch
    - FTP
    - Ubuntu
---

I wanted to create an FTP server to share some of the media that I've saved over the years. I like the old protocols and services and I plan to stand up more of them. Because each service has its own inherent security issues, the deployment process becomes an exercise in mitigating the risks. Check it out at [ftp.disloops.com](ftp://ftp.disloops.com)

<!--more-->

I used an Ubuntu Server 14.04 LTS instance for the FTP server and gave it an AWS Elastic IP (EIP). An entry must be added to the `/etc/hosts` file when deploying Ubuntu instances in AWS:

```bash
127.0.0.1  (hostname here)
```
Without specifying the hostname, using `sudo` creates an error message. Next I ran updates and changed SSH to a non-default port, then installed VSFTPD and backed up the config file:

```bash
sudo apt-get update
sudo apt-get dist-upgrade
sudo vi /etc/ssh/sshd_config
sudo apt-get install vsftpd
sudo cp /etc/vsftpd.conf /etc/vsftpd.conf.old
```
# VSFTPD Configuration

I created an updated config file from the manual page: [vsftpd.conf](/assets/documents/2015/12/vsftpd.conf)

That file has some specific settings enabled which you will have to customize for you own environment. Note that any whitespace between an option and its value will result in an error. Some of the more significant settings are described below.

```text
local_enable=no
ftp_username=anon_ftp_user
nopriv_user=nopriv_ftp_user
```
In order to avoid exposing local accounts and their home directories, only anonymous connections are allowed. Two users are designated here – one that's used for all active connections, and another that's used internally for some unprivileged functions.

```text
anon_upload_enable=yes
write_enable=yes
file_open_mode=0600
```
Anonymous users can upload files within the `anon_ftp_user` user's home directory. Files will be created with `600` permissions, meaning that only the `root` user can access them again. This prevents FTP users from creating executables or using the server to share their own files.

{: .notice--info}
**Note:** The `anon_umask` value is applied on top of these permissions, which is `077` by default.

```text
pasv_max_port=32300
pasv_min_port=32030
```
This defines a range of ports to be used for passive connections. There should be at least as many available ports as `max_clients` specifies.

```text
pasv_addr_resolve=yes
pasv_address=ftp.disloops.com
```
This prevents the server from providing its internal IP address in response to `PASV` requests.

{: .notice--warning}
**Note:** This should work for you, but it didn't for me. A DNS lookup of my hostname within AWS still returns the internal IP address of the EC2 instance. I had to leave `pasv_addr_resolve` set to `no` and set `pasv_address` to the Elastic IP (EIP) that I associated with the server.

```text
allow_anon_ssl=yes
ssl_enable=yes
ssl_tlsv1=no
rsa_cert_file=/etc/ssl/certs/bundle.crt
rsa_private_key_file=/etc/ssl/private/disloops_com.key
ssl_ciphers=HIGH
```
This enables "Explicit TLS" connections.

{: .notice--info}
**Note:** TLS has since been removed from the FTP server because I don't want to manage my own certificates now that the main `disloops.com` domain is hosted on Github Pages.

# Server Configuration

Next we have to set up the users and directories:

```bash
sudo useradd -M -r -s /bin/false -d /srv/ftp/pub anon_ftp_user
sudo useradd -M -r -s /bin/false -d /dev/null nopriv_ftp_user
```
This creates the two users defined in the config file above. The `-d` option defines a home directory but `-M` ensures that it is not created automatically. The `-r` option designates an account as a "system user" which changes numerical range that the user ID (UID) and group ID (GID) are taken from. The `-s` option defines the user's shell. Because no one should log in using these accounts, we use `/bin/false` as the shell, which is just a binary that returns false and exits.

```bash
sudo mkdir -p /srv/ftp/pub/downloads
```
This recursively creates the directory structure we need. Anonymous connections will start in the `/srv/ftp/pub` directory, since it is the home directory for the `anon_ftp_user` account.

```bash
sudo mkdir /srv/ftp/pub/uploads
sudo chown -R ftp:ftp /srv/ftp
sudo chown anon_ftp_user:anon_ftp_user /srv/ftp/pub/uploads
```
This makes sure that only the `/srv/ftp/pub/uploads` directory can be written to. The `/srv/ftp/pub/downloads` directory is used to host all other files.

We still have to upload the certificates that are required for TLS connections. Create the CA bundle on a local machine, then move it to the server along with the private key:

```bash
cat STAR_disloops_com.crt COMODORSADomainValidationSecureServerCA.crt COMODORSAAddTrustCA.crt AddTrustExternalCARoot.crt >> bundle.crt
scp -P <ssh_port> -i <ssh_key> bundle.crt ubuntu@<ip_addr>:/home/ubuntu/temp/
scp -P <ssh_port> -i <ssh_key> disloops_com.key ubuntu@<ip_addr>:/home/ubuntu/temp/
```
Log back into the server and give the certificate files the correct location and permissions:

```bash
sudo mv /home/ubuntu/temp/disloops_com.key /etc/ssl/private/
sudo mv /home/ubuntu/temp/bundle.crt /etc/ssl/certs/
sudo chown root:root /etc/ssl/certs/bundle.crt
sudo chmod 644 /etc/ssl/certs/bundle.crt
sudo chown root:root /etc/ssl/private/disloops_com.key
sudo chmod 600 /etc/ssl/private/disloops_com.key
```

{: .notice--info}
**Note:** TLS has since been removed from the FTP server because I don't want to manage my own certificates now that the main `disloops.com` domain is hosted on Github Pages.

# Quotas

{: .notice--info}
**Note:** I used the following links for help with this section: [\[1\]](https://mohannetworking.wordpress.com/2012/09/29/how-to-configure-disk-quotas-on-ubuntu/) [\[2\]](https://www.howtoforge.com/tutorial/linux-quota-ubuntu-debian/) [\[3\]](https://www.virtualmin.com/node/23522)

The last step is to limit the amount of data that the `anon_ftp_user` can upload, in order to prevent the hard drive from being filled by malicious uploads. This can be accomplished with the `quota` package. First add the `usrquota` option entry to the `/etc/fstab` file, which controls the partitions. Mine now looks like this:

```text
LABEL=cloudimg-rootfs / ext4 defaults,usrquota,discard 0 0
```
Remount the partition and install the `quota` package, then run `quotacheck`:

```bash
sudo shutdown -r now
sudo apt-get install quota
sudo quotacheck -vucfma
```
With the above options, the `quotacheck` program will create a new file called `quota.user` in the root of the filesystem to track disk usage. Use the `setquota` command to actually limit the amount of data that the `anon_ftp_user` can create:

```bash
sudo setquota -u anon_ftp_user 5000000 5000000 0 0 -a /
```
This sets a 5G limit on how much data the anonymous FTP user can upload.

Now quotas can be activated with the `quotaon` command. However, this [creates an error](http://askubuntu.com/questions/109585/quota-format-not-supported-in-kernel/165298) by default in AWS. It turns out that `quota` support was removed from virtual kernels in recent version of Ubuntu. The following steps were required to add support:

```bash
sudo apt-get install linux-image-extra-virtual
sudo depmod -a
sudo modprobe quota_v1
sudo modprobe quota_v2
```
Then add the following lines to the `/etc/modules` file:

```text
quota_v1
quota_v2
```
Now the `quotaon` command should work. You can use `repquota` to periodically check the disk usage statistics:

```bash
sudo quotaon -av
sudo repquota /
```

{: .notice--warning}
**Note:** Re-running `quotacheck` with the options listed above will overwrite any existing quota file, remove the defined quotas, and reset the disk usage statistics.

# CloudWatch

I wanted to monitor the logs on my EC2 instances, especially the public FTP server. AWS offers a monitoring service called CloudWatch for virtual resources. The following steps were required to send logs to CloudWatch from the Ubuntu instance.

{: .notice--info}
**Note:** This requires that your EC2 instance be launched with an IAM role that enables CloudWatch monitoring. Use the [CloudWatch guide](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/EC2NewInstanceCWL.html) on log monitoring to set this up.

Download the installation script and run it:

```bash
cd /home/ubuntu/temp
wget https://s3.amazonaws.com/aws-cloudwatch/downloads/latest/awslogs-agent-setup.py
sudo python ./awslogs-agent-setup.py --region us-east-1
```
Use the default values during setup and feel free to add `/var/log/syslog` as instructed. If you launched the EC2 instance with the correct IAM role, it will not be necessary to enter the "Access Key ID" or the "Secret Access Key" (leave them blank).

The script will create a file at `/var/awslogs/etc/awslogs.conf` that controls what log information gets set to CloudWatch. You will have already added `/var/log/syslog` during the setup. Manually edit this file to add coverage for any other logs you want to monitor, including the VSFTPD log file:

```ini
[/var/log/vsftpd.log]
datetime_format = %b %d %H:%M:%S
file = /var/log/vsftpd.log
buffer_duration = 5000
log_stream_name = {instance_id}
initial_position = start_of_file
log_group_name = /var/log/vsftpd.log
```

{: .notice--info}
**Note:** On Amazon Linux instances, this file is located at: `/etc/awslogs/awslogs.conf`

# Conclusion

The above steps should create a relatively safe FTP service that enables both uploads and anonymous connections. Visit mine at [ftp.disloops.com](ftp://ftp.disloops.com) and let me know what you think.
