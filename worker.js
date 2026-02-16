export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 跨域头配置：允许波波的文档域名访问
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://twinedoc.qzz.io",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // 处理预检请求
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 1. 引导登录：修正了 /authorize 路径
    // 当 CMS 请求 https://your-worker.dev/auth 时触发
    if (url.pathname === '/auth') {
      const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&scope=repo,user`;
      return Response.redirect(githubAuthUrl, 302);
    }

    // 2. 握手回调：处理 GitHub 返回的 code 并换取 access_token
    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      
      if (!code) {
        return new Response("授权码丢失啦 qwq", { status: 400, headers: corsHeaders });
      }

      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 
          'content-type': 'application/json', 
          'accept': 'application/json' 
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const result = await response.json();
      
      // 返回一段 HTML 脚本，把 token 传递回给 CMS 窗口并关闭弹窗
      return new Response(
        `<script>
          const result = ${JSON.stringify(result)};
          const target = window.opener || window.parent;
          if (result.access_token) {
            target.postMessage("authorizing:github:success:" + JSON.stringify(result), "*");
          } else {
            target.postMessage("authorizing:github:error:" + (result.error_description || "登录失败"), "*");
          }
          window.close();
        </script>`,
        { headers: { 'content-type': 'text/html;charset=UTF-8', ...corsHeaders } }
      );
    }

    // 根目录默认返回
    return new Response("阿波的 API 正在待命！(๑òωó๑)\n请通过 /auth 进行授权。", { 
      headers: { 'content-type': 'text/plain;charset=UTF-8', ...corsHeaders } 
    });
  }
};
