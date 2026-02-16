export default {
  async fetch(request, env) {
    // --- 这里的 ID 和 Secret 务必填对喵！ ---
    const CLIENT_ID = env.GITHUB_CLIENT_ID; 
    const CLIENT_SECRET = env.GITHUB_CLIENT_SECRET;
    // ---------------------------------------

    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    
    // 允许波波所有的子域名访问
    const allowedOrigins = [
      "https://twinedoc.qzz.io",
      "https://cms.twinedoc.qzz.io"
    ];
    
    const corsHeaders = {
      "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true",
    };

    console.log(`[日志] 收到请求: ${request.method} ${url.pathname} 来自: ${origin}`);

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // 1. 引导登录
    if (url.pathname === '/auth') {
      console.log("[日志] 正在重定向到 GitHub...");
      const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=repo,user`;
      return Response.redirect(githubAuthUrl, 302);
    }

    // 2. 握手回调
    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      console.log(`[日志] 收到 GitHub 回调 code: ${code ? "已获取" : "未获取!"}`);

      if (!code) {
        return new Response("GitHub 没有给阿波 code 喵...", { status: 400, headers: corsHeaders });
      }

      // 换取 Token
      console.log("[日志] 正在向 GitHub 请求 Token...");
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'accept': 'application/json' },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code,
        }),
      });

      const result = await response.json();
      console.log(`[日志] GitHub 响应结果: ${result.access_token ? "成功拿到 Token" : "失败了: " + JSON.stringify(result)}`);

      // 返回结果并通知父窗口
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head><title>正在同步登录状态...</title></head>
        <body>
          // 在 Worker 的返回脚本部分替换
            <script>
              (function() {
                const result = ${JSON.stringify(result)};
                const message = "authorizing:github:success:" + JSON.stringify(result);
                
                // 1. 尝试发送给 opener (弹出框模式)
                if (window.opener) {
                  window.opener.postMessage(message, "https://cms.twinedoc.qzz.io");
                  // 兼容某些老版本 CMS
                  window.opener.postMessage(result, "https://cms.twinedoc.qzz.io");
                }
                
                // 2. 尝试发送给 parent (如果 CMS 是在 iframe 里跑的)
                if (window.parent && window.parent !== window) {
                  window.parent.postMessage(message, "https://cms.twinedoc.qzz.io");
                }
            
                // 给波波一个视觉反馈，看到这个就说明 Token 真的发出去了
                document.body.innerHTML = "<h1>登录成功喵！</h1><p>正在同步到 CMS 页面...</p>";
            
                setTimeout(() => {
                  window.close();
                }, 5000); // 稍微多等一会儿，确保消息发出
              })();
            </script>
          <p>登录成功，正在返回 CMS... 如果窗口没有自动关闭，请手动关闭喵~</p>
        </body>
        </html>`,
        { headers: { 'content-type': 'text/html;charset=UTF-8', ...corsHeaders } }
      );
    }

    return new Response("阿波的 API 哨所正在运行中~", { headers: corsHeaders });
  }
};
