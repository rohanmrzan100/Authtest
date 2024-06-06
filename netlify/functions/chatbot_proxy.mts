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
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Not Implemented", {
      status: 400,
    });
  }
  const body: Body = await req.json();

  if (!body.account_id || !body.query || !body.uuid) {
    return new Response(JSON.stringify({ error: "Please send all fields" }), {
      status: 400,
    });
  }
  const token = req.headers.get("x-api-key");

  console.log({ body, token });

  if (!token) {
    return new Response(JSON.stringify({ error: "Token is not sent" }), {
      status: 500,
    });
  }
  try {
    const response = await fetch(
      "https://app.harness.io/gateway/notifications/api/notifications/harness-bot?routingId=" +
        body.account_id,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": token,
        },
        body: JSON.stringify({ question: body.query }),
      }
    );

    const responseData = await response.json();
    console.log(responseData);

    const uuid = await getUUID(body.account_id, token);
    if (!uuid) {
      throw new Error(`Failed to fetch UUID`);
    }
    await deleteExistingToken(body.account_id, token, uuid);

    const rotatedToken = await RotateToken(body.account_id, token, uuid);
    if (!rotatedToken) {
      throw new Error(`Failed to rotated Token`);
    }

    context.cookies.set({
      name: "x_chatbot_key",
      value: rotatedToken,
      domain: ".dragonson.com",
      path: "/",
      httpOnly: false,
      secure: true,
      sameSite: "None",
    });

   
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
      },
    });
  } catch (error) {
    console.log(error);
    return new Response(JSON.stringify(error), {
      status: 500,
    });
  }
};

async function RotateToken(accountId: string, token: string, uuid: string) {
  try {
    const now = new Date();

    /// valid for 2 hours
    const currentGMTTimeInMillis = now.getTime() + 1000 * 60 * 60 * 2;

    const response = await fetch(
      `https://app.harness.io/ng/api/token/rotate/x_chatbot_key?accountIdentifier=${accountId}&apiKeyType=USER&parentIdentifier=${uuid}&apiKeyIdentifier=x_api_key_chatbot&rotateTimestamp=${currentGMTTimeInMillis}`,
      {
        headers: {
          "x-api-key": token,
        },
        method: "POST",
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

    if (!response.ok) {
      throw new Error(
        `Failed to rotate token: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.log(error);
  }
}

async function deleteExistingToken(
  accountId: string,
  newtoken: string,
  uuid: string
) {
  const listTokenResponse = await fetch(
    `https://app.harness.io/ng/api/token/aggregate?accountIdentifier=${accountId}&apiKeyType=USER`,
    {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": newtoken,
      },
    }
  );
  if (!listTokenResponse.ok) {
    throw new Error(
      `Failed to fetch UUID: ${listTokenResponse.status} ${listTokenResponse.statusText}`
    );
  }
  const listAllToken = await listTokenResponse.json();

  const filteredArray = listAllToken.data.content.filter((item: any) => {
    return item.token.apiKeyIdentifier == "x_api_key_chatbot";
  });

  // only 3 token at time . There can be max of 5 tokens
  if (filteredArray.length < 4) {
    return;
  }
  await Promise.all(
    filteredArray.map(async (token: any, index) => {
      if (token.token.apiKeyIdentifier == "x_chatbot_key") {
        return;
      }
      console.log({ index });

      // ignore newest three tokena
      if (index < 2) {
        return;
      }

      try {
        await fetch(
          `https://app.harness.io/ng/api/token/${token.token.identifier}?accountIdentifier=${accountId}&apiKeyType=${token.token.apiKeyType}&parentIdentifier=${uuid}&apiKeyIdentifier=${token.token.apiKeyIdentifier}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": newtoken,
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

async function getUUID(accountId: string, token: string) {
  try {
    const response = await fetch(
      `https://app.harness.io/gateway/ng/api/user/currentUser?accountIdentifier=${accountId}`,
      {
        headers: {
          "x-api-key": token,
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
    console.log({ error });
  }
}
