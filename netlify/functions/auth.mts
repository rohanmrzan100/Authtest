import type { Context } from "@netlify/functions";

interface Body {
  accountId: string;
  accessToken: string;
  returnTo: string;
}
export default async (req: Request, context: Context) => {
  const header = {
    "Access-Control-Allow-Origin":
      "app.dragonson.com",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  };
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: header,
    });
  }

  if (req.method !== "POST") {
    return new Response("Not Implemented", {
      status: 400,
    });
  }

  const accessToken = req.headers.get("authorization")?.split(" ")[1];
  const accountId = new URL(req.url).searchParams.get("routingId");
  const returnTo = new URL(req.url).searchParams.get("returnTo");

  if (!returnTo || !accountId || !accessToken) {
    return new Response(
      JSON.stringify({ error: "URL Params or Bearer token is missing. " }),
      {
        status: 400,
      }
    );
  }

  try {
    const uuid = await getUUID(accountId, accessToken);
    if (!uuid) {
      return;
    }

    const token = await CreateChatbotToken(accountId, accessToken, uuid);
    if (!token) {
      throw new Error("Token creation failed");
    }
    context.cookies.set({
      name: "x_chatbot_key",
      value: token,
      domain: ".dragonson.com",
      path: "/",
      httpOnly: false,
      secure: true,
      sameSite: "None",
    });
 

    context.cookies.set({
      name: "account_id",
      value: accountId,
      domain: ".dragonson.com",
      path: "/",
      httpOnly: false,
      secure: true,
      sameSite: "None",
    });
    return new Response(
      JSON.stringify({
        resource: {
          redirectUrl: returnTo,
        },
      }),
      {
        status: 200,
        headers: header,
      }
    );
  } catch (error) {
    console.error("Error creating chatbot token:", error);
    return new Response(
      JSON.stringify({ error: "Error creating chatbot token" }),
      {
        status: 400,
      }
    );
  }
};

async function deleteExistingToken(
  accountId: string,
  accessToken: string,
  uuid: string
) {
  const listTokenResponse = await fetch(
    `https://app.harness.io/ng/api/token/aggregate?accountIdentifier=${accountId}&apiKeyType=USER`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  const listAllToken = await listTokenResponse.json();

  await Promise.all(
    listAllToken.data.content.map(async (token: any) => {
      if (token.token.apiKeyIdentifier !== "x_api_key_chatbot") {
        return;
      }

      try {
        await fetch(
          `https://app.harness.io/ng/api/token/${token.token.identifier}?accountIdentifier=${accountId}&apiKeyType=${token.token.apiKeyType}&parentIdentifier=${uuid}&apiKeyIdentifier=${token.token.apiKeyIdentifier}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
      } catch (error) {
        console.log(error);
        console.log("Error Deleting Token");
      }
      // }
    })
  );
}

async function getUUID(accountId: string, accessToken: string) {
  try {
    const response = await fetch(
      `https://app.harness.io/gateway/ng/api/user/currentUser?accountIdentifier=${accountId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (!response.ok) {
      throw new Error(
        `Failed to fetch UUID: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log(data.data.uuid);
    return data.data.uuid;
  } catch (error) {
    console.log(error);
  }
}

async function CreateChatbotToken(
  accountId: string,
  accessToken: string,
  uuid: string
) {
  try {
    // Check if token already exists and delete if already exists
    await deleteExistingToken(accountId, accessToken, uuid);

    const response = await fetch(
      `https://app.harness.io/ng/api/token?accountIdentifier=${accountId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          identifier: "x_chatbot_key",
          name: "chatbot-token",
          accountIdentifier: accountId,
          apiKeyIdentifier: "x_api_key_chatbot",
          parentIdentifier: uuid,
          apiKeyType: "USER",
        }),
      }
    );

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.log(error);
  }
}
