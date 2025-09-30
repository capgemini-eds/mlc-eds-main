export default function decorate(block) {

    const buttonContainers = [];

    const buttonContainer = document.createElement("div");
    buttonContainer.classList.add("app-spotlight--buttons");

   block.querySelectorAll(".button-container").forEach((container) => {
       buttonContainers.push(container);
   });
    
    buttonContainers.forEach((container) => { 
        buttonContainer.append(container);
    });

    [...block.children].slice(1, 2).forEach((child) => { 
        child.classList.add("app-spotlight--text");
        child.append(buttonContainer);
    });
}