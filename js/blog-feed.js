async function loadBlogFeed() {
  const feedContainer = document.getElementById('blog-feed');
  const statusElement = document.getElementById('blog-feed-status');

  if (!feedContainer || !statusElement) {
    return;
  }

  try {
    const data = await fetchFeedData();
    const items = Array.isArray(data.items) ? data.items : [];

    if (items.length === 0) {
      statusElement.textContent = 'No relevant tech stories found right now.';
      feedContainer.innerHTML = '<div class="blog-feed-empty">No live items matched the current filter.</div>';
      return;
    }

    statusElement.textContent = data.source === 'local' ? 'Local feed preview loaded for development.' : 'Live stories updated from RSS feeds.';
    feedContainer.innerHTML = items.map(renderCard).join('');
  } catch (error) {
    statusElement.textContent = 'Live feed could not be loaded right now.';
    feedContainer.innerHTML = '<div class="blog-feed-error">Unable to load live RSS stories at the moment. Please try again later.</div>';
  }
}

async function fetchFeedData() {
  const localFeedUrl = new URL('data/blog-feed.json', window.location.href).href;
  const workerFeedUrl = '/api/blog-feed';
  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const feedUrls = isLocalhost ? [localFeedUrl, workerFeedUrl] : [workerFeedUrl, localFeedUrl];

  let lastError = null;

  for (const feedUrl of feedUrls) {
    try {
      const response = await fetch(feedUrl);

      if (!response.ok) {
        throw new Error(`Feed request failed for ${feedUrl}`);
      }

      const data = await response.json();
      return feedUrl.includes('/api/blog-feed') ? data : { ...data, source: 'local' };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Feed request failed');
}

function renderCard(item) {
  const published = new Date(item.publishedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const summary = item.summary || 'Latest tech and product news from the RSS feed.';

  return `
    <article class="blog-card">
      <span class="blog-source">${escapeHtml(item.source)}</span>
      <span class="blog-time">${escapeHtml(published)}</span>
      <h3 class="section-common-title">${escapeHtml(item.title)}</h3>
      <p class="blog-para">${escapeHtml(summary)}</p>
      <a class="blog-link" href="${escapeAttribute(item.link)}" target="_blank" rel="noopener noreferrer">Read the article</a>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

loadBlogFeed();
