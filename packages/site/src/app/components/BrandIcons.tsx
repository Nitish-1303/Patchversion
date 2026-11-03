import React from 'react';

export type BrandName =
  | 'stripe'
  | 'openai'
  | 'twilio'
  | 'postgresql'
  | 'postgres'
  | 'github'
  | 'shopify'
  | 'docker'
  | 'vercel'
  | 'npm'
  | 'nodejs'
  | 'typescript'
  | 'lodash'
  | 'mockpay';

export interface BrandMeta {
  name: BrandName;
  label: string;
  brandColor: string;
  category: 'api' | 'developer' | 'infrastructure';
}

export const BRAND_REGISTRY: Record<string, BrandMeta> = {
  stripe: {
    name: 'stripe',
    label: 'Stripe',
    brandColor: '#635BFF',
    category: 'api',
  },
  openai: {
    name: 'openai',
    label: 'OpenAI',
    brandColor: '#10A37F',
    category: 'api',
  },
  twilio: {
    name: 'twilio',
    label: 'Twilio',
    brandColor: '#F22F46',
    category: 'api',
  },
  postgresql: {
    name: 'postgresql',
    label: 'PostgreSQL',
    brandColor: '#4169E1',
    category: 'infrastructure',
  },
  postgres: {
    name: 'postgres',
    label: 'PostgreSQL',
    brandColor: '#4169E1',
    category: 'infrastructure',
  },
  github: {
    name: 'github',
    label: 'GitHub',
    brandColor: '#24292F',
    category: 'developer',
  },
  shopify: {
    name: 'shopify',
    label: 'Shopify',
    brandColor: '#7AB55C',
    category: 'api',
  },
  docker: {
    name: 'docker',
    label: 'Docker',
    brandColor: '#2496ED',
    category: 'infrastructure',
  },
  vercel: {
    name: 'vercel',
    label: 'Vercel',
    brandColor: '#000000',
    category: 'infrastructure',
  },
  npm: {
    name: 'npm',
    label: 'npm',
    brandColor: '#CB3837',
    category: 'developer',
  },
  nodejs: {
    name: 'nodejs',
    label: 'Node.js',
    brandColor: '#5FA04E',
    category: 'developer',
  },
  typescript: {
    name: 'typescript',
    label: 'TypeScript',
    brandColor: '#3178C6',
    category: 'developer',
  },
  lodash: {
    name: 'lodash',
    label: 'Lodash',
    brandColor: '#34495E',
    category: 'developer',
  },
  mockpay: {
    name: 'mockpay',
    label: 'Mockpay',
    brandColor: '#635BFF',
    category: 'api',
  },
};

