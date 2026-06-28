/**
 * popup.js — See More YT Videos
 *
 * Responsibilities:
 *   1. Load saved settings from chrome.storage.sync and initialize the slider
 *   2. On slider change, immediately save to storage and notify the content script
 *   3. Update the UI value display in real time
 */

'use strict';

// ============================================================================
// DOM Elements
// ============================================================================
const slider = document.getElementById('itemsPerRow');
const valueDisplay = document.getElementById('currentValue');
const rangeLabels = document.querySelectorAll('.range-labels span');

// ============================================================================
// Constants
// ============================================================================
const DEFAULT_VALUE = 5;
const MIN_VALUE = 3;
const MAX_VALUE = 8;

// ============================================================================
// UI Updates
// ============================================================================
function updateUI(value) {
  // Update the numeric display
  valueDisplay.textContent = value;

  // Adjust color warmth: higher values get a more intense red
  const hue = 0; // Keep in the red range
  const saturation = 40 + (value - MIN_VALUE) / (MAX_VALUE - MIN_VALUE) * 60;
  valueDisplay.style.color = `hsl(${hue}, ${saturation}%, 55%)`;

  // Highlight the active label under the slider
  rangeLabels.forEach(label => {
    const labelValue = parseInt(label.textContent, 10);
    if (labelValue === value) {
      label.classList.add('active');
    } else {
      label.classList.remove('active');
    }
  });
}

// ============================================================================
// Send Update to Content Script
// ============================================================================
function sendUpdateToTab(value) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    // Guard: ensure the active tab exists and has a URL
    if (tabs.length === 0 || !tabs[0].url) return;

    const tab = tabs[0];
    if (!tab.url.includes('youtube.com')) {
      console.log('[See More YT] Current page is not YouTube, skipping injection');
      return;
    }

    chrome.tabs.sendMessage(
      tab.id,
      { action: 'updateGridSize', value: value },
      (response) => {
        // If the content script hasn't loaded yet (e.g. extension just installed),
        // chrome.runtime.lastError will be set — this is harmless.
        if (chrome.runtime.lastError) {
          console.log(
            '[See More YT] Content script not ready yet — please refresh the YouTube page'
          );
          return;
        }
        if (response && response.success) {
          console.log(`[See More YT] Updated to ${response.value} videos per row`);
        }
      }
    );
  });
}

// ============================================================================
// Event Listener
// ============================================================================
slider.addEventListener('input', (event) => {
  const value = parseInt(event.target.value, 10);

  // 1. Update the UI immediately
  updateUI(value);

  // 2. Save to chrome.storage.sync
  chrome.storage.sync.set({ itemsPerRow: value }, () => {
    console.log(`[See More YT] Saved setting: ${value} videos per row`);
  });

  // 3. Push the update to the content script for instant application
  sendUpdateToTab(value);
});

// ============================================================================
// Initialization — load saved settings from storage
// ============================================================================
function initialize() {
  chrome.storage.sync.get({ itemsPerRow: DEFAULT_VALUE }, (data) => {
    const savedValue = data.itemsPerRow;

    // Validate the stored value is within range
    const value = (savedValue >= MIN_VALUE && savedValue <= MAX_VALUE)
      ? savedValue
      : DEFAULT_VALUE;

    // Set the slider position
    slider.value = value;

    // Update the UI
    updateUI(value);

    console.log(`[See More YT] Loaded setting: ${value} videos per row`);
  });
}

/**
 * Set version badge from manifest
 */
function setVersionBadge() {
  const badge = document.getElementById('versionBadge');
  if (badge) {
    const version = chrome.runtime.getManifest().version;
    badge.textContent = `v${version}`;
  }
}

// Start
document.addEventListener('DOMContentLoaded', () => {
  setVersionBadge();
  initialize();
});
