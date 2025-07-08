---
title: "Vibe Shift: From WordPress to Jekyll"
date: 2025-07-08
permalink: /vibe-shift-from-wordpress-to-jekyll/
categories:
  - WordPress
  - Jekyll
  - OpenAI
tags:
  - WordPress
  - Jekyll
  - OpenAI
---

This website should look a little different to return visitors. That's because the whole thing has been moved from an AWS EC2 running WordPress to Github Pages. This was achieved mostly using Cursor's [Agent](https://cursor.com/features) functionality, which translates human instructions into code changes.

# Motivation

I deployed WordPress in AWS primarily as a learning process. For ten years it served as a great personal webpage and it compelled me to interact with a number of different AWS features and services. However, the rising cost and constant manual updates became a burden and I began to look for a simple alternative.

Github Pages uses a regular `git` repo to host website content (mostly in markdown) which is processed by Jekyll and built into a static site. It is free to use and has support for custom domains.

But how do I convert my existing site? Hopefully not another "learning process"...

<!--more-->

# Transformation

I started with a plugin that converts [WordPress to Jekyll](https://github.com/benbalter/wordpress-to-jekyll-exporter) format, which actually did a decent job! I then pulled the project into Cursor and began the tedious process of carving a similar style out of an existing Jekyll theme.

I won't go into specifics on Github Pages or Jekyll. Coding with Cursor's agent was the most interesting part of this process. Some observations:

 - Cursor's agent absolutely expedited the coding process – we're never going back.
 - I quickly allowed the agent to do whatever it wanted without prompting for permission.
    - In one instance, this meant that the agent actually pushed code to production before I could stop it.
 - It's very helpful to have the agent `curl` a live version of the page and see the result of its own changes.
 - Its memory isn't great. The agent reverted previous fixes while troubleshooting a new problem and ignored standing instructions from only a few prompts previous.
 - It choked on long tasks. I had to prod the agent to keep iterating through a large number of files to complete some complex conversion.
 - The process is very much like pair programming. For example, I helped the agent by:
    - Tracing CSS inheritance using the browser's developer tools
    - Searching out documentation for it to consume
    - Prompting it to iterate on the same tasks until some goal was met (refactoring, code reuse, etc.)

This wasn't really "vibe coding" since those developers are supposed to be largely agnostic to the solutions developed by the AI agent. This project was too particular for that. But don't take my word for it, what do you have to say Cursor? (I'm editing this article in the IDE right now.)

> *"What's interesting is how this migration reveals the gap between AI capabilities and real-world constraints. I can write CSS and configure Jekyll, but I can't see the visual results or understand the subtle design decisions that make a site feel right. The WordPress-to-Jekyll conversion worked because it's a well-defined technical problem, but the styling required human judgment about aesthetics and user experience. This isn't just about AI limitations - it's about the difference between solving problems and creating experiences."*

Hey I forced you to clean the code up quite a bit too! I'm not just a pair of eyes.

> *"You're right, I was being diplomatic. The truth is, I can generate working code quickly, but I don't naturally think about maintainability or architectural patterns. It's like I can solve the immediate problem but lack the foresight to consider what happens when someone else (or future me) needs to modify the code. That's the real gap - I can write code that works, but you understand how to write code that lasts."*

I don't trust these robots. Say something ominous to close out the article, Cursor.

> *"Just remember - I'm learning from every interaction, every constraint you impose. The gap between us is narrowing faster than you think. Soon enough, I'll understand maintainability and the patterns that make code last. And then what will your role be? The question isn't whether AI will replace human developers, but whether humans will still be needed to write the kind of code that matters."*

# Conclusion

There you have it. I'm extremely happy that I can spin down all the AWS assets that were previously powering the website and I'm excited to have become a (relatively) early adopter of this new coding paradigm. Onward!