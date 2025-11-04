export default {
    async fetch(request, env, ctx) {
      // Try to serve the requested file
      let response = await env.ASSETS.fetch(request);
  
      // If the file isn't found, fall back to index.html (for React SPA routes)
      if (response.status === 404) {
        const url = new URL(request.url);
        url.pathname = "/index.html";
        response = await env.ASSETS.fetch(url);
      }
  
      return response;
    },
  };
  