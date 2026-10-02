declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    PLATFORM_FEE_WALLET?: string;
    BUCKET?: R2Bucket;
  }
}
