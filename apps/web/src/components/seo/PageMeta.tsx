import { Helmet } from 'react-helmet-async'

const DEFAULT_OG_IMAGE = 'https://braidsbydeb.com/brand/Braids-by-deb-logo.png'

interface PageMetaProps {
  title: string
  description: string
  canonical: string
  ogType?: string
  ogImage?: string
  noIndex?: boolean
}

export function PageMeta({ title, description, canonical, ogType = 'website', ogImage = DEFAULT_OG_IMAGE, noIndex = false }: PageMetaProps) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:site_name" content="Braids by Deb" />
      <meta property="og:image" content={ogImage} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  )
}
