---
id: 802
title: 'Apache Logs in AWS'
date: '2015-12-31T23:44:18+00:00'
author: matt
guid: '/?p=802'
permalink: /apache-logs-in-aws/
categories:
    - AWS
tags:
    - Apache
    - AWS
---

I recently started using CloudWatch, Amazon's host monitoring service. It has a number of features but I just wanted a way to view all my logs in one place. Configuring hosts to use CloudWatch was easy, and I described the process in an [article](/hosting-anonymous-ftp/) on setting up Anonymous FTP.

<!--more-->

# Timeout Errors

With monitoring in place, I noticed a lot of 408 errors coming from the Apache logs on my WordPress instance. The errors appeared in:

```text
/var/log/httpd/access_log
/var/log/httpd/ssl_access_log
```
This was caused by the way an Elastic Load Balancer (ELB) was conducting its health check. I resurrected a [thread](https://forums.aws.amazon.com/message.jspa?messageID=687765) in the AWS Forums to talk about it. The solution was to increase Apache's timeout values using the `mod_reqtimeout` module. I created the file `/etc/httpd/conf.d/mod_reqtimeout.conf` and added the following lines:

```apache
<IfModule reqtimeout_module>
    RequestReadTimeout header=62,MinRate=500 body=62,MinRate=500
</IfModule>
```
Then I saved it and restarted Apache. Those header and body values correspond to the interval at which my ELB conducts its health check, which is set at 60 seconds. A slightly larger timeout value here prevents the errors from occurring.

# Correcting Logs Entries

Because all incoming requests pass through the ELB, no external IP addresses are logged by default. The `LogFormat` directive must be modified to capture the original IP address using a special header that the ELB creates.

Edit the `/etc/httpd/conf/httpd.conf` file and find where `LogFormat` is defined. Comment out the defaults and add the following lines:

```apache
LogFormat "%{X-Forwarded-For}i %h %l %u %t \"%r\" %>s %b"
LogFormat "%{X-Forwarded-For}i %h %l %u %t \"%r\" %>s %b" common
LogFormat "%{X-Forwarded-For}i %h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\"" combined
```
Also find and replace the `ErrorLogFormat` directive with the following (just add this if no such directive exists):

```apache
ErrorLogFormat "[%{u}t] [%-m:%l] [pid %P:tid %T] %7F: %E: [client\ %a] [%{X-Forwarded-For}i] %M% ,\ referer\ %{Referer}i"
```
The `X-Forwarded-For` header field should contain the original IP address for any incoming request. I also wanted to ignore the health check and any request coming from the host itself. The `SetEnvIf` directive allows you to filter out requests based on their characteristics. I added these lines right above the new `LogFormat` directives:

```apache
<IfModule mod_setenvif>
    SetEnvIf Request_URI "^/wp-content/health_check\.txt$" dontlog
    SetEnvIf Remote_Addr "127\.0\.0\.1" dontlog
    SetEnvIf Remote_Addr "::1" dontlog
</IfModule>
```
This sets the "dontlog" variable if the request meets any of the above conditions. The last step is to attach it to the `CustomLog` directive. Comment out the existing `CustomLog` lines and add the following:

```apache
CustomLog "logs/access_log" combined env=!dontlog
```
The `/etc/httpd/conf.d/ssl.conf` file also need to be updated. Find the `TransferLog` and `CustomLog` directives and comment them out, then add the following:

```apache
CustomLog logs/ssl_access_log combined env=!dontlog
CustomLog logs/ssl_request_log "%t %{X-Forwarded-For}i %h %{SSL_PROTOCOL}x %{SSL_CIPHER}x \"%r\" %b" env=!dontlog
```
Also find and replace the `ErrorLogFormat` directive with the following (just add this if no such directive exists):

```apache
ErrorLogFormat "[%{u}t] [%-m:%l] [pid %P:tid %T] %7F: %E: [client\ %a] [%{X-Forwarded-For}i] %M% ,\ referer\ %{Referer}i"
```

{: .notice--info}
**Note:** `TransferLog` differs from `CustomLog` in that it does not allow custom log formats or conditional logging.

# Conclusion

Lastly I noticed an error in `/var/log/ssl_error_log` that said "server certificate does NOT include an ID which matches the server name". I just needed to update `/etc/httpd/conf/httpd.conf` with the following line:

```apache
ServerName disloops.com
```
Hopefully that helps anyone tuning their Apache logs in AWS!
