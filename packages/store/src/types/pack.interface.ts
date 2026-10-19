export type StorePackCategory = 'luts' | 'transitions' | 'titles' | 'effects' | 'remotion-templates';

export interface StorePackManifest {
  id: string;
  version: string;
  title: string;
  description: string;
  category: StorePackCategory;
  author: 'KuroLabs' | 'Official Partner';
  license: string;
  previewImageUrl?: string;
  sourceUrl: string;
  sha256Checksum: string;
  minKuroStudioVersion: string;
  declaredFiles: string[];
}

export interface InstalledPackRecord {
  id: string;
  version: string;
  installedAt: string;
  installPath: string;
}