export function BrandIcon({
  name,
  size = 20,
  useBrandColor = false,
  className = '',
}: {
  name: BrandName | string;
  size?: number;
  useBrandColor?: boolean;
  className?: string;
}) {
  const normalized = name.toLowerCase().replace(/[\s.-]/g, '');
  const brandMeta = BRAND_REGISTRY[normalized];
  const fill = useBrandColor && brandMeta ? brandMeta.brandColor : 'currentColor';

  switch (normalized) {
    case 'stripe':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={fill}
          aria-hidden="true"
          className={className}
        >
          <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z" />
        </svg>
      );

    case 'openai':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={fill}
          aria-hidden="true"
          className={className}
        >
          <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
        </svg>
      );

    case 'twilio':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={fill}
          aria-hidden="true"
          className={className}
        >
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.8c1.325 0 2.4 1.075 2.4 2.4 0 1.326-1.075 2.4-2.4 2.4-1.326 0-2.4-1.074-2.4-2.4 0-1.325 1.074-2.4 2.4-2.4zm-4.8 4.8c1.325 0 2.4 1.075 2.4 2.4 0 1.326-1.075 2.4-2.4 2.4-1.326 0-2.4-1.074-2.4-2.4 0-1.325 1.074-2.4 2.4-2.4zm9.6 0c1.325 0 2.4 1.075 2.4 2.4 0 1.326-1.075 2.4-2.4 2.4-1.326 0-2.4-1.074-2.4-2.4 0-1.325 1.074-2.4 2.4-2.4zm-4.8 4.8c1.325 0 2.4 1.075 2.4 2.4 0 1.326-1.075 2.4-2.4 2.4-1.326 0-2.4-1.074-2.4-2.4 0-1.325 1.074-2.4 2.4-2.4z" />
        </svg>
      );

    case 'postgresql':
    case 'postgres':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={fill}
          aria-hidden="true"
          className={className}
        >
          <path d="M11.972 0C5.36 0 .002 5.358.002 11.97c0 2.378.694 4.595 1.888 6.463L.044 24l5.74-1.815a11.926 11.926 0 0 0 6.188 1.728c6.611 0 11.97-5.36 11.97-11.972 0-6.612-5.36-11.97-11.97-11.97zm.006 21.6c-1.83 0-3.548-.52-5.01-1.42l-.36-.222-3.414 1.08.972-3.486-.23-.374A9.563 9.563 0 0 1 2.404 11.97c0-5.286 4.288-9.57 9.574-9.57 5.285 0 9.57 4.284 9.57 9.57s-4.285 9.63-9.57 9.63z" />
        </svg>
      );

    case 'github':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={fill}
          aria-hidden="true"
          className={className}
        >
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
        </svg>
      );

    case 'shopify':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={fill}
          aria-hidden="true"
          className={className}
        >
          <path d="M19.467 4.417c-.033-.2-.178-.346-.35-.357-.17-.01-.35.105-.443.273l-1.928 3.535a.434.434 0 0 1-.577.185.427.427 0 0 1-.183-.585L17.914 3.93c.092-.17.067-.38-.06-.525a.428.428 0 0 0-.523-.064l-1.928 1.05a.434.434 0 0 1-.577-.184.428.428 0 0 1 .184-.585l1.928-1.05a.428.428 0 0 0 .195-.487.435.435 0 0 0-.44-.316H12.03c-.17 0-.327.098-.405.253L9.697 6.13c-.092.17-.067.38.06.525.127.146.33.17.498.077l1.928-1.05a.434.434 0 0 1 .577.184.428.428 0 0 1-.184.585L10.648 7.52c-.17.092-.258.293-.217.487.042.195.202.336.4.336h7.95a.435.435 0 0 0 .428-.357l.252-3.569z" />
        </svg>
      );

    case 'docker':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={fill}
          aria-hidden="true"
          className={className}
        >
          <path d="M13.983 11.078h2.119a.186.186 0 0 0 .186-.185V9.006a.186.186 0 0 0-.186-.186h-2.119a.185.185 0 0 0-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 0 0 .186-.186V3.574a.186.186 0 0 0-.186-.185h-2.118a.185.185 0 0 0-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 0 0 .186-.186V6.29a.186.186 0 0 0-.186-.185h-2.118a.185.185 0 0 0-.185.185v1.887c0 .102.082.186.185.186m-2.93 0h2.12a.186.186 0 0 0 .184-.186V6.29a.185.185 0 0 0-.185-.185H8.1a.185.185 0 0 0-.185.185v1.887c0 .102.083.186.185.186m-2.964 0h2.119a.186.186 0 0 0 .185-.186V6.29a.185.185 0 0 0-.185-.185H5.136a.186.186 0 0 0-.186.185v1.887c0 .102.084.186.186.186m5.893 2.715h2.118a.186.186 0 0 0 .186-.185V9.006a.186.186 0 0 0-.186-.186h-2.118a.185.185 0 0 0-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 0 0 .184-.185V9.006a.185.185 0 0 0-.184-.186H8.1a.185.185 0 0 0-.185.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 0 0 .185-.185V9.006a.185.185 0 0 0-.185-.186H5.136a.186.186 0 0 0-.186.185v1.888c0 .102.084.185.186.185m-2.928 0h2.12a.185.185 0 0 0 .185-.185V9.006a.185.185 0 0 0-.185-.186h-2.12a.185.185 0 0 0-.184.185v1.888c0 .102.083.185.184.185M23.766 8.44c-.14-.23-.42-.32-.68-.23-.62.21-1.39.29-2.22.25-.33-.01-.65-.05-.96-.11-.47-.1-.91-.25-1.32-.46-.38-.2-.72-.44-1.02-.72a.49.49 0 0 0-.66 0c-.3.28-.64.52-1.02.72-.41.21-.85.36-1.32.46-.31.06-.63.1-.96.11-.83.04-1.6-.04-2.22-.25-.26-.09-.54 0-.68.23-.33.53-.45 1.15-.35 1.77.16 1.05.77 1.97 1.66 2.5 1.34.8 2.94.97 4.54.49 1.6.48 3.2.31 4.54-.49.89-.53 1.5-1.45 1.66-2.5.1-.62-.02-1.24-.35-1.77z" />
        </svg>
      );

    case 'vercel':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={fill}
          aria-hidden="true"
          className={className}
        >
          <path d="m12 1 12 21H0L12 1Z" />
        </svg>
      );

    case 'npm':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={fill}
          aria-hidden="true"
          className={className}
        >
          <path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z" />
        </svg>
      );

    case 'nodejs':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={fill}
          aria-hidden="true"
          className={className}
        >
          <path d="M12 0L1.75 5.87v12.26L12 24l10.25-5.87V5.87L12 0zm0 2.29l8.28 4.75v9.92L12 21.71l-8.28-4.75V7.04L12 2.29z" />
        </svg>
      );

    case 'typescript':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={fill}
          aria-hidden="true"
          className={className}
        >
          <path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 0 1-1.012 1.085 4.38 4.38 0 0 1-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 0 1-1.84-.164 5.544 5.544 0 0 1-1.512-.493v-2.63a5.033 5.033 0 0 0 3.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 0 0-.074-1.089 2.12 2.12 0 0 0-.537-.5 5.597 5.597 0 0 0-.807-.444 27.72 27.72 0 0 0-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 0 1 1.47-.629 7.536 7.536 0 0 1 1.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z" />
        </svg>
      );

    case 'lodash':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={className}
        >
          <rect x="2" y="2" width="20" height="20" rx="4.5" fill="#34495e" />
          <rect x="5.5" y="16.5" width="13" height="3" rx="0.75" fill="#ffffff" />
        </svg>
      );

    case 'mockpay':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={className}
        >
          <rect x="2" y="4" width="20" height="16" rx="3.5" fill="#635bff" />
          <rect x="2" y="8" width="20" height="3.5" fill="#4f46e5" />
          <circle cx="6.5" cy="15.5" r="1.5" fill="#ffffff" fillOpacity="0.85" />
          <circle cx="10" cy="15.5" r="1.5" fill="#ffffff" fillOpacity="0.55" />
        </svg>
      );

    default:
      return null;
  }
}

export function BrandBadge({
  name,
  label,
  size = 18,
  useBrandColor = true,
  className = '',
}: {
  name: BrandName | string;
  label?: string;
  size?: number;
  useBrandColor?: boolean;
  className?: string;
}) {
  const normalized = name.toLowerCase().replace(/[\s.-]/g, '');
  const meta = BRAND_REGISTRY[normalized];
  const displayLabel = label || (meta ? meta.label : name);

  return (
    <span className={`brand-badge ${className}`}>
      <span className="brand-badge-icon">
        <BrandIcon name={name} size={size} useBrandColor={useBrandColor} />
      </span>
      <span className="brand-badge-label">{displayLabel}</span>
    </span>
  );
}
