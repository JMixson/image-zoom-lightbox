'use strict';

const openOptionsButton = document.getElementById('open-options');

if (openOptionsButton) {
  openOptionsButton.addEventListener('click', async () => {
    try {
      await chrome.runtime.openOptionsPage();
    } catch (error) {
      console.error('Failed to open options page:', error);
    }

    window.close();
  });
}
