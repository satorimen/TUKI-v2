/** @type {import('next').NextConfig} */
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig = {};

export default createNextIntlPlugin('./src/i18n/request.ts')(nextConfig);
