// Adaptador minimalista per servir els actius estàtics a l’allotjament.
export default {
  async fetch(request, env) {
    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) return asset;

    const acceptsHtml = request.headers.get('accept')?.includes('text/html');
    if (acceptsHtml) return env.ASSETS.fetch(new Request(new URL('/', request.url)));
    return asset;
  }
};
