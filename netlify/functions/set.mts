import type { Context } from "@netlify/functions";
interface Body {
  query: string;
  account_id: string;
  uuid: string;
}
export default async (req: Request, context: Context) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: {
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
      },
    });
  }

  if (req.method !== "GET") {
    return new Response("Not Implemented", {
      status: 400,
    });
  }

  
  context.cookies.set({
    name: "x_chatbot_key_cookie",
    value: "rotatedToken",
    domain: ".dragonson.com",
    path: "/",
    httpOnly: false,
    secure: true,
    sameSite: "None",
  });

  return new Response(JSON.stringify({ msg: "success" }), {
    status: 200,
    headers: {
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    },
  });
};
