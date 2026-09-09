const grid = document.querySelector("#cardGrid");
const template = document.querySelector("#cardTemplate");
const status = document.querySelector("#status");

try {
  const response = await fetch("./collection.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`collection.json ${response.status}`);
  const collection = await response.json();
  document.documentElement.lang = collection.meta?.lang || "en";
  document.querySelector("#collectionTitle").textContent = collection.meta?.title || "HOLO CARD";
  document.querySelector("#collectionDescription").textContent = collection.meta?.description || "";

  for (const card of collection.cards || []) {
    const fragment = template.content.cloneNode(true);
    const link = fragment.querySelector(".gallery-card");
    const image = fragment.querySelector(".poster");
    link.href = card.href;
    link.style.setProperty("--accent", card.accent || "#ff5c35");
    link.setAttribute("aria-label", `打开卡牌：${card.title}`);
    image.src = card.thumbnail;
    image.alt = `${card.title} 卡牌封面`;
    fragment.querySelector("h2").textContent = card.title;
    const subtitle = fragment.querySelector(".subtitle");
    subtitle.textContent = card.subtitle || "";
    subtitle.hidden = !card.subtitle;
    const summary = fragment.querySelector(".summary");
    summary.textContent = card.description || "";
    summary.hidden = !card.description;
    grid.append(fragment);
  }
  grid.setAttribute("aria-busy", "false");
  status.textContent = `${collection.cards?.length || 0} 张卡牌`;
} catch (error) {
  status.textContent = `卡牌目录加载失败：${error.message}`;
  console.error(error);
}
