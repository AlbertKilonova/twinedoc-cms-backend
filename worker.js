export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://twinedoc.qzz.io", // 允许你的主域名访问
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // 1. 引导登录
    if (url.pathname === '/auth') {
      return Response.redirect(
        `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&scope=repo,user`,
        302
      );
    }

    // 2. 握手回调
    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'accept': 'application/json' },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
      const result = await response.json();
      return new Response(
        `<script>
          window.opener.postMessage("authorizing:github:success:${JSON.stringify(result)}", "*");
          window.close();
        </script>`,
        { headers: { 'content-type': 'text/html', ...corsHeaders } }
      );
    }
    return new Response("阿波的 API 正在喵喵叫~", { headers: corsHeaders });
  }
};