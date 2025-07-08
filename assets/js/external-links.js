// External Links Handler
// Automatically opens external links in new tabs
document.addEventListener('DOMContentLoaded', function() {
  // Get all links on the page
  const links = document.querySelectorAll('a[href]');
  
  links.forEach(function(link) {
    const href = link.getAttribute('href');
    
    // Check if it's an external link (starts with http:// or https://)
    if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
      // Don't add target="_blank" if it already exists
      if (!link.hasAttribute('target')) {
        link.setAttribute('target', '_blank');
      }
      
      // Add rel="noopener noreferrer" for security
      if (!link.hasAttribute('rel')) {
        link.setAttribute('rel', 'noopener noreferrer');
      } else {
        // If rel already exists, append to it
        const existingRel = link.getAttribute('rel');
        if (!existingRel.includes('noopener')) {
          link.setAttribute('rel', existingRel + ' noopener noreferrer');
        }
      }
    }
  });
}); 