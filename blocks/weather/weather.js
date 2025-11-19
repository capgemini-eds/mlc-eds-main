
const CHART_CDN = 'https://cdn.jsdelivr.net/npm/chart.js';

function loadChartJS() {
  if (globalThis.Chart) return Promise.resolve(globalThis.Chart);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = CHART_CDN;
    s.onload = () => resolve(globalThis.Chart);
    s.onerror = () => reject(new Error('Failed to load Chart.js'));
    document.head.appendChild(s);
  });
}

function buildUrl({ latitude, longitude, hourly = [], models }) {
  const base = 'https://api.open-meteo.com/v1/forecast';
  const url = new URL(base);
  url.searchParams.set('latitude', '-37.814');
  url.searchParams.set('longitude', '144.9633');
  if (hourly?.length) url.searchParams.set('hourly', hourly.join(','));
  if (models) url.searchParams.set('models', models);
  // timezone auto so times are readable
  url.searchParams.set('timezone', 'Australia/Sydney');
  return url.toString();
}

function toLabels(timeArray) {
  if (!Array.isArray(timeArray)) return [];
  return timeArray.map((t) => {
    const d = new Date(t);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric' });
  });
}

function getColor(i) {
  const palette = ['#037691', '#c95109', '#991ad6', '#da1710', '#2a9d8f', '#e9c46a', '#264653', '#f4a261'];
  return palette[i % palette.length];
}

async function fetchWeather(options) {
  const url = buildUrl(options);
  const res = await fetch(url);
  if (!res.ok) {
    const tx = await res.text().catch(() => '');
    throw new Error(`Open-Meteo fetch failed: ${res.status} ${tx}`);
  }
  // optional debug: don't consume body twice in production
  return res.json();
}

function createContainer(block) {
  const container = document.createElement('div');
  container.className = 'weather-chart-container';
  container.style.width = '100%';
  container.style.minHeight = '240px';
  block.innerHTML = '';
  block.appendChild(container);
  return container;
}

function createCanvas(container) {
  const canvas = document.createElement('canvas');
  canvas.style.maxWidth = '100%';
  canvas.style.height = '360px';
  container.appendChild(canvas);
  return canvas;
}

function debounce(fn, wait = 250) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function createControls(container, initial = []) {
  // mapping of checkbox id -> API param
  const mapping = {
    temperature: 'temperature_2m',
    rain: 'rain',
    snowfall: 'snowfall',
  };
  const wrapper = document.createElement('div');
  wrapper.className = 'weather-controls';
  wrapper.style.display = 'flex';
  wrapper.style.gap = '12px';
  wrapper.style.alignItems = 'center';
  wrapper.style.flexWrap = 'wrap';
  wrapper.style.padding = '8px 0';

  for (const key of Object.keys(mapping)) {
    const id = `weather-opt-${key}`;
    const label = document.createElement('label');
    label.style.display = 'inline-flex';
    label.style.alignItems = 'center';
    label.style.gap = '6px';
    label.style.cursor = 'pointer';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = id;
    cb.name = 'weather-opt';
    cb.value = mapping[key];
    // default selection: temperature & rain
    cb.checked = initial.length ? initial.includes(mapping[key]) : (key === 'temperature' || key === 'rain');

    const span = document.createElement('span');
    span.textContent = key.charAt(0).toUpperCase() + key.slice(1);

    label.appendChild(cb);
    label.appendChild(span);
    wrapper.appendChild(label);
  }

  container.appendChild(wrapper);

  function getSelected() {
    const vals = [];
    for (const el of wrapper.querySelectorAll('input[type=checkbox][name=weather-opt]')) {
      if (el.checked) vals.push(el.value);
    }
    return vals;
  }

  return { el: wrapper, getSelected };
}

