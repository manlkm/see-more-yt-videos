/**
 * content.js — YouTube Grid Customizer
 *
 * Triple-layer defense strategy:
 *   Layer 1: CSS injection via <style> tag (static override)
 *   Layer 2: JS inline style override (fights YouTube's dynamic inline styles)
 *   Layer 3: MutationObserver (watches for YouTube recalculations and re-overrides)
 *
 * SPA navigation: listens for the yt-navigate-finish custom event
 */

'use strict';

// ============================================================================
// Constants & Defaults
// ============================================================================
const STYLE_ID = 'see-more-yt-videos-style';
const DEFAULT_ITEMS_PER_ROW = 5;
const MIN_ITEMS = 3;
const MAX_ITEMS = 8;

// ============================================================================
// Layer 1: CSS Injection — create a <style> tag in <head>
// ============================================================================
function createStyleElement() {
  // Avoid creating duplicate style elements
  if (document.getElementById(STYLE_ID)) {
    return document.getElementById(STYLE_ID);
  }
  const style = document.createElement('style');
  style.id = STYLE_ID;
  document.head.appendChild(style);
  return style;
}

/**
 * Generate override CSS rules based on the user's items-per-row setting.
 *
 * YouTube CSS Custom Properties targeted:
 *   --ytd-rich-grid-items-per-row       — Home/subscriptions main grid
 *   --ytd-rich-grid-posts-per-row       — Community posts grid
 *   --ytd-rich-grid-slim-items-per-row  — Shorts slim shelf grid
 *   --ytd-rich-grid-item-max-width      — Max width of each video item
 *   --ytd-rich-grid-item-min-width      — Min width of each video item
 */
function generateCSS(value) {
  const itemsPerRow = parseInt(value, 10);

  return `
    /* === See More YT Videos — Custom Grid Size === */

    /* Main grid: home page and subscriptions video list */
    ytd-rich-grid-renderer {
      --ytd-rich-grid-items-per-row: ${itemsPerRow} !important;
      --ytd-rich-grid-posts-per-row: ${itemsPerRow} !important;
    }

    /* Slim grid: Shorts shelf */
    ytd-rich-shelf-renderer {
      --ytd-rich-grid-slim-items-per-row: ${Math.min(itemsPerRow + 2, 10)} !important;
    }

    /*
     * Adjust item min/max widths proportionally.
     * Default max-width ~360px, min-width ~300px (for 5 items per row).
     * These scale down as items-per-row increases to ensure proper grid fill.
     */
    ytd-rich-item-renderer {
      --ytd-rich-grid-item-max-width: ${Math.floor(100 / itemsPerRow * 36)}px !important;
      --ytd-rich-grid-item-min-width: ${Math.floor(100 / itemsPerRow * 30)}px !important;
    }

    /*
     * Also override at :root and html level.
     * YouTube sometimes defines these variables high up in the cascade.
     */
    :root {
      --ytd-rich-grid-items-per-row: ${itemsPerRow} !important;
    }

    html {
      --ytd-rich-grid-items-per-row: ${itemsPerRow} !important;
    }
  `;
}

function updateStyleTag(value) {
  const style = createStyleElement();
  style.textContent = generateCSS(value);

  // Also set on :root directly — sometimes more effective
  document.documentElement.style.setProperty(
    '--ytd-rich-grid-items-per-row', value, 'important'
  );
}

// ============================================================================
// Layer 2: Direct inline style override — fights YouTube's dynamic inline styles
// ============================================================================
function applyInlineOverride(value) {
  const itemsPerRow = parseInt(value, 10);

  // Override main grid elements
  const gridRenderers = document.querySelectorAll('ytd-rich-grid-renderer');
  gridRenderers.forEach(grid => {
    grid.style.setProperty('--ytd-rich-grid-items-per-row', itemsPerRow.toString());
    grid.style.setProperty('--ytd-rich-grid-posts-per-row', itemsPerRow.toString());
  });

  // Override slim shelf elements (Shorts)
  const shelfRenderers = document.querySelectorAll('ytd-rich-shelf-renderer');
  shelfRenderers.forEach(shelf => {
    shelf.style.setProperty(
      '--ytd-rich-grid-slim-items-per-row',
      Math.min(itemsPerRow + 2, 10).toString()
    );
  });

  // Override individual item elements
  const itemRenderers = document.querySelectorAll('ytd-rich-item-renderer');
  itemRenderers.forEach(item => {
    item.style.setProperty(
      '--ytd-rich-grid-item-max-width',
      Math.floor(100 / itemsPerRow * 36).toString() + 'px'
    );
    item.style.setProperty(
      '--ytd-rich-grid-item-min-width',
      Math.floor(100 / itemsPerRow * 30).toString() + 'px'
    );
  });
}

