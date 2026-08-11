(() => {
  const buttonSelector = '[data-analytics-toggle]';
  const statusSelector = '[data-analytics-status]';

  function getPrivacyApi() {
    const api = window.MerrinAnalyticsPrivacy;
    if (!api) return null;
    if (typeof api.isOptedOut !== 'function') return null;
    if (typeof api.optOut !== 'function') return null;
    if (typeof api.optIn !== 'function') return null;
    return api;
  }

  function setStatus(message) {
    document.querySelectorAll(statusSelector).forEach((status) => {
      status.textContent = message;
    });
  }

  function syncControls() {
    const api = getPrivacyApi();
    const buttons = document.querySelectorAll(buttonSelector);

    if (!api) {
      buttons.forEach((button) => {
        button.disabled = true;
        button.textContent = 'Analytics not active';
        button.dataset.analyticsState = 'unavailable';
      });
      return false;
    }

    const optedOut = api.isOptedOut();
    buttons.forEach((button) => {
      button.disabled = false;
      button.textContent = optedOut ? 'Turn analytics on' : 'Turn analytics off';
      button.dataset.analyticsState = optedOut ? 'off' : 'on';
    });
    return true;
  }

  function handleClick(event) {
    const button = event.target?.closest?.(buttonSelector);
    if (!button) return;

    const api = getPrivacyApi();
    if (!api) {
      syncControls();
      return;
    }

    if (api.isOptedOut()) {
      api.optIn();
    } else {
      api.optOut();
    }

    syncControls();
    setStatus(
      api.isOptedOut()
        ? 'Analytics are off on this device for Vaelinya.'
        : 'Analytics are on on this device for Vaelinya.'
    );
  }

  document.addEventListener('click', handleClick);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncControls, { once: true });
  } else {
    syncControls();
  }
})();
