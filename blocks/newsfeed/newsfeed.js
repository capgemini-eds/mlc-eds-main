
function parseBlockConfig(block) {
  const config = {
    feedUrl: '',
    initialLoad: 0,
  };
  Array.from(block.children).forEach((child) => {
    const key = child.children[0].textContent?.toLowerCase().replace(/\s/g, '-');
    const value = child.children[1].textContent;
    switch (key) {
      case 'feedapi':
        config.feedUrl = value;
        break;
      case 'limit':
        config.initialLoad = parseInt(value, 10);
        break;
      default:
        break;
    }
  });
  return config;
}

// default initializer for block-based systems
export default async function init(block) {
    const config = parseBlockConfig(block);
    if (!block || !(block instanceof HTMLElement)) return;
    const attrLimit = config.initialLoad;
    const limit = Number(attrLimit) || 8;
    await showArticles(block, { limit }, config);
}
async function showArticles(block, { limit = 8 } = {}, config) {
    if (!block || !(block instanceof HTMLElement)) return;

    const endpoint = config.feedUrl || 'https://newsapi.org/v2/top-headlines?sources=techcrunch&apiKey=77204c7a0ae74e0f850bd800e58e845f';

    // Clear existing content
    block.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'newsfeed-list';
    block.appendChild(container);

    try {
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const articles = Array.isArray(data.articles) ? data.articles.slice(0, limit) : [];

        if (articles.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'newsfeed-empty';
            empty.textContent = 'No articles available.';
            container.appendChild(empty);
            return;
        }

        for (const a of articles) {
            const item = document.createElement('article');
            item.className = 'newsfeed-item';

            const link = document.createElement('a');
            link.href = a.url || '#';
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.className = 'newsfeed-link';
            const imageUrl = a.urlToImage || 'https://aitkenspence.com/images/news/news_placeholder.jpg';
            if (imageUrl) {
                const img = document.createElement('img');
                img.src = imageUrl;
                img.alt = a.title || 'Article image';
                img.loading = 'lazy';
                img.className = 'newsfeed-image';
                link.appendChild(img);
            }

            const content = document.createElement('div');
            content.className = 'newsfeed-content';

            const title = document.createElement('h3');
            title.className = 'newsfeed-title';
            title.textContent = a.title || 'Untitled';
            content.appendChild(title);

            if (a.description) {
                const desc = document.createElement('p');
                desc.className = 'newsfeed-desc';
                desc.textContent = a.description;
                content.appendChild(desc);
            }

            const meta = document.createElement('div');
            meta.className = 'newsfeed-meta';

            const source = document.createElement('span');
            source.className = 'newsfeed-source';
            source.textContent = a.source?.name || '';
            meta.appendChild(source);

            if (a.publishedAt) {
                const date = document.createElement('time');
                date.className = 'newsfeed-date';
                const d = new Date(a.publishedAt);
                date.dateTime = d.toISOString();
                date.textContent = d.toLocaleString();
                meta.appendChild(date);
            }

            content.appendChild(meta);
            link.appendChild(content);
            item.appendChild(link);
            container.appendChild(item);
        }
    } catch (err) {
        /* eslint-disable no-console */
        console.error('Failed to load newsfeed:', err);
        /* eslint-enable no-console */
        container.innerHTML = '';
        const errMsg = document.createElement('p');
        errMsg.className = 'newsfeed-error';
        errMsg.textContent = 'Failed to load articles.';
        block.appendChild(errMsg);
    }
}