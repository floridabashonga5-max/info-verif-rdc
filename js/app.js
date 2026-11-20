const STORAGE_KEY = 'infoverif-searches';

const demoSources = [
  { title: 'Conseils pour vérifier une information virale', domain: 'Guide éditorial', date: 'Aujourd’hui', summary: 'Rechercher la source originale, comparer plusieurs médias et vérifier la date de publication avant de partager.' },
  { title: 'Pourquoi les images peuvent tromper', domain: 'Vérification visuelle', date: 'Aujourd’hui', summary: 'Une image ancienne ou détournée peut être associée à un événement récent. Une recherche inversée permet de retrouver son origine.' },
  { title: 'Identifier les signes d’un faux article', domain: 'Éducation aux médias', date: 'Aujourd’hui', summary: 'Adresses inhabituelles, erreurs factuelles, absence d’auteur et appel pressant au partage sont des indices à examiner.' }
];

function getSearches() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveSearch(query) {
  const searches = getSearches();
  const entry = { query, date: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([entry, ...searches].slice(0, 20)));
}

function updateSearchCount() {
  document.querySelector('#statSearches').textContent = getSearches().length;
}

function formatSearchDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date non communiquée';
  return date.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function renderSearchHistory() {
  const target = document.querySelector('#searchHistoryList');
  if (!target) return;

  const searches = getSearches();
  if (!searches.length) {
    target.innerHTML = '<div class="history-empty">Aucune recherche enregistrée pour le moment.</div>';
    return;
  }

  target.innerHTML = searches.map((search, index) => `<article class="history-item">
    <div class="history-item-main">
      <span class="history-query">${escapeHTML(search.query)}</span>
      <span class="history-date">${escapeHTML(formatSearchDate(search.date))}</span>
    </div>
    <button type="button" class="history-run" data-index="${index}" aria-label="Relancer la recherche ${escapeHTML(search.query)}">Relancer</button>
    <button type="button" class="history-delete" data-index="${index}" aria-label="Supprimer la recherche ${escapeHTML(search.query)}">Supprimer</button>
  </article>`).join('');
}

function deleteSearch(index) {
  const searches = getSearches();
  const numericIndex = Number(index);

  if (!Number.isInteger(numericIndex) || numericIndex < 0 || numericIndex >= searches.length) {
    return;
  }

  const selectedQuery = searches[numericIndex].query;
  const confirmed = window.confirm(`Supprimer cette recherche : « ${selectedQuery} » ?`);
  if (!confirmed) return;

  searches.splice(numericIndex, 1);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
  updateSearchCount();
  renderSearchHistory();
  showToast('Recherche supprimée de l’historique.');
}

function clearSearchHistory() {
  if (!getSearches().length) return;
  if (!window.confirm('Effacer toutes les recherches enregistrées dans ce navigateur ?')) return;
  localStorage.removeItem(STORAGE_KEY);
  updateSearchCount();
  renderSearchHistory();
  showToast('Historique des recherches effacé.');
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 3200);
}

function setStatus(element, message, type = '') {
  element.className = `status ${type}`.trim();
  element.textContent = message;
}

function navigate(hash) {
  const target = hash && document.querySelector(hash);
  const view = target && target.classList.contains('view') ? target : document.querySelector('#accueil');
  document.querySelectorAll('.view').forEach(section => section.classList.remove('active-view'));
  view.classList.add('active-view');
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === `#${view.id}`);
  });
  document.querySelector('#mainMenu').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function escapeHTML(value) {
  const element = document.createElement('div');
  element.textContent = value || '';
  return element.innerHTML;
}

function decodeHTML(value) {
  const element = document.createElement('textarea');
  element.innerHTML = value || '';
  return element.value;
}

