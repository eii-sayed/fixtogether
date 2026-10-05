import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ 
  title, 
  description = 'FixTogether - AI-Assisted Community Repair, Reuse, and Donation Platform. Connect with technicians, donate items, and reduce waste.', 
  image = 'https://fixtogether.vercel.app/icon-512.png',
  url = 'https://fixtogether.vercel.app',
  type = 'website'
}) => {
  const siteTitle = title ? `${title} | FixTogether` : 'FixTogether';

  return (
    <Helmet>
      {/* Basic HTML Meta Tags */}
      <title>{siteTitle}</title>
      <meta name="description" content={description} />

      {/* OpenGraph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};

export default SEO;
