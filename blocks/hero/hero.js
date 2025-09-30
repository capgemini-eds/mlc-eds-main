import { buildBlock, createOptimizedPicture } from "../../scripts/aem.js";

export default function decorate(block) {
  const heroBannerBlock = [];
  const blockClassList = block.classList;

  // Create a new div for the hero banner
  // and append the first child of the block to it
  const heroBanner = document.createElement("div");
  heroBanner.classList.add("hero-banner");
  heroBanner.classList.add(...blockClassList);
  
  heroBanner.append(block.firstElementChild);
  heroBanner.firstElementChild.classList.add("hero-banner--elements");

  // Add a class to the first child picture element
  const firstPicture = heroBanner.firstElementChild.querySelector("picture");
  if (firstPicture) {
    firstPicture.classList.add("hero-banner--picture");
  }

  // Create a new div for the hero overlay
  const heroBannerTexts = document.createElement("div");
  heroBannerTexts.classList.add("hero-overlay");

  // Move overlay content into heroBannerTexts
  [...block.children].slice(0, 3).forEach((child) => {
    if (child) {
      if (!child.querySelector("picture") && child.querySelector("p")) {
        child.classList.add("hero-overlay--text");
      }
      heroBannerTexts.append(child);
    }
  });

  const heroBannerElements = heroBanner.querySelector(
    ".hero-banner--elements"
  );

  // Append overlay as sibling to picture inside hero-banner--elements
  if (heroBannerElements) {
    // If picture exists, insert overlay after it
    const picture = heroBannerElements.querySelector("picture");
    if (picture) {
      picture.insertAdjacentElement("afterend", heroBannerTexts);
    } else {
      heroBannerElements.append(heroBannerTexts);
    }
  }

  heroBanner.append(heroBannerElements);

  // create new block with the heroBanner
  const heroOverlayBlock = buildBlock("hero-banner-block", {
    elems: [heroBanner],
  });

  block.replaceWith(heroOverlayBlock);
}