function formatDate(value) {
  if (!value) return 'Date non communiquée';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date non communiquée' : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function fetchGdelt(query = 'Congo') {
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&maxrecords=12&format=json&sort=datedesc`;
  const response = await fetchWithTimeout(url, 12000);
  if (!response.ok) throw new Error(`GDELT a répondu avec le statut ${response.status}`);
  const data = await response.json();
  return (data.articles || []).map(article => ({
    title: decodeHTML(article.title || 'Titre non disponible'),
    summary: article.seendate ? 'Article indexé par GDELT.' : 'Résumé non fourni par GDELT.',
    date: normalizeGdeltDate(article.seendate),
    source: 'GDELT',
    domain: article.domain || 'Source externe',
    url: article.url,
    theme: detectTheme(`${article.title || ''} ${article.domain || ''}`)
  }));
}

async function fetchWithTimeout(url, timeout = 12000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (error.name === 'AbortError') throw new Error(`la requête a dépassé ${timeout / 1000} secondes`);
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

async function fetchRss(query = '') {
  const feedUrl = 'https://www.radiookapi.net/rss.xml';
  const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}&count=20`;
  const response = await fetchWithTimeout(url, 12000);
  if (!response.ok) throw new Error(`La passerelle RSS a répondu avec le statut ${response.status}`);
  const data = await response.json();
  if (data.status !== 'ok') throw new Error(data.message || 'Flux RSS Radio Okapi inaccessible');
  const normalized = (data.items || []).map(item => {
    const rawTitle = decodeHTML(item.title || '').replace(/\s+/g, ' ').trim();
    const looksLikeGenericTitle = !rawTitle
      || /^\d{4}\s+(actualité|maniera|maniema|ituri|katanga|sud[- ]kivu|nord[- ]kivu)(?:\s|$)/i.test(rawTitle)
      || /^\d{4}\s+(?:actualit(?:é|e)|[a-zà-ÿ -]+)$/i.test(rawTitle);
    const description = stripHTML(item.description || '').replace(/\s+/g, ' ').trim();
    const rawUrl = item.link || '';
    const url = /^https?:\/\//i.test(rawUrl) && /radiookapi\.net/i.test(rawUrl)
      ? rawUrl
      : '';

    return {
      title: looksLikeGenericTitle ? 'Titre non fourni par Radio Okapi' : rawTitle,
      summary: description ? decodeHTML(description).slice(0, 220) : 'Aucun résumé fourni par Radio Okapi.',
      date: item.pubDate || '',
      source: 'Radio Okapi (RSS)',
      domain: 'Radio Okapi',
      url,
      searchText: `${rawTitle} ${description}`,
      theme: detectTheme(`${rawTitle} ${description}`)
    };
  });
  if (!query) return normalized;
  const needle = query.toLowerCase();
  return normalized.filter(item => `${item.title} ${item.summary}`.toLowerCase().includes(needle));
}

function stripHTML(value) {
  const element = document.createElement('div');
  element.innerHTML = value || '';
  return element.textContent || '';
}

function detectTheme(text) {
  const value = text.toLowerCase();
  if (/élection|polit|gouvern|président|ministre/.test(value)) return 'politique';
  if (/économie|budget|prix|carburant|commerce/.test(value)) return 'économie';
  if (/sécurité|armée|attaque|conflit|milice/.test(value)) return 'sécurité';
  if (/santé|hôpital|maladie|vaccin|épidémie/.test(value)) return 'santé';
  if (/numérique|internet|réseau|téléphone|ia|technologie/.test(value)) return 'numérique';
  return 'all';
}

let newsItems = [];
let currentNewsQuery = '';

function renderNews(articles, target) {
  if (!articles.length) {
    target.innerHTML = '<div class="loading">Aucun article accessible pour cette recherche.</div>';
    return;
  }

  target.innerHTML = articles.slice(0, 6).map((article, index) => {
    const isRadioOkapi = article.source === 'Radio Okapi (RSS)';
    const title = isRadioOkapi && article.title === 'Titre non fourni par Radio Okapi'
      ? 'Titre non communiqué dans le flux RSS'
      : decodeHTML(article.title || 'Titre non communiqué');
    const domain = article.domain || article.source || 'Source externe';
    const date = formatDate(article.date);
    const description = article.summary || (isRadioOkapi
      ? 'Aucun résumé fourni par Radio Okapi.'
      : 'Résumé non communiqué par la source.');
    const originalLink = isRadioOkapi && article.url
      ? `<a class="text-link" href="${escapeHTML(article.url)}" target="_blank" rel="noopener">Lire l’article original sur Radio Okapi ↗</a>`
      : article.url
        ? `<a href="${escapeHTML(article.url)}" target="_blank" rel="noopener">${escapeHTML(title)}</a>`
        : '';
    return `<article class="news-card">
      <div class="news-card-source"><span>${escapeHTML(article.source || 'Source externe')}</span></div>
      <div class="news-card-image">${String(index + 1).padStart(2, '0')}</div>
      <div class="news-card-body">
        <span class="news-meta">${escapeHTML(domain)} · ${escapeHTML(date)}</span>
        <h3>${isRadioOkapi ? escapeHTML(title) : originalLink}</h3>
        <p>${escapeHTML(description)}</p>
        ${isRadioOkapi ? originalLink : ''}
      </div>
    </article>`;
  }).join('');
}

