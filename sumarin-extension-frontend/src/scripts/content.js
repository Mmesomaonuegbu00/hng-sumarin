const extractPageContent = () => {
  const selectors = [
    'article',
    'main',
    '.post-body',
    '.article-body',
    '.content',
    '#content'
  ];

  let container = null;

  for (const selector of selectors) {
    const found = document.querySelector(selector);
    if (found) {
      container = found;
      break;
    }
  }

  const root = container || document.body;

  const textContent = Array.from(
    root.querySelectorAll('p, h1, h2, h3, li')
  )
    .map(el => el.innerText?.trim())
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 12000);

  return {
    title: document.title,
    url: location.href,
    text: textContent
  };
};

// ONLY CONTENT EXTRACTION NOW
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_CONTENT") {
    sendResponse(extractPageContent());
  }

  return true;
});