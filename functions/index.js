// Startseite: Markdown ausliefern, wenn ein Agent "Accept: text/markdown" schickt.
export async function onRequest(context) {
  const accept = context.request.headers.get('Accept') || '';
  const iMd = accept.toLowerCase().indexOf('text/markdown');
  const iHtml = accept.toLowerCase().indexOf('text/html');
  if (iMd !== -1 && (iHtml === -1 || iMd < iHtml)) {
    const md = await context.env.ASSETS.fetch(new URL('/index.md', context.request.url));
    return new Response(await md.text(), {
      status: 200,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Vary': 'Accept' }
    });
  }
  const res = await context.next();
  const out = new Response(res.body, res);
  out.headers.append('Vary', 'Accept');
  return out;
}
