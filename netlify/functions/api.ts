import serverless from "serverless-http";

process.env.NETLIFY_FUNCTION = "true";
process.env.NODE_ENV = "production";

let appPromise: Promise<any> | null = null;

async function getApp() {
  if (!appPromise) {
    appPromise = import("../../server").then((module) => module.createApp());
  }
  return appPromise;
}

export const handler = async (event: any, context: any) => {
  const app = await getApp();
  return serverless(app)(event, context);
};
