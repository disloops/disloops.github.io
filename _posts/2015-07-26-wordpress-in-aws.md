---
id: 175
title: 'WordPress in AWS'
date: '2015-07-26T19:48:46+00:00'
author: matt
guid: '/?p=175'
permalink: /wordpress-in-aws/
categories:
    - AWS
    - WordPress
tags:
    - AWS
    - WordPress
---

This site is being hosted in Amazon Web Services (AWS). It relies on a number of cloud services, including RDS, S3, and CloudFront. The following are some of the steps that were required to set it up.

<!--more-->

# Provisioning a Server

Create an [AWS](http://aws.amazon.com/) account if you don't already have one and complete the steps listed in the Identity and Access Management (IAM) service. It's especially important to set up multi-factor authentication (MFA) for your account. You should have an IAM user in the "Administrators" group when you're done.

Next go to the EC2 service, Amazon's storefront for virtual machines. Before launching a new instance, we'll create a key pair than can be used to access it securely. Use the following command locally to create a key pair:

```bash
ssh-keygen -t rsa -b 4096
```
Upload the public key by clicking "Key Pairs" and then "Import Key Pair" from the EC2 dashboard. Now we can launch an instance.

Go back to the EC2 dashboard and click "Create Instance". Select an Amazon Linux image with an SSD volume. Just select free-tier architecture for now, it can be scaled up later. Change the volume size from 8 to 30 gig, the largest size allowed in the free tier. On security groups page, allow only SSH from your specific IP address for the time being. Amazon instances also have a "default" security group that allows your AWS instances to communicate with each other by default.

You'll want to create an Elastic IP (EIP), which is just a static IP address that can be used to access your instance. Use this to log in for the first time. The default user for Amazon Linux is: `ec2-user`

# Server Configuration

WordPress relies on a LAMP stack in this environment – Linux, Apache, MySQL, and PHP. We'll install the necessary components below. You can also read [Amazon's guide](http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/install-LAMP.html) for creating a LAMP stack. {: .notice--info}
**Note:** Because we're using Amazon's Relational Database Service (RDS), we do not need to install `mysql55-server` as the guide recommends.

Log into your server and update it:

```bash
sudo yum update
```
Install the packages necessary to run WordPress:

```bash
sudo yum install httpd24 php56 php56-mysqlnd
```
Start Apache and use the `chkconfig` command to make sure Apache will start with each reboot:

```bash
sudo service httpd start
sudo chkconfig httpd on
```
Apache serves files out of its document root at `/var/www/html`. We need to allow `ec2-user` to manipulate files in this directory. Create the `www` group and add `ec2-user` to it:

```bash
sudo groupadd www
sudo usermod -a -G www ec2-user
```
Now give group ownership of the web directory and its contents to the `www` group.

```bash
sudo chgrp -R www /var/www
```
Some WordPress features also require write access to the Apache document root. The web server runs as the `apache` user, so we need to add that user to the `www` group. We'll also make the `apache` user the explicit owner of the directory:

```bash
sudo usermod -a -G www apache
sudo chown -R apache /var/www
```
Change the directory permissions and set the group ID on any future subdirectories:

```bash
sudo chmod 2775 /var/www
find /var/www -type d -exec sudo chmod 2775 {} +
```
Add group write permissions to files in the web directory and its subdirectories:

```bash
find /var/www -type f -exec sudo chmod 0664 {} +
```
Now `ec2_user` and `apache` can edit files in the Apache document root. Log out and in again to enact the new group permissions. You can run the `groups` command to see what groups your user belongs to. You'll also want to restart Apache:

```bash
sudo service httpd restart
```
{: .notice--info}
**Note:** there is an extra package that WordPress will eventually rely on to manipulate images. Install it now:

```bash
sudo yum install php56-gd
```
# Setting up RDS

Amazon's Relational Database Service is a scalable, high-availability database platform for cloud applications. We'll use it as the WordPress backend. Select RDS from the AWS console, click "Launch DB Instance" and select a MySQL instance. The largest free-tier volume you can create is 20 gig. Make sure to save the instance ID, user, and password you create.

Set the "Publicly Accessible" option to "No" on the advanced settings page. Choose a non-default port for the database, something other than 3306 that isn't used by another service. Just select the "default" security group, which allows incoming traffic from any other instance belonging to that group.

Log in now with the credentials you created. The hostname can be found on the RDS dashboard:

```bash
mysql -h <db_hostname> -P <db_port> -u <db_user> -p
```
Create a database and a user for WordPress to use:

