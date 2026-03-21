// Service Worker for the extension
// Handles background tasks and messaging

console.log('Background service worker loaded');

chrome.runtime.onInstalled.addListener(() => {
  console.log('Voice Navigator extension installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Service worker received message:', request);
  
  if (request.type === 'EXECUTE') {
    // Forward action to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'EXECUTE_ACTION',
          action: request.action
        });
      }
    });
  }
  
  sendResponse({ received: true });
});
