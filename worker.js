export default {
    async fetch(request, env, ctx) {
      try {
        return await env.ASSETS.fetch(request)
      } catch (e) {
        // fallback to index.html for SPA routes
        const url = new URL(request.url)
        url.pathname = "/index.html"
        return await env.ASSETS.fetch(url)
      }
    },
  }
  