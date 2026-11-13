// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Minimal ambient types for the jsonwebtoken package (no @types package
// installed). Only the subset used by the AI token bridge.

declare module "jsonwebtoken" {
  export interface SignOptions {
    algorithm?: string;
    expiresIn?: string | number;
    subject?: string;
    audience?: string;
    issuer?: string;
    jwtid?: string;
  }

  export function sign(
    payload: string | Buffer | object,
    secretOrPrivateKey: string | Buffer,
    options?: SignOptions
  ): string;
}