function normalizeGdeltDate(value) {
  if (!value) return '';
  const match = /^([0-9]{4})([0-9]{2})([0-9]{2})/.exec(value);
  return match ? `${match[1]}-${match[2]}-${match[3]}T12:00:00Z` : value;
}

async function loadNews(query = 'Congo') {
  currentNewsQuery = query === 'Congo' ? '' : query;
  const target = document.querySelector('#newsGrid');
  const status = document.querySelector('#newsStatus');
  setStatus(status, 'Chargement depuis GDELT et Radio Okapi (RSS)…', 'loading');
  target.innerHTML = '<div class="loading">Chargement des actualités…</div>';

  const tasks = await Promise.allSettled([
    fetchGdelt(query),
    fetchRss()
  ]);

  newsItems = [];
  const messages = [];
  if (tasks[0].status === 'fulfilled') {
    newsItems.push(...tasks[0].value);
    messages.push(`GDELT : ${tasks[0].value.length} article(s)`);
  } else {
    messages.push(`GDELT indisponible : ${tasks[0].reason.message}`);
  }
  if (tasks[1].status === 'fulfilled') {
    newsItems.push(...tasks[1].value);
    messages.push(`Radio Okapi RSS : ${tasks[1].value.length} article(s)`);
  } else {
    messages.push(`Radio Okapi RSS indisponible : ${tasks[1].reason.message}`);
  }

  document.querySelector('#statNews').textContent = newsItems.length;
  applyNewsFilters();
  const hasError = tasks.some(task => task.status === 'rejected');
  setStatus(status, messages.join(' · '), hasError ? 'error' : 'success');
}

function applyNewsFilters() {
  const source = document.querySelector('#sourceFilter')?.value || 'all';
  const date = document.querySelector('#dateFilter')?.value || 'all';
  const theme = document.querySelector('#themeFilter')?.value || 'all';
  const now = Date.now();
  const filtered = newsItems.filter(item => {
    if (source !== 'all' && item.source !== source) return false;
    if (currentNewsQuery && !`${item.title} ${item.summary} ${item.domain} ${item.searchText || ''}`.toLowerCase().includes(currentNewsQuery.toLowerCase())) return false;
    if (theme !== 'all' && item.theme !== theme) return false;
    if (date !== 'all') {
      const itemDate = new Date(item.date).getTime();
      if (!itemDate || now - itemDate > Number(date) * 86400000) return false;
    }
    return true;
  });

  const target = document.querySelector('#newsGrid');
  renderNews(filtered, target);
  renderNews(filtered.slice(0, 6), document.querySelector('#featuredNews'));
}

async function searchFactCheck(query) {
  const key = document.querySelector('#factCheckKey')?.value || '';
  if (!key) {
    return [{
      title: 'Aucun verdict automatique disponible',
      source: 'Mode sans clé API',
      summary: `Votre recherche « ${query} » n’a pas déclenché de verdict inventé. Ajoutez une clé Google Fact Check Tools côté serveur ou dans une intégration sécurisée pour consulter les claims réels.`,
      demo: true
    }];
  }

  const url = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodeURIComponent(query)}&key=${encodeURIComponent(key)}&languageCode=fr&pageSize=10`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Google Fact Check Tools a répondu avec le statut ${response.status}`);
  const data = await response.json();
  return (data.claims || []).map(claim => ({
    title: claim.text,
    source: claim.claimReview?.[0]?.publisher?.name || 'Source non communiquée',
    summary: `${claim.claimReview?.[0]?.title || 'Vérification publiée'} — Verdict indiqué par la source : ${claim.claimReview?.[0]?.textualRating || 'non communiqué'}.`,
    url: claim.claimReview?.[0]?.url,
    demo: false
  }));
}

async function runVerification(query) {
  const status = document.querySelector('#verificationStatus');
  const results = document.querySelector('#verificationResults');
  setStatus(status, 'Recherche des vérifications publiées…', 'loading');
  results.innerHTML = '';
  saveSearch(query);
  updateSearchCount();

  try {
    const claims = await searchFactCheck(query);
    if (!claims.length) {
      setStatus(status, 'Aucune vérification publiée trouvée pour cette recherche.', 'error');
      return;
    }

    results.innerHTML = claims.map(claim => `<article class="result-card">
      <span class="news-meta">${claim.demo ? 'Démonstration d’interface — aucune donnée vérifiée' : 'Résultat réel — Google Fact Check Tools'}</span>
      <h2>${escapeHTML(claim.title)}</h2>
      <p>${escapeHTML(claim.summary)}</p>
      <p><strong>Source :</strong> ${escapeHTML(claim.source)}${claim.url ? ` — <a href="${escapeHTML(claim.url)}" target="_blank" rel="noopener">Voir la vérification ↗</a>` : ''}</p>
    </article>`).join('');
    setStatus(status, claimStatus(claims), claims[0].demo ? '' : 'success');
  } catch (error) {
    setStatus(status, `Erreur lors de la recherche : ${error.message}`, 'error');
  }
}

