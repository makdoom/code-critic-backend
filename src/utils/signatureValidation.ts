import crypto from "crypto";

export const verifyGitHubSignature = (
  signature: string,
  body: Buffer,
  secret: string,
) => {
  const hmac = crypto.createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(body).digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
};
