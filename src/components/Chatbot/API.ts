export async function QueryChatbotAPI(
  query: string,
  id: string,
  token: string,
  uuid: string
) {
  const res = await fetch("http://localhost:8888/api/chatbot_proxy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": token,
    },
    body: JSON.stringify({
      query: query,
      account_id: "JPCeP2ujSwqNcwD7WhYeBw",
      uuid: uuid,
    }),
  });

  const data = await res.json();

  if (!data.data) {
    return "Something went wrong!";
  }

  console.log(data.data.response);
  return data.data.response;
}
