/**
 * By default, Remix will handle generating the HTTP Response for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/file-conventions/entry.server
 */

import type { AppLoadContext, EntryContext } from "@remix-run/cloudflare";
import { RemixServer } from "@remix-run/react";
import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";
import { BaselimeLogger } from "@baselime/edge-logger"

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  // This is ignored so we can keep it in the template for visibility.  Feel
  // free to delete this parameter in your app if you're not using it!
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  loadContext: AppLoadContext
) {
  const body = await renderToReadableStream(
    <RemixServer context={remixContext} url={request.url} />,
    {
      signal: request.signal,
      onError(error: unknown) {
        // Log streaming rendering errors from inside the shell
        console.error(error);
        responseStatusCode = 500;
      },
    }
  );

  // see: https://baselime.io/docs/sending-data/platforms/cloudflare/edge-logger/#usage
  // BaselimeLogger
  const  url = new URL(request.url);
  const logger = new BaselimeLogger({
    service: "your-service-name",
    namespace: `${request.method} ${url.hostname}${url.pathname}`,
    apiKey: loadContext.cloudflare.env.BASELIME_API_KEY,
    ctx: loadContext.cloudflare.ctx,
  });

  // ログ書き込みテスト
  logger.info("Info from the serverless world!", { data: { userId: 'random-id' } });
  logger.error("Error from the serverless world!", { data: { userId: 'random-id' } });
  logger.debug("Febug from the serverless world!", { data: { userId: 'random-id' } });
  logger.log("Log from the serverless world!", { data: { userId: 'random-id' } });
  logger.warn("Warn from the serverless world!", { data: { userId: 'random-id' } });

  // ログ書き込み
  loadContext.cloudflare.ctx.waitUntil(logger.flush());

  if (isbot(request.headers.get("user-agent") || "")) {
    await body.allReady;
  }

  responseHeaders.set("Content-Type", "text/html");
  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
