// ============================================================
// CF StatLens - content.js (Final Production Build)
// ============================================================

(async () => {

  // ----------------------------------------------------------
  // STEP 1: Extract handle from URL
  // ----------------------------------------------------------
  const handle = window.location.pathname
    .split('/profile/')[1]
    ?.split('/')[0]
    ?.trim();

  if (!handle) return;

  // ----------------------------------------------------------
  // STEP 2: Check localStorage cache (10 min expiry)
  // ----------------------------------------------------------
  const CACHE_KEY  = `cf_statlens_${handle}`;
  const CACHE_DUR  = 10 * 60 * 1000;

  let dayMap   = null;
  let metaData = null; 

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { timestamp, data, meta } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DUR) {
        dayMap   = data;
        metaData = meta;
        console.log('[CF StatLens] Loaded from cache ✓');
      }
    }
  } catch {
    localStorage.removeItem(CACHE_KEY);
  }

  // ----------------------------------------------------------
  // STEP 3: Fetch from CF API if no valid cache
  // ----------------------------------------------------------
  if (!dayMap) {
    try {
      console.log('[CF StatLens] Fetching from CF API for:', handle);

      const res = await fetch(
        `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=10000`
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.status !== 'OK') throw new Error(json.comment);

      // --------------------------------------------------------
      // STEP 4: Build per-day stats map
      // --------------------------------------------------------
      dayMap = {};

      json.result.forEach(sub => {
        const date = new Date(sub.creationTimeSeconds * 1000);
        const key  = date.toLocaleDateString('en-CA'); // YYYY-MM-DD

        if (!dayMap[key]) {
          dayMap[key] = {
            total    : 0,
            accepted : 0,
            tags     : {},   
            ratings  : []    
          };
        }

        dayMap[key].total++;
        if (sub.verdict === 'OK') {
          dayMap[key].accepted++;

          if (sub.problem?.tags) {
            sub.problem.tags.forEach(tag => {
              dayMap[key].tags[tag] = (dayMap[key].tags[tag] || 0) + 1;
            });
          }

          if (sub.problem?.rating) {
            dayMap[key].ratings.push(sub.problem.rating);
          }
        }
      });

      // --------------------------------------------------------
      // STEP 5: Compute Global Meta (Personal Best)
      // --------------------------------------------------------
      metaData = computeMeta(dayMap);

      localStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp : Date.now(),
        data      : dayMap,
        meta      : metaData
      }));

    } catch (err) {
      console.error('[CF StatLens] API fetch failed:', err);
      return;
    }
  }

  // ----------------------------------------------------------
  // STEP 6: Inject tooltip + attach to heatmap
  // ----------------------------------------------------------
  injectTooltip();

  const observer = new MutationObserver(() => attachHeatmapListeners(dayMap, metaData));
  observer.observe(document.body, { childList: true, subtree: true });
  attachHeatmapListeners(dayMap, metaData);

})();

// ============================================================
// COMPUTE META: Track both Max Accepted and Max Total
// ============================================================

function computeMeta(dayMap) {
  const allKeys = Object.keys(dayMap);
  let maxTotal = 0, maxTotalDay = null;
  let maxAcc   = 0, maxAccDay   = null;

  allKeys.forEach(k => {
    // Track most active day (total grind)
    if (dayMap[k].total > maxTotal) {
      maxTotal = dayMap[k].total;
      maxTotalDay = k;
    }
    // Track most productive day (accepted only)
    if (dayMap[k].accepted > maxAcc) {
      maxAcc = dayMap[k].accepted;
      maxAccDay = k;
    }
  });
  return { maxTotal, maxTotalDay, maxAcc, maxAccDay };
}

// ============================================================
// INJECT TOOLTIP HTML (once)
// ============================================================

