export function requiredElement(selector, root = document) {
    const element = root.querySelector(selector);
    if (!element)
        throw new Error(`Required element not found: ${selector}`);
    return element;
}
export function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
export function arraysEqual(left, right) {
    return (left.length === right.length &&
        left.every((value, index) => value === right[index]));
}
export function setButtonContent(button, icon, label) {
    if (button.dataset.icon === icon && button.dataset.label === label)
        return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('button-icon');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `#icon-${icon}`);
    svg.append(use);
    const text = document.createElement('span');
    text.textContent = label;
    button.replaceChildren(svg, text);
    button.dataset.icon = icon;
    button.dataset.label = label;
}
