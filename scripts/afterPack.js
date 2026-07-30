// Copyright © 2026 [Zaid Bilal Banat]. All rights reserved. Zaiken
'use strict';

/**
 * electron-builder afterPack hook — flips Electron fuses on the packaged binary.
 * Requires @electron/fuses at build time. If missing, logs and continues.
 */
exports.default = async function afterPack(context) {
  let flipFuses, FuseVersion, FuseV1Options;
  try {
    ({ flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses'));
  } catch {
    console.warn('[fuses] @electron/fuses not installed — skipping fuse flip');
    return;
  }

  const { electronPlatformName, appOutDir } = context;
  const fs = require('fs');
  const path = require('path');
  const productName = context.packager.appInfo.productFilename;

  let electronBinaryPath;
  if (electronPlatformName === 'win32') {
    electronBinaryPath = path.join(appOutDir, `${productName}.exe`);
  } else if (electronPlatformName === 'linux') {
    electronBinaryPath = path.join(appOutDir, productName);
  } else if (electronPlatformName === 'darwin') {
    electronBinaryPath = path.join(appOutDir, `${productName}.app`, 'Contents', 'MacOS', productName);
  } else {
    return;
  }

  if (!fs.existsSync(electronBinaryPath)) {
    console.warn('[fuses] binary not found:', electronBinaryPath);
    return;
  }

  await flipFuses(electronBinaryPath, {
    version: FuseVersion.V1,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.OnlyLoadAppFromAsar]: true
  });
  console.log('[fuses] applied to', electronBinaryPath);
};