function claimStatus(claims) {
  return claims[0].demo
    ? 'Mode démonstration : cette plateforme n’a pas de verdict factuel pour cette affirmation.'
    : `${claims.length} vérification(s) publiée(s) obtenue(s).`;
}

async function fetchArxiv(query) {
  const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=8&sortBy=submittedDate&sortOrder=descending`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`arXiv a répondu avec le statut ${response.status}`);
  const xml = await response.text();
  const documentXML = new DOMParser().parseFromString(xml, 'application/xml');
  if (documentXML.querySelector('parsererror')) throw new Error('Réponse arXiv illisible');
  return [...documentXML.querySelectorAll('entry')].map(entry => {
    const id = entry.querySelector('id')?.textContent || '';
    const authors = [...entry.querySelectorAll('author name')]
      .map(author => author.textContent.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    return {
      title: entry.querySelector('title')?.textContent.replace(/\s+/g, ' ').trim() || 'Titre non disponible',
      authors,
      summary: entry.querySelector('summary')?.textContent.replace(/\s+/g, ' ').trim() || '',
      date: entry.querySelector('published')?.textContent || '',
      url: id
    };
  });
}

async function translateToFrench(text) {
  const cleanText = (text || '').replace(/\s+/g, ' ').trim();
  if (!cleanText) return '';

  const cacheKey = `arxiv-fr:${cleanText}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;
  } catch (error) {
    // LocalStorage peut être bloqué; la traduction reste possible.
  }

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=en|fr`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`API de traduction : statut ${response.status}`);
  const data = await response.json();
  const translated = data?.responseData?.translatedText?.trim();
  if (data.responseStatus !== 200 || !translated) {
    throw new Error(data.responseDetails || 'Traduction non disponible');
  }

  try { localStorage.setItem(cacheKey, translated); } catch (error) {}
  return translated;
}

async function runScienceSearch(query) {
  const status = document.querySelector('#scienceStatus');
  const target = document.querySelector('#scienceResults');
  setStatus(status, 'Chargement depuis arXiv…', 'loading');
  target.innerHTML = '';
  try {
    const publications = await fetchArxiv(query);
    if (!publications.length) {
      setStatus(status, 'Aucune publication trouvée.', 'error');
      return;
    }
    target.innerHTML = '<div class="loading">Traduction automatique des titres et résumés…</div>';

    const cards = await Promise.all(publications.map(async publication => {
      let translatedTitle = '';
      let translatedSummary = '';
      let translationError = '';

      try {
        translatedTitle = await translateToFrench(publication.title);
      } catch (error) {
        translatedTitle = '';
        translationError = 'Titre français indisponible.';
      }

      if (publication.summary) {
        try {
          translatedSummary = await translateToFrench(publication.summary.slice(0, 500));
        } catch (error) {
          translatedSummary = '';
          translationError = translationError
            ? `${translationError} Résumé français indisponible.`
            : 'Résumé français indisponible.';
        }
      }

      return `<article class="publication-card">
        <span class="news-meta">Publication scientifique · ${escapeHTML(formatDate(publication.date))}</span>
        <h2><span class="sr-only">Titre original en anglais : </span>${escapeHTML(publication.title)}</h2>
        ${translatedTitle ? `<p class="publication-french"><strong>Traduction française du titre :</strong> ${escapeHTML(translatedTitle)}</p>` : '<p class="publication-french">Titre français indisponible.</p>'}
        <p class="publication-authors"><strong>Auteurs :</strong> ${publication.authors.length ? escapeHTML(publication.authors.join(', ')) : 'Auteur non communiqué par arXiv.'}</p>
        ${publication.summary ? `
          <p><strong>Résumé original en anglais :</strong> ${escapeHTML(publication.summary.slice(0, 500))}${publication.summary.length > 500 ? '…' : ''}</p>
          ${translatedSummary
            ? `<p class="publication-translation"><strong>Traduction automatique en français :</strong> ${escapeHTML(translatedSummary)}${publication.summary.length > 500 ? '…' : ''}</p>`
            : '<p class="publication-translation">Résumé français indisponible.</p>'}
        ` : '<p>Résumé non communiqué par arXiv.</p>'}
        ${translationError && !publication.summary ? `<p class="status error">${escapeHTML(translationError)}</p>` : ''}
        <a class="text-link" href="${escapeHTML(publication.url)}" target="_blank" rel="noopener">Consulter sur arXiv ↗</a>
      </article>`;
    }));

    target.innerHTML = cards.join('');
    setStatus(status, `${publications.length} publication(s) obtenue(s) depuis arXiv.`, 'success');
  } catch (error) {
    setStatus(status, `Impossible de charger arXiv : ${error.message}`, 'error');
  }
}

function preliminaryAIAnalysis(text) {
  const normalized = text.toLower || text.toLowerCase();
  const urgencyWords = ['urgent', 'immédiatement', 'maintenant', 'partagez', 'bouleversant'];
  const certaintyWords = ['prouvé', 'officiel', 'garanti', 'sans aucun doute'];
  const matchedUrgency = urgencyWords.filter(word => normalized.includes(word));
  const matchedCertainty = certaintyWords.filter(word => normalized.includes(word));
  const repeatedExclamation = (text.match(/!/g) || []).length;
  const signals = matchedUrgency.length + matchedCertainty.length + (repeatedExclamation >= 3 ? 1 : 0);
  if (!text.trim()) return 'Saisissez du texte à examiner.';
  if (text.trim().length < 30) return 'Texte trop court pour une analyse locale utile. Fournissez au moins une phrase complète.';
  if (signals === 0) return 'Aucun indice linguistique simple détecté. Cette absence ne prouve pas que le contenu est authentique.';
  return `Indice(s) préliminaire(s) détecté(s) : langage d’urgence ou de certitude et/ou ponctuation excessive. Éléments relevés : ${[...matchedUrgency, ...matchedCertainty].join(', ') || 'exclamation répétée'}. Vérification humaine requise.`;
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('#currentDate').textContent = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  updateSearchCount();

  document.querySelector('.menu-toggle').addEventListener('click', event => {
    const menu = document.querySelector('#mainMenu');
    menu.classList.toggle('open');
    event.currentTarget.setAttribute('aria-expanded', menu.classList.contains('open'));
  });

  document.querySelectorAll('.nav-links a').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    const hash = link.getAttribute('href');
    history.pushState(null, '', hash);
    navigate(hash);
  }));
  window.addEventListener('popstate', () => navigate(location.hash));

  document.querySelector('#heroSearch').addEventListener('submit', event => {
    event.preventEvent?.();
    event.preventDefault();
    const query = document.querySelector('#heroQuery').value.trim();
    if (!query) return;
    history.pushState(null, '', '#verifier');
    navigate('#verifier');
    document.querySelector('#verificationQuery').value = query;
    runVerification(query);
  });

  document.querySelector('#verificationForm').addEventListener('submit', event => {
    event.preventDefault();
    const query = document.querySelector('#verificationQuery').value.trim();
    if (query) {
      runVerification(query);
      renderSearchHistory();
    }
  });

  renderSearchHistory();

  document.querySelector('#clearSearchHistory').addEventListener('click', clearSearchHistory);

  document.querySelector('#searchHistoryList').addEventListener('click', event => {
    const runButton = event.target.closest('.history-run');
    const deleteButton = event.target.closest('.history-delete');

    if (runButton) {
      const searches = getSearches();
      const search = searches[Number(runButton.dataset.index)];
      if (!search) return;
      document.querySelector('#verificationQuery').value = search.query;
      runVerification(search.query);
    }

    if (deleteButton) {
      deleteSearch(Number(deleteButton.dataset.index));
    }
  });

  document.querySelector('#newsSearch').addEventListener('submit', event => {
    event.preventEvent?.();
    event.preventDefault();
    const query = event.currentTarget.querySelector('input').value.trim();
    if (query) loadNews(query);
  });

  document.querySelector('#refreshNews').addEventListener('click', () => loadNews());
  ['sourceFilter', 'dateFilter', 'themeFilter'].forEach(id => {
    document.querySelector(`#${id}`).addEventListener('change', applyNewsFilters);
  });

  document.querySelector('#scienceSearch').addEventListener('submit', event => {
    event.preventDefault();
    const query = event.currentTarget.querySelector('input').value.trim();
    if (query) runScienceSearch(query);
  });

  document.querySelector('#aiForm').addEventListener('submit', event => {
    event.preventDefault();
    const text = document.querySelector('#aiText').value;
    const result = preliminaryAIAnalysis(text);
    const isUsableText = text.trim().length >= 30;
    setStatus(document.querySelector('#aiResult'), result, isUsableText ? 'success' : 'error');
  });

  navigate(location.hash);
  loadNews();
  runScienceSearch('misinformation AND media literacy');
});
