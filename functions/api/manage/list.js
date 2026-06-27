// functions/api/manage/list.js (带分页)

export async function onRequest(context) {
  const { request, env, data } = context;
  const url = new URL(request.url);

  const user = data?.user;
  if (!user || !user.email) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const userEmail = user.email;

  // 获取所有图片（个人使用，数量不大，直接全取）
  const allFiles = await env.img_url.list({ limit: 1000 });
  const userFiles = [];
  for (const key of allFiles.keys) {
    const meta = await env.img_url.getWithMetadata(key.name);
    if (meta.metadata && meta.metadata.userId === userEmail) {
      userFiles.push({
        id: key.name,
        ...meta.metadata
      });
    }
  }
  userFiles.sort((a, b) => (b.TimeStamp || 0) - (a.TimeStamp || 0));

  // 解析分页参数
  const raw = url.searchParams.get("limit");
  let limit = parseInt(raw || "20", 10);
  if (!Number.isFinite(limit) || limit <= 0) limit = 20;
  if (limit > 100) limit = 100;

  const cursor = url.searchParams.get("cursor");
  const start = cursor ? parseInt(cursor, 10) : 0;
  const end = Math.min(start + limit, userFiles.length);

  const pageItems = userFiles.slice(start, end);

  return new Response(JSON.stringify({
    data: pageItems,
    total: userFiles.length,
    cursor: end < userFiles.length ? String(end) : undefined
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}