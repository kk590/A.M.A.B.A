<<<<<<< HEAD
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.NODE_ENV === 'development' ? undefined : 'export',
  // Ignore the options folder by requiring a .page.tsx extension for pages, 
  // or just rename it. But since we can't rename, we'll exclude it if possible.
  // Actually, setting pageExtensions is safer to avoid any reserved 'options' route panics.
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'].filter(ext => !ext.includes('options')),
};

export default nextConfig;
=======
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.NODE_ENV === 'development' ? undefined : 'export',
  // Ignore the options folder by requiring a .page.tsx extension for pages, 
  // or just rename it. But since we can't rename, we'll exclude it if possible.
  // Actually, setting pageExtensions is safer to avoid any reserved 'options' route panics.
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'].filter(ext => !ext.includes('options')),
};

export default nextConfig;
>>>>>>> 82c0811f7c0a09c3faa3264140fc4eae6738b72c