// ============================================================================
// Layer 3: MutationObserver — watch for YouTube's dynamic changes and respond
// ============================================================================
let observer = null;
let currentValue = DEFAULT_ITEMS_PER_ROW;

function setupObserver(value) {
  currentValue = value;

  // Clean up previous observer
  if (observer) {
    observer.disconnect();
    observer = null;
  }

  // Find the target element
  const gridRenderer = document.querySelector('ytd-rich-grid-renderer');
  if (!gridRenderer) {
    // Element doesn't exist yet (page still loading) — will retry later
    return;
  }

  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      // Watch for inline style attribute changes
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        // YouTube recalculated the grid style — immediately override with our value
        applyInlineOverride(currentValue);
        break; // One override per batch of mutations is sufficient
      }
    }
  });

  // Observe ytd-rich-grid-renderer for attribute changes
  observer.observe(gridRenderer, {
    attributes: true,
    attributeFilter: ['style']
  });
}

// ============================================================================
// SPA Navigation — listen for YouTube's custom navigation event
// ============================================================================
function onNavigationFinish() {
  // After YouTube SPA navigation, the DOM may have been replaced.
  // Re-inject CSS and re-attach the observer.
  updateStyleTag(currentValue);

  // Slight delay to ensure YouTube's JS has finished DOM updates
  setTimeout(() => {
    applyInlineOverride(currentValue);
    setupObserver(currentValue);
  }, 100);
}

document.addEventListener('yt-navigate-finish', onNavigationFinish);

// ============================================================================
// Window Resize — re-apply overrides when the user resizes the window
// ============================================================================
let resizeTimeout = null;
window.addEventListener('resize', () => {
  // Debounce: avoid excessive calls during resize
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    applyInlineOverride(currentValue);
  }, 150);
});

// ============================================================================
// Message Listener — receive real-time updates from popup.js
// ============================================================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateGridSize' && typeof message.value !== 'undefined') {
    const value = parseInt(message.value, 10);

    // Validate the value range
    if (value >= MIN_ITEMS && value <= MAX_ITEMS) {
      currentValue = value;

      // Execute all three layers of defense
      updateStyleTag(value);          // Layer 1: CSS
      applyInlineOverride(value);     // Layer 2: Inline style
      setupObserver(value);           // Layer 3: Observer (re-attach)

      // Send success status back to popup
      sendResponse({ success: true, value: value });
    } else {
      sendResponse({ success: false, error: 'Value out of range' });
    }
  }
  // Return true to indicate async response
  return true;
});

// ============================================================================
// Initialization — load saved settings and apply
// ============================================================================
function initialize() {
  chrome.storage.sync.get({ itemsPerRow: DEFAULT_ITEMS_PER_ROW }, (data) => {
    const value = data.itemsPerRow;
    currentValue = value;

    // Layer 1: Inject CSS (runs at document_start, <head> usually exists by now)
    if (document.head) {
      updateStyleTag(value);
    } else {
      // Rare edge case: <head> not ready yet
      document.addEventListener('DOMContentLoaded', () => {
        updateStyleTag(value);
      });
    }

    // Layers 2 & 3: Wait for DOM readiness.
    // YouTube's custom elements only appear after DOM parsing completes.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        // Extra delay to ensure YouTube's Polymer elements have initialized
        setTimeout(() => {
          applyInlineOverride(value);
          setupObserver(value);
        }, 500);
      });
    } else {
      // DOM already ready
      setTimeout(() => {
        applyInlineOverride(value);
        setupObserver(value);
      }, 500);
    }
  });
}

// Start
initialize();
