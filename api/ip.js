import https from "https";

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on("data", (d) => chunks.push(d));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    }).on("error", reject);
  });
}

export default async function handler(req, res) {
  const ip = (await get("https://api.ipify.org")).trim();
  res.status(200).json({ egress_ip: ip });
}
