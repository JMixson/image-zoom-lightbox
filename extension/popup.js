const openOptionsButton = document.getElementById("open-options");

if (openOptionsButton) {
  openOptionsButton.addEventListener("click", async () => {
    await chrome.runtime.openOptionsPage();
    window.close();
  });
}
