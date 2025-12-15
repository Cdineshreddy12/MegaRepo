export const updateFavicon = (iconUrl: string) => {
    const existingLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
  
    if (existingLink) {
      existingLink.href = iconUrl;
    } else {
      const link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/png";
      link.href = iconUrl;
      document.head.appendChild(link);
    }
  };