function injectTooltip() {
  if (document.getElementById('cf-statlens-tooltip')) return;

  const tooltip = document.createElement('div');
  tooltip.id    = 'cf-statlens-tooltip';
  tooltip.innerHTML = `
    <div id="cf-tt-header">
      <div id="cf-tt-date"></div>
      <div id="cf-tt-badges"></div>
    </div>

    <div class="cf-tt-section">
      <div class="cf-tt-row">
        <span class="cf-tt-label">Total Submissions</span>
        <span id="cf-tt-total" class="cf-tt-value"></span>
      </div>
      <div class="cf-tt-row">
        <span class="cf-tt-label">Accepted</span>
        <span id="cf-tt-accepted" class="cf-tt-green"></span>
      </div>
      <div class="cf-tt-row">
        <span class="cf-tt-label">Failed</span>
        <span id="cf-tt-failed" class="cf-tt-red"></span>
      </div>
    </div>

    <div class="cf-tt-divider"></div>

    <div class="cf-tt-section">
      <div class="cf-tt-accuracy-label">
        <span>Accuracy</span>
        <span id="cf-tt-pct"></span>
      </div>
      <div class="cf-tt-bar-bg">
        <div class="cf-tt-bar-fill" id="cf-tt-bar"></div>
      </div>
    </div>

    <div class="cf-tt-divider"></div>

    <div class="cf-tt-section" id="cf-tt-tags-section">
      <div class="cf-tt-section-title">Top Topics</div>
      <div id="cf-tt-tags"></div>
    </div>

    <div class="cf-tt-divider"></div>

    <div class="cf-tt-section" id="cf-tt-diff-section">
      <div class="cf-tt-section-title">Difficulty Breakdown</div>
      <div id="cf-tt-difficulty"></div>
    </div>
    
    <div class="cf-tt-divider"></div>
    
    <div id="cf-tt-pb-footer" style="display: flex; flex-direction: column; gap: 4px; font-size: 10px; text-align: center; margin-top: 4px;"></div>
    `;
    document.body.appendChild(tooltip);
}

// ============================================================
// ATTACH LISTENERS to CF heatmap rects
// ============================================================

