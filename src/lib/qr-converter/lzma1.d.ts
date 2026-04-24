/**
 * Type declarations for lzma1 package
 */

declare module 'lzma1' {
  export function compress(data: Uint8Array, level?: number): Uint8Array;
  export function decompress(data: Uint8Array): number[];
}
