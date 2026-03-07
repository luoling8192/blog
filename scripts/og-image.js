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
          justifyContent: 'flex-end',
          padding: '60px 72px',
          background: '#0f0f0f',
          color: '#e8e8e8',
          fontFamily: 'Noto Sans SC',
          position: 'relative',
          overflow: 'hidden',
        },
        children: [
          // Top-right decorative accent circle
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: '-120px',
                right: '-80px',
                width: '400px',
                height: '400px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
                opacity: 0.15,
              },
            },
          },
          // Bottom-left decorative accent
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                bottom: '-60px',
                left: '-40px',
                width: '240px',
                height: '240px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)',
                opacity: 0.1,
              },
            },
          },
          // Accent bar
          {
            type: 'div',
            props: {
              style: {
                width: '64px',
                height: '4px',
                background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)',
                borderRadius: '2px',
                marginBottom: '28px',
              },
            },
          },
          // Title
          {
            type: 'div',
            props: {
              style: {
                fontSize: title.length > 30 ? 44 : 58,
                fontWeight: 700,
                lineHeight: 1.35,
                overflow: 'hidden',
                letterSpacing: '-0.02em',
                color: '#ffffff',
              },
              children: title,
            },
          },
          // Bottom row: site name + date
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '40px',
                paddingTop: '24px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { fontSize: 22, color: '#a1a1aa' },
                    children: siteName,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { fontSize: 20, color: '#71717a' },
                    children: dateStr,
                  },
                },
              ],
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
