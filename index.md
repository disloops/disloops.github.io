---
pagination:
  enabled: true
---

{% for post in paginator.posts %}
  <article class="post">
    <header class="post-header post-header--compact">
      <h1 class="post-title">
        <a href="{{ post.url }}">{{ post.title | default: post.name }}</a>
      </h1>
      <time class="post-date" datetime="{{ post.date | date_to_xmlschema }}">
        {{ post.date | date: "%B %-d, %Y" }}
      </time>
    </header>
    <div class="entry-content">
      {% if post.excerpt %}
        {{ post.excerpt }}
        {% if post.content contains '<!--more-->' %}
          <a href="{{ post.url }}" class="more-link">Continue reading...</a>
        {% endif %}
      {% endif %}
    </div>
  </article>
{% endfor %}

{% include paginator.html %}