```sql
CREATE DATABASE `wordpress-db`;
CREATE USER 'wordpress-user'@'%' IDENTIFIED BY 'wordpress-user-pw';
GRANT ALL PRIVILEGES ON `wordpress-db`.* TO 'wordpress-user'@'%';
FLUSH PRIVILEGES;
```
Substitute your own database name, user, and password. Notice that backtick quotes are required around the database name, not single quotes. Your RDS instance now has two users with different privileges. You can display the user info as follows:

```sql
SELECT user,host FROM mysql.user;
SHOW GRANTS FOR 'wordpress-user';
```
# Setting up WordPress

Many of the following steps are also listed in Amazon's [guide](http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/hosting-wordpress.html) for installing WordPress. Download the latest WordPress installation package with `wget` and unzip the package:

```bash
mkdir Downloads; cd Downloads
wget https://wordpress.org/latest.tar.gz
tar -xzf latest.tar.gz
```
The WordPress installation folder contains a sample configuration file called `wp-config-sample.php`. We will use this file as a template for our configuration:

```bash
cd wordpress
cp wp-config-sample.php wp-config.php
vi wp-config.php
```
Find the line that defines `DB_NAME` and change `database_name_here` to the database name you created for WordPress. Do the same for `DB_USER` and `DB_PASSWORD`:

```php
define('DB_NAME', 'wordpress-db');
define('DB_USER', 'wordpress-user');
define('DB_PASSWORD', 'wordpress-user-pw');
```
Do the same for `DB_HOST`, but remember to append the non-default port to the hostname with a colon:

