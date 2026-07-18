export function setupCamera(scene, cube, resetButton) {
    const dragMedia = window.matchMedia('(min-width: 561px) and (pointer: fine)');
    let rotationX = -14;
    let rotationY = -36;
    let dragOrigin = null;
    const update = () => {
        cube.style.transform = `translateY(var(--cube-lift)) rotateX(${rotationX}deg) rotateY(${rotationY}deg)`;
    };
    const stop = (event) => {
        dragOrigin = null;
        if (event && scene.hasPointerCapture(event.pointerId)) {
            scene.releasePointerCapture(event.pointerId);
        }
    };
    scene.addEventListener('pointerdown', (event) => {
        if (!dragMedia.matches)
            return;
        dragOrigin = { x: event.clientX, y: event.clientY, rotationX, rotationY };
        scene.setPointerCapture(event.pointerId);
    });
    scene.addEventListener('pointermove', (event) => {
        if (!dragOrigin)
            return;
        rotationY = dragOrigin.rotationY + (event.clientX - dragOrigin.x) * .45;
        rotationX = Math.max(-85, Math.min(85, dragOrigin.rotationX - (event.clientY - dragOrigin.y) * .35));
        update();
    });
    scene.addEventListener('pointerup', stop);
    scene.addEventListener('pointercancel', stop);
    dragMedia.addEventListener('change', () => stop());
    resetButton.addEventListener('click', () => {
        rotationX = -14;
        rotationY = -36;
        update();
    });
    update();
}
