async function loadBlogFeed() {
  const feedContainer = document.getElementById('blog-feed');

  if (!feedContainer) {
    return;
  }

  try {
    const data = await fetchFeedData();
    const items = Array.isArray(data.items) ? data.items : [];

    if (items.length === 0) {
      const backupData = await fetchBackupFeedData();
      const backupItems = Array.isArray(backupData.items) ? backupData.items : [];

      if (backupItems.length > 0) {
        feedContainer.innerHTML = backupItems.map(renderCard).join('');
        return;
      }

      feedContainer.innerHTML = '<div class="blog-feed-empty">No live or backup items matched the current filter.</div>';
      return;
    }

    feedContainer.innerHTML = items.map(renderCard).join('');
  } catch (error) {
    feedContainer.innerHTML = '<div class="blog-feed-error">Unable to load live RSS stories at the moment. Please try again later.</div>';
  }
}

async function fetchFeedData() {
  const localFeedUrl = new URL('data/blog-feed.json', window.location.href).href;
  const workerFeedUrl = new URL('/api/blog-feed', window.location.origin).href;
  const feedUrls = [workerFeedUrl, localFeedUrl];

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

async function fetchBackupFeedData() {
  const backupUrl = new URL('data/blog-feed.json', window.location.href).href;
  const response = await fetch(backupUrl);

  if (!response.ok) {
    throw new Error('Backup feed request failed');
  }

  const data = await response.json();
  return { ...data, source: 'backup' };
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
