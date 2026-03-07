'use strict'

const { join } = require('node:path')
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs')
const satori = require('satori').default
const { Resvg } = require('@resvg/resvg-js')

const CACHE_DIR = join(__dirname, '..', 'node_modules', '.cache', 'og-image')
const OG_WIDTH = 1200
const OG_HEIGHT = 630

// Static weight OTF via jsdelivr (supports Git LFS)
const FONT_URL = 'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Bold.otf'
const FONT_FILE = 'NotoSansCJKsc-Bold.otf'

let fontPromise = null

function loadFont() {
  if (fontPromise) return fontPromise
  fontPromise = (async () => {
    const cachePath = join(CACHE_DIR, FONT_FILE)
    if (existsSync(cachePath)) {
      return readFileSync(cachePath)
    }
    mkdirSync(CACHE_DIR, { recursive: true })
    hexo.log.info('OG Image: Downloading Noto Sans SC font (one-time)...')
    const res = await fetch(FONT_URL)
    if (!res.ok) throw new Error(`Font download failed: ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    writeFileSync(cachePath, buf)
    hexo.log.info('OG Image: Font cached at %s', cachePath)
    return buf
  })()
  return fontPromise
}

async function renderOgImage(title, siteName, dateStr) {
  const fontData = await loadFont()

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px 80px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
          fontFamily: 'Noto Sans SC',
        },
        children: [
          {
            type: 'div',
            props: {
              style: { fontSize: 24, opacity: 0.8 },
              children: siteName,
            },
          },
          {
            type: 'div',
            props: {
              style: {
                fontSize: title.length > 30 ? 42 : 56,
                fontWeight: 700,
                lineHeight: 1.3,
                overflow: 'hidden',
              },
              children: title,
            },
          },
          {
            type: 'div',
            props: {
              style: { fontSize: 20, opacity: 0.7 },
              children: dateStr,
            },
          },
        ],
      },
    },
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      fonts: [
        {
          name: 'Noto Sans SC',
          data: fontData,
          weight: 700,
          style: 'normal',
        },
      ],
    },
  )

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: OG_WIDTH },
  })
  return Buffer.from(resvg.render().asPng())
}

// Generator: produce PNG files into public/images/og/
hexo.extend.generator.register('og_image', function (locals) {
  const siteName = hexo.config.title
  return locals.posts.map(post => ({
    path: `images/og/${post.slug}.png`,
    data: () =>
      renderOgImage(
        post.title || 'Untitled',
        siteName,
        post.date?.format('YYYY-MM-DD') || '',
      ),
  }))
})

// Filter: tag each post with its OG image URL
hexo.extend.filter.register('after_post_render', function (data) {
  data.og_image = `${hexo.config.url}/images/og/${data.slug}.png`
  return data
})

// Override open_graph helper to prioritize our generated OG image
const origOpenGraph = hexo.extend.helper.get('open_graph')
if (origOpenGraph) {
  hexo.extend.helper.register('open_graph', function (options = {}) {
    if (this.page?.og_image && !options.image) {
      options = { ...options, image: this.page.og_image }
    }
    return origOpenGraph.call(this, options)
  })
}