```php
define('DB_HOST', 'db_hostname:db_port');
```
Visit the WordPress [secret key generator](https://api.wordpress.org/secret-key/1.1/salt/) to create a set of values that you can paste into your `wp-config.php` file. Find the section called "Authentication Unique Keys and Salts" and overwrite the values with the keys that you generate. Save the file when you're done.

Now we can move the WordPress files to the Apache document root:

```bash
cd /home/ec2-Downloads/wordpress
sudo mv * /var/www/html/
```
WordPress permalinks need to use Apache `.htaccess` files to work properly but this is not enabled by default. Open the httpd.conf file:

```bash
cd /etc/httpd/conf
sudo cp httpd.conf httpd.conf.old
sudo vi httpd.conf
```
Find the section that starts with `<Directory "/var/www/html">`. Change the `AllowOverride None` line to read `AllowOverride All`. There are multiple `AllowOverride` lines in this file, so be sure you change only the line in the `<Directory "/var/www/html">` section. Restart Apache again afterward:

```bash
sudo service httpd restart
```
Check to make sure that the file and directory permissions are set correctly after the file transfers and editing are complete.

# Setting up SSL

Next you'll need a domain name and an SSL certificate. I purchased a wildcard certificate so that I could use a sub-domain with CloudFront. I found [NameCheap](https://www.namecheap.com/) to be a good vendor for certificates. If you purchase a domain name through AWS Route 53, remember to select "Hide Contact Information" under "Privacy Protection" on the registration page. You can follow Amazon's directions to [register or transfer](http://docs.aws.amazon.com/Route53/latest/DeveloperGuide/registrar.html) a domain using Route 53.

Domain names and SSL certificates are usually attached to an Elastic Load Balancer (ELB) in AWS. ELBs distribute traffic across multiple EC2 instances to increase your capacity and achieve some fault tolerance.

{: .notice--info}
**Note:** To take full advantage of this scalable architecture, EC2 instances should be launched using services like CloudFormation or Elastic Beanstalk. I found WordPress difficult to deploy using those tools, but we can still use an ELB with instances created manually.

Usually an ELB strips SSL and passes cleartext traffic to port 80 of an EC2 instance. However, this will break any WordPress installation set to use an HTTPS domain name. It creates a redirect loop that renders the WordPress console unreachable. The solution is just to pass SSL through to the EC2 instance, which means the certificates must be added there also.

You'll need to generate a private key and a Certificate Signing Request (CSR) file prior to purchasing a certificate:

```bash
openssl req -new -newkey rsa:2048 -nodes -keyout domain_com.key -out domain_com.csr
```
Replace `domain_com` with the domain name you're using. You'll be prompted to fill in some data about the CSR. If you're creating a wildcard certificate, the "Common Name" field should include an asterisk, as in `*.domain.com`

You should receive an archive of files once the signing request is approved by your provider. Something like:

```text
AddTrustExternalCARoot.crt
COMODORSAAddTrustCA.crt
COMODORSADomainValidationSecureServerCA.crt
star_domain.crt
```
The first three files form a [CA bundle](https://www.namecheap.com/support/knowledgebase/article.aspx/986/69/what-is-ca-bundle) when chained together (we'll do that shortly). The fourth file is the actual certificate. To begin adding certificates to your EC2 instance, log in and install `mod24_ssl`. This is the Apache module that allows you to use SSL with your site:

```bash
sudo yum install mod24_ssl
```
Make a temporary directory to hold your certificates, then log out:

```bash
mkdir /home/ec2-user/temp
```

Upload your certificate files to the EC2 instance using `scp`:

```bash
scp -P <ssh_port> -i <ssh_key> star_domain.crt ubuntu@<ip_addr>:/home/ec2-user/temp/
scp -P <ssh_port> -i <ssh_key> domain_com.key ubuntu@<ip_addr>:/home/ec2-user/temp/
scp -P <ssh_port> -i <ssh_key> AddTrustExternalCARoot.crt ubuntu@<ip_addr>:/home/ec2-user/temp/
scp -P <ssh_port> -i <ssh_key> COMODORSAAddTrustCA.crt ubuntu@<ip_addr>:/home/ec2-user/temp/
scp -P <ssh_port> -i <ssh_key> COMODORSADomainValidationSecureServerCA.crt ubuntu@<ip_addr>:/home/ec2-user/temp/
```

Log back in and move the files to the correct locations:

```bash
sudo mv /home/ec2-user/temp/star_domain.crt /etc/pki/tls/certs/
sudo mv /home/ec2-user/temp/domain_com.key /etc/pki/tls/private/
sudo mv /home/ec2-user/temp/AddTrustExternalCARoot.crt /etc/pki/tls/certs/
sudo mv /home/ec2-user/temp/COMODORSAAddTrustCA.crt /etc/pki/tls/certs/
sudo mv /home/ec2-user/temp/COMODORSADomainValidationSecureServerCA.crt /etc/pki/tls/certs/
```

Set the correct permissions:

```bash
sudo chown root:root /etc/pki/tls/certs/star_domain.crt
sudo chmod 644 /etc/pki/tls/certs/star_domain.crt
sudo chown root:root /etc/pki/tls/private/domain_com.key
sudo chmod 600 /etc/pki/tls/private/domain_com.key
```

Now create the CA bundle by chaining the certificate files together:

```bash
cat /etc/pki/tls/certs/COMODORSADomainValidationSecureServerCA.crt /etc/pki/tls/certs/COMODORSAAddTrustCA.crt /etc/pki/tls/certs/AddTrustExternalCARoot.crt > /etc/pki/tls/certs/bundle.crt
```

Set the permissions on the bundle:

```bash
sudo chown root:root /etc/pki/tls/certs/bundle.crt
sudo chmod 644 /etc/pki/tls/certs/bundle.crt
```

Now we need to configure Apache to use SSL. Open the SSL configuration file:

```bash
sudo vi /etc/httpd/conf.d/ssl.conf
```

Find the section that starts with `<VirtualHost _default_:443>` and update the certificate paths:

```apache
# SSLCertificateFile /etc/pki/tls/certs/localhost.crt
SSLCertificateFile /etc/pki/tls/certs/star_domain.crt

# SSLCertificateKeyFile /etc/pki/tls/private/localhost.key
SSLCertificateKeyFile /etc/pki/tls/private/domain_com.key

# SSLCACertificateFile /etc/pki/tls/certs/ca-bundle.crt
SSLCACertificateFile /etc/pki/tls/certs/bundle.crt
```

Replace the above filenames with the correct ones for your domain. We'll also add a new entry at the bottom of this file, before the last closing `</VirtualHost>` tag:

```apache
RequestHeader set X-Forwarded-Proto "https" early
```

This flags requests that are using HTTPS to connect. Along with a setting in `httpd.conf`, it will help us to force HTTPS for all connections. Edit the `httpd.conf` file again:

```bash
sudo vi /etc/httpd/conf/httpd.conf
```

Add the following lines after the closing `</IfModule>` tag of the `<IfModule mime_magic_module>` block, near the top of the file:

```apache
<IfModule rewrite_module>
    RewriteEngine on
    RewriteCond %{HTTP:X-Forwarded-Proto} !https
    RewriteRule .* https://%{HTTP_HOST}%{REQUEST_URI} [R,L]
</IfModule>
```

Now the server has been configured to accept HTTPS connections. Next we'll create the load balancer, which will receive incoming requests and forward them to the server.

# Elastic Load Balancer

Upload your certificate to the AWS Identity and Access Manager (IAM):

```bash
cd /home/ec2-user/temp
aws iam upload-server-certificate --server-certificate-name star_domain_com --certificate-body file://star_domain.crt --private-key file://domain_com.key --certificate-chain file://bundle.crt
```

Change the necessary parameters above. This will make the certificate available in the console when creating the ELB. Navigate to the EC2 dashboard and click "Load Balancers" on the left. Click "Create Load Balancer" at the top. Add two rules to the new ELB:

* HTTP (80) on the ELB → HTTP (80) on the instance
* HTTPS (443) on the ELB → HTTPS (443) on the instance

Click "Next: Assign Security Groups" and create a security group that accepts both HTTP (80) and HTTPS (443) from your IP address. We'll eventually add the ELB to the "default" security group, so that the EC2 instance will accept traffic from it. Click "Next: Configure Security Settings" and select the certificate that you uploaded from the command line.

Continue the setup process: use the default health check settings, add your EC2 instance, tag it with a name, and create it. Back on the ELB console, highlight your new ELB and click the "Security" tab. Click "Edit" and add the "default" security group.

Now the domain name can be configured. Create a new "A" record for your domain in the Route 53 console. Use `www` as the subdomain and set the "Alias" option to "Yes". Select the canonical name of your load balancer from the "Alias Target" dropdown and click "Create".

# Setting up S3 and CloudFront

Your domain name should take you to the WordPress login page once the DNS changes take effect. Log in and make sure your default domain is prefaced with `https://` in the WordPress settings.

Amazon's Simple Storage Service (S3) is the preferred way to host static content in AWS. We want WordPress to store all media in an S3 bucket automatically. We'll also configure Amazon's CloudFront service to provide a custom subdomain for our S3 content. {: .notice--info}
**Note:** Many of the following options are detailed throughout the [documentation](https://wordpress.org/plugins/amazon-s3-and-cloudfront/) for the WordPress plugin we will eventually install.

Open S3 from the Amazon console. Create a new bucket and give it the *exact name* of the subdomain you intend to use, as in `cdn.domain.com`.

Open IAM from the AWS console and click "Create New Users". Enter a name like `WordPress` and make sure that "Generate an access key for each user" is checked. Click "Create" and save the "Access Key ID" and "Secret Access Key" that appear.

Back in the IAM console, create a new `WordPress` group and add the `WordPress` user to it. Add an "Inline Policy" to the WordPress group, select "Custom Policy", and create a name like `AmazonS3WordPress` for it. Use the following policy:

```json
{
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:CreateBucket",
                "s3:DeleteObject",
                "s3:Put*",
                "s3:Get*",
                "s3:List*"
            ],
            "Resource": [
                "arn:aws:s3:::cdn.domain.com",
                "arn:aws:s3:::cdn.domain.com/*"
            ]
        }
    ]
}
```

Enter the name of your S3 bucket in place of `cdn.domain.com` above. This policy will give users in the `WordPress` some limited access to the bucket we just created. Now edit `wp-config.php` again to provide WordPress with the user credentials:

```bash
sudo vi /var/www/html/wp-config.php
```

Add the following lines, using the correct values:

```php
define('AWS_ACCESS_KEY_ID', 'access_key_id');
define('AWS_SECRET_ACCESS_KEY', 'secret_access_key');
```

Before creating a CloudFront distribution for the S3 bucket, we need to make the wildcard certificate available to CloudFront. Log into the EC2 instance and upload the certificate files to CloudFront:

```bash
cd /home/ec2-user/temp/
aws iam upload-server-certificate --server-certificate-name cdn_domain_com --certificate-body file://star_domain_com.crt --private-key file://domain_com.key --certificate-chain file://bundle.crt --path /cloudfront/cdn-domain-com/
```

Change the parameters above where necessary. From the AWS console, open the CloudFront dashboard, click "Create Distribution", and select a "Web" distribution. Set the following options:

* Select your S3 bucket from the "Origin Domain Name" dropdown
* Select "Redirect HTTP to HTTPS" for the "Viewer Protocol Policy" option
* Enter your custom subdomain in the "Alternate Domain Names (CNAMEs)" field. This should be the same as your bucket name
* Choose "Custom SSL Certificate" and select the certificate you uploaded

Leave the other values in place and click "Create Distribution". Now navigate to the Route 53 dashboard. Create a new "A" record for your subdomain, set the "Alias" option to "Yes", and select the canonical name of your CloudFront distribution from the "Alias Target" dropdown.

After completing those steps, the following plugins will allow WordPress to use your S3 bucket for all static content: [Amazon Web Services](https://wordpress.org/plugins/amazon-web-services/) and [Amazon S3 and CloudFront](https://wordpress.org/plugins/amazon-s3-and-cloudfront/)

When configuring the plugins, you will not be able to list the available buckets because of the limited privileges we gave the `WordPress` user. Just enter the bucket name manually. For the "Domain" option, select "CloudFront or custom domain" and enter the subdomain that you set up. For the "SSL" option, select "Always SSL".

# Conclusion

Remember to log back into your EC2 instance and delete the temporary directory where your keys were stored:

```bash
sudo rm -rf /home/ec2-user/temp
```

That concludes the basic setup that was required to launch this website. Going forward, your site should utilize RDS, S3, CloudFront, and use SSL for all connections.