async function renderWeatherChart(containerSelectorOrEl, options = {}) {
    await loadChartJS();
    const container = typeof containerSelectorOrEl === 'string' ? document.querySelector(containerSelectorOrEl) : containerSelectorOrEl;
    if (!container) throw new Error('Container element not found');

    const loading = document.createElement('div');
    loading.textContent = 'Loading weather data...';
    container.innerHTML = '';
    container.appendChild(loading);

    try {
        // validate required coords
        // if (options.latitude == null || options.longitude == null) {
        //     throw new Error('Missing latitude or longitude in options');
        // }

        const data = await fetchWeather(options);
        const time = data.hourly?.time;
        if (!time) throw new Error('No hourly time data returned');

        const labels = toLabels(time);
        // determine which hourly parameters to plot
        const hourlyParams = (options.hourly?.length) ? options.hourly : Object.keys(data.hourly ?? {}).filter((k) => k !== 'time');

        // create datasets but keep unit information for grouping
        const datasets = [];
        for (let idx = 0; idx < hourlyParams.length; idx += 1) {
            const param = hourlyParams[idx];
            const arr = data.hourly?.[param] ?? [];
            const color = getColor(idx);
            datasets.push({
                label: param,
                data: arr,
                color,
                tension: 0.2,
                pointRadius: 0,
                fill: false,
            });
        }

        container.innerHTML = '';
        const canvas = createCanvas(container);

        // Group axes by unit so that variables with same unit share an axis
        const axes = {};
        const unitToAxisId = {};
        let axisCount = 0;
        for (let i = 0; i < datasets.length; i += 1) {
            const ds = datasets[i];
            const unit = data.hourly_units?.[ds.label] ?? '';
            let axisId = unitToAxisId[unit];
            if (!axisId) {
                axisId = `y${axisCount}`;
                unitToAxisId[unit] = axisId;
                // alternate axis position: first left, then right for others
                const position = axisCount === 0 ? 'left' : 'right';
                axes[axisId] = {
                    type: 'linear',
                    position,
                    display: true,
                    grid: { drawOnChartArea: axisCount === 0 },
                    title: unit ? { display: !!unit, text: unit } : undefined,
                };
                axisCount += 1;
            }
            // assign axis id and color to dataset for Chart.js
            ds.yAxisID = axisId;
            ds.borderColor = ds.color;
            ds.backgroundColor = ds.color + '40';
            // remove temporary color property
            delete ds.color;
        }

        const cfg = {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                stacked: false,
                plugins: { title: { display: !!options.title, text: options.title || '' }, legend: { position: 'top' } },
                scales: axes,
            },
        };

        if (canvas._chart) canvas._chart.destroy();
        const chart = new Chart(canvas.getContext('2d'), cfg);
        canvas._chart = chart;
        return chart;
    } catch (err) {
        container.innerHTML = '';
        const e = document.createElement('div');
        e.textContent = 'Error loading weather: ' + err.message;
        e.style.color = 'crimson';
        container.appendChild(e);
        throw err;
    }
}

async function loadWeatherData(options = {}) {
  return fetchWeather(options);
}

// decorate(block) — main entrypoint used by the site loader
export default async function decorate(block) {
    if (!block) return;
    // read options from data attributes
    const ds = block.dataset || {};
    const opts = {};
    if (ds.latitude) opts.latitude = Number(ds.latitude);
    if (ds.longitude) opts.longitude = Number(ds.longitude);
    if (ds.hourly) opts.hourly = ds.hourly.split(',').map(s => s.trim()).filter(Boolean);
    if (ds.models) opts.models = ds.models;
    if (ds.title) opts.title = ds.title;

    // fallback: try to parse JSON from block textContent if lat/lon missing
    if ((!opts.latitude || !opts.longitude) && block.textContent) {
        const txt = block.textContent.trim();
        if (txt.startsWith('{')) {
            try {
                const parsed = JSON.parse(txt);
                Object.assign(opts, parsed);
            } catch (e) {
                console.warn('weather: failed to parse JSON from block content', e);
            }
        }
    }

    // create container and controls
    const container = createContainer(block);
    const controls = createControls(container, opts.hourly || []);

    // chart area
    const chartContainer = document.createElement('div');
    chartContainer.style.width = '100%';
    chartContainer.style.minHeight = '240px';
    container.appendChild(chartContainer);

    const updateChart = debounce(async () => {
        const selected = controls.getSelected();
        if (!selected || !selected.length) {
            chartContainer.innerHTML = '';
            const m = document.createElement('div');
            m.textContent = 'Select at least one variable to display.';
            m.style.color = '#666';
            chartContainer.appendChild(m);
            return;
        }
        try {
            await renderWeatherChart(chartContainer, Object.assign({}, opts, { hourly: selected }));
        } catch (e) {
            console.error('weather: update failed', e);
        }
    }, 300);

    // initialize
    updateChart();

    // attach listeners
    for (const cb of controls.el.querySelectorAll('input[type=checkbox][name=weather-opt]')) {
        cb.addEventListener('change', updateChart);
    }

    // keep helper available globally for other scripts
    globalThis.renderWeatherChart = renderWeatherChart;
    globalThis.loadWeatherData = loadWeatherData;
}
