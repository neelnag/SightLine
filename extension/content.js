// Content script - runs on every webpage
// This allows interaction with the page content

console.log('Content script loaded');

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  if (request.type === 'EXECUTE_ACTION') {
    executePageAction(request.action);
    sendResponse({ success: true });
  } else if (request.type === 'READ_PAGE') {
    const content = document.body.innerText;
    sendResponse({ success: true, content });
  }
});

// Listen for messages from the service worker
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  
  if (event.data.type && event.data.type === 'EXECUTE_ACTION') {
    executePageAction(event.data.action);
  }
});

const executePageAction = (action) => {
  try {
    switch (action.type) {
      case 'click':
        const clickElement = document.querySelector(action.selector);
        if (clickElement) {
          clickElement.click();
          console.log('Clicked:', action.selector);
        } else {
          console.log('Element not found:', action.selector);
        }
        break;
      
      case 'fill':
        const input = document.querySelector(action.selector);
        if (input) {
          input.value = action.value;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          console.log('Filled:', action.selector);
        }
        break;
      
      case 'read':
        return document.body.innerText;
      
      case 'scroll':
        const direction = action.direction === 'up' ? -1 : 1;
        window.scrollBy(0, direction * 300);
        break;
      
      case 'navigate':
        window.location.href = action.url;
        break;
    }
  } catch (error) {
    console.error('Error executing action:', error);
  }
};
