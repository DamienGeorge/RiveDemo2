let riveInstance = null;

async function loadRiveAnimation() {
    try {
        // Get the canvas element
        const canvas = document.getElementById('rive-canvas');

        // Create Rive instance
        riveInstance = new rive.Rive({
            src: 'menu_test.riv',
            canvas: canvas,
            autoplay: true,
            autoBind:true,
            artboard: "Button Testing Main",
            stateMachines: 'State Machine 1', // Default state machine name
            onLoad: () => {
                console.log('Rive animation loaded successfully');
                // Fit the animation to the canvas
                riveInstance.resizeDrawingSurfaceToCanvas();

                //this is how to access the autobind instance
                let boundInstance = riveInstance.ViewModelInstance;
            },
            onLoadError: (error) => {
                console.error('Failed to load Rive animation:', error);
                alert('Failed to load the Rive animation. Please check if menu_test.riv exists.');
            },
            onPlay: () => {
                console.log('Animation started playing');
            },
            onPause: () => {
                console.log('Animation paused');
            },
            onStop: () => {
                console.log('Animation stopped');
            }
        });


        console.log(riveInstance);


        riveInstance.on(rive.EventType.RiveEvent, (OnRiveEventTriggered));

    } catch (error) {
        console.error('Error initializing Rive:', error);
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    if (riveInstance) {
        riveInstance.resizeDrawingSurfaceToCanvas();
    }
});

// Load the animation when the page loads
window.addEventListener('load', loadRiveAnimation);

// Clean up when the page unloads
window.addEventListener('beforeunload', () => {
    if (riveInstance) {
        riveInstance.cleanup();
    }
});

function OnRiveEventTriggered(event) {
    console.log(event);
} 