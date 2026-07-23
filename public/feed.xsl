<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="ca">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <meta name="robots" content="noindex"/>
        <title><xsl:value-of select="rss/channel/title"/></title>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="crossorigin"/>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&amp;family=Newsreader:opsz,wght@6..72,500;6..72,600&amp;family=Onest:wght@400;500;600;700&amp;display=swap" rel="stylesheet"/>
        <style>
          :root{--ink:#111526;--paper:#f7f8fc;--blue:#3d63ff;--violet:#8c5bff;--muted:#657086;--line:#e1e5ef}
          *{box-sizing:border-box}
          body{margin:0;background:var(--paper);color:var(--ink);font-family:"Onest",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
          .wrap{max-width:760px;margin:0 auto;padding:40px 22px 80px}
          .top{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:34px}
          .brand{display:inline-flex;align-items:center;gap:11px;color:var(--ink);text-decoration:none}
          .brand .mark{display:grid;width:40px;height:40px;place-items:center;border-radius:12px 12px 12px 4px;color:#fff;background:linear-gradient(145deg,var(--blue),var(--violet));font-weight:800;font-size:17px;letter-spacing:-.08em}
          .brand .name{display:flex;flex-direction:column;line-height:.95;letter-spacing:-.04em}
          .brand .name strong{font-size:13px;font-weight:500}
          .brand .name span{font-size:17px;font-weight:800}
          .back{padding:9px 15px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--ink);font-size:12px;font-weight:600;text-decoration:none;white-space:nowrap}
          .back:hover{border-color:var(--blue);color:var(--blue)}
          h1{margin:0 0 6px;font:600 clamp(30px,6vw,42px)/1.05 "Newsreader",Georgia,serif;letter-spacing:-.03em}
          .lede{margin:0 0 26px;color:var(--muted);font-size:15px;line-height:1.6}
          .info{margin:0 0 40px;padding:20px 22px;border:1px solid #d5ddff;border-radius:18px;background:#eef1ff}
          .info strong{display:block;margin-bottom:6px;font-size:14px}
          .info p{margin:0;color:#3a4a80;font-size:13px;line-height:1.6}
          .info code{padding:2px 7px;border-radius:6px;background:#fff;font-family:"IBM Plex Mono",monospace;font-size:12px}
          article{padding:22px 0;border-top:1px solid var(--line)}
          .meta{margin:0 0 8px;color:var(--blue);font:600 10px "IBM Plex Mono",monospace;text-transform:uppercase;letter-spacing:.06em}
          article h2{margin:0 0 8px;font-size:22px;line-height:1.15;letter-spacing:-.02em}
          article h2 a{color:var(--ink);text-decoration:none}
          article h2 a:hover{color:var(--blue)}
          article p.desc{margin:0;color:#5a6273;font-size:14px;line-height:1.55}
          .foot{margin-top:44px;padding-top:24px;border-top:1px solid var(--line);color:var(--muted);font-size:13px}
          .foot a{color:var(--blue);text-decoration:none}
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="top">
            <a class="brand" href="/">
              <span class="mark">ia</span>
              <span class="name"><strong>intel·ligència</strong><span>artificial.cat</span></span>
            </a>
            <a class="back" href="/">← Torna a la portada</a>
          </div>

          <h1><xsl:value-of select="rss/channel/title"/></h1>
          <p class="lede"><xsl:value-of select="rss/channel/description"/></p>

          <div class="info">
            <strong>Qué és aquesta pàgina?</strong>
            <p>És el canal <b>RSS</b> del web: una llista sempre actualitzada de les notícies, pensada per seguir-les des d'una aplicació de lectura (un «lector d'RSS») sense haver d'entrar cada dia. Per subscriure-t'hi, copia aquesta adreça — <code><xsl:value-of select="rss/channel/atom:link/@href"/></code> — i enganxa-la al teu lector preferit. Si només vols llegir les notícies, torna a la <a href="/">portada</a>.</p>
          </div>

          <xsl:for-each select="rss/channel/item">
            <article>
              <p class="meta"><xsl:if test="category"><xsl:value-of select="category"/> · </xsl:if><xsl:value-of select="pubDate"/></p>
              <h2><a href="{link}"><xsl:value-of select="title"/></a></h2>
              <p class="desc"><xsl:value-of select="description"/></p>
            </article>
          </xsl:for-each>

          <p class="foot">Canal RSS de <a href="/">intel·ligènciaartificial.cat</a> · Actualitat, anàlisi i context sobre intel·ligència artificial, en català.</p>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
