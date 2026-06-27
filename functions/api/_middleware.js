// functions/_middleware.js
// 此中间件会拦截所有请求（除静态资源外），要求 Basic Auth 登录

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // 放行静态资源（避免对 css/js/图片等资源也弹窗，但如果你想完全保护，可以删除此部分）
  const publicPaths = ['/css/', '/js/', '/images/', '/favicon.ico', '/api/login'];
  if (publicPaths.some(path => url.pathname.startsWith(path))) {
    return next();
  }

  // 如果未设置 BASIC_USER，则跳过认证（兼容原逻辑，可当作开关）
  if (!env.BASIC_USER) {
    return next();
  }

  // 检查 Authorization 头
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Telegraph Image"' }
    });
  }

  // 解码用户名密码
  const base64 = authHeader.split(' ')[1];
  const [email, password] = atob(base64).split(':');

  // 调用邮箱 API 验证
  const isValid = await verifyWithMailApi(email, password, env);
  if (!isValid) {
    return new Response('Invalid credentials', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Telegraph Image"' }
    });
  }

  // ✅ 验证通过，将用户信息注入 context.data，供后续函数使用
  context.data.user = { email };
  return next();
}

/**
 * 调用你的邮箱服务 API 验证账号密码
 */
async function verifyWithMailApi(email, password, env) {
  const MAIL_API_URL = env.MAIL_API_URL || 'https://mail.mybeloved.dpdns.org/api/login';
  try {
    const response = await fetch(MAIL_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Mail API verification failed:', error);
    return false;
  }
}