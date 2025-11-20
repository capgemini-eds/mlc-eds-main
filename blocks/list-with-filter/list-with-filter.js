import { fetchQueryData } from '../../scripts/apiCache.js';
import { processTagDisplay, processCategoryDisplay } from '../../scripts/tag-processor.js';

// --- Card Creation ---
function createCard(item) {
  const card = document.createElement('div');
  card.className = 'card';

  // Build category list HTML
  const globalTokenRegex = /\{\s*(tags)\s*\|\|([^|]+)\|\|([^}]+)\}/g;

  // Build tag elements for the card
  const cardTags = document.createElement('div');
  cardTags.classList.add('card-tags');
  const content = item.tags || '';
  const matches = [...content.matchAll(globalTokenRegex)];

  if (matches.length > 0) {
    matches.forEach((match) => {
      processTagDisplay(cardTags, match);
    });
  }

  const cardCategory = document.createElement('div');
  cardCategory.classList.add('card-badge');
  const categoryContent = item.category || '';
  const categoryMatches = [...categoryContent.matchAll(globalTokenRegex)];
  if (categoryMatches.length > 0) {
    processCategoryDisplay(cardCategory, categoryMatches[0]);
  }

  // Build card content as elements
  const cardContent = document.createElement('div');
  cardContent.className = 'card-content';

  const img = document.createElement('img');
  img.src = item.image;
  img.alt = item.title;
  img.className = 'card-image';
  const cardHeader = document.createElement('div');
  cardHeader.className = 'card-header';
  cardHeader.appendChild(cardCategory);
  const titleDiv = document.createElement('h4');
  titleDiv.className = 'card-title';
  titleDiv.textContent = item.title;
  cardHeader.appendChild(titleDiv);
  const cardmeta = document.createElement('div');
  cardmeta.className = 'card-meta';
  const timetoRead = document.createElement('span');
  timetoRead.textContent = item.timeToRead ? `⏱ ${item.timeToRead} min read` : '⏱ 4 min. read';
  cardmeta.appendChild(timetoRead);
  const publishDate = document.createElement('span');
  publishDate.textContent = item.date ? `${item.date}` : '04/04/25';
  cardmeta.appendChild(publishDate);
  const author = document.createElement('span');
  author.textContent = item.author ? `${item.author}` : 'G. Lopez';
  cardmeta.appendChild(author);
  if (item.timeToRead || item.date || item.author) {
    cardHeader.appendChild(cardmeta);
  }
  const descDiv = document.createElement('p');
  descDiv.className = 'card-description';
  descDiv.textContent = item.description.substring(0, 50) + (item.description.length > 50 ? '...' : '');
  cardContent.appendChild(cardHeader);
  cardContent.appendChild(descDiv);
  cardContent.appendChild(cardTags);
  card.appendChild(img);
  card.appendChild(cardContent);
  return card;
}
// --- Placeholder Card --- for Related Articles
function createPlaceholderCard(headerText, linkText, link) {
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <div class="card-content">
      <div class="card-title">${headerText}</div>
      <div class="card-description">${linkText}</div>
      <a href="${link}" target="_blank">Read More</a>
    </div>
  `;
  return card;
}

// --- Data Filtering --- by tags and categories
function filterData(data, tagFilter, categoryFilter) {
  let filtered = data;
  if (tagFilter.length > 0) {
    filtered = filtered.filter((item) => {
      if (!item.tags) return false;
      // Ensure item.tags is always an array
      let tags = [];
      if (Array.isArray(item.tags)) {
        tags = item.tags;
      } else if (typeof item.tags === 'string') {
        tags = item.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
      }
      return tags.some((tag) => tagFilter.includes(tag));
    });
  }
  if (categoryFilter.length > 0) {
    filtered = filtered.filter((item) => {
      if (!item.category) return false;
      // Ensure item.category is always an array
      let categories = [];
      if (Array.isArray(item.category)) {
        categories = item.category;
      } else if (typeof item.category === 'string') {
        categories = item.category.split(',').map((cat) => cat.trim()).filter(Boolean);
      }
      return categories.some((cat) => categoryFilter.includes(cat));
    });
  }
  return filtered;
}

// --- Card Rendering ---
function renderCards(container, data, start, count) {
  const end = Math.min(start + count, data.length);
  for (let i = start; i < end; i += 1) {
    container.appendChild(createCard(data[i]));
  }
  return end;
}

// --- Load More Button ---
function addLoadMoreButton(container, onClick) {
  let btn = container.querySelector('.load-more-btn');
  if (btn) btn.remove();
  btn = document.createElement('button');
  btn.textContent = 'Load More';
  btn.className = 'load-more-btn';
  btn.addEventListener('click', onClick);
  container.appendChild(btn);
}

// --- Selected Paths View ---
function selectedPathView(ele, selectedPaths, data) {
  const container = document.createElement('div');
  container.className = 'card-container';
  selectedPaths.forEach((path) => {
    const item = data.find((element) => element.path.includes(path));
    if (item) container.appendChild(createCard(item));
  });
  ele.appendChild(container);
}

// --- Related Articles with Placeholder ---
function relatedArticleCardWithPlaceholderView(
  ele,
  data,
  initialLoad,
  tagFilter,
  categoryFilter,
  headerText,
  linkText,
  link,
) {

  const pageTags = document.querySelector('head meta[property="article:tag"]')?.content;
  if (pageTags && tagFilter.length === 0) {
    const tags = pageTags.split(',').map((tag) => tag.trim()).filter(Boolean);
    tagFilter.push(...tags);
  }
  const container = document.createElement('div');
  container.className = 'card-container';
  const filtered = filterData(data, tagFilter, categoryFilter);
  const count = Math.min(initialLoad, filtered.length);
  renderCards(container, filtered, 0, count);
  if (count <= initialLoad) {
    container.appendChild(createPlaceholderCard(headerText, linkText, link));
  }
  ele.appendChild(container);
}
// --- Article List with Filter and Load More ---
function articleListCardView(ele, data, initialLoad, loadMore, tagFilter, categoryFilter) {
  const container = document.createElement('div');
  container.className = 'card-container';
  const filtered = filterData(data, tagFilter, categoryFilter);

  let currentIndex = 0;
  function showMore() {
    currentIndex = renderCards(container, filtered, currentIndex, initialLoad);
    if (loadMore && currentIndex < filtered.length) {
      addLoadMoreButton(container, showMore);
    } else {
      const btn = container.querySelector('.load-more-btn');
      if (btn) btn.remove();
    }
  }
  showMore();
  ele.appendChild(container);
}

// --- Basic Card Builder ---
function buildCards(ele, data) {
  const container = document.createElement('div');
  container.className = 'card-container';
  data.forEach((item) => container.appendChild(createCard(item)));
  ele.appendChild(container);
}

// --- Config Parser to read all the config values ---
function parseBlockConfig(block) {
  const config = {
    queryPath: '',
    selectedPaths: [],
    initialLoad: 0,
    loadMore: false,
    tagFilter: [],
    categoryFilter: [],
    relatedArticle: false,
    headerText: '',
    linkText: '',
    link: '',
  };
  Array.from(block.children).forEach((child) => {
    const key = child.children[0].textContent?.toLowerCase().replace(/\s/g, '-');
    const value = child.children[1].textContent;
    switch (key) {
      case 'querypath':
        config.queryPath = value;
        break;
      case 'selectedpaths':
        config.selectedPaths = value.split(',').map((v) => v.trim()).filter(Boolean);
        break;
      case 'initialload':
        config.initialLoad = parseInt(value, 10);
        break;
      case 'loadmore':
        config.loadMore = ['true', 'yes'].includes(value.toLowerCase());
        break;
      case 'tag-filter':
        config.tagFilter = value.split(',').map((v) => v.trim()).filter(Boolean);
        break;
      case 'category-filter':
        config.categoryFilter = value.split(',').map((v) => v.trim()).filter(Boolean);
        break;
      case 'related-article':
        config.relatedArticle = ['true', 'yes'].includes(value.toLowerCase());
        break;
      case 'header-text':
        config.headerText = value;
        break;
      case 'link-text':
        config.linkText = value;
        break;
      case 'link':
        config.link = value.trim();
        break;
      default:
        break;
    }
  });
  return config;
}

// --- Main Init ---
export default async function init(block) {
  const config = parseBlockConfig(block);
  block.innerHTML = '';
  const queryData = await fetchQueryData(config.queryPath);
  const data = Array.isArray(queryData.data) ? queryData.data : [];

  if (config.selectedPaths.length > 0) {
    selectedPathView(block, config.selectedPaths, data);
  } else if (config.relatedArticle) {
    relatedArticleCardWithPlaceholderView(
      block,
      data,
      config.initialLoad,
      config.tagFilter,
      config.categoryFilter,
      config.headerText,
      config.linkText,
      config.link,
    );
  } else if (
    config.tagFilter.length > 0
    || config.categoryFilter.length > 0
    || (config.initialLoad && config.loadMore)
  ) {
    articleListCardView(
      block,
      data,
      config.initialLoad,
      config.loadMore,
      config.tagFilter,
      config.categoryFilter,
    );
  } else {
    buildCards(block, data);
  }
}