function attachHeatmapListeners(dayMap, metaData) {
  const rects = document.querySelectorAll('svg rect.day[data-date]');
  if (rects.length === 0) return;

  rects.forEach(rect => {
    if (rect.dataset.cfAttached) return;
    rect.dataset.cfAttached = '1';

    // Kill native browser tooltip
    rect.removeAttribute('title');
    rect.removeAttribute('data-title');
    rect.removeAttribute('data-original-title');
    const titleNode = rect.querySelector('title');
    if (titleNode) titleNode.remove();

    const rawDate = rect.getAttribute('data-date');
    if (!rawDate) return;
    const [mm, dd, yyyy] = rawDate.split('/');
    const dateKey = `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;

    rect.addEventListener('mouseenter', (e) => {
      rect.style.opacity = '0.75';
      showTooltip(e, dayMap[dateKey], dateKey, metaData, dayMap);
    });

    rect.addEventListener('mousemove', moveTooltip);

    rect.addEventListener('mouseleave', () => {
      rect.style.opacity = '1';
      hideTooltip();
    });
  });
}

// ============================================================
// SHOW TOOLTIP
// ============================================================

function showTooltip(e, stats, dateKey, metaData, dayMap) {
  const tooltip = document.getElementById('cf-statlens-tooltip');
  if (!tooltip) return;

  const [yyyy, mm, dd] = dateKey.split('-');
  const formatted = new Date(+yyyy, +mm - 1, +dd).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  document.getElementById('cf-tt-date').textContent = formatted;

  // --- Calculate Local Streak ---
  let localStreak = 0;
  if (stats) {
    let cursor = new Date(+yyyy, +mm - 1, +dd);
    while (true) {
      const k = cursor.toLocaleDateString('en-CA');
      if (!dayMap[k]) break;
      localStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  const badgesEl = document.getElementById('cf-tt-badges');
  badgesEl.innerHTML = '';
  if (localStreak > 0) {
    const s = document.createElement('span');
    s.className   = 'cf-badge cf-badge-fire';
    s.textContent = `🔥 ${localStreak}d streak`;
    badgesEl.appendChild(s);
  }

    // --- Global PB Target (Productive & Active) ---
    const pbFooter = document.getElementById('cf-tt-pb-footer');
    pbFooter.innerHTML = ''; // Clear previous

    if (metaData) {
        let footerHTML = '';
    
    // Line 1: Most Accepted (The real target)
    if (metaData.maxAcc > 0) {
      const [aY, aM, aD] = metaData.maxAccDay.split('-');
      const accDate = new Date(+aY, +aM - 1, +aD).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      footerHTML += `<div style="color: #a6e3a1;">🏆 Best AC: <b>${metaData.maxAcc} solved</b> on ${accDate}</div>`;
    }
    
    // Line 2: Most Total Submissions (The grind)
    if (metaData.maxTotal > 0) {
      const [tY, tM, tD] = metaData.maxTotalDay.split('-');
      const totDate = new Date(+tY, +tM - 1, +tD).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      footerHTML += `<div style="color: #f9e2af;">⭐ Top Grind: <b>${metaData.maxTotal} subs</b> on ${totDate}</div>`;
    }
    
    pbFooter.innerHTML = footerHTML;
  }

  if (!stats) {
    document.getElementById('cf-tt-total').textContent    = '0';
    document.getElementById('cf-tt-accepted').textContent = '0';
    document.getElementById('cf-tt-failed').textContent   = '0';
    document.getElementById('cf-tt-pct').textContent      = 'N/A';
    document.getElementById('cf-tt-bar').style.width      = '0%';
    document.getElementById('cf-tt-tags').innerHTML       = '<span class="cf-tt-empty">No submissions</span>';
    document.getElementById('cf-tt-difficulty').innerHTML = '<span class="cf-tt-empty">—</span>';
    tooltip.classList.add('cf-visible');
    moveTooltip(e);
    return;
  }

  const pct    = Math.round((stats.accepted / stats.total) * 100);
  const failed = stats.total - stats.accepted;

  document.getElementById('cf-tt-total').textContent    = stats.total;
  document.getElementById('cf-tt-accepted').textContent = stats.accepted;
  document.getElementById('cf-tt-failed').textContent   = failed;
  document.getElementById('cf-tt-pct').textContent      = pct + '%';

  const bar = document.getElementById('cf-tt-bar');
  bar.style.width = pct + '%';
  if      (pct >= 70) bar.style.background = '#a6e3a1';
  else if (pct >= 40) bar.style.background = '#f9e2af';
  else                bar.style.background = '#f38ba8';

  const tagsEl = document.getElementById('cf-tt-tags');
  tagsEl.innerHTML = '';
  const sortedTags = Object.entries(stats.tags || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
  
  if (sortedTags.length === 0) {
    tagsEl.innerHTML = '<span class="cf-tt-empty">No tag data</span>';
  } else {
    sortedTags.forEach(([tag, count]) => {
      const chip = document.createElement('span');
      chip.className   = 'cf-tag-chip';
      chip.textContent = `${tag} ×${count}`;
      tagsEl.appendChild(chip);
    });
  }

  const diffEl = document.getElementById('cf-tt-difficulty');
  diffEl.innerHTML = '';
  const ratings = stats.ratings || [];
  
  if (ratings.length === 0) {
    diffEl.innerHTML = '<span class="cf-tt-empty">No rated problems</span>';
  } else {
    const exactCounts = {};
    ratings.forEach(r => exactCounts[r] = (exactCounts[r] || 0) + 1);
    
    const sortedRatings = Object.keys(exactCounts).sort((a, b) => a - b);
    
    sortedRatings.forEach(rating => {
      const count = exactCounts[rating];
      let color = '#a6e3a1'; 
      if (rating > 1200 && rating <= 1800) color = '#f9e2af'; 
      if (rating > 1800) color = '#f38ba8'; 
      
      const row = document.createElement('div');
      row.className = 'cf-diff-row';
      row.innerHTML = `
        <span class="cf-diff-label">Rated ${rating}</span>
        <span class="cf-diff-count" style="color:${color}">${count}</span>
      `;
      diffEl.appendChild(row);
    });
  }

  tooltip.classList.add('cf-visible');
  moveTooltip(e);
}

// ============================================================
// MOVE + HIDE TOOLTIP
// ============================================================

function moveTooltip(e) {
  const tooltip = document.getElementById('cf-statlens-tooltip');
  if (!tooltip) return;

  const offset    = 16;
  const tipWidth  = 250;
  const tipHeight = 320;

  const x = (e.clientX + offset + tipWidth  > window.innerWidth)
    ? e.clientX - tipWidth  - offset
    : e.clientX + offset;

  const y = (e.clientY + offset + tipHeight > window.innerHeight)
    ? e.clientY - tipHeight - offset
    : e.clientY + offset;

  tooltip.style.left = x + 'px';
  tooltip.style.top  = y + 'px';
}

function hideTooltip() {
  const el = document.getElementById('cf-statlens-tooltip');
  if (el) el.classList.remove('cf-visible');
}