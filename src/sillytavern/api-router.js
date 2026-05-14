/**
 * API Router — routes story/var-sum tasks to primary or secondary API.
 * Vanilla JS port from api-router.ts.
 */

function createApiRouter(settings, deps) {
  const fetchImpl = (deps && deps.fetch) || globalThis.fetch;
  const useSecondary = !!(settings.secondary && settings.secondary.enabled);

  function targetFor(task) {
    if (!useSecondary) return 'primary';
    return task === 'story' ? 'primary' : 'secondary';
  }

  function endpointFor(target) {
    if (target === 'secondary' && settings.secondary) {
      return {
        baseUrl: settings.secondary.baseUrl,
        apiKey: settings.secondary.apiKey,
        model: settings.secondary.model,
      };
    }
    return { baseUrl: settings.baseUrl, apiKey: settings.apiKey, model: settings.model };
  }

  async function callOnce(target, body) {
    const ep = endpointFor(target);
    return await fetchImpl(ep.baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + ep.apiKey,
      },
      body: JSON.stringify(Object.assign({}, body, { model: ep.model })),
    });
  }

  async function call(task, payload) {
    const target = targetFor(task);
    if (target === 'secondary') {
      try {
        const res = await callOnce('secondary', payload);
        if (!res.ok) throw new Error('secondary HTTP ' + res.status);
        return { targetUsed: 'secondary', response: res };
      } catch {
        const res = await callOnce('primary', payload);
        return { targetUsed: 'primary', response: res };
      }
    }
    const res = await callOnce('primary', payload);
    return { targetUsed: 'primary', response: res };
  }

  return { targetFor, call };
}
